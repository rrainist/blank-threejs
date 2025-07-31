# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with HMR on port 3000
- `npm run build` - TypeScript check and production build to `dist/`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint with max 10 warnings allowed

### Testing
No test framework configured. Consider using Jest (already in devDependencies) with `ts-jest` for TypeScript support.

## Architecture

This is a modern Three.js TypeScript template using Vite as the build tool. The codebase follows object-oriented patterns with a modular structure.

### Core Structure
- **ThreeApp Class** (`src/main.ts`): Main application controller that manages the Three.js lifecycle, including scene setup, camera, renderer, and animation loop. Uses proper cleanup in `dispose()` method.
- **Scene Module** (`src/scene.ts`): Encapsulates scene creation with background and fog settings
- **Controls Module** (`src/controls.ts`): Handles mouse/touch interactions for camera rotation
- **Resize Utility** (`src/utils/resize.ts`): Manages responsive canvas sizing

### Key Technical Details
- Three.js v0.160+ with full TypeScript support
- Vite for fast development and optimized builds
- ES2020 target with modern JavaScript features
- Strict TypeScript configuration with some linting relaxations
- Shadow mapping enabled with PCF soft shadows
- sRGB color space for accurate color rendering
- HMR support with proper cleanup handlers

### Development Patterns
- Class-based architecture for main application logic
- Functional modules for utilities and helpers
- Proper memory management with geometry/material disposal
- Event listener cleanup to prevent memory leaks
- Type-safe Three.js usage throughout