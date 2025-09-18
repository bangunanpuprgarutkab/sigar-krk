/**
 * Configuration and Constants for KRK Generator Application
 * Kabupaten Garut - Dinas PUPR
 */

// Application Configuration
export const CONFIG = {
    // Storage Keys
    PROJECTS_KEY: 'krk_projects_garut_v3',
    SETTINGS_KEY: 'krk_settings_garut_v3',
    TEMPLATE_KEY: 'custom_docx_template',
    
    // IndexedDB Configuration
    DB_NAME: 'KRK_FilesDB',
    DB_VERSION: 1,
    FILE_STORE_NAME: 'files',
    
    // API Configuration
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
    DEFAULT_MODEL: 'gemini-1.5-flash-latest',
    
    // Performance Settings
    VIRTUAL_SCROLL_ITEM_HEIGHT: 80,
    VIRTUAL_SCROLL_BUFFER: 5,
    CACHE_MAX_SIZE: 100,
    CACHE_TTL: 1000 * 60 * 30, // 30 minutes
    
    // File Upload Settings
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_MAP_FORMATS: ['.json', '.geojson', '.kml', '.shp', '.pdf', '.png', '.jpg', '.jpeg'],
    SUPPORTED_DOC_FORMATS: ['.pdf', '.txt', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'],
    
    // Map Configuration
    DEFAULT_MAP_CENTER: [-7.2175, 107.9031], // Garut coordinates
    DEFAULT_MAP_ZOOM: 13,
    MAP_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    MAP_ATTRIBUTION: '© OpenStreetMap contributors',
    
    // UI Configuration
    TOAST_DURATION: 3000,
    SPINNER_DELAY: 500,
    DEBOUNCE_DELAY: 300,
    
    // Default Template Base64 (truncated for brevity)
    DEFAULT_TEMPLATE_BASE64: "UEsDBBQABgAIAAAAIQCSq9v6bAIAALMhAAATANoGW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC0lMtuwjAQRfeV+g/FN5EuijbQ2q1D2jZp06cPfI0xsmEkT2sM/++diA7bUFF2Yd6ZOe/MDJ792JzVKhSKSxU5aZ4Vkwp5p9n+vP0L8yY0VpNEEZ24jyG9U3kXo4wD9Qy+3wX8owhYI5yF4w733sVdDi49uAOBYxYpD2B9p108U101b0l3wUaApk0LBNZ2DFx/4kEE3T2X0rB1J/YkYqs3B/4p3b/g92z2f4mKkRjW/1n4o1w42B7M1cewM5oKLeV24gRx0GqY3M2Yy0tRE8CDJXDfU/I3yJ23k2llU6M4qN8KLiQ1Yv2s794S4z1W6wK2u1N2x8tA7+A7yvsyDM9y08PzP7g/l36n8gfh/M9v4y+V+0f8Y/oPiX/4/gFJiD5uA3+vff5BUEsDBBQABgAIAAAAIQAx35v3SAAAAJgBAAALANoGAl9yZWxzLy5yZWxzIKJAzUrEMBC78x6D72O9g4pEtD2L0L2P0A8Q7M2AFxvDYLf97QkJVKvYh33n5o3nM2e293wE1WdeYt2FspYgC3kMI3suv95Irs9l0C2Wc6GCA2QWU4EC29yGvjrs1xVj8oA9x4sC7sVBR3A9Y4eD1hsw15vo0xARwR3g3wFhShRn/ZSEJj1EaEldy5Yy+aX4xwe8hd9l+Jn/3n5o+g/+f8x1+ss1xH8mX0fxk8S/J96n/wPUEsDBBQABgAIAAAAIQCEw/zJvQIAAIMDAAAcANoGCXdvcmQvX3JlbHMvZG9jdW1lbnQueG1sLnJlbHMgdpNNT8MwEIDvSPyHyPtuG4gQNW3TCRInggkv6h2CZDdpx8S2rTz+Pcl2A+30/Pa9PXt7u7q9I4RGs6YIrsIpoVimjW9n5eL6Jj9JvDeMYGvWkYwYgP3l6/V4b1S08QijhAThI2yC/xWzKxGT2c+b3T2D6wHre4PkQyP2QexuNTHpYcNW+gJUeZ7D18oTwRFAwFse9XF2XCnprbPeSY+c2uY8ygFuOzvz5o6O19GwcVnGzMPcDnl4pXn9qFnhoFGW/D3usC82NvWLaIVbYl1342Y7/ZUDfL/wxt5bI/N5jR/uBf2j4g/f4wSNN/wLUEsDBBQABgAIAAAAIQC+4Wb69AYAAK0dAAAPAAAAcw93b3JkL2RvY3VtZW50LnhtbJxdW2/bNhB+n7T/wdD3AEkco7GdpC5FugYpsgxp2zQoMhSJli..."
};

// Application States
export const APP_STATES = {
    UPLOADER: 'uploader',
    POST_EXTRACTION: 'post_extraction',
    ANALYSIS: 'analysis',
    EDITOR: 'editor'
};

// Error Messages
export const ERROR_MESSAGES = {
    DB_ERROR: 'Tidak dapat membuka database. Beberapa fitur mungkin tidak berfungsi.',
    API_KEY_MISSING: 'Kunci API Gemini belum diatur. Harap atur di menu Pengaturan.',
    FILE_TOO_LARGE: 'Ukuran file terlalu besar. Maksimal 50MB.',
    UNSUPPORTED_FORMAT: 'Format file tidak didukung.',
    NETWORK_ERROR: 'Terjadi kesalahan jaringan. Periksa koneksi internet Anda.',
    PARSING_ERROR: 'Gagal memproses file. Pastikan format file benar.',
    SAVE_ERROR: 'Gagal menyimpan data. Coba lagi.',
    TEMPLATE_ERROR: 'Gagal memuat template dokumen.',
    UPLOAD_IN_PROGRESS: 'Upload sedang berlangsung. Tunggu hingga selesai.',
    NO_FILES_SELECTED: 'Tidak ada file yang dipilih.',
    ELEMENT_NOT_FOUND: 'Elemen UI tidak ditemukan. Periksa struktur HTML.',
    VALIDATION_FAILED: 'Validasi file gagal.',
    PROCESSING_FAILED: 'Gagal memproses file. Coba lagi.',
    STORAGE_ERROR: 'Gagal menyimpan file ke penyimpanan lokal.',
    MEMORY_ERROR: 'Memori tidak cukup untuk memproses file.',
    BROWSER_NOT_SUPPORTED: 'Browser tidak mendukung fitur yang diperlukan.',
    PERMISSION_DENIED: 'Izin akses file ditolak.',
    QUOTA_EXCEEDED: 'Kuota penyimpanan terlampaui.',
    TIMEOUT_ERROR: 'Waktu pemrosesan habis. Coba file yang lebih kecil.',
    CORRUPTED_FILE: 'File rusak atau tidak valid.',
    GEOJSON_INVALID: 'Format GeoJSON tidak valid.',
    IMAGE_LOAD_ERROR: 'Gagal memuat gambar.',
    MAP_RENDER_ERROR: 'Gagal merender peta.',
    AI_ANALYSIS_ERROR: 'Gagal melakukan analisis AI.',
    EXPORT_ERROR: 'Gagal mengekspor data.',
    IMPORT_ERROR: 'Gagal mengimpor data.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    PROJECT_SAVED: 'Proyek berhasil disimpan.',
    SETTINGS_SAVED: 'Pengaturan berhasil disimpan.',
    FILE_UPLOADED: 'File berhasil diunggah.',
    TEMPLATE_UPLOADED: 'Template berhasil diunggah.',
    EXPORT_SUCCESS: 'Data berhasil diekspor.',
    IMPORT_SUCCESS: 'Data berhasil diimpor.'
};

// Gemini Model Options
export const GEMINI_MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (Terbaru, Direkomendasikan)' },
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (Terbaru)' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
];

// Default Analysis Data Structure
export const getEmptyAnalysisData = () => ({
    surat_meta: {
        nomor_surat: "600.3.3.2/xxxx/PUPR",
        sifat: "Biasa",
        lampiran: "1 (Satu) Lembar",
        hal: "Keterangan Rencana Kota (KRK)",
        tanggal_surat: new Date().toISOString().split('T')[0],
        kota_surat: "Garut"
    },
    pemohon: {
        nama: "",
        jabatan: ""
    },
    surat_pemohon: {
        nomor: "",
        tanggal: ""
    },
    lokasi_proyek: {
        nama: "",
        lokasi: "",
        peruntukan: "",
        luas_total: 0
    },
    analisis_zona: [],
    ketentuan_teknis: [],
    catatan_tambahan: [],
    penandatangan: {
        jabatan: "KEPALA DINAS PUPR",
        nama: "Dr. AGUS ISMAIL, S.T., M.T.",
        pangkat: "Pembina Tingkat I, IV/b",
        nip: "19760808 200604 1 008"
    },
    mapScreenshot: null,
    is_revisi: false,
    revisi_nomor: "",
    revisi_tanggal: "",
    is_usaha: false
});

// Performance Monitoring
export const PERFORMANCE_METRICS = {
    RENDER_THRESHOLD: 16, // 60fps
    MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
    CACHE_HIT_RATIO_TARGET: 0.8
};

// Feature Flags
export const FEATURE_FLAGS = {
    VIRTUAL_SCROLLING: true,
    LAZY_LOADING: true,
    CACHING: true,
    PERFORMANCE_MONITORING: true,
    DARK_MODE: true,
    OFFLINE_MODE: false,
    DEBUG_MODE: true, // Enable detailed error logging and debugging info
    VERBOSE_LOGGING: true // Enable verbose console logging
};
