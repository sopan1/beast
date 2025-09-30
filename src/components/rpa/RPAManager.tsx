import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Square, 
  Bot, 
  Code,
  Save,
  Trash2,
  Plus,
  Edit,
  Copy,
  Download,
  Upload,
  Zap,
  Globe,
  MousePointer,
  Type,
  Navigation,
  Scroll,
  Clock,
  Settings,
  ChevronRight,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Search,
  Target,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Timer,
  Keyboard,
  Mouse,
  Eye,
  Hash,
  MoveVertical,
  Hand,
  Shuffle,
  Gauge,
  Link,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { rpaService, RPAScript } from '@/services/rpaService';

const scriptCategories = [
  { id: 'automation', name: 'General Automation', icon: '🤖', color: 'bg-blue-500' },
  { id: 'social', name: 'Social Media', icon: '📱', color: 'bg-purple-500' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒', color: 'bg-green-500' },
  { id: 'data', name: 'Data Collection', icon: '📊', color: 'bg-orange-500' },
  { id: 'search', name: 'Search & Browse', icon: '🔍', color: 'bg-indigo-500' },
  { id: 'interaction', name: 'User Interaction', icon: '👆', color: 'bg-pink-500' }
];

// Action Types for Visual Script Builder
const actionTypes = [
  {
    id: 'navigate',
    name: 'Navigate to URL',
    icon: <Globe className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Navigate to a specific website URL'
  },
  {
    id: 'wait',
    name: 'Wait/Delay',
    icon: <Timer className="w-4 h-4" />,
    color: 'bg-yellow-500',
    description: 'Add delay or wait for elements'
  },
  {
    id: 'click',
    name: 'Click Element',
    icon: <MousePointer className="w-4 h-4" />,
    color: 'bg-green-500',
    description: 'Click on specific elements'
  },
  {
    id: 'type',
    name: 'Type Text',
    icon: <Keyboard className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'Type text into input fields'
  },
  {
    id: 'scroll',
    name: 'Scroll Page',
    icon: <MoveVertical className="w-4 h-4" />,
    color: 'bg-indigo-500',
    description: 'Scroll up, down, or to specific elements'
  },
  {
    id: 'search',
    name: 'Search',
    icon: <Search className="w-4 h-4" />,
    color: 'bg-orange-500',
    description: 'Perform search operations'
  },
  {
    id: 'extract',
    name: 'Extract Data',
    icon: <Target className="w-4 h-4" />,
    color: 'bg-red-500',
    description: 'Extract text or data from elements'
  },
  {
    id: 'random',
    name: 'Random Action',
    icon: <Shuffle className="w-4 h-4" />,
    color: 'bg-gray-500',
    description: 'Perform random human-like actions'
  }
];

// Scroll Patterns
const scrollPatterns = [
  { id: 'linear', name: 'Linear Scroll', description: 'Smooth continuous scrolling' },
  { id: 'step', name: 'Step Scroll', description: 'Scroll in steps with pauses' },
  { id: 'random', name: 'Random Scroll', description: 'Random scrolling patterns' },
  { id: 'human', name: 'Human-like', description: 'Mimic natural human scrolling' },
  { id: 'page', name: 'Page by Page', description: 'Scroll one page at a time' },
  { id: 'element', name: 'To Element', description: 'Scroll to specific elements' }
];

// Click Strategies
const clickStrategies = [
  { id: 'direct', name: 'Direct Click', description: 'Click directly on element' },
  { id: 'hover', name: 'Hover then Click', description: 'Hover first, then click' },
  { id: 'double', name: 'Double Click', description: 'Perform double click' },
  { id: 'right', name: 'Right Click', description: 'Right click (context menu)' },
  { id: 'random', name: 'Random Position', description: 'Click at random position within element' }
];

// Speed Presets
const speedPresets = [
  { id: 'very-slow', name: 'Very Slow', multiplier: 3, description: 'Ultra careful automation' },
  { id: 'slow', name: 'Slow', multiplier: 2, description: 'Slow and steady' },
  { id: 'normal', name: 'Normal', multiplier: 1, description: 'Standard human speed' },
  { id: 'fast', name: 'Fast', multiplier: 0.5, description: 'Quick automation' },
  { id: 'very-fast', name: 'Very Fast', multiplier: 0.2, description: 'Maximum speed' }
];

// Action Interface
interface ScriptAction {
  id: string;
  type: string;
  enabled: boolean;
  config: {
    // Navigation
    url?: string;
    
    // Wait/Delay
    waitType?: 'fixed' | 'random' | 'element';
    waitTime?: number;
    waitTimeMin?: number;
    waitTimeMax?: number;
    waitSelector?: string;
    
    // Click
    selector?: string;
    clickStrategy?: string;
    clickDelay?: number;
    
    // Type
    text?: string;
    typingSpeed?: number;
    typingVariation?: boolean;
    
    // Scroll
    scrollPattern?: string;
    scrollAmount?: number;
    scrollDirection?: 'up' | 'down' | 'both';
    scrollSpeed?: number;
    scrollPauses?: boolean;
    scrollTarget?: string;
    
    // Search
    searchQuery?: string;
    searchEngine?: string;
    searchResultAction?: string;
    
    // Extract
    extractSelector?: string;
    extractAttribute?: string;
    extractVariable?: string;
    
    // Random
    randomActions?: string[];
    randomProbability?: number;
  };
}

const scriptTemplates = [
  {
    name: 'Google Search Automation',
    category: 'automation',
    description: 'Automated Google search with human-like behavior',
    code: `// Google Search Automation
await page.goto('https://www.google.com');
await page.waitForSelector('input[name="q"]');

// Add random delay to mimic human behavior
await page.waitForTimeout(Math.random() * 2000 + 1000);

// Type search query with realistic typing speed
await page.type('input[name="q"]', 'web scraping tools', { 
  delay: Math.random() * 100 + 50 
});

// Random mouse movement before clicking
await page.mouse.move(
  Math.random() * 100 + 200, 
  Math.random() * 100 + 200
);

// Click search button
await page.click('input[value="Google Search"]');

// Wait for results and scroll randomly
await page.waitForSelector('#search');
await page.evaluate(() => {
  window.scrollTo(0, Math.random() * 500 + 200);
});

console.log('Google search completed successfully');`
  },
  {
    name: 'Social Media Interaction',
    category: 'social',
    description: 'Automated social media browsing and engagement',
    code: `// Social Media Automation
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
}

console.log('Social media interaction completed');`
  },
  {
    name: 'E-commerce Product Browse',
    category: 'ecommerce',
    description: 'Browse products with realistic shopping behavior',
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
}

console.log('E-commerce browsing completed');`
  },
  {
    name: 'Data Collection Script',
    category: 'data',
    description: 'Extract data from web pages systematically',
    code: `// Data Collection Automation
await page.goto('https://example-data-site.com');

// Wait for content to load
await page.waitForSelector('.data-container');

// Extract data from multiple elements
const dataItems = await page.$$eval('.data-item', items => {
  return items.map(item => ({
    title: item.querySelector('.title')?.textContent?.trim(),
    description: item.querySelector('.description')?.textContent?.trim(),
    link: item.querySelector('a')?.href
  }));
});

// Log collected data
console.log('Collected data:', dataItems);

// Navigate through pagination if exists
const nextButton = await page.$('.next-page');
if (nextButton) {
  await nextButton.click();
  await page.waitForTimeout(2000);
}

console.log('Data collection completed');`
  }
];

export default function RPAManager() {
  const [scripts, setScripts] = useState<RPAScript[]>([]);
  const [currentScript, setCurrentScript] = useState<RPAScript | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isVisualMode, setIsVisualMode] = useState(true);
  const [scriptActions, setScriptActions] = useState<ScriptAction[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<ScriptAction | null>(null);
  const [globalSpeed, setGlobalSpeed] = useState('normal');
  const [humanBehavior, setHumanBehavior] = useState(true);
  const [smartWaits, setSmartWaits] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'automation' as RPAScript['category'],
    code: ''
  });

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = () => {
    const loadedScripts = rpaService.getAllScripts();
    setScripts(loadedScripts);
  };

  const generateCodeFromActions = (actions: ScriptAction[]): string => {
    const speedMultiplier = speedPresets.find(p => p.id === globalSpeed)?.multiplier || 1;
    let code = `// Auto-generated script from Visual Builder\n`;
    code += `// Speed: ${globalSpeed}, Human Behavior: ${humanBehavior ? 'Enabled' : 'Disabled'}\n\n`;
    
    actions.filter(a => a.enabled).forEach((action, index) => {
      code += `// Step ${index + 1}: ${actionTypes.find(t => t.id === action.type)?.name}\n`;
      
      switch (action.type) {
        case 'navigate':
          code += `await page.goto('${action.config.url}');\n`;
          if (smartWaits) {
            code += `await page.waitForTimeout(2000); // Wait for page load\n`;
          }
          break;
          
        case 'wait':
          if (action.config.waitType === 'fixed') {
            const waitTime = (action.config.waitTime || 1000) * speedMultiplier;
            code += `await page.waitForTimeout(${waitTime});\n`;
          } else if (action.config.waitType === 'random') {
            const minTime = (action.config.waitTimeMin || 500) * speedMultiplier;
            const maxTime = (action.config.waitTimeMax || 2000) * speedMultiplier;
            code += `await page.waitForTimeout(Math.random() * ${maxTime - minTime} + ${minTime});\n`;
          } else if (action.config.waitType === 'element') {
            code += `await page.waitForSelector('${action.config.waitSelector}');\n`;
          }
          break;
          
        case 'click':
          if (humanBehavior && action.config.clickStrategy === 'hover') {
            code += `// Hover before clicking for human-like behavior\n`;
            code += `const hoverElement = await page.$('${action.config.selector}');\n`;
            code += `if (hoverElement) {\n`;
            code += `  const rect = hoverElement.getBoundingClientRect();\n`;
            code += `  await page.mouse.move(rect.left + rect.width / 2, rect.top + rect.height / 2);\n`;
            code += `  await page.waitForTimeout(${300 * speedMultiplier});\n`;
            code += `}\n`;
          }
          if (action.config.clickStrategy === 'random') {
            code += `// Click at random position within element\n`;
            code += `const randomElement = await page.$('${action.config.selector}');\n`;
            code += `if (randomElement) {\n`;
            code += `  const rect = randomElement.getBoundingClientRect();\n`;
            code += `  const x = rect.left + Math.random() * rect.width;\n`;
            code += `  const y = rect.top + Math.random() * rect.height;\n`;
            code += `  await page.mouse.click(x, y);\n`;
            code += `} else {\n`;
            code += `  await page.click('${action.config.selector}');\n`;
            code += `}\n`;
          } else {
            // Use standard click for all other strategies
            code += `await page.click('${action.config.selector}');\n`;
          }
          if (action.config.clickDelay) {
            code += `await page.waitForTimeout(${action.config.clickDelay * speedMultiplier});\n`;
          }
          break;
          
        case 'type':
          const typingSpeed = action.config.typingSpeed || 50;
          const delay = action.config.typingVariation ? 
            `Math.random() * ${typingSpeed * 2} + ${typingSpeed / 2}` : 
            typingSpeed.toString();
          code += `await page.type('${action.config.selector}', '${action.config.text}', { delay: ${delay} });\n`;
          break;
          
        case 'scroll':
          switch (action.config.scrollPattern) {
            case 'linear':
              const scrollAmount = action.config.scrollAmount || 300;
              const direction = action.config.scrollDirection === 'up' ? '-' : '';
              code += `await page.scroll({ amount: ${scrollAmount}, direction: '${action.config.scrollDirection || 'down'}' });\n`;
              break;
            case 'random':
              code += `await page.scroll({ amount: Math.random() * 500 + 200, direction: Math.random() > 0.5 ? 'down' : 'up' });\n`;
              break;
            case 'human':
              code += `for (let i = 0; i < 3; i++) {\n`;
              code += `  await page.scroll({ amount: Math.random() * 200 + 100, direction: 'down' });\n`;
              code += `  await page.waitForTimeout(Math.random() * 1000 + 500);\n`;
              code += `}\n`;
              break;
            case 'element':
              if (action.config.scrollTarget) {
                code += `await page.scroll({ selector: '${action.config.scrollTarget}' });\n`;
              }
              break;
            default:
              code += `await page.scroll({ amount: 300, direction: 'down' });\n`;
          }
          break;
          
        case 'search':
          switch (action.config.searchEngine) {
            case 'google':
              code += `await page.goto('https://www.google.com');\n`;
              code += `await page.waitForSelector('input[name="q"]');\n`;
              code += `await page.type('input[name="q"]', '${action.config.searchQuery}');\n`;
              code += `await page.click('input[value="Google Search"], button[type="submit"]');\n`;
              code += `await page.waitForSelector('#search');\n`;
              break;
            case 'bing':
              code += `await page.goto('https://www.bing.com');\n`;
              code += `await page.waitForSelector('input[name="q"]');\n`;
              code += `await page.type('input[name="q"]', '${action.config.searchQuery}');\n`;
              code += `await page.click('#search_icon');\n`;
              code += `await page.waitForSelector('#b_results');\n`;
              break;
            case 'duckduckgo':
              code += `await page.goto('https://duckduckgo.com');\n`;
              code += `await page.waitForSelector('input[name="q"]');\n`;
              code += `await page.type('input[name="q"]', '${action.config.searchQuery}');\n`;
              code += `await page.click('button[type="submit"]');\n`;
              code += `await page.waitForSelector('#links');\n`;
              break;
            default:
              code += `await page.goto('https://www.google.com');\n`;
              code += `await page.waitForSelector('input[name="q"]');\n`;
              code += `await page.type('input[name="q"]', '${action.config.searchQuery}');\n`;
              code += `await page.click('input[value="Google Search"], button[type="submit"]');\n`;
              code += `await page.waitForSelector('#search');\n`;
          }
          
          // Handle search result actions
          if (action.config.searchResultAction === 'first') {
            code += `const firstResult = await page.$('h3 a, .result__a');\n`;
            code += `if (firstResult) await firstResult.click();\n`;
          } else if (action.config.searchResultAction === 'random') {
            code += `const results = await page.$$('h3 a, .result__a');\n`;
            code += `if (results.length > 0) {\n`;
            code += `  const randomResult = results[Math.floor(Math.random() * results.length)];\n`;
            code += `  await randomResult.click();\n`;
            code += `}\n`;
          } else if (action.config.searchResultAction === 'scroll') {
            code += `for (let i = 0; i < 3; i++) {\n`;
            code += `  await page.scroll({ amount: 300, direction: 'down' });\n`;
            code += `  await page.waitForTimeout(1000 + Math.random() * 1000);\n`;
            code += `}\n`;
          }
          break;
          
        case 'extract':
          code += `const extractedData = await page.$eval('${action.config.extractSelector}', el => {\n`;
          if (action.config.extractAttribute === 'text') {
            code += `  return el.textContent;\n`;
          } else if (action.config.extractAttribute === 'href') {
            code += `  return el.href;\n`;
          } else {
            code += `  return el.getAttribute('${action.config.extractAttribute}');\n`;
          }
          code += `});\n`;
          code += `console.log('Extracted ${action.config.extractVariable}:', extractedData);\n`;
          break;
          
        case 'random':
          if (action.config.randomActions?.includes('scroll')) {
            code += `if (Math.random() < ${action.config.randomProbability || 0.5}) {\n`;
            code += `  await page.scroll({ amount: Math.random() * 300 + 100, direction: 'down' });\n`;
            code += `}\n`;
          }
          if (action.config.randomActions?.includes('move')) {
            code += `await page.mouse.move(Math.random() * 100 + 200, Math.random() * 100 + 200);\n`;
          }
          break;
      }
      
      if (humanBehavior && index < actions.length - 1) {
        code += `await page.waitForTimeout(Math.random() * 1000 + 500);\n`;
      }
      code += `\n`;
    });
    
    code += `console.log('Automation script completed successfully!');`;
    return code;
  };

  const addAction = (type: string) => {
    const newAction: ScriptAction = {
      id: `action_${Date.now()}`,
      type,
      enabled: true,
      config: {}
    };
    setEditingAction(newAction);
    setShowActionModal(true);
  };

  const saveAction = (action: ScriptAction) => {
    if (editingAction && scriptActions.find(a => a.id === editingAction.id)) {
      setScriptActions(prev => prev.map(a => a.id === action.id ? action : a));
    } else {
      setScriptActions(prev => [...prev, action]);
    }
    setShowActionModal(false);
    setEditingAction(null);
  };

  const deleteAction = (actionId: string) => {
    setScriptActions(prev => prev.filter(a => a.id !== actionId));
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newActions = [...scriptActions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newActions.length) {
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      setScriptActions(newActions);
    }
  };

  const handleCreateScript = () => {
    setFormData({
      name: '',
      description: '',
      category: 'automation',
      code: ''
    });
    setCurrentScript(null);
    setScriptActions([]);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const handleSaveScript = () => {
    if (!formData.name.trim()) {
      toast.error('Script name is required');
      return;
    }

    const finalCode = isVisualMode ? generateCodeFromActions(scriptActions) : formData.code;
    
    if (!finalCode.trim()) {
      toast.error('Script must have actions or code');
      return;
    }

    const categoryInfo = scriptCategories.find(cat => cat.id === formData.category);
    
    console.log('💾 Saving RPA script:', {
      name: formData.name,
      category: formData.category,
      codeLength: finalCode.length,
      isUpdate: !!currentScript
    });
    
    if (currentScript) {
      rpaService.updateScript(currentScript.id, {
        ...formData,
        code: finalCode,
        icon: categoryInfo?.icon || '🤖'
      });
      console.log('✅ Updated existing script:', currentScript.id);
      toast.success('Script updated successfully');
    } else {
      const newScript = rpaService.addScript({
        ...formData,
        code: finalCode,
        icon: categoryInfo?.icon || '🤖'
      });
      console.log('✅ Created new script:', newScript.id, newScript.name);
      toast.success('Script created successfully');
    }
    
    // Debug what's in localStorage after saving
    rpaService.debugLocalStorage();

    setIsEditing(false);
    setCurrentScript(null);
    setScriptActions([]);
    loadScripts();
    setActiveTab('library');
  };

  const handleEditScript = (script: RPAScript) => {
    setFormData({
      name: script.name,
      description: script.description,
      category: script.category,
      code: script.code
    });
    setCurrentScript(script);
    setScriptActions([]);
    setIsVisualMode(false); // Switch to code mode for editing existing scripts
    setIsEditing(true);
    setActiveTab('builder');
  };

  const handleDeleteScript = (script: RPAScript) => {
    if (!confirm(`Are you sure you want to delete "${script.name}"?`)) return;
    
    rpaService.deleteScript(script.id);
    toast.success('Script deleted successfully');
    loadScripts();
    
    if (currentScript?.id === script.id) {
      setCurrentScript(null);
    }
  };

  const filteredScripts = scripts.filter(script => {
    const matchesCategory = selectedCategory === 'all' || script.category === selectedCategory;
    const matchesSearch = script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         script.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryInfo = (categoryId: string) => {
    return scriptCategories.find(cat => cat.id === categoryId) || scriptCategories[0];
  };

  return (
    <div className="container mx-auto p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🤖 Advanced RPA Builder
          </h1>
          <p className="text-gray-600 mt-1">Create powerful automation scripts with visual builder or code editor</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateScript} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus className="w-4 h-4 mr-2" />
            New Script
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {scriptCategories.map(category => {
          const count = scripts.filter(s => s.category === category.id).length;
          return (
            <Card key={category.id} className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{category.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center text-white text-xl`}>
                    {category.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="library" className="data-[state=active]:bg-white">
            <Bot className="w-4 h-4 mr-2" />
            Script Library
          </TabsTrigger>
          <TabsTrigger value="builder" className="data-[state=active]:bg-white">
            <Zap className="w-4 h-4 mr-2" />
            Visual Builder
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-white">
            <Code className="w-4 h-4 mr-2" />
            Execution Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          {/* Filters */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search scripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {scriptCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scripts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScripts.map((script) => {
              const categoryInfo = getCategoryInfo(script.category);
              return (
                <Card key={script.id} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${categoryInfo.color} flex items-center justify-center text-white text-lg`}>
                          {script.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {script.name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs mt-1">
                            {categoryInfo.name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {script.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditScript(script)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteScript(script)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredScripts.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No scripts found</p>
                <Button onClick={handleCreateScript} className="bg-purple-500 hover:bg-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Script
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          {isEditing ? (
            <div className="space-y-6">
              {/* Script Info */}
              <Card className="bg-white border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    {currentScript ? 'Edit Script' : 'Create New Script'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 font-medium">Script Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter script name"
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium">Category</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value: RPAScript['category']) => 
                          setFormData(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scriptCategories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of what this script does"
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Builder Mode Toggle */}
              <Card className="bg-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={isVisualMode} 
                          onCheckedChange={setIsVisualMode}
                        />
                        <Label className="font-medium">
                          {isVisualMode ? 'Visual Builder' : 'Code Editor'}
                        </Label>
                      </div>
                      {isVisualMode && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-600">Speed:</Label>
                            <Select value={globalSpeed} onValueChange={setGlobalSpeed}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {speedPresets.map(preset => (
                                  <SelectItem key={preset.id} value={preset.id}>
                                    {preset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={humanBehavior} onCheckedChange={setHumanBehavior} />
                            <Label className="text-sm text-gray-600">Human Behavior</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={smartWaits} onCheckedChange={setSmartWaits} />
                            <Label className="text-sm text-gray-600">Smart Waits</Label>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveScript} className="bg-green-500 hover:bg-green-600">
                        <Save className="w-4 h-4 mr-2" />
                        Save Script
                      </Button>
                      <Button variant="outline" onClick={() => { setIsEditing(false); setActiveTab('library'); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isVisualMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Action Types Panel */}
                  <Card className="bg-white border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Add Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {actionTypes.map(actionType => (
                        <Button
                          key={actionType.id}
                          variant="outline"
                          className="w-full justify-start h-auto p-3"
                          onClick={() => addAction(actionType.id)}
                        >
                          <div className={`w-8 h-8 rounded ${actionType.color} flex items-center justify-center text-white mr-3`}>
                            {actionType.icon}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{actionType.name}</div>
                            <div className="text-xs text-gray-500">{actionType.description}</div>
                          </div>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Script Actions */}
                  <div className="lg:col-span-2">
                    <Card className="bg-white border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <PlayCircle className="w-5 h-5" />
                          Script Actions ({scriptActions.filter(a => a.enabled).length} enabled)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {scriptActions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No actions added yet</p>
                            <p className="text-sm">Add actions from the left panel to build your script</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {scriptActions.map((action, index) => {
                              const actionType = actionTypes.find(t => t.id === action.type);
                              return (
                                <div key={action.id} className={`border rounded-lg p-3 ${action.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded ${actionType?.color} flex items-center justify-center text-white text-sm`}>
                                        {actionType?.icon}
                                      </div>
                                      <div>
                                        <div className="font-medium">{actionType?.name}</div>
                                        <div className="text-sm text-gray-600">
                                          {action.type === 'navigate' && action.config.url && `Go to: ${action.config.url}`}
                                          {action.type === 'wait' && `Wait: ${action.config.waitTime || action.config.waitTimeMin}-${action.config.waitTimeMax}ms`}
                                          {action.type === 'click' && action.config.selector && `Click: ${action.config.selector}`}
                                          {action.type === 'type' && action.config.text && `Type: "${action.config.text}"`}
                                          {action.type === 'scroll' && `Scroll: ${action.config.scrollPattern || 'default'}`}
                                          {action.type === 'search' && action.config.searchQuery && `Search: "${action.config.searchQuery}"`}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Switch 
                                        checked={action.enabled}
                                        onCheckedChange={(enabled) => {
                                          setScriptActions(prev => 
                                            prev.map(a => a.id === action.id ? { ...a, enabled } : a)
                                          );
                                        }}
                                      />
                                      <Button size="sm" variant="outline" onClick={() => moveAction(index, 'up')} disabled={index === 0}>
                                        <ArrowUp className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => moveAction(index, 'down')} disabled={index === scriptActions.length - 1}>
                                        <ArrowDown className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => { setEditingAction(action); setShowActionModal(true); }}>
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => deleteAction(action.id)}>
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="bg-white border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">JavaScript Code Editor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      rows={20}
                      className="font-mono text-sm bg-gray-900 text-green-400 border-gray-600"
                      placeholder="// Enter your automation code here...\nawait page.goto('https://example.com');\nawait page.waitForSelector('.selector');\n// Add your automation logic..."
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">Select a script to edit or create a new one</p>
                <Button onClick={handleCreateScript} className="bg-purple-500 hover:bg-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Script
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                {executionLogs.length === 0 ? (
                  <div className="text-gray-500">No execution logs yet...</div>
                ) : (
                  executionLogs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))
                )}
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => setExecutionLogs([])}>
                  Clear Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Configuration Modal */}
      {showActionModal && editingAction && (
        <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle>Configure {actionTypes.find(t => t.id === editingAction.type)?.name}</DialogTitle>
              <DialogDescription>
                Set up the parameters for this automation action
              </DialogDescription>
            </DialogHeader>
            <ActionConfigForm 
              action={editingAction} 
              onSave={saveAction} 
              onCancel={() => setShowActionModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Action Configuration Form Component
interface ActionConfigFormProps {
  action: ScriptAction;
  onSave: (action: ScriptAction) => void;
  onCancel: () => void;
}

function ActionConfigForm({ action, onSave, onCancel }: ActionConfigFormProps) {
  const [config, setConfig] = useState(action.config);

  const handleSave = () => {
    onSave({ ...action, config });
  };

  const renderConfigFields = () => {
    switch (action.type) {
      case 'navigate':
        return (
          <div className="space-y-4">
            <div>
              <Label>Website URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </div>
        );

      case 'wait':
        return (
          <div className="space-y-4">
            <div>
              <Label>Wait Type</Label>
              <Select value={config.waitType || 'fixed'} onValueChange={(value) => setConfig(prev => ({ ...prev, waitType: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Time</SelectItem>
                  <SelectItem value="random">Random Time</SelectItem>
                  <SelectItem value="element">Wait for Element</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.waitType === 'fixed' && (
              <div>
                <Label>Wait Time (ms)</Label>
                <Input
                  type="number"
                  value={config.waitTime || 1000}
                  onChange={(e) => setConfig(prev => ({ ...prev, waitTime: parseInt(e.target.value) }))}
                />
              </div>
            )}
            {config.waitType === 'random' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Time (ms)</Label>
                  <Input
                    type="number"
                    value={config.waitTimeMin || 500}
                    onChange={(e) => setConfig(prev => ({ ...prev, waitTimeMin: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Max Time (ms)</Label>
                  <Input
                    type="number"
                    value={config.waitTimeMax || 2000}
                    onChange={(e) => setConfig(prev => ({ ...prev, waitTimeMax: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            )}
            {config.waitType === 'element' && (
              <div>
                <Label>CSS Selector</Label>
                <Input
                  value={config.waitSelector || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, waitSelector: e.target.value }))}
                  placeholder=".my-element, #my-id, button"
                />
              </div>
            )}
          </div>
        );

      case 'click':
        return (
          <div className="space-y-4">
            <div>
              <Label>CSS Selector</Label>
              <Input
                value={config.selector || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, selector: e.target.value }))}
                placeholder=".button, #submit, a[href='/login']"
              />
            </div>
            <div>
              <Label>Click Strategy</Label>
              <Select value={config.clickStrategy || 'direct'} onValueChange={(value) => setConfig(prev => ({ ...prev, clickStrategy: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clickStrategies.map(strategy => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name} - {strategy.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Click Delay (ms)</Label>
              <Input
                type="number"
                value={config.clickDelay || 0}
                onChange={(e) => setConfig(prev => ({ ...prev, clickDelay: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        );

      case 'type':
        return (
          <div className="space-y-4">
            <div>
              <Label>CSS Selector</Label>
              <Input
                value={config.selector || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, selector: e.target.value }))}
                placeholder="input[name='username'], #email"
              />
            </div>
            <div>
              <Label>Text to Type</Label>
              <Input
                value={config.text || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Enter text to type"
              />
            </div>
            <div>
              <Label>Typing Speed (ms per character)</Label>
              <Slider
                value={[config.typingSpeed || 50]}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, typingSpeed: value }))}
                max={200}
                min={10}
                step={10}
              />
              <p className="text-sm text-gray-500">{config.typingSpeed || 50}ms per character</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={config.typingVariation || false}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, typingVariation: checked }))}
              />
              <Label>Add typing variation (more human-like)</Label>
            </div>
          </div>
        );

      case 'scroll':
        return (
          <div className="space-y-4">
            <div>
              <Label>Scroll Pattern</Label>
              <Select value={config.scrollPattern || 'linear'} onValueChange={(value) => setConfig(prev => ({ ...prev, scrollPattern: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scrollPatterns.map(pattern => (
                    <SelectItem key={pattern.id} value={pattern.id}>
                      {pattern.name} - {pattern.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {config.scrollPattern === 'linear' && (
              <>
                <div>
                  <Label>Scroll Amount (pixels)</Label>
                  <Slider
                    value={[config.scrollAmount || 300]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, scrollAmount: value }))}
                    max={1000}
                    min={50}
                    step={50}
                  />
                  <p className="text-sm text-gray-500">{config.scrollAmount || 300} pixels</p>
                </div>
                <div>
                  <Label>Scroll Direction</Label>
                  <Select value={config.scrollDirection || 'down'} onValueChange={(value) => setConfig(prev => ({ ...prev, scrollDirection: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="down">Scroll Down</SelectItem>
                      <SelectItem value="up">Scroll Up</SelectItem>
                      <SelectItem value="both">Random Direction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {config.scrollPattern === 'element' && (
              <div>
                <Label>Target Element Selector</Label>
                <Input
                  value={config.scrollTarget || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, scrollTarget: e.target.value }))}
                  placeholder=".target-element, #section-id"
                />
              </div>
            )}
          </div>
        );

      case 'search':
        return (
          <div className="space-y-4">
            <div>
              <Label>Search Query</Label>
              <Input
                value={config.searchQuery || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="Enter search terms"
              />
            </div>
            <div>
              <Label>Search Engine</Label>
              <Select value={config.searchEngine || 'google'} onValueChange={(value) => setConfig(prev => ({ ...prev, searchEngine: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="bing">Bing</SelectItem>
                  <SelectItem value="yahoo">Yahoo</SelectItem>
                  <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>After Search Action</Label>
              <Select value={config.searchResultAction || 'none'} onValueChange={(value) => setConfig(prev => ({ ...prev, searchResultAction: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Just Search</SelectItem>
                  <SelectItem value="first">Click First Result</SelectItem>
                  <SelectItem value="random">Click Random Result</SelectItem>
                  <SelectItem value="scroll">Scroll Through Results</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'extract':
        return (
          <div className="space-y-4">
            <div>
              <Label>Element Selector</Label>
              <Input
                value={config.extractSelector || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, extractSelector: e.target.value }))}
                placeholder=".data-element, #content"
              />
            </div>
            <div>
              <Label>Extract Attribute</Label>
              <Select value={config.extractAttribute || 'text'} onValueChange={(value) => setConfig(prev => ({ ...prev, extractAttribute: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Content</SelectItem>
                  <SelectItem value="href">Link (href)</SelectItem>
                  <SelectItem value="src">Image Source (src)</SelectItem>
                  <SelectItem value="title">Title Attribute</SelectItem>
                  <SelectItem value="value">Input Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Variable Name</Label>
              <Input
                value={config.extractVariable || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, extractVariable: e.target.value }))}
                placeholder="myData, pageTitle, productPrice"
              />
            </div>
          </div>
        );

      case 'random':
        return (
          <div className="space-y-4">
            <div>
              <Label>Random Actions</Label>
              <div className="space-y-2">
                {['scroll', 'move', 'pause', 'click'].map(randomAction => (
                  <div key={randomAction} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.randomActions?.includes(randomAction) || false}
                      onChange={(e) => {
                        const actions = config.randomActions || [];
                        if (e.target.checked) {
                          setConfig(prev => ({ ...prev, randomActions: [...actions, randomAction] }));
                        } else {
                          setConfig(prev => ({ ...prev, randomActions: actions.filter(a => a !== randomAction) }));
                        }
                      }}
                    />
                    <Label className="capitalize">{randomAction}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Probability (0-1)</Label>
              <Slider
                value={[config.randomProbability || 0.5]}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, randomProbability: value }))}
                max={1}
                min={0}
                step={0.1}
              />
              <p className="text-sm text-gray-500">{Math.round((config.randomProbability || 0.5) * 100)}% chance</p>
            </div>
          </div>
        );

      default:
        return <div>No configuration options for this action type.</div>;
    }
  };

  return (
    <div className="space-y-6">
      {renderConfigFields()}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-purple-500 hover:bg-purple-600">
          Save Action
        </Button>
      </div>
    </div>
  );
}