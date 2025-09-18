/**
 * AI Feedback UI Component
 * User interface for AI feedback and performance monitoring
 */

import { aiIntegration } from './ai-integration.js';
import { aiPromptEngine } from './ai-prompt-engine.js';
import { performanceMonitor } from '../utils/performance.js';

export class AIFeedbackUI {
    constructor() {
        this.feedbackModal = null;
        this.statsPanel = null;
        this.currentRequestId = null;
        this.currentPromptType = null;
        
        this.init();
    }

    init() {
        this.createFeedbackModal();
        this.createStatsPanel();
        this.bindEvents();
    }

    // Create feedback modal
    createFeedbackModal() {
        const modalHtml = `
            <div class="modal fade" id="aiFeedbackModal" tabindex="-1" aria-labelledby="aiFeedbackModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="aiFeedbackModalLabel">
                                <i class="bi bi-star-fill text-warning"></i> Berikan Feedback AI
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-muted">Bantu kami meningkatkan kualitas AI dengan memberikan feedback:</p>
                            
                            <div class="mb-3">
                                <label class="form-label">Seberapa akurat hasil AI?</label>
                                <div class="rating-buttons">
                                    <button type="button" class="btn btn-outline-success rating-btn" data-rating="excellent">
                                        <i class="bi bi-emoji-smile-fill"></i> Sangat Baik
                                    </button>
                                    <button type="button" class="btn btn-outline-primary rating-btn" data-rating="good">
                                        <i class="bi bi-emoji-neutral-fill"></i> Baik
                                    </button>
                                    <button type="button" class="btn btn-outline-warning rating-btn" data-rating="fair">
                                        <i class="bi bi-emoji-frown-fill"></i> Cukup
                                    </button>
                                    <button type="button" class="btn btn-outline-danger rating-btn" data-rating="poor">
                                        <i class="bi bi-emoji-angry-fill"></i> Kurang
                                    </button>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="feedbackComment" class="form-label">Komentar (Opsional)</label>
                                <textarea class="form-control" id="feedbackComment" rows="3" 
                                          placeholder="Berikan saran atau komentar untuk perbaikan..."></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="allowDataCollection">
                                    <label class="form-check-label" for="allowDataCollection">
                                        Izinkan penggunaan feedback untuk peningkatan AI
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-primary" id="submitFeedbackBtn" disabled>
                                <i class="bi bi-send-fill"></i> Kirim Feedback
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.feedbackModal = new bootstrap.Modal(document.getElementById('aiFeedbackModal'));
    }

    // Create stats panel
    createStatsPanel() {
        const panelHtml = `
            <div class="ai-stats-panel d-none" id="aiStatsPanel">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                            <i class="bi bi-graph-up"></i> Statistik AI
                        </h6>
                        <div>
                            <button class="btn btn-sm btn-outline-secondary" id="refreshStatsBtn">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" id="closeStatsBtn">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="aiStatsContent">
                            <div class="text-center">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="small mt-2">Memuat statistik...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.insertAdjacentHTML('beforeend', panelHtml);
        
        // Add CSS for positioning
        const style = document.createElement('style');
        style.textContent = `
            .ai-stats-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                z-index: 1050;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .rating-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.5rem;
            }
            
            .rating-btn.active {
                background-color: var(--bs-primary);
                color: white;
                border-color: var(--bs-primary);
            }
            
            .ai-accuracy-meter {
                height: 8px;
                background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%);
                border-radius: 4px;
                position: relative;
                overflow: hidden;
            }
            
            .ai-accuracy-indicator {
                position: absolute;
                top: -2px;
                width: 4px;
                height: 12px;
                background: #000;
                border-radius: 2px;
                transform: translateX(-50%);
            }
        `;
        document.head.appendChild(style);
    }

    // Bind events
    bindEvents() {
        // Rating button events
        document.addEventListener('click', (e) => {
            if (e.target.matches('.rating-btn') || e.target.closest('.rating-btn')) {
                const btn = e.target.closest('.rating-btn');
                const rating = btn.dataset.rating;
                
                // Update button states
                document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Enable submit button
                document.getElementById('submitFeedbackBtn').disabled = false;
            }
        });

        // Submit feedback
        document.getElementById('submitFeedbackBtn')?.addEventListener('click', () => {
            this.submitFeedback();
        });

        // Stats panel events
        document.getElementById('refreshStatsBtn')?.addEventListener('click', () => {
            this.refreshStats();
        });

        document.getElementById('closeStatsBtn')?.addEventListener('click', () => {
            this.hideStatsPanel();
        });

        // Auto-show feedback after AI operations
        this.setupAutoFeedback();
    }

    // Show feedback modal
    showFeedbackModal(promptType, requestId = null) {
        this.currentPromptType = promptType;
        this.currentRequestId = requestId || this.generateRequestId();
        
        // Update modal title based on prompt type
        const titles = {
            'document_extraction': 'Feedback Ekstraksi Dokumen',
            'map_analysis': 'Feedback Analisis Peta',
            'perda_chat': 'Feedback Chat Perda',
            'analysis_summary': 'Feedback Ringkasan Analisis',
            'issue_identification': 'Feedback Identifikasi Masalah'
        };
        
        const modalTitle = document.getElementById('aiFeedbackModalLabel');
        modalTitle.innerHTML = `<i class="bi bi-star-fill text-warning"></i> ${titles[promptType] || 'Berikan Feedback AI'}`;
        
        // Reset form
        this.resetFeedbackForm();
        
        // Show modal
        this.feedbackModal.show();
    }

    // Submit feedback
    submitFeedback() {
        const selectedRating = document.querySelector('.rating-btn.active')?.dataset.rating;
        const comment = document.getElementById('feedbackComment').value;
        const allowDataCollection = document.getElementById('allowDataCollection').checked;
        
        if (!selectedRating) {
            alert('Silakan pilih rating terlebih dahulu');
            return;
        }

        try {
            // Submit to AI integration
            const success = aiIntegration.provideFeedback(
                this.currentPromptType,
                this.currentRequestId,
                selectedRating,
                comment
            );

            if (success) {
                // Show success message
                this.showFeedbackSuccess();
                
                // Hide modal
                this.feedbackModal.hide();
                
                // Update stats if panel is visible
                if (!document.getElementById('aiStatsPanel').classList.contains('d-none')) {
                    this.refreshStats();
                }
            } else {
                throw new Error('Failed to submit feedback');
            }

        } catch (error) {
            console.error('Feedback submission error:', error);
            alert('Gagal mengirim feedback. Silakan coba lagi.');
        }
    }

    // Show stats panel
    showStatsPanel() {
        const panel = document.getElementById('aiStatsPanel');
        panel.classList.remove('d-none');
        this.refreshStats();
    }

    // Hide stats panel
    hideStatsPanel() {
        document.getElementById('aiStatsPanel').classList.add('d-none');
    }

    // Refresh stats
    async refreshStats() {
        const content = document.getElementById('aiStatsContent');
        
        try {
            const stats = aiIntegration.getStats();
            const diagnostics = aiIntegration.runDiagnostics();
            
            content.innerHTML = this.renderStatsContent(stats, diagnostics);
            
        } catch (error) {
            console.error('Error refreshing stats:', error);
            content.innerHTML = `
                <div class="text-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Error loading stats: ${error.message}
                </div>
            `;
        }
    }

    // Render stats content
    renderStatsContent(stats, diagnostics) {
        const overallAccuracy = parseFloat(stats.accuracy.overall) || 0;
        
        return `
            <div class="stats-overview mb-3">
                <div class="row text-center">
                    <div class="col-4">
                        <div class="h5 text-primary mb-0">${stats.performance.totalRequests}</div>
                        <small class="text-muted">Total Requests</small>
                    </div>
                    <div class="col-4">
                        <div class="h5 text-success mb-0">${stats.performance.successRate}</div>
                        <small class="text-muted">Success Rate</small>
                    </div>
                    <div class="col-4">
                        <div class="h5 text-info mb-0">${stats.performance.averageResponseTime}</div>
                        <small class="text-muted">Avg Response</small>
                    </div>
                </div>
            </div>
            
            <div class="accuracy-section mb-3">
                <label class="form-label small">Overall Accuracy: ${stats.accuracy.overall}</label>
                <div class="ai-accuracy-meter">
                    <div class="ai-accuracy-indicator" style="left: ${overallAccuracy}%"></div>
                </div>
            </div>
            
            <div class="prompt-stats">
                <h6 class="small mb-2">Accuracy by Type:</h6>
                ${Object.entries(stats.accuracy.byType).map(([type, data]) => `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small">${this.formatPromptType(type)}</span>
                        <span class="badge bg-${this.getAccuracyBadgeColor(data.success_rate)}">${data.success_rate}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="configuration-info mt-3">
                <h6 class="small mb-2">Configuration:</h6>
                <div class="small text-muted">
                    <div>Model: ${stats.model}</div>
                    <div>API Key: ${stats.isConfigured ? '✓ Configured' : '✗ Not configured'}</div>
                    <div>Cache Size: ${stats.cacheSize} items</div>
                    <div>Queue: ${stats.queueLength} pending</div>
                </div>
            </div>
            
            <div class="actions mt-3">
                <div class="d-grid gap-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="aiFeedbackUI.showDiagnostics()">
                        <i class="bi bi-gear"></i> Show Diagnostics
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="aiFeedbackUI.clearAIData()">
                        <i class="bi bi-trash"></i> Clear AI Data
                    </button>
                </div>
            </div>
        `;
    }

    // Format prompt type for display
    formatPromptType(type) {
        const names = {
            'document_extraction': 'Doc Extraction',
            'map_analysis': 'Map Analysis',
            'perda_chat': 'Perda Chat',
            'analysis_summary': 'Summary',
            'issue_identification': 'Issue ID'
        };
        return names[type] || type;
    }

    // Get badge color based on accuracy
    getAccuracyBadgeColor(successRate) {
        const rate = parseFloat(successRate) || 0;
        if (rate >= 80) return 'success';
        if (rate >= 60) return 'warning';
        return 'danger';
    }

    // Show diagnostics
    showDiagnostics() {
        const diagnostics = aiIntegration.runDiagnostics();
        
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="diagnosticsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">AI Diagnostics</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;">${JSON.stringify(diagnostics, null, 2)}</pre>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="navigator.clipboard.writeText('${JSON.stringify(diagnostics)}')">Copy to Clipboard</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal.querySelector('.modal'));
        bootstrapModal.show();
        
        // Clean up after modal is hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    // Clear AI data
    clearAIData() {
        if (confirm('This will clear all AI data including feedback history. Are you sure?')) {
            const success = aiIntegration.clearAllData();
            if (success) {
                alert('AI data cleared successfully');
                this.refreshStats();
            } else {
                alert('Failed to clear AI data');
            }
        }
    }

    // Setup auto feedback
    setupAutoFeedback() {
        // Show feedback after successful AI operations (with delay)
        const originalCallGeminiAPI = aiIntegration.callGeminiAPI.bind(aiIntegration);
        
        aiIntegration.callGeminiAPI = async function(...args) {
            const result = await originalCallGeminiAPI(...args);
            
            // Show feedback prompt after successful operation (with 30% probability)
            if (Math.random() < 0.3) {
                setTimeout(() => {
                    // Determine prompt type from context
                    const promptType = this.currentPromptType || 'general';
                    window.aiFeedbackUI?.showFeedbackModal(promptType);
                }, 2000);
            }
            
            return result;
        };
    }

    // Helper methods
    resetFeedbackForm() {
        document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('feedbackComment').value = '';
        document.getElementById('allowDataCollection').checked = true;
        document.getElementById('submitFeedbackBtn').disabled = true;
    }

    showFeedbackSuccess() {
        // Create temporary success message
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    Terima kasih atas feedback Anda!
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bootstrapToast = new bootstrap.Toast(toast);
        bootstrapToast.show();
        
        // Remove after hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public API methods
    toggle() {
        const panel = document.getElementById('aiStatsPanel');
        if (panel.classList.contains('d-none')) {
            this.showStatsPanel();
        } else {
            this.hideStatsPanel();
        }
    }

    isVisible() {
        return !document.getElementById('aiStatsPanel').classList.contains('d-none');
    }
}

// Create global instance
export const aiFeedbackUI = new AIFeedbackUI();

// Make available globally for onclick handlers
window.aiFeedbackUI = aiFeedbackUI;
