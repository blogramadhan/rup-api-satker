import express from 'express';
import cors from 'cors';
import { Database } from 'duckdb';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// DuckDB connection
const db = new Database(':memory:');
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));

let isDataLoaded = false;

// Fungsi untuk inisialisasi DuckDB dan load data Parquet dari URL
async function initializeDuckDB() {
  try {
    console.log('🔄 Menginisialisasi DuckDB dan memuat data Parquet...');
    
    // Install dan load ekstensi httpfs untuk membaca file dari URL
    await dbRun("INSTALL httpfs;");
    await dbRun("LOAD httpfs;");
    
    // URL Parquet dari sumber data
    const parquetUrl = 'https://s3-sip.pbj.my.id/rup/D197/RUP-PaketPenyedia-Terumumkan/2025/data.parquet';
    
    // Buat view dari file Parquet
    await dbRun(`CREATE VIEW rup_data AS SELECT * FROM read_parquet('${parquetUrl}');`);
    
    // Test query untuk memastikan data berhasil dimuat
    const testQuery = "SELECT COUNT(*) as total FROM rup_data";
    const testResult = await dbAll(testQuery);
    const totalRecords = testResult[0]?.total || 0;
    
    console.log(`✅ Data Parquet berhasil dimuat: ${totalRecords} records`);
    
    // Cek struktur kolom
    const columnsQuery = "DESCRIBE rup_data";
    const columns = await dbAll(columnsQuery);
    console.log('📊 Struktur kolom:', columns.map(col => col.column_name));
    
    // Cek sample data untuk kd_satker yang tersedia
    const satkerQuery = "SELECT DISTINCT kd_satker FROM rup_data LIMIT 10";
    const satkerSample = await dbAll(satkerQuery);
    console.log('🏢 Sample kd_satker:', satkerSample.map(row => row.kd_satker));
    
    isDataLoaded = true;
    
  } catch (error) {
    console.error('❌ Error saat inisialisasi DuckDB:', error);
    console.error('Detail error:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API RUP Satker berjalan dengan baik',
    timestamp: new Date().toISOString(),
    duckdb_loaded: isDataLoaded
  });
});

// Endpoint utama untuk mendapatkan data berdasarkan kd_satker
app.get('/api/rup/:kd_satker', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    const { kd_satker } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!kd_satker) {
      return res.status(400).json({
        success: false,
        message: 'Parameter kd_satker diperlukan'
      });
    }

    // Query data berdasarkan kd_satker dengan pagination
    const dataQuery = `
      SELECT * FROM rup_data 
      WHERE kd_satker = ? 
      ORDER BY kd_satker
      LIMIT ? OFFSET ?
    `;
    
    const data = await dbAll(dataQuery, [kd_satker, limit, offset]);

    // Hitung total data untuk pagination
    const countQuery = `SELECT COUNT(*) as total FROM rup_data WHERE kd_satker = ?`;
    const countResult = await dbAll(countQuery, [kd_satker]);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      message: `Data RUP untuk satker ${kd_satker} berhasil diambil`,
      data: data,
      total: total,
      page: page,
      limit: limit
    });

  } catch (error) {
    console.error('Error saat mengambil data:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Endpoint untuk mendapatkan semua data dengan filter dan pagination
app.get('/api/rup', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let dataQuery = 'SELECT * FROM rup_data';
    let countQuery = 'SELECT COUNT(*) as total FROM rup_data';
    const params = [];

    // Tambahkan filter pencarian jika ada
    if (search) {
      dataQuery += ' WHERE kd_satker LIKE ? OR nama_satker LIKE ? OR nama_paket LIKE ?';
      countQuery += ' WHERE kd_satker LIKE ? OR nama_satker LIKE ? OR nama_paket LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    dataQuery += ' ORDER BY kd_satker LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const data = await dbAll(dataQuery, params);
    
    // Hitung total untuk pagination
    const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const countResult = await dbAll(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      message: 'Data RUP berhasil diambil',
      data: data,
      total: total,
      page: page,
      limit: limit
    });

  } catch (error) {
    console.error('Error saat mengambil data:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Endpoint untuk mendapatkan daftar satker yang tersedia
app.get('/api/satker/list', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    const query = `
      SELECT DISTINCT kd_satker, nama_satker, provinsi
      FROM rup_data 
      ORDER BY kd_satker
    `;
    
    const data = await dbAll(query);

    res.json({
      success: true,
      message: 'Daftar satker berhasil diambil',
      data: data,
      total: data.length
    });

  } catch (error) {
    console.error('Error saat mengambil daftar satker:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar satker'
    });
  }
});

// Endpoint untuk statistik data
app.get('/api/stats', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    const queries = {
      total_records: 'SELECT COUNT(*) as count FROM rup_data',
      total_satker: 'SELECT COUNT(DISTINCT kd_satker) as count FROM rup_data',
      total_provinsi: 'SELECT COUNT(DISTINCT provinsi) as count FROM rup_data',
      total_pagu: 'SELECT SUM(CAST(pagu AS BIGINT)) as total FROM rup_data WHERE pagu IS NOT NULL'
    };

    const stats = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await dbAll(query);
        stats[key] = result[0]?.count || result[0]?.total || 0;
      } catch (err) {
        console.warn(`Warning: Error executing query for ${key}:`, err);
        stats[key] = 0;
      }
    }

    // Breakdown data berdasarkan jenis pengadaan
    try {
      const jenisQuery = 'SELECT jenis_pengadaan, COUNT(*) as count FROM rup_data GROUP BY jenis_pengadaan';
      const jenisResult = await dbAll(jenisQuery);
      stats.breakdown_jenis = jenisResult.reduce((acc, item) => {
        acc[item.jenis_pengadaan || 'Tidak Diketahui'] = item.count;
        return acc;
      }, {});
    } catch (err) {
      console.warn('Warning: Error getting jenis breakdown:', err);
      stats.breakdown_jenis = {};
    }

    res.json({
      success: true,
      message: 'Statistik data berhasil diambil',
      data: stats
    });

  } catch (error) {
    console.error('Error saat mengambil statistik:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik'
    });
  }
});

// Endpoint untuk mendapatkan info kolom yang tersedia
app.get('/api/columns', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    const query = 'DESCRIBE rup_data';
    const columns = await dbAll(query);

    res.json({
      success: true,
      message: 'Info kolom berhasil diambil',
      data: columns
    });

  } catch (error) {
    console.error('Error saat mengambil info kolom:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil info kolom'
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan server internal'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan'
  });
});

// Inisialisasi DuckDB saat aplikasi dimulai
initializeDuckDB().then(() => {
  console.log('🚀 DuckDB berhasil diinisialisasi');
}).catch((error) => {
  console.error('❌ Gagal menginisialisasi DuckDB:', error);
  // Tidak exit, biarkan server tetap berjalan untuk debugging
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🌟 Server Express.js berjalan di http://localhost:${port}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /api/rup/:kd_satker - Data berdasarkan satker`);
  console.log(`   GET /api/rup - Semua data dengan filter`);
  console.log(`   GET /api/satker/list - Daftar satker`);
  console.log(`   GET /api/stats - Statistik data`);
  console.log(`   GET /api/columns - Info kolom`);
});

export default app;
