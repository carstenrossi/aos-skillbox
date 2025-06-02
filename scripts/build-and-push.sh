#!/bin/bash

# Skillbox Docker Multi-Platform Build & Push Script
# Erstellt Images für linux/amd64 und linux/arm64

set -e

echo "🚀 Building and pushing Skillbox images for multiple platforms..."

# Login to GitHub Container Registry
echo "📝 Logging in to GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

# Create and use a new builder instance for multi-platform builds
echo "🔧 Setting up multi-platform builder..."
docker buildx create --name skillbox-builder --use --bootstrap || docker buildx use skillbox-builder

# Generate timestamp tag for forcing image updates
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
echo "📅 Using timestamp tag: $TIMESTAMP"

# Build and push backend image for multiple platforms
echo "🔨 Building and pushing backend image..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file docker/Dockerfile.backend \
  --tag ghcr.io/carstenrossi/skillbox-backend:latest \
  --tag ghcr.io/carstenrossi/skillbox-backend:$TIMESTAMP \
  --push \
  .

# Build and push frontend image for multiple platforms
echo "🔨 Building and pushing frontend image..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file docker/Dockerfile.frontend \
  --tag ghcr.io/carstenrossi/skillbox-frontend:latest \
  --tag ghcr.io/carstenrossi/skillbox-frontend:$TIMESTAMP \
  --push \
  .

echo "✅ Multi-platform images successfully built and pushed to GitHub Container Registry!"
echo ""
echo "📋 Available images:"
echo "   - ghcr.io/carstenrossi/skillbox-backend:latest (linux/amd64, linux/arm64)"
echo "   - ghcr.io/carstenrossi/skillbox-backend:$TIMESTAMP (linux/amd64, linux/arm64)"
echo "   - ghcr.io/carstenrossi/skillbox-frontend:latest (linux/amd64, linux/arm64)"
echo "   - ghcr.io/carstenrossi/skillbox-frontend:$TIMESTAMP (linux/amd64, linux/arm64)"
echo ""
echo "🌐 These images will now work on both x86_64 and ARM64 servers (including Elestio)."
echo ""
echo "🔄 To force Elestio to use new images, use the timestamped tags:"
echo "   ghcr.io/carstenrossi/skillbox-backend:$TIMESTAMP"
echo "   ghcr.io/carstenrossi/skillbox-frontend:$TIMESTAMP" 