/**
 * Performance Utilities for KRK Generator Application
 * Optimizations for handling large datasets and improving user experience
 */

import { PERFORMANCE_METRICS, FEATURE_FLAGS } from '../config.js';

// Performance Monitor Class
export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isEnabled = FEATURE_FLAGS.PERFORMANCE_MONITORING;
    }

    // Start timing a operation
    startTiming(label) {
        if (!this.isEnabled) return;
        this.metrics.set(label, performance.now());
    }

    // End timing and log if over threshold
    endTiming(label) {
        if (!this.isEnabled) return;
        const startTime = this.metrics.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            if (duration > PERFORMANCE_METRICS.RENDER_THRESHOLD) {
                console.warn(`Performance: ${label} took ${duration.toFixed(2)}ms`);
            }
            this.metrics.delete(label);
            return duration;
        }
    }

    // Monitor memory usage
    checkMemoryUsage() {
        if (!this.isEnabled || !performance.memory) return;
        
        const memory = performance.memory;
        if (memory.usedJSHeapSize > PERFORMANCE_METRICS.MEMORY_THRESHOLD) {
            console.warn(`Memory usage high: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
            this.triggerGarbageCollection();
        }
    }

    // Trigger garbage collection if available
    triggerGarbageCollection() {
        if (window.gc) {
            window.gc();
        }
    }

    // Create performance observer
    observePerformance(type, callback) {
        if (!this.isEnabled || !PerformanceObserver) return;
        
        try {
            const observer = new PerformanceObserver(callback);
            observer.observe({ entryTypes: [type] });
            this.observers.set(type, observer);
        } catch (error) {
            console.warn('Performance observer not supported:', error);
        }
    }

    // Disconnect all observers
    disconnect() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// Debounce function for performance optimization
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// Throttle function for performance optimization
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Virtual Scrolling Implementation
export class VirtualScroller {
    constructor(container, itemHeight, renderItem, getItemCount) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.getItemCount = getItemCount;
        this.visibleItems = new Map();
        this.scrollTop = 0;
        this.containerHeight = 0;
        
        this.init();
    }

    init() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        // Create viewport
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'relative';
        this.container.appendChild(this.viewport);
        
        // Bind scroll event
        this.container.addEventListener('scroll', throttle(() => {
            this.handleScroll();
        }, 16)); // 60fps
        
        this.updateContainerHeight();
        this.render();
    }

    updateContainerHeight() {
        this.containerHeight = this.container.clientHeight;
        const totalHeight = this.getItemCount() * this.itemHeight;
        this.viewport.style.height = `${totalHeight}px`;
    }

    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }

    render() {
        const itemCount = this.getItemCount();
        const visibleStart = Math.floor(this.scrollTop / this.itemHeight);
        const visibleEnd = Math.min(
            visibleStart + Math.ceil(this.containerHeight / this.itemHeight) + 1,
            itemCount
        );

        // Remove items that are no longer visible
        for (const [index, element] of this.visibleItems) {
            if (index < visibleStart || index >= visibleEnd) {
                element.remove();
                this.visibleItems.delete(index);
            }
        }

        // Add new visible items
        for (let i = visibleStart; i < visibleEnd; i++) {
            if (!this.visibleItems.has(i)) {
                const element = this.renderItem(i);
                element.style.position = 'absolute';
                element.style.top = `${i * this.itemHeight}px`;
                element.style.left = '0';
                element.style.right = '0';
                element.style.height = `${this.itemHeight}px`;
                
                this.viewport.appendChild(element);
                this.visibleItems.set(i, element);
            }
        }
    }

    scrollToIndex(index) {
        const targetScrollTop = index * this.itemHeight;
        this.container.scrollTop = targetScrollTop;
    }

    refresh() {
        this.updateContainerHeight();
        this.render();
    }

    destroy() {
        this.visibleItems.clear();
        this.viewport.remove();
    }
}

// Lazy Loading Implementation
export class LazyLoader {
    constructor(options = {}) {
        this.options = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        };
        
        this.observer = null;
        this.init();
    }

    init() {
        if (!IntersectionObserver) {
            console.warn('IntersectionObserver not supported');
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, this.options);
    }

    observe(element) {
        if (this.observer) {
            this.observer.observe(element);
        } else {
            // Fallback for unsupported browsers
            this.loadElement(element);
        }
    }

    loadElement(element) {
        // Add loading class
        element.classList.add('lazy-loading');
        
        // Simulate loading delay
        setTimeout(() => {
            element.classList.remove('lazy-loading');
            element.classList.add('lazy-loaded');
            
            // Trigger custom event
            element.dispatchEvent(new CustomEvent('lazyloaded'));
        }, 100);
    }

    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Memory Cache Implementation
export class MemoryCache {
    constructor(maxSize = 100, ttl = 30 * 60 * 1000) { // 30 minutes default TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.hitCount = 0;
        this.missCount = 0;
    }

    set(key, value) {
        // Remove oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            this.missCount++;
            return null;
        }

        // Check if item has expired
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            this.missCount++;
            return null;
        }

        this.hitCount++;
        return item.value;
    }

    has(key) {
        return this.cache.has(key) && !this.isExpired(key);
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }

    isExpired(key) {
        const item = this.cache.get(key);
        return item && (Date.now() - item.timestamp > this.ttl);
    }

    getHitRatio() {
        const total = this.hitCount + this.missCount;
        return total > 0 ? this.hitCount / total : 0;
    }

    getStats() {
        return {
            size: this.cache.size,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRatio: this.getHitRatio()
        };
    }

    // Clean expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Batch Processing Utility
export class BatchProcessor {
    constructor(batchSize = 50, delay = 0) {
        this.batchSize = batchSize;
        this.delay = delay;
        this.queue = [];
        this.processing = false;
    }

    add(item) {
        this.queue.push(item);
        if (!this.processing) {
            this.process();
        }
    }

    async process() {
        this.processing = true;
        
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            
            try {
                await this.processBatch(batch);
            } catch (error) {
                console.error('Batch processing error:', error);
            }
            
            // Add delay between batches to prevent blocking
            if (this.delay > 0 && this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }
        }
        
        this.processing = false;
    }

    async processBatch(batch) {
        // Override this method in subclasses
        return Promise.all(batch.map(item => this.processItem(item)));
    }

    async processItem(item) {
        // Override this method in subclasses
        return item;
    }
}

// File Processing Utilities
export class FileProcessor {
    static async readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    static async readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    static async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    static validateFileSize(file, maxSize) {
        return file.size <= maxSize;
    }

    static validateFileType(file, allowedTypes) {
        return allowedTypes.some(type => 
            file.name.toLowerCase().endsWith(type.toLowerCase()) ||
            file.type.includes(type.replace('.', ''))
        );
    }

    // Process files in chunks to avoid blocking
    static async processLargeFile(file, chunkSize = 1024 * 1024) {
        const chunks = [];
        let offset = 0;

        while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize);
            const arrayBuffer = await this.readFileAsArrayBuffer(chunk);
            chunks.push(new Uint8Array(arrayBuffer));
            offset += chunkSize;

            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return chunks;
    }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize performance monitoring
if (FEATURE_FLAGS.PERFORMANCE_MONITORING) {
    // Monitor long tasks
    performanceMonitor.observePerformance('longtask', (list) => {
        list.getEntries().forEach(entry => {
            console.warn(`Long task detected: ${entry.duration}ms`);
        });
    });

    // Monitor memory periodically
    setInterval(() => {
        performanceMonitor.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
}

// Export singleton instances
export const globalCache = new MemoryCache();
export const lazyLoader = new LazyLoader();
