# Nibley 3D

Smooth 3D version of the pixel mascot from Zarif's brand board (`reference/`, sent 2026-11-04).

## Files
- `nibley-3d.html`: the model and a viewer (drag to turn, 7 moods, 4 views). Open it in a browser; it loads three.js 0.170.0 from jsDelivr, so it needs internet.
- `renders/`: transparent 512 px PNGs: 8 turnaround views (`view-*`), 7 moods (`mood-*`), and `compare-reference.png` (board on top, 3D below).
- `nibley.glb`: the model as one file for Blender or any 3D tool (happy face, smile mouth).
- `render.js`: re-makes `renders/` and `nibley.glb`. Dev tool only, not part of the app.

## How it's built
- Body = 8 smooth shapes blended together (soft box bottom, rounded-diamond top, flame tuft, shoulder step, two stub feet, side notch). Numbers in `SHAPE`.
- Face (eyes, glints, shine arc, mouths) is placed on the body surface in `FACE`. Eye spacing, sizes and positions measured from the board's "Full Front" view.
- Colours sampled from the board. Lights (`LOOK`) tuned by measuring rendered pixels: face ≈ #8BD9FC, lower body ≈ #2B88FA (`window.nibley.probe`).
- Moods match the app's states: happy, listening, thinking, speaking, confused, excited, error.

## Re-render
```bash
npm i --no-save three@0.170.0
```
```bash
node design/mascot-3d/render.js
```
Needs Playwright with Chromium. `THREE_DIR` points at another three folder, `QUICK=1` renders 5 views only.

## Where it is not 1:1 with the board
- The board contradicts itself: front views put the tuft right of centre, back views centre it. The model keeps it slightly right.
- Hard pixel steps became soft curves (that's the "smooth" part). The left-side notch is a soft crease.
- Board moods not built yet: explaining, processing, idea, muted, celebrating, onboarding.

## Using it in the app (recommendation, not done)
Don't run live 3D in the always-on-top overlay: the laptop is an i5-6200U with integrated graphics, and the overlay is on all day. Pre-render each mood as a short loop (about 24 frames, 128 px WebP) with `render.js` and play the frames as images. That costs no GPU at idle and adds no app dependency. The 16 px tray icon stays pixel art (`src/overlay/mascot.js`); 3D detail doesn't read at that size.
