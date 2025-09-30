import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Square, 
  Bot, 
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Activity,
  BarChart3,
  TrendingUp,
  Search,
  Eye,
  MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { enhancedRPAService } from '@/services/enhancedRPAService';
import { automationExecutor } from '@/services/automationExecutor';
import { rpaExecutionEngine } from '@/services/RPAExecutionEngine';
import { browserRPAService } from '@/services/browserRPAService';
import AdvancedRPATaskBuilder from '@/components/rpa/AdvancedRPATaskBuilder';
import { RPATask, RPAExecution, RPADashboardStats, RPAJob } from '@/types/rpa';
import { Profile } from '@/components/profiles/CreateProfileModal';

interface RPADashboardProps {
  profiles: Profile[];
  onTaskExecute?: (taskId: string, profileIds: string[]) => void;
}

export default function RPADashboard({ profiles, onTaskExecute }: RPADashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<RPATask[]>([]);
  const [executions, setExecutions] = useState<RPAExecution[]>([]);
  const [stats, setStats] = useState<RPADashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeExecutions, setActiveExecutions] = useState<RPAExecution[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaskBuilder, setShowTaskBuilder] = useState(false);
  const [editingTask, setEditingTask] = useState<RPATask | undefined>(undefined);
  const [activeJobs, setActiveJobs] = useState<RPAJob[]>([]);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedTaskForExecution, setSelectedTaskForExecution] = useState<RPATask | null>(null);
  const [executionThreads, setExecutionThreads] = useState(10);
  const [executionDelay, setExecutionDelay] = useState(30);

  useEffect(() => {
    loadData();
    
    // Set up real-time monitoring
    const interval = setInterval(() => {
      const active = browserRPAService.getActiveExecutions();
      setActiveExecutions(active);
      
      // Get active jobs from execution engine
      const queueStatus = rpaExecutionEngine.getQueueStatus();
      setActiveJobs([...queueStatus.running, ...queueStatus.pending]);
      
      if (active.length > 0 || queueStatus.running.length > 0) {
        loadData();
      }
    }, 2000);
    
    // Set up execution engine event handlers
    rpaExecutionEngine.setEventHandlers({
      onJobUpdate: (job) => {
        setActiveJobs(prev => {
          const updated = prev.filter(j => j.id !== job.id);
          if (job.status === 'running' || job.status === 'queued') {
            updated.push(job);
          }
          return updated;
        });
      },
      onQueueUpdate: (queue) => {
        // Update UI with queue status
        console.log('Queue updated:', queue);
      }
    });
    
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setTasks(enhancedRPAService.getAllTasks());
    setExecutions(enhancedRPAService.getAllExecutions());
    setStats(enhancedRPAService.getDashboardStats());
  };

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowTaskBuilder(true);
  };

  const handleEditTask = (task: RPATask) => {
    setEditingTask(task);
    setShowTaskBuilder(true);
  };

  const handleSaveTask = (taskData: Omit<RPATask, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>) => {
    if (editingTask) {
      enhancedRPAService.updateTask(editingTask.id, taskData);
      toast.success('Task updated successfully');
    } else {
      enhancedRPAService.createTask(taskData);
      toast.success('Task created successfully');
    }
    setShowTaskBuilder(false);
    setEditingTask(undefined);
    loadData();
  };

  const handleTestTask = async (task: RPATask, profileId: string) => {
    try {
      setIsLoading(true);
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) throw new Error('Profile not found');
      
      toast.info(`Testing task "${task.name}" on profile "${profile.name}"...`);
      
      // Use the improved browser RPA service for testing
      const result = await browserRPAService.executeTaskOnProfile(task, profile, {
        timeout: 60000,
        retries: 1,
        delay: 1000,
        humanBehavior: true,
        randomDelay: true,
        delayMin: 500,
        delayMax: 1500,
        screenshotOnError: true,
        logLevel: 'detailed'
      });
      
      if (result.success) {
        toast.success(`Test completed successfully! Completed ${result.stepsCompleted} steps in ${Math.round(result.executionTime / 1000)}s`);
      } else {
        toast.error(`Test failed: ${result.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFromTemplate = (template: RPATask) => {
    const newTask = enhancedRPAService.createTask({
      name: template.name,
      description: template.description,
      category: template.category,
      icon: template.icon,
      steps: template.steps.map(step => ({
        ...step,
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })),
      settings: template.settings,
      assignedProfiles: [],
      isActive: true
    });
    
    loadData();
    toast.success(`Created task "${newTask.name}" from template`);
  };

  const handleBulkExecuteTemplate = async (template: RPATask) => {
    if (selectedProfiles.length === 0) {
      toast.error('Please select profiles for bulk execution');
      return;
    }

    const selectedProfileObjects = profiles.filter(p => selectedProfiles.includes(p.id));
    
    try {
      setIsLoading(true);
      toast.info(`Starting bulk execution of "${template.name}" on ${selectedProfiles.length} profiles...`);
      
      // Use the improved browser RPA service for bulk execution
      const results = await browserRPAService.executeBulkTasks(
        [template], 
        selectedProfileObjects, 
        {
          timeout: 120000,
          retries: 2,
          delay: 2000,
          humanBehavior: true,
          randomDelay: true,
          delayMin: 1000,
          delayMax: 3000,
          screenshotOnError: true,
          logLevel: 'detailed'
        }
      );
      
      const successCount = Array.from(results.values()).filter(r => r.success).length;
      const failureCount = results.size - successCount;
      
      loadData();
      
      if (failureCount === 0) {
        toast.success(`Bulk execution completed successfully! All ${successCount} profiles completed.`);
      } else {
        toast.warning(`Bulk execution completed with issues: ${successCount} successful, ${failureCount} failed.`);
      }
    } catch (error) {
      toast.error(`Bulk execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTask = async (task: RPATask) => {
    toast.info('To run this task, go to Profiles tab → Select profiles → Click "Run RPA" → Choose this task');
    return;
  };

  const handleExecuteWithThreads = async () => {
    if (!selectedTaskForExecution) return;
    
    const selectedProfileObjects = profiles.filter(p => selectedProfiles.includes(p.id));
    
    try {
      setIsLoading(true);
      toast.info(`Starting "${selectedTaskForExecution.name}" on ${selectedProfiles.length} profiles with ${executionThreads} threads...`);
      
      // Implement thread-based execution algorithm
      const chunks = [];
      for (let i = 0; i < selectedProfileObjects.length; i += executionThreads) {
        chunks.push(selectedProfileObjects.slice(i, i + executionThreads));
      }
      
      // Execute chunks sequentially with delay
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        toast.info(`Starting batch ${i + 1}/${chunks.length} with ${chunk.length} profiles...`);
        
        // Queue current chunk
        await rpaExecutionEngine.queueTask(selectedTaskForExecution.id, chunk);
        
        // Wait for delay before next chunk (except for last chunk)
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, executionDelay * 1000));
        }
      }
      
      // Update task execution count
      enhancedRPAService.updateTask(selectedTaskForExecution.id, {
        executionCount: selectedTaskForExecution.executionCount + selectedProfiles.length,
        lastExecuted: new Date().toISOString()
      });
      
      loadData();
      setShowExecutionModal(false);
      toast.success(`Task "${selectedTaskForExecution.name}" queued for ${selectedProfiles.length} profiles in ${chunks.length} batches`);
    } catch (error) {
      toast.error(`Failed to queue task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopJob = async (jobId: string) => {
    try {
      await rpaExecutionEngine.cancelJob(jobId);
      toast.success('Job cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel job');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    enhancedRPAService.deleteTask(taskId);
    loadData();
    toast.success('Task deleted successfully');
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = [
    { id: 'all', name: 'All Categories', icon: '📂' },
    { id: 'automation', name: 'General Automation', icon: '🤖' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
    { id: 'data', name: 'Data Collection', icon: '📊' },
    { id: 'search', name: 'Search & Browse', icon: '🔍' }
  ];

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-xl shadow-lg">
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            🤖 RPA Dashboard
          </h1>
          <p className="text-purple-100 mt-1 text-sm">Manage automation tasks and monitor executions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="border-purple-300 hover:bg-purple-50">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateTask} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            <Bot className="w-4 h-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="executions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            <Activity className="w-4 h-4 mr-2" />
            Executions
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Tasks</p>
                      <p className="text-3xl font-bold text-blue-800">{stats.totalTasks}</p>
                      <p className="text-sm text-blue-600">{stats.activeTasks} active</p>
                    </div>
                    <div className="bg-blue-500 p-3 rounded-full">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Total Executions</p>
                      <p className="text-3xl font-bold text-green-800">{stats.totalExecutions}</p>
                      <p className="text-sm text-green-600">{stats.successfulExecutions} successful</p>
                    </div>
                    <div className="bg-green-500 p-3 rounded-full">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Success Rate</p>
                      <p className="text-3xl font-bold text-purple-800">
                        {stats.totalExecutions > 0 ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100) : 0}%
                      </p>
                      <p className="text-sm text-purple-600">{stats.failedExecutions} failed</p>
                    </div>
                    <div className="bg-purple-500 p-3 rounded-full">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Active Executions</p>
                      <p className="text-3xl font-bold text-orange-800">{activeExecutions.length}</p>
                      <p className="text-sm text-orange-600">{executions.filter(e => e.status === 'running').length} running</p>
                    </div>
                    <div className="bg-orange-500 p-3 rounded-full">
                      <Activity className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-50 to-cyan-100 border-teal-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-teal-700">Active Profiles</p>
                      <p className="text-3xl font-bold text-teal-800">{profiles.filter(p => p.isActive).length}</p>
                      <p className="text-sm text-teal-600">{profiles.length} total</p>
                    </div>
                    <div className="bg-teal-500 p-3 rounded-full">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Start Guide */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-green-700">🎓 How to Create Bulk Automation</CardTitle>
              <p className="text-sm text-green-600">Follow these simple steps to automate tasks across multiple profiles</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-green-100">
                  <div className="text-2xl mb-2">👥</div>
                  <h4 className="font-medium text-sm mb-2">1. Go to Profiles Tab</h4>
                  <p className="text-xs text-gray-600">Select profiles you want to automate from the Profiles section</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-100">
                  <div className="text-2xl mb-2">🚀</div>
                  <h4 className="font-medium text-sm mb-2">2. Click Run RPA</h4>
                  <p className="text-xs text-gray-600">Click the Run RPA button in Profiles tab to choose scripts</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-100">
                  <div className="text-2xl mb-2">▶️</div>
                  <h4 className="font-medium text-sm mb-2">3. Select Script & Run</h4>
                  <p className="text-xs text-gray-600">Choose automation script and execute on selected profiles</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-100">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-medium text-sm mb-2">4. Monitor</h4>
                  <p className="text-xs text-gray-600">Watch real-time progress and view execution logs here</p>
                </div>
              </div>
              
              {/* Practical Examples */}
              <div className="mt-6 p-4 bg-white rounded-lg border border-green-100">
                <h4 className="font-medium text-sm mb-3 text-green-700">💡 What You Can Automate:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <p className="mb-2">• <strong>Social Media Login:</strong> Bulk login to Facebook, Instagram, Twitter across profiles</p>
                    <p className="mb-2">• <strong>E-commerce Research:</strong> Search products on Amazon, eBay simultaneously</p>
                  </div>
                  <div>
                    <p className="mb-2">• <strong>Form Automation:</strong> Fill contact forms, surveys, registrations in bulk</p>
                    <p className="mb-2">• <strong>Data Collection:</strong> Scrape prices, reviews, content from websites</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Filters */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 bg-gray-50 border-gray-200">
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
            </CardContent>
          </Card>

          {/* Real-time Execution Monitor */}
          {(activeExecutions.length > 0 || activeJobs.length > 0) && (
            <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-t-lg">
                <CardTitle className="text-lg text-blue-700 flex items-center">
                  <Activity className="w-5 h-5 mr-2 animate-pulse" />
                  🔴 Live Execution Monitor ({activeExecutions.length + activeJobs.length} active)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Legacy active executions */}
                  {activeExecutions.map(execution => {
                    const task = tasks.find(t => t.id === execution.taskId);
                    const progress = execution.currentStep && execution.totalSteps 
                      ? (execution.currentStep / execution.totalSteps) * 100 
                      : 0;
                    
                    return (
                      <div key={execution.id} className="bg-gradient-to-r from-white to-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                            <span className="font-medium text-sm">{execution.profileName}</span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Running</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{task?.name || 'Unknown Task'}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{execution.currentStep || 0}/{execution.totalSteps}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => browserRPAService.stopExecution(execution.id)}
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* New job queue executions */}
                  {activeJobs.map(job => {
                    const task = tasks.find(t => t.id === job.taskId);
                    const progress = job.progress.totalSteps > 0 
                      ? (job.progress.currentStep / job.progress.totalSteps) * 100 
                      : 0;
                    
                    return (
                      <div key={job.id} className="bg-gradient-to-r from-white to-green-50 p-4 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              job.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                            }`}></div>
                            <span className="font-medium text-sm">{job.profileName}</span>
                          </div>
                          <Badge className={`text-xs ${
                            job.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {job.status === 'queued' ? 'Queued' : 'Running'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{task?.name || 'Unknown Task'}</p>
                        {job.progress.stepName && (
                          <p className="text-xs text-blue-600 mb-2">Current: {job.progress.stepName}</p>
                        )}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{job.progress.currentStep}/{job.progress.totalSteps}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => handleStopJob(job.id)}
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Automation Templates */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-purple-700">🚀 Quick Start Templates</CardTitle>
              <p className="text-sm text-purple-600">Ready-to-use automation tasks for common scenarios</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {enhancedRPAService.getPracticalTemplates().map((template) => (
                  <div key={template.id} className="bg-white p-4 rounded-lg border border-purple-100 hover:shadow-md transition-all">
                    <div className="text-center mb-3">
                      <div className="text-2xl mb-2">{template.icon}</div>
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                    </div>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => handleCreateFromTemplate(template)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Create Task
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 To run automation tasks, go to <strong>Profiles</strong> tab → Select profiles → Click <strong>Run RPA</strong>
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Profile Selection Section Removed - Use Profiles tab instead */}

          {/* Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{task.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{task.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {categories.find(c => c.id === task.category)?.name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {task.description}
                  </p>
                  
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span>Steps:</span>
                      <span>{task.steps.filter(s => s.enabled).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Executions:</span>
                      <span>{task.executionCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRunTask(task)}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white flex-1 shadow-md"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Run via Profiles
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditTask(task)}
                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteTask(task.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {executions.slice(0, 20).map(execution => {
                    const task = tasks.find(t => t.id === execution.taskId);
                    return (
                      <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-lg">
                            {execution.status === 'completed' && <CheckCircle className="text-green-500" />}
                            {execution.status === 'failed' && <XCircle className="text-red-500" />}
                            {execution.status === 'running' && <PlayCircle className="text-blue-500" />}
                            {execution.status === 'pending' && <Clock className="text-yellow-500" />}
                          </div>
                          <div>
                            <p className="font-medium">{task?.name || 'Unknown Task'}</p>
                            <p className="text-sm text-gray-600">{execution.profileName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(execution.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Advanced Task Builder Modal */}
      {showTaskBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full h-full max-w-none m-4">
            <AdvancedRPATaskBuilder
              profiles={profiles}
              onSave={handleSaveTask}
              onTest={handleTestTask}
              existingTask={editingTask}
              onClose={() => {
                setShowTaskBuilder(false);
                setEditingTask(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* Simplified RPA Execution Modal */}
      {showExecutionModal && selectedTaskForExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                🚀 Execute RPA Task
              </h3>
              <p className="text-purple-100 mt-1 text-sm">{selectedTaskForExecution.name}</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Selected Profiles Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Selected Profiles</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{selectedProfiles.length}</p>
                <p className="text-sm text-blue-600">profiles will be automated</p>
              </div>

              {/* Thread Configuration */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    ⚡ Number of Threads
                  </label>
                  <Input
                    type="number"
                    value={executionThreads}
                    onChange={(e) => setExecutionThreads(parseInt(e.target.value) || 1)}
                    min="1"
                    className="border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {executionThreads} profiles will run simultaneously (unlimited)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    ⏱️ Delay Between Batches (seconds)
                  </label>
                  <Input
                    type="number"
                    value={executionDelay}
                    onChange={(e) => setExecutionDelay(Math.max(30, parseInt(e.target.value) || 30))}
                    min="30"
                    max="3600"
                    className="border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 30 seconds between batches
                  </p>
                </div>
              </div>

              {/* Execution Summary */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  📊 Execution Plan
                </h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p>• Total Profiles: {selectedProfiles.length}</p>
                  <p>• Threads per Batch: {executionThreads}</p>
                  <p>• Number of Batches: {Math.ceil(selectedProfiles.length / executionThreads)}</p>
                  <p>• Delay Between Batches: {executionDelay}s</p>
                  <p>• Estimated Duration: ~{Math.ceil(selectedProfiles.length / executionThreads) * executionDelay}s</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowExecutionModal(false)}
                className="flex-1 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteWithThreads}
                disabled={isLoading || selectedProfiles.length === 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Execution
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}