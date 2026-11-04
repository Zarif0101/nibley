# Nibley Windows helper: one process, text commands on stdin, JSON lines on stdout.
# Hotkey hook (hold Win+`), SendInput, UI Automation. Compiled once at start by Add-Type.
$ErrorActionPreference = 'Stop'
$src = @'
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Automation;

public static class Nib {
  delegate IntPtr HookProc(int code, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id, HookProc fn, IntPtr mod, uint tid);
  [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr h, int code, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern int GetMessage(out MSG m, IntPtr hwnd, uint min, uint max);
  [DllImport("user32.dll")] static extern bool PostThreadMessage(uint tid, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern UIntPtr SetTimer(IntPtr hwnd, UIntPtr id, uint ms, IntPtr fn);
  [DllImport("user32.dll")] static extern uint SendInput(uint n, INPUT[] inputs, int size);
  [DllImport("user32.dll")] static extern int GetSystemMetrics(int i);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string name);

  [StructLayout(LayoutKind.Sequential)] struct POINT { public int x, y; }
  [StructLayout(LayoutKind.Sequential)] struct MSG { public IntPtr hwnd; public uint message; public IntPtr w; public IntPtr l; public uint time; public POINT pt; }
  [StructLayout(LayoutKind.Sequential)] struct KBDLL { public uint vk, scan, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct MSLL { public POINT pt; public uint data, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint data, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort vk, scan; public uint flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Explicit)] struct UNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION u; }

  const uint WM_TIMER = 0x113, WM_MOUSE_ON = 0x401, WM_MOUSE_OFF = 0x402;
  static HookProc kbProc = KbProc, msProc = MsProc; // kept in fields so the GC never frees them
  static IntPtr kbHook, msHook;
  static uint hookTid;
  static bool winDown, active;
  static readonly IntPtr MAGIC = (IntPtr)0x4E49424C; // tags our own SendInput events
  static readonly BlockingCollection<string> outq = new BlockingCollection<string>();

  static void Emit(string json) { outq.Add(json); }

  // Hook callbacks only flip flags and queue a line: Windows drops hooks that are slow.
  static IntPtr KbProc(int code, IntPtr w, IntPtr l) {
    if (code >= 0) {
      var k = (KBDLL)Marshal.PtrToStructure(l, typeof(KBDLL));
      if (k.extra != MAGIC) { // ignore keys we injected ourselves
        int msg = (int)w;
        bool down = msg == 0x100 || msg == 0x104, up = msg == 0x101 || msg == 0x105;
        if (k.vk == 0x5B || k.vk == 0x5C) {
          if (down && !winDown) { winDown = true; Emit("{\"ev\":\"win_down\"}"); }
          if (up) {
            winDown = false;
            if (active) { active = false; Emit("{\"ev\":\"ptt_up\"}"); }
            Emit("{\"ev\":\"win_up\"}");
          }
        } else if (k.scan == 0x29 && (winDown || active)) { // the key under Escape
          if (down && !active) { active = true; Mask(); Emit("{\"ev\":\"ptt_down\"}"); }
          if (up && active) { active = false; Emit("{\"ev\":\"ptt_up\"}"); }
          return (IntPtr)1; // swallow: Start menu, Terminal quake mode and the ` char never see it
        }
      }
    }
    return CallNextHookEx(kbHook, code, w, l);
  }

  static IntPtr MsProc(int code, IntPtr w, IntPtr l) {
    if (code >= 0 && (int)w == 0x201) {
      var m = (MSLL)Marshal.PtrToStructure(l, typeof(MSLL));
      if (m.extra != MAGIC) Emit("{\"ev\":\"click\",\"x\":" + m.pt.x + ",\"y\":" + m.pt.y + "}");
    }
    return CallNextHookEx(msHook, code, w, l);
  }

  // Unassigned key tapped while Win is held, so releasing Win doesn't open Start (AutoHotkey's menu mask key).
  static void Mask() { Keys(new ushort[] { 0xE8 }, false); }

  static void HookThread() {
    hookTid = GetCurrentThreadId();
    IntPtr mod = GetModuleHandle(null);
    kbHook = SetWindowsHookEx(13, kbProc, mod, 0);
    SetTimer(IntPtr.Zero, UIntPtr.Zero, 30000, IntPtr.Zero);
    Emit(kbHook == IntPtr.Zero ? "{\"ev\":\"error\",\"err\":\"hook failed\"}" : "{\"ev\":\"ready\"}");
    MSG m;
    while (GetMessage(out m, IntPtr.Zero, 0, 0) > 0) {
      if (m.message == WM_TIMER) { // re-install in case Windows silently removed a timed-out hook
        IntPtr fresh = SetWindowsHookEx(13, kbProc, mod, 0);
        if (fresh != IntPtr.Zero) { UnhookWindowsHookEx(kbHook); kbHook = fresh; }
      } else if (m.message == WM_MOUSE_ON && msHook == IntPtr.Zero) {
        msHook = SetWindowsHookEx(14, msProc, mod, 0);
      } else if (m.message == WM_MOUSE_OFF && msHook != IntPtr.Zero) {
        UnhookWindowsHookEx(msHook); msHook = IntPtr.Zero;
      }
    }
  }

  static INPUT Key(ushort vk, ushort scan, uint flags) {
    var i = new INPUT { type = 1 };
    i.u.ki = new KEYBDINPUT { vk = vk, scan = scan, flags = flags, extra = MAGIC };
    return i;
  }
  static INPUT Mouse(int dx, int dy, uint data, uint flags) {
    var i = new INPUT { type = 0 };
    i.u.mi = new MOUSEINPUT { dx = dx, dy = dy, data = data, flags = flags, extra = MAGIC };
    return i;
  }
  static void Send(params INPUT[] ins) { SendInput((uint)ins.Length, ins, Marshal.SizeOf(typeof(INPUT))); }
  static void Keys(ushort[] vks, bool ext) {
    uint e = ext ? 1u : 0u;
    foreach (var vk in vks) Send(Key(vk, 0, e), Key(vk, 0, e | 2));
  }

  static readonly string[] KeyNames = { "media_play_pause", "space", "k", "f", "left", "right", "up", "down", "pageup", "pagedown", "home", "end", "tab", "escape" };
  static readonly ushort[] KeyVks = { 0xB3, 0x20, 0x4B, 0x46, 0x25, 0x27, 0x26, 0x28, 0x21, 0x22, 0x24, 0x23, 0x09, 0x1B };

  static string Q(string s) {
    if (s == null) return "null";
    var b = new StringBuilder("\"");
    foreach (char c in s) {
      if (c == '"' || c == '\\') b.Append('\\').Append(c);
      else if (c < 0x20) b.Append("\\u").Append(((int)c).ToString("x4"));
      else b.Append(c);
    }
    return b.Append('"').ToString();
  }
  static string El(AutomationElement e) {
    if (e == null) return ",\"name\":\"\"";
    var c = e.Current;
    var r = c.BoundingRectangle;
    bool finite = !r.IsEmpty && !double.IsInfinity(r.X);
    return ",\"name\":" + Q(c.Name) + ",\"role\":" + Q(c.ControlType.ProgrammaticName.Replace("ControlType.", "")) +
      ",\"isPassword\":" + (c.IsPassword ? "true" : "false") +
      (finite ? ",\"box\":[" + (int)r.X + "," + (int)r.Y + "," + (int)r.Width + "," + (int)r.Height + "]" : "") +
      ",\"pid\":" + c.ProcessId;
  }

  static string Handle(string[] p) {
    switch (p[1]) {
      case "ping": return "";
      case "click": {
        int x = int.Parse(p[2]), y = int.Parse(p[3]);
        int ax = x * 65535 / (GetSystemMetrics(0) - 1), ay = y * 65535 / (GetSystemMetrics(1) - 1);
        Send(Mouse(ax, ay, 0, 0x8001), Mouse(ax, ay, 0, 0x8002), Mouse(ax, ay, 0, 0x8004));
        return "";
      }
      case "type": {
        foreach (char c in Encoding.UTF8.GetString(Convert.FromBase64String(p[2])))
          Send(Key(0, c, 4), Key(0, c, 4 | 2));
        return "";
      }
      case "key": {
        int i = Array.IndexOf(KeyNames, p[2]);
        if (i < 0) throw new Exception("key not allowed");
        Keys(new[] { KeyVks[i] }, KeyVks[i] >= 0x21 && KeyVks[i] <= 0x28);
        return "";
      }
      case "scroll": {
        int n = int.Parse(p[3]);
        string d = p[2];
        bool h = d == "left" || d == "right";
        int amount = 120 * n * (d == "down" || d == "left" ? -1 : 1);
        Send(Mouse(0, 0, (uint)amount, h ? 0x1000u : 0x800u));
        return "";
      }
      case "uia_at": return El(AutomationElement.FromPoint(new System.Windows.Point(int.Parse(p[2]), int.Parse(p[3]))));
      case "uia_focused": return El(AutomationElement.FocusedElement);
      case "open": {
        Process.Start(new ProcessStartInfo(Encoding.UTF8.GetString(Convert.FromBase64String(p[2]))) { UseShellExecute = true });
        return "";
      }
      case "watch_clicks": PostThreadMessage(hookTid, p[2] == "1" ? WM_MOUSE_ON : WM_MOUSE_OFF, IntPtr.Zero, IntPtr.Zero); return "";
      default: throw new Exception("unknown command");
    }
  }

  public static void Run() {
    Console.OutputEncoding = new UTF8Encoding(false);
    var writer = new Thread(() => { foreach (var s in outq.GetConsumingEnumerable()) { Console.Out.WriteLine(s); Console.Out.Flush(); } });
    writer.IsBackground = true; writer.Start();
    var hooks = new Thread(HookThread);
    hooks.IsBackground = true; hooks.Start();
    string line;
    while ((line = Console.In.ReadLine()) != null) { // stdin closes when Nibley exits: we exit too
      var p = line.Trim().Split(' ');
      if (p.Length < 2) continue;
      string id = p[0];
      ThreadPool.QueueUserWorkItem(_ => { // UI Automation can be slow; never block the next command
        try { Emit("{\"id\":" + id + ",\"ok\":true" + Handle(p) + "}"); }
        catch (Exception e) { Emit("{\"id\":" + id + ",\"ok\":false,\"err\":" + Q(e.Message) + "}"); }
      });
    }
  }
}
'@
Add-Type -TypeDefinition $src -ReferencedAssemblies UIAutomationClient, UIAutomationTypes, WindowsBase
[Nib]::Run()
