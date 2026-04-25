#!/bin/bash
# Quick start script for development

echo "🚀 Starting Mini PaaS..."
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
  echo "❌ Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Build and start the stack
echo "📦 Building and starting services..."
docker compose up --build

echo ""
echo "✅ Mini PaaS is running!"
echo ""
echo "🌐 Access the dashboard at: http://localhost"
echo ""
