# Three.js Development Container

This DevContainer provides a consistent development environment for the Three.js project with all necessary tools pre-installed.

## Features

- Node.js 20 LTS
- Fish shell
- Claude Code CLI pre-installed
- Git for version control
- VS Code/Cursor extensions for TypeScript and Three.js development
- Automatic port forwarding for Vite development server

## Usage

### With VS Code

1. Install the [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension
2. Open the project folder in VS Code
3. When prompted, click "Reopen in Container" or use the command palette (F1) and select "Remote-Containers: Reopen in Container"
4. VS Code will build the container and connect to it
5. After the container is built, the project dependencies will be automatically installed

### With Cursor

1. Open the project folder in Cursor
2. Cursor should automatically detect the DevContainer configuration
3. When prompted, select "Reopen in Container"
4. Wait for the container to build and connect
5. Project dependencies will be automatically installed

## Development

- The development server runs on port 3000 (default) or 5173 (alternative)
- Access the application in your browser at `http://localhost:3000` or `http://localhost:5173`
- Changes to the code will automatically trigger hot reloads

## Running the Application

Inside the container, you can run:

```bash
# Start development server
npm run dev

# Start with game example
npm run dev:game

# Build for production
npm run build

# Preview production build
npm run preview
```

## Using Claude Code

Claude Code is pre-installed and configured in this container. You can use it directly:

```bash
# Start Claude Code interactive session
claude-code

# Get help
claude-code --help
```

## Container Specifics

- Container runs as non-root user `node`
- The project directory is mounted at `/workspace`
- File access is restricted to the project directory only
- The container uses Fish shell for improved developer experience

## Troubleshooting

If you encounter any issues:

1. Rebuild the container: Command Palette → "Remote-Containers: Rebuild Container"
2. Check if ports are already in use on your host machine
3. Ensure Docker is running and has sufficient resources

## Customization

To customize this DevContainer:

1. Modify the `Dockerfile` to add/remove dependencies
2. Adjust `devcontainer.json` for VS Code/Cursor settings and extensions
3. Rebuild the container after making changes