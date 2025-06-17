1. Purpose & Vision
Create a faithful but technically modern clone of Atari’s 1979 Asteroids that runs in any Chromium‑based desktop or mobile browser. Core gameplay must feel identical to the original (Newtonian thrust, torque‐based rotation, wrap‑around play‑field, flying saucers, score system, lives, escalating wave difficulty). Modern niceties—GPU particle debris, emissive glows, bloom and CRT‑style post‑processing—should enhance visual appeal without altering mechanics.

2. Goals & Non‑Goals
Goals	Non‑Goals
✔ 1‑to‑1 gameplay fidelity (ship handling, asteroid sizes/speeds, UFO behaviour).	
✔ High FPS.
✔ Type‑safe, modular code that fits the supplied Three.js / Vite template.	No need to support legacy browsers.
✔ Keyboard controls 

3. Target Audience
Nostalgic gamers, game‑dev learners, and tech recruiters evaluating WebGL + TypeScript proficiency.

5. Core Gameplay Specification
Feature	Details / Acceptance Criteria
Ship Movement	Thrust applies continuous acceleration; rotation left/right (angular velocity capped); inertial drift; wrap‑around on all edges.
Projectiles	Unlimited fire rate 240 ms; only four shots may exist simultaneously; bullets travel straight, wrap, and despawn at ~2.1 s.
Asteroid Field	Start wave: 4 large rocks; large splits into 2 medium, medium into 2 small; random velocity/rotation; score: 20/50/100 pts.
UFOs	2 variants: Large (random aim, 200 pts), Small (player‑aim, 1000 pts); spawn after timer & when < 4 asteroids remain.
Hyperspace	Teleport button; 1 s invulnerability then materialise at random position; 1/5 chance of ship destruction.
Lives & Score	3 initial lives; +1 every 10 000 pts; score & lives displayed top‑left; high‑score persisted via localStorage.
Wave Progression	After all asteroids destroyed, next wave adds +1 large asteroid and +5 % global speed multiplier up to 2×.
Game Over & Restart	Fade to “GAME OVER”; tap/space confirms restart; high‑score check.

6. Controls
Platform	Action Map
Desktop	←/→ rotate, ↑ thrust, Space fire, Shift hyperspace, Esc pause.


7. Visual & Audio Requirements
Rendering Style: Wireframe vector lines (original aesthetic) + additive bloom, thin glow on edges.

Particles: GPU‑instanced debris (sparks on ship / asteroid destruction), capped at 2 k instances.

Lighting: Minimal—unlit emissive MeshLines; global exposure controlled in post.

Post‑FX: Bloom, vignette, optional CRT scan‑lines toggle.

Audio:

Synth‑style SFX: thruster, laser, explosion (WAV/OGG).

Dynamic music: none (faithful silence).

Assets: Generated at runtime—no external textures except tiny 128× scanline mask.

8. Technical Requirements & Architecture Alignment
Area	Requirement	Implementation Hook
Language	TypeScript strict mode, ES2022 targets.	Template’s tsconfig.
Bundler	Vite dev + prod; HMR for shaders & modules.	Existing config.
Rendering	Three.js ≥ 0.160 Line2/LineMaterial for scalable vectors.	Replace demo cube.
Game Loop	Deterministic update delta; fixed‑step 60 Hz physics via ship.update(dt), asteroidMgr.update(dt).	Inside ThreeApp.animate.
Entities	Component classes: Transform, RigidBody, Collider, Renderable.	Keep under /entities.
Collision	Circle–circle check (ship/asteroid/bullet/UFO). Spatial hash for ≤ 128 objects.	systems/collision.ts.
Physics	Simple Euler integration; no external libs.	systems/physics.ts.
Memory Mgmt	All Three.js objects created once or pooled; dispose on wave reset.	Leverage template disposal patterns.
UI Overlay	DOM‑based HUD in #ui with Svelte (optional) or vanilla; FPS counter via stats.js dev‑only.	
Persistency	High‑score saved in localStorage; schema v1 { hiScore: number }.	
Testing	Jest + jsdom for logic, Playwright for E2E.	
Lint/CI	ESLint (airbnb‑ts), Prettier, GitHub Actions (build‑test‑lint).	
Accessibility	High‑contrast toggle, reduced‑motion setting disables bloom & particles.	

10. Security / Privacy
No network calls or user data beyond high‑score integer in localStorage. Comply with GDPR by not collecting PII; display cookie notice unnecessary.

11. Project Plan (high‑level)
Phase	Milestones
0. Setup		Repo clone, CI, basic lint/test pass.
1. Core Loop	Ship controls, bullets, wrap, HUD.
2. Asteroids	Spawning, splitting, collision, scoring.
3. UFO & Hyperspace	Behaviour AI, random aim.
4. Polish	Particles, bloom, responsive UI, settings panel.
5. QA & Optimise	Automated test pass, performance budget met.
6. Release	Version tag, GitHub Pages deploy.
