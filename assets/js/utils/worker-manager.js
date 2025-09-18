/**
 * Worker Manager
 * Manages web workers for heavy computations
 */

export class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.callbacks = new Map();
        this.workerCount = navigator.hardwareConcurrency || 4;
    }

    // Initialize workers
    async initialize() {
        // Create worker pool
        for (let i = 0; i < this.workerCount; i++) {
            await this.createWorker(`worker-${i}`);
        }
        console.log(`Initialized ${this.workerCount} workers`);
    }

    // Create a new worker
    async createWorker(id) {
        if (this.workers.has(id)) {
            console.warn(`Worker ${id} already exists`);
            return this.workers.get(id);
        }

        try {
            // Create a new worker using the worker file
            const workerCode = await import('!!raw-loader!../workers/data-processor.worker.js');
            const blob = new Blob([workerCode.default], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);

            // Set up message handler
            worker.onmessage = (e) => this.handleWorkerMessage(id, e.data);
            worker.onerror = (error) => this.handleWorkerError(id, error);

            // Store worker
            this.workers.set(id, worker);
            this.callbacks.set(id, new Map());

            return worker;
        } catch (error) {
            console.error('Failed to create worker:', error);
            throw error;
        }
    }

    // Get the least busy worker
    getAvailableWorker() {
        let minTasks = Infinity;
        let availableWorkerId = null;

        for (const [id, callbacks] of this.callbacks) {
            if (callbacks.size < minTasks) {
                minTasks = callbacks.size;
                availableWorkerId = id;
            }
        }

        return availableWorkerId ? {
            id: availableWorkerId,
            worker: this.workers.get(availableWorkerId)
        } : null;
    }

    // Execute a task in a worker
    async execute(taskType, payload) {
        const taskId = this.generateTaskId();
        const workerInfo = this.getAvailableWorker();

        if (!workerInfo) {
            throw new Error('No available workers');
        }

        const { id: workerId, worker } = workerInfo;

        return new Promise((resolve, reject) => {
            // Store the callback
            this.callbacks.get(workerId).set(taskId, { resolve, reject });

            // Post message to worker
            worker.postMessage({
                id: taskId,
                type: taskType,
                payload
            });

            // Set timeout for worker response
            const timeout = setTimeout(() => {
                this.callbacks.get(workerId).delete(taskId);
                reject(new Error('Worker task timed out'));
            }, 30000); // 30 seconds timeout

            // Store timeout ID for cleanup
            this.callbacks.get(workerId).get(taskId).timeout = timeout;
        });
    }

    // Handle worker messages
    handleWorkerMessage(workerId, { id, result, error }) {
        const callbacks = this.callbacks.get(workerId);
        if (!callbacks) return;

        const task = callbacks.get(id);
        if (!task) return;

        // Clear timeout
        if (task.timeout) {
            clearTimeout(task.timeout);
        }

        // Resolve or reject the promise
        if (error) {
            const err = new Error(error.message);
            err.name = error.name;
            err.stack = error.stack;
            task.reject(err);
        } else {
            task.resolve(result);
        }

        // Clean up
        callbacks.delete(id);
    }

    // Handle worker errors
    handleWorkerError(workerId, error) {
        console.error(`Worker ${workerId} error:`, error);
        
        // Reject all pending tasks for this worker
        const callbacks = this.callbacks.get(workerId);
        if (callbacks) {
            for (const [id, { reject, timeout }] of callbacks) {
                if (timeout) clearTimeout(timeout);
                reject(new Error(`Worker error: ${error.message}`));
            }
            callbacks.clear();
        }

        // Attempt to restart the worker
        this.restartWorker(workerId).catch(console.error);
    }

    // Restart a failed worker
    async restartWorker(workerId) {
        console.log(`Restarting worker ${workerId}...`);
        
        // Terminate the existing worker
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.terminate();
            this.workers.delete(workerId);
            this.callbacks.delete(workerId);
        }

        // Create a new worker
        return this.createWorker(workerId);
    }

    // Generate a unique task ID
    generateTaskId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Terminate all workers
    terminateAll() {
        for (const [id, worker] of this.workers) {
            worker.terminate();
            this.workers.delete(id);
            this.callbacks.delete(id);
        }
    }
}

// Export singleton instance
export const workerManager = new WorkerManager();

// Initialize worker manager
workerManager.initialize().catch(console.error);
