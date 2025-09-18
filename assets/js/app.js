/**
 * Main Application Entry Point - KRK Generator
 * Refactored for better maintainability and performance
 */

import { CONFIG, APP_STATES, getEmptyAnalysisData } from './config.js';
import { performanceMonitor, globalCache, lazyLoader } from './utils/performance.js';
import { projectStorage, settingsStorage, dbManager } from './core/storage.js';
import { ProjectListComponent } from './components/project-list.js';
import { MapComponent } from './components/map-component.js';
import { FileUploaderComponent } from './components/file-uploader.js';
import { aiIntegration } from './components/ai-integration.js';
import { modalManager } from './components/modal-manager.js';
import { documentGenerator } from './components/document-generator.js';
import { aiFeedbackUI } from './components/ai-feedback-ui.js';

class KRKApplication {
    constructor() {
        this.isInitialized = false;
        this.components = {};
        this.modals = {};
        this.currentState = APP_STATES.UPLOADER;
        
        this.init();
    }

    async init() {
        performanceMonitor.startTiming('appInit');
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => 
                    document.addEventListener('DOMContentLoaded', resolve)
                );
            }

            // Initialize core components
            await this.initializeCore();
            await this.initializeComponents();
            await this.initializeEventHandlers();
            await this.loadInitialData();
            
            this.isInitialized = true;
            performanceMonitor.endTiming('appInit');
            
            console.log('KRK Application initialized successfully');
        } catch (error) {
            console.error('Application initialization failed:', error);
            this.showError('Gagal menginisialisasi aplikasi');
        }
    }

    async initializeCore() {
        // Initialize storage systems
        await dbManager.ensureReady();
        
        // Load settings
        await settingsStorage.loadSettings();
        
        // Initialize performance monitoring
        this.setupPerformanceMonitoring();
        
        // Initialize toast notifications
        this.initializeToasts();
    }

    async initializeComponents() {
        // Initialize Project List Component
        const projectListContainer = document.getElementById('project-list');
        this.components.projectList = new ProjectListComponent(
            projectListContainer,
            (projectId) => this.onProjectSelect(projectId),
            (projectId) => this.onProjectDelete(projectId)
        );

        // Initialize Modal Manager
        this.components.modalManager = modalManager;
        
        // Initialize AI Integration
        this.components.aiIntegration = aiIntegration;
        
        // Initialize Document Generator
        this.components.documentGenerator = documentGenerator;
        
        // Initialize AI Feedback UI
        this.components.aiFeedbackUI = aiFeedbackUI;

        // Initialize lazy-loaded components
        this.setupLazyComponents();
    }

    setupLazyComponents() {
        // Map component will be initialized when needed
        this.components.map = null;
        
        // File uploader will be initialized when needed
        this.components.fileUploader = null;
    }

    async initializeEventHandlers() {
        // New project button
        document.getElementById('new-project-btn')?.addEventListener('click', 
            () => this.showCreateProjectModal()
        );

        // Quick start button
        document.getElementById('quick-start-btn')?.addEventListener('click',
            () => this.showCreateProjectModal()
        );

        // Performance stats button
        document.getElementById('performance-stats-btn')?.addEventListener('click',
            () => this.showPerformanceStats()
        );

        // Settings modal handlers
        this.setupSettingsHandlers();
        
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('Terjadi kesalahan sistem');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('Terjadi kesalahan async');
        });
    }

    async loadInitialData() {
        // Update project count
        this.updateProjectCount();
        
        // Load active project if exists
        const activeProject = projectStorage.getActiveProject();
        if (activeProject) {
            await this.renderWorkspace(activeProject);
        }
    }

    async onProjectSelect(projectId) {
        performanceMonitor.startTiming('projectSelect');
        
        try {
            const project = projectStorage.getProject(projectId);
            if (project) {
                await this.renderWorkspace(project);
                this.updateProjectCount();
            }
        } catch (error) {
            console.error('Error selecting project:', error);
            this.showError('Gagal memuat proyek');
        }
        
        performanceMonitor.endTiming('projectSelect');
    }

    async onProjectDelete(projectId) {
        if (confirm('Apakah Anda yakin ingin menghapus proyek ini?')) {
            const success = this.components.projectList.deleteProject(projectId);
            if (success) {
                this.showSuccess('Proyek berhasil dihapus');
                this.updateProjectCount();
                
                // Render empty workspace if no projects left
                if (projectStorage.getAllProjects().length === 0) {
                    this.renderEmptyWorkspace();
                }
            } else {
                this.showError('Gagal menghapus proyek');
            }
        }
    }

    async renderWorkspace(project) {
        const workspaceContent = document.getElementById('workspace-content');
        
        // Show skeleton while loading
        this.showWorkspaceSkeleton();
        
        try {
            // Determine current state based on project data
            this.currentState = this.determineProjectState(project);
            
            // Render based on state
            switch (this.currentState) {
                case APP_STATES.UPLOADER:
                    await this.renderUploaderView(project);
                    break;
                case APP_STATES.POST_EXTRACTION:
                    await this.renderPostExtractionView(project);
                    break;
                case APP_STATES.ANALYSIS:
                    await this.renderAnalysisView(project);
                    break;
                case APP_STATES.EDITOR:
                    await this.renderEditorView(project);
                    break;
            }
            
            this.hideWorkspaceSkeleton();
        } catch (error) {
            console.error('Error rendering workspace:', error);
            this.showError('Gagal memuat workspace');
            this.hideWorkspaceSkeleton();
        }
    }

    determineProjectState(project) {
        if (project.analysisResult?.analisis_zona?.length > 0) {
            return APP_STATES.EDITOR;
        }
        if (project.mapFileContent) {
            return APP_STATES.ANALYSIS;
        }
        if (project.analysisResult?.pemohon?.nama) {
            return APP_STATES.POST_EXTRACTION;
        }
        return APP_STATES.UPLOADER;
    }

    async renderUploaderView(project) {
        const content = `
            <h3>Proyek: ${project.projectName}</h3>
            <p class="text-muted">Langkah 1: Unggah Data Peta Lahan</p>
            <div class="uploader-component" id="file-uploader"></div>
        `;
        
        document.getElementById('workspace-content').innerHTML = content;
        
        // Initialize file uploader component
        await this.initializeFileUploader(project);
    }

    async renderPostExtractionView(project) {
        const data = project.analysisResult;
        const content = `
            <h3>Proyek: ${project.projectName}</h3>
            <div class="alert alert-info"><i class="bi bi-info-circle-fill"></i> Data berikut diekstrak oleh AI. Harap verifikasi kebenarannya sebelum melanjutkan.</div>
            <div class="card mb-3">
                <div class="card-body">
                    <h5>Data Pemohon & Surat</h5>
                    <div class="row">
                        <div class="col-md-6 mb-3"><label class="form-label">Nama Pemohon</label><input type="text" class="form-control" data-path="pemohon.nama" value="${data.pemohon?.nama || ''}"></div>
                        <div class="col-md-6 mb-3"><label class="form-label">Jabatan</label><input type="text" class="form-control" data-path="pemohon.jabatan" value="${data.pemohon?.jabatan || ''}"></div>
                        <div class="col-md-6 mb-3"><label class="form-label">Nomor Surat Pemohon</label><input type="text" class="form-control" data-path="surat_pemohon.nomor" value="${data.surat_pemohon?.nomor || ''}"></div>
                        <div class="col-md-6 mb-3"><label class="form-label">Tanggal Surat Pemohon</label><input type="date" class="form-control" data-path="surat_pemohon.tanggal" value="${data.surat_pemohon?.tanggal || ''}"></div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <h5>Data Lokasi & Peruntukan</h5>
                    <div class="row">
                        <div class="col-12 mb-3"><label class="form-label">Alamat Lengkap Lokasi</label><textarea class="form-control" data-path="lokasi_proyek.lokasi" rows="3">${data.lokasi_proyek?.lokasi || ''}</textarea></div>
                        <div class="col-12 mb-3"><label class="form-label">Peruntukan Pembangunan</label><input type="text" class="form-control" data-path="lokasi_proyek.peruntukan" value="${data.lokasi_proyek?.peruntukan || ''}"></div>
                    </div>
                </div>
            </div>
            <div id="uploader-container" class="mt-4">
                <h4 class="mt-4">Langkah 2: Unggah Peta Lahan</h4>
                <div class="uploader-component" id="file-uploader"></div>
            </div>
        `;
        
        document.getElementById('workspace-content').innerHTML = content;
        
        // Bind form events
        this.bindFormEvents(project);
        
        // Initialize file uploader
        await this.initializeFileUploader(project);
    }

    async renderAnalysisView(project) {
        const content = `
            <h3>Proyek: ${project.projectName}</h3>
            <p class="text-muted">Langkah 2: Visualisasi Peta & Lakukan Analisis</p>
            <div class="card"><div class="card-body"><h5 class="card-title">Peta Lokasi</h5><div id="map"></div></div></div>
            <div id="geojson-data-container" class="mt-4"></div>
            <div class="step-navigation">
                <button class="btn btn-secondary" id="back-to-uploader-btn"><i class="bi bi-arrow-left"></i> Ganti File Peta</button>
                <button class="btn btn-primary btn-lg" id="analyze-btn">Lanjutkan ke Analisis AI <i class="bi bi-arrow-right"></i></button>
            </div>
        `;
        
        document.getElementById('workspace-content').innerHTML = content;
        
        // Initialize map
        await this.initializeMap();
        
        // Display GeoJSON data
        if (project.geojsonData) {
            await this.components.map.displayGeoJSON(project.geojsonData);
            this.displayGeoJsonProperties(project.geojsonData);
        }
        
        // Bind events
        document.getElementById('analyze-btn').onclick = () => this.handleAIAnalysis(project);
        document.getElementById('back-to-uploader-btn').onclick = () => {
            project.geojsonData = null;
            project.mapFileContent = null;
            projectStorage.updateProject(project.id, project);
            this.renderWorkspace(project);
        };
    }

    async renderEditorView(project) {
        const data = project.analysisResult;
        const content = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>Proyek: ${project.projectName}</h3>
                <div>
                    <button class="btn btn-outline-info btn-sm" data-action="summarize-analysis" title="Minta AI untuk meringkas hasil analisis"><i class="bi bi-card-text"></i> ✨ Ringkas Analisis</button>
                    <button class="btn btn-outline-warning btn-sm" data-action="identify-issues" title="Minta AI untuk mengidentifikasi potensi masalah"><i class="bi bi-exclamation-triangle"></i> ✨ Identifikasi Masalah</button>
                    <button class="btn btn-outline-success" id="manual-save-btn"><i class="bi bi-save-fill"></i> Simpan Proyek</button>
                    <button class="btn btn-primary" id="preview-document-btn"><i class="bi bi-eye-fill"></i> Preview Dokumen</button>
                </div>
            </div>
            <p class="text-muted">Langkah 3: Edit Hasil Analisis & Generate Surat</p>
            <div class="accordion" id="editorAccordion">
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMap">Peta Lokasi Lahan</button>
                    </h2>
                    <div id="collapseMap" class="accordion-collapse collapse show" data-bs-parent="#editorAccordion">
                        <div class="accordion-body p-2"><div id="map"></div></div>
                    </div>
                </div>
                <!-- Add more accordion items for form sections -->
            </div>
        `;
        
        document.getElementById('workspace-content').innerHTML = content;
        
        // Initialize map
        await this.initializeMap();
        
        // Display map data
        if (project.geojsonData) {
            await this.components.map.displayGeoJSON(project.geojsonData);
        }
        
        // Bind events
        this.bindEditorEvents(project);
    }

    async initializeFileUploader(project) {
        const uploaderContainer = document.getElementById('file-uploader');
        if (!uploaderContainer) return;
        
        this.components.fileUploader = new FileUploaderComponent(
            uploaderContainer,
            (fileData, file) => this.onFileUploaded(project, fileData, file)
        );
    }

    async initializeMap() {
        if (!this.components.map) {
            this.components.map = new MapComponent('map');
        }
        return this.components.map;
    }

    async onFileUploaded(project, fileData, file) {
        try {
            // Handle different file types
            if (fileData.type === 'geojson') {
                project.geojsonData = fileData.data;
                project.mapFileContent = fileData;
            } else {
                project.mapFileContent = fileData;
            }
            
            projectStorage.updateProject(project.id, project);
            
            // Refresh workspace
            await this.renderWorkspace(project);
            
            this.showSuccess('File berhasil diunggah');
        } catch (error) {
            console.error('Error handling file upload:', error);
            this.showError('Gagal memproses file');
        }
    }

    async handleAIAnalysis(project) {
        if (!aiIntegration.isConfigured()) {
            this.showError('Kunci API Gemini belum diatur. Harap atur di menu Pengaturan.');
            return;
        }

        try {
            this.showSpinner('Menganalisis data dengan AI...');

            const referenceText = settingsStorage.get('perdaRTRW', '');
            const analysisResult = await aiIntegration.analyzeMapData(
                project.geojsonData,
                project.analysisResult || {},
                [referenceText]
            );

            // Validate with Perda and enhance analysis
            const validationResult = await aiIntegration.validateWithPerda(analysisResult, project);
            
            // Merge with existing data
            project.analysisResult = {
                ...project.analysisResult,
                ...validationResult.enhanced_analysis,
                perda_validation: validationResult.perda_validation
            };

            projectStorage.updateProject(project.id, project);
            
            this.hideSpinner();
            await this.renderWorkspace(project);
            
            // Show enhanced success message with compliance info
            const complianceScore = validationResult.perda_validation.compliance_score || 0;
            const complianceMessage = complianceScore >= 80 
                ? `Analisis AI selesai - Compliance Score: ${complianceScore.toFixed(1)}% ✅`
                : complianceScore >= 60
                ? `Analisis AI selesai - Compliance Score: ${complianceScore.toFixed(1)}% ⚠️`
                : `Analisis AI selesai - Compliance Score: ${complianceScore.toFixed(1)}% ❌`;
                
            this.showSuccess(complianceMessage);

        } catch (error) {
            this.hideSpinner();
            console.error('AI Analysis error:', error);
            this.showError(`Gagal melakukan analisis: ${error.message}`);
        }
    }

    bindFormEvents(project) {
        const workspaceContent = document.getElementById('workspace-content');
        workspaceContent.addEventListener('input', (e) => {
            if (e.target.dataset.path) {
                this.setPropertyByPath(project.analysisResult, e.target.dataset.path, e.target.value);
                projectStorage.updateProject(project.id, project);
            }
        });
    }

    bindEditorEvents(project) {
        // Manual save button
        document.getElementById('manual-save-btn')?.addEventListener('click', () => {
            projectStorage.updateProject(project.id, project);
            this.showSuccess('Proyek berhasil disimpan');
        });

        // Preview document button
        document.getElementById('preview-document-btn')?.addEventListener('click', () => {
            this.showDocumentPreview(project);
        });

        // AI action buttons
        document.addEventListener('click', async (e) => {
            if (e.target.matches('[data-action="summarize-analysis"]')) {
                await this.handleAISummary(project, 'summarize');
            } else if (e.target.matches('[data-action="identify-issues"]')) {
                await this.handleAISummary(project, 'identify-issues');
            }
        });
        
        // Add feedback buttons for AI results
        this.addAIFeedbackButtons(project);
    }

    async handleAISummary(project, action) {
        if (!aiIntegration.isConfigured()) {
            this.showError('Kunci API Gemini belum diatur');
            return;
        }

        try {
            // Create and show AI summary modal
            await modalManager.createAISummaryModal();
            modalManager.showModal('aiSummary');

            const result = await aiIntegration.generateAnalysisSummary(project.analysisResult, action);
            
            const summaryContent = document.getElementById('ai-summary-content');
            if (summaryContent) {
                summaryContent.innerHTML = `
                    <div class="analysis-summary">${result.replace(/\n/g, '<br>')}</div>
                    <div class="mt-3 text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="aiFeedbackUI.showFeedbackModal('${action === 'summarize' ? 'analysis_summary' : 'issue_identification'}')">
                            <i class="bi bi-star"></i> Beri Feedback
                        </button>
                    </div>
                `;
            }

        } catch (error) {
            console.error('AI Summary error:', error);
            this.showError(`Gagal membuat ${action === 'summarize' ? 'ringkasan' : 'identifikasi masalah'}`);
        }
    }

    async showDocumentPreview(project) {
        try {
            // Generate preview HTML
            const previewHTML = documentGenerator.generatePreviewHTML(project);
            
            // Create and show preview modal
            await modalManager.createPreviewModal();
            
            const previewContent = document.getElementById('preview-content');
            if (previewContent) {
                previewContent.innerHTML = previewHTML;
            }
            
            modalManager.showModal('preview');

        } catch (error) {
            console.error('Preview error:', error);
            this.showError('Gagal membuat preview dokumen');
        }
    }

    displayGeoJsonProperties(geojsonData) {
        const container = document.getElementById('geojson-data-container');
        if (!container || !geojsonData || !geojsonData.features) {
            if (container) container.innerHTML = '';
            return;
        }

        let content = '<h5>Data Atribut Peta</h5>';
        geojsonData.features.forEach((feature, index) => {
            content += `<div class="card mb-3"><div class="card-header"><strong>Fitur #${index + 1}</strong></div><div class="card-body"><table class="table table-sm table-bordered"><tbody>`;
            if (Object.keys(feature.properties || {}).length > 0) {
                for (const key in feature.properties) {
                    content += `<tr><td>${key}</td><td>${feature.properties[key]}</td></tr>`;
                }
            } else {
                content += '<tr><td colspan="2" class="text-muted">Tidak ada data atribut pada fitur ini.</td></tr>';
            }
            content += `</tbody></table></div></div>`;
        });
        container.innerHTML = content;
    }

    setPropertyByPath(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    addAIFeedbackButtons(project) {
        // Add feedback buttons to AI-generated content
        setTimeout(() => {
            // Add feedback to analysis results if they exist
            if (project.analysisResult && project.analysisResult.extraction_metadata) {
                this.addFeedbackToExtractionResults();
            }
            
            if (project.analysisResult && project.analysisResult.analysis_metadata) {
                this.addFeedbackToAnalysisResults();
            }
        }, 1000);
    }

    addFeedbackToExtractionResults() {
        const extractionSections = document.querySelectorAll('[data-path]');
        if (extractionSections.length > 0 && !document.querySelector('.extraction-feedback-btn')) {
            const firstSection = extractionSections[0].closest('.card');
            if (firstSection) {
                const feedbackBtn = document.createElement('button');
                feedbackBtn.className = 'btn btn-sm btn-outline-primary extraction-feedback-btn mt-2';
                feedbackBtn.innerHTML = '<i class="bi bi-star"></i> Feedback Ekstraksi AI';
                feedbackBtn.onclick = () => aiFeedbackUI.showFeedbackModal('document_extraction');
                
                firstSection.querySelector('.card-body').appendChild(feedbackBtn);
            }
        }
    }

    addFeedbackToAnalysisResults() {
        const analysisContainer = document.getElementById('geojson-data-container');
        if (analysisContainer && !document.querySelector('.analysis-feedback-btn')) {
            const feedbackBtn = document.createElement('button');
            feedbackBtn.className = 'btn btn-sm btn-outline-primary analysis-feedback-btn mt-2';
            feedbackBtn.innerHTML = '<i class="bi bi-star"></i> Feedback Analisis AI';
            feedbackBtn.onclick = () => aiFeedbackUI.showFeedbackModal('map_analysis');
            
            analysisContainer.appendChild(feedbackBtn);
        }
    }

    renderEmptyWorkspace() {
        const content = `
            <div class="text-center d-flex flex-column align-items-center justify-content-center h-100">
                <i class="bi bi-files text-muted" style="font-size: 4rem;"></i>
                <h3 class="mt-3">Selamat Datang di Aplikasi Generator KRK</h3>
                <p class="lead">Buat proyek baru atau pilih dari daftar untuk memulai.</p>
                <div class="mt-3">
                    <button class="btn btn-primary btn-lg" onclick="app.showCreateProjectModal()">
                        <i class="bi bi-rocket-takeoff"></i> Mulai Cepat
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('workspace-content').innerHTML = content;
    }

    showWorkspaceSkeleton() {
        document.getElementById('workspace-skeleton').classList.remove('d-none');
        document.getElementById('workspace-content').classList.add('d-none');
    }

    hideWorkspaceSkeleton() {
        document.getElementById('workspace-skeleton').classList.add('d-none');
        document.getElementById('workspace-content').classList.remove('d-none');
    }

    updateProjectCount() {
        const count = projectStorage.getAllProjects().length;
        const countElement = document.getElementById('project-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    async showCreateProjectModal() {
        await modalManager.createCreateProjectModal();
        modalManager.showModal('createProject');
    }

    async refreshProjectList() {
        this.components.projectList.refresh();
        this.updateProjectCount();
    }

    showSpinner(text = 'Memproses...') {
        modalManager.showSpinner(text);
    }

    hideSpinner() {
        modalManager.hideSpinner();
    }

    setupPerformanceMonitoring() {
        // Monitor performance metrics
        setInterval(() => {
            const stats = this.getPerformanceStats();
            if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
                console.warn('High memory usage detected');
            }
        }, 30000);
    }

    getPerformanceStats() {
        const memory = performance.memory || {};
        const cacheStats = globalCache.getStats();
        const storageStats = projectStorage.getStorageStats();
        
        return {
            memoryUsage: memory.usedJSHeapSize || 0,
            cacheStats,
            storageStats,
            timestamp: Date.now()
        };
    }

    showPerformanceStats() {
        const stats = this.getPerformanceStats();
        // Implementation for performance stats modal
        console.log('Performance Stats:', stats);
    }

    setupSettingsHandlers() {
        // Settings modal event handlers
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });
    }

    saveSettings() {
        // Implementation for saving settings
        this.showSuccess('Pengaturan berhasil disimpan');
    }

    initializeToasts() {
        this.toasts = {
            success: new bootstrap.Toast(document.getElementById('saveToast')),
            error: new bootstrap.Toast(document.getElementById('errorToast')),
            info: new bootstrap.Toast(document.getElementById('infoToast'))
        };
    }

    showSuccess(message) {
        document.getElementById('saveToastBody').textContent = message;
        this.toasts.success.show();
    }

    showError(message) {
        document.getElementById('errorToastBody').textContent = message;
        this.toasts.error.show();
    }

    showInfo(message) {
        document.getElementById('infoToastBody').textContent = message;
        this.toasts.info.show();
    }

    // Cleanup method
    destroy() {
        // Cleanup components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // Cleanup performance monitoring
        performanceMonitor.disconnect();
        
        // Clear caches
        globalCache.clear();
    }
}

// Initialize application when DOM is ready
const app = new KRKApplication();

// Make app globally available for debugging
window.app = app;

// Export for module usage
export default app;
