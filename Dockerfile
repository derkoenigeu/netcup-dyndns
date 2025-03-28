FROM node:20.10.0
LABEL org.opencontainers.image.source=https://github.com/derkoenigeu/netcup-dyndns
LABEL org.opencontainers.image.title="Netcup DynDNS"
LABEL org.opencontainers.image.description="A lightweight service for updating DNS records on Netcup using their API."
LABEL org.opencontainers.image.licenses="ISC"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.license="LICENSE"

# Set environment variables
ENV PORT=3000
ENV USER=""
ENV PASSWORD=""
ENV RECORDS=""
ENV API_KEY=""
ENV TOKEN=""

# Create and use a non-root user
RUN useradd --create-home --shell /bin/bash netcup
USER netcup

WORKDIR /app

# Copy package files and install dependencies
ADD package*.json /app/
RUN npm ci --omit=dev --no-fund --no-audit

# Copy application code
ADD index.mjs /app/

# Add a healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["node", "index.mjs"]
