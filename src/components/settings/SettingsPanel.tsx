import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Shield, 
  Globe, 
  Monitor, 
  Zap, 
  Database,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface GlobalSettings {
  browserPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  autoSaveProfiles: boolean;
  maxConcurrentBrowsers: number;
  defaultTimeout: number;
  antiDetection: {
    patchWebDriver: boolean;
    spoofWebGL: boolean;
    spoofCanvas: boolean;
    spoofAudioContext: boolean;
    blockWebRTC: boolean;
    spoofTimezone: boolean;
    randomizeViewport: boolean;
    spoofLanguages: boolean;
    spoofPlugins: boolean;
    spoofFonts: boolean;
  };
  proxy: {
    defaultType: 'HTTP' | 'HTTPS' | 'SOCKS5';
    rotationEnabled: boolean;
    rotationInterval: number;
    validateOnAdd: boolean;
    timeoutSeconds: number;
  };
  performance: {
    disableImages: boolean;
    disableCSS: boolean;
    disableJavaScript: boolean;
    enableCache: boolean;
    maxMemoryUsage: number;
  };
  ui?: {
    showWelcomePage: boolean;
  };
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<GlobalSettings>({
    browserPath: '',
    logLevel: 'info',
    autoSaveProfiles: true,
    maxConcurrentBrowsers: 10,
    defaultTimeout: 30000,
    antiDetection: {
      patchWebDriver: true,
      spoofWebGL: true,
      spoofCanvas: true,
      spoofAudioContext: true,
      blockWebRTC: true,
      spoofTimezone: true,
      randomizeViewport: true,
      spoofLanguages: true,
      spoofPlugins: true,
      spoofFonts: true,
    },
    proxy: {
      defaultType: 'HTTP',
      rotationEnabled: false,
      rotationInterval: 300,
      validateOnAdd: true,
      timeoutSeconds: 10,
    },
    performance: {
      disableImages: false,
      disableCSS: false,
      disableJavaScript: false,
      enableCache: true,
      maxMemoryUsage: 2048,
    },
    ui: { showWelcomePage: true }
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('antidetect_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    localStorage.setItem('antidetect_settings', JSON.stringify(newSettings));
    toast.success('Settings saved successfully');
  };

  const resetToDefaults = () => {
    const defaultSettings: GlobalSettings = {
      browserPath: '',
      logLevel: 'info',
      autoSaveProfiles: true,
      maxConcurrentBrowsers: 10,
      defaultTimeout: 30000,
      antiDetection: {
        patchWebDriver: true,
        spoofWebGL: true,
        spoofCanvas: true,
        spoofAudioContext: true,
        blockWebRTC: true,
        spoofTimezone: true,
        randomizeViewport: true,
        spoofLanguages: true,
        spoofPlugins: true,
        spoofFonts: true,
      },
      proxy: {
        defaultType: 'HTTP',
        rotationEnabled: false,
        rotationInterval: 300,
        validateOnAdd: true,
        timeoutSeconds: 10,
      },
      performance: {
        disableImages: false,
        disableCSS: false,
        disableJavaScript: false,
        enableCache: true,
        maxMemoryUsage: 2048,
      },
      ui: { showWelcomePage: true }
    };
    
    saveSettings(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'antidetect_settings.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported');
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        saveSettings(importedSettings);
        toast.success('Settings imported successfully');
      } catch (error) {
        toast.error('Failed to import settings. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Global Settings</h2>
          <p className="text-muted-foreground">Configure anti-detection and system settings</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label htmlFor="import-settings">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
          <input
            id="import-settings"
            type="file"
            accept=".json"
            onChange={importSettings}
            className="hidden"
          />
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="antidetection">Anti-Detection</TabsTrigger>
          <TabsTrigger value="proxy">Proxy</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ui">UI</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Browser Executable Path</Label>
                <Input
                  placeholder="/path/to/chrome or leave empty for auto-detection"
                  value={settings.browserPath}
                  onChange={(e) => setSettings(prev => ({ ...prev, browserPath: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Path to Chrome/Chromium executable. Leave empty for auto-detection.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Log Level</Label>
                  <Select 
                    value={settings.logLevel} 
                    onValueChange={(value: 'debug' | 'info' | 'warn' | 'error') => setSettings(prev => ({ ...prev, logLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max Concurrent Browsers</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxConcurrentBrowsers}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxConcurrentBrowsers: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Timeout (ms)</Label>
                  <Input
                    type="number"
                    min="1000"
                    max="120000"
                    value={settings.defaultTimeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultTimeout: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={settings.autoSaveProfiles}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSaveProfiles: checked }))}
                  />
                  <Label>Auto-save profiles</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="antidetection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Anti-Detection Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.patchWebDriver}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, patchWebDriver: checked }
                      }))
                    }
                  />
                  <Label>Patch WebDriver Detection</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.spoofWebGL}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, spoofWebGL: checked }
                      }))
                    }
                  />
                  <Label>Spoof WebGL Fingerprint</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.spoofCanvas}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, spoofCanvas: checked }
                      }))
                    }
                  />
                  <Label>Spoof Canvas Fingerprint</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.spoofAudioContext}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, spoofAudioContext: checked }
                      }))
                    }
                  />
                  <Label>Spoof Audio Context</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.blockWebRTC}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, blockWebRTC: checked }
                      }))
                    }
                  />
                  <Label>Block WebRTC</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.spoofTimezone}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, spoofTimezone: checked }
                      }))
                    }
                  />
                  <Label>Spoof Timezone</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.randomizeViewport}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, randomizeViewport: checked }
                      }))
                    }
                  />
                  <Label>Randomize Viewport</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.spoofLanguages}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, spoofLanguages: checked }
                      }))
                    }
                  />
                  <Label>Spoof Languages</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.spoofPlugins}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, spoofPlugins: checked }
                      }))
                    }
                  />
                  <Label>Spoof Plugins</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.antiDetection.spoofFonts}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        antiDetection: { ...prev.antiDetection, spoofFonts: checked }
                      }))
                    }
                  />
                  <Label>Spoof Font List</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proxy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Proxy Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Proxy Type</Label>
                  <Select 
                    value={settings.proxy.defaultType} 
                    onValueChange={(value: 'HTTP' | 'HTTPS' | 'SOCKS5') => 
                      setSettings(prev => ({
                        ...prev,
                        proxy: { ...prev.proxy, defaultType: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HTTP">HTTP</SelectItem>
                      <SelectItem value="HTTPS">HTTPS</SelectItem>
                      <SelectItem value="SOCKS5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Validation Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.proxy.timeoutSeconds}
                    onChange={(e) => 
                      setSettings(prev => ({
                        ...prev,
                        proxy: { ...prev.proxy, timeoutSeconds: parseInt(e.target.value) }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.proxy.rotationEnabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        proxy: { ...prev.proxy, rotationEnabled: checked }
                      }))
                    }
                  />
                  <Label>Enable Proxy Rotation</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.proxy.validateOnAdd}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        proxy: { ...prev.proxy, validateOnAdd: checked }
                      }))
                    }
                  />
                  <Label>Validate Proxies on Add</Label>
                </div>
              </div>

              <div>
                <Label>Rotation Interval (seconds)</Label>
                <Input
                  type="number"
                  min="60"
                  max="3600"
                  value={settings.proxy.rotationInterval}
                  onChange={(e) => 
                    setSettings(prev => ({
                      ...prev,
                      proxy: { ...prev.proxy, rotationInterval: parseInt(e.target.value) }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Performance Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.performance.disableImages}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, disableImages: checked }
                      }))
                    }
                  />
                  <Label>Disable Images</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.performance.disableCSS}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, disableCSS: checked }
                      }))
                    }
                  />
                  <Label>Disable CSS</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.performance.disableJavaScript}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, disableJavaScript: checked }
                      }))
                    }
                  />
                  <Label>Disable JavaScript</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.performance.enableCache}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, enableCache: checked }
                      }))
                    }
                  />
                  <Label>Enable Cache</Label>
                </div>
              </div>

              <div>
                <Label>Max Memory Usage (MB)</Label>
                <Input
                  type="number"
                  min="512"
                  max="8192"
                  value={settings.performance.maxMemoryUsage}
                  onChange={(e) => 
                    setSettings(prev => ({
                      ...prev,
                      performance: { ...prev.performance, maxMemoryUsage: parseInt(e.target.value) }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UI Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.ui?.showWelcomePage ?? true}
                  onCheckedChange={(checked) => {
                    const next = { ...settings, ui: { ...(settings.ui||{}), showWelcomePage: checked } };
                    setSettings(next);
                    (window as any).beastAPI?.updateSettings?.({ showWelcomePage: checked });
                  }}
                />
                <Label>Show Welcome Page when opening profile</Label>
              </div>
              <p className="text-sm text-muted-foreground">If disabled, new profile windows open https://www.google.com/ directly.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-end">
            <Button onClick={() => saveSettings(settings)}>
              <Database className="h-4 w-4 mr-2" />
              Save All Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}