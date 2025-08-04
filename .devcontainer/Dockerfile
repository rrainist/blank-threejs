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
    # locales \
    && rm -rf /var/lib/apt/lists/*

# Set the locale
# RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
#     dpkg-reconfigure --frontend=noninteractive locales && \
#     update-locale LANG=en_US.UTF-8

# Install Claude Code CLI using npm
RUN npm install -g @anthropic-ai/claude-code

# Fix npm cache permissions
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node/.npm

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

# Set up a nice terminal prompt
# RUN echo 'function fish_prompt; echo -n (set_color green)"➜ "(set_color blue)(prompt_pwd)(set_color normal)" $ "; end' >> /home/node/.config/fish/config.fish

# Set up working directory
WORKDIR /workspace

# Switch back to interactive
ENV DEBIAN_FRONTEND=dialog

# Default command
# CMD ["fish"]
