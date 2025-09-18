/**
 * AI Integration Component for KRK Generator
 * Handles Gemini API calls and AI-powered analysis
 */

import { CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, getEmptyAnalysisData } from '../config.js';
import { performanceMonitor, globalCache, debounce } from '../utils/performance.js';
import { settingsStorage } from '../core/storage.js';
import { aiPromptEngine } from './ai-prompt-engine.js';
import { perdaReferenceManager } from '../data/perda-references.js';

export class AIIntegrationComponent {
    constructor() {
        this.apiKey = null;
        this.model = CONFIG.DEFAULT_MODEL;
        this.rateLimitDelay = 1000; // 1 second between requests
        this.lastRequestTime = 0;
        this.requestQueue = [];
        this.isProcessing = false;
        
        this.loadSettings();
    }

    loadSettings() {
        this.apiKey = settingsStorage.get('geminiApiKey', '');
        this.model = settingsStorage.get('geminiModel', CONFIG.DEFAULT_MODEL);
    }

    updateSettings(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }

    // Main API call method with rate limiting and caching
    async callGeminiAPI(prompt, imageData = null, options = {}) {
        performanceMonitor.startTiming('geminiAPI');
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(prompt, imageData);
            const cached = globalCache.get(cacheKey);
            if (cached && !options.skipCache) {
                performanceMonitor.endTiming('geminiAPI');
                return cached;
            }

            // Validate API key
            if (!this.apiKey || !this.apiKey.trim()) {
                throw new Error(ERROR_MESSAGES.API_KEY_MISSING);
            }

            // Rate limiting
            await this.enforceRateLimit();

            // Prepare request
            const requestBody = this.buildRequestBody(prompt, imageData, options);
            const url = `${CONFIG.GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

            // Make API call
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(this.parseAPIError(response.status, errorData));
            }

            const data = await response.json();
            const result = this.parseAPIResponse(data);

            // Cache successful response
            globalCache.set(cacheKey, result);
            
            performanceMonitor.endTiming('geminiAPI');
            return result;

        } catch (error) {
            performanceMonitor.endTiming('geminiAPI');
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    // Extract data from uploaded documents (PDF, images)
    async extractDataFromDocument(base64Data, mimeType, fileName) {
        try {
            // Generate optimized prompt using AI Prompt Engine
            const promptData = await aiPromptEngine.generatePrompt('document_extraction', {
                mimeType: mimeType,
                fileName: fileName,
                documentType: 'surat_permohonan'
            });

            const result = await this.callGeminiAPI(promptData.user, {
                data: base64Data,
                mimeType: mimeType
            }, {
                systemPrompt: promptData.system
            });

            // Parse JSON response with enhanced validation
            const extractedData = this.parseJSONResponse(result);
            
            // Validate extraction quality
            const validationScore = this.validateExtractionQuality(extractedData, fileName);
            
            // Track accuracy for continuous improvement
            aiPromptEngine.trackAccuracy('document_extraction', extractedData, null, null);
            
            // Merge with empty analysis data
            const finalData = {
                ...getEmptyAnalysisData(),
                ...extractedData,
                extraction_metadata: {
                    source_file: fileName,
                    extraction_timestamp: new Date().toISOString(),
                    confidence_score: extractedData.confidence_score || validationScore,
                    validation_score: validationScore
                }
            };

            return finalData;

        } catch (error) {
            console.error('Document extraction error:', error);
            // Track failed extraction
            aiPromptEngine.trackAccuracy('document_extraction', null, null, 'poor');
            throw new Error(`Gagal mengekstrak data dari ${fileName}: ${error.message}`);
        }
    }

    // Analyze map data and generate zone analysis
    async analyzeMapData(geoJsonData, projectData, referenceDocuments = []) {
        try {
            // Generate optimized prompt using AI Prompt Engine
            // Get comprehensive Perda reference
            const perdaContext = perdaReferenceManager.getAnalysisContext(projectData);
            const combinedReference = referenceDocuments.length > 0 
                ? referenceDocuments.join('\n\n') + '\n\n' + perdaContext
                : perdaContext;

            const promptData = await aiPromptEngine.generatePrompt('map_analysis', {
                geoJsonData: geoJsonData,
                projectData: projectData,
                perdaReference: combinedReference,
                kabupaten: projectData.lokasi_proyek?.kabupaten || 'Kabupaten Garut'
            });

            const result = await this.callGeminiAPI(promptData.user, null, {
                systemPrompt: promptData.system
            });

            // Parse and validate analysis data
            const analysisData = this.parseJSONResponse(result);
            
            // Enhanced validation for map analysis
            const validationScore = this.validateMapAnalysisQuality(analysisData, geoJsonData);
            
            // Track accuracy
            aiPromptEngine.trackAccuracy('map_analysis', analysisData, null, null);
            
            // Add analysis metadata
            const enhancedAnalysis = {
                ...analysisData,
                analysis_metadata: {
                    analysis_timestamp: new Date().toISOString(),
                    data_sources: {
                        geojson_features: geoJsonData?.features?.length || 0,
                        perda_references: referenceDocuments.length,
                        project_data_completeness: this.calculateProjectDataCompleteness(projectData)
                    },
                    confidence_score: analysisData.confidence_score || validationScore,
                    validation_score: validationScore
                }
            };
            
            return enhancedAnalysis;

        } catch (error) {
            console.error('Map analysis error:', error);
            aiPromptEngine.trackAccuracy('map_analysis', null, null, 'poor');
            throw new Error(`Gagal menganalisis data peta: ${error.message}`);
        }
    }

    // Chat with AI about Perda RTRW
    async chatWithPerda(question, perdaText, chatHistory = [], projectData = null) {
        try {
            // Get comprehensive Perda reference including Garut specific data
            const perdaContext = projectData 
                ? perdaReferenceManager.getAnalysisContext(projectData)
                : perdaReferenceManager.getReferenceForAI().full_text;
            
            const combinedReference = perdaText 
                ? perdaText + '\n\n' + perdaContext
                : perdaContext;

            // Generate optimized prompt using AI Prompt Engine
            const promptData = await aiPromptEngine.generatePrompt('perda_chat', {
                question: question,
                perdaReference: combinedReference,
                chatHistory: chatHistory,
                projectData: projectData
            });

            const result = await this.callGeminiAPI(promptData.user, null, {
                systemPrompt: promptData.system
            });

            // Track chat accuracy
            aiPromptEngine.trackAccuracy('perda_chat', result, null, null);

            return result;

        } catch (error) {
            console.error('Perda chat error:', error);
            aiPromptEngine.trackAccuracy('perda_chat', null, null, 'poor');
            throw new Error(`Gagal memproses pertanyaan: ${error.message}`);
        }
    }

    // Generate summary and identify potential issues
    async generateAnalysisSummary(analysisData, action = 'summarize') {
        try {
            // Generate optimized prompt using AI Prompt Engine
            const promptType = action === 'summarize' ? 'analysis_summary' : 'issue_identification';
            const promptData = await aiPromptEngine.generatePrompt(promptType, {
                analysisData: analysisData,
                summaryType: action
            });

            const result = await this.callGeminiAPI(promptData.user, null, {
                systemPrompt: promptData.system
            });

            // Track accuracy
            aiPromptEngine.trackAccuracy(promptType, result, null, null);

            return result;

        } catch (error) {
            console.error('Analysis summary error:', error);
            const promptType = action === 'summarize' ? 'analysis_summary' : 'issue_identification';
            aiPromptEngine.trackAccuracy(promptType, null, null, 'poor');
            throw new Error(`Gagal membuat ${action === 'summarize' ? 'ringkasan' : 'identifikasi masalah'}: ${error.message}`);
        }
    }

    // Validation methods
    validateExtractionQuality(extractedData, fileName) {
        let score = 0.5; // Base score
        
        // Check required fields
        const requiredFields = ['pemohon', 'surat_pemohon', 'lokasi_proyek'];
        const presentFields = requiredFields.filter(field => 
            extractedData[field] && Object.keys(extractedData[field]).length > 0
        );
        score += (presentFields.length / requiredFields.length) * 0.3;
        
        // Check data completeness
        if (extractedData.pemohon?.nama) score += 0.1;
        if (extractedData.surat_pemohon?.nomor) score += 0.1;
        if (extractedData.lokasi_proyek?.alamat_lengkap) score += 0.1;
        
        // Check confidence score if provided
        if (extractedData.confidence_score && extractedData.confidence_score > 0.8) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    }

    validateMapAnalysisQuality(analysisData, geoJsonData) {
        let score = 0.5; // Base score
        
        // Check analysis completeness
        if (analysisData.analisis_zona && analysisData.analisis_zona.length > 0) score += 0.2;
        if (analysisData.ketentuan_teknis && analysisData.ketentuan_teknis.length > 0) score += 0.2;
        if (analysisData.rekomendasi && analysisData.rekomendasi.length > 0) score += 0.1;
        
        // Check coordinate analysis
        if (analysisData.koordinat_analisis) score += 0.1;
        
        // Check confidence score
        if (analysisData.confidence_score && analysisData.confidence_score > 0.8) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    }

    calculateProjectDataCompleteness(projectData) {
        const fields = [
            'lokasi_proyek.alamat_lengkap',
            'lokasi_proyek.peruntukan', 
            'lokasi_proyek.luas_total',
            'pemohon.nama',
            'surat_pemohon.nomor'
        ];
        
        let completedFields = 0;
        fields.forEach(field => {
            const value = this.getNestedValue(projectData, field);
            if (value && value !== '' && value !== 0) {
                completedFields++;
            }
        });
        
        return (completedFields / fields.length) * 100;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // Helper methods
    buildRequestBody(prompt, imageData = null, options = {}) {
        const parts = [];
        
        // Add system prompt if provided
        if (options.systemPrompt) {
            parts.push({ text: options.systemPrompt });
        }
        
        // Add main prompt
        parts.push({ text: prompt });

        if (imageData) {
            parts.push({
                inline_data: {
                    mime_type: imageData.mimeType,
                    data: imageData.data
                }
            });
        }

        return {
            contents: [{
                parts: parts
            }],
            generationConfig: {
                temperature: options.temperature || 0.1,
                topK: options.topK || 32,
                topP: options.topP || 1,
                maxOutputTokens: options.maxOutputTokens || 8192,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };
    }

    parseAPIResponse(data) {
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from AI');
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('Empty response from AI');
        }

        return candidate.content.parts[0].text;
    }

    parseJSONResponse(text) {
        try {
            // Clean the response text
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleanText);
        } catch (error) {
            console.error('JSON parsing error:', error);
            console.error('Raw text:', text);
            throw new Error('Respons AI tidak dalam format JSON yang valid');
        }
    }

    parseAPIError(status, errorData) {
        switch (status) {
            case 400:
                return 'Permintaan tidak valid. Periksa format data.';
            case 401:
                return 'API key tidak valid. Periksa pengaturan.';
            case 403:
                return 'Akses ditolak. Periksa izin API key.';
            case 429:
                return 'Terlalu banyak permintaan. Coba lagi nanti.';
            case 500:
                return 'Server error. Coba lagi nanti.';
            default:
                return errorData.error?.message || 'Terjadi kesalahan pada API';
        }
    }

    generateCacheKey(prompt, imageData) {
        const content = prompt + (imageData ? imageData.data.substring(0, 100) : '');
        return `ai_${btoa(content).substring(0, 32)}`;
    }

    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    // Queue management for batch processing
    async addToQueue(request) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ request, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.requestQueue.length > 0) {
            const { request, resolve, reject } = this.requestQueue.shift();
            
            try {
                const result = await this.callGeminiAPI(request.prompt, request.imageData, request.options);
                resolve(result);
            } catch (error) {
                reject(error);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isProcessing = false;
    }

    // Utility methods for external use
    isConfigured() {
        return !!(this.apiKey && this.apiKey.trim());
    }

    getModel() {
        return this.model;
    }

    setModel(model) {
        this.model = model;
    }

    clearCache() {
        // Clear AI-related cache entries
        for (const key of globalCache.cache.keys()) {
            if (key.startsWith('ai_')) {
                globalCache.delete(key);
            }
        }
    }

    getStats() {
        const promptStats = aiPromptEngine.getPromptStats();
        
        return {
            isConfigured: this.isConfigured(),
            model: this.model,
            queueLength: this.requestQueue.length,
            isProcessing: this.isProcessing,
            cacheSize: Array.from(globalCache.cache.keys()).filter(k => k.startsWith('ai_')).length,
            promptEngineStats: promptStats,
            accuracy: {
                overall: this.calculateOverallAccuracy(promptStats),
                byType: promptStats
            },
            performance: {
                averageResponseTime: this.getAverageResponseTime(),
                successRate: this.getSuccessRate(),
                totalRequests: this.getTotalRequests()
            }
        };
    }

    calculateOverallAccuracy(promptStats) {
        const stats = Object.values(promptStats);
        if (stats.length === 0) return 0;
        
        const totalAccuracy = stats.reduce((sum, stat) => {
            return sum + (parseFloat(stat.success_rate) || 0);
        }, 0);
        
        return (totalAccuracy / stats.length).toFixed(1) + '%';
    }

    getAverageResponseTime() {
        // Get from performance monitor if available
        const timings = performanceMonitor.getTimings?.() || {};
        const aiTimings = Object.entries(timings).filter(([key]) => key.includes('geminiAPI'));
        
        if (aiTimings.length === 0) return 'N/A';
        
        const avgTime = aiTimings.reduce((sum, [, time]) => sum + time, 0) / aiTimings.length;
        return `${avgTime.toFixed(0)}ms`;
    }

    getSuccessRate() {
        const promptStats = aiPromptEngine.getPromptStats();
        const stats = Object.values(promptStats);
        
        if (stats.length === 0) return 'N/A';
        
        const avgSuccessRate = stats.reduce((sum, stat) => {
            return sum + (parseFloat(stat.success_rate) || 0);
        }, 0) / stats.length;
        
        return avgSuccessRate.toFixed(1) + '%';
    }

    getTotalRequests() {
        const promptStats = aiPromptEngine.getPromptStats();
        return Object.values(promptStats).reduce((sum, stat) => {
            return sum + (stat.total_requests || 0);
        }, 0);
    }

    // User feedback method for continuous improvement
    provideFeedback(promptType, requestId, feedback, rating = null) {
        try {
            // Validate feedback
            const validFeedbacks = ['excellent', 'good', 'fair', 'poor', 'sangat baik', 'baik', 'cukup', 'kurang'];
            const normalizedFeedback = feedback.toLowerCase();
            
            if (!validFeedbacks.includes(normalizedFeedback)) {
                console.warn('Invalid feedback provided:', feedback);
                return false;
            }

            // Track feedback in prompt engine
            aiPromptEngine.trackAccuracy(promptType, null, null, normalizedFeedback);
            
            // Store feedback for analysis
            const feedbackData = {
                promptType,
                requestId,
                feedback: normalizedFeedback,
                rating: rating,
                timestamp: new Date().toISOString()
            };
            
            // Save to localStorage for persistence
            const existingFeedback = JSON.parse(localStorage.getItem('ai_feedback_history') || '[]');
            existingFeedback.push(feedbackData);
            
            // Keep only last 1000 feedback entries
            if (existingFeedback.length > 1000) {
                existingFeedback.splice(0, existingFeedback.length - 1000);
            }
            
            localStorage.setItem('ai_feedback_history', JSON.stringify(existingFeedback));
            
            console.log('Feedback recorded:', feedbackData);
            return true;
            
        } catch (error) {
            console.error('Error recording feedback:', error);
            return false;
        }
    }

    // Get feedback history for analysis
    getFeedbackHistory(promptType = null, limit = 100) {
        try {
            const allFeedback = JSON.parse(localStorage.getItem('ai_feedback_history') || '[]');
            
            let filteredFeedback = allFeedback;
            
            if (promptType) {
                filteredFeedback = allFeedback.filter(f => f.promptType === promptType);
            }
            
            return filteredFeedback.slice(-limit);
            
        } catch (error) {
            console.error('Error getting feedback history:', error);
            return [];
        }
    }

    // Clear all AI data (for testing/reset)
    clearAllData() {
        try {
            // Clear prompt engine metrics
            aiPromptEngine.clearMetrics();
            
            // Clear cache
            this.clearCache();
            
            // Clear feedback history
            localStorage.removeItem('ai_feedback_history');
            
            // Reset request queue
            this.requestQueue = [];
            this.isProcessing = false;
            
            console.log('All AI data cleared');
            return true;
            
        } catch (error) {
            console.error('Error clearing AI data:', error);
            return false;
        }
    }

    // Advanced diagnostic method
    runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            configuration: {
                apiKeyConfigured: this.isConfigured(),
                model: this.model,
                rateLimitDelay: this.rateLimitDelay
            },
            performance: {
                queueLength: this.requestQueue.length,
                isProcessing: this.isProcessing,
                cacheSize: Array.from(globalCache.cache.keys()).filter(k => k.startsWith('ai_')).length,
                lastRequestTime: new Date(this.lastRequestTime).toISOString()
            },
            promptEngine: {
                templatesLoaded: aiPromptEngine.promptTemplates.size,
                accuracyMetrics: aiPromptEngine.accuracyMetrics.size,
                contextHistoryLength: aiPromptEngine.contextHistory.length
            },
            feedback: {
                totalFeedback: this.getFeedbackHistory().length,
                recentFeedback: this.getFeedbackHistory(null, 10)
            },
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                onLine: navigator.onLine,
                cookieEnabled: navigator.cookieEnabled
            }
        };
        
        console.log('AI Integration Diagnostics:', diagnostics);
        return diagnostics;
    }

    // Get Perda reference information
    getPerdaInfo() {
        return {
            available_references: perdaReferenceManager.getAvailableReferences(),
            active_reference: perdaReferenceManager.activeReference,
            reference_data: perdaReferenceManager.getReferenceForAI()
        };
    }

    // Get zonasi information for specific area
    getZonasiInfo(zona_code) {
        return perdaReferenceManager.getZonasiInfo(zona_code);
    }

    // Get ketentuan teknis for peruntukan
    getKetentuanTeknis(peruntukan) {
        return perdaReferenceManager.getKetentuanTeknis(peruntukan);
    }

    // Check kawasan strategis
    checkKawasanStrategis(lokasi) {
        return perdaReferenceManager.checkKawasanStrategis(lokasi);
    }

    // Enhanced analysis with Perda validation
    async validateWithPerda(analysisResult, projectData) {
        try {
            // Get relevant Perda information
            const perdaInfo = this.getPerdaInfo();
            
            // Check zonasi compliance
            const zonasiValidation = [];
            if (analysisResult.analisis_zona) {
                for (const zona of analysisResult.analisis_zona) {
                    const zonaInfo = this.getZonasiInfo(zona.zona_id);
                    if (zonaInfo) {
                        zonasiValidation.push({
                            zona_id: zona.zona_id,
                            perda_compliance: zona.kesesuaian === 'SESUAI',
                            perda_reference: zonaInfo,
                            recommendations: this.generateComplianceRecommendations(zona, zonaInfo)
                        });
                    }
                }
            }

            // Check kawasan strategis
            const kawasanStrategis = projectData.lokasi_proyek?.alamat_lengkap 
                ? this.checkKawasanStrategis(projectData.lokasi_proyek.alamat_lengkap)
                : null;

            // Get ketentuan teknis
            const ketentuanTeknis = projectData.lokasi_proyek?.peruntukan
                ? this.getKetentuanTeknis(projectData.lokasi_proyek.peruntukan)
                : null;

            return {
                perda_validation: {
                    reference: perdaInfo.reference_data.title,
                    zonasi_compliance: zonasiValidation,
                    kawasan_strategis: kawasanStrategis,
                    ketentuan_teknis: ketentuanTeknis,
                    overall_compliance: zonasiValidation.every(z => z.perda_compliance),
                    validation_timestamp: new Date().toISOString()
                },
                enhanced_analysis: {
                    ...analysisResult,
                    perda_validation: true,
                    compliance_score: this.calculateComplianceScore(zonasiValidation)
                }
            };

        } catch (error) {
            console.error('Perda validation error:', error);
            return {
                perda_validation: {
                    error: error.message,
                    validation_timestamp: new Date().toISOString()
                },
                enhanced_analysis: analysisResult
            };
        }
    }

    // Generate compliance recommendations
    generateComplianceRecommendations(zonaAnalysis, perdaInfo) {
        const recommendations = [];

        if (zonaAnalysis.kesesuaian === 'TIDAK_SESUAI') {
            recommendations.push({
                priority: 'HIGH',
                type: 'COMPLIANCE',
                message: `Peruntukan tidak sesuai dengan zona ${perdaInfo.kode}. Pertimbangkan perubahan peruntukan atau ajukan permohonan penyesuaian.`,
                reference: perdaInfo.reference
            });
        }

        if (zonaAnalysis.kesesuaian === 'BERSYARAT') {
            recommendations.push({
                priority: 'MEDIUM',
                type: 'CONDITIONAL',
                message: `Peruntukan dapat diizinkan dengan syarat tertentu sesuai ${perdaInfo.reference}. Pastikan memenuhi semua persyaratan teknis.`,
                reference: perdaInfo.reference
            });
        }

        // Add technical requirements
        if (perdaInfo.ketentuan) {
            Object.entries(perdaInfo.ketentuan).forEach(([key, value]) => {
                recommendations.push({
                    priority: 'MEDIUM',
                    type: 'TECHNICAL',
                    message: `${key.toUpperCase()}: ${value}${typeof value === 'number' ? '%' : ''}`,
                    reference: perdaInfo.reference
                });
            });
        }

        return recommendations;
    }

    // Calculate compliance score
    calculateComplianceScore(zonasiValidation) {
        if (zonasiValidation.length === 0) return 0;

        const compliantZones = zonasiValidation.filter(z => z.perda_compliance).length;
        return (compliantZones / zonasiValidation.length) * 100;
    }
}

// Create singleton instance
export const aiIntegration = new AIIntegrationComponent();
