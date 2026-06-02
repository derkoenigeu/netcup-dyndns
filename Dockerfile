FROM node:22-alpine
LABEL org.opencontainers.image.source=https://github.com/derkoenigeu/netcup-dyndns
LABEL org.opencontainers.image.title="Netcup DynDNS"
LABEL org.opencontainers.image.description="A lightweight service for updating DNS records on Netcup using their API."
LABEL org.opencontainers.image.licenses="ISC"

RUN addgroup --system netcup && adduser --system --ingroup netcup netcup

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-fund --no-audit

COPY index.mjs ./
COPY src/ ./src/

USER netcup

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.mjs"]
