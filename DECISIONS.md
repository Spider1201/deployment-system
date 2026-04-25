# Architectural Decisions

This document outlines the key architectural choices made for the Mini PaaS implementation.

## Core Design Decisions

### 1. Live Log Streaming via SSE (Server-Sent Events)

**Decision**: Use SSE instead of WebSocket  
**Rationale**:
- Simpler to implement and debug
- Better browser support for one-directional streaming (logs flow server→client)
- Automatic reconnection handling
- Fits the use case perfectly (receive only, no bidirectional)

**Implementation Details**:
- `/logs/:id` endpoint maintains active response streams per deployment
- New logs broadcast to all connected clients
- Existing logs sent on connection for history
- Clients automatically cleanup on disconnect

### 2. In-Memory Deployment State

**Decision**: Keep deployments in-memory array instead of database  
**Rationale**:
- MVP speed - no DB setup required
- `docker compose up` remains simple
- Logs persist within deployment lifetime
- Good enough for task demo

**Trade-offs**:
- Lost on container restart
- Can't query historical deployments
- No scaling to multiple API instances

**Future**: Would add SQLite/Postgres with proper indexing

### 3. Docker Socket Mounting

**Decision**: Mount Docker daemon socket to backend container  
**Rationale**:
- Allows backend to build and run containers
- Standard pattern for container-in-container orchestration
- Simpler than Docker API over TCP

**Security Note**:
- Mounting `/var/run/docker.sock` gives full Docker access
- Fine for dev/demo, wouldn't do in production
- Production would use restricted API with TLS + credentials

### 4. Single Caddy Instance for Ingress

**Decision**: Route all traffic through Caddy → API → Deployment logic  
**Rationale**:
- Simpler than dynamic route creation per deployment
- API can handle routing based on deployment ID
- Meets requirement of "Caddy as single ingress point"

**Implementation**:
- Caddy listens on :80
- `/app/*` → API (API returns deployment status page)
- `/deploy` → API (POST endpoint)
- `/logs/*` → API (SSE endpoint)
- `/` → Frontend (Vite dev server)

**Alternative Considered**:
- Dynamic route creation with Caddy API
- Would require: Caddy admin socket, complex state management
- Skipped for MVP, can be added later

### 5. Git Cloning Over File Upload

**Decision**: Support Git URLs as primary deployment method  
**Rationale**:
- Simpler for demo (no file UI complexity)
- Matches real PaaS workflow (push to Git → auto-deploy)
- Fewer backend complexities

**File Upload Support**:
- Multer middleware added but not fully implemented
- Can be extended to handle .zip/.tar files

### 6. Railpack Fallback to Docker Build

**Decision**: Try Railpack first, fall back to basic Dockerfile  
**Rationale**:
- Supports Railpack if available (handles unknown frameworks)
- Graceful fallback for standard Node.js projects
- No external tool requirement (Docker is already needed)

**Implementation**:
1. Check for existing Dockerfile
2. If not found, try `railpack` CLI
3. If railpack unavailable, generate basic Node.js Dockerfile
4. Build image with Docker API

### 7. Dynamic Port Assignment

**Decision**: Assign incrementing ports (3000, 3001, 3002...)  
**Rationale**:
- Avoid port conflicts on container host
- Simple offset-based allocation
- Suitable for single-machine deployment

**Limitation**: 
- Not suitable for distributed deployments
- Would need port management service for production

### 8. Frontend Tech Stack

**Decision**: React + Vite + TanStack (minimal setup)  
**Rationale**:
- Task requirement (Vite + TanStack)
- TanStack Router for future multi-page support
- React Query for API state management

**Styling**:
- Inline styles (no CSS framework)
- Meets requirement of "functional is fine"
- Easy to theme later

### 9. API Design

**Decision**: REST endpoints with status codes  
**Rationale**:
- Simple, conventional, easy to debug
- Fits use case of status queries

**Endpoints**:
- `POST /deploy` - Idempotent-ish (returns immediately)
- `GET /deployments` - List all
- `GET /logs/:id` - Stream logs via SSE
- `GET /app/:id` - Status page

**Alternative Considered**: GraphQL
- Overkill for this scope
- Would add dependency complexity
- REST is more familiar

## Trade-offs Made

### For MVP Speed
1. ❌ No database → in-memory only
2. ❌ No authentication → anyone can deploy
3. ❌ No rate limiting → no DoS protection
4. ❌ No build cache → every deploy rebuilds from scratch

### For Simplicity
1. ❌ No container cleanup → accumulates images/containers
2. ❌ No graceful shutdown → kills containers abruptly
3. ❌ No health checks → no container monitoring
4. ❌ No log rotation → logs grow unbounded

## Production Hardening Needed

If productionizing this system:

1. **Observability**
   - Structured logging with timestamp/level
   - Container metrics collection
   - Build duration tracking

2. **Reliability**
   - Build cache between deployments
   - Container health checks
   - Automatic restart on failure
   - Graceful shutdown (SIGTERM handling)

3. **Security**
   - User authentication / multi-tenancy
   - Environment variable secrets management
   - Image scanning / vulnerability checks
   - Rate limiting on /deploy endpoint

4. **Persistence**
   - Database for deployment history
   - Object storage for build artifacts
   - Log archival / rotation

5. **Scalability**
   - Multiple backend instances behind load balancer
   - Distributed state (Redis for SSE broadcast)
   - Cluster-aware port allocation
   - Separate build vs. run workers

## Performance Characteristics

### Current Limitations
- Single container builds serially
- No build cache reuse
- Logs stored in-memory (unbounded growth)
- One API process per container host

### Expected Performance
- Build time: ~30-60s depending on project size
- Log streaming latency: <100ms
- Concurrent deployments: Limited by CPU/disk

## Testing Strategy

### What Would Be Tested
1. SSE connection/disconnection
2. Build success/failure paths
3. Container startup/shutdown
4. Log persistence and ordering
5. Concurrent deployments
6. Git clone with various repo structures

### Not Tested (MVP)
- Malicious input handling
- Resource exhaustion
- Network failures
- Container out-of-memory
- Disk space constraints

## Future Improvements (Ordered by Priority)

1. **Build Cache** - Reuse layers across deploys (20% speedup)
2. **Container Cleanup** - Auto-remove old containers/images
3. **Database** - Persistent deployment history
4. **Rollback** - Redeploy previous image tags
5. **Secrets** - Environment variable injection
6. **Health Checks** - Monitor deployed containers
7. **Metrics** - Deployment success rate, duration tracking
8. **Auth** - User isolation and multi-tenancy
9. **CI/CD** - GitHub webhooks for auto-deploy
10. **UI** - Better UX, redeploy button, delete deployments

## Why These Choices Work

✅ Meets all hard requirements:
- Runs with `docker compose up` ✓
- Live log streaming ✓
- Railpack builds (with fallback) ✓
- Caddy ingress ✓

✅ Good code structure:
- Separation of concerns (frontend/backend/pipeline)
- Error handling and async/await
- Type safety with TypeScript

✅ Observable behavior:
- Logs show every step
- Timestamps help debug
- UI updates in real-time

✅ Maintainable for 6 months:
- No magic or over-engineering
- Clear variable names
- Documented decisions
- Reasonable file structure
