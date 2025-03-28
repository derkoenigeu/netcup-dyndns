# Netcup DynDNS

A simple Dynamic DNS (DynDNS) service for updating DNS records on Netcup using their API.

## Features
- Updates A records for specified domains and subdomains.
- Secured with a token-based authentication.
- Lightweight and easy to deploy.
- Includes a health check endpoint for monitoring.

## Requirements
- Docker (recommended for production)
- Node.js (v20 or higher, for development)

## Setup for Production

### 1. Use the Pre-Built Docker Image
The easiest way to deploy this service is by using the pre-built Docker image available on GitHub Container Registry (GHCR).

```bash
docker run -d -p 3000:3000 --env-file .env ghcr.io/derkoenigeu/netcup-dyndns:latest
```

### 2. Configure Environment Variables
Create a `.env` file and fill in the required values:

| Variable   | Description                                      |
|------------|--------------------------------------------------|
| `PORT`     | Port for the server to listen on (default: 3000) |
| `API_KEY`  | Netcup API key                                   |
| `USER`     | Netcup customer number                          |
| `PASSWORD` | Netcup API password                             |
| `RECORDS`  | DNS records to update (format: `domain:sub1,sub2`) |
| `TOKEN`    | Bearer token for authentication                 |

## Setup for Development or Contributing

### 1. Clone the Repository
If you want to contribute or run the service locally for development, clone the repository:

```bash
git clone <repository-url>
cd netcup-dyndns
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the `.env.template` file to `.env` and fill in the required values:
```bash
cp .env.template .env
```

### 4. Run the Application
```bash
npm start
```

The server will start on the specified port.

## Usage

### Update DNS Records
Send a `GET` request to the server with the IP to update:
```bash
curl -X GET "http://localhost:3000/<ip>" -H "Authorization: Bearer <TOKEN>"
```

### Health Check Endpoint
The application provides a `/health` endpoint for monitoring purposes. This endpoint returns a `200 OK` status if the service is running correctly.

```bash
curl -X GET "http://localhost:3000/health"
```

This endpoint is used in the Docker health check configuration to ensure the container is healthy.

## GitHub Actions
This project includes a GitHub Actions pipeline to build and push the Docker image to `ghcr.io`.

## License
This project is licensed under the [ISC License](./LICENSE).
