# 🐳 RUP API Satker - Docker Setup Complete

Konfigurasi Docker untuk RUP API Satker telah berhasil dibuat dengan **port 8080** (menggantikan port 3000).

## 📁 File yang Dibuat

### Docker Configuration
- ✅ `Dockerfile` - Konfigurasi Docker image
- ✅ `docker-compose.yml` - Production setup (port 8080)
- ✅ `docker-compose.dev.yml` - Development setup
- ✅ `.dockerignore` - Optimasi build Docker

### Shell Scripts
- ✅ `start.sh` - Start aplikasi production
- ✅ `stop.sh` - Stop aplikasi
- ✅ `logs.sh` - View logs dengan opsi
- ✅ `status.sh` - Check status lengkap
- ✅ `dev.sh` - Start development mode

### Configuration & Documentation
- ✅ `env.example` - Template environment variables
- ✅ `Makefile` - Simplified commands
- ✅ `README-Docker.md` - Dokumentasi lengkap
- ✅ `DOCKER-SETUP.md` - File ini

## 🚀 Quick Start

### 1. Setup Permissions
```bash
chmod +x *.sh
```

### 2. Start Aplikasi (Production)
```bash
# Menggunakan script
./start.sh

# Atau menggunakan make
make start

# Atau manual
docker-compose up --build -d
```

### 3. Akses Aplikasi
- **URL Utama**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **Debug Info**: http://localhost:8080/api/debug

## 🛠️ Available Commands

### Shell Scripts
```bash
./start.sh          # Start production
./stop.sh           # Stop aplikasi
./logs.sh -f        # Follow logs
./status.sh         # Check status
./dev.sh            # Development mode
```

### Make Commands
```bash
make help           # Show all commands
make start          # Start production
make stop           # Stop aplikasi
make restart        # Restart
make logs           # View logs
make status         # Check status
make health         # Quick health check
make test           # Run API tests
make clean          # Clean up
```

### Docker Compose
```bash
# Production
docker-compose up --build -d
docker-compose down

# Development
docker-compose -f docker-compose.dev.yml up --build -d
docker-compose -f docker-compose.dev.yml down
```

## 🔧 Port Configuration

**Port telah diubah dari 3000 ke 8080:**

- **Container Internal**: 8080
- **Host External**: 8080
- **Access URL**: http://localhost:8080

### Mengubah Port (jika diperlukan)

Edit `docker-compose.yml`:
```yaml
ports:
  - "9080:8080"  # Ganti ke port 9080
```

Kemudian akses di: http://localhost:9080

## 📊 Environment Variables

Copy dan edit file konfigurasi:
```bash
cp env.example .env
nano .env
```

Key configurations:
```bash
PORT=8080
NODE_ENV=production
DEFAULT_KLPD=D197
DEFAULT_TAHUN=2025
```

## 🔍 Monitoring & Debugging

### Health Check
```bash
curl http://localhost:8080/health
```

### View Logs
```bash
# Real-time logs
./logs.sh -f

# Last 100 lines
./logs.sh -n 100
```

### Check Status
```bash
./status.sh
```

### API Testing
```bash
# Quick tests
make test

# Manual tests
curl http://localhost:8080/api/debug
curl http://localhost:8080/api/klpd/list
curl http://localhost:8080/api/rup/123456
```

## 🚧 Development Mode

Untuk development dengan hot reload:

```bash
# Start development mode
./dev.sh

# Atau dengan make
make dev
```

Development features:
- Hot reload (source code mounted)
- Debug mode enabled
- Verbose logging
- Development optimizations

## 🛡️ Security Features

- Non-root user dalam container
- Resource limits (CPU: 1.0, Memory: 512M)
- Health checks otomatis
- CORS configuration
- Secure environment handling

## 📈 Resource Management

### Default Limits
- **CPU**: 1.0 core (production), 2.0 cores (development)
- **Memory**: 512MB (production), 1024MB (development)
- **Restart Policy**: unless-stopped

### Monitoring
- Health check setiap 30 detik
- Resource usage via `./status.sh`
- Automatic container restart on failure

## 🆘 Troubleshooting

### Container tidak start
```bash
./logs.sh                    # Check error logs
./status.sh                  # Check detailed status
./stop.sh && ./start.sh      # Restart
```

### Port sudah digunakan
```bash
# Check what's using port 8080
sudo netstat -tulpn | grep 8080

# Or change port in docker-compose.yml
```

### Memory/Performance issues
```bash
# Check resource usage
./status.sh

# Clean up system
make clean
docker system prune -f
```

### Data loading issues
```bash
# Test connection
curl http://localhost:8080/api/test-connection

# Check configuration
curl http://localhost:8080/api/config

# Manual refresh
curl -X POST http://localhost:8080/api/refresh
```

## 📝 Next Steps

1. **Test aplikasi**: `make test`
2. **Monitor logs**: `./logs.sh -f`
3. **Check health**: `make health`
4. **Customize config**: Edit `.env` file
5. **Scale if needed**: Adjust resource limits

## 🎯 Production Deployment

Untuk production deployment:

1. Set environment variables yang sesuai
2. Configure reverse proxy (nginx/apache)
3. Setup SSL/TLS certificates
4. Configure monitoring dan logging
5. Setup backup dan recovery

## 📞 Support

Jika ada masalah:

1. Check logs: `./logs.sh`
2. Check status: `./status.sh`
3. Test health: `make health`
4. Restart: `make restart`
5. Clean up: `make clean`

---

**✅ Setup Docker selesai! Aplikasi siap dijalankan di port 8080.**

Gunakan `./start.sh` atau `make start` untuk memulai aplikasi.
