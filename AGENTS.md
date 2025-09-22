# Repository Guidelines

## Project Structure & Module Organization
- Source code lives in `src/`; entry points include `src/main.ts`, `src/Game.ts`, and scene wiring in `src/scene.ts`.
- Systems and entities reside under `src/systems/` and `src/entities/`; keep new modules cohesive and import explicitly.
- Shared utilities (`src/utils/`), constants (`src/constants/`), and controls (`src/controls.ts`) should remain lightweight and reusable.
- Runtime assets belong in `assets/`, organized by feature (e.g., `assets/sounds/Explosions/`). Add large binaries there so Vite copies them into `dist/`.

## Build, Test, and Development Commands
- `npm run dev`: Launches the Vite dev server against `src/main.ts` for hot-reload iteration.
- `npm run build`: Runs TypeScript checks and emits production assets into `dist/`.
- `npm run preview`: Serves the built bundle locally for smoke testing.
- `npm run lint`: Executes ESLint (Airbnb TS preset). Append `-- --fix` to auto-resolve simple issues.
- `npx jest`: Runs the Jest unit suite. Add `--watch` to iterate or `--coverage` before review.

## Coding Style & Naming Conventions
- TypeScript with ES module syntax and 2-space indentation is mandatory.
- Classes and Three.js constructs use `PascalCase`; functions, instances, and system singletons use `camelCase`.
- Exported constants from `src/constants/` should use `SCREAMING_SNAKE_CASE` and be colocated with related systems.
- Keep modules focused; avoid implicit globals and ensure imports are explicit and ordered per ESLint.

## Testing Guidelines
- Write Jest unit tests near the logic they cover (e.g., `src/systems/__tests__/TimeManager.test.ts`).
- Mock Three.js or physics dependencies to keep tests deterministic.
- Capture a `npx jest --coverage` snapshot before handing off review-worthy changes.

## Commit & Pull Request Guidelines
- Follow concise, imperative commit subjects (examples: `simplify`, `better cameras`). Group related changes per commit.
- PRs must include a short feature/fix summary, test plan (commands run), and notes on new assets or config toggles.
- Attach before/after visuals when gameplay or rendering changes.

## Security & Configuration Tips
- Keep environment flags and physics tuning inside dedicated config modules rather than scattering literals.
- Update `tsconfig.json` paths if you introduce new aliases, and ensure Vite asset imports remain relative.
