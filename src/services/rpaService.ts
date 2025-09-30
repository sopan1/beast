import { enhancedRPAService } from './enhancedRPAService';
import { RPATask } from '@/types/rpa';

export interface RPAScript {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'ecommerce' | 'data' | 'automation';
  icon: string;
  code: string;
  isRunning?: boolean;
  lastRun?: Date;
  isFromEnhancedRPA?: boolean; // Flag to identify tasks from enhancedRPAService
}

export class RPAService {
  private static instance: RPAService;
  
  static getInstance(): RPAService {
    if (!RPAService.instance) {
      RPAService.instance = new RPAService();
    }
    return RPAService.instance;
  }

  // Get all RPA scripts from localStorage AND enhanced RPA tasks
  getAllScripts(): RPAScript[] {
    try {
      // Get original scripts from antidetect_rpa_scripts
      const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
      let originalScripts: RPAScript[] = [];
      
      if (savedScripts) {
        const parsed = JSON.parse(savedScripts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          originalScripts = parsed;
        }
      }
      
      // If no original scripts exist, get default scripts
      if (originalScripts.length === 0) {
        originalScripts = this.getDefaultScripts();
        this.saveScripts(originalScripts);
      }
      
      // Get tasks from enhancedRPAService and convert to RPAScript format
      const enhancedTasks = enhancedRPAService.getAllTasks();
      const convertedTasks = this.convertTasksToScripts(enhancedTasks);
      
      // Combine both sources, with enhanced tasks taking priority
      const allScripts = [...originalScripts, ...convertedTasks];
      
      console.log('🔍 RPA Scripts loaded:', {
        originalScripts: originalScripts.length,
        enhancedTasks: enhancedTasks.length,
        convertedTasks: convertedTasks.length,
        totalScripts: allScripts.length
      });
      
      return allScripts;
    } catch (error) {
      console.error('Failed to load RPA scripts:', error);
      return this.getDefaultScripts();
    }
  }

  // Save scripts to localStorage
  saveScripts(scripts: RPAScript[]): void {
    try {
      localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(scripts));
    } catch (error) {
      console.error('Failed to save RPA scripts:', error);
    }
  }

  // Add a new script
  addScript(script: Omit<RPAScript, 'id'>): RPAScript {
    const newScript: RPAScript = {
      ...script,
      id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const existingScripts = this.getAllScripts();
    const updatedScripts = [...existingScripts, newScript];
    this.saveScripts(updatedScripts);
    
    return newScript;
  }

  // Update existing script
  updateScript(scriptId: string, updates: Partial<RPAScript>): void {
    const scripts = this.getAllScripts();
    const updatedScripts = scripts.map(script => 
      script.id === scriptId ? { ...script, ...updates } : script
    );
    this.saveScripts(updatedScripts);
  }

  // Delete script
  deleteScript(scriptId: string): void {
    const scripts = this.getAllScripts();
    const updatedScripts = scripts.filter(script => script.id !== scriptId);
    this.saveScripts(updatedScripts);
  }

  // Get script by ID
  getScriptById(scriptId: string): RPAScript | undefined {
    return this.getAllScripts().find(script => script.id === scriptId);
  }

  // Get scripts by category
  getScriptsByCategory(category: RPAScript['category']): RPAScript[] {
    return this.getAllScripts().filter(script => script.category === category);
  }

  // Mark script as running
  setScriptRunning(scriptId: string, isRunning: boolean): void {
    this.updateScript(scriptId, { 
      isRunning, 
      lastRun: isRunning ? new Date() : undefined 
    });
  }

  // Convert RPATask objects to RPAScript format for compatibility
  private convertTasksToScripts(tasks: RPATask[]): RPAScript[] {
    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      category: this.mapTaskCategoryToScriptCategory(task.category),
      icon: task.icon || '🤖',
      code: this.generateCodeFromSteps(task.steps),
      isRunning: false,
      lastRun: task.updatedAt ? new Date(task.updatedAt) : undefined,
      isFromEnhancedRPA: true
    }));
  }

  // Map task categories to script categories
  private mapTaskCategoryToScriptCategory(taskCategory: string): 'social' | 'ecommerce' | 'data' | 'automation' {
    const mapping: Record<string, 'social' | 'ecommerce' | 'data' | 'automation'> = {
      'social': 'social',
      'ecommerce': 'ecommerce', 
      'e-commerce': 'ecommerce',
      'data': 'data',
      'scraping': 'data',
      'automation': 'automation',
      'browser': 'automation',
      'general': 'automation'
    };
    return mapping[taskCategory.toLowerCase()] || 'automation';
  }

  // Generate JavaScript code from RPA steps for display/execution
  private generateCodeFromSteps(steps: any[]): string {
    if (!steps || steps.length === 0) {
      return '// Empty task - no steps defined\nconsole.log("No steps to execute");';
    }

    const codeLines = [
      '// Auto-generated code from RPA Task steps',
      '// This code represents the configured RPA steps',
      ''
    ];

    steps.forEach((step, index) => {
      codeLines.push(`// Step ${index + 1}: ${step.name}`);
      codeLines.push(`// ${step.description || 'No description'}`);
      
      switch (step.type) {
        case 'navigate':
          codeLines.push(`await page.goto('${step.config?.url || 'https://example.com'}');`);
          break;
        case 'click':
          codeLines.push(`await page.click('${step.config?.selector || 'button'}');`);
          break;
        case 'type':
          codeLines.push(`await page.type('${step.config?.selector || 'input'}', '${step.config?.text || 'text'}');`);
          break;
        case 'wait':
          if (step.config?.waitType === 'element') {
            codeLines.push(`await page.waitForSelector('${step.config?.selector || 'body'}');`);
          } else {
            codeLines.push(`await page.waitForTimeout(${step.config?.waitTime || 1000});`);
          }
          break;
        case 'scroll':
          codeLines.push(`await page.evaluate(() => window.scrollBy(0, ${step.config?.distance || 300}));`);
          break;
        case 'screenshot':
          codeLines.push(`await page.screenshot({ path: '${step.config?.filename || 'screenshot.png'}' });`);
          break;
        default:
          codeLines.push(`// Custom step: ${step.type}`);
          codeLines.push(`console.log('Executing step: ${step.name}');`);
      }
      codeLines.push('');
    });

    return codeLines.join('\n');
  }

  // Debug method to check localStorage content from both sources
  debugLocalStorage(): void {
    console.log('🔍 =========================');
    console.log('🔍 DEBUG RPA STORAGE ANALYSIS');
    console.log('🔍 =========================');
    
    // Check original RPA scripts
    const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
    console.log('📂 Original RPA Scripts (antidetect_rpa_scripts):', savedScripts);
    if (savedScripts) {
      try {
        const parsed = JSON.parse(savedScripts);
        console.log('📝 Original scripts count:', Array.isArray(parsed) ? parsed.length : 0);
        if (Array.isArray(parsed)) {
          parsed.forEach((script, index) => {
            console.log(`📄 Original Script ${index + 1}:`, {
              id: script.id,
              name: script.name,
              category: script.category
            });
          });
        }
      } catch (error) {
        console.error('❌ Failed to parse original scripts:', error);
      }
    } else {
      console.log('⚠️ No original scripts found');
    }
    
    // Check enhanced RPA tasks
    const savedTasks = localStorage.getItem('beastbrowser_rpa_tasks');
    console.log('📂 Enhanced RPA Tasks (beastbrowser_rpa_tasks):', savedTasks);
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        console.log('📝 Enhanced tasks count:', Array.isArray(parsed) ? parsed.length : 0);
        if (Array.isArray(parsed)) {
          parsed.forEach((task, index) => {
            console.log(`📄 Enhanced Task ${index + 1}:`, {
              id: task.id,
              name: task.name,
              category: task.category,
              steps: task.steps?.length || 0
            });
          });
        }
      } catch (error) {
        console.error('❌ Failed to parse enhanced tasks:', error);
      }
    } else {
      console.log('⚠️ No enhanced tasks found');
    }
    
    // Test getAllScripts to see combined result
    const allScripts = this.getAllScripts();
    console.log('🔄 Combined getAllScripts() result:', allScripts.length, 'total scripts');
    allScripts.forEach((script, index) => {
      console.log(`🔗 Combined Script ${index + 1}:`, {
        id: script.id,
        name: script.name,
        category: script.category,
        isFromEnhancedRPA: script.isFromEnhancedRPA || false
      });
    });
    
    console.log('🔍 =========================');
  }

  private getDefaultScripts(): RPAScript[] {
    return [
      {
        id: 'script_website_scrolling',
        name: '🌐 Website Smooth Scrolling',
        description: 'Opens a website, waits 10 seconds, performs smooth random scrolling from top to bottom and back, then auto-closes browser',
        category: 'automation',
        icon: '🌐',
        code: `// Website Smooth Scrolling Automation
// Step 1: Open website
await page.goto('https://www.google.com');
await page.waitForLoadState('networkidle');

// Step 2: Wait 10 seconds
console.log('🕒 Waiting 10 seconds before starting...');
await page.waitForTimeout(10000);

// Step 3: Smooth scroll down - top to bottom
console.log('🔽 Starting smooth scroll down...');
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => {
    window.scrollBy({
      top: 300 + Math.random() * 200,
      left: 0,
      behavior: 'smooth'
    });
  });
  await page.waitForTimeout(1500 + Math.random() * 1000);
}

// Step 4: Scroll to bottom
console.log('🔽 Scrolling to bottom...');
await page.evaluate(() => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});
await page.waitForTimeout(3000);

// Step 5: Smooth scroll up - bottom to top
console.log('🔼 Starting smooth scroll up...');
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => {
    window.scrollBy({
      top: -(400 + Math.random() * 200),
      left: 0,
      behavior: 'smooth'
    });
  });
  await page.waitForTimeout(1800 + Math.random() * 700);
}

// Step 6: Scroll to top
console.log('🔼 Scrolling back to top...');
await page.evaluate(() => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
await page.waitForTimeout(2000);

console.log('✅ Website scrolling automation completed successfully!');

// Step 7: Close browser (handled by BeastBrowser automatically)
console.log('🚪 Closing browser...');`
      },
      {
        id: 'script_google_search',
        name: 'Google Search Automation',
        description: 'Performs automated Google searches with human-like behavior',
        category: 'automation',
        icon: '🔍',
        code: `// Google Search Automation
await page.goto('https://www.google.com');
await page.waitForSelector('input[name="q"]');

// Add random delay to mimic human behavior
await page.waitForTimeout(Math.random() * 2000 + 1000);

// Type search query with realistic typing speed
await page.type('input[name="q"]', 'web scraping tools', { delay: Math.random() * 100 + 50 });

// Random mouse movement before clicking
await page.mouse.move(Math.random() * 100 + 200, Math.random() * 100 + 200);

// Click search button
await page.click('input[value="Google Search"]');

// Wait for results and scroll randomly
await page.waitForSelector('#search');
await page.evaluate(() => {
  window.scrollTo(0, Math.random() * 500 + 200);
});`
      },
      {
        id: 'script_social_media',
        name: 'Social Media Interaction',
        description: 'Automated social media browsing and interaction',
        category: 'social',
        icon: '📱',
        code: `// Social Media Automation
// Navigate to social media platform
await page.goto('https://example-social.com');

// Random scrolling to simulate browsing
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => {
    window.scrollBy(0, Math.random() * 300 + 200);
  });
  await page.waitForTimeout(Math.random() * 3000 + 2000);
}

// Click on random posts (simulate engagement)
const posts = await page.$$('.post-selector');
if (posts.length > 0) {
  const randomPost = posts[Math.floor(Math.random() * posts.length)];
  await randomPost.click();
  await page.waitForTimeout(Math.random() * 5000 + 3000);
}`
      },
      {
        id: 'script_ecommerce_browse',
        name: 'E-commerce Browsing',
        description: 'Browse e-commerce sites with realistic behavior',
        category: 'ecommerce',
        icon: '🛒',
        code: `// E-commerce Browsing Automation
await page.goto('https://example-shop.com');

// Browse categories
const categories = await page.$$('.category-link');
if (categories.length > 0) {
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  await randomCategory.click();
  await page.waitForTimeout(Math.random() * 3000 + 2000);
}

// Scroll through products
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => {
    window.scrollBy(0, Math.random() * 400 + 300);
  });
  await page.waitForTimeout(Math.random() * 2000 + 1000);
}

// Click on a random product
const products = await page.$$('.product-item');
if (products.length > 0) {
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  await randomProduct.click();
  await page.waitForTimeout(Math.random() * 4000 + 2000);
}`
      }
    ];
  }
}

export const rpaService = RPAService.getInstance();