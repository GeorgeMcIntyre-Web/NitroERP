#!/bin/bash

# NitroERP Modular Deployment Script
# This script allows selective deployment of NitroERP modules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Function to show usage
show_usage() {
    echo "NitroERP Modular Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS] [MODULES...]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -e, --environment       Environment (dev|staging|prod) [default: dev]"
    echo "  -f, --file              Docker Compose file [default: docker-compose.modular.yml]"
    echo "  -d, --detached          Run in detached mode"
    echo "  --build                 Force rebuild of images"
    echo "  --no-cache              Build without cache"
    echo "  --scale                 Scale services (format: service=replicas)"
    echo ""
    echo "Available Modules:"
    echo "  core                    Core services (auth, users, companies, notifications, audit)"
    echo "  financial               Financial management module"
    echo "  hr                      Human resources module"
    echo "  engineering             Engineering and CAD module"
    echo "  manufacturing           Manufacturing and production module"
    echo "  monitoring              Monitoring and logging (Prometheus, Grafana)"
    echo "  all                     All modules"
    echo ""
    echo "Examples:"
    echo "  $0 core                                    # Deploy core services only"
    echo "  $0 financial hr                           # Deploy financial and HR modules"
    echo "  $0 -e prod all                            # Deploy all modules in production"
    echo "  $0 -d --build financial                   # Deploy financial module in detached mode with rebuild"
    echo "  $0 --scale financial-service=3            # Scale financial service to 3 replicas"
    echo ""
}

# Default values
ENVIRONMENT="dev"
COMPOSE_FILE="docker-compose.modular.yml"
DETACHED=false
BUILD=false
NO_CACHE=false
SCALE_OPTIONS=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -d|--detached)
            DETACHED=true
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --scale)
            SCALE_OPTIONS="$2"
            shift 2
            ;;
        -*)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            MODULES+=("$1")
            shift
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
    exit 1
fi

# Check if Docker Compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    print_error "Docker Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Set environment variables
export NODE_ENV="$ENVIRONMENT"

# Function to deploy core services
deploy_core() {
    print_status "Deploying core services..."
    
    local compose_cmd="docker-compose -f $COMPOSE_FILE up"
    
    if [[ "$DETACHED" == true ]]; then
        compose_cmd="$compose_cmd -d"
    fi
    
    if [[ "$BUILD" == true ]]; then
        compose_cmd="$compose_cmd --build"
    fi
    
    if [[ "$NO_CACHE" == true ]]; then
        compose_cmd="$compose_cmd --no-cache"
    fi
    
    # Core services (no profiles needed)
    compose_cmd="$compose_cmd postgres redis rabbitmq minio api-gateway auth-service user-service company-service notification-service audit-service"
    
    print_status "Running: $compose_cmd"
    eval $compose_cmd
    
    print_success "Core services deployed successfully"
}

# Function to deploy a specific module
deploy_module() {
    local module="$1"
    print_status "Deploying $module module..."
    
    local compose_cmd="docker-compose -f $COMPOSE_FILE --profile $module up"
    
    if [[ "$DETACHED" == true ]]; then
        compose_cmd="$compose_cmd -d"
    fi
    
    if [[ "$BUILD" == true ]]; then
        compose_cmd="$compose_cmd --build"
    fi
    
    if [[ "$NO_CACHE" == true ]]; then
        compose_cmd="$compose_cmd --no-cache"
    fi
    
    print_status "Running: $compose_cmd"
    eval $compose_cmd
    
    print_success "$module module deployed successfully"
}

# Function to scale services
scale_services() {
    if [[ -n "$SCALE_OPTIONS" ]]; then
        print_status "Scaling services: $SCALE_OPTIONS"
        docker-compose -f $COMPOSE_FILE up -d --scale $SCALE_OPTIONS
        print_success "Services scaled successfully"
    fi
}

# Main deployment logic
main() {
    print_status "Starting NitroERP deployment..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Compose file: $COMPOSE_FILE"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    
    # If no modules specified, deploy core only
    if [[ ${#MODULES[@]} -eq 0 ]]; then
        print_warning "No modules specified. Deploying core services only."
        deploy_core
        exit 0
    fi
    
    # Deploy core services first (required for all modules)
    deploy_core
    
    # Wait for core services to be healthy
    print_status "Waiting for core services to be healthy..."
    sleep 30
    
    # Deploy specified modules
    for module in "${MODULES[@]}"; do
        case $module in
            core)
                print_status "Core services already deployed"
                ;;
            financial|hr|engineering|manufacturing|monitoring)
                deploy_module $module
                ;;
            all)
                print_status "Deploying all modules..."
                deploy_module "financial"
                deploy_module "hr"
                deploy_module "engineering"
                deploy_module "manufacturing"
                deploy_module "monitoring"
                ;;
            *)
                print_warning "Unknown module: $module. Skipping..."
                ;;
        esac
    done
    
    # Scale services if specified
    scale_services
    
    print_success "Deployment completed successfully!"
    
    # Show service status
    print_status "Service status:"
    docker-compose -f $COMPOSE_FILE ps
    
    # Show service URLs
    print_status "Service URLs:"
    echo "  API Gateway: http://localhost"
    echo "  Auth Service: http://localhost:3001"
    echo "  User Service: http://localhost:3002"
    echo "  Company Service: http://localhost:3003"
    echo "  Notification Service: http://localhost:3004"
    echo "  Audit Service: http://localhost:3005"
    echo "  Financial Service: http://localhost:3010"
    echo "  HR Service: http://localhost:3020"
    echo "  Engineering Service: http://localhost:3030"
    echo "  Manufacturing Service: http://localhost:3040"
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis: localhost:6379"
    echo "  RabbitMQ: http://localhost:15672"
    echo "  MinIO: http://localhost:9000"
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana: http://localhost:3000"
}

# Run main function
main "$@" 