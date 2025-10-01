#!/bin/bash

# Script untuk menghentikan RUP API Satker Docker container
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
echo "         RUP API SATKER - DOCKER STOPPER"
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

print_info "Menghentikan RUP API Satker container..."

# Stop dan remove container
if docker-compose down --remove-orphans; then
    print_success "Container berhasil dihentikan dan dihapus!"
else
    print_error "Gagal menghentikan container."
    exit 1
fi

# Opsi untuk membersihkan image (opsional)
echo ""
read -p "Apakah Anda ingin menghapus Docker image juga? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Menghapus Docker image..."
    
    # Hapus image yang terkait dengan project ini
    IMAGE_NAME=$(docker-compose config --services | head -n1)
    PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
    
    # Coba hapus image dengan berbagai kemungkinan nama
    docker rmi "${PROJECT_NAME}_${IMAGE_NAME}" 2>/dev/null || \
    docker rmi "${PROJECT_NAME}-${IMAGE_NAME}" 2>/dev/null || \
    docker rmi "rup-api-satker_rup-api" 2>/dev/null || \
    docker rmi "rup-api-satker-rup-api" 2>/dev/null || \
    print_warning "Image tidak ditemukan atau sudah dihapus."
    
    print_success "Pembersihan selesai!"
else
    print_info "Image Docker tidak dihapus."
fi

echo ""
print_success "Proses penghentian selesai!"
