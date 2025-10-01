#!/bin/bash

# Script untuk melihat logs RUP API Satker Docker container
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
echo "         RUP API SATKER - LOGS VIEWER"
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

# Cek apakah container sedang berjalan
if ! docker-compose ps | grep -q "Up"; then
    print_warning "Container tidak sedang berjalan."
    echo ""
    read -p "Apakah Anda ingin melihat logs terakhir? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Menampilkan logs terakhir..."
        docker-compose logs --tail=50 rup-api
    fi
    exit 0
fi

# Parse command line arguments
FOLLOW=false
TAIL_LINES=50

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--tail)
            TAIL_LINES="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -f, --follow     Follow log output (real-time)"
            echo "  -n, --tail NUM   Number of lines to show from the end (default: 50)"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Show last 50 lines"
            echo "  $0 -f                 # Follow logs in real-time"
            echo "  $0 -n 100             # Show last 100 lines"
            echo "  $0 -f -n 20           # Follow logs, starting with last 20 lines"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use -h or --help for usage information."
            exit 1
            ;;
    esac
done

print_info "Status container:"
docker-compose ps

echo ""

if [ "$FOLLOW" = true ]; then
    print_info "Menampilkan logs real-time (Ctrl+C untuk keluar)..."
    print_warning "Tekan Ctrl+C untuk keluar dari mode follow"
    echo ""
    docker-compose logs -f --tail="$TAIL_LINES" rup-api
else
    print_info "Menampilkan $TAIL_LINES baris terakhir dari logs..."
    echo ""
    docker-compose logs --tail="$TAIL_LINES" rup-api
fi
