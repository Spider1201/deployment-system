# Stage 1: Build frontend
FROM node:22 AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build

# Stage 2: Build backend
FROM node:22 AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend .
# Copy built frontend into backend's public folder
COPY --from=frontend /frontend/dist ./public

EXPOSE 5000
CMD ["npm", "run", "start"]
