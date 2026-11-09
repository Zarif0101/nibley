# Nibley setup for Windows 10/11. Safe to run again: every step checks first and skips what's already done.
# Run from the Nibley folder:   powershell -ExecutionPolicy Bypass -File setup.ps1 -Name Rafi -Brain gemini
#   -Name   the learner's first name (Nibley uses it when it talks to you)
#   -Brain  claude (Claude subscription) or gemini (Google account, best with Google AI Pro/Ultra)
# It never asks for passwords. Sign-ins and the Groq key are done by the person, in their own browser and Notepad.
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [ValidateSet('claude', 'gemini')][string]$Brain = 'claude',
  [switch]$NoShortcut, # for test runs in a scratch copy
  [switch]$Dev # stay on branch main (developers only): no automatic updates
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$problems = New-Object System.Collections.Generic.List[string]
function Ok($t) { Write-Host "OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "TODO  $t" -ForegroundColor Yellow; $problems.Add($t) }
function Save-Utf8($file, $text) { [IO.File]::WriteAllText((Join-Path $PSScriptRoot $file), $text, (New-Object Text.UTF8Encoding $false)) } # no BOM: Node's JSON.parse rejects it
function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }

Step '1. Windows and Node.js'
if ([Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'Nibley runs on Windows 10 or 11 only.' }
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js is missing. Install the LTS version from https://nodejs.org (or: winget install OpenJS.NodeJS.LTS), open a new terminal, run this again.' }
$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw "Node.js $major is too old. Install Node.js 22 or newer from https://nodejs.org." }
Ok "Windows, Node.js $(node --version)"

Step '1b. Newest release'
# Users run the newest marked release (a vX.Y.Z tag); Nibley then updates itself to each new one (src/updater.js).
if ($Dev) { Ok 'developer copy: staying on the current branch' }
elseif (-not (Test-Path '.git')) { Todo 'This folder was not made with git clone, so Nibley cannot update itself. Reinstall with: git clone https://github.com/Zarif0101/nibley.git' }
else {
  cmd /c 'git fetch --tags --force --quiet origin 2>&1' | Out-Null
  $tag = (cmd /c 'git tag -l "v*" --sort=-v:refname 2>nul' | Select-Object -First 1)
  if ($tag) { cmd /c "git -c advice.detachedHead=false checkout -f --quiet tags/$tag 2>&1" | Out-Null; Ok "on release $tag (updates install by themselves)" }
  else { Ok 'no release marked yet: staying on the latest code (it will not update by itself until a release exists)' }
}

Step '2. App files (npm install)'
if (-not (Test-Path 'node_modules\electron\dist\electron.exe')) { cmd /c 'npm install --no-fund --no-audit 2>&1'; if ($LASTEXITCODE) { throw 'npm install failed.' } }
# npm 11 can skip Electron's own download step (seen in a fresh copy 2026-11-09): run it directly when the program is missing.
if (-not (Test-Path 'node_modules\electron\dist\electron.exe')) { cmd /c 'node node_modules\electron\install.js 2>&1' }
if (-not (Test-Path 'node_modules\electron\dist\electron.exe')) { throw 'Electron did not download. Check the internet connection and run this again.' }
Ok 'node_modules ready'

Step '3. Offline backup voice (Piper, about 85 MB, checked by SHA-256)'
function Get-Checked($url, $file, $sha) {
  if ((Test-Path $file) -and ((Get-FileHash $file -Algorithm SHA256).Hash -eq $sha)) { return }
  Write-Host "      downloading $url"
  Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing
  $got = (Get-FileHash $file -Algorithm SHA256).Hash
  if ($got -ne $sha) { Remove-Item $file -Force; throw "Checksum mismatch for $file (got $got). Not using it." }
}
if (-not (Test-Path 'piper\piper.exe')) {
  $zip = Join-Path $env:TEMP 'nibley-piper.zip'
  Get-Checked 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip' $zip 'F3C58906402B24F3A96D92145F58ACBA6D86C9B5DB896D207F78DC80811EFCEA'
  Expand-Archive -LiteralPath $zip -DestinationPath $PSScriptRoot -Force
  Remove-Item $zip -Force
}
New-Item -ItemType Directory -Force 'piper\voices' | Out-Null
$hf = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium'
Get-Checked "$hf/en_US-lessac-medium.onnx" 'piper\voices\en_US-lessac-medium.onnx' '5EFE09E69902187827AF646E1A6E9D269DEE769F9877D17B16B1B46EEAAF019F'
Get-Checked "$hf/en_US-lessac-medium.onnx.json" 'piper\voices\en_US-lessac-medium.onnx.json' 'EFE19C417BED055F2D69908248C6BA650FA135BC868B0E6ABB3DA181DAB690A0'
Ok 'Piper voice ready'

Step "4. Settings (name: $Name, brain: $Brain)"
$settings = @{}
if (Test-Path 'settings.json') { (Get-Content 'settings.json' -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $settings[$_.Name] = $_.Value } }
$settings['name'] = $Name.Trim()
$settings['brain'] = $Brain
Save-Utf8 'settings.json' ($settings | ConvertTo-Json -Depth 5)
Ok 'settings.json saved'

Step "5. AI brain: $Brain"
if ($Brain -eq 'claude') {
  $claude = Get-Command claude -ErrorAction SilentlyContinue
  if (-not $claude -and -not (Test-Path "$env:USERPROFILE\.local\bin\claude.exe")) {
    Todo 'Install Claude Code: open PowerShell and run   irm https://claude.ai/install.ps1 | iex   then run   claude   once and sign in with your Claude account.'
  } else { Ok 'Claude Code found (sign in once by running: claude)' }
} else {
  if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) { cmd /c 'npm install -g @google/gemini-cli@0.67.0 --no-fund --no-audit 2>&1'; if ($LASTEXITCODE) { throw 'Installing Gemini CLI failed.' } }
  $gdir = Join-Path $env:USERPROFILE '.gemini'
  New-Item -ItemType Directory -Force $gdir | Out-Null
  $gset = Join-Path $gdir 'settings.json'
  if (-not (Test-Path $gset)) { [IO.File]::WriteAllText($gset, '{ "security": { "auth": { "selectedType": "oauth-personal" } } }', (New-Object Text.UTF8Encoding $false)) }
  # 'n' answers "open the sign-in page?" so a signed-out CLI never hangs here; errors stay inside cmd (PowerShell 5.1 treats them as fatal)
  $reply = (cmd /c 'echo n| gemini -m gemini-3-flash-preview -p "Reply with exactly: OK" 2>&1' | Out-String)
  if ($reply -match '(?m)^\s*OK\s*$') { Ok 'Gemini CLI signed in and answering' }
  elseif ($reply -match '503|high demand|quota|RESOURCE_EXHAUSTED|429') { Ok 'Gemini CLI signed in (Google is busy or today''s limit is used up right now; Nibley will work when it frees up)' }
  else { Todo 'Sign in to Gemini: open a NEW terminal, run   gemini   choose "Login with Google", sign in in the browser with the Google account that has Google AI Pro/Ultra, then close it.' }
}

Step '6. Speech-to-text key (Groq, free)'
if (-not (Test-Path '.env')) { "# Paste your Groq key after the = sign, then save. Get one free at https://console.groq.com/keys`r`nGROQ_API_KEY=" | Set-Content '.env' -Encoding ASCII }
if ((Get-Content '.env' -Raw) -match 'GROQ_API_KEY=gsk_\w{20,}') { Ok 'Groq key present in .env' }
else { Todo 'Groq key: sign up free at https://console.groq.com/keys (Google login works), click Create API Key, copy it. Then open .env in Notepad (notepad .env), paste the key right after GROQ_API_KEY=, save.' }

Step '7. Desktop shortcut'
if ($NoShortcut) { Ok 'skipped (-NoShortcut)' } else {
$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Nibley.lnk'
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnk)
$s.TargetPath = 'wscript.exe'
$s.Arguments = '"' + (Join-Path $PSScriptRoot 'start-nibley.vbs') + '"'
$s.WorkingDirectory = $PSScriptRoot
$s.IconLocation = (Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe') + ',0'
$s.Save()
Ok "Shortcut on the desktop: Nibley"
}

Step '8. Self-check (unit tests, ~10 s)'
$t = (cmd /c 'npm test 2>&1' | Out-String)
if ($t -match 'fail 0') { Ok ('unit tests pass (' + ([regex]::Match($t, 'pass (\d+)').Groups[1].Value) + ')') } else { Todo 'Some unit tests failed: send the output of   npm test   with the Feedback button.' }

Write-Host ""
if ($problems.Count) {
  Write-Host "ALMOST THERE. Still to do (by the person, not the agent):" -ForegroundColor Yellow
  $i = 1; foreach ($p in $problems) { Write-Host "  $i. $p"; $i++ }
  Write-Host "Then run this script again to confirm."
} else {
  Write-Host "READY. Start Nibley from the desktop shortcut. Hold Win + `` (the key left of 1) and ask a question about your screen." -ForegroundColor Green
}
