// Enhanced RPA Types - AdsPower-like functionality

export interface RPATask {
  id: string;
  name: string;
  description: string;
  category: 'automation' | 'social' | 'ecommerce' | 'data' | 'search' | 'interaction';
  icon: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: string;
  steps: RPAStep[];
  settings: RPATaskSettings;
  assignedProfiles: string[];
}

export interface RPAStep {
  id: string;
  type: RPAStepType;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  config: RPAStepConfig;
  conditions?: RPACondition[];
  loops?: RPALoop;
}

export type RPAStepType = 
  | 'navigate'
  | 'click'
  | 'input'
  | 'wait'
  | 'scroll'
  | 'extract'
  | 'screenshot'
  | 'hover'
  | 'dropdown'
  | 'focus'
  | 'new_tab'
  | 'close_tab'
  | 'switch_tab'
  | 'refresh'
  | 'go_back'
  | 'execute_js'
  | 'condition'
  | 'loop'
  | 'custom_script'
  | 'save_csv'
  | 'delay'
  | 'retry_block';

export interface RPAStepConfig {
  // Navigation
  url?: string;
  waitForLoad?: boolean;
  timeout?: number;
  newTab?: boolean;
  waitUntil?: 'domcontentloaded' | 'networkidle' | 'element_visible';
  
  // Click
  selector?: string;
  selectorType?: 'css' | 'xpath' | 'text';
  clickType?: 'left' | 'right' | 'double';
  waitForElement?: boolean;
  retries?: number;
  coordinates?: { x: number; y: number };
  waitAfterClick?: boolean;
  waitAfterClickMs?: number;
  retryAttempts?: number;
  fallbackCoordinates?: { x: number; y: number };
  
  // Input
  text?: string;
  inputText?: string; // Legacy support
  inputType?: 'type' | 'paste' | 'clear';
  typingSpeed?: number;
  clearFirst?: boolean;
  humanBehavior?: boolean;
  humanTyping?: boolean; // Legacy support
  
  // Wait
  duration?: number;
  condition?: 'time' | 'element' | 'text' | 'network';
  waitType?: 'time' | 'element' | 'condition' | 'network_idle'; // Legacy support
  waitTime?: number; // Legacy support
  waitTimeMin?: number;
  waitTimeMax?: number;
  waitElement?: string;
  waitCondition?: string;
  
  // Scroll
  direction?: 'down' | 'up' | 'to-top' | 'to-bottom' | 'to-element';
  amount?: number;
  smooth?: boolean;
  scrollType?: 'pixels' | 'element' | 'page' | 'bottom' | 'top'; // Legacy support
  scrollDirection?: 'up' | 'down' | 'left' | 'right'; // Legacy support
  scrollAmount?: number; // Legacy support
  scrollTarget?: string;
  scrollSpeed?: 'slow' | 'normal' | 'fast';
  repeatCount?: number;
  
  // Screenshot
  filename?: string;
  fullPage?: boolean;
  quality?: number;
  screenshotType?: 'full' | 'element' | 'viewport'; // Legacy support
  screenshotPath?: string;
  screenshotElement?: string;
  timestampFilename?: boolean;
  
  // Extract
  variable?: string;
  attribute?: string;
  multiple?: boolean;
  extractType?: 'text' | 'attribute' | 'html' | 'multiple'; // Legacy support
  extractSelector?: string; // Legacy support
  extractAttribute?: string; // Legacy support
  extractVariable?: string; // Legacy support
  extractAll?: boolean;
  saveToFile?: boolean;
  
  // Hover
  duration?: number; // For hover step
  
  // Dropdown
  value?: string;
  
  // Focus
  waitForElement?: boolean; // Shared with click
  
  // Tab Management
  tabIndex?: number;
  switchToNew?: boolean;
  closeAll?: boolean;
  relative?: 'absolute' | 'next' | 'previous';
  tabUrl?: string;
  frameSelector?: string;
  frameIndex?: number;
  
  // JavaScript Execution
  code?: string;
  variable?: string; // For storing JS result
  async?: boolean;
  jsCode?: string; // Legacy support
  returnVariable?: string; // Legacy support
  executeInFrame?: boolean;
  
  // Condition
  conditionType?: 'element_exists' | 'text_contains' | 'url_contains' | 'custom' | 'variable_equals';
  conditionSelector?: string;
  conditionText?: string;
  conditionUrl?: string;
  conditionScript?: string;
  conditionVariable?: string;
  conditionValue?: string;
  thenSteps?: RPAStep[];
  elseSteps?: RPAStep[];
  
  // Loop
  loopType?: 'count' | 'condition' | 'csv_data' | 'infinite';
  loopCount?: number;
  loopCondition?: string;
  loopSteps?: RPAStep[];
  csvColumn?: string;
  
  // CSV Operations
  csvPath?: string;
  csvHeaders?: string[];
  csvData?: Record<string, any>;
  
  // Error Handling
  onError?: 'retry' | 'skip' | 'stop_task' | 'continue';
  errorRetries?: number;
  errorTimeout?: number;
  
  // Custom
  customScript?: string;
  customTimeout?: number;
  variables?: Record<string, any>;
}

export interface RPACondition {
  id: string;
  type: 'if' | 'else_if' | 'else';
  condition: string;
  thenSteps: string[];
  elseSteps?: string[];
}

export interface RPALoop {
  id: string;
  type: 'for' | 'while' | 'foreach';
  condition: string;
  steps: string[];
  maxIterations?: number;
}

export interface RPATaskSettings {
  executeSequentially: boolean;
  continueOnError: boolean;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  humanBehavior: boolean;
  randomDelay: boolean;
  delayMin: number;
  delayMax: number;
  screenshotOnError: boolean;
  logLevel: 'none' | 'basic' | 'detailed' | 'verbose';
  // New settings for advanced features
  runMode: 'single' | 'loop' | 'repeat_until';
  loopCount?: number;
  repeatCondition?: string;
  timeoutPerProfile: number;
  concurrencyLimit: number;
  closeOnFinish: boolean;
  saveScreenshots: boolean;
  screenshotPath?: string;
  csvOutputPath?: string;
  parameterization: {
    useVariables: boolean;
    csvDataPath?: string;
    customVariables: Record<string, string>;
  };
}

export interface RPAExecution {
  id: string;
  taskId: string;
  profileId: string;
  profileName: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  currentStep?: number;
  totalSteps: number;
  logs: RPAExecutionLog[];
  result?: RPAExecutionResult;
  error?: string;
}

export interface RPAExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  step?: number;
  stepName?: string;
  message: string;
  data?: any;
  screenshot?: string;
}

export interface RPAExecutionResult {
  success: boolean;
  stepsCompleted: number;
  stepsSkipped: number;
  stepsFailed: number;
  executionTime: number;
  extractedData?: Record<string, any>;
  screenshots?: string[];
  errors?: string[];
}

// Job Queue and Execution System
export interface RPAJob {
  id: string;
  taskId: string;
  profileId: string;
  profileName: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  workerId?: string;
  progress: {
    currentStep: number;
    totalSteps: number;
    stepName?: string;
  };
  result?: RPAExecutionResult;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface RPAWorker {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'stopping';
  currentJob?: string;
  profileId?: string;
  browserInstance?: any;
  startedAt: string;
  lastHeartbeat: string;
  capabilities: string[];
}

export interface RPAJobQueue {
  pending: RPAJob[];
  running: RPAJob[];
  completed: RPAJob[];
  failed: RPAJob[];
  workers: RPAWorker[];
  concurrencyLimit: number;
  totalProcessed: number;
  startTime?: string;
  estimatedCompletion?: string;
}

// Selector Recording and Browser Integration
export interface SelectorRecording {
  id: string;
  timestamp: string;
  action: 'click' | 'input' | 'hover' | 'scroll';
  element: {
    tagName: string;
    textContent?: string;
    attributes: Record<string, string>;
    cssSelector: string;
    xpath: string;
    coordinates: { x: number; y: number };
  };
  context: {
    url: string;
    frameIndex?: number;
    tabIndex?: number;
  };
}

export interface BrowserPreview {
  url: string;
  width: number;
  height: number;
  scale: number;
  interactive: boolean;
  highlightSelector?: string;
}

// Advanced Task Configuration
export interface TaskValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stepValidation: {
    stepId: string;
    isValid: boolean;
    errors: string[];
  }[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  useCase: string;
  steps: RPAStep[];
  settings: RPATaskSettings;
  variables: Record<string, any>;
  screenshots: string[];
}

// CSV and Data Integration
export interface CSVConfiguration {
  filePath: string;
  hasHeaders: boolean;
  delimiter: string;
  encoding: string;
  columns: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    variable: string;
  }[];
  preview: any[];
}

// Monitoring and Analytics
export interface ExecutionMetrics {
  taskId: string;
  totalRuns: number;
  successRate: number;
  averageExecutionTime: number;
  commonErrors: {
    error: string;
    count: number;
    lastOccurred: string;
  }[];
  stepPerformance: {
    stepId: string;
    stepName: string;
    averageTime: number;
    failureRate: number;
  }[];
  profilePerformance: {
    profileId: string;
    successRate: number;
    averageTime: number;
  }[];
}

export interface RPAProfile {
  id: string;
  name: string;
  assignedTasks: string[];
  lastExecution?: string;
  totalExecutions: number;
  successRate: number;
  isActive: boolean;
}

export interface RPADashboardStats {
  totalTasks: number;
  activeTasks: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  profilesWithTasks: number;
}

// Template interfaces for drag & drop workflow builder
export interface RPAStepTemplate {
  id: string;
  type: RPAStepType;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  defaultConfig: Partial<RPAStepConfig>;
  configSchema: RPAConfigSchema[];
}

export interface RPAConfigSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'file' | 'color';
  required: boolean;
  default?: any;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  description?: string;
  placeholder?: string;
}

// Export/Import interfaces
export interface RPAExportData {
  version: string;
  exportDate: string;
  tasks: RPATask[];
  profiles: RPAProfile[];
  settings: RPAGlobalSettings;
}

export interface RPAGlobalSettings {
  defaultTimeout: number;
  defaultRetries: number;
  defaultDelay: number;
  screenshotPath: string;
  logRetentionDays: number;
  maxConcurrentExecutions: number;
  enableTelemetry: boolean;
}