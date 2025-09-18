/**
 * Modal Manager Component for KRK Generator
 * Centralized modal handling with dynamic creation and management
 */

import { performanceMonitor, lazyLoader } from '../utils/performance.js';
import { projectStorage, settingsStorage } from '../core/storage.js';
import { aiIntegration } from './ai-integration.js';

export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.modalContainer = null;
        this.activeModal = null;
        
        this.init();
    }

    init() {
        // Create modal container if it doesn't exist
        this.modalContainer = document.getElementById('modals-container');
        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modals-container';
            document.body.appendChild(this.modalContainer);
        }

        // Preload critical modals
        this.preloadCriticalModals();
    }

    async preloadCriticalModals() {
        // Load settings modal immediately
        await this.createSettingsModal();
        await this.createCreateProjectModal();
        await this.createDeleteConfirmModal();
    }

    // Settings Modal
    async createSettingsModal() {
        if (this.modals.has('settings')) return this.modals.get('settings');

        const modalHtml = `
            <div class="modal fade" id="settingsModal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="settingsModalLabel">Pengaturan Aplikasi</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="gemini-api-key-input" class="form-label">Kunci API Gemini</label>
                                <p class="form-text">Masukkan Kunci API Google Gemini Anda. Kunci ini disimpan secara lokal di peramban Anda dan tidak akan dibagikan. Anda bisa mendapatkannya dari Google AI Studio.</p>
                                <input type="password" class="form-control" id="gemini-api-key-input" placeholder="Masukkan Kunci API Anda di sini">
                            </div>
                            <div class="mb-3">
                                <label for="gemini-model-select" class="form-label">Versi Model Gemini</label>
                                <select class="form-select" id="gemini-model-select">
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                    <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Terbaru, Direkomendasikan)</option>
                                    <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro (Terbaru)</option>
                                    <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                                </select>
                                <p class="form-text">Pilih model AI yang akan digunakan untuk analisis. 1.5 Flash direkomendasikan untuk kecepatan dan efisiensi.</p>
                            </div>
                            <hr>
                            <div class="mb-3">
                                <label for="perda-rtrw-textarea" class="form-label">Referensi Teks Manual (Perda RTRW)</label>
                                <p class="form-text">Salin-tempel teks Perda atau referensi lainnya ke dalam kotak di bawah ini. Teks ini akan digunakan oleh AI untuk analisis.</p>
                                <textarea class="form-control" id="perda-rtrw-textarea" rows="8"></textarea>
                            </div>
                            <hr>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <label class="form-label mb-0">Dokumen Referensi Pendukung (Untuk AI)</label>
                                    <button class="btn btn-sm btn-outline-secondary" id="upload-reference-btn-wrapper"><i class="bi bi-upload"></i> Unggah Dokumen</button>
                                    <input type="file" id="reference-file-input" class="d-none" multiple accept=".pdf,.txt,.docx,.xls,.xlsx,.png,.jpg,.jpeg">
                                </div>
                                <p class="form-text">Unggah satu atau lebih dokumen referensi (Perda, Excel, Gambar, dll.). Konten dari file-file ini akan digunakan oleh AI sebagai bahan analisis.</p>
                                <ul class="list-group" id="reference-doc-list">
                                    <!-- Reference documents will be listed here -->
                                </ul>
                            </div>
                            <hr>
                            <h5>Manajemen Data</h5>
                            <button class="btn btn-success me-2" id="export-data-btn"><i class="bi bi-download"></i> Ekspor Semua Data</button>
                            <button class="btn btn-info" id="import-data-btn-wrapper"><i class="bi bi-upload"></i> Impor Data</button>
                            <input type="file" id="import-data-input" class="d-none" accept=".json">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                            <button type="button" class="btn btn-primary" id="save-settings-btn">Simpan</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = this.createModalFromHTML(modalHtml, 'settings');
        this.bindSettingsModalEvents(modal);
        this.loadSettingsData();
        
        return modal;
    }

    // Create Project Choice Modal
    async createCreateProjectModal() {
        if (this.modals.has('createProject')) return this.modals.get('createProject');

        const modalHtml = `
            <div class="modal fade" id="createProjectChoiceModal" tabindex="-1" aria-labelledby="createProjectChoiceModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="createProjectChoiceModalLabel">Pilih Metode Pembuatan Proyek</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Bagaimana Anda ingin memulai?</p>
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary" id="create-blank-project-btn"><i class="bi bi-file-earmark-plus"></i> Buat Proyek Kosong</button>
                            </div>
                            <hr>
                            <p class="mt-3">Atau, mulai dengan AI untuk mengekstrak data dari surat permohonan:</p>
                            <label for="extraction-file-input" class="form-label">Unggah Surat (.pdf, .png, .jpg)</label>
                            <input class="form-control" type="file" id="extraction-file-input" accept=".pdf,.png,.jpg,.jpeg">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Add Project Name Modal -->
            <div class="modal fade" id="addProjectModal" tabindex="-1" aria-labelledby="addProjectModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addProjectModalLabel">Buat Proyek Baru</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="add-project-form" novalidate>
                                <div class="mb-3">
                                    <label for="project-name-input" class="form-label">Nama Proyek</label>
                                    <input type="text" class="form-control" id="project-name-input" required>
                                    <div class="invalid-feedback">Nama proyek tidak boleh kosong.</div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-primary" id="save-project-btn">Simpan</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = this.createModalFromHTML(modalHtml, 'createProject');
        this.bindCreateProjectModalEvents(modal);
        
        return modal;
    }

    // Delete Confirmation Modal
    async createDeleteConfirmModal() {
        if (this.modals.has('deleteConfirm')) return this.modals.get('deleteConfirm');

        const modalHtml = `
            <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="deleteConfirmModalLabel">Konfirmasi Hapus Proyek</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Apakah Anda yakin ingin menghapus proyek "<span id="delete-project-name"></span>"? Tindakan ini tidak dapat dibatalkan.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-danger" id="confirm-delete-btn">Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = this.createModalFromHTML(modalHtml, 'deleteConfirm');
        this.bindDeleteConfirmModalEvents(modal);
        
        return modal;
    }

    // AI Chat Modal
    async createAIChatModal() {
        if (this.modals.has('aiChat')) return this.modals.get('aiChat');

        const modalHtml = `
            <div class="modal fade" id="perdaChatModal" tabindex="-1" aria-labelledby="perdaChatModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="perdaChatModalLabel"><i class="bi bi-chat-quote-fill me-2"></i>Tanya Ahli Perda</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="form-text">Ajukan pertanyaan tentang Perda RTRW yang telah Anda masukkan di pengaturan.</p>
                            <div id="perda-chat-history">
                                <div class="chat-bubble ai">Halo! Silakan ajukan pertanyaan mengenai Perda RTRW yang tersedia.</div>
                            </div>
                            <div id="ai-thinking-indicator" class="ai-thinking-indicator d-none">
                                <div class="spinner-grow spinner-grow-sm text-primary" role="status">
                                  <span class="visually-hidden">Loading...</span>
                                </div>
                                <span class="ms-2 text-muted">AI sedang berpikir...</span>
                            </div>
                            <div class="input-group mt-3">
                                <input type="text" id="perda-chat-input" class="form-control" placeholder="Ketik pertanyaan Anda di sini...">
                                <button class="btn btn-primary" id="perda-chat-send"><i class="bi bi-send-fill"></i> Kirim</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = this.createModalFromHTML(modalHtml, 'aiChat');
        this.bindAIChatModalEvents(modal);
        
        return modal;
    }

    // AI Summary Modal
    async createAISummaryModal() {
        if (this.modals.has('aiSummary')) return this.modals.get('aiSummary');

        const modalHtml = `
            <div class="modal fade" id="aiSummaryModal" tabindex="-1" aria-labelledby="aiSummaryModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="aiSummaryModalLabel">✨ Ringkasan / Potensi Masalah dari AI</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="ai-summary-content">
                                <div class="d-flex justify-content-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = this.createModalFromHTML(modalHtml, 'aiSummary');
        return modal;
    }

    // Preview Modal
    async createPreviewModal() {
        if (this.modals.has('preview')) return this.modals.get('preview');

        const modalHtml = `
            <div class="modal fade" id="previewModal" tabindex="-1" aria-labelledby="previewModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="previewModalLabel">Pratinjau Dokumen</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="preview-content" class="p-4 border bg-white" style="min-height: 500px;"></div>
                        </div>
                        <div class="modal-footer justify-content-between">
                            <button class="btn btn-warning" id="edit-surat-btn"><i class="bi bi-pencil-square"></i> Kembali untuk Mengedit</button>
                            <div>
                                <button type="button" class="btn btn-secondary" id="print-pdf-btn"><i class="bi bi-printer-fill"></i> Cetak/Simpan PDF</button>
                                <button type="button" class="btn btn-info" id="download-map-btn"><i class="bi bi-image"></i> Unduh Lampiran Peta (.png)</button>
                                <button type="button" class="btn btn-success" id="download-docx-btn"><i class="bi bi-file-earmark-word-fill"></i> Unduh Surat (.docx)</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = this.createModalFromHTML(modalHtml, 'preview');
        this.bindPreviewModalEvents(modal);
        
        return modal;
    }

    // Helper method to create modal from HTML
    createModalFromHTML(html, modalId) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Append all modal elements to container
        while (tempDiv.firstChild) {
            this.modalContainer.appendChild(tempDiv.firstChild);
        }
        
        // Create Bootstrap modal instances
        const modalElements = this.modalContainer.querySelectorAll('.modal');
        const modals = {};
        
        modalElements.forEach(modalEl => {
            const id = modalEl.id;
            modals[id] = new bootstrap.Modal(modalEl);
        });
        
        this.modals.set(modalId, modals);
        return modals;
    }

    // Event binding methods
    bindSettingsModalEvents(modals) {
        const saveBtn = document.getElementById('save-settings-btn');
        const exportBtn = document.getElementById('export-data-btn');
        const importBtn = document.getElementById('import-data-btn-wrapper');
        const importInput = document.getElementById('import-data-input');

        saveBtn?.addEventListener('click', () => this.handleSaveSettings());
        exportBtn?.addEventListener('click', () => this.handleExportData());
        importBtn?.addEventListener('click', () => importInput.click());
        importInput?.addEventListener('change', (e) => this.handleImportData(e));
    }

    bindCreateProjectModalEvents(modals) {
        const createBlankBtn = document.getElementById('create-blank-project-btn');
        const extractionInput = document.getElementById('extraction-file-input');
        const saveProjectBtn = document.getElementById('save-project-btn');
        const projectForm = document.getElementById('add-project-form');

        createBlankBtn?.addEventListener('click', () => this.handleCreateBlankProject());
        extractionInput?.addEventListener('change', (e) => this.handleFileExtraction(e));
        saveProjectBtn?.addEventListener('click', () => this.handleSaveNewProject());
        projectForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveNewProject();
        });
    }

    bindDeleteConfirmModalEvents(modals) {
        const confirmBtn = document.getElementById('confirm-delete-btn');
        confirmBtn?.addEventListener('click', () => this.handleConfirmDelete());
    }

    bindAIChatModalEvents(modals) {
        const sendBtn = document.getElementById('perda-chat-send');
        const chatInput = document.getElementById('perda-chat-input');

        sendBtn?.addEventListener('click', () => this.handlePerdaChat());
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handlePerdaChat();
            }
        });
    }

    bindPreviewModalEvents(modals) {
        const editBtn = document.getElementById('edit-surat-btn');
        const printBtn = document.getElementById('print-pdf-btn');
        const downloadMapBtn = document.getElementById('download-map-btn');
        const downloadDocxBtn = document.getElementById('download-docx-btn');

        editBtn?.addEventListener('click', () => this.hideModal('preview'));
        printBtn?.addEventListener('click', () => window.print());
        downloadMapBtn?.addEventListener('click', () => this.handleDownloadMap());
        downloadDocxBtn?.addEventListener('click', () => this.handleDownloadDocx());
    }

    // Event handlers
    handleSaveSettings() {
        const apiKey = document.getElementById('gemini-api-key-input').value;
        const model = document.getElementById('gemini-model-select').value;
        const perdaText = document.getElementById('perda-rtrw-textarea').value;

        settingsStorage.update({
            geminiApiKey: apiKey,
            geminiModel: model,
            perdaRTRW: perdaText
        });

        aiIntegration.updateSettings(apiKey, model);
        
        this.hideModal('settings');
        this.showToast('success', 'Pengaturan berhasil disimpan');
    }

    handleCreateBlankProject() {
        this.hideModal('createProject');
        
        const projectNameInput = document.getElementById('project-name-input');
        projectNameInput.value = `Proyek KRK ${new Date().toLocaleDateString()}`;
        
        this.showModal('addProject');
        setTimeout(() => projectNameInput.focus(), 500);
    }

    async handleFileExtraction(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!aiIntegration.isConfigured()) {
            this.showToast('error', 'Kunci API Gemini belum diatur. Harap atur di menu Pengaturan.');
            return;
        }

        this.hideModal('createProject');
        this.showSpinner('Mengekstrak data dari file dengan AI...');

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Data = e.target.result.split(',')[1];
                const extractedData = await aiIntegration.extractDataFromDocument(base64Data, file.type, file.name);
                
                const newProject = {
                    projectName: `Proyek dari ${file.name.substring(0, 30)}`,
                    geojsonData: null,
                    mapFileContent: null,
                    analysisResult: extractedData
                };

                const success = projectStorage.addProject(newProject);
                if (success) {
                    this.hideSpinner();
                    this.showToast('success', 'Data berhasil diekstrak dan proyek dibuat');
                    // Trigger app refresh
                    window.app?.onProjectSelect(newProject.id);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            this.hideSpinner();
            this.showToast('error', `Gagal mengekstrak data: ${error.message}`);
        }

        event.target.value = '';
    }

    handleSaveNewProject() {
        const projectNameInput = document.getElementById('project-name-input');
        const projectName = projectNameInput.value.trim();
        
        if (!projectName) {
            projectNameInput.classList.add('is-invalid');
            return;
        }
        
        projectNameInput.classList.remove('is-invalid');

        const newProject = {
            projectName: projectName,
            geojsonData: null,
            mapFileContent: null,
            analysisResult: null
        };

        const success = projectStorage.addProject(newProject);
        if (success) {
            this.hideModal('addProject');
            this.showToast('success', 'Proyek berhasil dibuat');
            // Trigger app refresh
            window.app?.onProjectSelect(newProject.id);
        }
    }

    handleConfirmDelete() {
        if (this.projectToDelete) {
            const success = projectStorage.deleteProject(this.projectToDelete);
            if (success) {
                this.hideModal('deleteConfirm');
                this.showToast('success', 'Proyek berhasil dihapus');
                // Trigger app refresh
                window.app?.refreshProjectList();
            }
            this.projectToDelete = null;
        }
    }

    async handlePerdaChat() {
        const chatInput = document.getElementById('perda-chat-input');
        const chatHistory = document.getElementById('perda-chat-history');
        const thinkingIndicator = document.getElementById('ai-thinking-indicator');
        
        const question = chatInput.value.trim();
        if (!question) return;

        if (!aiIntegration.isConfigured()) {
            this.showToast('error', 'Kunci API Gemini belum diatur');
            return;
        }

        // Add user message
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.textContent = question;
        chatHistory.appendChild(userBubble);

        // Clear input and show thinking
        chatInput.value = '';
        thinkingIndicator.classList.remove('d-none');

        try {
            const perdaText = settingsStorage.get('perdaRTRW', '');
            const response = await aiIntegration.chatWithPerda(question, perdaText);

            // Add AI response
            const aiBubble = document.createElement('div');
            aiBubble.className = 'chat-bubble ai';
            aiBubble.textContent = response;
            chatHistory.appendChild(aiBubble);

        } catch (error) {
            const errorBubble = document.createElement('div');
            errorBubble.className = 'chat-bubble ai';
            errorBubble.innerHTML = `<em>Maaf, terjadi kesalahan: ${error.message}</em>`;
            chatHistory.appendChild(errorBubble);
        }

        thinkingIndicator.classList.add('d-none');
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Utility methods
    showModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            const modalKeys = Object.keys(modal);
            if (modalKeys.length === 1) {
                modal[modalKeys[0]].show();
            } else {
                // Multiple modals, show the first one
                modal[modalKeys[0]].show();
            }
            this.activeModal = modalId;
        }
    }

    hideModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            const modalKeys = Object.keys(modal);
            modalKeys.forEach(key => {
                modal[key].hide();
            });
            this.activeModal = null;
        }
    }

    async showDeleteConfirm(projectId, projectName) {
        await this.createDeleteConfirmModal();
        
        this.projectToDelete = projectId;
        document.getElementById('delete-project-name').textContent = projectName;
        
        this.showModal('deleteConfirm');
    }

    loadSettingsData() {
        const apiKeyInput = document.getElementById('gemini-api-key-input');
        const modelSelect = document.getElementById('gemini-model-select');
        const perdaTextarea = document.getElementById('perda-rtrw-textarea');

        if (apiKeyInput) apiKeyInput.value = settingsStorage.get('geminiApiKey', '');
        if (modelSelect) modelSelect.value = settingsStorage.get('geminiModel', 'gemini-1.5-flash-latest');
        if (perdaTextarea) perdaTextarea.value = settingsStorage.get('perdaRTRW', '');
    }

    showSpinner(text = 'Memproses...') {
        const spinner = document.getElementById('loading-spinner');
        const spinnerText = document.getElementById('spinner-text');
        
        if (spinner) {
            spinner.classList.remove('d-none');
            if (spinnerText) spinnerText.textContent = text;
        }
    }

    hideSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('d-none');
        }
    }

    showToast(type, message) {
        const toastId = type === 'success' ? 'saveToast' : 
                       type === 'error' ? 'errorToast' : 'infoToast';
        const bodyId = type === 'success' ? 'saveToastBody' : 
                      type === 'error' ? 'errorToastBody' : 'infoToastBody';
        
        const toastEl = document.getElementById(toastId);
        const bodyEl = document.getElementById(bodyId);
        
        if (toastEl && bodyEl) {
            bodyEl.textContent = message;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    }

    // Public API
    getModal(modalId) {
        return this.modals.get(modalId);
    }

    isModalOpen(modalId) {
        return this.activeModal === modalId;
    }

    closeAllModals() {
        this.modals.forEach((modal, modalId) => {
            this.hideModal(modalId);
        });
    }

    destroy() {
        this.closeAllModals();
        this.modals.clear();
        if (this.modalContainer) {
            this.modalContainer.innerHTML = '';
        }
    }
}

// Create singleton instance
export const modalManager = new ModalManager();
