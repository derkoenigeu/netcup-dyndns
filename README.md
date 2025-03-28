# Netcup DynDNS

A simple Dynamic DNS (DynDNS) service for updating DNS records on Netcup using their API.

## Features
- Updates A records for specified domains and subdomains.
- Secured with a token-based authentication.
- Lightweight and easy to deploy.

## Requirements
- Node.js (v20 or higher)
- Docker (optional, for containerized deployment)

## Setup

### 1. Clone the Repository
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

| Variable   | Description                                      |
|------------|--------------------------------------------------|
| `PORT`     | Port for the server to listen on (default: 3000) |
| `API_KEY`  | Netcup API key                                   |
| `USER`     | Netcup customer number                          |
| `PASSWORD` | Netcup API password                             |
| `RECORDS`  | DNS records to update (format: `domain:sub1,sub2`) |
| `TOKEN`    | Bearer token for authentication                 |

### 4. Run the Application
```bash
npm start
```

The server will start on the specified port.

## Usage
Send a `GET` request to the server with the IP to update:
```bash
curl -X GET "http://localhost:3000/<ip>" -H "Authorization: Bearer <TOKEN>"
```

## Docker Deployment
Build and run the Docker container:
```bash
docker build -t netcup-dyndns .
docker run -d -p 3000:3000 --env-file .env netcup-dyndns
```

## GitHub Actions
This project includes a GitHub Actions pipeline to build and push the Docker image to `ghcr.io`.

## License
This project is licensed under the ISC License.
