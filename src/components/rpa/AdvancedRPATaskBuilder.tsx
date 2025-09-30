import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Save, Play, Trash2, Copy, Settings, Target, GripVertical,
  AlertTriangle, CheckCircle, Clock, Mouse, Keyboard, Monitor, Code, FileText, Bot
} from 'lucide-react';
// Remove react-beautiful-dnd import for now - will implement simple drag/drop later
import { toast } from 'sonner';
import { RPAStep, RPAStepType, RPATask, RPATaskSettings } from '@/types/rpa';
import { Profile } from '@/components/profiles/CreateProfileModal';

interface AdvancedRPATaskBuilderProps {
  profiles: Profile[];
  onSave: (task: Omit<RPATask, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>) => void;
  onTest: (task: RPATask, profileId: string) => void;
  existingTask?: RPATask;
  onClose: () => void;
}

const STEP_TYPES = [
  { type: 'navigate' as RPAStepType, name: 'Navigate to URL', icon: <Monitor className="w-4 h-4" />, category: 'Navigation', color: 'bg-blue-500' },
  { type: 'click' as RPAStepType, name: 'Click Element', icon: <Mouse className="w-4 h-4" />, category: 'Interaction', color: 'bg-green-500' },
  { type: 'input' as RPAStepType, name: 'Input Text', icon: <Keyboard className="w-4 h-4" />, category: 'Interaction', color: 'bg-purple-500' },
  { type: 'wait' as RPAStepType, name: 'Wait/Delay', icon: <Clock className="w-4 h-4" />, category: 'Control', color: 'bg-yellow-500' },
  { type: 'scroll' as RPAStepType, name: 'Scroll Page', icon: <Monitor className="w-4 h-4" />, category: 'Navigation', color: 'bg-indigo-500' },
  { type: 'extract' as RPAStepType, name: 'Extract Data', icon: <FileText className="w-4 h-4" />, category: 'Data', color: 'bg-orange-500' },
  { type: 'screenshot' as RPAStepType, name: 'Take Screenshot', icon: <Monitor className="w-4 h-4" />, category: 'Data', color: 'bg-pink-500' },
  { type: 'hover' as RPAStepType, name: 'Hover Element', icon: <Mouse className="w-4 h-4" />, category: 'Interaction', color: 'bg-teal-500' },
  { type: 'dropdown' as RPAStepType, name: 'Select Dropdown', icon: <Target className="w-4 h-4" />, category: 'Interaction', color: 'bg-cyan-500' },
  { type: 'focus' as RPAStepType, name: 'Focus Element', icon: <Target className="w-4 h-4" />, category: 'Interaction', color: 'bg-emerald-500' },
  { type: 'new_tab' as RPAStepType, name: 'New Tab', icon: <Plus className="w-4 h-4" />, category: 'Navigation', color: 'bg-violet-500' },
  { type: 'close_tab' as RPAStepType, name: 'Close Tab', icon: <Trash2 className="w-4 h-4" />, category: 'Navigation', color: 'bg-red-500' },
  { type: 'switch_tab' as RPAStepType, name: 'Switch Tab', icon: <Monitor className="w-4 h-4" />, category: 'Navigation', color: 'bg-slate-500' },
  { type: 'refresh' as RPAStepType, name: 'Refresh Page', icon: <Monitor className="w-4 h-4" />, category: 'Navigation', color: 'bg-amber-500' },
  { type: 'go_back' as RPAStepType, name: 'Go Back', icon: <Monitor className="w-4 h-4" />, category: 'Navigation', color: 'bg-lime-500' },
  { type: 'execute_js' as RPAStepType, name: 'Execute JavaScript', icon: <Code className="w-4 h-4" />, category: 'Advanced', color: 'bg-gray-500' }
];

export default function AdvancedRPATaskBuilder({ profiles, onSave, onTest, existingTask, onClose }: AdvancedRPATaskBuilderProps) {
  const [taskName, setTaskName] = useState(existingTask?.name || '');
  const [taskDescription, setTaskDescription] = useState(existingTask?.description || '');
  const [steps, setSteps] = useState<RPAStep[]>(existingTask?.steps || []);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [showStepTypes, setShowStepTypes] = useState(false);
  
  const [settings, setSettings] = useState<RPATaskSettings>(existingTask?.settings || {
    executeSequentially: true,
    continueOnError: false,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 60000,
    humanBehavior: true,
    randomDelay: true,
    delayMin: 500,
    delayMax: 2000,
    screenshotOnError: true,
    logLevel: 'detailed',
    runMode: 'single',
    timeoutPerProfile: 300000,
    concurrencyLimit: 5,
    closeOnFinish: true,
    saveScreenshots: false,
    parameterization: { useVariables: false, customVariables: {} }
  });

  const addStep = (stepType: RPAStepType) => {
    const stepTypeInfo = STEP_TYPES.find(st => st.type === stepType);
    const newStep: RPAStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: stepType,
      name: stepTypeInfo?.name || stepType,
      description: '',
      enabled: true,
      order: steps.length,
      config: getDefaultConfig(stepType)
    };
    setSteps([...steps, newStep]);
    setSelectedStep(steps.length);
    setShowStepTypes(false);
  };

  const getDefaultConfig = (stepType: RPAStepType) => {
    switch (stepType) {
      case 'navigate': return { url: '', waitForLoad: true, timeout: 30000 };
      case 'click': return { selector: '', waitForElement: true, timeout: 5000, retries: 3, clickType: 'left' };
      case 'input': return { selector: '', text: '', clearFirst: true, typingSpeed: 100, humanBehavior: true };
      case 'wait': return { duration: 2000, condition: 'time' };
      case 'scroll': return { direction: 'down', amount: 500, smooth: true };
      case 'extract': return { selector: '', variable: 'extractedData', multiple: false };
      case 'screenshot': return { filename: 'screenshot.png', fullPage: false, quality: 90 };
      case 'hover': return { selector: '', waitForElement: true, timeout: 5000, duration: 1000 };
      case 'dropdown': return { selector: '', value: '', waitForElement: true };
      case 'focus': return { selector: '', waitForElement: true, timeout: 5000 };
      case 'new_tab': return { url: '', switchToNew: true };
      case 'close_tab': return { tabIndex: 0, closeAll: false };
      case 'switch_tab': return { tabIndex: 0, relative: 'absolute' };
      case 'refresh': return { waitForLoad: true, timeout: 30000 };
      case 'go_back': return { waitForLoad: true, timeout: 30000 };
      case 'execute_js': return { code: 'return document.title;', variable: 'jsResult', async: false };
      default: return {};
    }
  };

  const updateStep = (stepId: string, updates: Partial<RPAStep>) => {
    setSteps(steps.map(step => step.id === stepId ? { ...step, ...updates } : step));
  };

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
    setSelectedStep(null);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const reorderedSteps = Array.from(steps);
    const [removed] = reorderedSteps.splice(result.source.index, 1);
    reorderedSteps.splice(result.destination.index, 0, removed);
    setSteps(reorderedSteps.map((step, index) => ({ ...step, order: index })));
  };

  const handleSave = () => {
    if (!taskName.trim()) {
      toast.error('Task name is required');
      return;
    }
    if (steps.length === 0) {
      toast.error('At least one step is required');
      return;
    }

    const task = {
      name: taskName,
      description: taskDescription,
      category: 'automation' as const,
      icon: '🤖',
      steps,
      settings,
      assignedProfiles: [], // Profiles will be selected from dashboard
      isActive: true
    };
    onSave(task);
    toast.success('Task saved successfully');
  };

  const StepConfigPanel = ({ step }: { step: RPAStep }) => (
    <div className="space-y-6 bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-green-700 font-medium flex items-center gap-2">
            🏷️ Step Name
          </Label>
          <Input 
            value={step.name} 
            onChange={(e) => updateStep(step.id, { name: e.target.value })} 
            className="border-green-300 focus:border-green-500 focus:ring-green-200 bg-white"
            placeholder="Enter step name"
          />
        </div>
        <div>
          <Label className="text-green-700 font-medium flex items-center gap-2">
            ⚡ Step Type
          </Label>
          <div className="px-3 py-2 bg-green-100 rounded-lg border border-green-300">
            <span className="text-green-800 font-medium">{step.type.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      {/* Navigate Step */}
      {step.type === 'navigate' && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <Label className="text-blue-700 font-medium flex items-center gap-2 mb-2">
              🌐 Website URL *
            </Label>
            <Input 
              value={step.config.url || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, url: e.target.value } })}
              placeholder="https://example.com"
              className="border-blue-300 focus:border-blue-500 focus:ring-blue-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.waitForLoad || true} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, waitForLoad: checked } })}
              />
              <Label className="text-blue-700">Wait for Load</Label>
            </div>
            <div>
              <Label className="text-blue-700 text-sm">Timeout (ms)</Label>
              <Input 
                type="number"
                value={step.config.timeout || 30000} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, timeout: parseInt(e.target.value) || 30000 } })}
                className="border-blue-300 focus:border-blue-500 focus:ring-blue-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Click Step */}
      {step.type === 'click' && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <Label className="text-green-700 font-medium flex items-center gap-2 mb-2">
              🎯 Element Selector *
            </Label>
            <Input 
              value={step.config.selector || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
              placeholder="#button, .class, [data-testid='btn']"
              className="border-green-300 focus:border-green-500 focus:ring-green-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-green-700 text-sm">Click Type</Label>
              <Select value={step.config.clickType || 'left'} onValueChange={(value) => updateStep(step.id, { config: { ...step.config, clickType: value } })}>
                <SelectTrigger className="border-green-300 focus:border-green-500 focus:ring-green-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left Click</SelectItem>
                  <SelectItem value="right">Right Click</SelectItem>
                  <SelectItem value="double">Double Click</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-green-700 text-sm">Retries</Label>
              <Input 
                type="number"
                value={step.config.retries || 3} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, retries: parseInt(e.target.value) || 3 } })}
                className="border-green-300 focus:border-green-500 focus:ring-green-200 bg-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={step.config.waitForElement || true} 
              onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, waitForElement: checked } })}
            />
            <Label className="text-green-700">Wait for Element</Label>
          </div>
        </div>
      )}

      {/* Input Step */}
      {step.type === 'input' && (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <Label className="text-purple-700 font-medium flex items-center gap-2 mb-2">
              🎯 Element Selector *
            </Label>
            <Input 
              value={step.config.selector || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
              placeholder="input[name='email']"
              className="border-purple-300 focus:border-purple-500 focus:ring-purple-200 bg-white"
            />
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <Label className="text-orange-700 font-medium flex items-center gap-2 mb-2">
              ⌨️ Text to Input *
            </Label>
            <Textarea 
              value={step.config.text || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, text: e.target.value } })}
              placeholder="Enter text here (use {PROFILE_EMAIL}, {PROFILE_NAME} for variables)"
              rows={3}
              className="border-orange-300 focus:border-orange-500 focus:ring-orange-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-purple-700 text-sm">Typing Speed (ms)</Label>
              <Input 
                type="number"
                value={step.config.typingSpeed || 100} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, typingSpeed: parseInt(e.target.value) || 100 } })}
                className="border-purple-300 focus:border-purple-500 focus:ring-purple-200 bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.clearFirst || true} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, clearFirst: checked } })}
              />
              <Label className="text-purple-700">Clear First</Label>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={step.config.humanBehavior || true} 
              onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, humanBehavior: checked } })}
            />
            <Label className="text-purple-700">Human-like Typing</Label>
          </div>
        </div>
      )}

      {/* Wait Step */}
      {step.type === 'wait' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <Label className="text-yellow-700 font-medium flex items-center gap-2 mb-2">
              ⏱️ Duration (milliseconds) *
            </Label>
            <Input 
              type="number"
              value={step.config.duration || 2000} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, duration: parseInt(e.target.value) || 2000 } })}
              className="border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200 bg-white"
              min="100"
              max="60000"
            />
          </div>
          <div>
            <Label className="text-yellow-700 text-sm">Wait Condition</Label>
            <Select value={step.config.condition || 'time'} onValueChange={(value) => updateStep(step.id, { config: { ...step.config, condition: value } })}>
              <SelectTrigger className="border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Fixed Time</SelectItem>
                <SelectItem value="element">Element Appears</SelectItem>
                <SelectItem value="text">Text Appears</SelectItem>
                <SelectItem value="network">Network Idle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(step.config.condition === 'element' || step.config.condition === 'text') && (
            <div>
              <Label className="text-yellow-700 text-sm">CSS Selector</Label>
              <Input 
                value={step.config.selector || ''} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
                placeholder=".loading, #spinner"
                className="border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200 bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Execute JS Step */}
      {step.type === 'execute_js' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <Label className="text-gray-700 font-medium flex items-center gap-2 mb-2">
              💻 JavaScript Code *
            </Label>
            <Textarea 
              value={step.config.code || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, code: e.target.value } })}
              placeholder="return document.title;"
              className="font-mono border-gray-300 focus:border-gray-500 focus:ring-gray-200 bg-white text-sm"
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700 text-sm">Store Result in Variable</Label>
              <Input 
                value={step.config.variable || 'jsResult'} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, variable: e.target.value } })}
                placeholder="jsResult"
                className="border-gray-300 focus:border-gray-500 focus:ring-gray-200 bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.async || false} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, async: checked } })}
              />
              <Label className="text-gray-700">Async Execution</Label>
            </div>
          </div>
        </div>
      )}

      {/* Scroll Step */}
      {step.type === 'scroll' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <Label className="text-indigo-700 font-medium flex items-center gap-2 mb-2">
              📜 Scroll Direction *
            </Label>
            <Select value={step.config.direction || 'down'} onValueChange={(value) => updateStep(step.id, { config: { ...step.config, direction: value } })}>
              <SelectTrigger className="border-indigo-300 focus:border-indigo-500 focus:ring-indigo-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="down">Scroll Down</SelectItem>
                <SelectItem value="up">Scroll Up</SelectItem>
                <SelectItem value="to-top">To Top</SelectItem>
                <SelectItem value="to-bottom">To Bottom</SelectItem>
                <SelectItem value="to-element">To Element</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-indigo-700 text-sm">Amount (px)</Label>
              <Input 
                type="number"
                value={step.config.amount || 500} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, amount: parseInt(e.target.value) || 500 } })}
                className="border-indigo-300 focus:border-indigo-500 focus:ring-indigo-200 bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.smooth || true} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, smooth: checked } })}
              />
              <Label className="text-indigo-700">Smooth Scroll</Label>
            </div>
          </div>
          {step.config.direction === 'to-element' && (
            <div>
              <Label className="text-indigo-700 text-sm">Element Selector</Label>
              <Input 
                value={step.config.selector || ''} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
                placeholder="#footer, .widget"
                className="border-indigo-300 focus:border-indigo-500 focus:ring-indigo-200 bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Screenshot Step */}
      {step.type === 'screenshot' && (
        <div className="space-y-4">
          <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
            <Label className="text-pink-700 font-medium flex items-center gap-2 mb-2">
              📸 Filename *
            </Label>
            <Input 
              value={step.config.filename || 'screenshot.png'} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, filename: e.target.value } })}
              placeholder="screenshot.png"
              className="border-pink-300 focus:border-pink-500 focus:ring-pink-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-pink-700 text-sm">Quality (0-100)</Label>
              <Input 
                type="number"
                value={step.config.quality || 90} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, quality: parseInt(e.target.value) || 90 } })}
                className="border-pink-300 focus:border-pink-500 focus:ring-pink-200 bg-white"
                min="1"
                max="100"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.fullPage || false} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, fullPage: checked } })}
              />
              <Label className="text-pink-700">Full Page</Label>
            </div>
          </div>
          <div>
            <Label className="text-pink-700 text-sm">Element Selector (optional)</Label>
            <Input 
              value={step.config.selector || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
              placeholder=".widget, #content"
              className="border-pink-300 focus:border-pink-500 focus:ring-pink-200 bg-white"
            />
          </div>
        </div>
      )}

      {/* Extract Step */}
      {step.type === 'extract' && (
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <Label className="text-orange-700 font-medium flex items-center gap-2 mb-2">
              🎯 Element Selector *
            </Label>
            <Input 
              value={step.config.selector || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
              placeholder=".price, h1, [data-value]"
              className="border-orange-300 focus:border-orange-500 focus:ring-orange-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-orange-700 text-sm">Store in Variable *</Label>
              <Input 
                value={step.config.variable || 'extractedData'} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, variable: e.target.value } })}
                placeholder="extractedText"
                className="border-orange-300 focus:border-orange-500 focus:ring-orange-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-orange-700 text-sm">Attribute (optional)</Label>
              <Input 
                value={step.config.attribute || ''} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, attribute: e.target.value } })}
                placeholder="href, data-value, src"
                className="border-orange-300 focus:border-orange-500 focus:ring-orange-200 bg-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={step.config.multiple || false} 
              onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, multiple: checked } })}
            />
            <Label className="text-orange-700">Extract Multiple Elements</Label>
          </div>
        </div>
      )}

      {/* Hover Step */}
      {step.type === 'hover' && (
        <div className="space-y-4">
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <Label className="text-teal-700 font-medium flex items-center gap-2 mb-2">
              🎯 Element Selector *
            </Label>
            <Input 
              value={step.config.selector || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
              placeholder=".menu-item, [data-hover]"
              className="border-teal-300 focus:border-teal-500 focus:ring-teal-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-teal-700 text-sm">Hover Duration (ms)</Label>
              <Input 
                type="number"
                value={step.config.duration || 1000} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, duration: parseInt(e.target.value) || 1000 } })}
                className="border-teal-300 focus:border-teal-500 focus:ring-teal-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-teal-700 text-sm">Timeout (ms)</Label>
              <Input 
                type="number"
                value={step.config.timeout || 5000} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, timeout: parseInt(e.target.value) || 5000 } })}
                className="border-teal-300 focus:border-teal-500 focus:ring-teal-200 bg-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={step.config.waitForElement || true} 
              onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, waitForElement: checked } })}
            />
            <Label className="text-teal-700">Wait for Element</Label>
          </div>
        </div>
      )}

      {/* Dropdown Step */}
      {step.type === 'dropdown' && (
        <div className="space-y-4">
          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
            <Label className="text-cyan-700 font-medium flex items-center gap-2 mb-2">
              🎯 Select Element *
            </Label>
            <Input 
              value={step.config.selector || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
              placeholder="select[name='country']"
              className="border-cyan-300 focus:border-cyan-500 focus:ring-cyan-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-cyan-700 text-sm">Option Value *</Label>
              <Input 
                value={step.config.value || ''} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, value: e.target.value } })}
                placeholder="us"
                className="border-cyan-300 focus:border-cyan-500 focus:ring-cyan-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-cyan-700 text-sm">Option Text (alternative)</Label>
              <Input 
                value={step.config.text || ''} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, text: e.target.value } })}
                placeholder="United States"
                className="border-cyan-300 focus:border-cyan-500 focus:ring-cyan-200 bg-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={step.config.waitForElement || true} 
              onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, waitForElement: checked } })}
            />
            <Label className="text-cyan-700">Wait for Element</Label>
          </div>
        </div>
      )}

      {/* Focus Step */}
      {step.type === 'focus' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <Label className="text-emerald-700 font-medium flex items-center gap-2 mb-2">
              🎯 Element Selector *
            </Label>
            <Input 
              value={step.config.selector || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, selector: e.target.value } })}
              placeholder="input[name='email']"
              className="border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-emerald-700 text-sm">Timeout (ms)</Label>
              <Input 
                type="number"
                value={step.config.timeout || 5000} 
                onChange={(e) => updateStep(step.id, { config: { ...step.config, timeout: parseInt(e.target.value) || 5000 } })}
                className="border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200 bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.waitForElement || true} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, waitForElement: checked } })}
              />
              <Label className="text-emerald-700">Wait for Element</Label>
            </div>
          </div>
        </div>
      )}

      {/* New Tab Step */}
      {step.type === 'new_tab' && (
        <div className="space-y-4">
          <div className="bg-violet-50 p-4 rounded-lg border border-violet-200">
            <Label className="text-violet-700 font-medium flex items-center gap-2 mb-2">
              🌐 URL (optional)
            </Label>
            <Input 
              value={step.config.url || ''} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, url: e.target.value } })}
              placeholder="https://example.com"
              className="border-violet-300 focus:border-violet-500 focus:ring-violet-200 bg-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={step.config.switchToNew || true} 
              onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, switchToNew: checked } })}
            />
            <Label className="text-violet-700">Switch to New Tab</Label>
          </div>
        </div>
      )}

      {/* Close Tab Step */}
      {step.type === 'close_tab' && (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <Label className="text-red-700 font-medium flex items-center gap-2 mb-2">
              📑 Tab Index (optional)
            </Label>
            <Input 
              type="number"
              value={step.config.tabIndex || 0} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, tabIndex: parseInt(e.target.value) || 0 } })}
              className="border-red-300 focus:border-red-500 focus:ring-red-200 bg-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={step.config.closeAll || false} 
              onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, closeAll: checked } })}
            />
            <Label className="text-red-700">Close All Tabs</Label>
          </div>
        </div>
      )}

      {/* Switch Tab Step */}
      {step.type === 'switch_tab' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <Label className="text-slate-700 font-medium flex items-center gap-2 mb-2">
              📑 Tab Index *
            </Label>
            <Input 
              type="number"
              value={step.config.tabIndex || 0} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, tabIndex: parseInt(e.target.value) || 0 } })}
              className="border-slate-300 focus:border-slate-500 focus:ring-slate-200 bg-white"
            />
          </div>
          <div>
            <Label className="text-slate-700 text-sm">Relative Switch</Label>
            <Select value={step.config.relative || 'absolute'} onValueChange={(value) => updateStep(step.id, { config: { ...step.config, relative: value } })}>
              <SelectTrigger className="border-slate-300 focus:border-slate-500 focus:ring-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="absolute">Absolute Index</SelectItem>
                <SelectItem value="next">Next Tab</SelectItem>
                <SelectItem value="previous">Previous Tab</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Refresh Step */}
      {step.type === 'refresh' && (
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.waitForLoad || true} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, waitForLoad: checked } })}
              />
              <Label className="text-amber-700">Wait for Load</Label>
            </div>
          </div>
          <div>
            <Label className="text-amber-700 text-sm">Timeout (ms)</Label>
            <Input 
              type="number"
              value={step.config.timeout || 30000} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, timeout: parseInt(e.target.value) || 30000 } })}
              className="border-amber-300 focus:border-amber-500 focus:ring-amber-200 bg-white"
            />
          </div>
        </div>
      )}

      {/* Go Back Step */}
      {step.type === 'go_back' && (
        <div className="space-y-4">
          <div className="bg-lime-50 p-4 rounded-lg border border-lime-200">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={step.config.waitForLoad || true} 
                onCheckedChange={(checked) => updateStep(step.id, { config: { ...step.config, waitForLoad: checked } })}
              />
              <Label className="text-lime-700">Wait for Load</Label>
            </div>
          </div>
          <div>
            <Label className="text-lime-700 text-sm">Timeout (ms)</Label>
            <Input 
              type="number"
              value={step.config.timeout || 30000} 
              onChange={(e) => updateStep(step.id, { config: { ...step.config, timeout: parseInt(e.target.value) || 30000 } })}
              className="border-lime-300 focus:border-lime-500 focus:ring-lime-200 bg-white"
            />
          </div>
        </div>
      )}

      <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <Switch 
          checked={step.enabled} 
          onCheckedChange={(checked) => updateStep(step.id, { enabled: checked })}
          className="data-[state=checked]:bg-green-500"
        />
        <Label className="text-gray-700 font-medium flex items-center gap-2">
          ✅ Step Enabled
        </Label>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">🤖 RPA Task Builder</h2>
            <p className="text-purple-100">Create powerful automation workflows</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-white text-white hover:bg-white hover:text-purple-600">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!taskName || steps.length === 0} className="bg-white text-purple-600 hover:bg-gray-100">
              <Save className="w-4 h-4 mr-2" />
              Save Task
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel */}
        <div className="w-full lg:w-80 bg-gradient-to-b from-white to-purple-50 border-r border-purple-200 flex flex-col shadow-lg">
          <div className="p-4 border-b border-purple-200 bg-gradient-to-r from-purple-100 to-blue-100">
            <h3 className="font-bold text-purple-800 mb-4 flex items-center">
              ⚙️ Task Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-purple-700 font-medium">Task Name *</Label>
                <Input 
                  value={taskName} 
                  onChange={(e) => setTaskName(e.target.value)} 
                  placeholder="Enter task name"
                  className="border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                />
              </div>
              <div>
                <Label className="text-purple-700 font-medium">Description</Label>
                <Textarea 
                  value={taskDescription} 
                  onChange={(e) => setTaskDescription(e.target.value)} 
                  rows={3}
                  placeholder="Describe your automation task"
                  className="border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-purple-200">
            <Button 
              onClick={() => setShowStepTypes(!showStepTypes)} 
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-md" 
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              🎨 Add Step
            </Button>
            
            {showStepTypes && (
              <div className="space-y-2 max-h-60 overflow-y-auto mt-4">
                {STEP_TYPES.map((stepType) => (
                  <Button
                    key={stepType.type}
                    variant="ghost"
                    size="sm"
                    onClick={() => addStep(stepType.type)}
                    className="w-full justify-start hover:bg-purple-100 text-left p-3 rounded-lg border border-purple-200"
                  >
                    <div className="flex items-center">
                      {stepType.icon}
                      <span className="ml-2 font-medium text-purple-700">{stepType.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Steps */}
        <div className="w-full lg:w-80 xl:w-96 bg-gradient-to-b from-white to-blue-50 border-r border-blue-200 flex flex-col shadow-lg">
          <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-100 to-indigo-100">
            <h3 className="font-bold text-blue-800 flex items-center">
              🔧 Workflow Steps ({steps.length})
            </h3>
            <p className="text-sm text-blue-600 mt-1">{steps.filter(s => s.enabled).length} enabled steps</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`mb-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                    selectedStep === index 
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedStep(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                      <div className="flex items-center gap-2">
                        {STEP_TYPES.find(st => st.type === step.type)?.icon}
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{step.name}</div>
                          <div className="text-xs text-blue-600 font-medium">{step.type.replace('_', ' ').toUpperCase()}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Switch 
                        checked={step.enabled} 
                        onCheckedChange={(checked) => updateStep(step.id, { enabled: checked })}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <Button size="sm" variant="ghost" onClick={() => deleteStep(step.id)} className="text-red-500 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {steps.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No steps added yet</p>
                  <p className="text-sm">Click "Add Step" to start building your automation</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Step Configuration */}
        <div className="flex-1 bg-gradient-to-b from-white to-green-50 min-h-0">
          <div className="p-4 border-b border-green-200 bg-gradient-to-r from-green-100 to-teal-100">
            <h3 className="font-bold text-green-800 flex items-center">
              🗒️ Step Configuration
            </h3>
            <p className="text-sm text-green-600 mt-1">Configure the selected step</p>
          </div>
          <div className="p-4">
            {selectedStep !== null && steps[selectedStep] ? (
              <StepConfigPanel step={steps[selectedStep]} />
            ) : (
              <div className="text-center text-gray-500 py-12">
                <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select a step to configure</p>
                <p className="text-sm">Click on any step from the workflow to edit its settings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}