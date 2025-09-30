import { RPATask, RPAStep, RPAExecution } from '@/types/rpa';
import { enhancedRPAService } from './enhancedRPAService';
import { Profile } from '@/components/profiles/CreateProfileModal';

export class AutomationExecutor {
  private static instance: AutomationExecutor;
  private activeExecutions = new Map<string, RPAExecution>();

  static getInstance(): AutomationExecutor {
    if (!AutomationExecutor.instance) {
      AutomationExecutor.instance = new AutomationExecutor();
    }
    return AutomationExecutor.instance;
  }

  // Execute a task on multiple profiles
  async executeTaskOnProfiles(taskId: string, profiles: Profile[]): Promise<void> {
    const task = enhancedRPAService.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    console.log(`🚀 Starting bulk execution of "${task.name}" on ${profiles.length} profiles`);
    
    // Create executions for each profile
    const executions = profiles.map(profile => {
      const execution = enhancedRPAService.createExecution(taskId, profile.id, profile.name);
      this.activeExecutions.set(execution.id, execution);
      return execution;
    });

    // Execute tasks concurrently on all profiles
    const promises = executions.map(execution => 
      this.executeTaskOnProfile(task, execution)
    );

    try {
      await Promise.allSettled(promises);
      console.log(`✅ Bulk execution completed for "${task.name}"`);
    } catch (error) {
      console.error('❌ Bulk execution failed:', error);
    }
  }

  // Execute a single task on one profile
  private async executeTaskOnProfile(task: RPATask, execution: RPAExecution): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update execution status to running
      enhancedRPAService.updateExecution(execution.id, {
        status: 'running',
        currentStep: 0
      });

      enhancedRPAService.addExecutionLog(execution.id, {
        level: 'info',
        message: `Starting execution of "${task.name}" on profile "${execution.profileName}"`,
        step: 0,
        stepName: 'Initialization'
      });

      // Execute each step
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        if (!step.enabled) continue;

        try {
          enhancedRPAService.updateExecution(execution.id, { currentStep: i + 1 });
          
          enhancedRPAService.addExecutionLog(execution.id, {
            level: 'info',
            message: `Executing step: ${step.name}`,
            step: i + 1,
            stepName: step.name
          });

          // Simulate step execution (in real implementation, this would interact with browser)
          await this.executeStep(step, execution);
          
          enhancedRPAService.addExecutionLog(execution.id, {
            level: 'info',
            message: `Step completed successfully: ${step.name}`,
            step: i + 1,
            stepName: step.name
          });

          // Add human-like delay between steps
          if (task.settings.humanBehavior && task.settings.randomDelay) {
            const delay = Math.random() * (task.settings.delayMax - task.settings.delayMin) + task.settings.delayMin;
            await this.delay(delay);
          }

        } catch (stepError) {
          enhancedRPAService.addExecutionLog(execution.id, {
            level: 'error',
            message: `Step failed: ${step.name} - ${stepError}`,
            step: i + 1,
            stepName: step.name
          });

          if (!task.settings.continueOnError) {
            throw stepError;
          }
        }
      }

      // Mark execution as completed
      const duration = Date.now() - startTime;
      enhancedRPAService.updateExecution(execution.id, {
        status: 'completed',
        endTime: new Date().toISOString(),
        duration,
        result: {
          success: true,
          stepsCompleted: task.steps.filter(s => s.enabled).length,
          stepsSkipped: 0,
          stepsFailed: 0,
          executionTime: duration,
          extractedData: {},
          screenshots: [],
          errors: []
        }
      });

      enhancedRPAService.addExecutionLog(execution.id, {
        level: 'info',
        message: `Task completed successfully in ${duration}ms`,
        step: task.steps.length,
        stepName: 'Completion'
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      enhancedRPAService.updateExecution(execution.id, {
        status: 'failed',
        endTime: new Date().toISOString(),
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      enhancedRPAService.addExecutionLog(execution.id, {
        level: 'error',
        message: `Task failed: ${error}`,
        step: execution.currentStep || 0,
        stepName: 'Error'
      });
    } finally {
      this.activeExecutions.delete(execution.id);
    }
  }

  // Execute individual step (simulated for now)
  private async executeStep(step: RPAStep, execution: RPAExecution): Promise<void> {
    // Simulate step execution time
    const executionTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    await this.delay(executionTime);

    // Log step-specific actions
    switch (step.type) {
      case 'navigate':
        console.log(`📍 Navigating to: ${step.config.url}`);
        break;
      case 'click':
        console.log(`👆 Clicking element: ${step.config.selector}`);
        break;
      case 'input':
        console.log(`⌨️ Inputting text into: ${step.config.selector}`);
        break;
      case 'wait':
        console.log(`⏱️ Waiting ${step.config.waitTime}ms`);
        if (step.config.waitTime) {
          await this.delay(step.config.waitTime);
        }
        break;
      case 'scroll':
        console.log(`📜 Scrolling ${step.config.scrollDirection} by ${step.config.scrollAmount}px`);
        break;
      case 'extract':
        console.log(`📊 Extracting data from: ${step.config.extractSelector}`);
        break;
      case 'screenshot':
        console.log(`📸 Taking screenshot`);
        break;
      default:
        console.log(`🔧 Executing ${step.type} step`);
    }

    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error(`Simulated failure in step: ${step.name}`);
    }
  }

  // Stop execution for a profile
  async stopExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      enhancedRPAService.updateExecution(executionId, {
        status: 'cancelled',
        endTime: new Date().toISOString()
      });
      
      enhancedRPAService.addExecutionLog(executionId, {
        level: 'info',
        message: 'Execution stopped by user',
        step: execution.currentStep || 0,
        stepName: 'Cancellation'
      });

      this.activeExecutions.delete(executionId);
    }
  }

  // Get active executions
  getActiveExecutions(): RPAExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const automationExecutor = AutomationExecutor.getInstance();