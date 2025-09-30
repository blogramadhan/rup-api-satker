# Testing Perbaikan Error Handling

## 1. Test Validasi KLPD

### Test KLPD lowercase (akan dinormalisasi)
```bash
curl "http://localhost:3000/api/validate?klpd=d118&tahun=2025"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Ada parameter yang tidak valid",
  "results": {
    "klpd": {
      "input": "d118",
      "valid": false,
      "normalized": "D118",
      "error": "KLPD 'D118' tidak valid. KLPD yang tersedia: D001, D002, D003..."
    },
    "tahun": {
      "input": "2025",
      "valid": true,
      "normalized": "2025",
      "error": null
    }
  }
}
```

### Test KLPD valid
```bash
curl "http://localhost:3000/api/validate?klpd=D197&tahun=2025"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Semua parameter valid",
  "results": {
    "klpd": {
      "input": "D197",
      "valid": true,
      "normalized": "D197",
      "error": null
    },
    "tahun": {
      "input": "2025",
      "valid": true,
      "normalized": "2025",
      "error": null
    }
  }
}
```

## 2. Test Koneksi dengan Validasi

### Test koneksi KLPD tidak valid
```bash
curl "http://localhost:3000/api/test-connection?klpd=d118&tahun=2025"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Parameter KLPD tidak valid",
  "error": "KLPD 'D118' tidak valid. KLPD yang tersedia: D001, D002, D003...",
  "input_klpd": "d118",
  "valid_klpd": ["D001", "D002", "D003", "..."]
}
```

### Test koneksi KLPD valid
```bash
curl "http://localhost:3000/api/test-connection?klpd=D197&tahun=2025"
```

**Expected Response (jika berhasil):**
```json
{
  "success": true,
  "message": "Koneksi berhasil",
  "url": "https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.json",
  "klpd": {
    "input": "D197",
    "normalized": "D197",
    "changed": false
  },
  "tahun": {
    "input": "2025",
    "normalized": "2025", 
    "changed": false
  },
  "status": 200,
  "response_time_ms": 150
}
```

## 3. Test Fetch Data dengan Error 404

### Sebelum perbaikan:
- Error: "Error saat mengambil data JSON: Error"
- Tidak informatif

### Setelah perbaikan:
```bash
curl "http://localhost:3000/api/config" -X POST -H "Content-Type: application/json" -d '{"klpd":"D118","tahun":"2025"}'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Gagal mengganti konfigurasi: Validasi KLPD gagal: KLPD 'D118' tidak valid. KLPD yang tersedia: D001, D002, D003..."
}
```

## 4. Test Normalisasi Parameter

### Test lowercase dan spasi
```bash
curl "http://localhost:3000/api/validate?klpd= d197 &tahun= 2025 "
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Semua parameter valid",
  "results": {
    "klpd": {
      "input": " d197 ",
      "valid": true,
      "normalized": "D197",
      "error": null
    },
    "tahun": {
      "input": " 2025 ",
      "valid": true,
      "normalized": "2025",
      "error": null
    }
  }
}
```

## 5. Test Error Tahun Tidak Valid

```bash
curl "http://localhost:3000/api/validate?klpd=D197&tahun=2019"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Ada parameter yang tidak valid",
  "results": {
    "klpd": {
      "input": "D197",
      "valid": true,
      "normalized": "D197",
      "error": null
    },
    "tahun": {
      "input": "2019",
      "valid": false,
      "normalized": "2019",
      "error": "Tahun '2019' tidak valid. Tahun harus antara 2020-2030"
    }
  }
}
```

## Manfaat Perbaikan

1. **Error yang Informatif**: Pesan error yang jelas dan actionable
2. **Validasi Parameter**: Cegah request ke URL yang tidak valid
3. **Normalisasi Otomatis**: Lowercase → uppercase, trim spasi
4. **Debugging yang Mudah**: Endpoint khusus untuk validasi
5. **User Experience**: Saran KLPD yang valid saat error
