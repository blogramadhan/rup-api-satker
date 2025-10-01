# RUP API Satker - Makefile
# Simplified commands for Docker management

.PHONY: help start stop restart logs status build clean setup test health

# Default target
help:
	@echo "RUP API Satker - Docker Management"
	@echo "=================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make start     - Start the application (build + run)"
	@echo "  make stop      - Stop the application"
	@echo "  make restart   - Restart the application"
	@echo "  make logs      - View application logs"
	@echo "  make status    - Check application status"
	@echo "  make build     - Build Docker image"
	@echo "  make clean     - Clean up containers and images"
	@echo "  make setup     - Initial setup (permissions + env)"
	@echo "  make test      - Test application health"
	@echo "  make health    - Quick health check"
	@echo ""
	@echo "Application will run on: http://localhost:8080"

# Setup permissions and environment
setup:
	@echo "Setting up RUP API Satker..."
	@chmod +x *.sh
	@if [ ! -f .env ]; then cp env.example .env; echo "Created .env file from template"; fi
	@mkdir -p logs
	@echo "Setup completed!"

# Start application
start: setup
	@echo "Starting RUP API Satker..."
	@docker-compose up --build -d
	@echo "Application started on http://localhost:8080"
	@echo "Run 'make logs' to view logs or 'make status' to check status"

# Stop application
stop:
	@echo "Stopping RUP API Satker..."
	@docker-compose down --remove-orphans
	@echo "Application stopped"

# Restart application
restart: stop start

# View logs
logs:
	@docker-compose logs -f rup-api

# Check status
status:
	@echo "Container Status:"
	@docker-compose ps
	@echo ""
	@echo "Resource Usage:"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $$(docker-compose ps -q) 2>/dev/null || echo "No running containers"

# Build image
build:
	@echo "Building Docker image..."
	@docker-compose build --no-cache
	@echo "Build completed"

# Clean up
clean:
	@echo "Cleaning up..."
	@docker-compose down --remove-orphans --volumes
	@docker system prune -f
	@echo "Cleanup completed"

# Test application
test: health
	@echo "Running basic API tests..."
	@curl -s http://localhost:8080/api/debug > /dev/null && echo "✅ Debug endpoint: OK" || echo "❌ Debug endpoint: FAILED"
	@curl -s http://localhost:8080/api/config > /dev/null && echo "✅ Config endpoint: OK" || echo "❌ Config endpoint: FAILED"
	@curl -s http://localhost:8080/api/klpd/list > /dev/null && echo "✅ KLPD list endpoint: OK" || echo "❌ KLPD list endpoint: FAILED"

# Quick health check
health:
	@echo "Checking application health..."
	@curl -s -f http://localhost:8080/health > /dev/null && echo "✅ Application is healthy" || echo "❌ Application is not responding"

# Development mode (with logs)
dev: start
	@echo "Starting in development mode with logs..."
	@make logs
