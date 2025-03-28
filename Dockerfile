FROM node:20.10.0
LABEL org.opencontainers.image.source=https://github.com/derkoenigeu/netcup-dyndns

ENV PORT=3000
ENV USER=""
ENV PASSWORD=""
ENV RECORDS=""
ENV API_KEY=""
ENV TOKEN=""

WORKDIR /app

ADD package*.json /app/

RUN npm install --omit dev --no-fund --no-audit

ADD index.mjs /app/

CMD node index.mjs
