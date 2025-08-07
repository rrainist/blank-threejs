FROM node:24-bookworm

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Set up basic environment (others defined in devcontainer.json)
ENV HOME=/home/node
ENV WORKSPACE=/workspace

# Install minimal dependencies and networking tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    fish \
    curl \
    jq \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    dnsutils \
    iputils-ping \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Optimize DNS resolution
# RUN echo "options single-request" >> /etc/resolv.conf && \
#     echo "options timeout:2" >> /etc/resolv.conf && \
#     echo "options attempts:3" >> /etc/resolv.conf

# Install Google Cloud SDK
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - && \
    apt-get update && apt-get install -y google-cloud-sdk && \
    rm -rf /var/lib/apt/lists/*

# Install global NPM packages
RUN npm install -g @anthropic-ai/claude-code && \
    npm install -g @playwright/test && \
    npx playwright install-deps 

# Fix npm cache and volume permissions
RUN mkdir -p /home/node/.npm && \
    chown -R node:node /home/node/.npm && \ 
    chown -R node:node $(npm -g config get prefix) && \
    mkdir -p /workspace/node_modules /workspace/.cache /home/node/.cache/anthropic /commandhistory && \
    touch /commandhistory/.bash_history /commandhistory/.fish_history && \
    chown -R node:node /workspace/node_modules /workspace/.cache /home/node/.cache /commandhistory

# Set up Fish as default shell for the node user
RUN chsh -s /usr/bin/fish node

# Switch to non-root user for subsequent commands
USER node

# Set up working directory
WORKDIR /workspace

# Switch back to interactive
ENV DEBIAN_FRONTEND=dialog
