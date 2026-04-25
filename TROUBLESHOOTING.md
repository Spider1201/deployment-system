# Setup Troubleshooting Guide

## Common Issues & Solutions

### Docker Compose Won't Start

**Issue**: `docker compose up` fails immediately

**Solutions**:
1. Ensure Docker daemon is running
   - Windows: Start Docker Desktop
   - Mac: `open -a Docker`
   - Linux: `sudo systemctl start docker`

2. Check ports are available:
   ```bash
   netstat -an | grep -E ":(80|5000|5173)"  # Should show no connections
   ```
   - Port 80: Caddy
   - Port 5000: API
   - Port 5173: Frontend
   
3. If ports in use, stop conflicting services or modify docker-compose.yml

### Containers Starting But API Errors

**Issue**: Service containers up but API crashes or won't connect

**Solutions**:
1. Check API logs:
   ```bash
   docker compose logs -f api
   ```

2. Verify Docker socket is mounted:
   ```bash
   docker compose exec api ls -la /var/run/docker.sock
   ```
   - Should show socket file permissions

3. Docker socket permission issues:
   - Might need different user group
   - On Windows/Mac usually not an issue (Docker Desktop handles)
   - On Linux: User might not be in docker group

### Frontend Can't Reach API

**Issue**: Browser shows network errors when deploying

**Solutions**:
1. Check Caddy is routing correctly:
   ```bash
   curl http://localhost/deploy  # Should get 405 (not allowed for GET)
   ```

2. Verify API responses (from container):
   ```bash
   docker compose exec api curl http://localhost:5000/deployments
   ```

3. Check browser console (F12) for actual error messages

4. Ensure frontend is using correct API URL:
   - In Docker: should use base URL `/` (relative)
   - In dev: should use `http://localhost:5000`

### Deployments Fail During Build

**Issue**: Deployment status stuck in "building" or jumps to "failed"

**Solutions**:
1. Check if image built:
   ```bash
   docker images | grep mini-paas
   ```

2. Check Docker build errors:
   ```bash
   docker compose logs -f api | grep -i error
   ```

3. Common build failures:
   - **Git clone failed**: Check repository is public or SSH setup
   - **npm install failed**: Missing package.json or broken dependencies
   - **Port conflict**: Container can't bind to already-used port

4. For repo-specific issues:
   - Verify repo has package.json and start script
   - Test repo locally first: `git clone && npm install && npm start`

### No Logs Appearing

**Issue**: Logs section stays empty after deployment

**Solutions**:
1. Check SSE connection:
   ```bash
   curl -N http://localhost:5000/logs/YOUR_DEPLOYMENT_ID
   ```
   - Should stream data: events
   - If failed, check deployment ID is correct

2. Verify logs exist on deployment:
   - View /app/:id route in browser
   - Shows deployment details including logs that server has

3. Browser console errors (F12):
   - Check for JavaScript errors
   - Check Network tab for /logs request status

4. EventSource requirements:
   - Browser must support EventSource (all modern browsers)
   - CORS must be configured (is in code)

### Can't Access Deployed App

**Issue**: Deployment shows as "running" but app isn't accessible

**Solutions**:
1. Check Caddy routing:
   ```bash
   curl -I http://localhost/app/DEPLOYMENT_ID
   ```
   - Should get 200 (success)

2. Check deployed container is listening:
   ```bash
   docker ps  # Find container ID
   docker exec CONTAINER_ID curl http://localhost:3000
   ```

3. Check port mapping:
   - Backend assigned port (e.g., 3000)
   - Sample app listens on PORT env var
   - Container should be listening on that port

4. Common app startup issues:
   - Missing dependencies: `npm install` fails
   - Invalid Node.js code: app crashes immediately
   - Port already in use: can't bind

### Git Clone Fails

**Issue**: Deployment stuck with "Failed to clone repository"

**Solutions**:
1. Verify repository URL format:
   - Correct: `https://github.com/user/repo.git`
   - Also works: `https://github.com/user/repo`
   - Not: `https://github.com/user/repo.git/` (trailing slash)

2. Test clone manually:
   ```bash
   docker compose exec api git clone https://github.com/user/repo.git /tmp/test
   ```

3. Check git inside API container:
   ```bash
   docker compose exec api git --version
   ```
   - Should show git version

4. For private repos:
   - Not supported in this MVP
   - Would need SSH key mounting
   - Or: GitHub personal access token in URL

### Out of Disk Space

**Issue**: Docker build fails with "no space left on device"

**Solutions**:
1. Clean up Docker images:
   ```bash
   docker system prune -a --volumes
   ```

2. Remove old deployments:
   ```bash
   docker images | grep mini-paas
   docker rmi mini-paas:*
   ```

3. Check disk:
   ```bash
   df -h
   du -sh ~/.*docker* ~/.docker
   ```

### Port Conflicts

**Issue**: Containers won't start, "Address already in use"

**Solutions**:
1. Check what's using ports:
   ```bash
   netstat -tulpn | grep -E "(80|5000|5173)"
   ```

2. Stop conflicting process:
   ```bash
   kill -9 PID    # Replace PID from above
   ```

3. Or modify docker-compose.yml to use different host ports:
   ```yaml
   ports:
     - "8080:80"    # Use 8080 instead of 80
     - "5001:5000"  # Use 5001 instead of 5000
   ```

## Development Debugging

### View All Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f caddy
```

### Access Container Shell

```bash
# API shell
docker compose exec api sh

# Inside API container:
ls -la /tmp/projects/          # See cloned repos
docker images | grep mini-paas # See built images
curl http://localhost:5000/deployments  # Test API directly
```

### Manual Deployment Test

```bash
# Try deployment via curl
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "gitUrl=https://github.com/yourusername/mini-paas" \
  http://localhost:5000/deploy

# Watch logs stream
curl -N http://localhost:5000/logs/RETURNED_ID
```

### Network Debugging

```bash
# Check Docker network
docker network ls
docker inspect NETWORK_NAME

# Check connectivity between containers
docker compose exec api ping frontend
docker compose exec api ping caddy
```

## Performance Debugging

### Slow Deployments

1. **Check Docker build time**:
   - First build slower (base images pull)
   - Check network: `docker compose logs api | grep "Pulling"`

2. **Monitor system resources**:
   - CPU usage: `docker stats`
   - Disk I/O: `docker exec api df -h`

3. **Optimize project**:
   - Reduce dependencies
   - Use .dockerignore
   - Consider build cache

### Memory Issues

```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Edit Docker Desktop settings or daemon.json
```

## Getting Help

### Enable Debug Logging

Update backend/src/server.ts:
```typescript
const DEBUG = true;

if (DEBUG) {
  addLog(deployment, `[DEBUG] Docker image build started`);
  // ... add more debug logs
}
```

### Check System Info

```bash
docker version
docker info
node --version
npm --version
git --version
```

### Common Next Steps

1. If logs show repo clone issue → Fix Git URL or repo access
2. If build fails → Check repo has proper Node.js setup
3. If logs don't stream → Check browser console for JS errors
4. If can't access app → Check port forwarding and app startup logs

## Still Stuck?

1. **Check the README** - Architecture section explains full flow
2. **Check DECISIONS.md** - Explains why things work this way
3. **Review server.ts** - Comments explain deployment pipeline
4. **Test locally first** - Get Node.js app working on localhost:3000, then deploy

Good luck! 🚀
