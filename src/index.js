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

// Daftar KLPD yang valid - Khusus Provinsi Kalimantan Barat dan Kabupaten/Kota di Kalimantan Barat
const VALID_KLPD = [
  'D197', // Provinsi Kalimantan Barat
  'D198', // Kabupaten Sekadau
  'D199', // Kota Pontianak
  'D200', // Kota Singkawang
  'D201', // Kabupaten Ketapang
  'D202', // Kabupaten Kubu Raya
  'D204', // Kabupaten Sanggau
  'D205', // Kabupaten Landak
  'D206', // Kabupaten Bengkayang
  'D209', // Kabupaten Kapuas Hulu
  'D210', // Kabupaten Melawi
  'D211', // Kabupaten Sintang
  'D552'  // Kabupaten Mempawah
];

// Fungsi untuk validasi dan normalisasi KLPD
function validateAndNormalizeKlpd(klpd) {
  if (!klpd) {
    return { valid: false, normalized: null, error: 'KLPD tidak boleh kosong' };
  }
  
  // Normalisasi: uppercase dan trim
  const normalizedKlpd = klpd.toString().toUpperCase().trim();
  
  // Cek apakah KLPD valid
  if (!VALID_KLPD.includes(normalizedKlpd)) {
    return { 
      valid: false, 
      normalized: normalizedKlpd, 
      error: `KLPD '${normalizedKlpd}' tidak valid. KLPD yang tersedia: ${VALID_KLPD.slice(0, 10).join(', ')}...` 
    };
  }
  
  return { valid: true, normalized: normalizedKlpd, error: null };
}

// Fungsi untuk validasi tahun
function validateTahun(tahun) {
  if (!tahun) {
    return { valid: false, normalized: null, error: 'Tahun tidak boleh kosong' };
  }
  
  const normalizedTahun = tahun.toString().trim();
  const tahunNum = parseInt(normalizedTahun);
  
  // Validasi tahun harus 4 digit dan dalam rentang yang masuk akal
  if (isNaN(tahunNum) || tahunNum < 2020 || tahunNum > 2030) {
    return { 
      valid: false, 
      normalized: normalizedTahun, 
      error: `Tahun '${normalizedTahun}' tidak valid. Tahun harus antara 2020-2030` 
    };
  }
  
  return { valid: true, normalized: normalizedTahun, error: null };
}

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
  try {
    // Validasi dan normalisasi parameter
    const klpdValidation = validateAndNormalizeKlpd(klpd);
    const tahunValidation = validateTahun(tahun);
    
    if (!klpdValidation.valid) {
      throw new Error(`Validasi KLPD gagal: ${klpdValidation.error}`);
    }
    
    if (!tahunValidation.valid) {
      throw new Error(`Validasi Tahun gagal: ${tahunValidation.error}`);
    }
    
    // Gunakan parameter yang sudah dinormalisasi
    const normalizedKlpd = klpdValidation.normalized;
    const normalizedTahun = tahunValidation.normalized;
    
    // Define cacheKey dengan parameter yang sudah dinormalisasi
    const cacheKey = `rupData_${normalizedKlpd}_${normalizedTahun}`;
    
    // Update parameter saat ini dengan nilai yang sudah dinormalisasi
    currentKlpd = normalizedKlpd;
    currentTahun = normalizedTahun;
    
    // Build URL berdasarkan parameter yang sudah dinormalisasi
    JSON_DATA_URL = buildDataURL(normalizedKlpd, normalizedTahun);
    
    console.log('🔄 Mengambil data JSON dari:', JSON_DATA_URL);
    console.log('📊 Parameter: KLPD =', normalizedKlpd, ', Tahun =', normalizedTahun);
    if (klpd !== normalizedKlpd || tahun !== normalizedTahun) {
      console.log('🔄 Parameter dinormalisasi dari:', klpd, tahun, '→', normalizedKlpd, normalizedTahun);
    }
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
      let errorMessage;
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = `Data tidak tersedia untuk KLPD '${normalizedKlpd}' tahun '${normalizedTahun}'. ` +
            `Kemungkinan penyebab:\n` +
            `• Data belum dipublish untuk kombinasi KLPD/tahun ini\n` +
            `• KLPD tidak memiliki data RUP untuk tahun tersebut\n` +
            `• URL: ${JSON_DATA_URL}\n` +
            `Coba gunakan KLPD/tahun yang berbeda atau hubungi administrator data.`;
        } else {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText || 'Unknown error'}`;
        }
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Domain tidak ditemukan. Periksa koneksi internet atau URL';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Koneksi ditolak. Server mungkin tidak tersedia';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout. Server tidak merespons dalam waktu yang ditentukan';
      } else {
        errorMessage = error.message || 'Unknown error';
      }
      
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

// Endpoint untuk validasi KLPD dan tahun
app.get('/api/validate', (req, res) => {
  try {
    const { klpd, tahun } = req.query;
    
    if (!klpd && !tahun) {
      return res.status(400).json({
        success: false,
        message: 'Parameter klpd atau tahun diperlukan',
        valid_klpd: VALID_KLPD
      });
    }
    
    const results = {};
    
    if (klpd) {
      const klpdValidation = validateAndNormalizeKlpd(klpd);
      results.klpd = {
        input: klpd,
        valid: klpdValidation.valid,
        normalized: klpdValidation.normalized,
        error: klpdValidation.error
      };
    }
    
    if (tahun) {
      const tahunValidation = validateTahun(tahun);
      results.tahun = {
        input: tahun,
        valid: tahunValidation.valid,
        normalized: tahunValidation.normalized,
        error: tahunValidation.error
      };
    }
    
    const allValid = Object.values(results).every(r => r.valid);
    
    res.json({
      success: allValid,
      message: allValid ? 'Semua parameter valid' : 'Ada parameter yang tidak valid',
      results,
      valid_klpd: VALID_KLPD.slice(0, 10).concat(['...']),
      total_valid_klpd: VALID_KLPD.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validasi: ' + error.message
    });
  }
});

// Test koneksi endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const { klpd, tahun } = req.query;
    const testKlpd = klpd || currentKlpd;
    const testTahun = tahun || currentTahun;
    
    // Validasi parameter sebelum test koneksi
    const klpdValidation = validateAndNormalizeKlpd(testKlpd);
    const tahunValidation = validateTahun(testTahun);
    
    if (!klpdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Parameter KLPD tidak valid',
        error: klpdValidation.error,
        input_klpd: testKlpd,
        valid_klpd: VALID_KLPD.slice(0, 10).concat(['...'])
      });
    }
    
    if (!tahunValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Parameter tahun tidak valid',
        error: tahunValidation.error,
        input_tahun: testTahun
      });
    }
    
    const normalizedKlpd = klpdValidation.normalized;
    const normalizedTahun = tahunValidation.normalized;
    const testURL = buildDataURL(normalizedKlpd, normalizedTahun);
    
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
      klpd: {
        input: testKlpd,
        normalized: normalizedKlpd,
        changed: testKlpd !== normalizedKlpd
      },
      tahun: {
        input: testTahun,
        normalized: normalizedTahun,
        changed: testTahun !== normalizedTahun
      },
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
    // Daftar KLPD hanya untuk Provinsi Kalimantan Barat dan seluruh kabupaten/kota di Kalimantan Barat
    const klpdList = [
      { kd_klpd: 'D197', nama_klpd: 'Provinsi Kalimantan Barat' },
      { kd_klpd: 'D206', nama_klpd: 'Kabupaten Bengkayang' },
      { kd_klpd: 'D205', nama_klpd: 'Kabupaten Landak' },
      { kd_klpd: 'D552', nama_klpd: 'Kabupaten Mempawah' },
      { kd_klpd: 'D204', nama_klpd: 'Kabupaten Sanggau' },
      { kd_klpd: 'D201', nama_klpd: 'Kabupaten Ketapang' },
      { kd_klpd: 'D211', nama_klpd: 'Kabupaten Sintang' },
      { kd_klpd: 'D209', nama_klpd: 'Kabupaten Kapuas Hulu' },
      { kd_klpd: 'D198', nama_klpd: 'Kabupaten Sekadau' },
      { kd_klpd: 'D210', nama_klpd: 'Kabupaten Melawi' },
      { kd_klpd: 'D202', nama_klpd: 'Kabupaten Kubu Raya' },
      { kd_klpd: 'D199', nama_klpd: 'Kota Pontianak' },
      { kd_klpd: 'D200', nama_klpd: 'Kota Singkawang' }
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
  console.log(`   GET /api/validate?klpd=&tahun= - Validasi parameter KLPD dan tahun`);
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