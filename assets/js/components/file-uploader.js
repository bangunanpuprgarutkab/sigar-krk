/**
 * File Uploader Component with Drag & Drop Support
 * Optimized for large files and multiple formats
 */

import { CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config.js';
import { FileProcessor, performanceMonitor } from '../utils/performance.js';
import { dbManager } from '../core/storage.js';

export class FileUploaderComponent {
    constructor(container, onFileUploaded, options = {}) {
        this.container = container;
        this.onFileUploaded = onFileUploaded;
        this.options = {
            acceptedFormats: CONFIG.SUPPORTED_MAP_FORMATS,
            maxFileSize: CONFIG.MAX_FILE_SIZE,
            allowMultiple: false,
            showProgress: true,
            ...options
        };
        
        this.isUploading = false;
        this.uploadedFiles = [];
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    render() {
        const acceptedFormats = this.options.acceptedFormats.join(', ');
        const maxSizeMB = Math.round(this.options.maxFileSize / (1024 * 1024));
        
        this.container.innerHTML = `
            <div class="uploader-wrapper">
                <div id="file-drop-zone" class="uploader ${this.isUploading ? 'uploading' : ''}">
                    <div class="uploader-content">
                        <i class="bi bi-cloud-arrow-up-fill fs-1 text-muted mb-3"></i>
                        <h5>Unggah File Peta</h5>
                        <p class="text-muted mb-3">
                            Seret & lepas file di sini, atau klik untuk memilih
                        </p>
                        <div class="upload-info small text-muted">
                            <div><strong>Format yang didukung:</strong> ${acceptedFormats}</div>
                            <div><strong>Ukuran maksimal:</strong> ${maxSizeMB}MB</div>
                        </div>
                        <button type="button" class="btn btn-primary mt-3" id="select-file-btn">
                            <i class="bi bi-folder2-open"></i> Pilih File
                        </button>
                    </div>
                    
                    <!-- Progress indicator -->
                    <div id="upload-progress" class="upload-progress d-none">
                        <div class="d-flex align-items-center mb-2">
                            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                            <span id="progress-text">Memproses file...</span>
                        </div>
                        <div class="progress">
                            <div id="progress-bar" class="progress-bar" role="progressbar" style="width: 0%"></div>
                        </div>
                        <div class="small text-muted mt-1" id="progress-details"></div>
                    </div>
                </div>
                
                <!-- File input (hidden) -->
                <input type="file" id="file-input" class="d-none" 
                       accept="${this.options.acceptedFormats.join(',')}"
                       ${this.options.allowMultiple ? 'multiple' : ''}>
                
                <!-- Uploaded files list -->
                <div id="uploaded-files" class="uploaded-files mt-3 d-none">
                    <h6>File yang Diunggah:</h6>
                    <div id="files-list"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const dropZone = this.container.querySelector('#file-drop-zone');
        const fileInput = this.container.querySelector('#file-input');
        const selectBtn = this.container.querySelector('#select-file-btn');

        if (!dropZone) {
            console.error('FileUploader: Drop zone element not found');
            this.showError('Elemen drop zone tidak ditemukan. Periksa struktur HTML.');
            return;
        }

        if (!fileInput) {
            console.error('FileUploader: File input element not found');
            this.showError('Elemen input file tidak ditemukan. Periksa struktur HTML.');
            return;
        }

        if (!selectBtn) {
            console.error('FileUploader: Select button element not found');
            this.showError('Tombol pilih file tidak ditemukan. Periksa struktur HTML.');
            return;
        }

        console.log('FileUploader: Binding events to elements');

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            console.log('FileUploader: Drag over event');
            this.handleDragOver(e);
        });
        dropZone.addEventListener('dragleave', (e) => {
            console.log('FileUploader: Drag leave event');
            this.handleDragLeave(e);
        });
        dropZone.addEventListener('drop', (e) => {
            console.log('FileUploader: Drop event');
            this.handleDrop(e);
        });

        // Click to select
        selectBtn.addEventListener('click', () => {
            console.log('FileUploader: Select button clicked');
            fileInput.click();
        });
        dropZone.addEventListener('click', (e) => {
            console.log('FileUploader: Drop zone clicked');
            if (e.target === dropZone || e.target.closest('.uploader-content')) {
                fileInput.click();
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            console.log('FileUploader: File input changed', e.target.files);
            this.handleFileSelect(e);
        });

        console.log('FileUploader: All events bound successfully');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropZone = e.currentTarget;
        dropZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropZone = e.currentTarget;
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropZone = e.currentTarget;
        dropZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        
        // Reset input
        e.target.value = '';
    }

    async processFiles(files) {
        console.log('FileUploader: Starting to process files', files);

        if (this.isUploading) {
            console.warn('FileUploader: Upload already in progress');
            this.showError('Upload sedang berlangsung. Tunggu hingga selesai.');
            return;
        }

        if (!files || files.length === 0) {
            console.warn('FileUploader: No files provided');
            this.showError('Tidak ada file yang dipilih.');
            return;
        }

        performanceMonitor.startTiming('fileUpload');

        try {
            console.log('FileUploader: Validating files');
            // Validate files
            const validFiles = this.validateFiles(files);
            if (validFiles.length === 0) {
                console.warn('FileUploader: No valid files after validation');
                return;
            }

            console.log('FileUploader: Starting upload process for', validFiles.length, 'files');
            this.isUploading = true;
            this.showProgress();

            // Process files
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                console.log('FileUploader: Processing file', i + 1, 'of', validFiles.length, ':', file.name);
                await this.processFile(file, i, validFiles.length);
            }

            console.log('FileUploader: All files processed successfully');
            this.hideProgress();
            this.isUploading = false;

            performanceMonitor.endTiming('fileUpload');

        } catch (error) {
            console.error('FileUploader: File processing error:', error);
            const errorMessage = error.message || ERROR_MESSAGES.PARSING_ERROR;
            this.showError(`Error: ${errorMessage}`);
            this.hideProgress();
            this.isUploading = false;
            performanceMonitor.endTiming('fileUpload');
        }
    }

    validateFiles(files) {
        const validFiles = [];
        
        for (const file of files) {
            // Check file size
            if (!FileProcessor.validateFileSize(file, this.options.maxFileSize)) {
                this.showError(`File ${file.name} terlalu besar. Maksimal ${Math.round(this.options.maxFileSize / (1024 * 1024))}MB`);
                continue;
            }
            
            // Check file type
            if (!FileProcessor.validateFileType(file, this.options.acceptedFormats)) {
                this.showError(`Format file ${file.name} tidak didukung`);
                continue;
            }
            
            validFiles.push(file);
        }
        
        return validFiles;
    }

    async processFile(file, index, total) {
        const progressText = this.container.querySelector('#progress-text');
        const progressBar = this.container.querySelector('#progress-bar');
        const progressDetails = this.container.querySelector('#progress-details');
        
        // Update progress
        const overallProgress = ((index) / total) * 100;
        progressBar.style.width = `${overallProgress}%`;
        progressText.textContent = `Memproses ${file.name}...`;
        progressDetails.textContent = `File ${index + 1} dari ${total}`;
        
        try {
            let fileData;
            
            // Process based on file type
            if (this.isGeoJSONFile(file)) {
                fileData = await this.processGeoJSONFile(file);
            } else if (this.isImageFile(file)) {
                fileData = await this.processImageFile(file);
            } else {
                fileData = await this.processGenericFile(file);
            }
            
            // Store file in IndexedDB
            const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await dbManager.saveFile(fileId, file, {
                originalName: file.name,
                processedData: fileData,
                uploadDate: new Date().toISOString()
            });
            
            // Add to uploaded files list
            this.uploadedFiles.push({
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                data: fileData
            });
            
            // Notify parent component
            if (this.onFileUploaded) {
                this.onFileUploaded(fileData, file);
            }
            
            // Update progress to complete for this file
            const finalProgress = ((index + 1) / total) * 100;
            progressBar.style.width = `${finalProgress}%`;
            
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            throw new Error(`Gagal memproses file ${file.name}: ${error.message}`);
        }
    }

    async processGeoJSONFile(file) {
        const text = await FileProcessor.readFileAsText(file);
        
        try {
            const geoJsonData = JSON.parse(text);
            
            // Validate GeoJSON structure
            if (!geoJsonData.type || !geoJsonData.features) {
                throw new Error('Format GeoJSON tidak valid');
            }
            
            return {
                type: 'geojson',
                data: geoJsonData,
                featureCount: geoJsonData.features.length
            };
            
        } catch (error) {
            throw new Error('File JSON/GeoJSON tidak valid');
        }
    }

    async processImageFile(file) {
        const dataUrl = await FileProcessor.readFileAsDataURL(file);
        
        return {
            type: 'image',
            data: dataUrl,
            size: file.size,
            dimensions: await this.getImageDimensions(dataUrl)
        };
    }

    async processGenericFile(file) {
        const arrayBuffer = await FileProcessor.readFileAsArrayBuffer(file);
        
        return {
            type: 'binary',
            data: arrayBuffer,
            size: file.size,
            mimeType: file.type
        };
    }

    getImageDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = dataUrl;
        });
    }

    isGeoJSONFile(file) {
        return file.name.toLowerCase().endsWith('.json') || 
               file.name.toLowerCase().endsWith('.geojson') ||
               file.type === 'application/json';
    }

    isImageFile(file) {
        return file.type.startsWith('image/') ||
               ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].some(ext => 
                   file.name.toLowerCase().endsWith(ext)
               );
    }

    showProgress() {
        const progress = this.container.querySelector('#upload-progress');
        const content = this.container.querySelector('.uploader-content');
        
        progress.classList.remove('d-none');
        content.style.opacity = '0.5';
        
        // Update uploader state
        const dropZone = this.container.querySelector('#file-drop-zone');
        dropZone.classList.add('uploading');
    }

    hideProgress() {
        const progress = this.container.querySelector('#upload-progress');
        const content = this.container.querySelector('.uploader-content');
        
        progress.classList.add('d-none');
        content.style.opacity = '1';
        
        // Reset progress
        const progressBar = this.container.querySelector('#progress-bar');
        progressBar.style.width = '0%';
        
        // Update uploader state
        const dropZone = this.container.querySelector('#file-drop-zone');
        dropZone.classList.remove('uploading');
        
        // Show uploaded files if any
        if (this.uploadedFiles.length > 0) {
            this.showUploadedFiles();
        }
    }

    showUploadedFiles() {
        const uploadedFilesContainer = this.container.querySelector('#uploaded-files');
        const filesList = this.container.querySelector('#files-list');
        
        filesList.innerHTML = '';
        
        this.uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'uploaded-file-item d-flex justify-content-between align-items-center p-2 border rounded mb-2';
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="fw-semibold">${file.name}</div>
                    <div class="small text-muted">
                        ${this.formatFileSize(file.size)} • ${file.data.type}
                        ${file.data.featureCount ? ` • ${file.data.featureCount} features` : ''}
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-outline-danger" onclick="this.removeFile(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            
            filesList.appendChild(fileItem);
        });
        
        uploadedFilesContainer.classList.remove('d-none');
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        
        if (this.uploadedFiles.length === 0) {
            this.container.querySelector('#uploaded-files').classList.add('d-none');
        } else {
            this.showUploadedFiles();
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        // Create or update error message
        let errorDiv = this.container.querySelector('.upload-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'upload-error alert alert-danger mt-3';
            this.container.appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Public methods
    getUploadedFiles() {
        return [...this.uploadedFiles];
    }

    clearFiles() {
        this.uploadedFiles = [];
        const uploadedFilesContainer = this.container.querySelector('#uploaded-files');
        uploadedFilesContainer.classList.add('d-none');
    }

    setAcceptedFormats(formats) {
        this.options.acceptedFormats = formats;
        const fileInput = this.container.querySelector('#file-input');
        fileInput.accept = formats.join(',');
        this.render();
    }

    destroy() {
        // Remove event listeners
        const dropZone = this.container.querySelector('#file-drop-zone');
        if (dropZone) {
            dropZone.removeEventListener('dragover', this.handleDragOver);
            dropZone.removeEventListener('dragleave', this.handleDragLeave);
            dropZone.removeEventListener('drop', this.handleDrop);
        }
        
        // Clear uploaded files
        this.uploadedFiles = [];
        
        // Clear container
        this.container.innerHTML = '';
    }
}
