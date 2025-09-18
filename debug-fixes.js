/**
 * Debug Fixes for KRK Generator Integration Issues
 * Common fixes and debugging utilities
 */

// Debug utility functions
window.debugKRK = {
    // Check all components are loaded
    checkComponents: async () => {
        const components = [
            'CONFIG',
            'performanceMonitor', 
            'projectStorage',
            'aiIntegration',
            'modalManager',
            'documentGenerator'
        ];
        
        const results = {};
        
        for (const component of components) {
            try {
                if (component === 'CONFIG') {
                    const { CONFIG } = await import('./assets/js/config.js');
                    results[component] = !!CONFIG;
                } else if (component === 'performanceMonitor') {
                    const { performanceMonitor } = await import('./assets/js/utils/performance.js');
                    results[component] = !!performanceMonitor;
                } else if (component === 'projectStorage') {
                    const { projectStorage } = await import('./assets/js/core/storage.js');
                    results[component] = !!projectStorage;
                } else if (component === 'aiIntegration') {
                    const { aiIntegration } = await import('./assets/js/components/ai-integration.js');
                    results[component] = !!aiIntegration;
                } else if (component === 'modalManager') {
                    const { modalManager } = await import('./assets/js/components/modal-manager.js');
                    results[component] = !!modalManager;
                } else if (component === 'documentGenerator') {
                    const { documentGenerator } = await import('./assets/js/components/document-generator.js');
                    results[component] = !!documentGenerator;
                }
            } catch (error) {
                results[component] = `Error: ${error.message}`;
            }
        }
        
        console.table(results);
        return results;
    },

    // Check storage systems
    checkStorage: async () => {
        const { projectStorage, settingsStorage } = await import('./assets/js/core/storage.js');
        
        const results = {
            localStorage: localStorage ? 'Available' : 'Not available',
            indexedDB: window.indexedDB ? 'Available' : 'Not available',
            projectCount: projectStorage.getAllProjects().length,
            settings: Object.keys(settingsStorage.settings).length
        };
        
        console.table(results);
        return results;
    },

    // Test AI integration
    testAI: async () => {
        const { aiIntegration } = await import('./assets/js/components/ai-integration.js');
        
        const stats = aiIntegration.getStats();
        console.log('AI Integration Stats:', stats);
        
        return stats;
    },

    // Performance check
    checkPerformance: async () => {
        const { performanceMonitor, globalCache } = await import('./assets/js/utils/performance.js');
        
        const results = {
            memory: performance.memory ? {
                used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
            } : 'Not available',
            cache: globalCache.getStats(),
            timing: performance.now()
        };
        
        console.log('Performance Stats:', results);
        return results;
    },

    // Clear all data (for testing)
    clearAllData: () => {
        if (confirm('This will clear all project data. Are you sure?')) {
            localStorage.clear();
            if (window.indexedDB) {
                indexedDB.deleteDatabase('KRK_FilesDB');
            }
            location.reload();
        }
    },

    // Create test project
    createTestProject: async () => {
        const { projectStorage, getEmptyAnalysisData } = await import('./assets/js/core/storage.js');
        const { CONFIG } = await import('./assets/js/config.js');
        
        const testProject = {
            projectName: `Test Project ${Date.now()}`,
            geojsonData: {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [107.9031, -7.2175] // Garut coordinates
                    },
                    properties: {
                        name: 'Test Location'
                    }
                }]
            },
            analysisResult: {
                ...getEmptyAnalysisData(),
                pemohon: {
                    nama: 'Test User',
                    jabatan: 'Test Position'
                },
                lokasi_proyek: {
                    lokasi: 'Test Location, Garut',
                    peruntukan: 'Test Purpose',
                    luas_total: 1000
                }
            }
        };
        
        const success = projectStorage.addProject(testProject);
        console.log('Test project created:', success);
        
        return testProject;
    }
};

// Common fixes for integration issues
window.fixKRK = {
    // Fix modal backdrop issues
    fixModalBackdrop: () => {
        // Remove any stuck modal backdrops
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
        });
        
        // Reset body classes
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        console.log('Modal backdrop issues fixed');
    },

    // Fix Bootstrap modal issues
    fixBootstrapModals: () => {
        // Ensure Bootstrap is loaded
        if (!window.bootstrap) {
            console.error('Bootstrap not loaded');
            return;
        }
        
        // Dispose of all existing modals
        document.querySelectorAll('.modal').forEach(modalEl => {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.dispose();
            }
        });
        
        console.log('Bootstrap modals reset');
    },

    // Fix CSS loading issues
    fixCSS: () => {
        // Check if custom CSS is loaded
        const customCSS = document.querySelector('link[href*="assets/css/styles.css"]');
        if (!customCSS) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'assets/css/styles.css';
            document.head.appendChild(link);
            console.log('Custom CSS loaded');
        }
        
        // Check Bootstrap CSS
        const bootstrapCSS = document.querySelector('link[href*="bootstrap"]');
        if (!bootstrapCSS) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
            document.head.appendChild(link);
            console.log('Bootstrap CSS loaded');
        }
    },

    // Fix performance issues
    fixPerformance: async () => {
        const { globalCache, performanceMonitor } = await import('./assets/js/utils/performance.js');
        
        // Clear cache if too large
        const stats = globalCache.getStats();
        if (stats.size > 50) {
            globalCache.clear();
            console.log('Cache cleared due to size');
        }
        
        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
            console.log('Garbage collection triggered');
        }
        
        // Check memory usage
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize;
            const memoryLimit = performance.memory.jsHeapSizeLimit;
            const usage = (memoryUsage / memoryLimit) * 100;
            
            if (usage > 80) {
                console.warn(`High memory usage: ${usage.toFixed(1)}%`);
            }
        }
    },

    // Fix ES6 module issues
    fixModules: () => {
        // Check if modules are supported
        if (!('noModule' in HTMLScriptElement.prototype)) {
            console.error('ES6 modules not supported in this browser');
            alert('Browser tidak mendukung ES6 modules. Gunakan browser yang lebih baru.');
            return;
        }
        
        // Check if app is loaded
        if (!window.app) {
            console.log('App not loaded, attempting to load...');
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'assets/js/app.js';
            document.head.appendChild(script);
        }
    }
};

// Auto-run basic fixes on load
document.addEventListener('DOMContentLoaded', () => {
    // Basic fixes
    window.fixKRK.fixCSS();
    window.fixKRK.fixModules();
    
    // Debug info
    console.log('🔧 Debug utilities loaded. Use window.debugKRK and window.fixKRK');
    console.log('Available debug functions:', Object.keys(window.debugKRK));
    console.log('Available fix functions:', Object.keys(window.fixKRK));
});

// Error handling for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Try to fix common issues
    if (event.reason.message?.includes('modal')) {
        window.fixKRK.fixModalBackdrop();
    }
    
    if (event.reason.message?.includes('import')) {
        window.fixKRK.fixModules();
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Try to fix common issues
    if (event.error.message?.includes('Bootstrap')) {
        window.fixKRK.fixBootstrapModals();
    }
});
