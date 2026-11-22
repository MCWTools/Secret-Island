# Secret Island 3D

Floating island 3D first-person game, 42 hidden achievements. Pure static site (Three.js bundled in /vendor), no build step.

## Deploy (Vercel)
Drop the folder in a Vercel project (or `vercel` CLI). No settings needed.
Local: `python3 -m http.server` then open http://localhost:8000

## Controls
PC: click to lock mouse · WASD move · Shift run · Space jump · E interact · J/click attack · P phone · L look under island · Esc pause
Mobile: left joystick, drag right side to look, buttons for attack/jump/look.

## Custom zombie model
The zombie is built procedurally (articulated 3D model + generated textures). To use your own, put a rigged-or-static `zombie.glb` into `assets/` — it is picked up automatically.

Progress is saved in localStorage (key `secretIsland3d.v1`). "Clear all achievements" waits 5s before confirming.
