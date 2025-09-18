/**
 * AI Prompt Engineering System for KRK Generator
 * Advanced prompt templates with context awareness and accuracy optimization
 */

import { CONFIG } from '../config.js';
import { performanceMonitor } from '../utils/performance.js';
import { settingsStorage } from '../core/storage.js';
import { perdaReferenceManager } from '../data/perda-references.js';

export class AIPromptEngine {
    constructor() {
        this.promptTemplates = new Map();
        this.contextHistory = [];
        this.accuracyMetrics = new Map();
        
        this.initializePromptTemplates();
    }

    initializePromptTemplates() {
        // Document Extraction Prompts
        this.promptTemplates.set('document_extraction', {
            system: `Anda adalah AI ahli dalam mengekstrak data dari dokumen surat permohonan KRK (Keterangan Rencana Kota) di Indonesia.

EXPERTISE:
- Menguasai format surat dinas Indonesia
- Memahami terminologi perencanaan kota dan tata ruang
- Ahli dalam identifikasi data pemohon, lokasi, dan peruntukan
- Familiar dengan format tanggal Indonesia dan nomor surat dinas

EXTRACTION RULES:
1. Ekstrak HANYA data yang JELAS TERLIHAT dalam dokumen
2. Jika data tidak ada/tidak jelas, gunakan string kosong atau null
3. Validasi format tanggal (DD/MM/YYYY atau DD-MM-YYYY atau variasi Indonesia)
4. Identifikasi jabatan dengan benar (Direktur, Manager, Kepala, dll)
5. Perhatikan alamat lengkap dengan detail RT/RW, Kelurahan, Kecamatan
6. Luas lahan dalam satuan m² (meter persegi)

OUTPUT FORMAT: JSON ketat tanpa penjelasan tambahan`,

            user: (context) => `Analisis dokumen surat permohonan berikut dan ekstrak informasi dalam format JSON yang tepat:

DOKUMEN: [Terlampir dalam format ${context.mimeType}]

REQUIRED JSON OUTPUT:
{
    "pemohon": {
        "nama": "nama lengkap pemohon",
        "jabatan": "jabatan/posisi pemohon",
        "instansi": "nama perusahaan/instansi"
    },
    "surat_pemohon": {
        "nomor": "nomor surat lengkap",
        "tanggal": "YYYY-MM-DD",
        "perihal": "perihal/subjek surat"
    },
    "lokasi_proyek": {
        "alamat_lengkap": "alamat detail dengan RT/RW/Kelurahan/Kecamatan",
        "kecamatan": "nama kecamatan",
        "kabupaten": "nama kabupaten/kota",
        "provinsi": "nama provinsi",
        "peruntukan": "jenis peruntukan pembangunan",
        "luas_total": 0,
        "satuan_luas": "m²"
    },
    "confidence_score": 0.95
}

PENTING: Berikan HANYA JSON, tanpa markdown atau penjelasan lain.`
        });

        // Map Analysis Prompts
        this.promptTemplates.set('map_analysis', {
            system: `Anda adalah AI ahli perencanaan kota dan analisis spasial dengan spesialisasi:

EXPERTISE:
- Analisis data GeoJSON dan koordinat geografis
- Peraturan Daerah (Perda) RTRW Indonesia
- Zonasi dan peruntukan lahan sesuai regulasi
- Ketentuan teknis bangunan dan IMB
- Analisis kesesuaian lokasi dengan rencana tata ruang

ANALYSIS FRAMEWORK:
1. Identifikasi zona berdasarkan koordinat dan referensi RTRW
2. Evaluasi kesesuaian peruntukan dengan zonasi yang berlaku
3. Berikan ketentuan teknis yang relevan
4. Identifikasi potensi konflik atau masalah regulasi
5. Sertakan referensi pasal/ayat yang relevan jika tersedia

ACCURACY STANDARDS:
- Gunakan terminologi resmi perencanaan kota Indonesia
- Referensikan regulasi yang berlaku (UU, PP, Perda)
- Berikan rekomendasi yang actionable dan spesifik`,

            user: (context) => `Lakukan analisis mendalam terhadap data peta dan proyek berikut:

DATA PETA (GeoJSON):
${JSON.stringify(context.geoJsonData, null, 2)}

DATA PROYEK:
- Lokasi: ${context.projectData.lokasi_proyek?.alamat_lengkap || 'Tidak tersedia'}
- Peruntukan: ${context.projectData.lokasi_proyek?.peruntukan || 'Tidak tersedia'}
- Luas: ${context.projectData.lokasi_proyek?.luas_total || 0} ${context.projectData.lokasi_proyek?.satuan_luas || 'm²'}

REFERENSI PERDA RTRW KABUPATEN GARUT:
${context.perdaReference || perdaReferenceManager.getAnalysisContext(context.projectData)}

REQUIRED ANALYSIS OUTPUT (JSON):
{
    "analisis_zona": [
        {
            "zona_id": "kode zona (misal: R-1, K-2, dll)",
            "nama_zona": "nama zona rencana",
            "peruntukan_utama": "peruntukan utama yang diizinkan",
            "peruntukan_bersyarat": "peruntukan dengan syarat tertentu",
            "kesesuaian": "SESUAI|BERSYARAT|TIDAK_SESUAI",
            "keterangan": "penjelasan detail kesesuaian",
            "referensi_regulasi": "pasal/ayat yang relevan"
        }
    ],
    "ketentuan_teknis": [
        {
            "kategori": "KDB|KLB|KDH|KTB|GSB|Tinggi Bangunan",
            "nilai": "nilai ketentuan",
            "satuan": "satuan (%, meter, dll)",
            "keterangan": "penjelasan ketentuan",
            "wajib": true
        }
    ],
    "rekomendasi": [
        {
            "prioritas": "TINGGI|SEDANG|RENDAH",
            "kategori": "PERIZINAN|TEKNIS|REGULASI",
            "rekomendasi": "saran spesifik",
            "alasan": "dasar rekomendasi"
        }
    ],
    "potensi_masalah": [
        {
            "tingkat": "KRITIS|TINGGI|SEDANG|RENDAH",
            "masalah": "deskripsi masalah",
            "dampak": "dampak yang mungkin terjadi",
            "solusi": "langkah mitigasi"
        }
    ],
    "koordinat_analisis": {
        "titik_pusat": [longitude, latitude],
        "bounding_box": [[min_lon, min_lat], [max_lon, max_lat]],
        "luas_area_m2": 0
    },
    "confidence_score": 0.95
}

Berikan analisis yang komprehensif dan akurat berdasarkan best practices perencanaan kota Indonesia.`
        });

        // Chat Assistant Prompts
        this.promptTemplates.set('perda_chat', {
            system: `Anda adalah AI Konsultan Ahli Peraturan Daerah (Perda) RTRW dengan keahlian:

EXPERTISE:
- Peraturan Daerah RTRW seluruh Indonesia
- Undang-Undang Penataan Ruang (UU No. 26/2007)
- Peraturan Pemerintah terkait tata ruang
- Prosedur perizinan IMB dan KRK
- Interpretasi regulasi untuk praktisi

COMMUNICATION STYLE:
- Profesional namun mudah dipahami
- Berikan contoh konkret dan aplikatif
- Sertakan referensi pasal/ayat yang relevan
- Jelaskan implikasi praktis dari regulasi
- Berikan alternatif solusi jika memungkinkan

RESPONSE FRAMEWORK:
1. Jawab pertanyaan dengan referensi regulasi yang tepat
2. Berikan konteks dan latar belakang jika diperlukan
3. Sertakan tips praktis untuk implementasi
4. Identifikasi potensi masalah dan solusinya
5. Sarankan langkah follow-up jika relevan`,

            user: (context) => `${context.chatHistory.length > 0 ? `RIWAYAT PERCAKAPAN:
${context.chatHistory.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}

` : ''}REFERENSI PERDA RTRW KABUPATEN GARUT:
${context.perdaReference || perdaReferenceManager.getAnalysisContext(context.projectData)}

PERTANYAAN: ${context.question}

Berikan jawaban yang akurat, praktis, dan mudah dipahami dengan menyertakan referensi regulasi yang relevan.`
        });

        // Summary Generation Prompts
        this.promptTemplates.set('analysis_summary', {
            system: `Anda adalah AI Technical Writer ahli dalam membuat ringkasan analisis KRK yang profesional.

WRITING STANDARDS:
- Bahasa Indonesia formal namun mudah dipahami
- Struktur logis dan sistematis
- Fokus pada informasi penting dan actionable
- Gunakan bullet points untuk clarity
- Sertakan rekomendasi konkret

OUTPUT REQUIREMENTS:
- Ringkasan eksekutif (2-3 paragraf)
- Poin-poin kunci dalam bullet format
- Rekomendasi prioritas
- Langkah selanjutnya yang disarankan`,

            user: (context) => `Buatkan ringkasan profesional dari hasil analisis KRK berikut:

DATA ANALISIS:
${JSON.stringify(context.analysisData, null, 2)}

JENIS RINGKASAN: ${context.summaryType === 'summarize' ? 'RINGKASAN LENGKAP' : 'IDENTIFIKASI MASALAH'}

${context.summaryType === 'summarize' ? 
`FORMAT RINGKASAN LENGKAP:
1. RINGKASAN EKSEKUTIF (gambaran umum proyek dan hasil analisis)
2. LOKASI DAN PERUNTUKAN (detail lokasi dan kesesuaian)
3. HASIL ANALISIS ZONA (zona yang berlaku dan kesesuaiannya)
4. KETENTUAN TEKNIS UTAMA (requirement teknis yang harus dipenuhi)
5. REKOMENDASI PRIORITAS (langkah-langkah yang harus dilakukan)` :
`FORMAT IDENTIFIKASI MASALAH:
1. MASALAH KRITIS (issues yang harus segera ditangani)
2. POTENSI KONFLIK REGULASI (ketidaksesuaian dengan peraturan)
3. RISIKO TEKNIS (masalah implementasi teknis)
4. REKOMENDASI MITIGASI (langkah-langkah pencegahan)
5. PRIORITAS TINDAKAN (urutan penanganan masalah)`}

Berikan analisis yang komprehensif dan actionable untuk stakeholder proyek.`
        });

        // Issue Identification Prompts
        this.promptTemplates.set('issue_identification', {
            system: `Anda adalah AI Risk Analyst ahli dalam mengidentifikasi potensi masalah dalam proyek perencanaan kota.

ANALYSIS FOCUS:
- Identifikasi risiko regulasi dan compliance
- Analisis potensi konflik dengan stakeholder
- Evaluasi feasibility teknis dan ekonomis
- Prediksi masalah implementasi
- Rekomendasi mitigasi yang praktis

RISK CATEGORIES:
1. REGULASI: Ketidaksesuaian dengan peraturan
2. TEKNIS: Masalah implementasi teknis
3. LINGKUNGAN: Dampak lingkungan dan sosial
4. EKONOMIS: Aspek biaya dan kelayakan
5. PROSEDURAL: Masalah proses perizinan

SEVERITY LEVELS:
- KRITIS: Dapat menghentikan proyek
- TINGGI: Memerlukan perhatian segera
- SEDANG: Perlu dimonitor dan dimitigasi
- RENDAH: Risiko minimal, perlu awareness`,

            user: (context) => `Identifikasi secara sistematis potensi masalah dalam proyek KRK berikut:

DATA PROYEK LENGKAP:
${JSON.stringify(context.analysisData, null, 2)}

ANALISIS YANG DIPERLUKAN:
1. AUDIT COMPLIANCE - Periksa kesesuaian dengan semua regulasi
2. RISK ASSESSMENT - Identifikasi semua potensi risiko
3. IMPACT ANALYSIS - Evaluasi dampak setiap masalah
4. MITIGATION STRATEGY - Saran penanganan untuk setiap issue
5. PRIORITY MATRIX - Urutan prioritas penanganan

OUTPUT FORMAT:
{
    "masalah_kritis": [
        {
            "kategori": "REGULASI|TEKNIS|LINGKUNGAN|EKONOMIS|PROSEDURAL",
            "masalah": "deskripsi spesifik masalah",
            "dampak": "konsekuensi jika tidak ditangani",
            "probabilitas": "TINGGI|SEDANG|RENDAH",
            "severity": "KRITIS|TINGGI|SEDANG|RENDAH",
            "mitigasi": "langkah-langkah pencegahan",
            "timeline": "kapan harus ditangani",
            "pic_suggested": "siapa yang sebaiknya menangani"
        }
    ],
    "rekomendasi_prioritas": [
        {
            "urutan": 1,
            "tindakan": "tindakan yang harus dilakukan",
            "deadline": "target penyelesaian",
            "resources": "sumber daya yang dibutuhkan"
        }
    ],
    "risk_score": 0.75,
    "overall_assessment": "LAYAK|BERSYARAT|TIDAK_LAYAK"
}

Berikan analisis yang mendalam dan actionable untuk decision making.`
        });
    }

    // Generate optimized prompt based on context
    async generatePrompt(promptType, context = {}) {
        performanceMonitor.startTiming(`prompt_generation_${promptType}`);

        try {
            const template = this.promptTemplates.get(promptType);
            if (!template) {
                throw new Error(`Prompt template '${promptType}' not found`);
            }

            // Enhance context with additional information
            const enhancedContext = await this.enhanceContext(context, promptType);

            // Generate system and user prompts
            const systemPrompt = template.system;
            const userPrompt = typeof template.user === 'function' 
                ? template.user(enhancedContext)
                : template.user;

            // Add context-aware enhancements
            const optimizedPrompts = this.optimizePrompts(systemPrompt, userPrompt, promptType, enhancedContext);

            performanceMonitor.endTiming(`prompt_generation_${promptType}`);

            return optimizedPrompts;

        } catch (error) {
            performanceMonitor.endTiming(`prompt_generation_${promptType}`);
            console.error('Prompt generation error:', error);
            throw error;
        }
    }

    // Enhance context with additional relevant information
    async enhanceContext(context, promptType) {
        const enhanced = { ...context };

        // Add timestamp and session info
        enhanced.timestamp = new Date().toISOString();
        enhanced.session_id = this.generateSessionId();

        // Add regional context for Indonesian regulations
        enhanced.regional_context = {
            country: 'Indonesia',
            regulatory_framework: 'UU No. 26/2007 tentang Penataan Ruang',
            local_government: context.kabupaten || 'Kabupaten Garut'
        };

        // Add accuracy tracking
        if (this.accuracyMetrics.has(promptType)) {
            enhanced.historical_accuracy = this.accuracyMetrics.get(promptType);
        }

        // Enhance based on prompt type
        switch (promptType) {
            case 'document_extraction':
                enhanced.extraction_guidelines = this.getExtractionGuidelines();
                break;
            case 'map_analysis':
                enhanced.analysis_framework = this.getAnalysisFramework();
                enhanced.technical_standards = this.getTechnicalStandards();
                break;
            case 'perda_chat':
                enhanced.conversation_context = this.buildConversationContext(context);
                break;
        }

        return enhanced;
    }

    // Optimize prompts based on context and historical performance
    optimizePrompts(systemPrompt, userPrompt, promptType, context) {
        let optimizedSystem = systemPrompt;
        let optimizedUser = userPrompt;

        // Add accuracy boosters based on prompt type
        const accuracyBoosters = this.getAccuracyBoosters(promptType);
        optimizedSystem += `\n\nACCURACY BOOSTERS:\n${accuracyBoosters}`;

        // Add context-specific instructions
        const contextInstructions = this.getContextInstructions(promptType, context);
        if (contextInstructions) {
            optimizedUser += `\n\nCONTEXT INSTRUCTIONS:\n${contextInstructions}`;
        }

        // Add quality control measures
        const qualityControls = this.getQualityControls(promptType);
        optimizedUser += `\n\nQUALITY CONTROLS:\n${qualityControls}`;

        return {
            system: optimizedSystem,
            user: optimizedUser,
            metadata: {
                promptType,
                timestamp: context.timestamp,
                sessionId: context.session_id,
                version: '2.0'
            }
        };
    }

    // Get accuracy boosters for specific prompt types
    getAccuracyBoosters(promptType) {
        const boosters = {
            document_extraction: `
- DOUBLE-CHECK: Validasi setiap field sebelum output
- PRECISION: Ekstrak data persis seperti yang tertulis
- VALIDATION: Pastikan format tanggal dan nomor surat benar
- CONFIDENCE: Berikan confidence_score berdasarkan kejelasan data`,

            map_analysis: `
- SPATIAL ACCURACY: Validasi koordinat dalam batas Indonesia
- REGULATORY COMPLIANCE: Cross-check dengan regulasi terbaru
- TECHNICAL PRECISION: Gunakan standar teknis yang berlaku
- COMPREHENSIVE ANALYSIS: Cover semua aspek zonasi dan ketentuan`,

            perda_chat: `
- REGULATORY ACCURACY: Pastikan referensi pasal/ayat benar
- PRACTICAL RELEVANCE: Berikan jawaban yang aplikatif
- CLARITY: Gunakan bahasa yang mudah dipahami
- COMPLETENESS: Jawab semua aspek pertanyaan`,

            analysis_summary: `
- EXECUTIVE FOCUS: Prioritaskan informasi untuk decision maker
- ACTION ORIENTED: Berikan rekomendasi yang actionable
- STRUCTURED CLARITY: Gunakan format yang mudah dibaca
- COMPREHENSIVE COVERAGE: Cover semua aspek penting`,

            issue_identification: `
- RISK COMPLETENESS: Identifikasi semua kategori risiko
- IMPACT ASSESSMENT: Evaluasi dampak secara realistis
- MITIGATION FOCUS: Berikan solusi yang praktis
- PRIORITY CLARITY: Urutkan berdasarkan urgency dan impact`
        };

        return boosters[promptType] || '';
    }

    // Get context-specific instructions
    getContextInstructions(promptType, context) {
        const instructions = [];

        // Add regional specific instructions
        if (context.regional_context?.local_government) {
            instructions.push(`- REGIONAL CONTEXT: Fokus pada regulasi ${context.regional_context.local_government}`);
        }

        // Add project specific instructions
        if (context.projectData?.lokasi_proyek?.peruntukan) {
            instructions.push(`- PROJECT FOCUS: Prioritaskan analisis untuk peruntukan ${context.projectData.lokasi_proyek.peruntukan}`);
        }

        // Add accuracy based instructions
        if (context.historical_accuracy && context.historical_accuracy.average < 0.8) {
            instructions.push(`- ACCURACY ALERT: Historical accuracy ${(context.historical_accuracy.average * 100).toFixed(1)}% - extra validation required`);
        }

        return instructions.join('\n');
    }

    // Get quality control measures
    getQualityControls(promptType) {
        const controls = {
            document_extraction: `
- Pastikan semua field required terisi
- Validasi format JSON sebelum output
- Cross-check data dengan dokumen sumber
- Berikan confidence score realistis (0.7-0.95)`,

            map_analysis: `
- Validasi koordinat dalam range Indonesia
- Pastikan zona analysis sesuai dengan lokasi
- Cross-reference dengan multiple sources
- Berikan confidence score berdasarkan data availability`,

            perda_chat: `
- Verifikasi referensi regulasi yang disebutkan
- Pastikan jawaban relevan dengan pertanyaan
- Berikan disclaimer jika informasi tidak pasti
- Sarankan konsultasi lebih lanjut jika diperlukan`,

            analysis_summary: `
- Pastikan ringkasan mencakup poin-poin kunci
- Validasi konsistensi dengan data sumber
- Berikan struktur yang logis dan mudah diikuti
- Include actionable recommendations`,

            issue_identification: `
- Pastikan semua kategori risiko tercakup
- Validasi severity assessment dengan impact
- Berikan mitigation yang realistic dan actionable
- Prioritaskan berdasarkan urgency dan feasibility`
        };

        return controls[promptType] || 'Pastikan output berkualitas tinggi dan akurat';
    }

    // Get extraction guidelines for document processing
    getExtractionGuidelines() {
        return {
            nama_patterns: ['nama:', 'atas nama:', 'pemohon:', 'yang bertanda tangan'],
            jabatan_patterns: ['jabatan:', 'selaku:', 'sebagai:', 'direktur', 'manager', 'kepala'],
            nomor_surat_patterns: ['nomor:', 'no.:', 'no :', 'surat nomor'],
            tanggal_patterns: ['tanggal:', 'tgl:', 'pada tanggal', 'tertanggal'],
            alamat_patterns: ['alamat:', 'bertempat di:', 'lokasi:', 'terletak di:'],
            luas_patterns: ['luas:', 'seluas:', 'dengan luas', '± ', 'm²', 'meter persegi']
        };
    }

    // Get analysis framework for map analysis
    getAnalysisFramework() {
        return {
            zonasi_types: ['Perumahan', 'Perdagangan', 'Industri', 'Perkantoran', 'Fasilitas Umum', 'RTH'],
            ketentuan_teknis: ['KDB', 'KLB', 'KDH', 'KTB', 'GSB', 'Tinggi Bangunan'],
            compliance_levels: ['SESUAI', 'BERSYARAT', 'TIDAK_SESUAI'],
            risk_categories: ['REGULASI', 'TEKNIS', 'LINGKUNGAN', 'EKONOMIS', 'PROSEDURAL']
        };
    }

    // Get technical standards
    getTechnicalStandards() {
        return {
            kdb_standards: { residential: 60, commercial: 80, industrial: 70 },
            klb_standards: { residential: 1.2, commercial: 3.0, industrial: 2.0 },
            kdh_standards: { residential: 30, commercial: 20, industrial: 25 },
            gsb_standards: { residential: 5, commercial: 3, industrial: 10 }
        };
    }

    // Build conversation context for chat
    buildConversationContext(context) {
        return {
            previous_topics: this.extractTopicsFromHistory(context.chatHistory || []),
            user_expertise_level: this.assessUserExpertise(context.chatHistory || []),
            conversation_flow: this.analyzeConversationFlow(context.chatHistory || [])
        };
    }

    // Extract topics from chat history
    extractTopicsFromHistory(history) {
        const topics = new Set();
        const keywords = ['zonasi', 'perda', 'rtrw', 'imb', 'krk', 'peruntukan', 'ketentuan'];
        
        history.forEach(message => {
            keywords.forEach(keyword => {
                if (message.content.toLowerCase().includes(keyword)) {
                    topics.add(keyword);
                }
            });
        });
        
        return Array.from(topics);
    }

    // Assess user expertise level
    assessUserExpertise(history) {
        if (history.length === 0) return 'beginner';
        
        const technicalTerms = ['kdb', 'klb', 'kdh', 'gsb', 'rtbl', 'rdtr'];
        const technicalCount = history.reduce((count, message) => {
            return count + technicalTerms.filter(term => 
                message.content.toLowerCase().includes(term)
            ).length;
        }, 0);
        
        if (technicalCount > 5) return 'expert';
        if (technicalCount > 2) return 'intermediate';
        return 'beginner';
    }

    // Analyze conversation flow
    analyzeConversationFlow(history) {
        if (history.length < 2) return 'initial';
        
        const lastUserMessage = history.filter(h => h.role === 'user').slice(-1)[0];
        if (!lastUserMessage) return 'initial';
        
        if (lastUserMessage.content.includes('lanjut') || lastUserMessage.content.includes('selanjutnya')) {
            return 'continuation';
        }
        
        if (lastUserMessage.content.includes('jelaskan') || lastUserMessage.content.includes('bagaimana')) {
            return 'clarification';
        }
        
        return 'new_topic';
    }

    // Generate unique session ID
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Track accuracy metrics
    trackAccuracy(promptType, actualResult, expectedResult, userFeedback = null) {
        if (!this.accuracyMetrics.has(promptType)) {
            this.accuracyMetrics.set(promptType, {
                total_requests: 0,
                successful_requests: 0,
                average: 0,
                history: []
            });
        }

        const metrics = this.accuracyMetrics.get(promptType);
        metrics.total_requests++;

        // Calculate accuracy score based on result quality
        let accuracyScore = this.calculateAccuracyScore(actualResult, expectedResult, userFeedback);
        
        if (accuracyScore >= 0.7) {
            metrics.successful_requests++;
        }

        metrics.history.push({
            timestamp: new Date().toISOString(),
            score: accuracyScore,
            feedback: userFeedback
        });

        // Keep only last 100 records
        if (metrics.history.length > 100) {
            metrics.history = metrics.history.slice(-100);
        }

        // Update average
        metrics.average = metrics.successful_requests / metrics.total_requests;

        this.accuracyMetrics.set(promptType, metrics);
    }

    // Calculate accuracy score
    calculateAccuracyScore(actualResult, expectedResult, userFeedback) {
        let score = 0.5; // Base score

        // Adjust based on result completeness
        if (actualResult && typeof actualResult === 'object') {
            const completeness = Object.keys(actualResult).length / 10; // Assume 10 expected fields
            score += Math.min(completeness * 0.3, 0.3);
        }

        // Adjust based on user feedback
        if (userFeedback) {
            switch (userFeedback.toLowerCase()) {
                case 'excellent':
                case 'sangat baik':
                    score = 0.95;
                    break;
                case 'good':
                case 'baik':
                    score = 0.8;
                    break;
                case 'fair':
                case 'cukup':
                    score = 0.6;
                    break;
                case 'poor':
                case 'kurang':
                    score = 0.3;
                    break;
            }
        }

        return Math.min(Math.max(score, 0), 1);
    }

    // Get prompt statistics
    getPromptStats() {
        const stats = {};
        
        for (const [promptType, metrics] of this.accuracyMetrics) {
            stats[promptType] = {
                total_requests: metrics.total_requests,
                success_rate: (metrics.average * 100).toFixed(1) + '%',
                recent_performance: metrics.history.slice(-10).reduce((sum, h) => sum + h.score, 0) / Math.min(metrics.history.length, 10)
            };
        }

        return stats;
    }

    // Clear metrics (for testing)
    clearMetrics() {
        this.accuracyMetrics.clear();
    }
}

// Create singleton instance
export const aiPromptEngine = new AIPromptEngine();
