/**
 * Perda Update Service
 * Handles automatic updates for Perda data
 */

import { settingsStorage } from '../core/storage.js';
import { performanceMonitor } from '../utils/performance.js';
import { securityUtils } from '../utils/security.js';
import { perdaReferenceManager } from '../data/perda-references.js';

const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 jam
const PERDA_UPDATE_URL = 'https://api.example.com/perda/updates';
const VERSION_CHECK_URL = 'https://api.example.com/perda/version';

export class PerdaUpdateService {
    constructor() {
        this.lastUpdateCheck = null;
        this.isUpdating = false;
        this.updateListeners = [];
    }

    async initialize() {
        // Load last update time
        this.lastUpdateCheck = settingsStorage.get('perda_last_update', 0);
        
        // Check for updates on startup if needed
        if (this.shouldCheckForUpdates()) {
            await this.checkForUpdates();
        }
        
        // Set up periodic checking
        setInterval(() => this.checkForUpdates(), UPDATE_INTERVAL);
    }

    shouldCheckForUpdates() {
        const now = Date.now();
        return (now - this.lastUpdateCheck) >= UPDATE_INTERVAL;
    }

    async checkForUpdates() {
        if (this.isUpdating) return false;
        
        try {
            this.isUpdating = true;
            
            // Check current version
            const currentVersion = perdaReferenceManager.getCurrentVersion();
            const response = await fetch(VERSION_CHECK_URL, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': securityUtils.generateCSRFToken()
                }
            });
            
            if (!response.ok) throw new Error('Failed to check for updates');
            
            const { latestVersion, updateUrl } = await response.json();
            
            if (this.isNewerVersion(latestVersion, currentVersion)) {
                return await this.downloadUpdate(updateUrl);
            }
            
            return false;
        } catch (error) {
            console.error('Error checking for Perda updates:', error);
            return false;
        } finally {
            this.isUpdating = false;
            this.lastUpdateCheck = Date.now();
            settingsStorage.set('perda_last_update', this.lastUpdateCheck);
        }
    }

    async downloadUpdate(updateUrl) {
        try {
            const response = await fetch(updateUrl, {
                headers: {
                    'X-CSRF-Token': securityUtils.generateCSRFToken()
                }
            });
            
            if (!response.ok) throw new Error('Failed to download update');
            
            const updateData = await response.json();
            
            // Validate update data
            if (!this.validateUpdateData(updateData)) {
                throw new Error('Invalid update data received');
            }
            
            // Apply update
            await perdaReferenceManager.updateReferences(updateData);
            
            // Notify listeners
            this.notifyUpdate(updateData);
            
            return true;
        } catch (error) {
            console.error('Error downloading Perda update:', error);
            throw error;
        }
    }

    validateUpdateData(data) {
        // Basic validation - extend as needed
        return data && 
               typeof data === 'object' && 
               Array.isArray(data.references) &&
               data.references.length > 0;
    }

    isNewerVersion(version1, version2) {
        const v1 = version1.split('.').map(Number);
        const v2 = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            
            if (num1 > num2) return true;
            if (num1 < num2) return false;
        }
        
        return false;
    }

    addUpdateListener(callback) {
        if (typeof callback === 'function') {
            this.updateListeners.push(callback);
        }
    }

    removeUpdateListener(callback) {
        this.updateListeners = this.updateListeners.filter(cb => cb !== callback);
    }

    notifyUpdate(updateData) {
        for (const callback of this.updateListeners) {
            try {
                callback(updateData);
            } catch (error) {
                console.error('Error in update listener:', error);
            }
        }
    }
}

// Export singleton instance
export const perdaUpdateService = new PerdaUpdateService();

// Initialize on import
perdaUpdateService.initialize().catch(console.error);
