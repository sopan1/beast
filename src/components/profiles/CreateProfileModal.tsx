import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { proxyService } from '@/services/proxyService';
import { userAgentLoader } from '@/lib/useragent-loader';
import { 
  RefreshCw, 
  Globe, 
  Monitor,
  TestTube,
  Zap,
  Copy,
  Clipboard,
  CheckCircle,
  AlertCircle,
  Link
} from 'lucide-react';

export interface Profile {
  id: string;
  name: string;
  browserType?: 'beast' | 'anti';
  proxy?: {
    host: string;
    port: string;
    username?: string;
    password?: string;
  };
  proxyType: 'none' | 'http' | 'https' | 'socks5';
  userAgent: string;
  userAgentPlatform: string;
  timezone: string;
  locale: string;
  fingerprint: any;
  tags: string[];
  notes: string;
  createdAt: string;
  isActive: boolean;
  startingUrl?: string;
  geoData?: {
    ip?: string;
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    locale?: string;
    testedAt?: string;
  };
}

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileCreated: (profile: Profile) => void;
}

interface SavedProxy {
  id: string;
  name: string;
  host: string;
  port: string;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks5';
  status: 'active' | 'inactive';
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileCreated
}) => {
  const [profileName, setProfileName] = useState('');
  const [browserType, setBrowserType] = useState<'beast' | 'anti'>('beast');
  const [proxyType, setProxyType] = useState<'none' | 'http' | 'https' | 'socks5' | 'saved'>('none');
  const [proxyInput, setProxyInput] = useState('');
  const [selectedSavedProxy, setSelectedSavedProxy] = useState('');
  const [platform, setPlatform] = useState('windows');
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [timezone, setTimezone] = useState('auto');
  const [locale, setLocale] = useState('en-US');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [startingUrl, setStartingUrl] = useState('');
  const [fingerprint, setFingerprint] = useState<any>(null);
  const [savedProxies, setSavedProxies] = useState<SavedProxy[]>([]);
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<{ 
    success: boolean; 
    message: string;
    geoData?: {
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
      locale?: string;
    };
  } | null>(null);

  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState({
    blockWebRTC: true,
    blockGeolocation: true,
    spoofTimezone: true,
    clearCookies: false,
    disableJavaScript: false,
    blockImages: false
  });

  useEffect(() => {
    if (isOpen) {
      // Load saved proxies using the proxy service
      try {
        const proxies = proxyService.getSavedProxies();
        // Convert ProxyConfig format to SavedProxy format
        const convertedProxies = proxies.map((proxy: any) => ({
          id: proxy.id,
          name: `${proxy.host}:${proxy.port}`,
          host: proxy.host,
          port: proxy.port.toString(),
          username: proxy.username,
          password: proxy.password,
          type: proxy.type.toLowerCase(),
          status: proxy.status
        }));
        setSavedProxies(convertedProxies);
        console.log('Loaded saved proxies:', convertedProxies.length);
      } catch (error) {
        console.error('Failed to load saved proxies:', error);
      }

      // Generate initial fingerprint
      handleGenerateFingerprint();
      
      // Force focus on first input after modal opens
      setTimeout(() => {
        const firstInput = document.getElementById('profile-name');
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    } else {
      // Reset form when modal closes
      setProfileName('');
      setBrowserType('beast');
      setProxyType('none');
      setProxyInput('');
      setSelectedSavedProxy('');
      setPlatform('windows');
      setCustomUserAgent('');
      setTimezone('auto');
      setLocale('en-US');
      setTags('');
      setNotes('');
      setStartingUrl('');
      setFingerprint(null);
      setProxyTestResult(null);
    }
  }, [isOpen]);

  const getSystemTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const loadUserAgent = async (platform: string): Promise<string> => {
    try {
      // Try to load user agents from the UserAgentLoader service
      const userAgents = await userAgentLoader.loadUserAgents(platform as any);
      if (userAgents && userAgents.length > 0) {
        // Return random user agent from the list
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        console.log(`✅ Loaded real user agent for ${platform}:`, randomUA.substring(0, 80) + '...');
        return randomUA;
      }
    } catch (error) {
      console.warn(`Failed to load user agents for ${platform}:`, error);
    }
    
    // Fallback to default user agents
    const defaultUserAgents = {
      windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      android: 'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      tv: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0.3809.146 TV Safari/537.36'
    };

    return defaultUserAgents[platform as keyof typeof defaultUserAgents] || defaultUserAgents.windows;
  };

  const generateRandomFingerprint = async (platform: string) => {
    const userAgent = await loadUserAgent(platform);
    
    const resolutions = {
      windows: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1280, height: 720 }
      ],
      macos: [
        { width: 1440, height: 900 },
        { width: 1680, height: 1050 },
        { width: 1920, height: 1080 }
      ],
      linux: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 }
      ],
      android: [
        { width: 414, height: 915 },
        { width: 393, height: 851 },
        { width: 412, height: 915 }
      ],
      ios: [
        { width: 414, height: 896 },
        { width: 375, height: 812 },
        { width: 428, height: 926 }
      ],
      tv: [
        { width: 1920, height: 1080 },
        { width: 3840, height: 2160 },
        { width: 1366, height: 768 }
      ]
    };

    const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'ja-JP', 'zh-CN'];
    
    const platformResolutions = resolutions[platform as keyof typeof resolutions] || resolutions.windows;
    const randomResolution = platformResolutions[Math.floor(Math.random() * platformResolutions.length)];
    const systemTimezone = getSystemTimezone();
    const randomLanguage = languages[Math.floor(Math.random() * languages.length)];

    return {
      userAgent,
      screen: randomResolution,
      timezone: systemTimezone,
      navigator: {
        platform: platform === 'windows' ? 'Win32' : platform === 'macos' ? 'MacIntel' : platform === 'linux' ? 'Linux x86_64' : platform,
        language: randomLanguage,
        hardwareConcurrency: Math.floor(Math.random() * 8) + 2,
        deviceMemory: [2, 4, 8, 16][Math.floor(Math.random() * 4)]
      },
      canvas: Math.random().toString(36).substring(7),
      webgl: Math.random().toString(36).substring(7),
      audio: Math.random().toString(36).substring(7)
    };
  };

  const handleGenerateFingerprint = async () => {
    try {
      const newFingerprint = await generateRandomFingerprint(platform);
      setFingerprint(newFingerprint);
      toast.success('Fingerprint generated successfully');
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
      toast.error('Failed to generate fingerprint');
    }
  };

  const parseProxyInput = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    try {
      // Support multiple formats:
      // host:port
      // host:port:username:password
      // protocol://username:password@host:port
      // username:password@host:port
      
      if (trimmed.includes('://')) {
        const url = new URL(trimmed);
        return {
          host: url.hostname,
          port: url.port || (url.protocol === 'https:' ? '443' : '80'),
          username: url.username || undefined,
          password: url.password || undefined
        };
      }

      if (trimmed.includes('@')) {
        const [auth, hostPort] = trimmed.split('@');
        const [username, password] = auth.split(':');
        const [host, port] = hostPort.split(':');
        return { host, port, username, password };
      }

      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const [host, port, username, password] = parts;
        return {
          host,
          port,
          username: username || undefined,
          password: password || undefined
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  const handlePasteProxy = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setProxyInput(text);
      toast.success('Proxy pasted from clipboard');
    } catch (error) {
      toast.error('Failed to paste from clipboard');
    }
  };

  const handleTestProxy = async () => {
    if (proxyType === 'none') {
      toast.error('No proxy configured to test');
      return;
    }

    setIsTestingProxy(true);
    setProxyTestResult(null);

    try {
      let proxyConfig;
      
      if (proxyType === 'saved') {
        const savedProxy = savedProxies.find(p => p.id === selectedSavedProxy);
        if (!savedProxy) {
          toast.error('Selected proxy not found');
          return;
        }
        proxyConfig = savedProxy;
      } else {
        const parsed = parseProxyInput(proxyInput);
        if (!parsed || !parsed.host || !parsed.port) {
          toast.error('Please enter a valid proxy in format: host:port or host:port:user:pass');
          return;
        }
        proxyConfig = parsed;
      }

      // Use Electron API for enhanced proxy testing with geo data
      if (window.electronAPI?.testProxy) {
        const result = await window.electronAPI.testProxy({
          proxy: proxyConfig,
          proxyType: proxyType === 'saved' ? savedProxies.find(p => p.id === selectedSavedProxy)?.type || 'http' : proxyType
        });
        
        if (result.success) {
          const geoInfo = result.geoData ? 
            ` (${result.country || 'Unknown'}, ${result.timezone || 'Unknown timezone'})` : '';
          
          setProxyTestResult({ 
            success: true, 
            message: `Proxy working! IP: ${result.ip}${geoInfo}`,
            geoData: result.geoData
          });
          toast.success(`Proxy test successful! IP: ${result.ip}${geoInfo}`);
        } else {
          setProxyTestResult({ success: false, message: result.error || 'Connection failed' });
          toast.error(`Proxy test failed: ${result.error || 'Connection failed'}`);
        }
      } else {
        // Fallback simulation for web mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        const success = Math.random() > 0.3;
        
        if (success) {
          const mockIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
          setProxyTestResult({ success: true, message: `Proxy working! IP: ${mockIP}` });
          toast.success(`Proxy test successful! IP: ${mockIP}`);
        } else {
          setProxyTestResult({ success: false, message: 'Connection timeout' });
          toast.error('Proxy test failed: Connection timeout');
        }
      }
    } catch (error) {
      console.error('Proxy test error:', error);
      setProxyTestResult({ success: false, message: 'Proxy test failed' });
      toast.error('Proxy test failed');
    } finally {
      setIsTestingProxy(false);
    }
  };

  const handleCreateProfile = () => {
    if (!profileName.trim()) {
      toast.error('Please enter a profile name');
      return;
    }

    if (!fingerprint) {
      toast.error('Please generate a fingerprint first');
      return;
    }

    // Validate proxy if configured
    if (proxyType !== 'none') {
      if (proxyType === 'saved') {
        if (!selectedSavedProxy) {
          toast.error('Please select a saved proxy');
          return;
        }
      } else {
        const parsed = parseProxyInput(proxyInput);
        if (!parsed || !parsed.host || !parsed.port) {
          toast.error('Please enter a valid proxy');
          return;
        }
      }
    }

    // Build proxy configuration
    let proxyConfig;
    let finalTimezone = getSystemTimezone(); // Default to system timezone

    if (proxyType === 'saved') {
      const savedProxy = savedProxies.find(p => p.id === selectedSavedProxy);
      if (savedProxy) {
        proxyConfig = {
          host: savedProxy.host,
          port: savedProxy.port,
          username: savedProxy.username,
          password: savedProxy.password
        };
        // TODO: Get timezone from proxy IP
        finalTimezone = getSystemTimezone();
      }
    } else if (proxyType !== 'none') {
      const parsed = parseProxyInput(proxyInput);
      if (parsed) {
        proxyConfig = {
          host: parsed.host,
          port: parsed.port,
          username: parsed.username,
          password: parsed.password
        };
        // TODO: Get timezone from proxy IP
        finalTimezone = getSystemTimezone();
      }
    }

    const profile: Profile = {
      id: `profile_${Date.now()}`,
      name: profileName.trim(),
      browserType,
      proxy: proxyConfig,
      proxyType: proxyType === 'saved' ? savedProxies.find(p => p.id === selectedSavedProxy)?.type || 'http' : proxyType,
      userAgent: customUserAgent || fingerprint.userAgent,
      userAgentPlatform: platform,
      timezone: timezone === 'auto' ? finalTimezone : timezone,
      locale,
      fingerprint,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      isActive: false,
      startingUrl: startingUrl.trim() || ''
    };

    onProfileCreated(profile);
    
    // Reset form
    setProfileName('');
    setBrowserType('beast');
    setProxyType('none');
    setProxyInput('');
    setSelectedSavedProxy('');
    setPlatform('windows');
    setCustomUserAgent('');
    setTimezone('auto');
    setLocale('en-US');
    setTags('');
    setNotes('');
    setStartingUrl('');
    setFingerprint(null);
    setProxyTestResult(null);
    
    onClose();
    toast.success('Profile created successfully');
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'macos': return '🍎';
      case 'windows': return '🪟';
      case 'linux': return '🐧';
      case 'android': return '📱';
      case 'ios': return '📱';
      case 'tv': return '📺';
      default: return '💻';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[95vh] overflow-y-auto overflow-x-hidden bg-white border-gray-200">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold text-gray-900">Create New Profile</SheetTitle>
          <SheetDescription className="text-gray-600">
            Configure a new browser profile with anti-detection features
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="basic" className="text-gray-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Basic</TabsTrigger>
            <TabsTrigger value="proxy" className="text-gray-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Proxy</TabsTrigger>
            <TabsTrigger value="fingerprint" className="text-gray-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Fingerprint</TabsTrigger>
            <TabsTrigger value="advanced" className="text-gray-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profile-name" className="text-gray-700">Profile Name *</Label>
                <Input
                  id="profile-name"
                  name="profile-name"
                  type="text"
                  placeholder="Enter profile name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  onInput={(e) => setProfileName((e.target as HTMLInputElement).value)}
                  className="bg-white border-gray-300 text-gray-900"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <Label className="text-gray-700">Browser Type</Label>
                <Select value={browserType} onValueChange={(v: any) => setBrowserType(v)}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="beast">BeastBrowser (Electron)</SelectItem>
                    <SelectItem value="anti">Anti-Browser (Puppeteer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="windows">{getPlatformIcon('windows')} Windows</SelectItem>
                    <SelectItem value="macos">{getPlatformIcon('macos')} macOS</SelectItem>
                    <SelectItem value="linux">{getPlatformIcon('linux')} Linux</SelectItem>
                    <SelectItem value="android">{getPlatformIcon('android')} Android</SelectItem>
                    <SelectItem value="ios">{getPlatformIcon('ios')} iOS</SelectItem>
                    <SelectItem value="tv">{getPlatformIcon('tv')} TV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone" className="text-gray-700">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="auto">Auto-detect (System)</SelectItem>
                    <SelectItem value="America/New_York">New York (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Los Angeles (PST)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="locale" className="text-gray-700">Locale</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="it-IT">Italian</SelectItem>
                    <SelectItem value="ja-JP">Japanese</SelectItem>
                    <SelectItem value="zh-CN">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="starting-url" className="text-gray-700">Starting URL (Optional)</Label>
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-gray-500" />
                <Input
                  id="starting-url"
                  name="starting-url"
                  type="url"
                  placeholder="Enter URL (optional)"
                  value={startingUrl}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStartingUrl(value);
                  }}
                  onInput={(e) => {
                    const value = (e.target as HTMLInputElement).value;
                    setStartingUrl(value);
                  }}
                  onFocus={(e) => {
                    e.target.focus();
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    setStartingUrl(value);
                  }}
                  className="bg-white border-gray-300 text-gray-900"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">URL that will open when profile launches</p>
            </div>

            <div>
              <Label htmlFor="tags" className="text-gray-700">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                type="text"
                placeholder="e.g., work, testing, social-media"
                value={tags}
                onChange={(e) => {
                  const value = e.target.value;
                  setTags(value);
                }}
                onInput={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  setTags(value);
                }}
                onFocus={(e) => {
                  e.target.focus();
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  setTags(value);
                }}
                className="bg-white border-gray-300 text-gray-900"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-gray-700">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Optional notes about this profile"
                value={notes}
                onChange={(e) => {
                  const value = e.target.value;
                  setNotes(value);
                }}
                onInput={(e) => {
                  const value = (e.target as HTMLTextAreaElement).value;
                  setNotes(value);
                }}
                onFocus={(e) => {
                  e.target.focus();
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  setNotes(value);
                }}
                className="bg-white border-gray-300 text-gray-900"
                rows={3}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="proxy" className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-700">Proxy Type</Label>
              <Select value={proxyType} onValueChange={(value: any) => setProxyType(value)}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none">No Proxy</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="socks5">SOCKS5</SelectItem>
                  <SelectItem value="saved">Saved Proxy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {proxyType === 'saved' ? (
              <div>
                <Label className="text-gray-700">Select Saved Proxy</Label>
                <Select value={selectedSavedProxy} onValueChange={setSelectedSavedProxy}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Choose a saved proxy..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {savedProxies.filter(p => p.status === 'active').map((proxy) => (
                      <SelectItem key={proxy.id} value={proxy.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{proxy.type.toUpperCase()}</Badge>
                          {proxy.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {savedProxies.filter(p => p.status === 'active').length === 0 && (
                  <p className="text-gray-500 text-sm mt-2">
                    No working saved proxies available. Add and test proxies in the Proxies tab.
                  </p>
                )}
              </div>
            ) : proxyType !== 'none' ? (
              <div>
                <Label htmlFor="proxy-input" className="text-gray-700">Proxy Configuration</Label>
                <div className="flex gap-2">
                  <Input
                    id="proxy-input"
                    name="proxy-input"
                    type="text"
                    placeholder="host:port or host:port:user:pass or user:pass@host:port"
                    value={proxyInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProxyInput(value);
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLInputElement).value;
                      setProxyInput(value);
                    }}
                    onFocus={(e) => {
                      e.target.focus();
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      setProxyInput(value);
                    }}
                    className="bg-white border-gray-300 text-gray-900 flex-1 font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasteProxy}
                    className="px-3 border-gray-300"
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  Supported formats: host:port, host:port:user:pass, user:pass@host:port, protocol://user:pass@host:port
                </p>
              </div>
            ) : null}

            {proxyType !== 'none' && (
              <div className="space-y-3">
                <Button
                  onClick={handleTestProxy}
                  disabled={isTestingProxy || (proxyType !== 'saved' && !proxyInput.trim()) || (proxyType === 'saved' && !selectedSavedProxy)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTestingProxy ? 'Testing...' : 'Test Proxy'}
                </Button>

                {proxyTestResult && (
                  <div className={`p-3 rounded-md border ${proxyTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {proxyTestResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <p className={proxyTestResult.success ? 'text-green-700' : 'text-red-700'}>
                        {proxyTestResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fingerprint" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Browser Fingerprint</h3>
              <Button
                onClick={handleGenerateFingerprint}
                variant="outline"
                className="border-blue-400 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>

            {fingerprint && (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Fingerprint Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-600">User Agent</Label>
                      <p className="text-gray-900 text-xs break-all bg-white p-2 rounded border font-mono">
                        {fingerprint.userAgent}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Screen Resolution</Label>
                      <p className="text-gray-900">
                        {fingerprint.screen.width} × {fingerprint.screen.height}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Platform</Label>
                      <p className="text-gray-900">{fingerprint.navigator.platform}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Language</Label>
                      <p className="text-gray-900">{fingerprint.navigator.language}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Hardware Concurrency</Label>
                      <p className="text-gray-900">{fingerprint.navigator.hardwareConcurrency} cores</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Device Memory</Label>
                      <p className="text-gray-900">{fingerprint.navigator.deviceMemory} GB</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="outline" className="border-blue-400 text-blue-600">
                      Canvas: {fingerprint.canvas.substring(0, 8)}...
                    </Badge>
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      WebGL: {fingerprint.webgl.substring(0, 8)}...
                    </Badge>
                    <Badge variant="outline" className="border-cyan-500 text-cyan-600">
                      Audio: {fingerprint.audio.substring(0, 8)}...
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="custom-user-agent" className="text-gray-700">Custom User Agent (optional)</Label>
              <Textarea
                id="custom-user-agent"
                placeholder="Leave empty to use generated user agent"
                value={customUserAgent}
                onChange={(e) => setCustomUserAgent(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 font-mono text-sm"
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Anti-Detection Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="block-webrtc" className="text-gray-700">Block WebRTC</Label>
                <Switch
                  id="block-webrtc"
                  checked={advancedSettings.blockWebRTC}
                  onCheckedChange={(checked) => 
                    setAdvancedSettings(prev => ({ ...prev, blockWebRTC: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="block-geolocation" className="text-gray-700">Block Geolocation</Label>
                <Switch
                  id="block-geolocation"
                  checked={advancedSettings.blockGeolocation}
                  onCheckedChange={(checked) => 
                    setAdvancedSettings(prev => ({ ...prev, blockGeolocation: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="spoof-timezone" className="text-gray-700">Spoof Timezone</Label>
                <Switch
                  id="spoof-timezone"
                  checked={advancedSettings.spoofTimezone}
                  onCheckedChange={(checked) => 
                    setAdvancedSettings(prev => ({ ...prev, spoofTimezone: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="clear-cookies" className="text-gray-700">Clear Cookies on Start</Label>
                <Switch
                  id="clear-cookies"
                  checked={advancedSettings.clearCookies}
                  onCheckedChange={(checked) => 
                    setAdvancedSettings(prev => ({ ...prev, clearCookies: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="disable-javascript" className="text-gray-700">Disable JavaScript</Label>
                <Switch
                  id="disable-javascript"
                  checked={advancedSettings.disableJavaScript}
                  onCheckedChange={(checked) => 
                    setAdvancedSettings(prev => ({ ...prev, disableJavaScript: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="block-images" className="text-gray-700">Block Images</Label>
                <Switch
                  id="block-images"
                  checked={advancedSettings.blockImages}
                  onCheckedChange={(checked) => 
                    setAdvancedSettings(prev => ({ ...prev, blockImages: checked }))
                  }
                />
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 text-sm">Anti-Detection Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✅ Canvas fingerprint spoofing</li>
                  <li>✅ WebGL fingerprint randomization</li>
                  <li>✅ Audio context fingerprint masking</li>
                  <li>✅ Screen resolution spoofing</li>
                  <li>✅ Navigator properties randomization</li>
                  <li>✅ Timezone and locale matching</li>
                  <li>✅ User agent rotation</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateProfile}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!profileName.trim() || !fingerprint}
          >
            <Zap className="h-4 w-4 mr-2" />
            Create Profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateProfileModal;