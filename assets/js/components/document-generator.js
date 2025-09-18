/**
 * Document Generator Component for KRK Generator
 * Handles DOCX and PDF generation with template processing
 */

import { CONFIG, ERROR_MESSAGES } from '../config.js';
import { performanceMonitor } from '../utils/performance.js';
import { dbManager } from '../core/storage.js';

export class DocumentGenerator {
    constructor() {
        this.templateCache = new Map();
        this.isLibrariesLoaded = false;
        
        this.init();
    }

    async init() {
        // Libraries will be loaded on-demand
    }

    async loadLibraries() {
        if (this.isLibrariesLoaded) return;

        try {
            // Load required libraries
            await Promise.all([
                this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pizzip/3.1.5/pizzip.min.js'),
                this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.47.2/docxtemplater.js'),
                this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.0/FileSaver.min.js'),
                this.loadScript('https://cdn.jsdelivr.net/npm/docxtemplater-image-module-free@1.1.1/build/imagemodule.js'),
                this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
            ]);

            this.isLibrariesLoaded = true;
        } catch (error) {
            console.error('Failed to load document libraries:', error);
            throw new Error('Gagal memuat library dokumen');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Generate DOCX document
    async generateDocx(projectData, options = {}) {
        performanceMonitor.startTiming('generateDocx');

        try {
            await this.loadLibraries();

            // Get template
            const template = await this.getTemplate();
            
            // Prepare template data
            const templateData = this.prepareTemplateData(projectData);
            
            // Generate document
            const doc = await this.processTemplate(template, templateData);
            
            // Save file
            const fileName = this.generateFileName(projectData, 'docx');
            this.saveDocx(doc, fileName);
            
            performanceMonitor.endTiming('generateDocx');
            
            return { success: true, fileName };

        } catch (error) {
            performanceMonitor.endTiming('generateDocx');
            console.error('DOCX generation error:', error);
            throw new Error(`Gagal membuat dokumen DOCX: ${error.message}`);
        }
    }

    // Generate PDF (via print)
    async generatePDF(contentElement, options = {}) {
        performanceMonitor.startTiming('generatePDF');

        try {
            // Prepare print styles
            this.preparePrintStyles();
            
            // Trigger print dialog
            window.print();
            
            performanceMonitor.endTiming('generatePDF');
            
            return { success: true };

        } catch (error) {
            performanceMonitor.endTiming('generatePDF');
            console.error('PDF generation error:', error);
            throw new Error(`Gagal membuat PDF: ${error.message}`);
        }
    }

    // Generate map screenshot
    async generateMapScreenshot(mapElement, options = {}) {
        performanceMonitor.startTiming('generateMapScreenshot');

        try {
            await this.loadLibraries();

            const canvas = await html2canvas(mapElement, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: '#ffffff',
                ...options
            });

            const dataUrl = canvas.toDataURL('image/png');
            
            performanceMonitor.endTiming('generateMapScreenshot');
            
            return dataUrl;

        } catch (error) {
            performanceMonitor.endTiming('generateMapScreenshot');
            console.error('Map screenshot error:', error);
            throw new Error(`Gagal membuat screenshot peta: ${error.message}`);
        }
    }

    // Get template (custom or default)
    async getTemplate() {
        try {
            // Try to get custom template first
            const customTemplate = await dbManager.getFile(CONFIG.TEMPLATE_KEY);
            if (customTemplate) {
                return customTemplate;
            }

            // Fall back to default template
            return this.getDefaultTemplate();

        } catch (error) {
            console.error('Template loading error:', error);
            return this.getDefaultTemplate();
        }
    }

    getDefaultTemplate() {
        try {
            const byteCharacters = atob(CONFIG.DEFAULT_TEMPLATE_BASE64);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            return new Uint8Array(byteNumbers);

        } catch (error) {
            console.error('Default template error:', error);
            throw new Error('Gagal memuat template default');
        }
    }

    // Prepare data for template processing
    prepareTemplateData(projectData) {
        const analysis = projectData.analysisResult || {};
        
        // Format coordinate table
        const coordinateTable = this.formatCoordinateTable(projectData.geojsonData);
        
        // Format analysis zones
        const analysisZones = this.formatAnalysisZones(analysis.analisis_zona || []);
        
        // Format technical requirements
        const technicalReqs = this.formatTechnicalRequirements(analysis.ketentuan_teknis || []);
        
        // Format additional notes
        const additionalNotes = this.formatAdditionalNotes(analysis.catatan_tambahan || []);

        return {
            // Document metadata
            surat_meta: {
                nomor_surat: analysis.surat_meta?.nomor_surat || '',
                tanggal_surat: this.formatDate(analysis.surat_meta?.tanggal_surat),
                sifat: analysis.surat_meta?.sifat || 'Biasa',
                lampiran: analysis.surat_meta?.lampiran || '1 (Satu) Lembar',
                hal: analysis.surat_meta?.hal || 'Keterangan Rencana Kota (KRK)',
                kota_surat: analysis.surat_meta?.kota_surat || 'Garut'
            },

            // Applicant information
            pemohon: {
                nama: analysis.pemohon?.nama || '',
                jabatan: analysis.pemohon?.jabatan || ''
            },

            // Applicant's letter
            surat_pemohon: {
                nomor: analysis.surat_pemohon?.nomor || '',
                tanggal: this.formatDate(analysis.surat_pemohon?.tanggal)
            },

            // Project location
            lokasi_proyek: {
                lokasi: analysis.lokasi_proyek?.lokasi || '',
                peruntukan: analysis.lokasi_proyek?.peruntukan || '',
                luas_total: this.formatNumber(analysis.lokasi_proyek?.luas_total || 0)
            },

            // Analysis results
            analisis_zona: analysisZones,
            ketentuan_teknis: technicalReqs,
            catatan_tambahan: additionalNotes,
            
            // Coordinate table
            koordinat_table: coordinateTable,

            // Signatory
            penandatangan: {
                jabatan: analysis.penandatangan?.jabatan || 'KEPALA DINAS PUPR',
                nama: analysis.penandatangan?.nama || 'Dr. AGUS ISMAIL, S.T., M.T.',
                pangkat: analysis.penandatangan?.pangkat || 'Pembina Tingkat I, IV/b',
                nip: analysis.penandatangan?.nip || '19760808 200604 1 008'
            },

            // Revision info
            is_revisi: analysis.is_revisi || false,
            revisi_nomor: analysis.revisi_nomor || '',
            revisi_tanggal: this.formatDate(analysis.revisi_tanggal),
            
            // Business use
            is_usaha: analysis.is_usaha || false,

            // Current date
            tanggal_sekarang: this.formatDate(new Date().toISOString())
        };
    }

    // Process template with data
    async processTemplate(template, data) {
        try {
            const zip = new PizZip(template);
            
            // Configure docxtemplater
            const doc = new window.Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                modules: []
            });

            // Set template data
            doc.setData(data);

            // Render document
            doc.render();

            // Generate output
            return doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

        } catch (error) {
            console.error('Template processing error:', error);
            throw new Error('Gagal memproses template dokumen');
        }
    }

    // Format coordinate table for template
    formatCoordinateTable(geoJsonData) {
        if (!geoJsonData || !geoJsonData.features) {
            return [];
        }

        const coordinates = [];
        let pointIndex = 1;

        geoJsonData.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                const coords = feature.geometry.coordinates;
                
                if (feature.geometry.type === 'Point') {
                    coordinates.push({
                        titik: `K${pointIndex}`,
                        longitude: coords[0].toFixed(6),
                        latitude: coords[1].toFixed(6)
                    });
                    pointIndex++;
                } else if (feature.geometry.type === 'Polygon') {
                    coords[0].forEach((coord, index) => {
                        if (index < coords[0].length - 1) { // Skip last point (same as first)
                            coordinates.push({
                                titik: `K${pointIndex}`,
                                longitude: coord[0].toFixed(6),
                                latitude: coord[1].toFixed(6)
                            });
                            pointIndex++;
                        }
                    });
                }
            }
        });

        return coordinates;
    }

    // Format analysis zones
    formatAnalysisZones(zones) {
        return zones.map((zone, index) => ({
            nomor: index + 1,
            zona: zone.zona || '',
            peruntukan: zone.peruntukan || '',
            kesesuaian: zone.kesesuaian || '',
            keterangan: zone.keterangan || ''
        }));
    }

    // Format technical requirements
    formatTechnicalRequirements(requirements) {
        return requirements.map((req, index) => ({
            nomor: index + 1,
            ketentuan: req
        }));
    }

    // Format additional notes
    formatAdditionalNotes(notes) {
        return notes.map((note, index) => ({
            nomor: index + 1,
            catatan: note
        }));
    }

    // Utility formatting methods
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    formatNumber(number) {
        if (typeof number !== 'number') return '0';
        return number.toLocaleString('id-ID');
    }

    // Generate filename
    generateFileName(projectData, extension) {
        const pemohonName = projectData.analysisResult?.pemohon?.nama || projectData.projectName || 'Dokumen';
        const safeFileName = pemohonName.replace(/[\\/:*?"<>|]/g, '_').replace(/\s/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        
        return `KRK_${safeFileName}_${timestamp}.${extension}`;
    }

    // Save DOCX file
    saveDocx(blob, fileName) {
        if (window.saveAs) {
            window.saveAs(blob, fileName);
        } else {
            // Fallback for browsers without FileSaver
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    // Save map image
    saveMapImage(dataUrl, fileName) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Prepare print styles
    preparePrintStyles() {
        // Add print-specific styles if needed
        const printStyle = document.createElement('style');
        printStyle.textContent = `
            @media print {
                @page {
                    margin: 2cm;
                    size: A4;
                }
                
                body {
                    font-size: 12pt;
                    line-height: 1.5;
                }
                
                .no-print {
                    display: none !important;
                }
                
                .page-break {
                    page-break-before: always;
                }
            }
        `;
        document.head.appendChild(printStyle);
    }

    // Generate preview HTML for document
    generatePreviewHTML(projectData) {
        const data = this.prepareTemplateData(projectData);
        
        return `
            <div class="kop-surat">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Lambang_Kabupaten_Garut.svg/1751px-Lambang_Kabupaten_Garut.svg.png" alt="Logo Garut">
                <div class="kop-text">
                    <h4>PEMERINTAH KABUPATEN GARUT</h4>
                    <h5>DINAS PEKERJAAN UMUM DAN PENATAAN RUANG</h5>
                    <p>Jl. Pembangunan No. 64 Garut 44151 Telp. (0262) 232170 Fax. (0262) 234313</p>
                    <p>Website: www.garutkab.go.id Email: pupr@garutkab.go.id</p>
                </div>
            </div>
            
            <div class="text-center mb-4">
                <h5><u>KETERANGAN RENCANA KOTA (KRK)</u></h5>
                <p>Nomor: ${data.surat_meta.nomor_surat}</p>
            </div>
            
            <div class="surat-content">
                <p>Berdasarkan surat permohonan dari ${data.pemohon.nama} ${data.pemohon.jabatan ? `selaku ${data.pemohon.jabatan}` : ''} 
                   Nomor: ${data.surat_pemohon.nomor} tanggal ${data.surat_pemohon.tanggal}, dengan ini diberikan keterangan sebagai berikut:</p>
                
                <ol>
                    <li><strong>Lokasi:</strong><br>${data.lokasi_proyek.lokasi}</li>
                    <li><strong>Peruntukan:</strong><br>${data.lokasi_proyek.peruntukan}</li>
                    <li><strong>Luas Lahan:</strong><br>± ${data.lokasi_proyek.luas_total} m²</li>
                    
                    ${data.analisis_zona.length > 0 ? `
                    <li><strong>Analisis Zona Rencana:</strong>
                        <ol class="sub-list">
                            ${data.analisis_zona.map(zona => `
                                <li>${zona.zona} - ${zona.peruntukan} (${zona.kesesuaian})<br>
                                    ${zona.keterangan}</li>
                            `).join('')}
                        </ol>
                    </li>
                    ` : ''}
                    
                    ${data.ketentuan_teknis.length > 0 ? `
                    <li><strong>Ketentuan Teknis:</strong>
                        <ol class="sub-list">
                            ${data.ketentuan_teknis.map(req => `<li>${req.ketentuan}</li>`).join('')}
                        </ol>
                    </li>
                    ` : ''}
                    
                    ${data.koordinat_table.length > 0 ? `
                    <li><strong>Koordinat Lokasi:</strong><br>
                        <table class="coordinate-table">
                            <thead>
                                <tr>
                                    <th>Titik</th>
                                    <th>Longitude</th>
                                    <th>Latitude</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.koordinat_table.map(coord => `
                                    <tr>
                                        <td>${coord.titik}</td>
                                        <td>${coord.longitude}</td>
                                        <td>${coord.latitude}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </li>
                    ` : ''}
                </ol>
                
                ${data.catatan_tambahan.length > 0 ? `
                <div class="final-points">
                    <p><strong>Catatan:</strong></p>
                    ${data.catatan_tambahan.map(note => `<p>• ${note.catatan}</p>`).join('')}
                </div>
                ` : ''}
                
                <p>Demikian keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
            </div>
            
            <div class="signature-block">
                <p>Garut, ${data.tanggal_sekarang}</p>
                <p class="jabatan">${data.penandatangan.jabatan}</p>
                <div class="signature-space"></div>
                <p class="nama">${data.penandatangan.nama}</p>
                <p>${data.penandatangan.pangkat}</p>
                <p>NIP. ${data.penandatangan.nip}</p>
            </div>
        `;
    }

    // Upload custom template
    async uploadCustomTemplate(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: file.type });
            
            await dbManager.saveFile(CONFIG.TEMPLATE_KEY, blob, {
                originalName: file.name,
                uploadDate: new Date().toISOString()
            });
            
            // Clear template cache
            this.templateCache.clear();
            
            return true;

        } catch (error) {
            console.error('Template upload error:', error);
            throw new Error('Gagal mengunggah template');
        }
    }

    // Download default template
    downloadDefaultTemplate() {
        try {
            const blob = new Blob([this.getDefaultTemplate()], {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            });
            
            this.saveDocx(blob, 'template_krk_default.docx');

        } catch (error) {
            console.error('Template download error:', error);
            throw new Error('Gagal mengunduh template default');
        }
    }

    // Check if custom template exists
    async hasCustomTemplate() {
        try {
            const template = await dbManager.getFile(CONFIG.TEMPLATE_KEY);
            return !!template;
        } catch (error) {
            return false;
        }
    }

    // Get template status
    async getTemplateStatus() {
        const hasCustom = await this.hasCustomTemplate();
        return {
            hasCustomTemplate: hasCustom,
            status: hasCustom ? 'Template Kustom Tersimpan' : 'Default',
            className: hasCustom ? 'badge bg-success' : 'badge bg-secondary'
        };
    }
}

// Create singleton instance
export const documentGenerator = new DocumentGenerator();
