#!/bin/bash

# Script untuk melihat status RUP API Satker Docker container
# Author: Rizko
# Version: 1.0

set -e

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fungsi untuk print dengan warna
print_info() {
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

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

print_data() {
    echo -e "${CYAN}$1${NC}"
}

# Banner
echo -e "${BLUE}"
echo "=================================================="
echo "         RUP API SATKER - STATUS CHECKER"
echo "=================================================="
echo -e "${NC}"

# Cek apakah Docker tersedia
if ! command -v docker &> /dev/null; then
    print_error "Docker tidak ditemukan."
    exit 1
fi

# Cek apakah Docker Compose tersedia
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose tidak ditemukan."
    exit 1
fi

# Cek apakah file docker-compose.yml ada
if [ ! -f "docker-compose.yml" ]; then
    print_error "File docker-compose.yml tidak ditemukan di direktori ini."
    exit 1
fi

echo ""
print_header "=== STATUS CONTAINER ==="
docker-compose ps

echo ""
print_header "=== RESOURCE USAGE ==="
# Cek apakah container berjalan
CONTAINER_ID=$(docker-compose ps -q rup-api 2>/dev/null || echo "")

if [ -n "$CONTAINER_ID" ] && [ "$CONTAINER_ID" != "" ]; then
    # Tampilkan stats container
    print_info "Resource usage untuk container rup-api-satker:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" "$CONTAINER_ID"
    
    echo ""
    print_header "=== NETWORK INFO ==="
    print_data "Port mapping:"
    docker port "$CONTAINER_ID" 2>/dev/null || print_warning "Tidak ada port mapping ditemukan"
    
    echo ""
    print_header "=== HEALTH CHECK ==="
    # Test koneksi ke health endpoint
    if command -v curl &> /dev/null; then
        print_info "Testing health endpoint..."
        if curl -s -f http://localhost:8080/health > /dev/null; then
            print_success "✅ Health check: PASSED"
            
            # Ambil informasi dari health endpoint
            HEALTH_INFO=$(curl -s http://localhost:8080/health 2>/dev/null || echo "{}")
            if command -v jq &> /dev/null; then
                echo ""
                print_data "Health details:"
                echo "$HEALTH_INFO" | jq '.' 2>/dev/null || echo "$HEALTH_INFO"
            else
                echo ""
                print_data "Health response: $HEALTH_INFO"
            fi
        else
            print_error "❌ Health check: FAILED"
            print_warning "API tidak merespons pada http://localhost:8080/health"
        fi
    else
        print_warning "curl tidak tersedia, skip health check"
    fi
    
    echo ""
    print_header "=== QUICK ACCESS ==="
    print_data "🌐 Main URL: http://localhost:8080"
    print_data "🏥 Health: http://localhost:8080/health"
    print_data "🔧 Debug: http://localhost:8080/api/debug"
    print_data "📊 Config: http://localhost:8080/api/config"
    print_data "📋 KLPD List: http://localhost:8080/api/klpd/list"
    
else
    print_warning "Container tidak sedang berjalan."
    echo ""
    print_info "Untuk menjalankan container, gunakan:"
    print_data "  ./start.sh"
fi

echo ""
print_header "=== DOCKER IMAGES ==="
print_info "Images yang terkait dengan project ini:"
docker images | grep -E "(rup-api|rup_api)" || print_warning "Tidak ada image ditemukan"

echo ""
print_header "=== LOGS TERAKHIR ==="
print_info "5 baris terakhir dari logs:"
docker-compose logs --tail=5 rup-api 2>/dev/null || print_warning "Tidak ada logs tersedia"

echo ""
print_success "Status check selesai!"
echo ""
print_info "Perintah berguna:"
echo "  ./logs.sh -f    # Follow logs real-time"
echo "  ./stop.sh       # Stop container"
echo "  ./start.sh      # Start container"
