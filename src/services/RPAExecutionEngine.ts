import { 
  RPAJob, 
  RPAWorker, 
  RPAJobQueue, 
  RPATask, 
  RPAStep, 
  RPAExecution,
  RPAExecutionResult,
  ExecutionMetrics
} from '@/types/rpa';
import { Profile } from '@/components/profiles/CreateProfileModal';
import { enhancedRPAService } from './enhancedRPAService';

export class RPAExecutionEngine {
  private static instance: RPAExecutionEngine;
  private jobQueue: RPAJobQueue;
  private workers: Map<string, RPAWorker> = new Map();
  private activeJobs: Map<string, RPAJob> = new Map();
  private executionMetrics: Map<string, ExecutionMetrics> = new Map();
  
  // Event handlers for UI updates
  private onJobUpdate?: (job: RPAJob) => void;
  private onWorkerUpdate?: (worker: RPAWorker) => void;
  private onQueueUpdate?: (queue: RPAJobQueue) => void;

  private constructor() {
    this.jobQueue = {
      pending: [],
      running: [],
      completed: [],
      failed: [],
      workers: [],
      concurrencyLimit: 5,
      totalProcessed: 0
    };
    
    this.startWorkerMonitoring();
  }

  static getInstance(): RPAExecutionEngine {
    if (!RPAExecutionEngine.instance) {
      RPAExecutionEngine.instance = new RPAExecutionEngine();
    }
    return RPAExecutionEngine.instance;
  }

  // Event handlers for real-time UI updates
  setEventHandlers(handlers: {
    onJobUpdate?: (job: RPAJob) => void;
    onWorkerUpdate?: (worker: RPAWorker) => void;
    onQueueUpdate?: (queue: RPAJobQueue) => void;
  }) {
    this.onJobUpdate = handlers.onJobUpdate;
    this.onWorkerUpdate = handlers.onWorkerUpdate;
    this.onQueueUpdate = handlers.onQueueUpdate;
  }

  // Queue jobs for execution
  async queueTask(taskId: string, profiles: Profile[], priority: number = 1): Promise<string[]> {
    const task = enhancedRPAService.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const jobIds: string[] = [];
    
    for (const profile of profiles) {
      const job: RPAJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId,
        profileId: profile.id,
        profileName: profile.name,
        status: 'queued',
        priority,
        createdAt: new Date().toISOString(),
        progress: {
          currentStep: 0,
          totalSteps: task.steps.filter(s => s.enabled).length
        },
        retryCount: 0,
        maxRetries: task.settings.maxRetries
      };

      this.jobQueue.pending.push(job);
      this.activeJobs.set(job.id, job);
      jobIds.push(job.id);
      
      console.log(`📋 Queued job ${job.id} for profile ${profile.name}`);
    }

    // Sort pending jobs by priority
    this.jobQueue.pending.sort((a, b) => b.priority - a.priority);
    
    this.updateQueueMetrics();
    this.processQueue();
    
    return jobIds;
  }

  // Process the job queue
  private async processQueue(): Promise<void> {
    const availableWorkers = this.getAvailableWorkerCount();
    const pendingJobs = this.jobQueue.pending.length;
    
    if (availableWorkers === 0 || pendingJobs === 0) {
      return;
    }

    const jobsToProcess = Math.min(availableWorkers, pendingJobs);
    
    for (let i = 0; i < jobsToProcess; i++) {
      const job = this.jobQueue.pending.shift();
      if (job) {
        this.executeJob(job);
      }
    }
  }

  // Execute individual job
  private async executeJob(job: RPAJob): Promise<void> {
    const workerId = this.createWorker(job);
    const worker = this.workers.get(workerId);
    
    if (!worker) {
      console.error(`❌ Failed to create worker for job ${job.id}`);
      return;
    }

    try {
      // Update job status
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      job.workerId = workerId;
      
      // Move job to running queue
      this.jobQueue.running.push(job);
      this.updateJobStatus(job);

      console.log(`🚀 Started executing job ${job.id} on worker ${workerId}`);

      // Get task and execute steps
      const task = enhancedRPAService.getTaskById(job.taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Create execution record
      const execution = enhancedRPAService.createExecution(
        job.taskId, 
        job.profileId, 
        job.profileName
      );

      // Execute the task
      const result = await this.executeTaskSteps(task, job, worker, execution.id);
      
      // Complete job
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = result;
      
      // Update execution record
      enhancedRPAService.updateExecution(execution.id, {
        status: 'completed',
        endTime: new Date().toISOString(),
        duration: Date.now() - new Date(job.startedAt!).getTime(),
        result
      });

      console.log(`✅ Completed job ${job.id}`);

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date().toISOString();
      
      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'queued';
        this.jobQueue.pending.unshift(job); // High priority for retries
        console.log(`🔄 Retrying job ${job.id} (attempt ${job.retryCount}/${job.maxRetries})`);
      } else {
        this.jobQueue.failed.push(job);
      }

    } finally {
      // Move job from running to completed/failed
      this.jobQueue.running = this.jobQueue.running.filter(j => j.id !== job.id);
      
      if (job.status === 'completed') {
        this.jobQueue.completed.push(job);
      }
      
      // Clean up worker
      this.destroyWorker(workerId);
      this.updateJobStatus(job);
      this.updateQueueMetrics();
      
      // Process next jobs in queue
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  // Execute task steps sequentially
  private async executeTaskSteps(
    task: RPATask, 
    job: RPAJob, 
    worker: RPAWorker,
    executionId: string
  ): Promise<RPAExecutionResult> {
    const startTime = Date.now();
    const result: RPAExecutionResult = {
      success: false,
      stepsCompleted: 0,
      stepsSkipped: 0,
      stepsFailed: 0,
      executionTime: 0,
      extractedData: {},
      screenshots: [],
      errors: []
    };

    const enabledSteps = task.steps.filter(step => step.enabled);
    
    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      
      try {
        // Update job progress
        job.progress.currentStep = i + 1;
        job.progress.stepName = step.name;
        this.updateJobStatus(job);
        
        console.log(`🔧 Executing step ${i + 1}/${enabledSteps.length}: ${step.name}`);
        
        // Add execution log
        enhancedRPAService.addExecutionLog(executionId, {
          level: 'info',
          message: `Executing step: ${step.name}`,
          step: i + 1,
          stepName: step.name
        });

        // Execute the step
        const stepResult = await this.executeStep(step, worker, task);
        
        if (stepResult.success) {
          result.stepsCompleted++;
          
          // Merge extracted data
          if (stepResult.extractedData) {
            Object.assign(result.extractedData, stepResult.extractedData);
          }
          
          // Add screenshots
          if (stepResult.screenshot) {
            result.screenshots!.push(stepResult.screenshot);
          }
          
          enhancedRPAService.addExecutionLog(executionId, {
            level: 'info',
            message: `Step completed successfully: ${step.name}`,
            step: i + 1,
            stepName: step.name
          });
        } else {
          throw new Error(stepResult.error || 'Step execution failed');
        }

        // Human-like delay between steps
        if (task.settings.humanBehavior && task.settings.randomDelay) {
          const delay = Math.random() * (task.settings.delayMax - task.settings.delayMin) + task.settings.delayMin;
          await this.delay(delay);
        }

      } catch (stepError) {
        const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown step error';
        result.stepsFailed++;
        result.errors!.push(`Step ${i + 1} (${step.name}): ${errorMessage}`);
        
        enhancedRPAService.addExecutionLog(executionId, {
          level: 'error',
          message: `Step failed: ${step.name} - ${errorMessage}`,
          step: i + 1,
          stepName: step.name
        });

        // Handle error based on step configuration
        const errorAction = step.config.onError || 'continue';
        
        switch (errorAction) {
          case 'stop_task':
            throw stepError;
          case 'skip':
            result.stepsSkipped++;
            console.log(`⏭️ Skipping failed step: ${step.name}`);
            break;
          case 'retry':
            const retries = step.config.errorRetries || 1;
            for (let retry = 0; retry < retries; retry++) {
              try {
                await this.delay(1000); // Wait before retry
                const retryResult = await this.executeStep(step, worker, task);
                if (retryResult.success) {
                  result.stepsCompleted++;
                  break;
                }
              } catch (retryError) {
                if (retry === retries - 1) throw stepError;
              }
            }
            break;
          case 'continue':
          default:
            if (!task.settings.continueOnError) {
              throw stepError;
            }
            console.log(`➡️ Continuing after error in step: ${step.name}`);
            break;
        }
      }
    }

    result.executionTime = Date.now() - startTime;
    result.success = result.stepsFailed === 0 || task.settings.continueOnError;
    
    return result;
  }

  // Execute individual step (simulated - will be replaced with real browser automation)
  private async executeStep(
    step: RPAStep, 
    worker: RPAWorker, 
    task: RPATask
  ): Promise<{ success: boolean; error?: string; extractedData?: any; screenshot?: string }> {
    
    // Simulate step execution time
    const executionTime = Math.random() * 2000 + 500;
    await this.delay(executionTime);

    // Log step execution
    console.log(`📍 Worker ${worker.id}: Executing ${step.type} - ${step.name}`);

    // Simulate step-specific logic
    switch (step.type) {
      case 'open_url':
        console.log(`🌐 Opening URL: ${step.config.url}`);
        break;
      case 'click':
        console.log(`👆 Clicking element: ${step.config.selector}`);
        break;
      case 'input':
        console.log(`⌨️ Inputting text: ${step.config.inputText?.substring(0, 20)}...`);
        break;
      case 'wait':
        console.log(`⏱️ Waiting ${step.config.waitTime}ms`);
        if (step.config.waitTime) {
          await this.delay(step.config.waitTime);
        }
        break;
      case 'execute_js':
        console.log(`🔧 Executing JavaScript: ${step.config.jsCode?.substring(0, 30)}...`);
        break;
      case 'extract_text':
        console.log(`📊 Extracting data from: ${step.config.extractSelector}`);
        return {
          success: true,
          extractedData: {
            [step.config.extractVariable || 'data']: `Extracted data from ${step.config.extractSelector}`
          }
        };
      default:
        console.log(`🔧 Executing ${step.type}`);
    }

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: `Simulated failure in step: ${step.name}`
      };
    }

    return { success: true };
  }

  // Worker management
  private createWorker(job: RPAJob): string {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const worker: RPAWorker = {
      id: workerId,
      status: 'busy',
      currentJob: job.id,
      profileId: job.profileId,
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      capabilities: ['browser_automation', 'data_extraction', 'javascript_execution']
    };

    this.workers.set(workerId, worker);
    this.jobQueue.workers.push(worker);
    
    if (this.onWorkerUpdate) {
      this.onWorkerUpdate(worker);
    }
    
    console.log(`👷 Created worker ${workerId} for profile ${job.profileName}`);
    return workerId;
  }

  private destroyWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.workers.delete(workerId);
      this.jobQueue.workers = this.jobQueue.workers.filter(w => w.id !== workerId);
      
      console.log(`🧹 Destroyed worker ${workerId}`);
    }
  }

  private getAvailableWorkerCount(): number {
    const busyWorkers = this.workers.size;
    return Math.max(0, this.jobQueue.concurrencyLimit - busyWorkers);
  }

  // Queue management
  getQueueStatus(): RPAJobQueue {
    return { ...this.jobQueue };
  }

  getJobById(jobId: string): RPAJob | undefined {
    return this.activeJobs.get(jobId);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job) return false;

    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    
    // Remove from pending queue
    this.jobQueue.pending = this.jobQueue.pending.filter(j => j.id !== jobId);
    
    // If running, stop the worker
    if (job.workerId) {
      this.destroyWorker(job.workerId);
    }
    
    this.updateJobStatus(job);
    return true;
  }

  async pauseQueue(): Promise<void> {
    // Implementation for pausing queue
    console.log('⏸️ Queue paused');
  }

  async resumeQueue(): Promise<void> {
    // Implementation for resuming queue
    console.log('▶️ Queue resumed');
    this.processQueue();
  }

  setConcurrencyLimit(limit: number): void {
    this.jobQueue.concurrencyLimit = Math.max(1, limit);
    this.processQueue();
  }

  // Monitoring and metrics
  private updateJobStatus(job: RPAJob): void {
    if (this.onJobUpdate) {
      this.onJobUpdate({ ...job });
    }
  }

  private updateQueueMetrics(): void {
    this.jobQueue.totalProcessed = this.jobQueue.completed.length + this.jobQueue.failed.length;
    
    if (this.onQueueUpdate) {
      this.onQueueUpdate({ ...this.jobQueue });
    }
  }

  private startWorkerMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Check for stuck workers (no heartbeat for 5 minutes)
      this.workers.forEach((worker, workerId) => {
        const lastHeartbeat = new Date(worker.lastHeartbeat).getTime();
        if (now - lastHeartbeat > 300000) { // 5 minutes
          console.warn(`⚠️ Worker ${workerId} appears stuck, destroying...`);
          this.destroyWorker(workerId);
        }
      });
      
    }, 60000); // Check every minute
  }

  getExecutionMetrics(taskId: string): ExecutionMetrics | undefined {
    return this.executionMetrics.get(taskId);
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  shutdown(): void {
    console.log('🛑 Shutting down RPA Execution Engine...');
    
    // Cancel all pending jobs
    this.jobQueue.pending.forEach(job => {
      job.status = 'cancelled';
    });
    
    // Destroy all workers
    this.workers.forEach((_, workerId) => {
      this.destroyWorker(workerId);
    });
    
    console.log('✅ RPA Execution Engine shutdown complete');
  }
}

export const rpaExecutionEngine = RPAExecutionEngine.getInstance();