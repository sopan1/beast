import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus,
  Save,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Copy,
  Settings,
  Play,
  X,
  GripVertical,
  Zap,
  Code,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { enhancedRPAService } from '@/services/enhancedRPAService';
import { RPATask, RPAStep, RPAStepTemplate, RPATaskSettings } from '@/types/rpa';

interface RPATaskBuilderProps {
  task?: RPATask;
  onSave: (task: RPATask) => void;
  onCancel: () => void;
}

export default function RPATaskBuilder({ task, onSave, onCancel }: RPATaskBuilderProps) {
  const [taskName, setTaskName] = useState(task?.name || '');
  const [taskDescription, setTaskDescription] = useState(task?.description || '');
  const [taskCategory, setTaskCategory] = useState(task?.category || 'automation');
  const [taskIcon, setTaskIcon] = useState(task?.icon || '🤖');
  const [steps, setSteps] = useState<RPAStep[]>(task?.steps || []);
  const [settings, setSettings] = useState<RPATaskSettings>(
    task?.settings || {
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
      logLevel: 'detailed'
    }
  );
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<RPAStep | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  const stepTemplates = enhancedRPAService.getStepTemplates();

  const categories = [
    { id: 'automation', name: 'General Automation', icon: '🤖' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
    { id: 'data', name: 'Data Collection', icon: '📊' },
    { id: 'search', name: 'Search & Browse', icon: '🔍' },
    { id: 'interaction', name: 'User Interaction', icon: '👆' }
  ];

  const handleAddStep = (template: RPAStepTemplate) => {
    const newStep: RPAStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      name: template.name,
      description: template.description,
      enabled: true,
      order: steps.length,
      config: template.defaultConfig
    };
    
    setSteps(prev => [...prev, newStep]);
    setEditingStep(newStep);
    setShowStepModal(true);
  };

  const handleEditStep = (step: RPAStep) => {
    setEditingStep(step);
    setShowStepModal(true);
  };

  const handleSaveStep = (updatedStep: RPAStep) => {
    setSteps(prev => 
      prev.map(step => step.id === updatedStep.id ? updatedStep : step)
    );
    setShowStepModal(false);
    setEditingStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(prev => {
      const filtered = prev.filter(step => step.id !== stepId);
      return filtered.map((step, index) => ({ ...step, order: index }));
    });
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex(step => step.id === stepId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    const newSteps = [...steps];
    [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
    
    // Update order
    const reorderedSteps = newSteps.map((step, index) => ({ ...step, order: index }));
    setSteps(reorderedSteps);
  };

  const handleDragStart = (index: number) => {
    setDraggedStepIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedStepIndex === null || draggedStepIndex === dropIndex) return;
    
    const newSteps = [...steps];
    const draggedStep = newSteps[draggedStepIndex];
    
    newSteps.splice(draggedStepIndex, 1);
    newSteps.splice(dropIndex, 0, draggedStep);
    
    // Update order
    const reorderedSteps = newSteps.map((step, index) => ({ ...step, order: index }));
    setSteps(reorderedSteps);
    setDraggedStepIndex(null);
  };

  const handleSaveTask = () => {
    if (!taskName.trim()) {
      toast.error('Task name is required');
      return;
    }

    if (steps.length === 0) {
      toast.error('At least one step is required');
      return;
    }

    const taskData: RPATask = {
      id: task?.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: taskName.trim(),
      description: taskDescription.trim(),
      category: taskCategory,
      icon: taskIcon,
      createdAt: task?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: task?.isActive ?? true,
      executionCount: task?.executionCount || 0,
      lastExecuted: task?.lastExecuted,
      steps: steps,
      settings: settings,
      assignedProfiles: task?.assignedProfiles || []
    };

    if (task) {
      enhancedRPAService.updateTask(task.id, taskData);
      toast.success('Task updated successfully');
    } else {
      enhancedRPAService.createTask(taskData);
      toast.success('Task created successfully');
    }

    onSave(taskData);
  };

  const generateCodePreview = () => {
    let code = `// Generated RPA Task: ${taskName}\n`;
    code += `// Description: ${taskDescription}\n\n`;
    
    steps.filter(step => step.enabled).forEach((step, index) => {
      code += `// Step ${index + 1}: ${step.name}\n`;
      
      switch (step.type) {
        case 'navigate':
          code += `await page.goto('${step.config.url}');\n`;
          if (step.config.waitForLoad) {
            code += `await page.waitForTimeout(2000);\n`;
          }
          break;
        case 'click':
          code += `await page.click('${step.config.selector}');\n`;
          break;
        case 'input':
          if (step.config.clearFirst) {
            code += `await page.fill('${step.config.selector}', '');\n`;
          }
          code += `await page.type('${step.config.selector}', '${step.config.inputText}', { delay: ${step.config.typingSpeed || 50} });\n`;
          break;
        case 'wait':
          if (step.config.waitType === 'time') {
            code += `await page.waitForTimeout(${step.config.waitTime});\n`;
          } else if (step.config.waitType === 'element') {
            code += `await page.waitForSelector('${step.config.waitElement}');\n`;
          }
          break;
        case 'scroll':
          if (step.config.scrollType === 'pixels') {
            code += `await page.evaluate(() => window.scrollBy(0, ${step.config.scrollAmount || 300}));\n`;
          }
          break;
        case 'extract':
          code += `const ${step.config.extractVariable} = await page.$eval('${step.config.extractSelector}', el => `;
          if (step.config.extractType === 'text') {
            code += `el.textContent);\n`;
          } else if (step.config.extractType === 'attribute') {
            code += `el.getAttribute('${step.config.extractAttribute}'));\n`;
          }
          code += `console.log('Extracted ${step.config.extractVariable}:', ${step.config.extractVariable});\n`;
          break;
      }
      
      if (settings.humanBehavior && settings.randomDelay) {
        code += `await page.waitForTimeout(Math.random() * ${settings.delayMax - settings.delayMin} + ${settings.delayMin});\n`;
      }
      
      code += '\n';
    });
    
    code += `console.log('Task "${taskName}" completed successfully!');`;
    return code;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <p className="text-gray-600">Build your automation workflow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCodePreview(true)}>
            <Code className="w-4 h-4 mr-2" />
            Preview Code
          </Button>
          <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleSaveTask} className="bg-green-500 hover:bg-green-600">
            <Save className="w-4 h-4 mr-2" />
            Save Task
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Templates */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Step Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stepTemplates.map(template => (
              <Button
                key={template.id}
                variant="outline"
                className="w-full justify-start h-auto p-3"
                onClick={() => handleAddStep(template)}
              >
                <div className={`w-8 h-8 rounded ${template.color} flex items-center justify-center text-white mr-3`}>
                  <span className="text-lg">{template.icon}</span>
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Main Builder */}
        <div className="lg:col-span-3 space-y-6">
          {/* Task Info */}
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Task Name</Label>
                  <Input
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="Enter task name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={taskCategory} onValueChange={(value) => setTaskCategory(value as 'automation' | 'social' | 'ecommerce' | 'data' | 'search' | 'interaction')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe what this task does"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Workflow Steps ({steps.filter(s => s.enabled).length} enabled)</span>
                <Badge variant="outline">{steps.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No steps added yet</p>
                  <p className="text-sm">Add steps from the templates on the left</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`border rounded-lg p-4 ${
                        step.enabled 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      } cursor-move`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{step.name}</div>
                            <div className="text-sm text-gray-600">{step.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={step.enabled}
                            onCheckedChange={(enabled) => {
                              setSteps(prev => 
                                prev.map(s => s.id === step.id ? { ...s, enabled } : s)
                              );
                            }}
                          />
                          <Button size="sm" variant="outline" onClick={() => handleMoveStep(step.id, 'up')} disabled={index === 0}>
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleMoveStep(step.id, 'down')} disabled={index === steps.length - 1}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditStep(step)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteStep(step.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step Configuration Modal */}
      {showStepModal && editingStep && (
        <Dialog open={showStepModal} onOpenChange={setShowStepModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure Step: {editingStep.name}</DialogTitle>
              <DialogDescription>
                Set up the parameters for this automation step
              </DialogDescription>
            </DialogHeader>
            <StepConfigForm 
              step={editingStep}
              onSave={handleSaveStep}
              onCancel={() => setShowStepModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Task Settings</DialogTitle>
              <DialogDescription>
                Configure execution settings for this task
              </DialogDescription>
            </DialogHeader>
            <TaskSettingsForm 
              settings={settings}
              onSave={(newSettings) => {
                setSettings(newSettings);
                setShowSettingsModal(false);
              }}
              onCancel={() => setShowSettingsModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Code Preview Modal */}
      {showCodePreview && (
        <Dialog open={showCodePreview} onOpenChange={setShowCodePreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Generated Code Preview</DialogTitle>
            </DialogHeader>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              <pre>{generateCodePreview()}</pre>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Step Configuration Form Component
interface StepConfigFormProps {
  step: RPAStep;
  onSave: (step: RPAStep) => void;
  onCancel: () => void;
}

function StepConfigForm({ step, onSave, onCancel }: StepConfigFormProps) {
  const [config, setConfig] = useState(step.config);
  const [name, setName] = useState(step.name);
  const [description, setDescription] = useState(step.description);

  const handleSave = () => {
    onSave({
      ...step,
      name,
      description,
      config
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Step Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter step name"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter step description"
          />
        </div>
      </div>

      {/* Step-specific configuration based on type */}
      {step.type === 'navigate' && (
        <div>
          <Label>URL</Label>
          <Input
            value={config.url || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://example.com"
          />
        </div>
      )}

      {step.type === 'click' && (
        <div className="space-y-4">
          <div>
            <Label>Element Selector</Label>
            <Input
              value={config.selector || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, selector: e.target.value }))}
              placeholder=".button, #submit, [data-testid='button']"
            />
          </div>
          <div>
            <Label>Selector Type</Label>
            <Select 
              value={config.selectorType || 'css'} 
              onValueChange={(value) => setConfig(prev => ({ ...prev, selectorType: value as 'css' | 'xpath' | 'text' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="css">CSS Selector</SelectItem>
                <SelectItem value="xpath">XPath</SelectItem>
                <SelectItem value="text">Text Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step.type === 'input' && (
        <div className="space-y-4">
          <div>
            <Label>Input Selector</Label>
            <Input
              value={config.selector || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, selector: e.target.value }))}
              placeholder="input[name='username'], #email"
            />
          </div>
          <div>
            <Label>Text to Input</Label>
            <Input
              value={config.inputText || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, inputText: e.target.value }))}
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
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600">
          Save Step
        </Button>
      </div>
    </div>
  );
}

// Task Settings Form Component
interface TaskSettingsFormProps {
  settings: RPATaskSettings;
  onSave: (settings: RPATaskSettings) => void;
  onCancel: () => void;
}

function TaskSettingsForm({ settings, onSave, onCancel }: TaskSettingsFormProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Execute Steps Sequentially</Label>
            <p className="text-sm text-gray-500">Run steps one after another</p>
          </div>
          <Switch 
            checked={localSettings.executeSequentially}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, executeSequentially: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Continue on Error</Label>
            <p className="text-sm text-gray-500">Keep running if a step fails</p>
          </div>
          <Switch 
            checked={localSettings.continueOnError}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, continueOnError: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Human Behavior</Label>
            <p className="text-sm text-gray-500">Add realistic delays and variations</p>
          </div>
          <Switch 
            checked={localSettings.humanBehavior}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, humanBehavior: checked }))
            }
          />
        </div>

        <div>
          <Label>Max Retries</Label>
          <Slider
            value={[localSettings.maxRetries]}
            onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, maxRetries: value }))}
            max={10}
            min={0}
            step={1}
          />
          <p className="text-sm text-gray-500">{localSettings.maxRetries} retries</p>
        </div>

        <div>
          <Label>Timeout (seconds)</Label>
          <Slider
            value={[localSettings.timeout / 1000]}
            onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, timeout: value * 1000 }))}
            max={300}
            min={10}
            step={5}
          />
          <p className="text-sm text-gray-500">{localSettings.timeout / 1000} seconds</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
          Save Settings
        </Button>
      </div>
    </div>
  );
}