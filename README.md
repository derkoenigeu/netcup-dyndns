# Netcup DynDNS

A lightweight Dynamic DNS (DynDNS) service that automatically keeps your Netcup DNS records up to date whenever your public IP address changes. Runs as a small HTTP server — your router or a cron job simply calls it with the current IP.

## Table of Contents

- [What is this?](#what-is-this)
- [Quick Start (Docker)](#quick-start-docker)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Setup for Development](#setup-for-development)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [CI/CD & GitHub Actions](#cicd--github-actions)
- [Security](#security)
- [License](#license)

---

## What is this?

Many home internet connections have a dynamic IP address that changes periodically. If you host services at home (a web server, game server, VPN, etc.) and point a domain name at your home IP, the DNS record needs updating every time the IP changes.

This service solves exactly that. You deploy it once, configure your domain(s), and then trigger an update by sending a simple HTTP request — something most home routers can do automatically.

**What you need:**
- A domain managed through Netcup
- A Netcup API key (available in the Netcup Customer Control Panel)
- Docker (recommended) or Node.js v22+

---

## Quick Start (Docker)

### 1. Create your `.env` file

Copy the template and fill in your values:

```bash
cp .env.template .env
```

Then edit `.env`:

```env
PORT=3000
API_KEY=your-netcup-api-key
API_USER=your-netcup-customer-number
API_PASSWORD=your-netcup-api-password
RECORDS=example.com:home,www;other.com:@
TOKEN=a-long-random-secret-you-choose
```

> **Tip:** Generate a secure token with `openssl rand -hex 32`.

### 2. Start the container

```bash
docker run -d \
  --name netcup-dyndns \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  ghcr.io/derkoenigeu/netcup-dyndns:latest
```

### 3. Verify it's running

```bash
curl http://localhost:3000/health
# → OK
```

### 4. Trigger your first DNS update

```bash
curl "http://localhost:3000/1.2.3.4" \
  -H "Authorization: Bearer your-token-here"
# → Update successful
```

Replace `1.2.3.4` with your actual public IP. Your DNS records will be updated immediately.

---

### Docker Compose (recommended for production)

Create a `docker-compose.yml`:

```yaml
services:
  dyndns:
    image: ghcr.io/derkoenigeu/netcup-dyndns:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
```

Then run:

```bash
docker compose up -d
```

---

### Automating Updates

Most home routers support DynDNS-style HTTP calls. Point your router's DynDNS client at:

```
http://your-server:3000/<ip>
```

with `Authorization: Bearer <TOKEN>` as a custom header. Alternatively, use a simple cron job:

```bash
# Update every 5 minutes with the current public IP
*/5 * * * * curl -s "http://localhost:3000/$(curl -s https://api4.my-ip.io/ip)" \
  -H "Authorization: Bearer your-token-here"
```

---

## Configuration

All configuration is provided through environment variables. You can use a `.env` file when running locally or pass them directly to Docker.

| Variable       | Required | Default | Description |
|----------------|----------|---------|-------------|
| `API_KEY`      | Yes      | —       | Your Netcup API key. Found in the Netcup CCP under _Master Data → API_. |
| `API_USER`     | Yes      | —       | Your Netcup customer number (numeric). |
| `API_PASSWORD` | Yes      | —       | Your Netcup API password (different from your login password). |
| `RECORDS`      | Yes      | —       | Which DNS records to update — see format below. |
| `TOKEN`        | Yes      | —       | A secret Bearer token you define to protect this service. |
| `PORT`         | No       | `3000`  | The port the HTTP server listens on. |

### RECORDS Format

The `RECORDS` variable tells the service which DNS A records to update. Multiple domains and hostnames are supported.

```
RECORDS=<domain>:<hostname1>,<hostname2>;<domain2>:<hostname>
```

| Symbol | Meaning |
|--------|---------|
| `;`    | Separates domain entries |
| `:`    | Separates the domain from its hostname list |
| `,`    | Separates multiple hostnames within one domain |
| `@`    | The root/apex record of the domain (e.g. `example.com` itself) |

**Examples:**

| Goal | Value |
|------|-------|
| Update `home.example.com` | `RECORDS=example.com:home` |
| Update `home.example.com` and `www.example.com` | `RECORDS=example.com:home,www` |
| Update the root `example.com` | `RECORDS=example.com:@` |
| Update records across two domains | `RECORDS=example.com:home,www;other.com:@` |

---

## API Reference

### `GET /health`

Public health check endpoint. Does not require authentication. Used by Docker to verify the container is running.

**Response:** `200 OK` with body `OK`

```bash
curl http://localhost:3000/health
```

---

### `GET /:ip`

Updates all configured DNS A records to the given IPv4 address.

**Authentication:** Requires `Authorization: Bearer <TOKEN>` header.

**IP address:** Provided as a URL path segment or as a `?ip=` query parameter.

**Request examples:**

```bash
# IP as path segment
curl "http://localhost:3000/1.2.3.4" \
  -H "Authorization: Bearer your-token-here"

# IP as query parameter
curl "http://localhost:3000/?ip=1.2.3.4" \
  -H "Authorization: Bearer your-token-here"
```

**Responses:**

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `Update successful` | All DNS records updated. |
| `400 Bad Request` | `Missing or invalid IPv4 address` | The IP is absent or not a valid IPv4 address. |
| `401 Unauthorized` | `Unauthorized` | Missing or wrong `Authorization` header. |
| `500 Internal Server Error` | `An error occurred!` | The Netcup API call failed. Check server logs. |

---

## Setup for Development

### Prerequisites

- Node.js v22 or higher
- A Netcup account with API access (for integration testing against the real API)

### 1. Clone the repository

```bash
git clone <repository-url>
cd netcup-dyndns
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.template .env
# Edit .env with your values
```

### 4. Start the development server

```bash
npm start
```

### 5. Run the test suite

```bash
npm test
```

The test suite uses [Vitest](https://vitest.dev/) and [Supertest](https://github.com/ladjs/supertest). All 35 tests run in isolation without requiring real Netcup credentials.

```bash
npm run test:watch   # watch mode — re-runs on file changes
```

---

## Project Structure

```
netcup-dyndns/
├── src/
│   ├── config.mjs    — Environment variable parsing and validation
│   ├── netcup.mjs    — Netcup JSON-RPC API client (native fetch, auto session refresh)
│   └── routes.mjs    — Express router (/health, auth middleware, /:ip update handler)
├── test/
│   ├── config.test.mjs
│   ├── netcup.test.mjs
│   └── routes.test.mjs
├── index.mjs         — Entry point: wires config, client, and router
├── Dockerfile
├── .env.template
└── .github/
    └── workflows/
        ├── docker.yml   — Builds and pushes Docker image on main branch pushes
        └── test.yml     — Runs the test suite on every push and pull request
```

---

## Architecture

The service is intentionally minimal: ~300 lines of application code across three modules.

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────┐
│            Express App              │
│                                     │
│  GET /health  ──► 200 OK            │
│                                     │
│  Auth Middleware                    │
│  (checks Authorization header)      │
│        │                            │
│        ▼                            │
│  GET /:ip                           │
│  ├─ validate IPv4                   │
│  ├─ for each domain/hostname:       │
│  │    infoDnsRecords()              │
│  │    updateDnsRecords()            │
│  └─ respond 200 / 400 / 500         │
└───────────────┬─────────────────────┘
                │
                ▼
     ┌──────────────────────┐
     │   Netcup CCP API     │
     │  (JSON-RPC over HTTPS)│
     └──────────────────────┘
```

### Module responsibilities

**`src/config.mjs`**  
Reads environment variables, validates that all required values are present, and parses the `RECORDS` string into a structured list of `{ domain, hostnames }` objects. Injectable `env` parameter makes it fully unit-testable.

**`src/netcup.mjs`**  
Wraps the Netcup CCP JSON-RPC API. Uses Node.js built-in `fetch` (no external HTTP library). Manages API session lifecycle: logs in on creation and automatically re-authenticates on session expiry (status code 4001) without the caller needing to know.

**`src/routes.mjs`**  
Defines two routes: a public `/health` endpoint before the auth middleware, and an authenticated `/:ip?` handler that iterates over all configured records, fetches the current DNS data from Netcup, and updates each matching A record.

**`index.mjs`**  
The entry point. Loads config, creates the Netcup client (which logs in immediately), attaches the router to Express, and starts the server.

### Design decisions

- **No external HTTP client:** Node.js v22 ships with a stable `fetch` implementation. Eliminating `axios` removes a transitive dependency chain that historically carried CVEs.
- **Session auto-refresh:** Long-running deployments can outlive the Netcup session timeout. The `withRefresh` wrapper in the API client handles this transparently.
- **Read-before-write for DNS:** The update handler fetches the full DNS record set first and only updates records that exist and match the requested hostname and type. This preserves all other record fields (TTL, priority, etc.) and avoids accidentally deleting records.
- **Dependency injection:** Config and client are passed into the router rather than imported directly, making every module independently unit-testable with mock objects.

---

## CI/CD & GitHub Actions

Two workflows run automatically:

### `test.yml` — Test Suite

Runs on every **push** and **pull request** to any branch.

- Sets up Node.js v22
- Installs dependencies
- Runs `npm test`

Pull requests cannot be merged if the test suite fails (configure branch protection rules in your repository settings to enforce this).

### `docker.yml` — Docker Build & Push

Runs on every **push to `main`**.

- Builds the Docker image from `Dockerfile`
- Pushes to GitHub Container Registry (`ghcr.io`) as `ghcr.io/<owner>/netcup-dyndns:latest`

---

## Security

- **Token authentication:** All update requests require a Bearer token. Choose a long random value (at least 32 characters). Generate one with `openssl rand -hex 32`.
- **IPv4 validation:** The IP parameter is validated with Node.js `net.isIPv4()` before being sent to the Netcup API. Invalid values are rejected with `400`.
- **No dependency on axios:** The project uses native `fetch`, avoiding the CVE history associated with older axios versions.
- **Read-before-write:** Only existing A records matching the configured hostnames are modified. The service never creates or deletes records.
- **Non-root container:** The Docker image runs as an unprivileged user (`dyndns`) inside the container.
- **Secrets:** Never commit your `.env` file. The `.gitignore` excludes it by default.

---

## License

This project is licensed under the [ISC License](./LICENSE).
