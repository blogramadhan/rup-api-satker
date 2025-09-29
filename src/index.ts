import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// In-memory data storage
let rupData: RupData[] = [];
let isDataLoaded = false;

// Interface untuk response data
interface RupData {
  kd_satker?: string;
  nama_satker?: string;
  kd_klpd?: string;
  nama_klpd?: string;
  provinsi?: string;
  tahun?: number;
  jenis_pengadaan?: string;
  nama_paket?: string;
  pagu?: number;
  metode_pengadaan?: string;
  status?: string;
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: RupData[];
  total?: number;
  page?: number;
  limit?: number;
}

// Fungsi untuk load data dari URL (simulasi data berdasarkan URL yang diberikan)
async function loadRupData() {
  try {
    console.log('🔄 Memuat data RUP...');
    
    // Simulasi data berdasarkan informasi dari URL Parquet
    // Dalam implementasi nyata, Anda perlu menggunakan library parquet reader
    const simulatedData: RupData[] = [
      {
        kd_satker: "D197",
        nama_satker: "Dinas Pendidikan Provinsi Kalimantan Barat",
        kd_klpd: "D197",
        nama_klpd: "Provinsi Kalimantan Barat", 
        provinsi: "Provinsi Kalimantan Barat",
        tahun: 2025,
        jenis_pengadaan: "Barang",
        nama_paket: "Pengadaan Alat Tulis Kantor",
        pagu: 500000000,
        metode_pengadaan: "Tender",
        status: "Terumumkan"
      },
      {
        kd_satker: "D197",
        nama_satker: "Dinas Pendidikan Provinsi Kalimantan Barat",
        kd_klpd: "D197", 
        nama_klpd: "Provinsi Kalimantan Barat",
        provinsi: "Provinsi Kalimantan Barat",
        tahun: 2025,
        jenis_pengadaan: "Jasa",
        nama_paket: "Jasa Konsultansi Perencanaan",
        pagu: 750000000,
        metode_pengadaan: "Seleksi",
        status: "Terumumkan"
      },
      // Tambahkan lebih banyak data simulasi untuk testing
      ...Array.from({ length: 48 }, (_, i) => ({
        kd_satker: `D${197 + (i % 10)}`,
        nama_satker: `Satuan Kerja ${197 + (i % 10)}`,
        kd_klpd: `D${197 + (i % 10)}`,
        nama_klpd: "Provinsi Kalimantan Barat",
        provinsi: "Provinsi Kalimantan Barat",
        tahun: 2025,
        jenis_pengadaan: i % 2 === 0 ? "Barang" : "Jasa",
        nama_paket: `Paket Pengadaan ${i + 1}`,
        pagu: (i + 1) * 100000000,
        metode_pengadaan: i % 3 === 0 ? "Tender" : i % 3 === 1 ? "Seleksi" : "Penunjukan",
        status: "Terumumkan"
      }))
    ];
    
    rupData = simulatedData;
    isDataLoaded = true;
    
    console.log(`✅ Data berhasil dimuat: ${rupData.length} records`);
    console.log(`📊 Satker yang tersedia: ${new Set(rupData.map(d => d.kd_satker)).size} satker`);
    
  } catch (error) {
    console.error('❌ Error saat memuat data:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'API RUP Satker berjalan dengan baik',
    timestamp: new Date().toISOString()
  });
});

// Endpoint utama untuk mendapatkan data berdasarkan kd_satker
app.get('/api/rup/:kd_satker', async (c) => {
  try {
    if (!isDataLoaded) {
      return c.json<ApiResponse>({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      }, 503);
    }

    const kd_satker = c.req.param('kd_satker');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;

    if (!kd_satker) {
      return c.json<ApiResponse>({
        success: false,
        message: 'Parameter kd_satker diperlukan'
      }, 400);
    }

    // Filter data berdasarkan kd_satker
    const filteredData = rupData.filter(item => item.kd_satker === kd_satker);
    const total = filteredData.length;
    
    // Pagination
    const paginatedData = filteredData.slice(offset, offset + limit);

    return c.json<ApiResponse>({
      success: true,
      message: `Data RUP untuk satker ${kd_satker} berhasil diambil`,
      data: paginatedData,
      total: total,
      page: page,
      limit: limit
    });

  } catch (error) {
    console.error('Error saat mengambil data:', error);
    return c.json<ApiResponse>({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    }, 500);
  }
});

// Endpoint untuk mendapatkan semua data dengan filter dan pagination
app.get('/api/rup', async (c) => {
  try {
    if (!isDataLoaded) {
      return c.json<ApiResponse>({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      }, 503);
    }

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;
    const search = c.req.query('search') || '';

    let filteredData = rupData;

    // Filter pencarian jika ada
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = rupData.filter(item => 
        item.kd_satker?.toLowerCase().includes(searchLower) ||
        item.nama_satker?.toLowerCase().includes(searchLower) ||
        item.nama_paket?.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredData.length;
    const paginatedData = filteredData.slice(offset, offset + limit);

    return c.json<ApiResponse>({
      success: true,
      message: 'Data RUP berhasil diambil',
      data: paginatedData,
      total: total,
      page: page,
      limit: limit
    });

  } catch (error) {
    console.error('Error saat mengambil data:', error);
    return c.json<ApiResponse>({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    }, 500);
  }
});

// Endpoint untuk mendapatkan daftar satker yang tersedia
app.get('/api/satker/list', async (c) => {
  try {
    if (!isDataLoaded) {
      return c.json<ApiResponse>({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      }, 503);
    }

    // Ambil data unik berdasarkan kd_satker
    const uniqueSatker = Array.from(
      new Map(
        rupData.map(item => [
          item.kd_satker,
          {
            kd_satker: item.kd_satker,
            nama_satker: item.nama_satker,
            provinsi: item.provinsi
          }
        ])
      ).values()
    ).sort((a, b) => (a.kd_satker || '').localeCompare(b.kd_satker || ''));

    return c.json<ApiResponse>({
      success: true,
      message: 'Daftar satker berhasil diambil',
      data: uniqueSatker,
      total: uniqueSatker.length
    });

  } catch (error) {
    console.error('Error saat mengambil daftar satker:', error);
    return c.json<ApiResponse>({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar satker'
    }, 500);
  }
});

// Endpoint untuk statistik data
app.get('/api/stats', async (c) => {
  try {
    if (!isDataLoaded) {
      return c.json<ApiResponse>({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      }, 503);
    }

    const stats = {
      total_records: rupData.length,
      total_satker: new Set(rupData.map(item => item.kd_satker)).size,
      total_provinsi: new Set(rupData.map(item => item.provinsi)).size,
      total_pagu: rupData.reduce((sum, item) => sum + (item.pagu || 0), 0),
      breakdown_jenis: rupData.reduce((acc: any, item) => {
        const jenis = item.jenis_pengadaan || 'Tidak Diketahui';
        acc[jenis] = (acc[jenis] || 0) + 1;
        return acc;
      }, {}),
      breakdown_metode: rupData.reduce((acc: any, item) => {
        const metode = item.metode_pengadaan || 'Tidak Diketahui';
        acc[metode] = (acc[metode] || 0) + 1;
        return acc;
      }, {})
    };

    return c.json({
      success: true,
      message: 'Statistik data berhasil diambil',
      data: stats
    });

  } catch (error) {
    console.error('Error saat mengambil statistik:', error);
    return c.json<ApiResponse>({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik'
    }, 500);
  }
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json<ApiResponse>({
    success: false,
    message: 'Terjadi kesalahan server internal'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json<ApiResponse>({
    success: false,
    message: 'Endpoint tidak ditemukan'
  }, 404);
});

// Load data saat aplikasi dimulai
loadRupData().then(() => {
  console.log('🚀 Data RUP berhasil dimuat');
}).catch((error) => {
  console.error('❌ Gagal memuat data RUP:', error);
  // Tidak exit, biarkan server tetap berjalan dengan data kosong
});

const port = process.env.PORT || 3000;
console.log(`🌟 Server berjalan di http://localhost:${port}`);

export default {
  port: port,
  fetch: app.fetch,
};
