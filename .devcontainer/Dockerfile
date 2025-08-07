FROM node:24-bookworm

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Set up environment
ENV HOME=/home/node
ENV WORKSPACE=/workspace
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8
ENV SHELL=/usr/bin/fish

# Claude Code environment variables
ENV CLAUDE_CODE_USE_VERTEX=1
ENV CLOUD_ML_REGION=us-east5
ENV ANTHROPIC_VERTEX_PROJECT_ID=sc-claude-code-prod

# Install minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    fish \
    curl \
    jq \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Google Cloud SDK
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - && \
    apt-get update && apt-get install -y google-cloud-sdk && \
    rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI using npm
RUN npm install -g @anthropic-ai/claude-code

# Fix npm cache permissions
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node/.npm
RUN chown -R node:node $(npm -g config get prefix)

# Set up Fish as default shell for the node user
RUN chsh -s /usr/bin/fish node

# Add Fish configuration
RUN mkdir -p /home/node/.config/fish && \
    echo 'function fish_greeting; echo "🎮 Welcome to Three.js Development Environment"; end' > /home/node/.config/fish/config.fish && \
    echo 'set -gx NODE_ENV development' >> /home/node/.config/fish/config.fish && \
    echo 'set -gx CLAUDE_CODE_USE_VERTEX 1' >> /home/node/.config/fish/config.fish && \
    echo 'set -gx CLOUD_ML_REGION us-east5' >> /home/node/.config/fish/config.fish && \
    echo 'set -gx ANTHROPIC_VERTEX_PROJECT_ID sc-claude-code-prod' >> /home/node/.config/fish/config.fish && \
    chown -R node:node /home/node/.config

# Switch to non-root user for subsequent commands
USER node
RUN claude config set --global env '{"CLAUDE_CODE_USE_VERTEX": "true", "ANTHROPIC_MODEL": "claude-3-7-sonnet@20250219"}'

# Set up working directory
WORKDIR /workspace

# Switch back to interactive
ENV DEBIAN_FRONTEND=dialog
