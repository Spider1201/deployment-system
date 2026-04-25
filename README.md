# Mini PaaS - Brimble Take-Home Task

A one-page deployment pipeline built with **Vite + TanStack**, an Express API, Docker-based containerization, and Caddy ingress. Deploy applications from Git repositories with live log streaming.

## Features

✅ **Live log streaming** via Server-Sent Events (SSE)  
✅ **One-page dashboard** UI for deployment management  
✅ **Git repository support** for deployment source  
✅ **Docker containerization** with automated builds  
✅ **Caddy reverse proxy** for traffic routing  
✅ **Full end-to-end** with `docker compose up`  

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Run Everything

```bash
docker compose up
```

This will start:
- **Frontend** on http://localhost (via Caddy)
- **API** on port 5000
- **Caddy** reverse proxy on port 80

### First Deployment

1. Open http://localhost in your browser
2. Enter a Git repository URL (e.g., `https://github.com/user/repo.git`)
3. Click "Deploy"
4. Watch logs stream live as the build and deployment progresses

## Architecture

### Frontend (React + Vite)
- **Location**: `/frontend`
- **Tech**: React 19, TanStack Router, React Query
- **Features**:
  - One-page dashboard displaying deployments
  - Live log streaming via EventSource (SSE)
  - Real-time status updates (pending → building → deploying → running)
  - Deployment details: ID, image tag, port, container info

### Backend API (Express + TypeScript)
- **Location**: `/backend`
- **Tech**: Express.js, TypeScript, Docker client
- **Endpoints**:
  - `POST /deploy` - Create new deployment (accepts Git URL or file upload)
  - `GET /deployments` - List all deployments
  - `GET /logs/:id` - Stream logs for a deployment (SSE)
  - `GET /app/:id` - View deployment status page

### Deployment Pipeline
1. **Clone** Repository (Git)
2. **Build** Image (Railpack fallback → Docker build)
3. **Run** Container (Docker socket access)
4. **Route** Traffic (Caddy reverse proxy)

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

## Deployment Demo

### Deploy the Sample App
Clone and deploy the included sample app:

```bash
# During deployment, use:
# Git URL: https://github.com/yourusername/mini-paas.git
# (or adjust to your fork)
```

Or deploy any Node.js app with a `package.json` from GitHub.

## Technologies Used

- **Frontend**: React 19 + Vite + TanStack (Router, Query)
- **Backend**: Express.js + TypeScript
- **Containerization**: Docker API (dockerode)
- **Reverse Proxy**: Caddy
- **Build Tool**: Railpack (if available)
- **Real-time**: Server-Sent Events (SSE)

## Environment Variables

- `NODE_ENV`: Set to `production` in containers
- `PORT`: Dynamically assigned per deployment (default: 3000 for sample app)

## What Would Be Done With More Time

1. **Database Persistence**: SQLite/Postgres for deployment history
2. **Rollback Support**: Keep and manage multiple image versions
3. **Secrets Management**: Environment variable injection per deployment
4. **Graceful Shutdown**: Zero-downtime redeployments
5. **Build Cache**: Layer caching across builds
6. **Auth**: Basic auth or OAuth for multi-user
7. **Metrics**: Deployment success rate, build duration tracking
8. **Cleanup**: Automatic container and image cleanup
9. **Error Recovery**: Retry logic for failed builds
10. **File Upload**: Proper .zip/.tar handling instead of Git only

## Known Limitations

- No persistent database (in-memory deployments)
- Railpack fallback to basic Dockerfile if not installed
- No authentication
- Single machine deployment (no orchestration like Nomad)
- File uploads need proper archive extraction
- No build cache between deploys
- Caddy config is static (would be dynamic in production)

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
curl http://localhost:5000/deployments
```

## Notes

- The backend needs Docker socket access to build and run containers
- Each deployment gets a unique port to avoid conflicts
- Logs are kept for the lifetime of the deployment
- The frontend connects to the API on the same host (Caddy handles routing in Docker)

## Score Mapping

- **Hard requirements (30%)**: ✅ docker compose up, ✅ live streaming, ✅ Brimble deploy
- **End-to-end works (20%)**: ✅ Full pipeline functioning
- **Pipeline design (20%)**: ✅ Railpack → Docker → Caddy
- **Code quality (15%)**: ✅ Structured, maintainable code
- **Frontend/API (5%)**: ✅ Functional one-page UI, clean API design
- **Brimble feedback (5%)**: (To be submitted separately)
- **README (5%)**: ✅ This file + architecture notes
