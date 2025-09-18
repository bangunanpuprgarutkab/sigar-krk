/**
 * Worker Manager Tests
 */

import { workerManager } from '../../assets/js/utils/worker-manager.js';

// Mock the worker
class MockWorker {
    constructor() {
        this.onmessage = null;
        this.onerror = null;
        this.terminated = false;
    }
    
    postMessage(data) {
        // Simulate async response
        setTimeout(() => {
            if (this.onmessage) {
                this.onmessage({
                    data: {
                        id: data.id,
                        result: { success: true, type: data.type }
                    }
                });
            }
        }, 10);
    }
    
    terminate() {
        this.terminated = true;
    }
}

// Mock the Worker constructor
global.Worker = MockWorker;

describe('Worker Manager', () => {
    beforeEach(() => {
        // Reset the worker manager before each test
        workerManager.terminateAll();
    });

    test('should initialize workers', async () => {
        await workerManager.initialize();
        expect(workerManager.workers.size).toBe(workerManager.workerCount);
    });

    test('should execute tasks in workers', async () => {
        await workerManager.initialize();
        
        const result = await workerManager.execute('TEST_TASK', { data: 'test' });
        
        expect(result).toEqual({
            success: true,
            type: 'TEST_TASK'
        });
    });

    test('should handle worker errors', async () => {
        await workerManager.initialize();
        
        // Mock worker error
        const workerId = Array.from(workerManager.workers.keys())[0];
        const worker = workerManager.workers.get(workerId);
        
        // Create a task that will fail
        const task = workerManager.execute('FAILING_TASK', { data: 'test' });
        
        // Simulate worker error
        worker.onerror(new Error('Worker error'));
        
        // The worker should be restarted, so the task should be rejected
        await expect(task).rejects.toThrow('Worker error');
        
        // The worker should be replaced with a new one
        expect(workerManager.workers.get(workerId)).not.toBe(worker);
    });

    test('should handle task timeouts', async () => {
        await workerManager.initialize();
        
        // Mock a slow worker
        const originalPostMessage = MockWorker.prototype.postMessage;
        MockWorker.prototype.postMessage = function() {
            // Don't respond, let it time out
        };
        
        await expect(
            workerManager.execute('SLOW_TASK', { data: 'test' })
        ).rejects.toThrow('Worker task timed out');
        
        // Restore original implementation
        MockWorker.prototype.postMessage = originalPostMessage;
    });

    test('should distribute tasks among workers', async () => {
        await workerManager.initialize();
        
        // Execute multiple tasks
        const tasks = [];
        for (let i = 0; i < 10; i++) {
            tasks.push(workerManager.execute(`TASK_${i}`, { data: i }));
        }
        
        const results = await Promise.all(tasks);
        
        // All tasks should complete successfully
        expect(results.length).toBe(10);
        results.forEach((result, i) => {
            expect(result).toEqual({
                success: true,
                type: `TASK_${i}`
            });
        });
    });

    test('should terminate all workers', async () => {
        await workerManager.initialize();
        
        // Get a worker and verify it's not terminated
        const workerId = Array.from(workerManager.workers.keys())[0];
        const worker = workerManager.workers.get(workerId);
        
        // Terminate all workers
        workerManager.terminateAll();
        
        // Check that all workers are terminated
        expect(worker.terminated).toBe(true);
        expect(workerManager.workers.size).toBe(0);
        expect(workerManager.callbacks.size).toBe(0);
    });
});
