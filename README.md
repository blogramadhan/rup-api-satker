# RUP API Satker

Backend API untuk mengakses data RUP (Rencana Umum Pengadaan) berdasarkan kode satuan kerja (`kd_satker`) menggunakan Node.js, Express.js, dan DuckDB.

## 🚀 Fitur

- ✅ Query data RUP berdasarkan `kd_satker`
- ✅ Pagination untuk hasil yang banyak
- ✅ Pencarian dan filtering data
- ✅ Statistik data RUP
- ✅ Daftar satker yang tersedia
- ✅ CORS support untuk frontend integration
- ✅ Error handling yang comprehensive
- ✅ Response format JSON yang konsisten

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

### Health Check
```
GET /health
```
Mengecek status kesehatan API.

**Response:**
```json
{
  "success": true,
  "message": "API RUP Satker berjalan dengan baik",
  "timestamp": "2025-09-29T10:30:00.000Z"
}
```

### Data RUP Berdasarkan Satker
```
GET /api/rup/:kd_satker
```

**Parameters:**
- `kd_satker` (required): Kode satuan kerja
- `page` (optional): Nomor halaman (default: 1)
- `limit` (optional): Jumlah data per halaman (default: 10)

**Contoh:**
```bash
curl "http://localhost:3000/api/rup/D197?page=1&limit=5"
```

**Response:**
```json
{
  "success": true,
  "message": "Data RUP untuk satker D197 berhasil diambil",
  "data": [
    {
      "kd_satker": "D197",
      "nama_satker": "Nama Satuan Kerja",
      "kd_klpd": "123",
      "nama_klpd": "Nama KLPD",
      "provinsi": "Provinsi Kalimantan Barat",
      // ... kolom lainnya
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 5
}
```

### Semua Data RUP dengan Filter
```
GET /api/rup
```

**Parameters:**
- `page` (optional): Nomor halaman (default: 1)
- `limit` (optional): Jumlah data per halaman (default: 10)
- `search` (optional): Pencarian berdasarkan kd_satker atau nama_satker

**Contoh:**
```bash
curl "http://localhost:3000/api/rup?search=D197&page=1&limit=10"
```

### Daftar Satker
```
GET /api/satker/list
```
Mendapatkan daftar semua satker yang tersedia.

**Response:**
```json
{
  "success": true,
  "message": "Daftar satker berhasil diambil",
  "data": [
    {
      "kd_satker": "D197",
      "nama_satker": "Nama Satuan Kerja",
      "provinsi": "Provinsi Kalimantan Barat"
    }
  ],
  "total": 50
}
```

### Statistik Data
```
GET /api/stats
```
Mendapatkan statistik umum data RUP.

**Response:**
```json
{
  "success": true,
  "message": "Statistik data berhasil diambil",
  "data": {
    "total_records": 10000,
    "total_satker": 500,
    "total_provinsi": 34
  }
}
```

## 🔧 Konfigurasi

### Environment Variables

Buat file `.env` berdasarkan `env.example`:

```bash
cp env.example .env
```

Variabel yang tersedia:
- `PORT`: Port server (default: 3000)
- `PARQUET_URL`: URL file Parquet (sudah di-hardcode)

## 🏗️ Struktur Project

```
rup-api-satker/
├── src/
│   └── index.ts          # Main application file
├── package.json          # Dependencies dan scripts
├── env.example          # Template environment variables
└── README.md            # Dokumentasi ini
```

## 🧪 Testing API

### Menggunakan curl:

1. **Health check:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Data berdasarkan satker:**
   ```bash
   curl http://localhost:3000/api/rup/D197
   ```

3. **Data dengan pagination:**
   ```bash
   curl "http://localhost:3000/api/rup/D197?page=1&limit=5"
   ```

4. **Pencarian data:**
   ```bash
   curl "http://localhost:3000/api/rup?search=D197"
   ```

### Menggunakan JavaScript/Fetch:

```javascript
// Ambil data berdasarkan satker
const response = await fetch('http://localhost:3000/api/rup/D197');
const data = await response.json();
console.log(data);

// Dengan pagination
const paginatedResponse = await fetch('http://localhost:3000/api/rup/D197?page=1&limit=10');
const paginatedData = await paginatedResponse.json();
console.log(paginatedData);
```

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

## ⚡ Performance

- **DuckDB**: Database in-memory yang sangat cepat untuk analitik
- **Parquet**: Format file yang efisien untuk data besar
- **Node.js**: Runtime JavaScript yang stabil dan mature
- **Express.js**: Web framework yang populer dan reliable

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

Data diambil dari: [https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.parquet](https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.parquet)

## 🤝 Contributing

1. Fork project ini
2. Buat branch untuk fitur baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add some amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📄 License

Project ini menggunakan license MIT. Lihat file `LICENSE` untuk detail lengkap.

---

**Dibuat dengan ❤️ menggunakan Node.js, Express.js, dan DuckDB**