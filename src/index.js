import express from 'express';
import cors from 'cors';
import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Cache untuk menyimpan data JSON (cache selama 1 jam = 3600 detik)
const dataCache = new NodeCache({ stdTTL: 3600 });

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Variabel untuk menyimpan data dan status loading
let rupData = [];
let isDataLoaded = false;
let isLoading = false;

// Konfigurasi default untuk RUP data
const DEFAULT_KLPD = process.env.DEFAULT_KLPD || 'D197';
const DEFAULT_TAHUN = process.env.DEFAULT_TAHUN || '2025';

// Variabel untuk menyimpan parameter saat ini
let currentKlpd = DEFAULT_KLPD;
let currentTahun = DEFAULT_TAHUN;

// Fungsi untuk membuat URL berdasarkan parameter
function buildDataURL(klpd = DEFAULT_KLPD, tahun = DEFAULT_TAHUN) {
  // Jika ada custom URL di environment, gunakan itu
  if (process.env.JSON_DATA_URL) {
    console.log('🔧 Menggunakan custom URL dari environment');
    return process.env.JSON_DATA_URL;
  }
  
  // Build URL otomatis berdasarkan parameter menggunakan S3 SIP PBJ
  // Format: https://s3-sip.pbj.my.id/rup/{KLPD}/RUP-PaketPenyedia-Terumumkan/{TAHUN}/data.json
  const url = `https://s3-sip.pbj.my.id/rup/${klpd}/RUP-PaketPenyedia-Terumumkan/${tahun}/data.json`;
  console.log('🔧 URL yang dibangun:', url);
  return url;
}

// URL default
let JSON_DATA_URL = buildDataURL(currentKlpd, currentTahun);

// Fungsi untuk fetch data JSON dari URL dengan parameter opsional
async function fetchJSONData(klpd = currentKlpd, tahun = currentTahun) {
  // Define cacheKey di luar try-catch agar bisa diakses di catch block
  const cacheKey = `rupData_${klpd}_${tahun}`;
  
  try {
    // Update parameter saat ini
    currentKlpd = klpd;
    currentTahun = tahun;
    
    // Build URL berdasarkan parameter
    JSON_DATA_URL = buildDataURL(klpd, tahun);
    
    console.log('🔄 Mengambil data JSON dari:', JSON_DATA_URL);
    console.log('📊 Parameter: KLPD =', klpd, ', Tahun =', tahun);
    console.log('🔍 Cache key:', cacheKey);
    
    // Validasi URL
    try {
      new URL(JSON_DATA_URL);
    } catch (urlError) {
      throw new Error(`URL tidak valid: ${JSON_DATA_URL}`);
    }
    
    // Cek cache berdasarkan parameter (cache key unik per KLPD+Tahun)
    const cachedData = dataCache.get(cacheKey);
    if (cachedData) {
      console.log('✅ Menggunakan data dari cache');
      rupData = cachedData;
      isDataLoaded = true;
      return;
    }

    isLoading = true;
    console.log('⏳ Memulai request HTTP...');
    
    // Fetch data dari URL
    const startTime = Date.now();
    const response = await axios.get(JSON_DATA_URL, {
      timeout: 30000, // 30 detik timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RUP-API-Satker/1.0'
      }
    });
    
    const requestDuration = Date.now() - startTime;
    console.log(`⚡ Request selesai dalam ${requestDuration}ms`);

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers['content-type']);
    console.log('📊 Response data type:', typeof response.data);
    console.log('📊 Response data length:', response.data?.length || 'N/A');
    
    // Validasi response status
    if (response.status !== 200) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    
    // Validasi content-type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      console.warn('⚠️ Content-Type bukan JSON:', contentType);
    }
    
    // Handle different response formats
    let jsonData = response.data;
    
    // Validasi data tidak null/undefined
    if (jsonData === null || jsonData === undefined) {
      throw new Error('Response data kosong atau null');
    }
    
    // Jika response adalah string, parse sebagai JSON
    if (typeof jsonData === 'string') {
      try {
        jsonData = JSON.parse(jsonData);
      } catch (parseError) {
        console.error('❌ Error parsing JSON string:', parseError);
        throw new Error('Data tidak bisa di-parse sebagai JSON');
      }
    }
    
    // Jika data adalah object dengan property data atau results
    if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      if (jsonData.data && Array.isArray(jsonData.data)) {
        jsonData = jsonData.data;
      } else if (jsonData.results && Array.isArray(jsonData.results)) {
        jsonData = jsonData.results;
      } else if (jsonData.items && Array.isArray(jsonData.items)) {
        jsonData = jsonData.items;
      }
    }
    
    if (!Array.isArray(jsonData)) {
      console.error('❌ Data structure:', Object.keys(jsonData || {}));
      console.error('❌ Data sample:', JSON.stringify(jsonData).substring(0, 200) + '...');
      throw new Error('Data yang diterima bukan array JSON yang valid. Struktur data: ' + typeof jsonData);
    }
    
    // Validasi array tidak kosong
    if (jsonData.length === 0) {
      console.warn('⚠️ Data array kosong untuk KLPD:', klpd, 'Tahun:', tahun);
      // Tidak throw error, karena mungkin memang tidak ada data
    } else {
      // Validasi struktur data item pertama
      const firstItem = jsonData[0];
      const requiredFields = ['kd_satker'];
      const missingFields = requiredFields.filter(field => !(field in firstItem));
      
      if (missingFields.length > 0) {
        console.warn('⚠️ Field yang hilang dari data:', missingFields);
        console.warn('⚠️ Available fields:', Object.keys(firstItem));
      }
    }

    rupData = jsonData;
    
    // Simpan ke cache dengan key unik
    dataCache.set(cacheKey, rupData);
    
    console.log(`✅ Data JSON berhasil dimuat: ${rupData.length} records`);
    
    // Log sample data untuk debugging
    if (rupData.length > 0) {
      console.log('📊 Sample data:', Object.keys(rupData[0]));
      
      // Cek kd_satker yang tersedia
      const uniqueSatker = [...new Set(rupData.map(item => item.kd_satker))].slice(0, 5);
      console.log('🏢 Sample kd_satker:', uniqueSatker);
    }
    
    isDataLoaded = true;
    isLoading = false;
    
  } catch (error) {
    console.error('❌ Error saat mengambil data JSON:', error.message);
    console.error('❌ Error details:', {
      url: JSON_DATA_URL,
      klpd: klpd,
      tahun: tahun,
      errorCode: error.code,
      errorResponse: error.response?.status,
      errorData: error.response?.data,
      stack: error.stack
    });
    isLoading = false;
    
    // Jika ada data lama di cache, gunakan itu
    const cachedData = dataCache.get(cacheKey);
    if (cachedData) {
      console.log('⚠️ Menggunakan data cache lama karena fetch gagal');
      rupData = cachedData;
      isDataLoaded = true;
    } else {
      // Berikan error yang lebih informatif
      const errorMessage = error.response 
        ? `HTTP ${error.response.status}: ${error.response.statusText || 'Unknown error'}`
        : error.code === 'ENOTFOUND' 
          ? 'Domain tidak ditemukan. Periksa koneksi internet atau URL'
          : error.code === 'ECONNREFUSED'
            ? 'Koneksi ditolak. Server mungkin tidak tersedia'
            : error.code === 'ETIMEDOUT'
              ? 'Timeout. Server tidak merespons dalam waktu yang ditentukan'
              : error.message || 'Unknown error';
      
      throw new Error(`Gagal mengambil data: ${errorMessage}`);
    }
  }
}

// Fungsi helper untuk filter data berdasarkan kd_satker
function filterByKdSatker(data, kdSatker) {
  console.log(`🔍 Filtering data untuk kd_satker: ${kdSatker} (type: ${typeof kdSatker})`);
  
  // Cek beberapa kd_satker yang ada untuk debugging
  const sampleSatkers = data.slice(0, 5).map(item => ({
    kd_satker: item.kd_satker,
    type: typeof item.kd_satker
  }));
  console.log('📊 Sample kd_satker dari data:', sampleSatkers);
  
  // Konversi kdSatker ke number untuk matching yang tepat
  const numericKdSatker = parseInt(kdSatker);
  
  // Filter berdasarkan kd_satker (number)
  const filtered = data.filter(item => {
    return item.kd_satker === numericKdSatker;
  });
  
  console.log(`📊 Found ${filtered.length} records untuk kd_satker ${kdSatker}`);
  return filtered;
}

// Fungsi helper untuk format response data
function formatDataResponse(data) {
  return {
    data: data,
    total: data.length
  };
}

// Fungsi helper untuk search
function searchData(data, searchTerm) {
  if (!searchTerm) return data;
  
  const term = searchTerm.toLowerCase();
  return data.filter(item => 
    (item.kd_satker && item.kd_satker.toString().toLowerCase().includes(term)) ||
    (item.nama_satker && item.nama_satker.toLowerCase().includes(term)) ||
    (item.nama_paket && item.nama_paket.toLowerCase().includes(term)) ||
    (item.nama_klpd && item.nama_klpd.toLowerCase().includes(term)) ||
    (item.jenis_pengadaan && item.jenis_pengadaan.toLowerCase().includes(term)) ||
    (item.metode_pengadaan && item.metode_pengadaan.toLowerCase().includes(term))
  );
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API RUP Satker berjalan dengan baik',
    timestamp: new Date().toISOString(),
    data_loaded: isDataLoaded,
    data_loading: isLoading,
    total_records: rupData.length,
    current_url: JSON_DATA_URL,
    current_klpd: currentKlpd,
    current_tahun: currentTahun,
    cache_stats: dataCache.getStats()
  });
});

// Test koneksi endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const { klpd, tahun } = req.query;
    const testKlpd = klpd || currentKlpd;
    const testTahun = tahun || currentTahun;
    const testURL = buildDataURL(testKlpd, testTahun);
    
    console.log('🧪 Testing connection to:', testURL);
    
    const startTime = Date.now();
    const response = await axios.head(testURL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'RUP-API-Satker/1.0'
      }
    });
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Koneksi berhasil',
      url: testURL,
      status: response.status,
      headers: response.headers,
      response_time_ms: duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test connection failed:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Koneksi gagal',
      url: buildDataURL(req.query.klpd || currentKlpd, req.query.tahun || currentTahun),
      error: error.message,
      error_code: error.code,
      error_status: error.response?.status,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint utama untuk mendapatkan data berdasarkan kd_satker dengan parameter klpd dan tahun
app.get('/api/rup/:kd_satker', async (req, res) => {
  try {
    const { kd_satker } = req.params;
    const { klpd, tahun } = req.query;

    if (!kd_satker) {
      return res.status(400).json({
        success: false,
        message: 'Parameter kd_satker diperlukan'
      });
    }

    // Tentukan KLPD dan tahun yang akan digunakan
    const targetKlpd = klpd || currentKlpd;
    const targetTahun = tahun || currentTahun;

    // Jika parameter berbeda dari yang sedang dimuat, fetch data baru
    if (targetKlpd !== currentKlpd || targetTahun !== currentTahun) {
      console.log(`🔄 Switching to KLPD: ${targetKlpd}, Tahun: ${targetTahun}`);
      
      // Cek cache untuk parameter yang diminta
      const cacheKey = `rupData_${targetKlpd}_${targetTahun}`;
      let targetData = dataCache.get(cacheKey);
      
      if (!targetData) {
        // Fetch data untuk parameter yang diminta
        await fetchJSONData(targetKlpd, targetTahun);
        targetData = rupData;
      } else {
        // Gunakan data dari cache
        console.log(`✅ Using cached data for ${targetKlpd}_${targetTahun}`);
        rupData = targetData;
        isDataLoaded = true;
      }
    } else {
      // Pastikan data sudah dimuat untuk parameter saat ini
      if (isLoading) {
        return res.status(202).json({
          success: false,
          message: 'Data sedang dimuat, silakan coba lagi dalam beberapa saat'
        });
      }

      if (!isDataLoaded) {
        return res.status(503).json({
          success: false,
          message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
        });
      }
    }

    // Filter data berdasarkan kd_satker
    const filteredData = filterByKdSatker(rupData, kd_satker);
    
    if (filteredData.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Tidak ada data untuk kd_satker: ${kd_satker} di KLPD: ${targetKlpd}, Tahun: ${targetTahun}`
      });
    }

    // Return data JSON langsung
    res.json(filteredData);

  } catch (error) {
    console.error('Error saat mengambil data:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Endpoint untuk mendapatkan semua data dengan filter dan parameter klpd/tahun
app.get('/api/rup', async (req, res) => {
  try {
    const { klpd, tahun, search } = req.query;

    // Tentukan KLPD dan tahun yang akan digunakan
    const targetKlpd = klpd || currentKlpd;
    const targetTahun = tahun || currentTahun;

    // Jika parameter berbeda dari yang sedang dimuat, fetch data baru
    if (targetKlpd !== currentKlpd || targetTahun !== currentTahun) {
      console.log(`🔄 Switching to KLPD: ${targetKlpd}, Tahun: ${targetTahun}`);
      
      // Cek cache untuk parameter yang diminta
      const cacheKey = `rupData_${targetKlpd}_${targetTahun}`;
      let targetData = dataCache.get(cacheKey);
      
      if (!targetData) {
        // Fetch data untuk parameter yang diminta
        await fetchJSONData(targetKlpd, targetTahun);
        targetData = rupData;
      } else {
        // Gunakan data dari cache
        console.log(`✅ Using cached data for ${targetKlpd}_${targetTahun}`);
        rupData = targetData;
        isDataLoaded = true;
      }
    } else {
      // Pastikan data sudah dimuat untuk parameter saat ini
      if (isLoading) {
        return res.status(202).json({
          success: false,
          message: 'Data sedang dimuat, silakan coba lagi dalam beberapa saat'
        });
      }

      if (!isDataLoaded) {
        return res.status(503).json({
          success: false,
          message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
        });
      }
    }

    // Filter data berdasarkan search term
    let filteredData = rupData;
    if (search) {
      filteredData = searchData(rupData, search);
    }

    // Return data JSON langsung
    res.json(filteredData);

  } catch (error) {
    console.error('Error saat mengambil data:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Endpoint khusus untuk data berdasarkan klpd dan tahun
app.get('/api/:klpd/:tahun/rup/:kd_satker', async (req, res) => {
  try {
    const { klpd, tahun, kd_satker } = req.params;

    if (!kd_satker) {
      return res.status(400).json({
        success: false,
        message: 'Parameter kd_satker diperlukan'
      });
    }

    console.log(`🔍 Fetching data for KLPD: ${klpd}, Tahun: ${tahun}, Satker: ${kd_satker}`);

    // Cek cache untuk parameter yang diminta
    const cacheKey = `rupData_${klpd}_${tahun}`;
    let targetData = dataCache.get(cacheKey);
    
    if (!targetData) {
      // Fetch data untuk parameter yang diminta
      console.log(`📥 Loading new data for ${klpd}_${tahun}`);
      await fetchJSONData(klpd, tahun);
      targetData = rupData;
    } else {
      // Gunakan data dari cache
      console.log(`✅ Using cached data for ${klpd}_${tahun}`);
      rupData = targetData;
      isDataLoaded = true;
    }

    // Filter data berdasarkan kd_satker
    const filteredData = filterByKdSatker(rupData, kd_satker);
    
    if (filteredData.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Tidak ada data untuk kd_satker: ${kd_satker} di KLPD: ${klpd}, Tahun: ${tahun}`
      });
    }

    // Return data JSON langsung
    res.json(filteredData);

  } catch (error) {
    console.error('Error saat mengambil data:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Endpoint untuk semua data berdasarkan klpd dan tahun
app.get('/api/:klpd/:tahun/rup', async (req, res) => {
  try {
    const { klpd, tahun } = req.params;
    const { search } = req.query;

    console.log(`🔍 Fetching all data for KLPD: ${klpd}, Tahun: ${tahun}`);

    // Cek cache untuk parameter yang diminta
    const cacheKey = `rupData_${klpd}_${tahun}`;
    let targetData = dataCache.get(cacheKey);
    
    if (!targetData) {
      // Fetch data untuk parameter yang diminta
      console.log(`📥 Loading new data for ${klpd}_${tahun}`);
      await fetchJSONData(klpd, tahun);
      targetData = rupData;
    } else {
      // Gunakan data dari cache
      console.log(`✅ Using cached data for ${klpd}_${tahun}`);
      rupData = targetData;
      isDataLoaded = true;
    }

    // Filter data berdasarkan search term
    let filteredData = rupData;
    if (search) {
      filteredData = searchData(rupData, search);
    }

    // Return data JSON langsung
    res.json(filteredData);

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
    if (isLoading) {
      return res.status(202).json({
        success: false,
        message: 'Data sedang dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    // Ambil unique satker dengan logging untuk debug
    console.log(`📊 Processing ${rupData.length} records untuk satker list`);
    
    const uniqueSatker = rupData.reduce((acc, item) => {
      const key = item.kd_satker;
      if (!acc[key] && item.kd_satker) {
        acc[key] = {
          kd_satker: item.kd_satker,
          nama_satker: item.nama_satker || 'Tidak Diketahui',
          nama_klpd: item.nama_klpd || 'Tidak Diketahui',
          kd_klpd: item.kd_klpd || 'Tidak Diketahui'
        };
      }
      return acc;
    }, {});

    const satkerList = Object.values(uniqueSatker).sort((a, b) => {
      const aKey = a.kd_satker?.toString() || '';
      const bKey = b.kd_satker?.toString() || '';
      return aKey.localeCompare(bKey);
    });
    
    console.log(`📊 Found ${satkerList.length} unique satkers`);

    // Jika tidak ada data, return array kosong
    if (satkerList.length === 0) {
      console.log('⚠️ No satker data found, returning empty array');
      return res.json([]);
    }

    res.json(satkerList);

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
    if (isLoading) {
      return res.status(202).json({
        success: false,
        message: 'Data sedang dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    const stats = {
      total_records: rupData.length,
      total_satker: new Set(rupData.map(item => item.kd_satker)).size,
      total_provinsi: new Set(rupData.map(item => item.provinsi)).size
    };

    // Hitung total pagu jika ada
    try {
      const totalPagu = rupData.reduce((sum, item) => {
        const pagu = parseFloat(item.pagu) || 0;
        return sum + pagu;
      }, 0);
      stats.total_pagu = totalPagu;
    } catch (err) {
      console.warn('Warning: Error calculating total pagu:', err);
      stats.total_pagu = 0;
    }

    // Breakdown berdasarkan jenis pengadaan
    try {
      const jenisBreakdown = rupData.reduce((acc, item) => {
        const jenis = item.jenis_pengadaan || 'Tidak Diketahui';
        acc[jenis] = (acc[jenis] || 0) + 1;
        return acc;
      }, {});
      stats.breakdown_jenis = jenisBreakdown;
    } catch (err) {
      console.warn('Warning: Error getting jenis breakdown:', err);
      stats.breakdown_jenis = {};
    }

    res.json(stats);

  } catch (error) {
    console.error('Error saat mengambil statistik:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik'
    });
  }
});

// Endpoint untuk mendapatkan daftar KLPD yang tersedia
app.get('/api/klpd/list', async (req, res) => {
  try {
    // Daftar KLPD yang umum digunakan (berdasarkan kode standar Indonesia)
    const klpdList = [
      { kd_klpd: 'D001', nama_klpd: 'Provinsi Nanggroe Aceh Darussalam' },
      { kd_klpd: 'D002', nama_klpd: 'Provinsi Sumatera Utara' },
      { kd_klpd: 'D003', nama_klpd: 'Provinsi Sumatera Barat' },
      { kd_klpd: 'D004', nama_klpd: 'Provinsi Riau' },
      { kd_klpd: 'D005', nama_klpd: 'Provinsi Jambi' },
      { kd_klpd: 'D006', nama_klpd: 'Provinsi Sumatera Selatan' },
      { kd_klpd: 'D007', nama_klpd: 'Provinsi Bengkulu' },
      { kd_klpd: 'D008', nama_klpd: 'Provinsi Lampung' },
      { kd_klpd: 'D009', nama_klpd: 'Provinsi Kepulauan Bangka Belitung' },
      { kd_klpd: 'D010', nama_klpd: 'Provinsi Kepulauan Riau' },
      { kd_klpd: 'D031', nama_klpd: 'Provinsi DKI Jakarta' },
      { kd_klpd: 'D032', nama_klpd: 'Provinsi Jawa Barat' },
      { kd_klpd: 'D033', nama_klpd: 'Provinsi Jawa Tengah' },
      { kd_klpd: 'D034', nama_klpd: 'Provinsi DI Yogyakarta' },
      { kd_klpd: 'D035', nama_klpd: 'Provinsi Jawa Timur' },
      { kd_klpd: 'D036', nama_klpd: 'Provinsi Banten' },
      { kd_klpd: 'D051', nama_klpd: 'Provinsi Bali' },
      { kd_klpd: 'D052', nama_klpd: 'Provinsi Nusa Tenggara Barat' },
      { kd_klpd: 'D053', nama_klpd: 'Provinsi Nusa Tenggara Timur' },
      { kd_klpd: 'D061', nama_klpd: 'Provinsi Kalimantan Barat' },
      { kd_klpd: 'D062', nama_klpd: 'Provinsi Kalimantan Tengah' },
      { kd_klpd: 'D063', nama_klpd: 'Provinsi Kalimantan Selatan' },
      { kd_klpd: 'D064', nama_klpd: 'Provinsi Kalimantan Timur' },
      { kd_klpd: 'D065', nama_klpd: 'Provinsi Kalimantan Utara' },
      { kd_klpd: 'D071', nama_klpd: 'Provinsi Sulawesi Utara' },
      { kd_klpd: 'D072', nama_klpd: 'Provinsi Sulawesi Tengah' },
      { kd_klpd: 'D073', nama_klpd: 'Provinsi Sulawesi Selatan' },
      { kd_klpd: 'D074', nama_klpd: 'Provinsi Sulawesi Tenggara' },
      { kd_klpd: 'D075', nama_klpd: 'Provinsi Gorontalo' },
      { kd_klpd: 'D076', nama_klpd: 'Provinsi Sulawesi Barat' },
      { kd_klpd: 'D081', nama_klpd: 'Provinsi Maluku' },
      { kd_klpd: 'D082', nama_klpd: 'Provinsi Maluku Utara' },
      { kd_klpd: 'D091', nama_klpd: 'Provinsi Papua Barat' },
      { kd_klpd: 'D094', nama_klpd: 'Provinsi Papua' },
      { kd_klpd: 'D197', nama_klpd: 'Provinsi Kalimantan Barat' }
    ];

    res.json(klpdList);

  } catch (error) {
    console.error('Error saat mengambil daftar KLPD:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar KLPD'
    });
  }
});

// Endpoint untuk mendapatkan info kolom yang tersedia
app.get('/api/columns', async (req, res) => {
  try {
    if (isLoading) {
      return res.status(202).json({
        success: false,
        message: 'Data sedang dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat, silakan coba lagi dalam beberapa saat'
      });
    }

    if (rupData.length === 0) {
      return res.json({
        success: true,
        message: 'Tidak ada data untuk menampilkan kolom',
        data: []
      });
    }

    // Ambil kolom dari sample data
    const columns = Object.keys(rupData[0]).map(key => ({
      column_name: key,
      column_type: typeof rupData[0][key]
    }));

    res.json(columns);

  } catch (error) {
    console.error('Error saat mengambil info kolom:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil info kolom'
    });
  }
});

// Endpoint untuk mencari kd_satker yang tersedia
app.get('/api/search-satker/:partial', async (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({
        success: false,
        message: 'Data belum dimuat'
      });
    }

    const { partial } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // Cari kd_satker yang mengandung partial string
    const matchingSatkers = rupData
      .filter(item => item.kd_satker?.toString().includes(partial))
      .reduce((acc, item) => {
        const key = item.kd_satker;
        if (!acc[key]) {
          acc[key] = {
            kd_satker: item.kd_satker,
            nama_satker: item.nama_satker,
            nama_klpd: item.nama_klpd,
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {});

    const results = Object.values(matchingSatkers).slice(0, limit);

    res.json(results);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching satker: ' + error.message
    });
  }
});

// Endpoint debug untuk melihat raw data
app.get('/api/debug', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    res.json({
      success: true,
      message: 'Debug info',
      debug: {
        isDataLoaded,
        isLoading,
        totalRecords: rupData.length,
        dataUrl: JSON_DATA_URL,
        sampleData: rupData.slice(0, limit),
        dataKeys: rupData.length > 0 ? Object.keys(rupData[0]) : [],
        firstRecord: rupData.length > 0 ? rupData[0] : null,
        cacheStats: dataCache.getStats()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in debug endpoint: ' + error.message
    });
  }
});

// Endpoint untuk mengganti KLPD dan tahun
app.post('/api/config', async (req, res) => {
  try {
    const { klpd, tahun } = req.body;
    
    if (!klpd && !tahun) {
      return res.status(400).json({
        success: false,
        message: 'Parameter klpd atau tahun diperlukan'
      });
    }
    
    const newKlpd = klpd || currentKlpd;
    const newTahun = tahun || currentTahun;
    
    console.log(`🔄 Mengganti konfigurasi: KLPD=${newKlpd}, Tahun=${newTahun}`);
    
    // Reset data loading status
    isDataLoaded = false;
    rupData = [];
    
    // Fetch data dengan parameter baru
    await fetchJSONData(newKlpd, newTahun);
    
    res.json({
      success: true,
      message: `Konfigurasi berhasil diubah ke KLPD: ${newKlpd}, Tahun: ${newTahun}`,
      klpd: newKlpd,
      tahun: newTahun,
      total_records: rupData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error saat mengganti konfigurasi:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengganti konfigurasi: ' + error.message
    });
  }
});

// Endpoint untuk mendapatkan konfigurasi saat ini
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    message: 'Konfigurasi saat ini',
    klpd: currentKlpd,
    tahun: currentTahun,
    url: JSON_DATA_URL,
    data_loaded: isDataLoaded,
    total_records: rupData.length
  });
});

// Endpoint untuk refresh data (manual reload)
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual refresh data diminta');
    
    // Clear cache untuk parameter saat ini
    const cacheKey = `rupData_${currentKlpd}_${currentTahun}`;
    dataCache.del(cacheKey);
    isDataLoaded = false;
    
    // Fetch data baru dengan parameter saat ini
    await fetchJSONData(currentKlpd, currentTahun);
    
    res.json({
      success: true,
      message: 'Data berhasil di-refresh',
      total_records: rupData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error saat refresh data:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal refresh data: ' + error.message
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

// Fungsi untuk inisialisasi data dengan retry
async function initializeData(retries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Mencoba inisialisasi data (percobaan ${attempt}/${retries})`);
      await fetchJSONData();
      console.log('🚀 Data JSON berhasil diinisialisasi');
      return true;
    } catch (error) {
      console.error(`❌ Gagal inisialisasi percobaan ${attempt}:`, error.message);
      
      if (attempt < retries) {
        console.log(`⏳ Menunggu ${delay/1000} detik sebelum percobaan berikutnya...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Semua percobaan inisialisasi gagal');
        console.log('⚠️ Server tetap berjalan, data akan dicoba dimuat ulang saat ada request');
        return false;
      }
    }
  }
}

// Inisialisasi data saat aplikasi dimulai
initializeData();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🌟 Server Express.js berjalan di http://localhost:${port}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /api/test-connection?klpd=&tahun= - Test koneksi ke data source`);
  console.log(`   GET /api/debug - Debug info & sample data`);
  console.log(`   GET /api/config - Lihat konfigurasi KLPD & tahun saat ini`);
  console.log(`   POST /api/config - Ganti KLPD & tahun`);
  console.log(`   GET /api/klpd/list - Daftar KLPD yang tersedia`);
  console.log(`   GET /api/search-satker/:partial - Cari kd_satker yang tersedia`);
  console.log(`   GET /api/rup/:kd_satker?klpd=&tahun= - Data satker dengan parameter opsional`);
  console.log(`   GET /api/rup?klpd=&tahun=&search= - Semua data dengan parameter opsional`);
  console.log(`   GET /api/:klpd/:tahun/rup/:kd_satker - Data satker untuk KLPD/tahun spesifik`);
  console.log(`   GET /api/:klpd/:tahun/rup?search= - Semua data untuk KLPD/tahun spesifik`);
  console.log(`   GET /api/satker/list - Daftar satker`);
  console.log(`   GET /api/stats - Statistik data`);
  console.log(`   GET /api/columns - Info kolom`);
  console.log(`   POST /api/refresh - Refresh data manual`);
  console.log(`📊 Data URL: ${JSON_DATA_URL}`);
  console.log(`🏢 KLPD: ${currentKlpd}, 📅 Tahun: ${currentTahun}`);
  console.log(`🔧 Untuk debugging: curl http://localhost:${port}/api/test-connection`);
});

export default app;