#!/bin/bash

# 🚀 Skillbox Smart Docker Build Script
# Supports 3-stage deployment workflow: Source → Docker Dev → Docker Production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_workflow() {
    echo -e "${PURPLE}[WORKFLOW]${NC} $1"
}

# Default values
ENVIRONMENT="development"
PUSH=false
NO_CACHE=false
REGISTRY="ghcr.io/carstenrossi"

# Workflow validation
check_git_status() {
    if ! git diff-index --quiet HEAD --; then
        print_warning "⚠️ Uncommitted changes detected!"
        print_status "It's recommended to commit changes before building Docker images"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Build cancelled"
            exit 0
        fi
    else
        print_success "✅ Git repository is clean"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        --skip-git-check)
            SKIP_GIT_CHECK=true
            shift
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --multi-platform)
            MULTI_PLATFORM=true
            shift
            ;;
        -h|--help)
            echo "🚀 Skillbox Smart Docker Build Script"
            echo "Supports 3-stage deployment workflow: Source → Docker Dev → Docker Production"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --environment ENV    Environment (development|production) [default: development]"
            echo "  -p, --push              Push images to registry after building"
            echo "  --no-cache              Build without using cache"
            echo "  -r, --registry REGISTRY Registry [default: ghcr.io/carstenrossi]"
            echo "  --skip-git-check        Skip git status check"
            echo "  --platform PLATFORM     Target platform (linux/amd64, linux/arm64) [default: auto]"
            echo "  --multi-platform         Build for both amd64 and arm64 platforms"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "🔄 Workflow Examples:"
            echo "  $0                                    # Stage 1: Build dev images for testing"
            echo "  $0 -e production -p --multi-platform # Stage 2: Build & push production images (both platforms)"
            echo "  $0 -e production -p --platform linux/amd64  # Stage 2: Build & push for Elestio only"
            echo ""
            echo "📋 Recommended Workflow:"
            echo "  1. Develop & test in local source code"
            echo "  2. Build development images for container testing (local platform)"
            echo "  3. Build & push production images for Elestio deployment (amd64)"
            echo ""
            echo "📖 More info: See DEPLOYMENT.md"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Environment must be 'development' or 'production'"
    exit 1
fi

# Print workflow header
echo ""
echo "🚀 =============================================="
echo "   Skillbox Smart Docker Build"
echo "   3-Stage Deployment Workflow"
echo "=============================================="
echo ""

# Workflow status
if [[ "$ENVIRONMENT" == "development" ]]; then
    print_workflow "📍 STAGE 2: Docker Development Build"
    print_status "Purpose: Test container images before production"
    print_status "Next step: Test on localhost:3003, then build production"
else
    print_workflow "📍 STAGE 3: Production Build & Deploy"
    print_status "Purpose: Build final images for Elestio deployment"
    print_status "Next step: Update docker-compose.prod.yml and deploy"
fi

echo ""

# Git status check (unless skipped)
if [[ "$SKIP_GIT_CHECK" != true ]]; then
    print_status "Checking git repository status..."
    check_git_status
fi

# Set compose file based on environment
if [[ "$ENVIRONMENT" == "development" ]]; then
    COMPOSE_FILE="docker-compose.dev.yml"
else
    COMPOSE_FILE="docker-compose.prod.smart.yml"
fi

print_status "Environment: $ENVIRONMENT"
print_status "Compose file: $COMPOSE_FILE"
print_status "Registry: $REGISTRY"

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    print_error "Compose file $COMPOSE_FILE not found"
    exit 1
fi

# Platform detection and setup
setup_platform() {
    # Auto-detect platform if not specified
    if [[ -z "$PLATFORM" && "$MULTI_PLATFORM" != true ]]; then
        # For development: use local platform
        # For production: ALWAYS use multi-platform for maximum compatibility
        if [[ "$ENVIRONMENT" == "development" ]]; then
            PLATFORM="linux/$(uname -m)"
            if [[ "$PLATFORM" == "linux/arm64" ]]; then
                PLATFORM="linux/arm64"
            else
                PLATFORM="linux/amd64"
            fi
            print_status "Auto-detected platform for development: $PLATFORM"
        else
            # FIXED: Always use multi-platform for production
            MULTI_PLATFORM=true
            print_status "🔧 Auto-enabling Multi-Platform for production (AMD64 + ARM64 compatibility)"
        fi
    fi

    # Setup buildx for multi-platform builds
    if [[ "$MULTI_PLATFORM" == true || "$PLATFORM" != "linux/$(uname -m)" ]]; then
        print_status "Setting up Docker Buildx for cross-platform building..."
        
        # Create/use buildx builder
        if ! docker buildx inspect skillbox-builder >/dev/null 2>&1; then
            print_status "Creating new buildx builder: skillbox-builder"
            docker buildx create --name skillbox-builder --use
        else
            print_status "Using existing buildx builder: skillbox-builder"
            docker buildx use skillbox-builder
        fi
        
        # Bootstrap builder
        docker buildx inspect --bootstrap
        USE_BUILDX=true
    fi
}

setup_platform

# Build command
if [[ "$USE_BUILDX" == true ]]; then
    if [[ "$MULTI_PLATFORM" == true ]]; then
        PLATFORMS="linux/amd64,linux/arm64"
        print_status "Building for multiple platforms: $PLATFORMS"
    else
        PLATFORMS="$PLATFORM"
        print_status "Building for platform: $PLATFORMS"
    fi
    
    # Generate unique tag for production to avoid cache issues
    if [[ "$ENVIRONMENT" == "production" ]]; then
        TIMESTAMP=$(date +%Y%m%d-%H%M%S)
        IMAGE_TAG="$TIMESTAMP"
        print_status "🏷️ Using unique production tag: $IMAGE_TAG (avoids Docker cache issues)"
    else
        IMAGE_TAG="latest-$ENVIRONMENT"
        print_status "🏷️ Using development tag: $IMAGE_TAG"
    fi
    
    # Multi-Platform builds: Use direct docker buildx build commands
    if [[ "$MULTI_PLATFORM" == true ]]; then
        print_status "Building Frontend..."
        BUILD_CMD_FRONTEND="docker buildx build --platform $PLATFORMS -t $REGISTRY/skillbox-frontend:$IMAGE_TAG -f docker/Dockerfile.frontend.smart ."
        if [[ "$NO_CACHE" == true ]]; then
            BUILD_CMD_FRONTEND="$BUILD_CMD_FRONTEND --no-cache"
            print_status "🚫 Building without cache (--no-cache enabled)"
        fi
        if [[ "$PUSH" == true ]]; then
            BUILD_CMD_FRONTEND="$BUILD_CMD_FRONTEND --push"
        fi
        
        print_status "Building Backend..."
        BUILD_CMD_BACKEND="docker buildx build --platform $PLATFORMS -t $REGISTRY/skillbox-backend:$IMAGE_TAG -f docker/Dockerfile.backend.smart ."
        if [[ "$NO_CACHE" == true ]]; then
            BUILD_CMD_BACKEND="$BUILD_CMD_BACKEND --no-cache"
        fi
        if [[ "$PUSH" == true ]]; then
            BUILD_CMD_BACKEND="$BUILD_CMD_BACKEND --push"
        fi
    else
        # Single platform builds with buildx
        BUILD_CMD_FRONTEND="docker buildx build --platform $PLATFORMS -t $REGISTRY/skillbox-frontend:$IMAGE_TAG -f docker/Dockerfile.frontend.smart ."
        BUILD_CMD_BACKEND="docker buildx build --platform $PLATFORMS -t $REGISTRY/skillbox-backend:$IMAGE_TAG -f docker/Dockerfile.backend.smart ."
        if [[ "$NO_CACHE" == true ]]; then
            BUILD_CMD_FRONTEND="$BUILD_CMD_FRONTEND --no-cache"
            BUILD_CMD_BACKEND="$BUILD_CMD_BACKEND --no-cache"
            print_status "🚫 Building without cache (--no-cache enabled)"
        fi
        if [[ "$PUSH" == true ]]; then
            BUILD_CMD_FRONTEND="$BUILD_CMD_FRONTEND --push"
            BUILD_CMD_BACKEND="$BUILD_CMD_BACKEND --push"
        fi
    fi
else
    # Generate unique tag for production to avoid cache issues
    if [[ "$ENVIRONMENT" == "production" ]]; then
        TIMESTAMP=$(date +%Y%m%d-%H%M%S)
        IMAGE_TAG="$TIMESTAMP"
        print_status "🏷️ Using unique production tag: $IMAGE_TAG (avoids Docker cache issues)"
    else
        IMAGE_TAG="latest-$ENVIRONMENT"
        print_status "🏷️ Using development tag: $IMAGE_TAG"
    fi
    
    BUILD_CMD="docker-compose -f $COMPOSE_FILE build"
    if [[ "$NO_CACHE" == true ]]; then
        BUILD_CMD="$BUILD_CMD --no-cache"
        print_status "🚫 Building without cache (--no-cache enabled)"
    fi
    if [[ -n "$PLATFORM" ]]; then
        print_status "Building for platform: $PLATFORM"
        # Note: docker-compose doesn't support --platform directly, 
        # but we can set it via environment
        export DOCKER_DEFAULT_PLATFORM="$PLATFORM"
    fi
    export IMAGE_TAG="$IMAGE_TAG"  # Export for docker-compose
fi

# Execute build
print_status "Starting build process..."
echo ""

if [[ "$USE_BUILDX" == true ]]; then
    # Execute frontend build
    print_status "🚀 Building Frontend..."
    if eval "$BUILD_CMD_FRONTEND"; then
        print_success "✅ Frontend build completed successfully!"
    else
        print_error "❌ Frontend build failed"
        exit 1
    fi
    
    echo ""
    # Execute backend build  
    print_status "🚀 Building Backend..."
    if eval "$BUILD_CMD_BACKEND"; then
        print_success "✅ Backend build completed successfully!"
    else
        print_error "❌ Backend build failed"
        exit 1
    fi
    
    echo ""
    print_success "🎉 All builds completed successfully!"
else
    # Traditional docker-compose build
    if eval "$BUILD_CMD"; then
        echo ""
        print_success "🎉 Build completed successfully!"
    else
        print_error "❌ Build failed"
        exit 1
    fi
fi

# FIXED: Multi-Platform aware push logic
if [[ "$PUSH" == true ]]; then
    if [[ "$MULTI_PLATFORM" == true ]]; then
        # Multi-Platform builds: Images are already pushed during build with --push
        print_success "🚀 Multi-Platform images pushed successfully during build!"
        
        # Show which images were built with dynamic tags
        print_status "📦 Multi-Platform images available:"
        echo "   - $REGISTRY/skillbox-backend:$IMAGE_TAG (AMD64 + ARM64)"
        echo "   - $REGISTRY/skillbox-frontend:$IMAGE_TAG (AMD64 + ARM64)"
        
        # Verify multi-platform manifests with dynamic tags
        print_status "🔍 Verifying Multi-Platform manifests..."
        if docker buildx imagetools inspect "$REGISTRY/skillbox-backend:$IMAGE_TAG" >/dev/null 2>&1; then
            print_success "✅ Backend Multi-Platform manifest verified"
        else
            print_warning "⚠️ Backend manifest verification failed"
        fi
        
        if docker buildx imagetools inspect "$REGISTRY/skillbox-frontend:$IMAGE_TAG" >/dev/null 2>&1; then
            print_success "✅ Frontend Multi-Platform manifest verified"
        else
            print_warning "⚠️ Frontend manifest verification failed"
        fi
        
    else
        # Single-Platform builds: Traditional tag/push approach
        print_status "Preparing to push single-platform images to registry..."
        
        # Get image IDs from docker-compose
        print_status "Getting image information..."
        BACKEND_IMAGE=$(docker-compose -f "$COMPOSE_FILE" images -q skillbox-backend 2>/dev/null || echo "")
        FRONTEND_IMAGE=$(docker-compose -f "$COMPOSE_FILE" images -q skillbox-frontend 2>/dev/null || echo "")
        
        if [[ -z "$BACKEND_IMAGE" || -z "$FRONTEND_IMAGE" ]]; then
            print_warning "Could not get image IDs from compose, trying alternative method..."
            BACKEND_IMAGE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | grep skillbox-backend | head -1 | awk '{print $2}')
            FRONTEND_IMAGE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | grep skillbox-frontend | head -1 | awk '{print $2}')
        fi
        
        if [[ -z "$BACKEND_IMAGE" || -z "$FRONTEND_IMAGE" ]]; then
            print_error "Could not find built images"
            exit 1
        fi
        
        # Tag images with dynamic tags
        print_status "Tagging images..."
        docker tag "$BACKEND_IMAGE" "$REGISTRY/skillbox-backend:$IMAGE_TAG"
        docker tag "$FRONTEND_IMAGE" "$REGISTRY/skillbox-frontend:$IMAGE_TAG"
        
        # For development, also create latest-development tag
        if [[ "$ENVIRONMENT" == "development" ]]; then
            docker tag "$BACKEND_IMAGE" "$REGISTRY/skillbox-backend:latest-development"
            docker tag "$FRONTEND_IMAGE" "$REGISTRY/skillbox-frontend:latest-development"
        fi
        
        # Push images with dynamic tags
        print_status "Pushing images to registry..."
        docker push "$REGISTRY/skillbox-backend:$IMAGE_TAG"
        docker push "$REGISTRY/skillbox-frontend:$IMAGE_TAG"
        
        # Push latest-development tag for development builds
        if [[ "$ENVIRONMENT" == "development" ]]; then
            docker push "$REGISTRY/skillbox-backend:latest-development"
            docker push "$REGISTRY/skillbox-frontend:latest-development"
        fi
        
        print_success "🚀 Single-platform images pushed successfully!"
        echo "📦 Backend:  $REGISTRY/skillbox-backend:$IMAGE_TAG"
        echo "📦 Frontend: $REGISTRY/skillbox-frontend:$IMAGE_TAG"
        if [[ "$ENVIRONMENT" == "development" ]]; then
            echo "🏷️ Latest:   $REGISTRY/skillbox-backend:latest-development"
            echo "🏷️ Latest:   $REGISTRY/skillbox-frontend:latest-development"
        fi
    fi
    
    # Production deployment notes with dynamic tags
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo ""
        print_workflow "🔄 NEXT STEPS FOR PRODUCTION DEPLOYMENT:"
        echo "1. Update docker-compose.prod.yml with image tags:"
        if [[ "$MULTI_PLATFORM" == true ]]; then
            echo "   - skillbox-backend:$IMAGE_TAG (Multi-Platform AMD64+ARM64)"
            echo "   - skillbox-frontend:$IMAGE_TAG (Multi-Platform AMD64+ARM64)"
        else
            echo "   - skillbox-backend:$IMAGE_TAG"
            echo "   - skillbox-frontend:$IMAGE_TAG"
        fi
        echo "2. Commit the updated docker-compose.prod.yml"
        echo "3. Push to GitHub to trigger Elestio deployment"
        echo "4. Test at: https://skillboxdocker2-u31060.vm.elestio.app"
        echo ""
        print_status "🏷️ Production tag used: $IMAGE_TAG (avoids Docker cache issues)"
    fi
fi

# Show image sizes
echo ""
print_status "📊 Current image sizes:"
docker images | grep -E "(skillbox-backend|skillbox-frontend)" | head -10

echo ""
print_success "✅ Smart Docker build completed for environment: $ENVIRONMENT"

# Show next steps
echo ""
print_workflow "🎯 NEXT STEPS:"
if [[ "$ENVIRONMENT" == "development" ]]; then
    echo "1. Test the Docker development environment:"
    echo "   docker-compose -f docker-compose.dev.yml up -d"
    echo "2. Test in browser:"
    echo "   🌐 Frontend: http://localhost:3003"
    echo "   🔧 Backend:  http://localhost:3002"
    echo "3. After successful testing, build production:"
    echo "   ./scripts/build-smart.sh -e production -p"
else
    if [[ "$PUSH" == true ]]; then
        echo "✅ Production images are ready for deployment!"
        echo "📝 Remember to update docker-compose.prod.yml with new tags"
    else
        echo "🚀 Run with -p flag to push to registry:"
        echo "   ./scripts/build-smart.sh -e production -p"
    fi
fi

echo ""
print_status "📖 For complete workflow documentation, see: DEPLOYMENT.md"
echo "" 