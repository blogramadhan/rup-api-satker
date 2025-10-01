#!/bin/bash

# Script untuk menjalankan RUP API Satker dengan Docker
# Author: Rizko
# Version: 1.0

set -e

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Banner
echo -e "${BLUE}"
echo "=================================================="
echo "         RUP API SATKER - DOCKER STARTER"
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

# Cek apakah file docker-compose.yml ada
if [ ! -f "docker-compose.yml" ]; then
    print_error "File docker-compose.yml tidak ditemukan di direktori ini."
    exit 1
fi

print_info "Memulai RUP API Satker..."

# Buat direktori logs jika belum ada
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_info "Direktori logs dibuat."
fi

# Stop container yang sedang berjalan (jika ada)
print_info "Menghentikan container yang sedang berjalan..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build dan start container
print_info "Building dan starting container..."
if docker-compose up --build -d; then
    print_success "Container berhasil dijalankan!"
    
    # Tunggu beberapa detik untuk container siap
    print_info "Menunggu container siap..."
    sleep 5
    
    # Cek status container
    if docker-compose ps | grep -q "Up"; then
        print_success "Container berjalan dengan baik!"
        
        # Tampilkan informasi
        echo ""
        print_info "Informasi Aplikasi:"
        echo "  🌐 URL: http://localhost:8080"
        echo "  🏥 Health Check: http://localhost:8080/health"
        echo "  🔧 Debug Info: http://localhost:8080/api/debug"
        echo "  📊 API Docs: Lihat endpoints di console container"
        echo ""
        
        # Tampilkan logs real-time
        print_info "Menampilkan logs aplikasi (Ctrl+C untuk keluar dari logs):"
        echo ""
        docker-compose logs -f rup-api
    else
        print_error "Container gagal berjalan. Cek logs untuk detail error."
        docker-compose logs rup-api
        exit 1
    fi
else
    print_error "Gagal menjalankan container."
    exit 1
fi
