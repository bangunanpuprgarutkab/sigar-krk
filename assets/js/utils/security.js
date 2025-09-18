/**
 * Security Utilities
 * Handles input sanitization, validation, and security-related functions
 */

export class SecurityUtils {
    // Sanitize HTML input to prevent XSS
    static sanitizeHTML(input) {
        if (!input) return '';
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // Validate email format
    static validateEmail(email) {
        if (!email) return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    // Generate CSRF token
    static generateCSRFToken() {
        const token = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
        document.cookie = `csrf_token=${token}; SameSite=Strict; Path=/`;
        return token;
    }

    // Validate CSRF token
    static validateCSRFToken(token) {
        const cookies = document.cookie.split(';')
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith('csrf_token='));
            
        if (!cookies) return false;
        const [, value] = cookies.split('=');
        return value === token;
    }

    // Validate file type
    static validateFileType(file, allowedTypes) {
        if (!file || !allowedTypes?.length) return false;
        const fileExtension = file.name.split('.').pop().toLowerCase();
        return allowedTypes.includes(`.${fileExtension}`);
    }

    // Validate file size
    static validateFileSize(file, maxSizeInMB) {
        if (!file) return false;
        return file.size <= maxSizeInMB * 1024 * 1024;
    }

    // Sanitize object properties recursively
    static sanitizeObject(obj) {
        if (!obj) return {};
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeHTML(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
}

// Export singleton instance
export const securityUtils = new SecurityUtils();
