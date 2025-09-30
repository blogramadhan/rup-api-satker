# RUP API Satker

Backend API untuk mengakses data RUP (Rencana Umum Pengadaan) berdasarkan kode satuan kerja (`kd_satker`) menggunakan Node.js, Express.js, dan JSON API dengan sistem caching yang canggih.

## 🚀 Fitur Utama

- ✅ **Multi-KLPD & Multi-Tahun**: Dukungan untuk berbagai KLPD dan tahun data
- ✅ **Query Berdasarkan Satker**: Pencarian data RUP berdasarkan `kd_satker`
- ✅ **Pencarian & Filtering**: Pencarian teks dan filtering data yang fleksibel
- ✅ **Statistik Lengkap**: Analisis data RUP dengan berbagai metrik
- ✅ **Caching Pintar**: NodeCache dengan TTL 1 jam untuk performa optimal
- ✅ **Error Handling**: Error handling komprehensif dengan logging detail
- ✅ **Retry Mechanism**: Sistem retry otomatis untuk inisialisasi data
- ✅ **Debugging Tools**: Endpoint khusus untuk testing dan debugging
- ✅ **CORS Support**: Siap untuk integrasi frontend
- ✅ **Hot Configuration**: Ganti KLPD/tahun tanpa restart server

## 🛠️ Teknologi

- **Node.js** v18+ - Runtime JavaScript
- **Express.js** - Web framework
- **Axios** - HTTP client untuk fetch data
- **NodeCache** - In-memory caching
- **CORS** - Cross-origin resource sharing

## 📋 Prasyarat

- Node.js v18+ 
- npm atau yarn

## 🛠️ Instalasi

1. Clone atau download project ini
2. Install dependencies:
   ```bash
   npm install
   ```

3. Jalankan dalam mode development:
   ```bash
   npm run dev
   ```

4. Atau jalankan dalam mode production:
   ```bash
   npm start
   ```

Server akan berjalan di `http://localhost:3000`

## 📡 API Endpoints

### 🔍 Monitoring & Debugging

#### Health Check
```
GET /health
```
Mengecek status kesehatan API dan informasi sistem.

**Response:**
```json
{
  "success": true,
  "message": "API RUP Satker berjalan dengan baik",
  "timestamp": "2025-09-30T10:30:00.000Z",
  "data_loaded": true,
  "data_loading": false,
  "total_records": 12345,
  "current_url": "https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json",
  "current_klpd": "D197",
  "current_tahun": "2025",
  "cache_stats": {
    "keys": 1,
    "hits": 15,
    "misses": 2
  }
}
```

#### Test Koneksi
```
GET /api/test-connection?klpd=D197&tahun=2025
```
Test koneksi ke data source untuk debugging.

**Parameters:**
- `klpd` (optional): Kode KLPD untuk ditest
- `tahun` (optional): Tahun data untuk ditest

**Response Sukses:**
```json
{
  "success": true,
  "message": "Koneksi berhasil",
  "url": "https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json",
  "status": 200,
  "headers": {
    "content-type": "application/json",
    "content-length": "1234567"
  },
  "response_time_ms": 150,
  "timestamp": "2025-09-30T10:30:00.000Z"
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "Koneksi gagal",
  "url": "https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json",
  "error": "getaddrinfo ENOTFOUND s3-sip.pbj.my.id",
  "error_code": "ENOTFOUND",
  "timestamp": "2025-09-30T10:30:00.000Z"
}
```

#### Debug Info
```
GET /api/debug?limit=5
```
Menampilkan informasi debug dan sample data.

**Parameters:**
- `limit` (optional): Jumlah sample data (default: 5)

**Response:**
```json
{
  "success": true,
  "message": "Debug info",
  "debug": {
    "isDataLoaded": true,
    "isLoading": false,
    "totalRecords": 12345,
    "dataUrl": "https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json",
    "sampleData": [...],
    "dataKeys": ["kd_satker", "nama_satker", "nama_paket", ...],
    "firstRecord": {...},
    "cacheStats": {...}
  }
}
```

### 📊 Data RUP

#### Data RUP Berdasarkan Satker
```
GET /api/rup/:kd_satker?klpd=D197&tahun=2025
```
Mengambil data RUP untuk satker tertentu.

**Parameters:**
- `kd_satker` (required): Kode satuan kerja
- `klpd` (optional): Kode KLPD (default: D197)
- `tahun` (optional): Tahun data (default: 2025)

**Contoh:**
```bash
curl "http://localhost:3000/api/rup/123456?klpd=D197&tahun=2025"
```

**Response:**
```json
[
  {
    "kd_satker": 123456,
    "nama_satker": "Dinas Pendidikan Kab. Kubu Raya",
    "kd_klpd": "D197",
    "nama_klpd": "Provinsi Kalimantan Barat",
    "nama_paket": "Pengadaan Alat Tulis Kantor",
    "pagu": 1000000000,
    "jenis_pengadaan": "Barang",
    "metode_pengadaan": "Tender Terbuka"
  }
]
```

#### Data RUP dengan KLPD/Tahun Spesifik
```
GET /api/:klpd/:tahun/rup/:kd_satker
```
Mengambil data RUP untuk satker dengan KLPD dan tahun spesifik.

**Parameters:**
- `klpd` (required): Kode KLPD
- `tahun` (required): Tahun data
- `kd_satker` (required): Kode satuan kerja

**Contoh:**
```bash
curl "http://localhost:3000/api/D197/2025/rup/123456"
```

#### Semua Data RUP dengan Filter
```
GET /api/rup?klpd=D197&tahun=2025&search=pendidikan
```
Mengambil semua data RUP dengan filtering.

**Parameters:**
- `klpd` (optional): Kode KLPD (default: D197)
- `tahun` (optional): Tahun data (default: 2025)
- `search` (optional): Pencarian berdasarkan berbagai field

**Contoh:**
```bash
curl "http://localhost:3000/api/rup?search=pendidikan&klpd=D197&tahun=2025"
```

#### Semua Data dengan KLPD/Tahun Spesifik
```
GET /api/:klpd/:tahun/rup?search=pendidikan
```
Mengambil semua data RUP untuk KLPD dan tahun tertentu.

**Parameters:**
- `klpd` (required): Kode KLPD
- `tahun` (required): Tahun data
- `search` (optional): Term pencarian

**Contoh:**
```bash
curl "http://localhost:3000/api/D197/2025/rup?search=pendidikan"
```

### 📋 Daftar & Pencarian

#### Daftar Satker
```
GET /api/satker/list
```
Mendapatkan daftar semua satker yang tersedia dalam data saat ini.

**Response:**
```json
[
  {
    "kd_satker": 123456,
    "nama_satker": "Dinas Pendidikan Kab. Kubu Raya",
    "nama_klpd": "Provinsi Kalimantan Barat",
    "kd_klpd": "D197"
  },
  {
    "kd_satker": 123457,
    "nama_satker": "Dinas Kesehatan Kab. Kubu Raya",
    "nama_klpd": "Provinsi Kalimantan Barat",
    "kd_klpd": "D197"
  }
]
```

#### Pencarian Satker
```
GET /api/search-satker/:partial?limit=10
```
Mencari satker berdasarkan sebagian kode satker.

**Parameters:**
- `partial` (required): Sebagian kode satker
- `limit` (optional): Maksimal hasil (default: 10)

**Contoh:**
```bash
curl "http://localhost:3000/api/search-satker/1234?limit=5"
```

**Response:**
```json
[
  {
    "kd_satker": 123456,
    "nama_satker": "Dinas Pendidikan Kab. Kubu Raya",
    "nama_klpd": "Provinsi Kalimantan Barat",
    "count": 15
  }
]
```

#### Daftar KLPD
```
GET /api/klpd/list
```
Mendapatkan daftar semua KLPD yang didukung.

**Response:**
```json
[
  {
    "kd_klpd": "D001",
    "nama_klpd": "Provinsi Nanggroe Aceh Darussalam"
  },
  {
    "kd_klpd": "D197",
    "nama_klpd": "Provinsi Kalimantan Barat"
  }
]
```

### 📈 Statistik & Informasi

#### Statistik Data
```
GET /api/stats
```
Mendapatkan statistik komprehensif data RUP saat ini.

**Response:**
```json
{
  "total_records": 12345,
  "total_satker": 456,
  "total_provinsi": 34,
  "total_pagu": 1500000000000,
  "breakdown_jenis": {
    "Barang": 5000,
    "Jasa Konsultansi": 3000,
    "Pekerjaan Konstruksi": 2000,
    "Jasa Lainnya": 2345
  },
  "breakdown_metode": {
    "Tender Terbuka": 4500,
    "Tender Terbatas": 2800,
    "Penunjukan Langsung": 1200,
    "Pengadaan Langsung": 3500,
    "Tender Cepat": 845
  }
}
```

#### Informasi Kolom
```
GET /api/columns
```
Mendapatkan informasi tentang kolom yang tersedia dalam data.

**Response:**
```json
[
  {
    "column_name": "kd_satker",
    "column_type": "number"
  },
  {
    "column_name": "nama_satker",
    "column_type": "string"
  },
  {
    "column_name": "pagu",
    "column_type": "number"
  }
]
```

### ⚙️ Konfigurasi

#### Lihat Konfigurasi Saat Ini
```
GET /api/config
```
Menampilkan konfigurasi KLPD dan tahun yang sedang aktif.

**Response:**
```json
{
  "success": true,
  "message": "Konfigurasi saat ini",
  "klpd": "D197",
  "tahun": "2025",
  "url": "https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json",
  "data_loaded": true,
  "total_records": 12345
}
```

#### Ganti Konfigurasi
```
POST /api/config
Content-Type: application/json

{
  "klpd": "D032",
  "tahun": "2024"
}
```
Mengganti KLPD dan/atau tahun data aktif tanpa restart server.

**Response:**
```json
{
  "success": true,
  "message": "Konfigurasi berhasil diubah ke KLPD: D032, Tahun: 2024",
  "klpd": "D032",
  "tahun": "2024",
  "total_records": 8765,
  "timestamp": "2025-09-30T10:30:00.000Z"
}
```

#### Refresh Data
```
POST /api/refresh
```
Memuat ulang data dari source secara manual.

**Response:**
```json
{
  "success": true,
  "message": "Data berhasil di-refresh",
  "total_records": 12345,
  "timestamp": "2025-09-30T10:30:00.000Z"
}
```

## 🔧 Konfigurasi Environment

### Environment Variables

Buat file `.env` berdasarkan `env.example`:

```bash
cp env.example .env
```

Variabel yang tersedia:
- `PORT`: Port server (default: 3000)
- `DEFAULT_KLPD`: KLPD default saat startup (default: D197)
- `DEFAULT_TAHUN`: Tahun default saat startup (default: 2025)
- `JSON_DATA_URL`: Override URL custom (optional)

### Contoh File .env
```bash
# Port untuk menjalankan server
PORT=3000

# Konfigurasi Data RUP Default
DEFAULT_KLPD=D197
DEFAULT_TAHUN=2025

# Override URL jika ingin menggunakan URL custom
# JSON_DATA_URL=https://custom-url.com/data.json
```

## 🏗️ Struktur Project

```
rup-api-satker/
├── src/
│   └── index.js          # Main application file
├── package.json          # Dependencies dan scripts
├── env.example          # Template environment variables
├── .env                 # Environment variables (buat sendiri)
└── README.md            # Dokumentasi ini
```

## 🧪 Testing & Debugging

### Quick Start Testing

1. **Health check:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Test koneksi ke data source:**
   ```bash
   curl http://localhost:3000/api/test-connection
   ```

3. **Lihat debug info:**
   ```bash
   curl http://localhost:3000/api/debug
   ```

4. **Data berdasarkan satker:**
   ```bash
   curl "http://localhost:3000/api/rup/123456"
   ```

5. **Pencarian data:**
   ```bash
   curl "http://localhost:3000/api/rup?search=pendidikan"
   ```

6. **Ganti konfigurasi:**
   ```bash
   curl -X POST http://localhost:3000/api/config \
     -H "Content-Type: application/json" \
     -d '{"klpd":"D032","tahun":"2024"}'
   ```

### Menggunakan JavaScript/Fetch

```javascript
// Cek status API
const healthCheck = async () => {
  const response = await fetch('http://localhost:3000/health');
  const data = await response.json();
  console.log('API Status:', data);
};

// Ambil data berdasarkan satker
const getSatkerData = async (kdSatker) => {
  const response = await fetch(`http://localhost:3000/api/rup/${kdSatker}`);
  const data = await response.json();
  console.log('Data Satker:', data);
};

// Pencarian data
const searchData = async (searchTerm) => {
  const response = await fetch(`http://localhost:3000/api/rup?search=${encodeURIComponent(searchTerm)}`);
  const data = await response.json();
  console.log('Search Results:', data);
};

// Ganti konfigurasi
const changeConfig = async (klpd, tahun) => {
  const response = await fetch('http://localhost:3000/api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ klpd, tahun })
  });
  const data = await response.json();
  console.log('Config Changed:', data);
};

// Test koneksi
const testConnection = async (klpd, tahun) => {
  const params = new URLSearchParams({ klpd, tahun });
  const response = await fetch(`http://localhost:3000/api/test-connection?${params}`);
  const data = await response.json();
  console.log('Connection Test:', data);
};
```

## 🚨 Troubleshooting

### Masalah Umum dan Solusi

#### 1. Server Tidak Bisa Start
```bash
# Cek apakah port sudah digunakan
lsof -i :3000

# Atau ganti port di .env
echo "PORT=3001" >> .env
```

#### 2. Data Tidak Bisa Dimuat
```bash
# Test koneksi ke data source
curl http://localhost:3000/api/test-connection

# Cek log aplikasi untuk detail error
npm start
```

#### 3. Error "ENOTFOUND" atau "ECONNREFUSED"
- **ENOTFOUND**: Masalah DNS/koneksi internet
- **ECONNREFUSED**: Server tujuan tidak tersedia
- **ETIMEDOUT**: Timeout, server lambat merespons

**Solusi:**
```bash
# Cek koneksi internet
ping google.com

# Test koneksi ke server data
curl -I https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json

# Gunakan URL custom jika perlu
echo "JSON_DATA_URL=https://your-custom-url.com/data.json" >> .env
```

#### 4. Data Kosong atau Error Parsing
```bash
# Cek struktur data yang diterima
curl http://localhost:3000/api/debug

# Refresh data manual
curl -X POST http://localhost:3000/api/refresh
```

#### 5. Cache Issues
```bash
# Restart server untuk clear cache
npm start

# Atau refresh data manual
curl -X POST http://localhost:3000/api/refresh
```

### Monitoring & Logging

Aplikasi menyediakan logging detail untuk debugging:

```bash
# Jalankan dengan logging detail
NODE_ENV=development npm start
```

**Log yang ditampilkan:**
- 🔄 URL yang diakses
- ⏳ Waktu request
- ⚡ Response time
- 📊 Statistik data
- ❌ Error detail dengan stack trace
- ✅ Cache hits/misses

### Performance Tips

1. **Cache Optimization:**
   - Data di-cache selama 1 jam
   - Gunakan endpoint yang sama untuk memanfaatkan cache
   - Monitor cache stats via `/health`

2. **Network Optimization:**
   - Gunakan parameter filter untuk mengurangi data transfer
   - Test koneksi sebelum request besar

3. **Error Recovery:**
   - Sistem retry otomatis 3x saat startup
   - Fallback ke cache lama jika fetch gagal
   - Manual refresh tersedia via `/api/refresh`

## 📊 Format Response

Semua endpoint menggunakan format response yang konsisten:

```json
{
  "success": boolean,
  "message": string,
  "data": array|object (optional),
  "total": number (optional, untuk pagination),
  "page": number (optional, untuk pagination),
  "limit": number (optional, untuk pagination)
}
```

## ⚡ Performance & Arsitektur

### Teknologi Stack
- **Node.js**: Runtime JavaScript yang stabil dan mature
- **Express.js**: Web framework yang populer dan reliable
- **NodeCache**: In-memory caching untuk performa optimal
- **Axios**: HTTP client dengan retry dan timeout handling
- **JSON**: Format data yang ringan dan cepat di-parse

### Optimasi Performance
- **Smart Caching**: Data di-cache per KLPD+Tahun dengan TTL 1 jam
- **Connection Pooling**: Reuse koneksi HTTP untuk efisiensi
- **Error Recovery**: Fallback ke cache lama jika fetch gagal
- **Lazy Loading**: Data dimuat on-demand per KLPD/tahun
- **Memory Management**: Cache otomatis cleanup setelah TTL

## 🚨 Error Handling

API menangani berbagai jenis error:

- **400 Bad Request**: Parameter tidak valid
- **404 Not Found**: Endpoint tidak ditemukan
- **500 Internal Server Error**: Error server

Contoh response error:
```json
{
  "success": false,
  "message": "Parameter kd_satker diperlukan"
}
```

## 📝 Sumber Data

### Format URL Data
```
https://s3-sip.pbj.my.id/rup/{KLPD}/RUP-PaketPenyedia-Terumumkan/{TAHUN}/data.json
```

### Contoh URL:
- **D197 (Kalbar) 2025**: https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json
- **D032 (Jabar) 2024**: https://s3-sip.pbj.my.id/rup/D032/RUP-PaketPenyedia-Terumumkan/2024/data.json

### Custom Data Source
Jika ingin menggunakan sumber data custom:
```bash
echo "JSON_DATA_URL=https://your-custom-url.com/data.json" >> .env
```

## 🤝 Contributing

1. Fork project ini
2. Buat branch untuk fitur baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add some amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📄 License

Project ini menggunakan license MIT. Lihat file `LICENSE` untuk detail lengkap.

## 🚀 Deployment

### Development
```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Start development server
npm run dev
```

### Production
```bash
# Install production dependencies
npm install --production

# Set environment variables
export PORT=3000
export DEFAULT_KLPD=D197
export DEFAULT_TAHUN=2025

# Start production server
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 (Recommended for Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start src/index.js --name "rup-api-satker"

# Monitor
pm2 monit

# Logs
pm2 logs rup-api-satker
```

## 📊 Monitoring

### Health Monitoring
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed monitoring
watch -n 5 'curl -s http://localhost:3000/health | jq .'
```

### Log Monitoring
```bash
# Follow logs in development
npm run dev

# Follow logs in production with PM2
pm2 logs rup-api-satker --lines 100 -f
```

### Performance Metrics
Monitor melalui endpoint `/health`:
- `data_loaded`: Status data sudah dimuat
- `data_loading`: Status sedang loading
- `total_records`: Jumlah total records
- `cache_stats`: Statistik cache (hits, misses, keys)

---

**Dibuat dengan ❤️ menggunakan Node.js, Express.js, NodeCache, dan Axios**

*API ini dibuat untuk memudahkan akses data RUP (Rencana Umum Pengadaan) dengan performa tinggi dan reliability yang baik.*