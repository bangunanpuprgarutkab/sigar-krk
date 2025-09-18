/**
 * Error Handler Utility
 * Centralized error handling and reporting
 */

import { settingsStorage } from '../core/storage.js';

class ErrorHandler {
    constructor() {
        this.sentryInitialized = false;
        this.errorBoundary = null;
    }

    // Initialize error tracking
    initialize() {
        // Only initialize in production
        if (process.env.NODE_ENV === 'production') {
            this.initializeSentry();
        }
        
        // Set up global error handlers
        this.setupGlobalHandlers();
    }

    // Initialize Sentry for error tracking
    initializeSentry() {
        try {
            // Lazy load Sentry to reduce bundle size
            import('@sentry/browser').then(Sentry => {
                Sentry.init({
                    dsn: 'YOUR_SENTRY_DSN',
                    environment: process.env.NODE_ENV || 'development',
                    release: process.env.APP_VERSION || '1.0.0',
                    beforeSend: (event) => this.beforeSentrySend(event)
                });
                
                // Add user context if available
                const user = settingsStorage.get('user');
                if (user) {
                    Sentry.setUser({ 
                        id: user.id,
                        email: user.email,
                        username: user.username 
                    });
                }
                
                this.sentryInitialized = true;
            });
        } catch (error) {
            console.error('Failed to initialize Sentry:', error);
        }
    }

    // Filter sensitive data before sending to Sentry
    beforeSentrySend(event) {
        try {
            // Remove sensitive data from errors
            if (event.request) {
                if (event.request.headers) {
                    // Remove sensitive headers
                    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-csrf-token'];
                    for (const header of sensitiveHeaders) {
                        if (event.request.headers[header]) {
                            event.request.headers[header] = '[REDACTED]';
                        }
                    }
                }
                
                // Sanitize URL parameters
                if (event.request.url) {
                    const url = new URL(event.request.url);
                    if (url.searchParams.has('token') || url.searchParams.has('password')) {
                        url.search = '[REDACTED]';
                        event.request.url = url.toString();
                    }
                }
            }
            
            return event;
        } catch (error) {
            console.error('Error in beforeSentrySend:', error);
            return event;
        }
    }

    // Set up global error handlers
    setupGlobalHandlers() {
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason || 'Unhandled promise rejection');
        });

        // Global errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message || 'Unknown error');
        });
    }

    // Handle application errors
    handleError(error, context = {}) {
        // Log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.error('Application Error:', error, context);
        }
        
        // Send to Sentry if available
        if (this.sentryInitialized) {
            import('@sentry/browser').then(Sentry => {
                Sentry.withScope(scope => {
                    // Add context
                    if (context) {
                        Object.entries(context).forEach(([key, value]) => {
                            scope.setExtra(key, value);
                        });
                    }
                    
                    // Capture the error
                    if (error instanceof Error) {
                        Sentry.captureException(error);
                    } else {
                        Sentry.captureMessage(String(error));
                    }
                });
            }).catch(console.error);
        }
        
        // Show error to user
        this.showErrorToUser(error);
    }

    // Show error to user in a user-friendly way
    showErrorToUser(error) {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') return;
        
        // Create or get error container
        let errorContainer = document.getElementById('global-error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'global-error-container';
            errorContainer.style.position = 'fixed';
            errorContainer.style.bottom = '20px';
            errorContainer.style.right = '20px';
            errorContainer.style.maxWidth = '400px';
            errorContainer.style.zIndex = '9999';
            document.body.appendChild(errorContainer);
        }
        
        // Create error message
        const errorId = `error-${Date.now()}`;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        const errorElement = document.createElement('div');
        errorElement.id = errorId;
        errorElement.className = 'alert alert-danger';
        errorElement.role = 'alert';
        errorElement.style.marginBottom = '10px';
        errorElement.style.animation = 'fadeIn 0.3s';
        errorElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>Terjadi Kesalahan</strong>
                    <div class="small mt-1">${this.escapeHtml(errorMessage)}</div>
                </div>
                <button type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="mt-2 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2 copy-error" data-error="${this.escapeHtml(JSON.stringify(error, Object.getOwnPropertyNames(error)))}">
                    Salin Detail
                </button>
                <button class="btn btn-sm btn-outline-primary report-error" data-error="${this.escapeHtml(JSON.stringify(error, Object.getOwnPropertyNames(error)))}">
                    Laporkan Masalah
                </button>
            </div>
        `;
        
        // Add close button handler
        const closeButton = errorElement.querySelector('.btn-close');
        closeButton.addEventListener('click', () => {
            errorElement.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                errorElement.remove();
            }, 300);
        });
        
        // Add copy error handler
        const copyButton = errorElement.querySelector('.copy-error');
        copyButton.addEventListener('click', (e) => {
            const errorData = e.target.getAttribute('data-error');
            navigator.clipboard.writeText(errorData).then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Tersalin!';
                copyButton.classList.add('text-success');
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.classList.remove('text-success');
                }, 2000);
            });
        });
        
        // Add report error handler
        const reportButton = errorElement.querySelector('.report-error');
        reportButton.addEventListener('click', (e) => {
            const errorData = e.target.getAttribute('data-error');
            // Implement your error reporting logic here
            console.log('Reporting error:', errorData);
            alert('Terima kasih telah melaporkan masalah ini. Tim kami akan segera menanganinya.');
        });
        
        // Add to container
        errorContainer.insertBefore(errorElement, errorContainer.firstChild);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (document.contains(errorElement)) {
                errorElement.style.animation = 'fadeOut 0.3s';
                setTimeout(() => {
                    errorElement.remove();
                }, 300);
            }
        }, 10000);
    }
    
    // Helper to escape HTML
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Set error boundary component
    setErrorBoundary(component) {
        this.errorBoundary = component;
    }
    
    // Handle React error boundary errors
    handleReactError(error, errorInfo) {
        this.handleError(error, { componentStack: errorInfo?.componentStack });
    }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Initialize error handler
errorHandler.initialize();

// Global error handler for uncaught exceptions
if (typeof window !== 'undefined') {
    window.onerror = function(message, source, lineno, colno, error) {
        errorHandler.handleError(error || message, { source, lineno, colno });
        return true; // Prevent default browser error handling
    };
}
