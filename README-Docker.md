# RUP API Satker - Docker Setup

Panduan lengkap untuk menjalankan RUP API Satker menggunakan Docker dengan port 8080 (bukan 3000).

## 📋 Prasyarat

- Docker (versi 20.10 atau lebih baru)
- Docker Compose (versi 2.0 atau lebih baru)
- Linux/macOS/Windows dengan WSL2

## 🚀 Quick Start

### 1. Persiapan

```bash
# Clone atau pastikan Anda berada di direktori project
cd /path/to/rup-api-satker

# Berikan permission execute pada script
chmod +x *.sh
```

### 2. Konfigurasi Environment (Opsional)

```bash
# Copy file konfigurasi contoh
cp env.example .env

# Edit konfigurasi sesuai kebutuhan
nano .env
```

### 3. Jalankan Aplikasi

```bash
# Cara termudah - gunakan script
./start.sh

# Atau manual dengan docker-compose
docker-compose up --build -d
```

### 4. Verifikasi

Aplikasi akan berjalan di **port 8080** (bukan 3000):

- **Main URL**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **Debug Info**: http://localhost:8080/api/debug
- **API Config**: http://localhost:8080/api/config

## 🛠️ Script Management

### Start Application
```bash
./start.sh
```
- Build dan start container
- Menampilkan logs real-time
- Auto health check

### Stop Application
```bash
./stop.sh
```
- Stop dan remove container
- Opsi untuk menghapus image

### View Logs
```bash
# Logs real-time
./logs.sh -f

# Last 100 lines
./logs.sh -n 100

# Help
./logs.sh -h
```

### Check Status
```bash
./status.sh
```
- Status container
- Resource usage
- Health check
- Quick access URLs

## 🔧 Konfigurasi

### Port Configuration

Aplikasi dikonfigurasi untuk menggunakan **port 8080** sebagai pengganti port 3000:

- **Container Internal**: 8080
- **Host External**: 8080
- **URL Access**: http://localhost:8080

### Environment Variables

File `env.example` berisi semua konfigurasi yang tersedia:

```bash
# Server
PORT=8080
NODE_ENV=production

# RUP Data
DEFAULT_KLPD=D197
DEFAULT_TAHUN=2025

# Custom data URL (opsional)
# JSON_DATA_URL=https://custom-url.com/data.json
```

### Docker Compose Configuration

File `docker-compose.yml` sudah dikonfigurasi dengan:

- **Port mapping**: 8080:8080
- **Resource limits**: CPU 1.0, Memory 512M
- **Health check**: Otomatis setiap 30 detik
- **Restart policy**: unless-stopped
- **Logging**: Tersedia melalui Docker logs

## 📊 API Endpoints

Dengan port 8080, semua endpoint dapat diakses di:

```
http://localhost:8080/endpoint
```

### Main Endpoints:
- `GET /health` - Health check
- `GET /api/debug` - Debug information
- `GET /api/config` - Current configuration
- `GET /api/klpd/list` - Available KLPD list
- `GET /api/rup/:kd_satker` - Get data by satker code
- `GET /api/rup` - Get all data with filters

### Examples:
```bash
# Health check
curl http://localhost:8080/health

# Get KLPD list
curl http://localhost:8080/api/klpd/list

# Get data for specific satker
curl http://localhost:8080/api/rup/123456

# Get all data with search
curl "http://localhost:8080/api/rup?search=pontianak"
```

## 🐛 Troubleshooting

### Container tidak bisa start

```bash
# Cek logs error
./logs.sh

# Cek status detail
./status.sh

# Restart container
./stop.sh && ./start.sh
```

### Port 8080 sudah digunakan

Edit file `docker-compose.yml`:

```yaml
ports:
  - "9080:8080"  # Ganti port eksternal ke 9080
```

Kemudian akses di: http://localhost:9080

### Memory/CPU issues

Edit resource limits di `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Increase CPU
      memory: 1024M    # Increase memory
```

### Data tidak ter-load

```bash
# Cek koneksi ke data source
curl http://localhost:8080/api/test-connection

# Cek konfigurasi
curl http://localhost:8080/api/config

# Manual refresh data
curl -X POST http://localhost:8080/api/refresh
```

## 📁 File Structure

```
rup-api-satker/
├── Dockerfile              # Docker image configuration
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore           # Files to ignore in Docker build
├── env.example             # Environment variables template
├── start.sh               # Start application script
├── stop.sh                # Stop application script
├── logs.sh                # View logs script
├── status.sh              # Check status script
├── src/
│   └── index.js           # Main application file
├── package.json           # Node.js dependencies
└── logs/                  # Log files (created automatically)
```

## 🔒 Security Notes

- Container berjalan dengan non-root user (nodejs:1001)
- Resource limits diterapkan untuk mencegah overconsumption
- Health check otomatis untuk monitoring
- CORS dikonfigurasi untuk keamanan

## 📈 Monitoring

### Health Check
- Otomatis setiap 30 detik
- Endpoint: `/health`
- Timeout: 3 detik
- Retries: 3 kali

### Logs
- Tersedia melalui Docker logs
- Real-time monitoring dengan `./logs.sh -f`
- Log rotation otomatis oleh Docker

### Resource Monitoring
- CPU dan Memory usage via `./status.sh`
- Network I/O monitoring
- Container stats real-time

## 🆘 Support

Jika mengalami masalah:

1. Cek logs: `./logs.sh`
2. Cek status: `./status.sh`
3. Test health: `curl http://localhost:8080/health`
4. Restart: `./stop.sh && ./start.sh`

Untuk debug lebih lanjut:
```bash
# Masuk ke container
docker-compose exec rup-api sh

# Cek environment variables
docker-compose exec rup-api env

# Manual test
docker-compose exec rup-api curl localhost:8080/health
```
