# Mini PaaS - Brimble Take-Home Task

This project is my submission for the Brimble Fullstack / Infra Engineer role. It’s a mini version of Brimble’s platform: a one‑page deployment pipeline with a frontend, backend API, Docker builds, and Caddy ingress

## Features

Deploy apps from GitHub repos or uploads
Build container images automatically (Railpack‑style detection)
Run containers locally with Docker
Route traffic through Caddy as a single ingress point
Show live build/deploy logs in the UI via SSE
One-page dashboardfor deployment management  
Fully end-to-end with `docker compose up`  

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git Installed

### Run With

```bash
docker compose up
```

This will start:
- UI on http://localhost (via Caddy)
- API on port 5000
- Caddy reverse proxy on port 80

### First Deployment

1. Open http://localhost in your browser
2. Enter the Git repository URL  `https://github.com/Spider1201/sample-app.git`
3. Click **Deploy**
4. Watch logs stream live as the build and deployment progresses

## Architecture

### Frontend (React + Vite + TanStack Router/Query)
- One‑page dashboard showing deployments, status, and logs

### Backend API (Express + TypeScript)
**Endpoints**:
  - `POST /deploy` - Create new deployment (accepts Git URL)
  - `GET /deployments` - List all deployments
  - `GET /logs/:id` - live log stream (SSE)
  - `GET /app/:id` - deployment status page

### Deployment Pipeline
1. Clone Repository (Git)
2. Detect Framework (package.json, requirements.txt, Gemfile, go.mod, etc.)
3. Generate Dockerfile (automatically, no handwritten Dockerfiles)
4. Build Docker Image (Docker API)
4. Run Container (Docker socket)
5. Route Traffic (Caddy reverse proxy)

### Log Architecture
- Logs stored in-memory per deployment
- SSE endpoint broadcasts new logs to all connected clients
- Existing logs sent on initial connection (scroll history preserved)
- Automatic connection cleanup on client disconnect

## Project Structure

```
.
├── frontend/              # React dashboard
│   ├── src/
│   │   ├── Dashboard.tsx  # Main UI component
│   │   ├── main.tsx       # Entry point
│   │   └── routes/        # TanStack Router setup
│   └── Dockerfile
├── backend/               # Express API
│   ├── src/
│   │   └── server.ts      # Main server (deployment pipeline)
│   ├── package.json
│   └── Dockerfile
├── sample-app/            # Sample Node.js container app
│   ├── index.js
│   └── Dockerfile
├── docker-compose.yml     # Full stack orchestration
├── Caddyfile              # Reverse proxy routing
└── README.md
```

## Key Implementation Details

### SSE Log Streaming
- Clients connect to `/logs/:id` endpoint
- Server maintains a set of active response streams per deployment
- New logs broadcasted to all connected clients
- Logs persisted in deployment object for late-joining clients

### Docker Integration
- Backend has Docker socket mounted: `/var/run/docker.sock`
- Uses `dockerode` Node.js library for container lifecycle
- Builds images from Git-cloned projects or uploaded files
- Assigns dynamic ports (starting from 3000) to each container

### Deployment Status Flow
```
pending → building → deploying → running
                  ↓
                failed (on error)
```


## Environment Variables

- `NODE_ENV`: Set to `production` in containers
- `PORT`: Dynamically assigned per deployment (default: 3000 for the sample app)



## Testing

1. **Local Development**:
   ```bash
   cd frontend && npm run dev
   cd backend && npm run dev
   ```

2. **Docker Compose**:
   ```bash
   docker compose up
   ```

3. **Deploy Sample App**:
   - Push this repo to GitHub
   - Use the GitHub URL in the deployment form
   - Watch logs stream live

## Debugging

Check logs:
```bash
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f caddy
```

Access API directly:
```bash
 http://localhost:5000/deployments
```

## Notes

- The backend needs Docker socket access to build and run containers
- Each deployment gets a unique port to avoid conflicts
- Logs are kept for the lifetime of the deployment
- The frontend connects to the API on the same host (Caddy handles routing in Docker)


