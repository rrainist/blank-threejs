FROM mcr.microsoft.com/playwright:v1.54.0-jammy

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Set up basic environment (others defined in devcontainer.json)
ENV HOME=/home/pwuser
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
    sudo \
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
RUN npm install -g @anthropic-ai/claude-code

# Fix npm cache and volume permissions
RUN mkdir -p /workspace/node_modules /workspace/.cache /home/pwuser/.cache/anthropic && \
    chown -R 1000:1000 "/home/pwuser/.npm" && \
    # Add pwuser to sudo group and configure passwordless sudo
    usermod -aG sudo pwuser && \
    echo "pwuser ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/pwuser && \
    chmod 0440 /etc/sudoers.d/pwuser

# Switch to non-root user for subsequent commands
USER pwuser

# Set up working directory
WORKDIR /workspace

# Switch back to interactive
ENV DEBIAN_FRONTEND=dialog
