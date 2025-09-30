import { 
  RPATask, 
  RPAStep, 
  RPAExecution, 
  RPAExecutionResult,
  RPAJob,
  RPAWorker
} from '@/types/rpa';
import { Profile } from '@/components/profiles/CreateProfileModal';

export interface BrowserRPAConfig {
  timeout: number;
  retries: number;
  delay: number;
  humanBehavior: boolean;
  randomDelay: boolean;
  delayMin: number;
  delayMax: number;
  screenshotOnError: boolean;
  logLevel: 'basic' | 'detailed' | 'verbose';
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'input' | 'wait' | 'scroll' | 'extract' | 'screenshot' | 'hover' | 'dropdown' | 'focus' | 'close_tab' | 'new_tab' | 'switch_tab' | 'refresh' | 'go_back';
  selector?: string;
  selectorType?: 'css' | 'xpath' | 'text' | 'id' | 'class';
  text?: string;
  url?: string;
  waitTime?: number;
  scrollAmount?: number;
  scrollDirection?: 'up' | 'down' | 'left' | 'right';
  extractVariable?: string;
  extractType?: 'text' | 'attribute' | 'html' | 'value';
  extractAttribute?: string;
  clickType?: 'single' | 'double' | 'right';
  inputType?: 'type' | 'paste' | 'clear';
  typingSpeed?: number;
  clearFirst?: boolean;
  timeout?: number;
  retries?: number;
  onError?: 'continue' | 'stop' | 'retry' | 'skip';
  errorRetries?: number;
}

export class BrowserRPAService {
  private static instance: BrowserRPAService;
  private activeExecutions: Map<string, RPAExecution> = new Map();
  private executionQueue: RPAJob[] = [];
  private maxConcurrentExecutions = 5;
  private runningExecutions = 0;

  static getInstance(): BrowserRPAService {
    if (!BrowserRPAService.instance) {
      BrowserRPAService.instance = new BrowserRPAService();
    }
    return BrowserRPAService.instance;
  }

  /**
   * Execute RPA task on browser profile
   */
  async executeTaskOnProfile(
    task: RPATask, 
    profile: Profile, 
    config: Partial<BrowserRPAConfig> = {}
  ): Promise<RPAExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mergedConfig = this.mergeConfig(config);
    
    const execution: RPAExecution = {
      id: executionId,
      taskId: task.id,
      profileId: profile.id,
      profileName: profile.name,
      status: 'pending',
      startTime: new Date().toISOString(),
      totalSteps: task.steps.filter(s => s.enabled).length,
      logs: []
    };

    this.activeExecutions.set(executionId, execution);

    try {
      console.log(`🚀 Starting RPA execution ${executionId} for profile ${profile.name}`);
      
      // Check if profile window is open
      const profileWindow = await this.getProfileWindow(profile.id);
      if (!profileWindow) {
        throw new Error(`Profile window not found for ${profile.name}`);
      }

      execution.status = 'running';
      this.updateExecution(execution);

      // Convert RPA steps to browser actions
      const browserActions = this.convertStepsToActions(task.steps.filter(s => s.enabled));
      
      // Execute actions sequentially
      const result = await this.executeActions(
        browserActions, 
        profileWindow, 
        execution, 
        mergedConfig
      );

      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      execution.duration = Date.now() - new Date(execution.startTime).getTime();
      execution.result = result;

      this.updateExecution(execution);
      console.log(`✅ RPA execution ${executionId} completed successfully`);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      execution.duration = Date.now() - new Date(execution.startTime).getTime();
      execution.error = errorMessage;

      this.addExecutionLog(executionId, {
        level: 'error',
        message: `Execution failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });

      this.updateExecution(execution);
      console.error(`❌ RPA execution ${executionId} failed:`, errorMessage);

      throw error;
    } finally {
      this.runningExecutions--;
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute multiple tasks on multiple profiles with concurrency control
   */
  async executeBulkTasks(
    tasks: RPATask[], 
    profiles: Profile[], 
    config: Partial<BrowserRPAConfig> = {}
  ): Promise<Map<string, RPAExecutionResult>> {
    const results = new Map<string, RPAExecutionResult>();
    const mergedConfig = this.mergeConfig(config);

    console.log(`🔄 Starting bulk execution: ${tasks.length} tasks on ${profiles.length} profiles`);

    // Create execution jobs
    const jobs: RPAJob[] = [];
    for (const task of tasks) {
      for (const profile of profiles) {
        jobs.push({
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          taskId: task.id,
          profileId: profile.id,
          profileName: profile.name,
          status: 'queued',
          priority: 1,
          createdAt: new Date().toISOString(),
          progress: {
            currentStep: 0,
            totalSteps: task.steps.filter(s => s.enabled).length
          },
          retryCount: 0,
          maxRetries: mergedConfig.retries
        });
      }
    }

    // Process jobs with concurrency limit
    const chunks = this.chunkArray(jobs, this.maxConcurrentExecutions);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (job) => {
        try {
          const task = tasks.find(t => t.id === job.taskId);
          const profile = profiles.find(p => p.id === job.profileId);
          
          if (!task || !profile) {
            throw new Error('Task or profile not found');
          }

          const result = await this.executeTaskOnProfile(task, profile, mergedConfig);
          results.set(job.id, result);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Job ${job.id} failed:`, errorMessage);
          
          results.set(job.id, {
            success: false,
            stepsCompleted: 0,
            stepsSkipped: 0,
            stepsFailed: 1,
            executionTime: 0,
            extractedData: {},
            screenshots: [],
            errors: [errorMessage]
          });
        }
      });

      await Promise.all(promises);
      
      // Add delay between chunks for human-like behavior
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(mergedConfig.delay);
      }
    }

    console.log(`✅ Bulk execution completed: ${results.size} results`);
    return results;
  }

  /**
   * Convert RPA steps to browser actions
   */
  private convertStepsToActions(steps: RPAStep[]): BrowserAction[] {
    return steps.map(step => {
      const action: BrowserAction = {
        type: this.mapStepTypeToActionType(step.type),
        timeout: step.config.timeout || 30000,
        retries: step.config.errorRetries || 1,
        onError: step.config.onError || 'continue'
      };

      // Map step-specific configurations
      switch (step.type) {
        case 'navigate':
          action.url = step.config.url;
          break;
        case 'click':
          action.selector = step.config.selector;
          action.selectorType = step.config.selectorType || 'css';
          action.clickType = step.config.clickType || 'single';
          break;
        case 'input':
          action.selector = step.config.selector;
          action.selectorType = step.config.selectorType || 'css';
          action.text = step.config.inputText;
          action.inputType = step.config.inputType || 'type';
          action.typingSpeed = step.config.typingSpeed || 50;
          action.clearFirst = step.config.clearFirst || false;
          break;
        case 'wait':
          action.waitTime = step.config.waitTime || 1000;
          break;
        case 'scroll':
          action.scrollAmount = step.config.scrollAmount || 300;
          action.scrollDirection = step.config.scrollDirection || 'down';
          break;
        case 'extract':
          action.selector = step.config.extractSelector;
          action.selectorType = step.config.selectorType || 'css';
          action.extractVariable = step.config.extractVariable;
          action.extractType = step.config.extractType || 'text';
          action.extractAttribute = step.config.extractAttribute;
          break;
      }

      return action;
    });
  }

  /**
   * Map RPA step types to browser action types
   */
  private mapStepTypeToActionType(stepType: string): BrowserAction['type'] {
    const typeMap: Record<string, BrowserAction['type']> = {
      'navigate': 'navigate',
      'click': 'click',
      'input': 'input',
      'wait': 'wait',
      'scroll': 'scroll',
      'extract': 'extract',
      'screenshot': 'screenshot',
      'hover': 'hover',
      'dropdown': 'dropdown',
      'focus': 'focus',
      'close_tab': 'close_tab',
      'new_tab': 'new_tab',
      'switch_tab': 'switch_tab',
      'refresh': 'refresh',
      'go_back': 'go_back'
    };

    return typeMap[stepType] || 'wait';
  }

  /**
   * Execute browser actions
   */
  private async executeActions(
    actions: BrowserAction[],
    profileWindow: any,
    execution: RPAExecution,
    config: BrowserRPAConfig
  ): Promise<RPAExecutionResult> {
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

    const startTime = Date.now();

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      try {
        console.log(`🔧 Executing action ${i + 1}/${actions.length}: ${action.type}`);
        
        this.addExecutionLog(execution.id, {
          level: 'info',
          message: `Executing ${action.type}: ${action.selector || action.url || 'N/A'}`,
          step: i + 1,
          stepName: `${action.type} action`
        });

        // Execute the action
        const actionResult = await this.executeAction(action, profileWindow, config);
        
        if (actionResult.success) {
          result.stepsCompleted++;
          
          // Merge extracted data
          if (actionResult.extractedData) {
            Object.assign(result.extractedData, actionResult.extractedData);
          }
          
          // Add screenshots
          if (actionResult.screenshot) {
            result.screenshots!.push(actionResult.screenshot);
          }
          
          this.addExecutionLog(execution.id, {
            level: 'info',
            message: `Action completed successfully: ${action.type}`,
            step: i + 1,
            stepName: `${action.type} action`
          });
        } else {
          throw new Error(actionResult.error || 'Action execution failed');
        }

        // Human-like delay between actions
        if (config.humanBehavior && config.randomDelay) {
          const delay = Math.random() * (config.delayMax - config.delayMin) + config.delayMin;
          await this.delay(delay);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown action error';
        result.stepsFailed++;
        result.errors!.push(`Action ${i + 1} (${action.type}): ${errorMessage}`);
        
        this.addExecutionLog(execution.id, {
          level: 'error',
          message: `Action failed: ${action.type} - ${errorMessage}`,
          step: i + 1,
          stepName: `${action.type} action`
        });

        // Handle error based on action configuration
        switch (action.onError) {
          case 'stop':
            throw error;
          case 'skip':
            result.stepsSkipped++;
            console.log(`⏭️ Skipping failed action: ${action.type}`);
            break;
          case 'retry':
            const retries = action.errorRetries || 1;
            for (let retry = 0; retry < retries; retry++) {
              try {
                await this.delay(1000);
                const retryResult = await this.executeAction(action, profileWindow, config);
                if (retryResult.success) {
                  result.stepsCompleted++;
                  break;
                }
              } catch (retryError) {
                if (retry === retries - 1) throw error;
              }
            }
            break;
          case 'continue':
          default:
            console.log(`➡️ Continuing after error in action: ${action.type}`);
            break;
        }
      }
    }

    result.executionTime = Date.now() - startTime;
    result.success = result.stepsFailed === 0;

    return result;
  }

  /**
   * Execute individual browser action
   */
  private async executeAction(
    action: BrowserAction,
    profileWindow: any,
    config: BrowserRPAConfig
  ): Promise<{ success: boolean; error?: string; extractedData?: any; screenshot?: string }> {
    
    try {
      // Get the webview element from the profile window
      const webview = await this.getWebviewFromProfileWindow(profileWindow);
      if (!webview) {
        throw new Error('Webview not found in profile window');
      }

      // Execute action in webview context
      const result = await webview.executeJavaScript(`
        (async function() {
          try {
            console.log('🌐 Executing browser action: ${action.type}');
            
            const page = {
              goto: async (url) => {
                console.log('📍 Navigating to:', url);
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  url = 'https://' + url;
                }
                window.location.href = url;
                await new Promise(resolve => {
                  const checkLoad = () => {
                    if (document.readyState === 'complete') {
                      resolve();
                    } else {
                      setTimeout(checkLoad, 100);
                    }
                  };
                  checkLoad();
                });
                console.log('✅ Navigation completed');
              },
              
              waitForSelector: async (selector, timeout = 30000) => {
                console.log('⏳ Waiting for selector:', selector);
                return new Promise((resolve, reject) => {
                  const startTime = Date.now();
                  const checkElement = () => {
                    const element = document.querySelector(selector);
                    if (element) {
                      console.log('✅ Element found:', selector);
                      resolve(element);
                    } else if (Date.now() - startTime > timeout) {
                      reject(new Error('Timeout waiting for selector: ' + selector));
                    } else {
                      setTimeout(checkElement, 200);
                    }
                  };
                  checkElement();
                });
              },
              
              waitForTimeout: async (ms) => {
                console.log('⏱️ Waiting for:', ms + 'ms');
                await new Promise(resolve => setTimeout(resolve, ms));
              },
              
              type: async (selector, text, options = {}) => {
                console.log('⌨️ Typing in:', selector, 'text:', text);
                const element = document.querySelector(selector);
                if (!element) {
                  throw new Error('Element not found: ' + selector);
                }
                
                element.focus();
                if (options.clearFirst) {
                  element.value = '';
                }
                
                for (let i = 0; i < text.length; i++) {
                  const char = text[i];
                  element.value += char;
                  
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                  element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
                  
                  const delay = options.delay || (50 + Math.random() * 100);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('✅ Typing completed');
              },
              
              click: async (selector, options = {}) => {
                console.log('👆 Clicking:', selector);
                const element = document.querySelector(selector);
                if (!element) {
                  throw new Error('Element not found: ' + selector);
                }
                
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const rect = element.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                
                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                  element.dispatchEvent(new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y,
                    button: 0
                  }));
                });
                
                element.click();
                console.log('✅ Click completed');
                await new Promise(resolve => setTimeout(resolve, 1000));
              },
              
              scroll: async (options = {}) => {
                console.log('📜 Scrolling:', options);
                const amount = options.amount || 300;
                const direction = options.direction === 'up' ? -1 : 1;
                const scrollAmount = amount * direction;
                
                window.scrollBy({
                  top: scrollAmount,
                  left: 0,
                  behavior: 'smooth'
                });
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log('✅ Scroll completed');
              },
              
              extract: async (selector, options = {}) => {
                console.log('📊 Extracting data from:', selector);
                const elements = document.querySelectorAll(selector);
                const results = [];
                
                for (const element of elements) {
                  let value;
                  switch (options.type || 'text') {
                    case 'text':
                      value = element.textContent;
                      break;
                    case 'attribute':
                      value = element.getAttribute(options.attribute);
                      break;
                    case 'html':
                      value = element.innerHTML;
                      break;
                    case 'value':
                      value = element.value;
                      break;
                    default:
                      value = element.textContent;
                  }
                  results.push(value);
                }
                
                console.log('✅ Data extracted:', results.length, 'items');
                return results;
              },
              
              screenshot: async () => {
                console.log('📸 Taking screenshot');
                // Screenshot functionality would be implemented here
                return 'screenshot_data';
              }
            };
            
            // Execute the specific action
            let result = null;
            
            switch ('${action.type}') {
              case 'navigate':
                await page.goto('${action.url}');
                break;
              case 'click':
                await page.click('${action.selector}');
                break;
              case 'input':
                await page.type('${action.selector}', '${action.text}', {
                  clearFirst: ${action.clearFirst || false},
                  delay: ${action.typingSpeed || 50}
                });
                break;
              case 'wait':
                await page.waitForTimeout(${action.waitTime || 1000});
                break;
              case 'scroll':
                await page.scroll({
                  amount: ${action.scrollAmount || 300},
                  direction: '${action.scrollDirection || 'down'}'
                });
                break;
              case 'extract':
                result = await page.extract('${action.selector}', {
                  type: '${action.extractType || 'text'}',
                  attribute: '${action.extractAttribute || ''}'
                });
                break;
              case 'screenshot':
                result = await page.screenshot();
                break;
              default:
                console.log('🔧 Unknown action type:', '${action.type}');
            }
            
            console.log('🎉 Browser action completed successfully!');
            return { 
              success: true, 
              extractedData: result ? { '${action.extractVariable || 'data'}': result } : null,
              screenshot: '${action.type}' === 'screenshot' ? result : null
            };
            
          } catch (error) {
            console.error('❌ Browser action error:', error);
            return { success: false, error: error.message };
          }
        })()
      `);

      return result;

    } catch (error) {
      console.error(`❌ Action execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get profile window by ID
   */
  private async getProfileWindow(profileId: string): Promise<any> {
    try {
      // This would integrate with the main process to get the actual profile window
      // For now, we'll simulate it
      return { id: profileId, webContents: { executeJavaScript: () => Promise.resolve() } };
    } catch (error) {
      console.error(`❌ Failed to get profile window for ${profileId}:`, error);
      return null;
    }
  }

  /**
   * Get webview from profile window
   */
  private async getWebviewFromProfileWindow(profileWindow: any): Promise<any> {
    try {
      // This would get the actual webview element from the profile window
      // For now, we'll simulate it
      return {
        executeJavaScript: (script: string) => {
          return Promise.resolve({ success: true });
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get webview from profile window:`, error);
      return null;
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: Partial<BrowserRPAConfig>): BrowserRPAConfig {
    return {
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      delay: config.delay || 1000,
      humanBehavior: config.humanBehavior !== false,
      randomDelay: config.randomDelay !== false,
      delayMin: config.delayMin || 500,
      delayMax: config.delayMax || 2000,
      screenshotOnError: config.screenshotOnError !== false,
      logLevel: config.logLevel || 'detailed'
    };
  }

  /**
   * Add execution log
   */
  private addExecutionLog(executionId: string, log: any): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...log
      });
    }
  }

  /**
   * Update execution status
   */
  private updateExecution(execution: RPAExecution): void {
    this.activeExecutions.set(execution.id, execution);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): RPAExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution by ID
   */
  getExecutionById(executionId: string): RPAExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Stop execution
   */
  stopExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date().toISOString();
      this.updateExecution(execution);
      return true;
    }
    return false;
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const browserRPAService = BrowserRPAService.getInstance();

