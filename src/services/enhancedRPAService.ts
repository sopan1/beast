import { 
  RPATask, 
  RPAStep, 
  RPAExecution, 
  RPAExecutionLog, 
  RPAProfile,
  RPADashboardStats,
  RPAStepTemplate,
  RPAExportData,
  RPAGlobalSettings
} from '@/types/rpa';

// Import Enhanced RPA Engine for BeastBrowser
// This connects the UI with the upgraded automation engine
declare global {
  interface Window {
    electronAPI?: {
      executeRPAFlow?: (steps: any[], options?: any) => Promise<any>;
      getBeastBrowserRPAEngine?: () => any;
    };
  }
}

export class EnhancedRPAService {
  private static instance: EnhancedRPAService;
  private readonly TASKS_KEY = 'beastbrowser_rpa_tasks';
  private readonly EXECUTIONS_KEY = 'beastbrowser_rpa_executions';
  private readonly PROFILES_KEY = 'beastbrowser_rpa_profiles';
  private readonly SETTINGS_KEY = 'beastbrowser_rpa_settings';
  
  static getInstance(): EnhancedRPAService {
    if (!EnhancedRPAService.instance) {
      EnhancedRPAService.instance = new EnhancedRPAService();
    }
    return EnhancedRPAService.instance;
  }

  // Task Management
  getAllTasks(): RPATask[] {
    try {
      const saved = localStorage.getItem(this.TASKS_KEY);
      return saved ? JSON.parse(saved) : this.getDefaultTasks();
    } catch (error) {
      console.error('Failed to load RPA tasks:', error);
      return this.getDefaultTasks();
    }
  }

  getTaskById(taskId: string): RPATask | undefined {
    return this.getAllTasks().find(task => task.id === taskId);
  }

  createTask(task: Omit<RPATask, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>): RPATask {
    const newTask: RPATask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0
    };
    
    const tasks = this.getAllTasks();
    tasks.push(newTask);
    this.saveTasks(tasks);
    
    return newTask;
  }

  updateTask(taskId: string, updates: Partial<RPATask>): void {
    const tasks = this.getAllTasks();
    const index = tasks.findIndex(task => task.id === taskId);
    
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveTasks(tasks);
    }
  }

  deleteTask(taskId: string): void {
    const tasks = this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    this.saveTasks(filteredTasks);
    
    // Also clean up executions for this task
    const executions = this.getAllExecutions();
    const filteredExecutions = executions.filter(exec => exec.taskId !== taskId);
    this.saveExecutions(filteredExecutions);
  }

  duplicateTask(taskId: string): RPATask | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    
    const duplicated = this.createTask({
      ...task,
      name: `${task.name} (Copy)`,
      assignedProfiles: [],
      steps: task.steps.map(step => ({
        ...step,
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
    });
    
    return duplicated;
  }

  // Step Management
  addStepToTask(taskId: string, step: Omit<RPAStep, 'id' | 'order'>): void {
    const task = this.getTaskById(taskId);
    if (!task) return;
    
    const newStep: RPAStep = {
      ...step,
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order: task.steps.length
    };
    
    task.steps.push(newStep);
    this.updateTask(taskId, { steps: task.steps });
  }

  updateStep(taskId: string, stepId: string, updates: Partial<RPAStep>): void {
    const task = this.getTaskById(taskId);
    if (!task) return;
    
    const stepIndex = task.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      task.steps[stepIndex] = { ...task.steps[stepIndex], ...updates };
      this.updateTask(taskId, { steps: task.steps });
    }
  }

  removeStep(taskId: string, stepId: string): void {
    const task = this.getTaskById(taskId);
    if (!task) return;
    
    const filteredSteps = task.steps.filter(step => step.id !== stepId);
    // Reorder remaining steps
    const reorderedSteps = filteredSteps.map((step, index) => ({ ...step, order: index }));
    
    this.updateTask(taskId, { steps: reorderedSteps });
  }

  reorderSteps(taskId: string, newOrder: string[]): void {
    const task = this.getTaskById(taskId);
    if (!task) return;
    
    const reorderedSteps = newOrder.map((stepId, index) => {
      const step = task.steps.find(s => s.id === stepId);
      return step ? { ...step, order: index } : null;
    }).filter(Boolean) as RPAStep[];
    
    this.updateTask(taskId, { steps: reorderedSteps });
  }

  // Execution Management
  getAllExecutions(): RPAExecution[] {
    try {
      const saved = localStorage.getItem(this.EXECUTIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load RPA executions:', error);
      return [];
    }
  }

  getExecutionsByTask(taskId: string): RPAExecution[] {
    return this.getAllExecutions().filter(exec => exec.taskId === taskId);
  }

  getExecutionsByProfile(profileId: string): RPAExecution[] {
    return this.getAllExecutions().filter(exec => exec.profileId === profileId);
  }

  createExecution(taskId: string, profileId: string, profileName: string): RPAExecution {
    const task = this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    
    const execution: RPAExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      profileId,
      profileName,
      status: 'pending',
      startTime: new Date().toISOString(),
      totalSteps: task.steps.filter(step => step.enabled).length,
      logs: []
    };
    
    const executions = this.getAllExecutions();
    executions.push(execution);
    this.saveExecutions(executions);
    
    return execution;
  }

  updateExecution(executionId: string, updates: Partial<RPAExecution>): void {
    const executions = this.getAllExecutions();
    const index = executions.findIndex(exec => exec.id === executionId);
    
    if (index !== -1) {
      executions[index] = { ...executions[index], ...updates };
      this.saveExecutions(executions);
    }
  }

  addExecutionLog(executionId: string, log: Omit<RPAExecutionLog, 'id' | 'timestamp'>): void {
    const execution = this.getAllExecutions().find(exec => exec.id === executionId);
    if (!execution) return;
    
    const newLog: RPAExecutionLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    execution.logs.push(newLog);
    this.updateExecution(executionId, { logs: execution.logs });
  }

  // Profile Management
  getAllRPAProfiles(): RPAProfile[] {
    try {
      const saved = localStorage.getItem(this.PROFILES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load RPA profiles:', error);
      return [];
    }
  }

  updateRPAProfile(profileId: string, updates: Partial<RPAProfile>): void {
    const profiles = this.getAllRPAProfiles();
    const index = profiles.findIndex(p => p.id === profileId);
    
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updates };
    } else {
      // Create new RPA profile if it doesn't exist
      const newProfile: RPAProfile = {
        id: profileId,
        name: updates.name || `Profile ${profileId}`,
        assignedTasks: [],
        totalExecutions: 0,
        successRate: 0,
        isActive: true,
        ...updates
      };
      profiles.push(newProfile);
    }
    
    this.saveRPAProfiles(profiles);
  }

  assignTaskToProfile(taskId: string, profileId: string): void {
    const profiles = this.getAllRPAProfiles();
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile && !profile.assignedTasks.includes(taskId)) {
      profile.assignedTasks.push(taskId);
      this.saveRPAProfiles(profiles);
    }
    
    // Also update task
    const task = this.getTaskById(taskId);
    if (task && !task.assignedProfiles.includes(profileId)) {
      task.assignedProfiles.push(profileId);
      this.updateTask(taskId, { assignedProfiles: task.assignedProfiles });
    }
  }

  unassignTaskFromProfile(taskId: string, profileId: string): void {
    const profiles = this.getAllRPAProfiles();
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
      profile.assignedTasks = profile.assignedTasks.filter(id => id !== taskId);
      this.saveRPAProfiles(profiles);
    }
    
    // Also update task
    const task = this.getTaskById(taskId);
    if (task) {
      task.assignedProfiles = task.assignedProfiles.filter(id => id !== profileId);
      this.updateTask(taskId, { assignedProfiles: task.assignedProfiles });
    }
  }

  // Dashboard Stats
  getDashboardStats(): RPADashboardStats {
    const tasks = this.getAllTasks();
    const executions = this.getAllExecutions();
    const profiles = this.getAllRPAProfiles();
    
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    
    const completedExecutions = executions.filter(e => e.status === 'completed' && e.duration);
    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;
    
    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.isActive).length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      profilesWithTasks: profiles.filter(p => p.assignedTasks.length > 0).length
    };
  }

  // Step Templates
  getStepTemplates(): RPAStepTemplate[] {
    return [
      {
        id: 'navigate',
        type: 'navigate',
        name: 'Navigate to URL',
        description: 'Navigate to a specific website URL',
        icon: '🌐',
        color: 'bg-blue-500',
        category: 'Navigation',
        defaultConfig: { url: '', waitForLoad: true },
        configSchema: [
          { key: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://example.com' },
          { key: 'waitForLoad', label: 'Wait for page load', type: 'checkbox', required: false, default: true }
        ]
      },
      {
        id: 'click',
        type: 'click',
        name: 'Click Element',
        description: 'Click on a specific element',
        icon: '👆',
        color: 'bg-green-500',
        category: 'Interaction',
        defaultConfig: { selectorType: 'css', clickType: 'single' },
        configSchema: [
          { key: 'selector', label: 'Selector', type: 'text', required: true, placeholder: '.button, #submit' },
          { key: 'selectorType', label: 'Selector Type', type: 'select', required: true, options: [
            { value: 'css', label: 'CSS Selector' },
            { value: 'xpath', label: 'XPath' },
            { value: 'text', label: 'Text Content' }
          ]},
          { key: 'clickType', label: 'Click Type', type: 'select', required: true, options: [
            { value: 'single', label: 'Single Click' },
            { value: 'double', label: 'Double Click' },
            { value: 'right', label: 'Right Click' }
          ]}
        ]
      },
      {
        id: 'input',
        type: 'input',
        name: 'Input Text',
        description: 'Type text into input fields',
        icon: '⌨️',
        color: 'bg-purple-500',
        category: 'Interaction',
        defaultConfig: { inputType: 'type', typingSpeed: 50, clearFirst: false },
        configSchema: [
          { key: 'selector', label: 'Input Selector', type: 'text', required: true, placeholder: 'input[name="username"]' },
          { key: 'inputText', label: 'Text to Input', type: 'text', required: true, placeholder: 'Enter text here' },
          { key: 'inputType', label: 'Input Method', type: 'select', required: true, options: [
            { value: 'type', label: 'Type (with delay)' },
            { value: 'paste', label: 'Paste (instant)' },
            { value: 'clear', label: 'Clear field' }
          ]},
          { key: 'typingSpeed', label: 'Typing Speed (ms)', type: 'number', required: false, default: 50 },
          { key: 'clearFirst', label: 'Clear field first', type: 'checkbox', required: false, default: false }
        ]
      },
      {
        id: 'wait',
        type: 'wait',
        name: 'Wait / Delay',
        description: 'Add delays or wait for conditions',
        icon: '⏱️',
        color: 'bg-yellow-500',
        category: 'Control',
        defaultConfig: { waitType: 'time', waitTime: 1000 },
        configSchema: [
          { key: 'waitType', label: 'Wait Type', type: 'select', required: true, options: [
            { value: 'time', label: 'Fixed Time' },
            { value: 'element', label: 'Wait for Element' },
            { value: 'condition', label: 'Custom Condition' }
          ]},
          { key: 'waitTime', label: 'Wait Time (ms)', type: 'number', required: false, default: 1000 },
          { key: 'waitElement', label: 'Element Selector', type: 'text', required: false, placeholder: '.loading' },
          { key: 'waitCondition', label: 'Condition Script', type: 'textarea', required: false, placeholder: 'return document.readyState === "complete"' }
        ]
      },
      {
        id: 'scroll',
        type: 'scroll',
        name: 'Scroll Page',
        description: 'Scroll the page in various patterns',
        icon: '📜',
        color: 'bg-indigo-500',
        category: 'Navigation',
        defaultConfig: { scrollType: 'pixels', scrollDirection: 'down', scrollAmount: 300 },
        configSchema: [
          { key: 'scrollType', label: 'Scroll Type', type: 'select', required: true, options: [
            { value: 'pixels', label: 'By Pixels' },
            { value: 'element', label: 'To Element' },
            { value: 'page', label: 'Page by Page' },
            { value: 'infinite', label: 'Infinite Scroll' }
          ]},
          { key: 'scrollDirection', label: 'Direction', type: 'select', required: true, options: [
            { value: 'down', label: 'Down' },
            { value: 'up', label: 'Up' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' }
          ]},
          { key: 'scrollAmount', label: 'Scroll Amount (px)', type: 'number', required: false, default: 300 },
          { key: 'scrollTarget', label: 'Target Element', type: 'text', required: false, placeholder: '.content' }
        ]
      },
      {
        id: 'extract',
        type: 'extract',
        name: 'Extract Data',
        description: 'Extract data from page elements',
        icon: '📊',
        color: 'bg-orange-500',
        category: 'Data',
        defaultConfig: { extractType: 'text', extractAll: false },
        configSchema: [
          { key: 'extractSelector', label: 'Element Selector', type: 'text', required: true, placeholder: '.price, .title' },
          { key: 'extractType', label: 'Extract Type', type: 'select', required: true, options: [
            { value: 'text', label: 'Text Content' },
            { value: 'attribute', label: 'Attribute Value' },
            { value: 'html', label: 'HTML Content' },
            { value: 'multiple', label: 'Multiple Elements' }
          ]},
          { key: 'extractAttribute', label: 'Attribute Name', type: 'text', required: false, placeholder: 'href, src' },
          { key: 'extractVariable', label: 'Variable Name', type: 'text', required: true, placeholder: 'productPrice' },
          { key: 'extractAll', label: 'Extract All Matches', type: 'checkbox', required: false, default: false }
        ]
      }
    ];
  }

  // Get practical automation templates for bulk creation
  getPracticalTemplates(): RPATask[] {
    return [
      {
        id: 'template_social_login',
        name: '🔐 Social Media Login',
        description: 'Automatically login to social media platforms',
        category: 'social',
        icon: '🔐',
        steps: [
          {
            id: 'step_1',
            order: 0,
            type: 'navigate',
            name: 'Open Login Page',
            description: 'Navigate to social media login',
            enabled: true,
            config: {
              url: 'https://facebook.com/login',
              waitForLoad: true
            }
          },
          {
            id: 'step_2',
            order: 1,
            type: 'input',
            name: 'Enter Email',
            description: 'Input email/username',
            enabled: true,
            config: {
              selector: '#email',
              inputText: '{PROFILE_EMAIL}',
              inputType: 'type',
              typingSpeed: 50,
              clearFirst: true
            }
          },
          {
            id: 'step_3',
            order: 2,
            type: 'input',
            name: 'Enter Password',
            description: 'Input password',
            enabled: true,
            config: {
              selector: '#pass',
              inputText: '{PROFILE_PASSWORD}',
              inputType: 'type',
              typingSpeed: 40
            }
          },
          {
            id: 'step_4',
            order: 3,
            type: 'click',
            name: 'Click Login',
            description: 'Submit login form',
            enabled: true,
            config: {
              selector: 'button[name="login"]',
              selectorType: 'css',
              clickType: 'single'
            }
          },
          {
            id: 'step_5',
            order: 4,
            type: 'wait',
            name: 'Wait for Dashboard',
            description: 'Wait for login completion',
            enabled: true,
            config: {
              waitType: 'time',
              waitTime: 3000
            }
          }
        ],
        settings: {
          executeSequentially: true,
          continueOnError: false,
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 300000,
          humanBehavior: true,
          randomDelay: true,
          delayMin: 500,
          delayMax: 2000,
          screenshotOnError: true,
          logLevel: 'detailed',
          runMode: 'single',
          timeoutPerProfile: 300000,
          concurrencyLimit: 1,
          closeOnFinish: false,
          saveScreenshots: false,
          parameterization: {
            useVariables: false,
            customVariables: {}
          }
        },
        assignedProfiles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: 'template_ecommerce_search',
        name: '🛒 E-commerce Product Search',
        description: 'Search for products and collect data',
        category: 'ecommerce',
        icon: '🛒',
        steps: [
          {
            id: 'step_1',
            order: 0,
            type: 'navigate',
            name: 'Open E-commerce Site',
            description: 'Navigate to online store',
            enabled: true,
            config: {
              url: 'https://amazon.com',
              waitForLoad: true
            }
          },
          {
            id: 'step_2',
            order: 1,
            type: 'input',
            name: 'Search Product',
            description: 'Enter search keyword',
            enabled: true,
            config: {
              selector: '#twotabsearchtextbox',
              inputText: '{SEARCH_KEYWORD}',
              inputType: 'type',
              typingSpeed: 60,
              clearFirst: true
            }
          },
          {
            id: 'step_3',
            order: 2,
            type: 'click',
            name: 'Click Search',
            description: 'Submit search query',
            enabled: true,
            config: {
              selector: '#nav-search-submit-button',
              selectorType: 'css',
              clickType: 'single'
            }
          },
          {
            id: 'step_4',
            order: 3,
            type: 'wait',
            name: 'Wait for Results',
            description: 'Wait for search results to load',
            enabled: true,
            config: {
              waitType: 'element',
              waitElement: '[data-component-type="s-search-result"]',
              waitTime: 10000
            }
          },
          {
            id: 'step_5',
            order: 4,
            type: 'extract',
            name: 'Extract Product Data',
            description: 'Collect product information',
            enabled: true,
            config: {
              extractSelector: '.s-size-mini .s-color-base',
              extractType: 'text',
              extractVariable: 'productTitles',
              extractAll: true
            }
          }
        ],
        settings: {
          executeSequentially: true,
          continueOnError: false,
          maxRetries: 2,
          retryDelay: 1000,
          timeout: 180000,
          humanBehavior: true,
          randomDelay: true,
          delayMin: 300,
          delayMax: 1500,
          screenshotOnError: true,
          logLevel: 'detailed'
        },
        assignedProfiles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: 'template_form_filling',
        name: '📝 Bulk Form Submission',
        description: 'Fill and submit forms automatically',
        category: 'automation',
        icon: '📝',
        steps: [
          {
            id: 'step_1',
            order: 0,
            type: 'navigate',
            name: 'Open Form Page',
            description: 'Navigate to form page',
            enabled: true,
            config: {
              url: '{FORM_URL}',
              waitForLoad: true
            }
          },
          {
            id: 'step_2',
            order: 1,
            type: 'input',
            name: 'Fill Name Field',
            description: 'Enter name information',
            enabled: true,
            config: {
              selector: 'input[name="name"], #name, .name-field',
              inputText: '{PROFILE_NAME}',
              inputType: 'type',
              typingSpeed: 50,
              clearFirst: true
            }
          },
          {
            id: 'step_3',
            order: 2,
            type: 'input',
            name: 'Fill Email Field',
            description: 'Enter email address',
            enabled: true,
            config: {
              selector: 'input[type="email"], input[name="email"], #email',
              inputText: '{PROFILE_EMAIL}',
              inputType: 'type',
              typingSpeed: 50
            }
          },
          {
            id: 'step_4',
            order: 3,
            type: 'input',
            name: 'Fill Phone Field',
            description: 'Enter phone number',
            enabled: true,
            config: {
              selector: 'input[name="phone"], #phone, .phone-field',
              inputText: '{PROFILE_PHONE}',
              inputType: 'type',
              typingSpeed: 50
            }
          },
          {
            id: 'step_5',
            order: 4,
            type: 'click',
            name: 'Submit Form',
            description: 'Submit the completed form',
            enabled: true,
            config: {
              selector: 'button[type="submit"], input[type="submit"], .submit-btn',
              selectorType: 'css',
              clickType: 'single'
            }
          },
          {
            id: 'step_6',
            order: 5,
            type: 'wait',
            name: 'Wait for Confirmation',
            description: 'Wait for form submission confirmation',
            enabled: true,
            config: {
              waitType: 'time',
              waitTime: 3000
            }
          }
        ],
        settings: {
          executeSequentially: true,
          continueOnError: false,
          maxRetries: 2,
          retryDelay: 1500,
          timeout: 120000,
          humanBehavior: true,
          randomDelay: true,
          delayMin: 400,
          delayMax: 1200,
          screenshotOnError: true,
          logLevel: 'detailed',
          runMode: 'single',
          timeoutPerProfile: 120000,
          concurrencyLimit: 1,
          closeOnFinish: false,
          saveScreenshots: false,
          parameterization: {
            useVariables: false,
            customVariables: {}
          }
        },
        assignedProfiles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: 'template_data_scraping',
        name: '📊 Website Data Scraper',
        description: 'Extract data from websites systematically',
        category: 'data',
        icon: '📊',
        steps: [
          {
            id: 'step_1',
            order: 0,
            type: 'navigate',
            name: 'Open Target Website',
            description: 'Navigate to data source',
            enabled: true,
            config: {
              url: '{TARGET_URL}',
              waitForLoad: true
            }
          },
          {
            id: 'step_2',
            order: 1,
            type: 'wait',
            name: 'Wait for Content',
            description: 'Ensure content is loaded',
            enabled: true,
            config: {
              waitType: 'element',
              waitElement: 'main, #content, .content',
              waitTime: 15000
            }
          },
          {
            id: 'step_3',
            order: 2,
            type: 'scroll',
            name: 'Scroll to Load Content',
            description: 'Scroll to trigger lazy loading',
            enabled: true,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'down',
              scrollAmount: 1000,
              scrollSpeed: 100
            }
          },
          {
            id: 'step_4',
            order: 3,
            type: 'extract',
            name: 'Extract Page Data',
            description: 'Collect specified data elements',
            enabled: true,
            config: {
              extractSelector: 'h1, h2, h3, .price, .title, .description',
              extractType: 'text',
              extractVariable: 'scrapedData',
              extractAll: true
            }
          },
          {
            id: 'step_5',
            order: 4,
            type: 'wait',
            name: 'Processing Delay',
            description: 'Add delay for data processing',
            enabled: true,
            config: {
              waitType: 'time',
              waitTime: 2000
            }
          }
        ],
        settings: {
          executeSequentially: true,
          continueOnError: true,
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 240000,
          humanBehavior: true,
          randomDelay: true,
          delayMin: 600,
          delayMax: 2500,
          screenshotOnError: true,
          logLevel: 'detailed',
          runMode: 'single',
          timeoutPerProfile: 240000,
          concurrencyLimit: 1,
          closeOnFinish: false,
          saveScreenshots: false,
          parameterization: {
            useVariables: false,
            customVariables: {}
          }
        },
        assignedProfiles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      }
    ];
  }

  // Settings Management
  getGlobalSettings(): RPAGlobalSettings {
    try {
      const saved = localStorage.getItem(this.SETTINGS_KEY);
      return saved ? JSON.parse(saved) : this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load RPA settings:', error);
      return this.getDefaultSettings();
    }
  }

  updateGlobalSettings(settings: Partial<RPAGlobalSettings>): void {
    const current = this.getGlobalSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
  }

  // Export/Import
  exportData(): RPAExportData {
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      tasks: this.getAllTasks(),
      profiles: this.getAllRPAProfiles(),
      settings: this.getGlobalSettings()
    };
  }

  importData(data: RPAExportData): void {
    try {
      // Import tasks
      const existingTasks = this.getAllTasks();
      const mergedTasks = [...existingTasks];
      
      data.tasks.forEach(importedTask => {
        const exists = existingTasks.find(t => t.id === importedTask.id);
        if (!exists) {
          mergedTasks.push(importedTask);
        }
      });
      
      this.saveTasks(mergedTasks);
      
      // Import profiles
      const existingProfiles = this.getAllRPAProfiles();
      const mergedProfiles = [...existingProfiles];
      
      data.profiles.forEach(importedProfile => {
        const exists = existingProfiles.find(p => p.id === importedProfile.id);
        if (!exists) {
          mergedProfiles.push(importedProfile);
        }
      });
      
      this.saveRPAProfiles(mergedProfiles);
      
      // Import settings (merge with existing)
      const currentSettings = this.getGlobalSettings();
      const mergedSettings = { ...currentSettings, ...data.settings };
      this.updateGlobalSettings(mergedSettings);
      
    } catch (error) {
      console.error('Failed to import RPA data:', error);
      throw error;
    }
  }

  // Private methods
  private saveTasks(tasks: RPATask[]): void {
    localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
  }

  private saveExecutions(executions: RPAExecution[]): void {
    localStorage.setItem(this.EXECUTIONS_KEY, JSON.stringify(executions));
  }

  private saveRPAProfiles(profiles: RPAProfile[]): void {
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
  }

  private getDefaultSettings(): RPAGlobalSettings {
    return {
      defaultTimeout: 30000,
      defaultRetries: 3,
      defaultDelay: 1000,
      screenshotPath: './screenshots',
      logRetentionDays: 30,
      maxConcurrentExecutions: 5,
      enableTelemetry: false
    };
  }

  private getDefaultTasks(): RPATask[] {
    return [
      {
        id: 'default_website_scrolling',
        name: '🌐 Website Smooth Scrolling Automation',
        description: 'Opens a website, waits 10 seconds, performs smooth random scrolling top to bottom and back, then closes browser',
        category: 'automation',
        icon: '🌐',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0,
        assignedProfiles: [],
        settings: {
          executeSequentially: true,
          continueOnError: false,
          maxRetries: 2,
          retryDelay: 1000,
          timeout: 120000,
          humanBehavior: true,
          randomDelay: true,
          delayMin: 800,
          delayMax: 2500,
          screenshotOnError: true,
          logLevel: 'detailed',
          runMode: 'single',
          timeoutPerProfile: 120000,
          concurrencyLimit: 1,
          closeOnFinish: true,
          saveScreenshots: false,
          parameterization: {
            useVariables: false,
            customVariables: {}
          }
        },
        steps: [
          {
            id: 'step_nav_website',
            type: 'navigate',
            name: 'Open Website',
            description: 'Navigate to target website',
            enabled: true,
            order: 0,
            config: { 
              url: 'https://www.google.com',
              waitForLoad: true 
            }
          },
          {
            id: 'step_initial_wait',
            type: 'wait',
            name: 'Initial Wait (10 seconds)',
            description: 'Wait for 10 seconds before starting automation',
            enabled: true,
            order: 1,
            config: {
              waitType: 'time',
              waitTime: 10000
            }
          },
          {
            id: 'step_scroll_down_1',
            type: 'scroll',
            name: 'Smooth Scroll Down #1',
            description: 'First smooth scroll towards bottom',
            enabled: true,
            order: 2,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'down',
              scrollAmount: 400,
              scrollSpeed: 150
            }
          },
          {
            id: 'step_pause_1',
            type: 'wait',
            name: 'Random Pause #1',
            description: 'Random pause between scrolls',
            enabled: true,
            order: 3,
            config: {
              waitType: 'time',
              waitTime: 1500
            }
          },
          {
            id: 'step_scroll_down_2',
            type: 'scroll',
            name: 'Smooth Scroll Down #2',
            description: 'Continue scrolling down',
            enabled: true,
            order: 4,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'down',
              scrollAmount: 600,
              scrollSpeed: 120
            }
          },
          {
            id: 'step_pause_2',
            type: 'wait',
            name: 'Random Pause #2',
            description: 'Another random pause',
            enabled: true,
            order: 5,
            config: {
              waitType: 'time',
              waitTime: 2000
            }
          },
          {
            id: 'step_scroll_down_3',
            type: 'scroll',
            name: 'Scroll to Bottom',
            description: 'Final scroll to reach bottom',
            enabled: true,
            order: 6,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'down',
              scrollAmount: 800,
              scrollSpeed: 100
            }
          },
          {
            id: 'step_bottom_pause',
            type: 'wait',
            name: 'Bottom Pause',
            description: 'Pause at bottom before scrolling back',
            enabled: true,
            order: 7,
            config: {
              waitType: 'time',
              waitTime: 3000
            }
          },
          {
            id: 'step_scroll_up_1',
            type: 'scroll',
            name: 'Smooth Scroll Up #1',
            description: 'Start scrolling back to top',
            enabled: true,
            order: 8,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'up',
              scrollAmount: 700,
              scrollSpeed: 140
            }
          },
          {
            id: 'step_pause_3',
            type: 'wait',
            name: 'Random Pause #3',
            description: 'Pause during upward scroll',
            enabled: true,
            order: 9,
            config: {
              waitType: 'time',
              waitTime: 1800
            }
          },
          {
            id: 'step_scroll_up_2',
            type: 'scroll',
            name: 'Smooth Scroll Up #2',
            description: 'Continue scrolling towards top',
            enabled: true,
            order: 10,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'up',
              scrollAmount: 500,
              scrollSpeed: 160
            }
          },
          {
            id: 'step_final_pause',
            type: 'wait',
            name: 'Final Pause',
            description: 'Final pause before closing',
            enabled: true,
            order: 11,
            config: {
              waitType: 'time',
              waitTime: 2000
            }
          },
          {
            id: 'step_scroll_to_top',
            type: 'scroll',
            name: 'Return to Top',
            description: 'Final scroll back to top of page',
            enabled: true,
            order: 12,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'up',
              scrollAmount: 1000,
              scrollSpeed: 180
            }
          }
        ]
      },
      {
        id: 'default_google_search',
        name: 'Google Search Automation',
        description: 'Automated Google search with human-like behavior',
        category: 'search',
        icon: '🔍',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0,
        assignedProfiles: [],
        settings: {
          executeSequentially: true,
          continueOnError: false,
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 60000,
          humanBehavior: true,
          randomDelay: true,
          delayMin: 500,
          delayMax: 2000,
          screenshotOnError: true,
          logLevel: 'detailed',
          runMode: 'single',
          timeoutPerProfile: 60000,
          concurrencyLimit: 1,
          closeOnFinish: false,
          saveScreenshots: false,
          parameterization: {
            useVariables: false,
            customVariables: {}
          }
        },
        steps: [
          {
            id: 'step_nav_google',
            type: 'navigate',
            name: 'Navigate to Google',
            description: 'Go to Google homepage',
            enabled: true,
            order: 0,
            config: { url: 'https://www.google.com', waitForLoad: true }
          },
          {
            id: 'step_search_input',
            type: 'input',
            name: 'Enter Search Query',
            description: 'Type search terms',
            enabled: true,
            order: 1,
            config: { 
              selector: 'input[name="q"]',
              inputText: 'BeastBrowser automation',
              inputType: 'type',
              typingSpeed: 80,
              clearFirst: true
            }
          },
          {
            id: 'step_search_submit',
            type: 'click',
            name: 'Submit Search',
            description: 'Click search button',
            enabled: true,
            order: 2,
            config: { 
              selector: 'input[value="Google Search"], button[type="submit"]',
              selectorType: 'css',
              clickType: 'single'
            }
          },
          {
            id: 'step_scroll_results',
            type: 'scroll',
            name: 'Scroll Results',
            description: 'Scroll through search results',
            enabled: true,
            order: 3,
            config: {
              scrollType: 'pixels',
              scrollDirection: 'down',
              scrollAmount: 500,
              scrollSpeed: 100
            }
          }
        ]
      }
    ];
  }
}

export const enhancedRPAService = EnhancedRPAService.getInstance();