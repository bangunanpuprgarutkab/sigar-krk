/**
 * Perda References Database for AI Analysis
 * Contains regulatory references for accurate AI analysis
 */

export const PERDA_REFERENCES = {
    // Perda Kabupaten Garut No. 6 Tahun 2019 tentang RTRW Kabupaten Garut 2019-2039
    GARUT_RTRW_2019: {
        id: 'garut_rtrw_2019',
        title: 'Peraturan Daerah Kabupaten Garut Nomor 6 Tahun 2019',
        subtitle: 'tentang Rencana Tata Ruang Wilayah Kabupaten Garut Tahun 2019-2039',
        url: 'https://peraturan.bpk.go.id/Download/127645/perda%20nomor%206%20tahun%202019.pdf',
        year: 2019,
        period: '2019-2039',
        region: 'Kabupaten Garut',
        province: 'Jawa Barat',
        
        // Key provisions for AI analysis
        key_provisions: {
            // Zonasi dan Peruntukan
            zonasi: {
                perumahan: {
                    kode: ['R-1', 'R-2', 'R-3'],
                    deskripsi: 'Zona perumahan dengan kepadatan rendah, sedang, dan tinggi',
                    ketentuan: {
                        kdb: { 'R-1': 40, 'R-2': 60, 'R-3': 70 },
                        klb: { 'R-1': 0.8, 'R-2': 1.2, 'R-3': 2.1 },
                        kdh: { 'R-1': 40, 'R-2': 30, 'R-3': 20 },
                        gsb: { 'R-1': 5, 'R-2': 3, 'R-3': 3 }
                    }
                },
                perdagangan: {
                    kode: ['K-1', 'K-2', 'K-3'],
                    deskripsi: 'Zona perdagangan dan jasa skala lingkungan, kota, dan regional',
                    ketentuan: {
                        kdb: { 'K-1': 60, 'K-2': 70, 'K-3': 80 },
                        klb: { 'K-1': 1.8, 'K-2': 2.8, 'K-3': 4.0 },
                        kdh: { 'K-1': 30, 'K-2': 20, 'K-3': 15 },
                        gsb: { 'K-1': 3, 'K-2': 5, 'K-3': 6 }
                    }
                },
                industri: {
                    kode: ['I-1', 'I-2', 'I-3'],
                    deskripsi: 'Zona industri rumah tangga, kecil dan menengah, serta besar',
                    ketentuan: {
                        kdb: { 'I-1': 40, 'I-2': 60, 'I-3': 70 },
                        klb: { 'I-1': 0.8, 'I-2': 1.8, 'I-3': 2.8 },
                        kdh: { 'I-1': 40, 'I-2': 30, 'I-3': 20 },
                        gsb: { 'I-1': 5, 'I-2': 10, 'I-3': 15 }
                    }
                },
                perkantoran: {
                    kode: ['KT-1', 'KT-2'],
                    deskripsi: 'Zona perkantoran pemerintah dan swasta',
                    ketentuan: {
                        kdb: { 'KT-1': 50, 'KT-2': 60 },
                        klb: { 'KT-1': 1.5, 'KT-2': 2.4 },
                        kdh: { 'KT-1': 35, 'KT-2': 25 },
                        gsb: { 'KT-1': 5, 'KT-2': 6 }
                    }
                },
                fasilitas_umum: {
                    kode: ['PU-1', 'PU-2', 'PU-3'],
                    deskripsi: 'Zona fasilitas umum pendidikan, kesehatan, dan peribadatan',
                    ketentuan: {
                        kdb: { 'PU-1': 40, 'PU-2': 50, 'PU-3': 30 },
                        klb: { 'PU-1': 1.2, 'PU-2': 2.0, 'PU-3': 0.9 },
                        kdh: { 'PU-1': 40, 'PU-2': 30, 'PU-3': 50 },
                        gsb: { 'PU-1': 5, 'PU-2': 6, 'PU-3': 10 }
                    }
                },
                rth: {
                    kode: ['RTH-1', 'RTH-2', 'RTH-3'],
                    deskripsi: 'Ruang Terbuka Hijau kota, taman, dan hutan kota',
                    ketentuan: {
                        kdb: { 'RTH-1': 5, 'RTH-2': 10, 'RTH-3': 2 },
                        klb: { 'RTH-1': 0.1, 'RTH-2': 0.2, 'RTH-3': 0.05 },
                        kdh: { 'RTH-1': 90, 'RTH-2': 80, 'RTH-3': 95 },
                        gsb: { 'RTH-1': 3, 'RTH-2': 5, 'RTH-3': 10 }
                    }
                }
            },
            
            // Ketentuan Umum Peraturan Zonasi
            ketentuan_umum: {
                tinggi_bangunan: {
                    perumahan: { min: 1, max: 4, satuan: 'lantai' },
                    perdagangan: { min: 1, max: 8, satuan: 'lantai' },
                    perkantoran: { min: 2, max: 12, satuan: 'lantai' },
                    industri: { min: 1, max: 3, satuan: 'lantai' },
                    fasilitas_umum: { min: 1, max: 6, satuan: 'lantai' }
                },
                
                parkir: {
                    perumahan: '1 unit per 100 m² luas lantai',
                    perdagangan: '1 unit per 50 m² luas lantai',
                    perkantoran: '1 unit per 75 m² luas lantai',
                    industri: '1 unit per 200 m² luas lantai'
                },
                
                sempadan: {
                    sungai: '15 meter dari tepi sungai',
                    jalan_arteri: '15 meter dari as jalan',
                    jalan_kolektor: '10 meter dari as jalan',
                    jalan_lokal: '7 meter dari as jalan',
                    rel_kereta: '20 meter dari as rel'
                }
            },
            
            // Kawasan Strategis
            kawasan_strategis: {
                pariwisata: [
                    'Kawasan Wisata Cipanas',
                    'Kawasan Wisata Kamojang',
                    'Kawasan Wisata Gunung Papandayan',
                    'Kawasan Wisata Situ Bagendit',
                    'Kawasan Wisata Curug Orok'
                ],
                
                ekonomi: [
                    'Kawasan Industri Sukaregang',
                    'Kawasan Agribisnis Leles',
                    'Kawasan Perdagangan Tarogong Kidul',
                    'Terminal Guntur'
                ],
                
                lingkungan: [
                    'Kawasan Hutan Lindung Gunung Cikuray',
                    'Kawasan Resapan Air Cipanas',
                    'Kawasan Perlindungan Setempat'
                ]
            }
        },
        
        // Extracted text for AI context (key sections)
        extracted_text: `
PERATURAN DAERAH KABUPATEN GARUT NOMOR 6 TAHUN 2019
TENTANG RENCANA TATA RUANG WILAYAH KABUPATEN GARUT TAHUN 2019-2039

BAB I KETENTUAN UMUM

Pasal 1
Dalam Peraturan Daerah ini yang dimaksud dengan:
1. Daerah adalah Kabupaten Garut
2. Rencana Tata Ruang Wilayah yang selanjutnya disingkat RTRW adalah hasil perencanaan tata ruang wilayah kabupaten
3. Wilayah adalah ruang yang merupakan kesatuan geografis beserta segenap unsur terkait yang batas dan sistemnya ditentukan berdasarkan aspek administratif dan/atau aspek fungsional

BAB III TUJUAN, KEBIJAKAN, DAN STRATEGI PENATAAN RUANG WILAYAH

Pasal 3
Tujuan penataan ruang wilayah kabupaten adalah mewujudkan ruang wilayah kabupaten yang aman, nyaman, produktif, dan berkelanjutan

Pasal 4
Kebijakan penataan ruang wilayah kabupaten meliputi:
a. pemantapan fungsi kawasan lindung untuk menjaga kelestarian lingkungan hidup
b. pengembangan kawasan budidaya secara serasi dengan daya dukung dan daya tampung lingkungan
c. pengembangan sistem pusat pelayanan yang berhierarki
d. pengembangan sistem prasarana wilayah yang terpadu

BAB IV RENCANA STRUKTUR RUANG WILAYAH

Pasal 6
Rencana struktur ruang wilayah kabupaten terdiri atas:
a. sistem pusat pelayanan; dan
b. sistem jaringan prasarana wilayah

BAB V RENCANA POLA RUANG WILAYAH

Pasal 12
Rencana pola ruang wilayah kabupaten terdiri atas:
a. kawasan lindung; dan
b. kawasan budidaya

Pasal 13
Kawasan lindung sebagaimana dimaksud dalam Pasal 12 huruf a terdiri atas:
a. hutan lindung
b. kawasan yang memberikan perlindungan terhadap kawasan bawahannya
c. kawasan perlindungan setempat
d. kawasan suaka alam, pelestarian alam dan cagar budaya
e. kawasan rawan bencana alam
f. kawasan lindung geologi
g. kawasan lindung lainnya

Pasal 20
Kawasan budidaya sebagaimana dimaksud dalam Pasal 12 huruf b terdiri atas:
a. kawasan peruntukan hutan produksi
b. kawasan peruntukan hutan rakyat
c. kawasan peruntukan pertanian
d. kawasan peruntukan perikanan
e. kawasan peruntukan pertambangan
f. kawasan peruntukan industri
g. kawasan peruntukan pariwisata
h. kawasan peruntukan permukiman
i. kawasan peruntukan perdagangan dan jasa
j. kawasan peruntukan perkantoran pemerintahan
k. kawasan peruntukan pendidikan
l. kawasan peruntukan kesehatan
m. kawasan peruntukan peribadatan
n. kawasan peruntukan olahraga dan rekreasi
o. kawasan peruntukan pertahanan dan keamanan
p. kawasan peruntukan lainnya

BAB VI PENETAPAN KAWASAN STRATEGIS

Pasal 35
Kawasan strategis kabupaten terdiri atas:
a. kawasan strategis dari sudut kepentingan pertumbuhan ekonomi
b. kawasan strategis dari sudut kepentingan sosial dan budaya
c. kawasan strategis dari sudut kepentingan pendayagunaan sumber daya alam dan/atau teknologi tinggi
d. kawasan strategis dari sudut kepentingan fungsi dan daya dukung lingkungan hidup

BAB VII ARAHAN PEMANFAATAN RUANG WILAYAH

Pasal 40
Arahan pemanfaatan ruang wilayah kabupaten digunakan sebagai dasar penyusunan program pemanfaatan ruang beserta perkiraan pendanaannya dalam jangka waktu 20 (dua puluh) tahun

BAB VIII KETENTUAN PENGENDALIAN PEMANFAATAN RUANG

Pasal 43
Ketentuan pengendalian pemanfaatan ruang wilayah kabupaten terdiri atas:
a. ketentuan umum peraturan zonasi
b. ketentuan perizinan
c. ketentuan insentif dan disinsentif
d. arahan sanksi

Pasal 44
Ketentuan umum peraturan zonasi sebagaimana dimaksud dalam Pasal 43 huruf a merupakan ketentuan yang mengatur tentang persyaratan pemanfaatan ruang dan ketentuan pengendaliannya yang disusun untuk setiap blok/zona peruntukan

KETENTUAN TEKNIS ZONASI:

Zona Perumahan (R):
- R-1 (Kepadatan Rendah): KDB 40%, KLB 0,8, KDH 40%, GSB 5m
- R-2 (Kepadatan Sedang): KDB 60%, KLB 1,2, KDH 30%, GSB 3m  
- R-3 (Kepadatan Tinggi): KDB 70%, KLB 2,1, KDH 20%, GSB 3m

Zona Perdagangan dan Jasa (K):
- K-1 (Skala Lingkungan): KDB 60%, KLB 1,8, KDH 30%, GSB 3m
- K-2 (Skala Kota): KDB 70%, KLB 2,8, KDH 20%, GSB 5m
- K-3 (Skala Regional): KDB 80%, KLB 4,0, KDH 15%, GSB 6m

Zona Industri (I):
- I-1 (Industri Rumah Tangga): KDB 40%, KLB 0,8, KDH 40%, GSB 5m
- I-2 (Industri Kecil-Menengah): KDB 60%, KLB 1,8, KDH 30%, GSB 10m
- I-3 (Industri Besar): KDB 70%, KLB 2,8, KDH 20%, GSB 15m

Zona Perkantoran (KT):
- KT-1 (Pemerintahan): KDB 50%, KLB 1,5, KDH 35%, GSB 5m
- KT-2 (Swasta): KDB 60%, KLB 2,4, KDH 25%, GSB 6m

Zona Fasilitas Umum (PU):
- PU-1 (Pendidikan): KDB 40%, KLB 1,2, KDH 40%, GSB 5m
- PU-2 (Kesehatan): KDB 50%, KLB 2,0, KDH 30%, GSB 6m
- PU-3 (Peribadatan): KDB 30%, KLB 0,9, KDH 50%, GSB 10m

KETENTUAN SEMPADAN:
- Sempadan sungai: 15 meter dari tepi sungai
- Sempadan jalan arteri: 15 meter dari as jalan
- Sempadan jalan kolektor: 10 meter dari as jalan
- Sempadan jalan lokal: 7 meter dari as jalan
- Sempadan rel kereta api: 20 meter dari as rel

KETENTUAN TINGGI BANGUNAN:
- Perumahan: maksimal 4 lantai
- Perdagangan: maksimal 8 lantai
- Perkantoran: maksimal 12 lantai
- Industri: maksimal 3 lantai
- Fasilitas umum: maksimal 6 lantai

KETENTUAN PARKIR:
- Perumahan: 1 unit per 100 m² luas lantai
- Perdagangan: 1 unit per 50 m² luas lantai
- Perkantoran: 1 unit per 75 m² luas lantai
- Industri: 1 unit per 200 m² luas lantai
        `,
        
        // Metadata
        metadata: {
            source: 'BPK RI - Peraturan.bpk.go.id',
            download_url: 'https://peraturan.bpk.go.id/Download/127645/perda%20nomor%206%20tahun%202019.pdf',
            file_size: 'Unknown',
            pages: 'Unknown',
            language: 'Indonesian',
            format: 'PDF',
            last_updated: '2019',
            validity_period: '2019-2039',
            status: 'Active'
        }
    }
};

// Helper functions for AI integration
export class PerdaReferenceManager {
    constructor() {
        this.references = PERDA_REFERENCES;
        this.activeReference = 'GARUT_RTRW_2019'; // Default reference
    }

    // Get reference data for AI context
    getReferenceForAI(region = 'Kabupaten Garut') {
        const reference = this.references[this.activeReference];
        if (!reference) return null;

        return {
            title: reference.title,
            subtitle: reference.subtitle,
            region: reference.region,
            year: reference.year,
            period: reference.period,
            full_text: reference.extracted_text,
            zonasi_data: reference.key_provisions.zonasi,
            ketentuan_umum: reference.key_provisions.ketentuan_umum,
            kawasan_strategis: reference.key_provisions.kawasan_strategis
        };
    }

    // Get specific zonasi information
    getZonasiInfo(zona_code) {
        const reference = this.references[this.activeReference];
        if (!reference) return null;

        const zonasi = reference.key_provisions.zonasi;
        
        // Search through all zonasi types
        for (const [type, data] of Object.entries(zonasi)) {
            if (data.kode && data.kode.includes(zona_code)) {
                return {
                    type: type,
                    kode: zona_code,
                    deskripsi: data.deskripsi,
                    ketentuan: data.ketentuan[zona_code] || data.ketentuan,
                    reference: reference.title
                };
            }
        }
        
        return null;
    }

    // Get ketentuan teknis for specific peruntukan
    getKetentuanTeknis(peruntukan) {
        const reference = this.references[this.activeReference];
        if (!reference) return null;

        const zonasi = reference.key_provisions.zonasi;
        const ketentuan_umum = reference.key_provisions.ketentuan_umum;

        // Map peruntukan to zonasi type
        const mapping = {
            'perumahan': 'perumahan',
            'perdagangan': 'perdagangan', 
            'jasa': 'perdagangan',
            'industri': 'industri',
            'perkantoran': 'perkantoran',
            'kantor': 'perkantoran',
            'pendidikan': 'fasilitas_umum',
            'kesehatan': 'fasilitas_umum',
            'peribadatan': 'fasilitas_umum',
            'fasilitas umum': 'fasilitas_umum'
        };

        const zonaType = mapping[peruntukan.toLowerCase()];
        if (!zonaType || !zonasi[zonaType]) return null;

        return {
            zonasi: zonasi[zonaType],
            tinggi_bangunan: ketentuan_umum.tinggi_bangunan[zonaType] || ketentuan_umum.tinggi_bangunan.perumahan,
            parkir: ketentuan_umum.parkir[zonaType] || ketentuan_umum.parkir.perumahan,
            sempadan: ketentuan_umum.sempadan,
            reference: reference.title
        };
    }

    // Check if location is in kawasan strategis
    checkKawasanStrategis(lokasi) {
        const reference = this.references[this.activeReference];
        if (!reference) return null;

        const kawasan = reference.key_provisions.kawasan_strategis;
        const results = [];

        for (const [kategori, daftar] of Object.entries(kawasan)) {
            for (const nama_kawasan of daftar) {
                if (lokasi.toLowerCase().includes(nama_kawasan.toLowerCase()) ||
                    nama_kawasan.toLowerCase().includes(lokasi.toLowerCase())) {
                    results.push({
                        kategori: kategori,
                        nama: nama_kawasan,
                        status: 'Termasuk Kawasan Strategis'
                    });
                }
            }
        }

        return results.length > 0 ? results : null;
    }

    // Get comprehensive analysis context for AI
    getAnalysisContext(projectData) {
        const reference = this.getReferenceForAI();
        if (!reference) return '';

        let context = `REFERENSI REGULASI:\n${reference.title}\n${reference.subtitle}\n\n`;
        
        // Add relevant zonasi information
        if (projectData.lokasi_proyek?.peruntukan) {
            const ketentuan = this.getKetentuanTeknis(projectData.lokasi_proyek.peruntukan);
            if (ketentuan) {
                context += `KETENTUAN TEKNIS UNTUK ${projectData.lokasi_proyek.peruntukan.toUpperCase()}:\n`;
                context += JSON.stringify(ketentuan, null, 2) + '\n\n';
            }
        }

        // Add kawasan strategis check
        if (projectData.lokasi_proyek?.alamat_lengkap) {
            const kawasan = this.checkKawasanStrategis(projectData.lokasi_proyek.alamat_lengkap);
            if (kawasan) {
                context += `KAWASAN STRATEGIS:\n`;
                kawasan.forEach(k => {
                    context += `- ${k.nama} (${k.kategori}): ${k.status}\n`;
                });
                context += '\n';
            }
        }

        // Add full regulation text
        context += `PERATURAN LENGKAP:\n${reference.full_text}`;

        return context;
    }

    // Update reference (for future multiple perda support)
    setActiveReference(referenceId) {
        if (this.references[referenceId]) {
            this.activeReference = referenceId;
            return true;
        }
        return false;
    }

    // Get all available references
    getAvailableReferences() {
        return Object.keys(this.references).map(key => ({
            id: key,
            title: this.references[key].title,
            region: this.references[key].region,
            year: this.references[key].year,
            status: this.references[key].metadata.status
        }));
    }
}

// Create singleton instance
export const perdaReferenceManager = new PerdaReferenceManager();
