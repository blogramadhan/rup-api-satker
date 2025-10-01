#!/bin/bash

# Script untuk menjalankan RUP API Satker dalam mode development
# Author: Rizko
# Version: 1.0

set -e

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_dev() {
    echo -e "${PURPLE}[DEV]${NC} $1"
}

# Banner
echo -e "${PURPLE}"
echo "=================================================="
echo "      RUP API SATKER - DEVELOPMENT MODE"
echo "=================================================="
echo -e "${NC}"

# Cek apakah Docker tersedia
if ! command -v docker &> /dev/null; then
    print_error "Docker tidak ditemukan. Silakan install Docker terlebih dahulu."
    exit 1
fi

# Cek apakah Docker Compose tersedia
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose tidak ditemukan. Silakan install Docker Compose terlebih dahulu."
    exit 1
fi

# Cek apakah file docker-compose.dev.yml ada
if [ ! -f "docker-compose.dev.yml" ]; then
    print_error "File docker-compose.dev.yml tidak ditemukan di direktori ini."
    exit 1
fi

print_dev "Memulai RUP API Satker dalam mode development..."

# Buat direktori logs jika belum ada
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_info "Direktori logs dibuat."
fi

# Setup environment untuk development
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        print_info "File .env dibuat dari template."
    else
        print_warning "File env.example tidak ditemukan. Menggunakan konfigurasi default."
    fi
fi

# Stop container production jika berjalan
print_info "Menghentikan container production (jika ada)..."
docker-compose down --remove-orphans 2>/dev/null || true

# Stop container development yang sedang berjalan (jika ada)
print_info "Menghentikan container development yang sedang berjalan..."
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Build dan start container development
print_dev "Building dan starting development container..."
if docker-compose -f docker-compose.dev.yml up --build -d; then
    print_success "Development container berhasil dijalankan!"
    
    # Tunggu beberapa detik untuk container siap
    print_info "Menunggu container siap..."
    sleep 5
    
    # Cek status container
    if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        print_success "Development container berjalan dengan baik!"
        
        # Tampilkan informasi development
        echo ""
        print_dev "=== DEVELOPMENT ENVIRONMENT ==="
        echo "  🌐 URL: http://localhost:8080"
        echo "  🏥 Health Check: http://localhost:8080/health"
        echo "  🔧 Debug Info: http://localhost:8080/api/debug"
        echo "  📊 API Config: http://localhost:8080/api/config"
        echo "  📋 KLPD List: http://localhost:8080/api/klpd/list"
        echo ""
        print_dev "=== DEVELOPMENT FEATURES ==="
        echo "  🔄 Hot Reload: Enabled (source code mounted)"
        echo "  🐛 Debug Mode: Enabled"
        echo "  📝 Verbose Logging: Enabled"
        echo "  🚀 Development Optimizations: Active"
        echo ""
        
        # Test quick health check
        print_info "Testing development environment..."
        sleep 2
        if curl -s -f http://localhost:8080/health > /dev/null; then
            print_success "✅ Development environment is ready!"
        else
            print_warning "⚠️ Environment starting up, may need a few more seconds..."
        fi
        
        echo ""
        print_dev "=== DEVELOPMENT COMMANDS ==="
        echo "  ./logs.sh -f           # Follow logs real-time"
        echo "  ./status.sh            # Check status"
        echo "  docker-compose -f docker-compose.dev.yml down  # Stop dev container"
        echo "  make dev               # Alternative start command"
        echo ""
        
        # Tampilkan logs real-time
        print_dev "Menampilkan development logs (Ctrl+C untuk keluar dari logs):"
        echo ""
        docker-compose -f docker-compose.dev.yml logs -f rup-api-dev
    else
        print_error "Development container gagal berjalan. Cek logs untuk detail error."
        docker-compose -f docker-compose.dev.yml logs rup-api-dev
        exit 1
    fi
else
    print_error "Gagal menjalankan development container."
    exit 1
fi
