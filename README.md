# Modern Three.js Template

A modern, production-ready Three.js template with TypeScript, Vite, and best practices built-in.

## 🚀 Features

- **Modern Stack**: Three.js v0.160+ with TypeScript
- **Fast Development**: Vite for instant HMR and fast builds
- **Type Safety**: Full TypeScript support with strict configuration
- **Responsive**: Automatically handles window resizing and mobile touch
- **Optimized**: Production builds with tree-shaking and minification
- **Clean Architecture**: Modular code structure for maintainability
- **Modern JavaScript**: ES2020+ features and imports
- **Linting**: ESLint configuration for code quality

## 📦 What's Included

- Rotating animated cube with realistic lighting
- Responsive camera controls
- Touch support for mobile devices
- Ground plane with shadows
- Ambient and directional lighting
- Automatic cleanup and memory management
- Loading indicator

## 🛠️ Getting Started

### Prerequisites

- Node.js 16+ 
- npm, yarn, or pnpm

### Installation

1. **Clone or download this template**

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   - Development server will automatically open at `http://localhost:3000`

## 📋 Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on source files

## 📂 Project Structure

```
src/
├── main.ts           # Main application entry point
├── scene.ts          # Scene creation and configuration
├── controls.ts       # Mouse and touch controls
└── utils/
    └── resize.ts     # Window resize handling
```

## 🎯 Usage

### Basic Scene Setup

The template provides a clean, modular structure:

```typescript
import * as THREE from 'three'
import { createScene } from './scene'

// Initialize Three.js components
const scene = createScene()
const camera = new THREE.PerspectiveCamera(/* ... */)
const renderer = new THREE.WebGLRenderer(/* ... */)
```

### Adding New Objects

Add new 3D objects to your scene:

```typescript
// In your main.ts or scene.ts
const geometry = new THREE.SphereGeometry(1, 32, 32)
const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
const sphere = new THREE.Mesh(geometry, material)
scene.add(sphere)
```

### Customizing Controls

Modify `src/controls.ts` to change interaction behavior:

```typescript
// Adjust rotation sensitivity
targetRotationX += deltaY * 0.005  // Slower rotation
targetRotationY += deltaX * 0.005
```

## 🔧 Configuration

### Vite Configuration

Customize build settings in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3000,  // Change development port
    open: true   // Auto-open browser
  },
  build: {
    outDir: 'dist'  // Output directory
  }
})
```

### TypeScript Configuration

Modify `tsconfig.json` for different TypeScript settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    // ... other options
  }
}
```

## 🚀 Building for Production

1. **Create production build**
   ```bash
   npm run build
   ```

2. **Preview production build**
   ```bash
   npm run preview
   ```

3. **Deploy the `dist/` folder** to your hosting service

## 🌟 Key Improvements Over Original

- ✅ **Modern Three.js**: Updated from v0.138 to v0.160+
- ✅ **No Framework Lock-in**: Removed threestrap dependency
- ✅ **TypeScript**: Full type safety and better IDE support
- ✅ **Modern Tooling**: Vite for fast development and builds
- ✅ **Responsive Design**: Proper handling of different screen sizes
- ✅ **Mobile Support**: Touch controls for mobile devices
- ✅ **Memory Management**: Proper cleanup to prevent memory leaks
- ✅ **Code Quality**: ESLint configuration and best practices
- ✅ **Modular Structure**: Organized code for better maintainability

## 🎨 Customization Ideas

- Add orbit controls from `three/examples/jsm/controls/OrbitControls`
- Implement model loading with `GLTFLoader`
- Add post-processing effects with `EffectComposer`
- Create interactive objects with raycasting
- Add physics with `cannon-es` or `@react-three/rapier`
- Implement VR support with WebXR

## 🐛 Troubleshooting

### TypeScript Errors
- Make sure all dependencies are installed: `npm install`
- Clear node_modules and reinstall if needed: `rm -rf node_modules && npm install`

### Three.js Import Issues
- Ensure you're using ES6 imports: `import * as THREE from 'three'`
- Check that Three.js version matches type definitions

### Build Issues
- Clear Vite cache: `rm -rf node_modules/.vite`
- Ensure TypeScript compilation is successful: `npm run build`

## 📚 Learn More

- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

MIT License - feel free to use this template for any project!

---

**Happy coding with Three.js! 🎉**
