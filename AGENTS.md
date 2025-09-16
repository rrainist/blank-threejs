# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with entry workflows in `main.ts`, `Game.ts`, and subsystem folders like `systems/`, `entities/`, `utils/`, and `constants/`. Shared controls sit in `controls.ts`, scene wiring in `scene.ts`, and level orchestration in `Level.ts`. Runtime assets (audio, textures, models) stay under `assets/`; nest large files by feature to match their consuming system. Vite configuration is in `vite.config.ts`, and TypeScript tuning in `tsconfig.json`.

## Build, Test, and Development Commands
Use `npm run dev` for a hot-reloaded Vite server targeting `src/main.ts`. `npm run build` type-checks with `tsc` and emits `dist/`. `npm run preview` serves the build for smoke testing. Lint with `npm run lint`, passing `-- --fix` for auto-fixes. Run unit tests with `npx jest`, adding `--watch` while iterating or `--coverage` before review.

## Coding Style & Naming Conventions
Write TypeScript with ES module syntax and 2-space indentation, matching the existing source. Classes and Three.js constructs use `PascalCase`; functions, instances, and system singletons use `camelCase`; constants exported from `constants/` use `SCREAMING_SNAKE_CASE`. Keep files cohesive—systems interact via explicit imports instead of implicit globals. ESLint with the Airbnb TypeScript preset enforces spacing, import order, and unused code; run linting before opening a PR.

## Testing Guidelines
Prefer Jest unit tests colocated near logic-heavy modules (e.g., `src/systems/__tests__/TimeManager.test.ts`). Stub Three.js objects or physics instances with lightweight mocks to keep tests deterministic. Cover branches for gameplay state machines, timing utilities, and math helpers; integration with real WebGL belongs in manual QA. Capture a `npx jest --coverage` snapshot before review-worthy changes.

## Commit & Pull Request Guidelines
Follow concise, imperative commit subjects similar to the existing history (`simplify`, `better cameras`). Group related changes per commit and avoid bundling asset drops with core logic tweaks. PRs should include: 1) a short summary of the feature or fix, 2) a test plan listing commands run (`npm run lint`, `npx jest`, manual scene walkthrough), and 3) notes on new assets or configuration toggles. Attach before/after screenshots or clips when gameplay or visuals change, and link to tracking issues if applicable.

## Assets & Configuration Tips
Large binaries belong under `assets/` with descriptive folders (`assets/sounds/Explosions/`). Reference them via relative imports so Vite copies them to `dist/`. Update `tsconfig.json` paths if you introduce aliases, and keep physics tuning or environment flags in dedicated config modules rather than scattering literals across systems.
