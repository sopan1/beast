import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Trash2, 
  Edit, 
  Globe, 
  Monitor,
  Settings,
  Code,
  Camera,
  MousePointer,
  Keyboard,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { browserAutomationService, BrowserSession, AutomationScript, AutomationStep } from '@/services/browserAutomationService';
import { deviceProfileService, DeviceProfile } from '@/services/deviceProfileService';

const BrowserAutomation: React.FC = () => {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [selectedSession, setSelectedSession] = useState<BrowserSession | null>(null);
  const [selectedScript, setSelectedScript] = useState<AutomationScript | null>(null);
  const [deviceProfiles, setDeviceProfiles] = useState<DeviceProfile[]>([]);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    url: '',
    deviceProfileId: ''
  });
  const [newScript, setNewScript] = useState({
    name: '',
    description: ''
  });
  const [newStep, setNewStep] = useState<Partial<AutomationStep>>({
    type: 'navigate',
    selector: '',
    value: '',
    delay: 1000,
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const sessionsList = browserAutomationService.getSessions();
    const scriptsList = browserAutomationService.getScripts();
    const profiles = deviceProfileService.getAllProfiles();
    setSessions(sessionsList);
    setScripts(scriptsList);
    setDeviceProfiles(profiles);
  };

  const createSession = () => {
    if (!newSession.name.trim() || !newSession.url.trim() || !newSession.deviceProfileId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const deviceProfile = deviceProfiles.find(p => p.id === newSession.deviceProfileId);
      if (!deviceProfile) {
        throw new Error('Device profile not found');
      }

      const session = browserAutomationService.createSession(
        newSession.name,
        newSession.url,
        deviceProfile
      );

      loadData();
      setIsSessionDialogOpen(false);
      setNewSession({ name: '', url: '', deviceProfileId: '' });

      toast({
        title: "Success",
        description: "Browser session created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create browser session",
        variant: "destructive"
      });
    }
  };

  const createScript = () => {
    if (!newScript.name.trim() || !newScript.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const script = browserAutomationService.createScript(
        newScript.name,
        newScript.description
      );

      loadData();
      setIsScriptDialogOpen(false);
      setNewScript({ name: '', description: '' });

      toast({
        title: "Success",
        description: "Automation script created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create automation script",
        variant: "destructive"
      });
    }
  };

  const addStepToScript = () => {
    if (!selectedScript || !newStep.description?.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      browserAutomationService.addStepToScript(selectedScript.id, {
        type: newStep.type!,
        selector: newStep.selector,
        value: newStep.value,
        delay: newStep.delay,
        description: newStep.description!
      });

      loadData();
      setIsStepDialogOpen(false);
      setNewStep({
        type: 'navigate',
        selector: '',
        value: '',
        delay: 1000,
        description: ''
      });

      // Update selected script
      const updatedScripts = browserAutomationService.getScripts();
      const updatedScript = updatedScripts.find(s => s.id === selectedScript.id);
      if (updatedScript) {
        setSelectedScript(updatedScript);
      }

      toast({
        title: "Success",
        description: "Step added to script successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add step to script",
        variant: "destructive"
      });
    }
  };

  const startSession = async (sessionId: string) => {
    try {
      const result = await browserAutomationService.startSession(sessionId);
      if (result.success) {
        loadData();
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive"
      });
    }
  };

  const stopSession = async (sessionId: string) => {
    try {
      const result = await browserAutomationService.stopSession(sessionId);
      if (result.success) {
        loadData();
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop session",
        variant: "destructive"
      });
    }
  };

  const executeScript = async (scriptId: string, sessionId: string) => {
    try {
      const result = await browserAutomationService.executeScript(scriptId, sessionId);
      if (result.success) {
        loadData();
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute script",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: BrowserSession['status']) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStepIcon = (type: AutomationStep['type']) => {
    switch (type) {
      case 'navigate':
        return <Globe className="h-4 w-4" />;
      case 'click':
        return <MousePointer className="h-4 w-4" />;
      case 'type':
        return <Keyboard className="h-4 w-4" />;
      case 'wait':
        return <Clock className="h-4 w-4" />;
      case 'screenshot':
        return <Camera className="h-4 w-4" />;
      case 'scroll':
        return <Monitor className="h-4 w-4" />;
      case 'extract':
        return <Code className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Browser Automation</h2>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Browser Session</DialogTitle>
                <DialogDescription>
                  Create a new browser automation session
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input
                    id="session-name"
                    placeholder="My Automation Session"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-url">Target URL</Label>
                  <Input
                    id="session-url"
                    placeholder="https://example.com"
                    value={newSession.url}
                    onChange={(e) => setNewSession({ ...newSession, url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-profile">Device Profile</Label>
                  <Select 
                    value={newSession.deviceProfileId} 
                    onValueChange={(value) => setNewSession({ ...newSession, deviceProfileId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.icon} {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={createSession} className="w-full">
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isScriptDialogOpen} onOpenChange={setIsScriptDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Script
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Automation Script</DialogTitle>
                <DialogDescription>
                  Create a new automation script with custom steps
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="script-name">Script Name</Label>
                  <Input
                    id="script-name"
                    placeholder="My Automation Script"
                    value={newScript.name}
                    onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="script-description">Description</Label>
                  <Textarea
                    id="script-description"
                    placeholder="Describe what this script does"
                    value={newScript.description}
                    onChange={(e) => setNewScript({ ...newScript, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button onClick={createScript} className="w-full">
                  Create Script
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessions">Browser Sessions</TabsTrigger>
          <TabsTrigger value="scripts">Automation Scripts</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Browser Sessions</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first browser automation session to get started
                </p>
                <Button onClick={() => setIsSessionDialogOpen(true)}>
                  Create First Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{session.deviceProfile.icon}</span>
                        <div>
                          <CardTitle className="text-base">{session.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {session.deviceProfile.name}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>URL:</span>
                        <span className="truncate ml-2 max-w-40">{session.url}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{session.createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Activity:</span>
                        <span>{session.lastActivity.toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {session.status === 'idle' || session.status === 'paused' ? (
                        <Button 
                          size="sm" 
                          onClick={() => startSession(session.id)}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => stopSession(session.id)}
                          className="flex-1"
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Stop
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => browserAutomationService.deleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {scripts.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Execute Script:</Label>
                        <div className="flex gap-2">
                          <Select onValueChange={(scriptId) => executeScript(scriptId, session.id)}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select script" />
                            </SelectTrigger>
                            <SelectContent>
                              {scripts.map((script) => (
                                <SelectItem key={script.id} value={script.id}>
                                  {script.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scripts" className="space-y-4">
          {scripts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Code className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Automation Scripts</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first automation script to automate browser tasks
                </p>
                <Button onClick={() => setIsScriptDialogOpen(true)}>
                  Create First Script
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scripts.map((script) => (
                <Card key={script.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{script.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {script.steps.length} step{script.steps.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedScript(script);
                          setIsStepDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{script.description}</p>
                    
                    {script.steps.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Steps:</Label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {script.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-2 text-xs p-2 bg-muted rounded">
                              <span className="text-muted-foreground">{index + 1}.</span>
                              {getStepIcon(step.type)}
                              <span className="flex-1 truncate">{step.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedScript(script);
                          setIsStepDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => browserAutomationService.deleteScript(script.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Step Dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Automation Step</DialogTitle>
            <DialogDescription>
              Add a new step to {selectedScript?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="step-type">Step Type</Label>
              <Select 
                value={newStep.type} 
                onValueChange={(value: AutomationStep['type']) => setNewStep({ ...newStep, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select step type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="navigate">Navigate to URL</SelectItem>
                  <SelectItem value="click">Click Element</SelectItem>
                  <SelectItem value="type">Type Text</SelectItem>
                  <SelectItem value="wait">Wait/Delay</SelectItem>
                  <SelectItem value="screenshot">Take Screenshot</SelectItem>
                  <SelectItem value="scroll">Scroll Page</SelectItem>
                  <SelectItem value="extract">Extract Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="step-description">Description</Label>
              <Input
                id="step-description"
                placeholder="Describe what this step does"
                value={newStep.description}
                onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
              />
            </div>

            {(newStep.type === 'click' || newStep.type === 'type' || newStep.type === 'extract') && (
              <div className="space-y-2">
                <Label htmlFor="step-selector">CSS Selector</Label>
                <Input
                  id="step-selector"
                  placeholder="#id, .class, [attribute]"
                  value={newStep.selector}
                  onChange={(e) => setNewStep({ ...newStep, selector: e.target.value })}
                />
              </div>
            )}

            {(newStep.type === 'navigate' || newStep.type === 'type') && (
              <div className="space-y-2">
                <Label htmlFor="step-value">
                  {newStep.type === 'navigate' ? 'URL' : 'Text to Type'}
                </Label>
                <Input
                  id="step-value"
                  placeholder={newStep.type === 'navigate' ? 'https://example.com' : 'Text to enter'}
                  value={newStep.value}
                  onChange={(e) => setNewStep({ ...newStep, value: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="step-delay">Delay (ms)</Label>
              <Input
                id="step-delay"
                type="number"
                placeholder="1000"
                value={newStep.delay}
                onChange={(e) => setNewStep({ ...newStep, delay: parseInt(e.target.value) || 1000 })}
              />
            </div>

            <Button onClick={addStepToScript} className="w-full">
              Add Step
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrowserAutomation;