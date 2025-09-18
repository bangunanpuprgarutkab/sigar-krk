/**
 * Storage Management for KRK Generator Application
 * Handles localStorage, IndexedDB, and caching operations
 */

import { CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config.js';
import { globalCache, performanceMonitor } from '../utils/performance.js';

// IndexedDB Manager Class
export class IndexedDBManager {
    constructor() {
        this.db = null;
        this.isReady = false;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(new Error(ERROR_MESSAGES.DB_ERROR));
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('IndexedDB opened successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains(CONFIG.FILE_STORE_NAME)) {
                    const fileStore = db.createObjectStore(CONFIG.FILE_STORE_NAME, { keyPath: 'id' });
                    fileStore.createIndex('timestamp', 'timestamp', { unique: false });
                    fileStore.createIndex('type', 'type', { unique: false });
                }
                
                console.log('IndexedDB object stores created');
            };
        });
    }

    async ensureReady() {
        if (!this.isReady) {
            await this.initPromise;
        }
        return this.db;
    }

    async saveFile(id, fileBlob, metadata = {}) {
        performanceMonitor.startTiming('saveFile');
        
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([CONFIG.FILE_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.FILE_STORE_NAME);
            
            const fileData = {
                id,
                file: fileBlob,
                timestamp: Date.now(),
                size: fileBlob.size,
                type: fileBlob.type,
                ...metadata
            };
            
            return new Promise((resolve, reject) => {
                const request = store.put(fileData);
                request.onsuccess = () => {
                    // Update cache
                    globalCache.set(`file_${id}`, fileData);
                    performanceMonitor.endTiming('saveFile');
                    resolve(fileData);
                };
                request.onerror = () => {
                    performanceMonitor.endTiming('saveFile');
                    reject(request.error);
                };
            });
        } catch (error) {
            performanceMonitor.endTiming('saveFile');
            throw error;
        }
    }

    async getFile(id) {
        performanceMonitor.startTiming('getFile');
        
        try {
            // Check cache first
            const cached = globalCache.get(`file_${id}`);
            if (cached) {
                performanceMonitor.endTiming('getFile');
                return cached.file;
            }
            
            await this.ensureReady();
            
            const transaction = this.db.transaction([CONFIG.FILE_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CONFIG.FILE_STORE_NAME);
            
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        // Cache the result
                        globalCache.set(`file_${id}`, result);
                        performanceMonitor.endTiming('getFile');
                        resolve(result.file);
                    } else {
                        performanceMonitor.endTiming('getFile');
                        resolve(null);
                    }
                };
                request.onerror = () => {
                    performanceMonitor.endTiming('getFile');
                    reject(request.error);
                };
            });
        } catch (error) {
            performanceMonitor.endTiming('getFile');
            throw error;
        }
    }

    async deleteFile(id) {
        performanceMonitor.startTiming('deleteFile');
        
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([CONFIG.FILE_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.FILE_STORE_NAME);
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => {
                    // Remove from cache
                    globalCache.delete(`file_${id}`);
                    performanceMonitor.endTiming('deleteFile');
                    resolve();
                };
                request.onerror = () => {
                    performanceMonitor.endTiming('deleteFile');
                    reject(request.error);
                };
            });
        } catch (error) {
            performanceMonitor.endTiming('deleteFile');
            throw error;
        }
    }

    async getAllFiles() {
        performanceMonitor.startTiming('getAllFiles');
        
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([CONFIG.FILE_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CONFIG.FILE_STORE_NAME);
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    performanceMonitor.endTiming('getAllFiles');
                    resolve(request.result);
                };
                request.onerror = () => {
                    performanceMonitor.endTiming('getAllFiles');
                    reject(request.error);
                };
            });
        } catch (error) {
            performanceMonitor.endTiming('getAllFiles');
            throw error;
        }
    }

    async getFilesByType(type) {
        performanceMonitor.startTiming('getFilesByType');
        
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([CONFIG.FILE_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CONFIG.FILE_STORE_NAME);
            const index = store.index('type');
            
            return new Promise((resolve, reject) => {
                const request = index.getAll(type);
                request.onsuccess = () => {
                    performanceMonitor.endTiming('getFilesByType');
                    resolve(request.result);
                };
                request.onerror = () => {
                    performanceMonitor.endTiming('getFilesByType');
                    reject(request.error);
                };
            });
        } catch (error) {
            performanceMonitor.endTiming('getFilesByType');
            throw error;
        }
    }

    async clearOldFiles(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
        performanceMonitor.startTiming('clearOldFiles');
        
        try {
            await this.ensureReady();
            
            const cutoffTime = Date.now() - maxAge;
            const transaction = this.db.transaction([CONFIG.FILE_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.FILE_STORE_NAME);
            const index = store.index('timestamp');
            
            const range = IDBKeyRange.upperBound(cutoffTime);
            const request = index.openCursor(range);
            
            let deletedCount = 0;
            
            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    } else {
                        performanceMonitor.endTiming('clearOldFiles');
                        console.log(`Cleared ${deletedCount} old files`);
                        resolve(deletedCount);
                    }
                };
                request.onerror = () => {
                    performanceMonitor.endTiming('clearOldFiles');
                    reject(request.error);
                };
            });
        } catch (error) {
            performanceMonitor.endTiming('clearOldFiles');
            throw error;
        }
    }

    async getStorageUsage() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    available: estimate.quota,
                    percentage: (estimate.usage / estimate.quota) * 100
                };
            }
            return null;
        } catch (error) {
            console.warn('Storage estimation not available:', error);
            return null;
        }
    }
}

// LocalStorage Manager Class
export class LocalStorageManager {
    static set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            
            // Update cache
            globalCache.set(`ls_${key}`, value);
            
            return true;
        } catch (error) {
            console.error('LocalStorage set error:', error);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            // Check cache first
            const cached = globalCache.get(`ls_${key}`);
            if (cached !== null) {
                return cached;
            }
            
            const item = localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            
            const parsed = JSON.parse(item);
            
            // Cache the result
            globalCache.set(`ls_${key}`, parsed);
            
            return parsed;
        } catch (error) {
            console.error('LocalStorage get error:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            globalCache.delete(`ls_${key}`);
            return true;
        } catch (error) {
            console.error('LocalStorage remove error:', error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            // Clear related cache entries
            for (const key of globalCache.cache.keys()) {
                if (key.startsWith('ls_')) {
                    globalCache.delete(key);
                }
            }
            return true;
        } catch (error) {
            console.error('LocalStorage clear error:', error);
            return false;
        }
    }

    static getSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    static isAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Project Storage Manager
export class ProjectStorageManager {
    constructor() {
        this.projects = [];
        this.activeProjectId = null;
        this.loadProjects();
    }

    loadProjects() {
        performanceMonitor.startTiming('loadProjects');
        
        try {
            this.projects = LocalStorageManager.get(CONFIG.PROJECTS_KEY, []);
            
            // Set active project to most recently modified
            if (this.projects.length > 0) {
                const sortedProjects = [...this.projects].sort(
                    (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
                );
                this.activeProjectId = sortedProjects[0].id;
            }
            
            performanceMonitor.endTiming('loadProjects');
        } catch (error) {
            console.error('Error loading projects:', error);
            this.projects = [];
            performanceMonitor.endTiming('loadProjects');
        }
    }

    saveProjects() {
        performanceMonitor.startTiming('saveProjects');
        
        try {
            // Update last modified for active project
            const activeProject = this.getActiveProject();
            if (activeProject) {
                activeProject.lastModified = new Date().toISOString();
            }
            
            const success = LocalStorageManager.set(CONFIG.PROJECTS_KEY, this.projects);
            performanceMonitor.endTiming('saveProjects');
            
            return success;
        } catch (error) {
            console.error('Error saving projects:', error);
            performanceMonitor.endTiming('saveProjects');
            return false;
        }
    }

    addProject(project) {
        project.id = project.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        project.lastModified = new Date().toISOString();
        
        this.projects.unshift(project);
        this.activeProjectId = project.id;
        
        return this.saveProjects();
    }

    updateProject(projectId, updates) {
        const projectIndex = this.projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) return false;
        
        this.projects[projectIndex] = {
            ...this.projects[projectIndex],
            ...updates,
            lastModified: new Date().toISOString()
        };
        
        return this.saveProjects();
    }

    deleteProject(projectId) {
        const initialLength = this.projects.length;
        this.projects = this.projects.filter(p => p.id !== projectId);
        
        // Update active project if deleted
        if (this.activeProjectId === projectId) {
            this.activeProjectId = this.projects.length > 0 ? 
                this.projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))[0].id : 
                null;
        }
        
        const success = this.saveProjects();
        return success && this.projects.length < initialLength;
    }

    getProject(projectId) {
        return this.projects.find(p => p.id === projectId) || null;
    }

    getActiveProject() {
        return this.activeProjectId ? this.getProject(this.activeProjectId) : null;
    }

    setActiveProject(projectId) {
        if (this.projects.some(p => p.id === projectId)) {
            this.activeProjectId = projectId;
            return true;
        }
        return false;
    }

    getAllProjects() {
        return [...this.projects];
    }

    getSortedProjects(sortBy = 'lastModified', order = 'desc') {
        return [...this.projects].sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            
            if (order === 'desc') {
                return new Date(bValue) - new Date(aValue);
            } else {
                return new Date(aValue) - new Date(bValue);
            }
        });
    }

    searchProjects(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.projects.filter(project => 
            project.projectName.toLowerCase().includes(lowercaseQuery) ||
            (project.analysisResult?.pemohon?.nama || '').toLowerCase().includes(lowercaseQuery) ||
            (project.analysisResult?.lokasi_proyek?.lokasi || '').toLowerCase().includes(lowercaseQuery)
        );
    }

    exportData() {
        return {
            projects: this.projects,
            activeProjectId: this.activeProjectId,
            exportDate: new Date().toISOString(),
            version: CONFIG.DB_VERSION
        };
    }

    async importData(data) {
        try {
            if (!data.projects || !Array.isArray(data.projects)) {
                throw new Error('Invalid import data format');
            }
            
            // Backup current data
            const backup = this.exportData();
            
            // Import new data
            this.projects = data.projects;
            this.activeProjectId = data.activeProjectId;
            
            const success = this.saveProjects();
            
            if (!success) {
                // Restore backup on failure
                this.projects = backup.projects;
                this.activeProjectId = backup.activeProjectId;
                throw new Error('Failed to save imported data');
            }
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }

    getStorageStats() {
        const totalProjects = this.projects.length;
        const totalSize = JSON.stringify(this.projects).length;
        const averageSize = totalProjects > 0 ? totalSize / totalProjects : 0;
        
        return {
            totalProjects,
            totalSize,
            averageSize,
            localStorageSize: LocalStorageManager.getSize()
        };
    }
}

// Settings Storage Manager
export class SettingsStorageManager {
    constructor() {
        this.settings = this.loadSettings();
    }

    loadSettings() {
        return LocalStorageManager.get(CONFIG.SETTINGS_KEY, {
            perdaRTRW: '',
            geminiApiKey: '',
            geminiModel: CONFIG.DEFAULT_MODEL,
            referenceDocuments: [],
            theme: 'light',
            language: 'id',
            autoSave: true,
            notifications: true
        });
    }

    saveSettings() {
        return LocalStorageManager.set(CONFIG.SETTINGS_KEY, this.settings);
    }

    get(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }

    set(key, value) {
        this.settings[key] = value;
        return this.saveSettings();
    }

    update(updates) {
        this.settings = { ...this.settings, ...updates };
        return this.saveSettings();
    }

    reset() {
        this.settings = this.loadSettings();
        LocalStorageManager.remove(CONFIG.SETTINGS_KEY);
        return true;
    }

    export() {
        return {
            settings: this.settings,
            exportDate: new Date().toISOString()
        };
    }

    import(data) {
        if (!data.settings) {
            throw new Error('Invalid settings data');
        }
        
        this.settings = { ...this.settings, ...data.settings };
        return this.saveSettings();
    }
}

// Create singleton instances
export const dbManager = new IndexedDBManager();
export const projectStorage = new ProjectStorageManager();
export const settingsStorage = new SettingsStorageManager();

// Initialize cleanup routine
setInterval(() => {
    dbManager.clearOldFiles().catch(console.error);
    globalCache.cleanup();
}, 60 * 60 * 1000); // Run every hour
