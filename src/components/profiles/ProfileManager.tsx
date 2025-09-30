import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription as SheetDesc, SheetHeader as SheetHead, SheetTitle as SheetTtl } from '@/components/ui/sheet';
import { AlertCircle, CheckCircle, Play, Square, Edit, Trash2, TestTube, Plus, Bot, Copy, Monitor, Smartphone, Tablet, Globe, Link, PlayCircle, RefreshCw, Database, Cookie, History, HardDrive } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CreateProfileModal, { Profile } from './CreateProfileModal';
import { toast } from 'sonner';
import { proxyService } from '@/services/proxyService';
import { rpaService, RPAScript } from '@/services/rpaService';
import { settingsService } from '@/services/settingsService';
import { userAgentLoader } from '@/lib/useragent-loader';
import { getRandomFingerprint } from '@/data/fingerprints';

// Declare window.electronAPI type
declare global {
  interface Window {
    electronAPI?: {
      openProfile: (profile: Profile) => Promise<{ success: boolean; message?: string; error?: string }>;
      closeProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
      closeAllProfiles: () => Promise<{ success: boolean; closedCount?: number; error?: string }>;
      getProfileStatus: (profileId: string) => Promise<{ id: string; isOpen: boolean; logs: any[] }>;
      testProxy: (proxyConfig: any) => Promise<{ 
        success: boolean; 
        ip?: string; 
        error?: string;
        country?: string;
        region?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
        locale?: string;
        responseTime?: number;
        testEndpoint?: string;
        testedAt?: string;
        geoData?: {
          country?: string;
          region?: string;
          city?: string;
          latitude?: number;
          longitude?: number;
          timezone?: string;
          locale?: string;
        };
      }>;
      getProfileLogs: (profileId: string) => Promise<any[]>;
      clearProfileLogs: (profileId: string) => Promise<{ success: boolean }>;
      getSystemInfo: () => Promise<any>;
      showSaveDialog: () => Promise<any>;
      showOpenDialog: () => Promise<any>;
      getTimezoneFromIP: (ip: string) => Promise<{ timezone: string; country: string }>;
      executeRPAScript: (profileId: string, script: any) => Promise<{ success: boolean; error?: string; message?: string }>;
      onProfileWindowClosed: (callback: (event: any, profileId: string) => void) => void;
      removeAllListeners: (channel: string) => void;
      // NEW: Cache, Cookies और History clearing functions
      clearProfileData: (profileId: string, dataTypes: string[]) => Promise<{ success: boolean; message?: string; error?: string; clearedTypes?: string[] }>;
      clearAllProfileData: (profileId: string) => Promise<{ success: boolean; message?: string; error?: string; clearedItems?: any }>;
      getProfileDataUsage: (profileId: string) => Promise<{ success: boolean; usage?: any; error?: string }>;
      // Anti-Browser (Puppeteer)
      antiBrowserOpen?: (profile: Profile, options?: any) => Promise<{ success: boolean; error?: string }>;
      antiBrowserClose?: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

interface ProfileManagerProps {
  profiles: Profile[];
  onProfilesChange: (profiles: Profile[]) => void;
}

interface RPAExecution {
  profileId: string;
  scriptId: string;
  threads: number;
  maxThreads: number;
  status: 'running' | 'stopped' | 'paused';
  startTime: Date;
  autoCloseAfter?: number; // minutes
  closeAfterCompletion: boolean;
  openedViaRPA: boolean;
}

interface BulkCreateSettings {
  count: number;
  selectedPlatforms: string[];
  proxyType: 'none' | 'saved' | 'http' | 'https' | 'socks5';
  selectedSavedProxy: string;
  namePrefix: string;
  startingUrl: string;
  randomizeFingerprints: boolean;
  bulkProxyInput: string;
  browserType: 'beast' | 'anti';
}

const availablePlatforms = [
  { id: 'windows', name: 'Windows', icon: '🪟' },
  { id: 'macos', name: 'macOS', icon: '🍎' },
  { id: 'linux', name: 'Linux', icon: '🐧' },
  { id: 'android', name: 'Android', icon: '📱' },
  { id: 'ios', name: 'iOS', icon: '📱' },
  { id: 'tv', name: 'TV', icon: '📺' }
];

export const ProfileManager: React.FC<ProfileManagerProps> = ({ profiles, onProfilesChange }) => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [profileStatuses, setProfileStatuses] = useState<Map<string, any>>(new Map());
  const [showRPAModal, setShowRPAModal] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedRPAScript, setSelectedRPAScript] = useState('');
  const [rpaThreads, setRpaThreads] = useState(10);
  const [maxRpaThreads, setMaxRpaThreads] = useState(999);
  const [rpaExecutions, setRpaExecutions] = useState<RPAExecution[]>([]);
  const [availableRPAScripts, setAvailableRPAScripts] = useState<RPAScript[]>([]);
  const [savedProxies, setSavedProxies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rpaOpenedProfiles, setRpaOpenedProfiles] = useState<Set<string>>(new Set());
  const [autoCloseAfter, setAutoCloseAfter] = useState(0.5); // Default 30 seconds (0.5 minutes)
  const [closeAfterCompletion, setCloseAfterCompletion] = useState(true);
  const [currentActiveThreads, setCurrentActiveThreads] = useState(0);

  // NEW: Cache clearing states
  const [clearingProfiles, setClearingProfiles] = useState<Set<string>>(new Set());
  const [showDataClearModal, setShowDataClearModal] = useState(false);
  const [selectedProfileForClear, setSelectedProfileForClear] = useState<Profile | null>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['cache', 'cookies']);

  // Bulk create settings
  const [bulkSettings, setBulkSettings] = useState<BulkCreateSettings>({
    count: 5,
    selectedPlatforms: ['windows'],
    proxyType: 'none',
    selectedSavedProxy: '',
    namePrefix: 'Profile',
    startingUrl: '',
    randomizeFingerprints: true,
    bulkProxyInput: '',
    browserType: 'beast'
  });

  // Form state for profile editing - REMOVED TIMEZONE FIELD
  const [formData, setFormData] = useState<Partial<Profile>>({
    name: '',
    proxyType: 'none',
    startingUrl: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Platform device metrics for UI display
  const getPlatformDisplayInfo = (platform: string) => {
    const platformInfo = {
      android: { name: 'Android', viewport: '390×844', type: 'Mobile' },
      ios: { name: 'iOS', viewport: '430×932', type: 'Mobile' },
      tv: { name: 'TV', viewport: '1920×1080', type: 'Smart TV' },
      windows: { name: 'Windows', viewport: '1366×768', type: 'Desktop' },
      macos: { name: 'macOS', viewport: '1440×900', type: 'Desktop' },
      linux: { name: 'Linux', viewport: '1366×768', type: 'Desktop' }
    };
    return platformInfo[platform] || platformInfo.windows;
  };

  // NEW: Cache clearing functions
  const handleClearCache = async (profile: Profile) => {
    if (!window.electronAPI?.clearProfileData) {
      toast.error('Cache clearing not available in web mode');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(profile.id, ['cache']);
      
      if (result.success) {
        toast.success(`Cache cleared for profile "${profile.name}"`);
      } else {
        toast.error(`Failed to clear cache: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleClearCookies = async (profile: Profile) => {
    if (!window.electronAPI?.clearProfileData) {
      toast.error('Cookie clearing not available in web mode');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(profile.id, ['cookies']);
      
      if (result.success) {
        toast.success(`Cookies cleared for profile "${profile.name}"`);
      } else {
        toast.error(`Failed to clear cookies: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing cookies:', error);
      toast.error('Failed to clear cookies');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleClearHistory = async (profile: Profile) => {
    if (!window.electronAPI?.clearProfileData) {
      toast.error('History clearing not available in web mode');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(profile.id, ['history']);
      
      if (result.success) {
        toast.success(`History cleared for profile "${profile.name}"`);
      } else {
        toast.error(`Failed to clear history: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleClearAllData = async (profile: Profile) => {
    if (!window.electronAPI?.clearAllProfileData) {
      toast.error('Data clearing not available in web mode');
      return;
    }

    if (!confirm(`Are you sure you want to clear ALL browsing data for profile "${profile.name}"? This will clear cache, cookies, history, downloads, and form data.`)) {
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearAllProfileData(profile.id);
      
      if (result.success) {
        toast.success(`All browsing data cleared for profile "${profile.name}"`);
        if (result.clearedItems) {
          console.log('Cleared items:', result.clearedItems);
        }
      } else {
        toast.error(`Failed to clear data: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing all data:', error);
      toast.error('Failed to clear all data');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleOpenDataClearModal = (profile: Profile) => {
    setSelectedProfileForClear(profile);
    setSelectedDataTypes(['cache', 'cookies']); // Default selection
    setShowDataClearModal(true);
  };

  const handleClearSelectedData = async () => {
    if (!selectedProfileForClear || !window.electronAPI?.clearProfileData) {
      toast.error('Data clearing not available');
      return;
    }

    if (selectedDataTypes.length === 0) {
      toast.error('Please select at least one data type to clear');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, selectedProfileForClear.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(selectedProfileForClear.id, selectedDataTypes);
      
      if (result.success) {
        toast.success(`Cleared ${selectedDataTypes.join(', ')} for profile "${selectedProfileForClear.name}"`);
        setShowDataClearModal(false);
      } else {
        toast.error(`Failed to clear data: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing selected data:', error);
      toast.error('Failed to clear selected data');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedProfileForClear.id);
        return newSet;
      });
    }
  };

  const handleGetDataUsage = async (profile: Profile) => {
    if (!window.electronAPI?.getProfileDataUsage) {
      toast.error('Data usage info not available in web mode');
      return;
    }

    try {
      const result = await window.electronAPI.getProfileDataUsage(profile.id);
      
      if (result.success && result.usage) {
        const usage = result.usage;
        toast.info(`Profile "${profile.name}" data usage:\nCookies: ${usage.cookies}\nStorage size: ${usage.storageSize} bytes\nLast accessed: ${new Date(usage.lastAccessed).toLocaleString()}`);
      } else {
        toast.error(`Failed to get data usage: ${result.error}`);
      }
    } catch (error) {
      console.error('Error getting data usage:', error);
      toast.error('Failed to get data usage');
    }
  };

  // Memoized update function to prevent infinite loops
  const updateProfileStatuses = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous updates
    
    console.log('🔄 STATUS UPDATE: Starting status sync for', profiles.length, 'profiles');
    const newStatuses = new Map<string, any>();
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const statusMismatches: { profileId: string; profileName: string; electronStatus: boolean; reactStatus: boolean }[] = [];
    
    // Update statuses for all profiles
    for (const profile of safeProfiles) {
      try {
        // Check if Electron API is available
        if (window.electronAPI?.getProfileStatus) {
          const status = await window.electronAPI.getProfileStatus(profile.id);
          newStatuses.set(profile.id, {
            isOpen: status.isOpen,
            isRunning: rpaExecutions.some(exec => exec.profileId === profile.id && exec.status === 'running')
          });
          
          // CRITICAL: Detect and track status mismatches
          if (status.isOpen !== profile.isActive) {
            statusMismatches.push({
              profileId: profile.id,
              profileName: profile.name,
              electronStatus: status.isOpen,
              reactStatus: profile.isActive
            });
          }
        } else {
          // Fallback for web mode
          const isRunning = rpaExecutions.some(exec => exec.profileId === profile.id && exec.status === 'running');
          newStatuses.set(profile.id, {
            isOpen: profile.isActive,
            isRunning: isRunning
          });
        }
      } catch (error) {
        console.warn(`🔄 STATUS UPDATE: Failed to get status for profile ${profile.id}:`, error);
        const isRunning = rpaExecutions.some(exec => exec.profileId === profile.id && exec.status === 'running');
        newStatuses.set(profile.id, {
          isOpen: profile.isActive,
          isRunning: isRunning
        });
      }
    }
    
    // CRITICAL: Fix status mismatches by updating React state to match Electron
    if (statusMismatches.length > 0) {
      console.log('🔄 STATUS UPDATE: Found', statusMismatches.length, 'status mismatches, fixing...');
      statusMismatches.forEach(mismatch => {
        console.log(`🔄 STATUS SYNC: ${mismatch.profileName} - Electron: ${mismatch.electronStatus}, React: ${mismatch.reactStatus}`);
      });
      
      // Update all mismatched profiles in a single state update
      const updatedProfiles = safeProfiles.map(profile => {
        const mismatch = statusMismatches.find(m => m.profileId === profile.id);
        if (mismatch) {
          return { ...profile, isActive: mismatch.electronStatus };
        }
        return profile;
      });
      
      onProfilesChange(updatedProfiles);
      console.log('🔄 STATUS UPDATE: Fixed', statusMismatches.length, 'status mismatches');
    }
    
    setProfileStatuses(newStatuses);
    console.log('🔄 STATUS UPDATE: Completed status sync');
  }, [profiles, rpaExecutions, isLoading, onProfilesChange]);

  // Refresh RPA scripts function
  const refreshRPAScripts = useCallback(() => {
    try {
      console.log('🔄 Refreshing RPA scripts...');
      const latestScripts = rpaService.getAllScripts();
      setAvailableRPAScripts(latestScripts);
      console.log('✅ RPA scripts refreshed, found:', latestScripts.length, 'scripts');
    } catch (error) {
      console.warn('Failed to refresh RPA scripts:', error);
      setAvailableRPAScripts([]);
    }
  }, []);

  useEffect(() => {
    // Load profiles from localStorage only once on mount
    const savedProfiles = localStorage.getItem('antidetect_profiles');
    if (savedProfiles) {
      try {
        const parsedProfiles = JSON.parse(savedProfiles);
        if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
          onProfilesChange(parsedProfiles);
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
        onProfilesChange([]);
      }
    }

    // Load saved proxies using service
    try {
      setSavedProxies(proxyService.getSavedProxies());
    } catch (error) {
      console.warn('Failed to load saved proxies:', error);
      setSavedProxies([]);
    }

    // Load RPA scripts using service
    try {
      console.log('🔄 Loading RPA scripts during component initialization...');
      rpaService.debugLocalStorage();
      const initialScripts = rpaService.getAllScripts();
      console.log('📊 Initial scripts loaded:', initialScripts.length);
      console.log('📝 Initial script details:', initialScripts.map(s => ({ name: s.name, id: s.id, category: s.category })));
      setAvailableRPAScripts(initialScripts);
    } catch (error) {
      console.warn('Failed to load RPA scripts:', error);
      setAvailableRPAScripts([]);
    }

    // Listen for profile window close events from Electron
    if (window.electronAPI?.onProfileWindowClosed) {
      window.electronAPI.onProfileWindowClosed((event, profileId) => {
        console.log('🔴 WINDOW CLOSED: Profile window closed event received for:', profileId);
        
        // When a profile window is manually closed, ONLY update the isActive status
        // DO NOT delete the profile from the state - profiles should persist
        const safeProfiles = Array.isArray(profiles) ? profiles : [];
        const closedProfile = safeProfiles.find(p => p.id === profileId);
        
        if (closedProfile) {
          console.log(`🔴 WINDOW CLOSED: Updating status for profile "${closedProfile.name}" (${profileId})`);
          
          // CRITICAL: Only update the specific profile that was closed
          const updatedProfiles = safeProfiles.map(p => 
            p.id === profileId ? { ...p, isActive: false } : p
          );
          onProfilesChange(updatedProfiles);
          
          // Remove from RPA-opened profiles if it was opened via RPA
          setRpaOpenedProfiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(profileId);
            return newSet;
          });
          
          // Stop any running RPA executions for this profile
          setRpaExecutions(prev => prev.filter(exec => exec.profileId !== profileId));
          
          toast.info(`Profile "${closedProfile.name}" browser window closed - profile saved in dashboard`);
          console.log(`🔴 WINDOW CLOSED: Successfully handled close event for "${closedProfile.name}"`);
        } else {
          console.warn('🔴 WINDOW CLOSED: Profile not found for ID:', profileId);
        }
      });
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('profile-window-closed');
      }
    };
  }, []); // Empty dependency array - run only once on mount

  useEffect(() => {
    // Update profile statuses with a more aggressive interval for better sync
    const interval = setInterval(updateProfileStatuses, 3000); // Reduced to 3000ms for better responsiveness
    return () => clearInterval(interval);
  }, [updateProfileStatuses]);

  // Add effect to listen for RPA script changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'antidetect_rpa_scripts') {
        console.log('🔄 RPA scripts updated in localStorage, refreshing...');
        refreshRPAScripts();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshRPAScripts]);

  // Debounced save to localStorage
  useEffect(() => {
    if (Array.isArray(profiles) && profiles.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('antidetect_profiles', JSON.stringify(profiles));
      }, 500); // Debounce saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [profiles]);

  // REMOVED: getTimezoneFromProxy function - timezone is now handled automatically by IP detection

  const loadUserAgent = async (platform: string): Promise<string> => {
    try {
      // Use the UserAgentLoader service
      const userAgents = await userAgentLoader.loadUserAgents(platform as any);
      if (userAgents && userAgents.length > 0) {
        return userAgents[Math.floor(Math.random() * userAgents.length)];
      }
    } catch (error) {
      console.warn(`Failed to load user agents for ${platform}:`, error);
    }

    // Return fallback user agent using the service
    return userAgentLoader.getRandomUserAgent(platform as any);
  };

  const generateRandomFingerprint = (platform: string) => {
    // Use the fingerprint service to generate random fingerprint
    return getRandomFingerprint(platform as any);
  };

  // Parse proxy input for bulk creation
  const parseBulkProxyInput = (input: string) => {
    const lines = input.trim().split('\n').filter(line => line.trim());
    const proxies: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      try {
        // Support multiple formats:
        // host:port
        // host:port:username:password
        // protocol://username:password@host:port
        // username:password@host:port
        
        if (trimmed.includes('://')) {
          const url = new URL(trimmed);
          proxies.push({
            host: url.hostname,
            port: url.port || (url.protocol === 'https:' ? '443' : '80'),
            username: url.username || undefined,
            password: url.password || undefined
          });
        } else if (trimmed.includes('@')) {
          const [auth, hostPort] = trimmed.split('@');
          const [username, password] = auth.split(':');
          const [host, port] = hostPort.split(':');
          proxies.push({ host, port, username, password });
        } else {
          const parts = trimmed.split(':');
          if (parts.length >= 2) {
            const [host, port, username, password] = parts;
            proxies.push({
              host,
              port,
              username: username || undefined,
              password: password || undefined
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to parse proxy line: ${line}`, error);
      }
    }
    
    return proxies;
  };

  const handleCreateProfile = () => {
    setIsCreateModalOpen(true);
  };

  const handleBulkCreateProfiles = async () => {
    if (bulkSettings.selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    if (bulkSettings.count < 1) {
      toast.error('Profile count must be at least 1');
      return;
    }

    setIsLoading(true);
    try {
      const newProfiles: Profile[] = [];
      const settings = settingsService.getSettings();
      
      // Parse bulk proxy input if provided
      let bulkProxies: any[] = [];
      if (bulkSettings.proxyType !== 'none' && bulkSettings.proxyType !== 'saved' && bulkSettings.bulkProxyInput.trim()) {
        bulkProxies = parseBulkProxyInput(bulkSettings.bulkProxyInput);
        if (bulkProxies.length === 0) {
          toast.error('No valid proxies found in the input. Please check the format.');
          setIsLoading(false);
          return;
        }
      }
      
      // Create profiles in smaller batches to prevent UI freezing
      const batchSize = 5;
      for (let batch = 0; batch < Math.ceil(bulkSettings.count / batchSize); batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, bulkSettings.count);
        
        for (let i = batchStart; i < batchEnd; i++) {
          const platform = bulkSettings.selectedPlatforms[i % bulkSettings.selectedPlatforms.length];
          const userAgent = await loadUserAgent(platform);
          
          // Generate random fingerprint if enabled
          let fingerprint;
          if (bulkSettings.randomizeFingerprints) {
            fingerprint = generateRandomFingerprint(platform);
          } else {
            // Use basic fingerprint - timezone will be auto-detected from proxy IP
            fingerprint = {
              userAgent,
              screen: { width: 1920, height: 1080 },
              timezone: 'auto', // This will be auto-detected from proxy IP
              navigator: {
                platform: platform === 'windows' ? 'Win32' : platform === 'macos' ? 'MacIntel' : platform,
                language: 'en-US',
                hardwareConcurrency: 4,
                deviceMemory: 8
              },
              canvas: 'default',
              webgl: 'default',
              audio: 'default'
            };
          }
          
          // Handle proxy configuration - timezone will be auto-detected
          let proxyConfig;
          
          if (bulkSettings.proxyType === 'saved' && bulkSettings.selectedSavedProxy) {
            const savedProxy = savedProxies.find(p => p.id === bulkSettings.selectedSavedProxy);
            if (savedProxy) {
              proxyConfig = {
                host: savedProxy.host,
                port: savedProxy.port.toString(),
                username: savedProxy.username,
                password: savedProxy.password
              };
            }
          } else if (bulkSettings.proxyType !== 'none' && bulkProxies.length > 0) {
            // Use bulk proxy input - rotate through available proxies
            const proxyIndex = i % bulkProxies.length;
            const bulkProxy = bulkProxies[proxyIndex];
            proxyConfig = {
              host: bulkProxy.host,
              port: bulkProxy.port.toString(),
              username: bulkProxy.username,
              password: bulkProxy.password
            };
          }

          const profile: Profile = {
            id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
            name: `${bulkSettings.namePrefix} ${i + 1}`,
            browserType: bulkSettings.browserType,
            proxy: proxyConfig,
            proxyType: bulkSettings.proxyType === 'saved' ? 
              (savedProxies.find(p => p.id === bulkSettings.selectedSavedProxy)?.type?.toLowerCase() || 'http') : 
              bulkSettings.proxyType,
            userAgent,
            userAgentPlatform: platform,
            timezone: 'auto', // CHANGED: Always use auto-detection from proxy IP
            locale: settingsService.getDefaultLocale(),
            fingerprint,
            tags: ['bulk-created'],
            notes: `Bulk created profile for ${platform}`,
            createdAt: new Date().toISOString(),
            isActive: false,
            startingUrl: bulkSettings.startingUrl || ''
          };

          newProfiles.push(profile);
        }
        
        // Small delay between batches to prevent UI freezing
        if (batch < Math.ceil(bulkSettings.count / batchSize) - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const safeProfiles = Array.isArray(profiles) ? profiles : [];
      onProfilesChange([...safeProfiles, ...newProfiles]);
      setIsBulkCreateOpen(false);
      toast.success(`Created ${newProfiles.length} profiles successfully`);
      
    } catch (error) {
      console.error('Bulk creation failed:', error);
      toast.error('Failed to create profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileCreated = (profile: Profile) => {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const updatedProfiles = [...safeProfiles, profile];
    onProfilesChange(updatedProfiles);
    toast.success(`Profile "${profile.name}" created successfully`);
  };

  const handleEditProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      proxyType: profile.proxyType,
      startingUrl: profile.startingUrl || '',
      notes: profile.notes
    });
    setIsEditing(true);
    setFormErrors([]);
  };

  const handleSaveProfile = () => {
    if (!formData.name?.trim()) {
      setFormErrors(['Profile name is required']);
      return;
    }

    const profileData: Profile = {
      ...selectedProfile!,
      name: formData.name.trim(),
      proxyType: formData.proxyType || 'none',
      startingUrl: formData.startingUrl || '',
      timezone: 'auto', // CHANGED: Always use auto-detection
      notes: formData.notes || ''
    };

    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const updatedProfiles = safeProfiles.map(p => 
      p.id === selectedProfile!.id ? profileData : p
    );

    onProfilesChange(updatedProfiles);
    setIsEditing(false);
    setSelectedProfile(null);
    setFormErrors([]);
    
    toast.success('Profile updated successfully');
  };

  const handleDeleteProfile = async (profile: Profile) => {
    console.log('🗑️ DELETE: Attempting to delete profile:', profile.name, profile.id);
    
    if (!confirm(`Are you sure you want to DELETE profile "${profile.name}"? This action cannot be undone.`)) {
      console.log('🗑️ DELETE: User cancelled deletion');
      return;
    }

    try {
      console.log('🗑️ DELETE: Starting deletion process');
      
      // Close profile if it's open in Electron before deleting
      if (window.electronAPI?.closeProfile && profile.isActive) {
        console.log('🗑️ DELETE: Closing browser window first');
        await window.electronAPI.closeProfile(profile.id);
      }
    } catch (error) {
      console.warn('🗑️ DELETE: Failed to close profile in Electron:', error);
    }

    // Stop any running RPA executions
    console.log('🗑️ DELETE: Stopping RPA executions');
    setRpaExecutions(prev => prev.filter(exec => exec.profileId !== profile.id));

    // Remove from RPA-opened profiles
    setRpaOpenedProfiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(profile.id);
      return newSet;
    });

    // ACTUALLY DELETE the profile from the state and localStorage
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    console.log('🗑️ DELETE: Current profiles count:', safeProfiles.length);
    
    const updatedProfiles = safeProfiles.filter(p => p.id !== profile.id);
    console.log('🗑️ DELETE: After deletion profiles count:', updatedProfiles.length);
    
    // Update state and localStorage immediately
    onProfilesChange(updatedProfiles);
    localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
    
    console.log('🗑️ DELETE: Profile deleted successfully');
    toast.success(`Profile "${profile.name}" permanently deleted`);
  };

  const handleDeleteSelectedProfiles = async () => {
    if (selectedProfiles.length === 0) {
      toast.error('No profiles selected for deletion');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedProfiles.length} selected profiles?`)) return;

    try {
      setIsLoading(true);
      const safeProfiles = Array.isArray(profiles) ? profiles : [];
      const profilesToDelete = safeProfiles.filter(p => selectedProfiles.includes(p.id));
      
      // Close any open profiles before deleting
      for (const profile of profilesToDelete) {
        if (window.electronAPI?.closeProfile && profile.isActive) {
          try {
            await window.electronAPI.closeProfile(profile.id);
          } catch (error) {
            console.warn(`Failed to close profile ${profile.name}:`, error);
          }
        }
      }

      // Stop any running RPA executions
      setRpaExecutions(prev => prev.filter(exec => !selectedProfiles.includes(exec.profileId)));

      // Remove profiles from state
      const updatedProfiles = safeProfiles.filter(p => !selectedProfiles.includes(p.id));
      
      // If all profiles are being deleted, close all browser windows
      if (updatedProfiles.length === 0 && window.electronAPI?.closeAllProfiles) {
        try {
          const result = await window.electronAPI.closeAllProfiles();
          if (result.success && result.closedCount && result.closedCount > 0) {
            toast.info(`Closed ${result.closedCount} browser windows`);
          }
        } catch (error) {
          console.warn('Failed to close all browser windows:', error);
        }
      }
      
      // Update state and localStorage immediately
      onProfilesChange(updatedProfiles);
      localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
      
      setSelectedProfiles([]);
      toast.success(`Deleted ${profilesToDelete.length} profiles successfully`);
    } catch (error) {
      console.error('Failed to delete profiles:', error);
      toast.error('Failed to delete some profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestProxy = async (profile: Profile) => {
    if (!profile.proxy?.host) {
      setTestResults(prev => new Map(prev.set(profile.id, {
        success: false,
        error: 'No proxy configured'
      })));
      return;
    }
    
    try {
      let result;
      
      // Try using Electron API first
      if (window.electronAPI?.testProxy) {
        result = await window.electronAPI.testProxy({
          proxy: profile.proxy,
          proxyType: profile.proxyType
        });
      } else {
        // Fallback simulation for web mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        const success = Math.random() > 0.3;
        
        if (success) {
          const mockIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
          result = { success: true, ip: mockIP };
        } else {
          result = { success: false, error: 'Connection timeout' };
        }
      }
      
      setTestResults(prev => new Map(prev.set(profile.id, result)));
      
      if (result.success) {
        toast.success(`Proxy test successful! IP: ${result.ip}${result.timezone ? `, Timezone: ${result.timezone}` : ''}`);
      } else {
        toast.error(`Proxy test failed: ${result.error}`);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setTestResults(prev => new Map(prev.set(profile.id, errorResult)));
      toast.error('Proxy test failed');
    }
  };

  // CRITICAL FIX: Add debouncing to prevent multiple browser opens
  const [launchingProfiles, setLaunchingProfiles] = useState<Set<string>>(new Set());
  
  const handleLaunchProfile = async (profile: Profile) => {
    console.log('🚀 LAUNCH: Attempting to launch profile:', profile.name, profile.id);
    
    // PREVENT MULTIPLE CLICKS - Check if already launching
    if (launchingProfiles.has(profile.id)) {
      console.warn('⚠️ LAUNCH: Profile already launching, ignoring duplicate click:', profile.name);
      toast.warning(`Profile "${profile.name}" is already launching, please wait...`);
      return;
    }
    
    // PREVENT ALREADY OPEN - Check if already active
    if (profile.isActive) {
      console.warn('⚠️ LAUNCH: Profile already active:', profile.name);
      toast.info(`Profile "${profile.name}" is already open`);
      return;
    }
    
    // Mark as launching
    setLaunchingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      let success = false;
      let errorMessage = '';

      // Sanitize starting URL (fix about bablank issue)
      const normalizeStartingUrl = (url?: string) => {
        const u = (url || '').trim();
        if (!u) return 'about:blank';
        const lower = u.toLowerCase().replace(/\s+/g, ' ').trim();
        if (lower === 'about blank' || lower === 'about  blank' || lower.includes('about bablank')) return 'about:blank';
        return u;
      };
      const safeProfile: Profile = { ...profile, startingUrl: normalizeStartingUrl(profile.startingUrl) };

      // Try using Electron API first
      if (safeProfile.browserType === 'anti' && (window as any).electronAPI?.antiBrowserOpen) {
        console.log('🚀 LAUNCH: Using Anti-Browser (Puppeteer) to open profile');
        const proxyOpt = safeProfile.proxy ? {
          host: safeProfile.proxy.host,
          port: safeProfile.proxy.port,
          username: safeProfile.proxy.username,
          password: safeProfile.proxy.password,
          type: (safeProfile.proxyType || 'http').toLowerCase()
        } : undefined;
        const result = await (window as any).electronAPI.antiBrowserOpen(safeProfile, { proxy: proxyOpt });
        success = result.success;
        errorMessage = result.error || '';
        console.log('🚀 LAUNCH: Anti-Browser IPC result:', result);
      } else if ((window as any).electronAPI?.openProfile) {
        console.log('🚀 LAUNCH: Using Electron API (BeastBrowser) to open profile');
        const result = await (window as any).electronAPI.openProfile(safeProfile);
        success = result.success;
        errorMessage = result.error || '';
        console.log('🚀 LAUNCH: BeastBrowser IPC result:', result);
        
        if (success) {
          toast.success(`Profile "${profile.name}" launched successfully`);
          
          // CRITICAL: Immediately update profile state to reflect the launch
          const safeProfiles = Array.isArray(profiles) ? profiles : [];
          const updatedProfiles = safeProfiles.map(p => 
            p.id === profile.id ? { ...p, isActive: true } : p
          );
          console.log('🚀 LAUNCH: Immediately updating profile state for:', profile.name);
          onProfilesChange(updatedProfiles);
          
          // Force localStorage update immediately
          localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
          
          // ENHANCED: Force immediate status verification after launch
          setTimeout(async () => {
            console.log('🚀 LAUNCH: Verifying launch status for:', profile.name);
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              console.log('🚀 LAUNCH: Post-launch status verification:', status);
              
              // Double-check status sync and force correction if needed
              const currentProfiles = JSON.parse(localStorage.getItem('antidetect_profiles') || '[]');
              const currentProfile = currentProfiles.find((p: Profile) => p.id === profile.id);
              if (status.isOpen && currentProfile && !currentProfile.isActive) {
                console.log('🚀 LAUNCH: Status mismatch detected, correcting...');
                const correctedProfiles = currentProfiles.map((p: Profile) => 
                  p.id === profile.id ? { ...p, isActive: true } : p
                );
                onProfilesChange(correctedProfiles);
                localStorage.setItem('antidetect_profiles', JSON.stringify(correctedProfiles));
              }
            }
          }, 1500);
        } else {
          toast.error(`Failed to launch profile: ${errorMessage}`);
        }
      } else {
        console.log('🚀 LAUNCH: Electron API not available, using web mode');
        // Fallback for web mode - simulate browser opening
        toast.info(`Opening browser for profile "${safeProfile.name}"...`);
        
        // Create a more realistic browser simulation
        const profileWindow = window.open(
          '',
          `profile_${safeProfile.id}`,
          'width=1200,height=800,toolbar=yes,location=yes,directories=no,status=yes,menubar=yes,scrollbars=yes,copyhistory=yes,resizable=yes'
        );
        
        if (profileWindow) {
          // Set up the profile window with custom settings
          profileWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>BeastBrowser - ${profile.name}</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0; 
                  padding: 20px; 
                  background: #f5f5f5; 
                }
                .profile-info {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  margin-bottom: 20px;
                }
                .redirect-info {
                  background: #e3f2fd;
                  padding: 15px;
                  border-radius: 8px;
                  border-left: 4px solid #2196f3;
                }
                .countdown {
                  font-weight: bold;
                  color: #2196f3;
                }
              </style>
            </head>
            <body>
              <div class="profile-info">
                <h1>🚀 BeastBrowser Profile: ${safeProfile.name}</h1>
                <p><strong>Platform:</strong> ${safeProfile.userAgentPlatform}</p>
                <p><strong>Proxy:</strong> ${safeProfile.proxy?.host ? `${safeProfile.proxy.host}:${safeProfile.proxy.port}` : 'None'}</p>
                <p><strong>Timezone:</strong> Auto-detected from IP</p>
                <p><strong>User Agent:</strong> ${safeProfile.userAgent}</p>
              </div>
              <div class="redirect-info">
                <p>🔄 Redirecting to <strong>${safeProfile.startingUrl || 'New Tab Page'}</strong> in <span class="countdown" id="countdown">3</span> seconds...</p>
              </div>
              <script>
                let count = 3;
                const countdownEl = document.getElementById('countdown');
                const timer = setInterval(() => {
                  count--;
                  countdownEl.textContent = count;
                  if (count <= 0) {
                    clearInterval(timer);
                    window.location.href = '${safeProfile.startingUrl || 'about:blank'}';
                  }
                }, 1000);
              </script>
            </body>
            </html>
          `);
          profileWindow.document.close();
          
          success = true;
          toast.success(`Profile "${safeProfile.name}" opened in new window`);
          
          // Update profile state immediately
          const safeProfiles = Array.isArray(profiles) ? profiles : [];
          const updatedProfiles = safeProfiles.map(p => 
            p.id === safeProfile.id ? { ...p, isActive: true } : p
          );
          console.log('🚀 LAUNCH: Updated profiles (web mode):', updatedProfiles.length);
          onProfilesChange(updatedProfiles);
          localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        } else {
          toast.error('Failed to open browser window. Please allow popups for this site.');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('🚀 LAUNCH: Exception occurred:', error);
      toast.error(`Failed to launch profile: ${errorMsg}`);
    } finally {
      // ALWAYS remove from launching set
      setLaunchingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleCloseProfile = async (profile: Profile) => {
    console.log('🔴 CLOSE: Attempting to close profile:', profile.name, profile.id);
    
    try {
      let success = false;
      let errorMessage = '';

      // Try using Electron API first
      if (profile.browserType === 'anti' && window.electronAPI?.antiBrowserClose) {
        console.log('🔴 CLOSE: Using Anti-Browser IPC to close profile');
        const result = await window.electronAPI.antiBrowserClose(profile.id);
        success = result.success;
        errorMessage = result.error || '';
        console.log('🔴 CLOSE: Anti-Browser IPC result:', result);
      } else if (window.electronAPI?.closeProfile) {
        console.log('🔴 CLOSE: Using Electron API to close profile (BeastBrowser)');
        const result = await window.electronAPI.closeProfile(profile.id);
        success = result.success;
        errorMessage = result.error || '';
        console.log('🔴 CLOSE: BeastBrowser IPC result:', result);
      } else {
        console.log('🔴 CLOSE: Electron API not available, using fallback');
        // Fallback for web mode - always succeed since we can't actually close external windows
        success = true;
      }

      if (success) {
        console.log('🔴 CLOSE: Successfully closed, updating state');
        // Stop any running RPA executions for this profile
        setRpaExecutions(prev => prev.filter(exec => exec.profileId !== profile.id));
        
        // Remove from RPA-opened profiles if it was opened via RPA
        setRpaOpenedProfiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(profile.id);
          return newSet;
        });
        
        // CRITICAL: Update profile state to mark as inactive - NEVER DELETE THE PROFILE
        const safeProfiles = Array.isArray(profiles) ? profiles : [];
        const updatedProfiles = safeProfiles.map(p => 
          p.id === profile.id ? { ...p, isActive: false } : p
        );
        
        console.log('🔴 CLOSE: Updated profiles:', updatedProfiles.length);
        onProfilesChange(updatedProfiles);
        
        // Force localStorage update immediately
        localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        
        toast.success(`Profile "${profile.name}" browser closed - profile saved in dashboard`);
      } else {
        console.log('🔴 CLOSE: Failed to close profile:', errorMessage);
        toast.error(`Failed to close profile: ${errorMessage}`);
      }
    } catch (error) {
      console.error('🔴 CLOSE: Exception occurred:', error);
      // Even if there's an error, update the state to allow reopening
      const safeProfiles = Array.isArray(profiles) ? profiles : [];
      const updatedProfiles = safeProfiles.map(p => 
        p.id === profile.id ? { ...p, isActive: false } : p
      );
      onProfilesChange(updatedProfiles);
      localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
      
      // Remove from RPA-opened profiles
      setRpaOpenedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.warning(`Profile "${profile.name}" browser closed (with error) - profile saved in dashboard`);
    }
  };

  const handleRunRPAScript = async () => {
    if (!selectedRPAScript || selectedProfiles.length === 0) {
      toast.error('Please select a script and at least one profile');
      return;
    }

    const script = rpaService.getScriptById(selectedRPAScript);
    if (!script) {
      toast.error('Selected script not found');
      return;
    }

    setIsLoading(true);
    
    try {
      // Step 1: Launch all selected profiles first
      toast.info(`Launching ${selectedProfiles.length} profile browser windows...`);
      let launchSuccessCount = 0;
      let launchFailCount = 0;
      
      for (const profileId of selectedProfiles) {
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
          try {
            // Check if profile is already open
            let isOpen = false;
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              isOpen = status.isOpen;
            } else {
              isOpen = profile.isActive;
            }
            
            // Launch profile if not already open
            if (!isOpen) {
              await handleLaunchProfile(profile);
              // Mark this profile as opened via RPA
              setRpaOpenedProfiles(prev => new Set([...prev, profileId]));
              // Wait for window to fully load
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              // Still mark as RPA-opened even if already open
              setRpaOpenedProfiles(prev => new Set([...prev, profileId]));
            }
            launchSuccessCount++;
          } catch (error) {
            console.error(`Failed to launch profile ${profile.name}:`, error);
            launchFailCount++;
          }
        }
      }
      
      if (launchFailCount > 0) {
        toast.warning(`Failed to launch ${launchFailCount} profiles. RPA will run on ${launchSuccessCount} successfully launched profiles.`);
      } else {
        toast.success(`All ${launchSuccessCount} profile browser windows launched successfully!`);
      }
      
      // Step 2: Execute RPA script on launched profiles
      if (launchSuccessCount > 0) {
        // Mark script as running
        rpaService.setScriptRunning(selectedRPAScript, true);

        // Create RPA executions for successfully launched profiles
        const successfulProfiles = selectedProfiles.filter(profileId => {
          const profile = profiles.find(p => p.id === profileId);
          return profile; // Only include profiles that exist
        });
        
        const newExecutions: RPAExecution[] = successfulProfiles.map(profileId => ({
          profileId,
          scriptId: script.id,
          threads: rpaThreads,
          maxThreads: maxRpaThreads,
          status: 'running' as const,
          startTime: new Date(),
          autoCloseAfter: autoCloseAfter,
          closeAfterCompletion: closeAfterCompletion,
          openedViaRPA: true
        }));

        setRpaExecutions(prev => [...prev, ...newExecutions]);
        toast.success(`RPA script "${script.name}" started on ${launchSuccessCount} profiles`);

        // Execute script on each launched profile sequentially
        let scriptSuccessCount = 0;
        let scriptFailCount = 0;
        
        // Execute scripts in parallel on all profiles for better performance
        const scriptPromises = successfulProfiles.map(async (profileId) => {
          const profile = profiles.find(p => p.id === profileId);
          
          if (profile) {
            try {
              // Execute the actual RPA script
              await executeRPAScript(script, profile);
              scriptSuccessCount++;
              toast.success(`Script completed on profile "${profile.name}"`);
              
              // Handle auto-close after completion if enabled
              if (closeAfterCompletion) {
                setTimeout(async () => {
                  try {
                    await handleCloseProfile(profile);
                    setRpaOpenedProfiles(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(profileId);
                      return newSet;
                    });
                    toast.info(`Profile "${profile.name}" auto-closed after script completion`);
                  } catch (error) {
                    console.warn(`Failed to auto-close profile ${profile.name}:`, error);
                  }
                }, 2000); // 2 second delay before closing
              }
              
            } catch (error) {
              console.error(`Error running script on profile ${profile.name}:`, error);
              scriptFailCount++;
              toast.error(`Script failed on profile "${profile.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });
        
        // Wait for all scripts to complete
        await Promise.allSettled(scriptPromises);

        // Set up auto-close timers for all profiles
        successfulProfiles.forEach(profileId => {
          const profile = profiles.find(p => p.id === profileId);
          if (profile) {
            setTimeout(async () => {
              try {
                // Only auto-close if the profile is still marked as RPA-opened
                if (rpaOpenedProfiles.has(profileId)) {
                  await handleCloseProfile(profile);
                  setRpaOpenedProfiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(profileId);
                    return newSet;
                  });
                  toast.info(`Profile "${profile.name}" auto-closed after ${Math.round(autoCloseAfter * 60)} seconds`);
                }
              } catch (error) {
                console.warn(`Failed to auto-close profile ${profile.name} after timeout:`, error);
              }
            }, autoCloseAfter * 60 * 1000); // Convert from minutes to milliseconds (30 seconds = 0.5 minutes)
          }
        });

        // Mark script as completed
        setTimeout(() => {
          setRpaExecutions(prev => prev.filter(exec => 
            !newExecutions.some(newExec => 
              newExec.profileId === exec.profileId && newExec.scriptId === exec.scriptId
            )
          ));
          rpaService.setScriptRunning(selectedRPAScript, false);
          
          if (scriptSuccessCount > 0) {
            toast.success(`RPA script "${script.name}" completed successfully on ${scriptSuccessCount} profiles!`);
          }
          if (scriptFailCount > 0) {
            toast.error(`RPA script failed on ${scriptFailCount} profiles`);
          }
        }, 1000);
      } else {
        toast.error('No profiles could be launched. Please check your profiles and try again.');
      }
      
    } catch (error) {
      console.error('Error in RPA script execution:', error);
      toast.error('Failed to execute RPA script');
    } finally {
      setIsLoading(false);
      setShowRPAModal(false);
      setSelectedRPAScript('');
      setSelectedProfiles([]);
      setRpaThreads(1);
    }
  };

  // Function to actually execute RPA scripts in profile browser windows
  const executeRPAScript = async (script: RPAScript, profile: Profile) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        console.log(`🤖 Executing RPA script "${script.name}" on profile "${profile.name}"`);
        
        // Check if profile browser window is actually open via Electron API
        if (window.electronAPI?.getProfileStatus) {
          const status = await window.electronAPI.getProfileStatus(profile.id);
          if (!status.isOpen) {
            throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
          }
        } else {
          // Fallback check for development mode
          if (!profile.isActive) {
            throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
          }
        }
        
        // Execute script in the actual profile browser window via Electron
        if (window.electronAPI?.executeRPAScript) {
          const result = await window.electronAPI.executeRPAScript(profile.id, script);
          
          if (result.success) {
            console.log(`✅ RPA script "${script.name}" completed successfully on profile "${profile.name}"`);
            resolve();
          } else {
            throw new Error(result.error || 'Script execution failed');
          }
        } else {
          // Fallback for development mode
          console.warn('⚠️ Electron API not available, using simulation mode');
          await executeScriptInBrowser(script, profile);
          resolve();
        }
        
      } catch (error) {
        console.error(`❌ RPA script "${script.name}" failed on profile "${profile.name}":`, error);
        reject(error);
      }
    });
  };

  // Execute script in browser (fallback for development)
  const executeScriptInBrowser = async (script: RPAScript, profile: Profile) => {
    return new Promise<void>((resolve, reject) => {
      try {
        console.log(`🌐 Executing RPA script in browser simulation mode for profile: ${profile.name}`);
        
        // Create a simplified execution environment
        const simulatedExecution = async () => {
          // Parse script to extract key actions
          const lines = script.code.split('\n');
          
          for (const line of lines) {
            if (line.trim().startsWith('await page.goto(')) {
              // FIXED: Corrected regex pattern to properly escape quotes
              const urlMatch = line.match(/goto\(["'](.*?)["']\)/);
              if (urlMatch) {
                console.log('🔗 Simulated navigation to:', urlMatch[1]);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } else if (line.trim().startsWith('await page.waitForTimeout(')) {
              const timeMatch = line.match(/waitForTimeout\((\d+)\)/);
              if (timeMatch) {
                const waitTime = parseInt(timeMatch[1]);
                console.log('⏱️ Simulated wait for:', waitTime + 'ms');
                await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 3000)));
              }
            } else if (line.trim().includes('console.log(')) {
              // FIXED: Corrected regex pattern to properly escape quotes
              const logMatch = line.match(/console\.log\(["'](.*?)["']\)/);
              if (logMatch) {
                console.log('📝 Script output:', logMatch[1]);
              }
            }
          }
          
          console.log('✅ Simulated script execution completed');
        };
        
        simulatedExecution().then(resolve).catch(reject);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleSelectAllProfiles = () => {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    if (selectedProfiles.length === safeProfiles.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(safeProfiles.map(p => p.id));
    }
  };

  const handleOpenAllProfiles = async () => {
    if (selectedProfiles.length === 0) {
      toast.error('No profiles selected');
      return;
    }

    console.log('🚀 BULK OPEN: Starting bulk profile launch for:', selectedProfiles.length, 'profiles');
    
    let successCount = 0;
    let failCount = 0;
    const safeProfiles = Array.isArray(profiles) ? profiles : [];

    try {
      // Track which profiles were successfully launched for immediate state updates
      const launchedProfiles: string[] = [];
      
      for (const profileId of selectedProfiles) {
        const profile = safeProfiles.find(p => p.id === profileId);
        if (profile) {
          try {
            console.log(`🚀 BULK OPEN: Launching profile ${profile.name} (${successCount + 1}/${selectedProfiles.length})`);
            
            // Check if profile is already open
            let isAlreadyOpen = false;
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              isAlreadyOpen = status.isOpen;
            } else {
              isAlreadyOpen = profile.isActive;
            }
            
            if (isAlreadyOpen) {
              console.log(`🚀 BULK OPEN: Profile ${profile.name} already open, skipping`);
              // Still mark as launched for status sync
              launchedProfiles.push(profileId);
              successCount++;
            } else {
              await handleLaunchProfile(profile);
              launchedProfiles.push(profileId);
              successCount++;
              console.log(`🚀 BULK OPEN: Successfully launched ${profile.name}`);
            }
            
            // Small delay between launches to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (error) {
            failCount++;
            console.error(`🚀 BULK OPEN: Failed to launch profile ${profile.name}:`, error);
          }
        }
      }

      // CRITICAL: Force immediate status update for all launched profiles
      if (launchedProfiles.length > 0) {
        console.log('🚀 BULK OPEN: Forcing immediate status sync for launched profiles:', launchedProfiles);
        
        // Update React state immediately for all launched profiles
        const updatedProfiles = safeProfiles.map(p => 
          launchedProfiles.includes(p.id) ? { ...p, isActive: true } : p
        );
        onProfilesChange(updatedProfiles);
        
        // Force localStorage update immediately
        localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        
        // Force status synchronization after a short delay
        setTimeout(async () => {
          console.log('🚀 BULK OPEN: Running forced status update...');
          await updateProfileStatuses();
        }, 2000);
      }

      if (successCount > 0) {
        toast.success(`Successfully launched ${successCount} profiles`);
      }
      if (failCount > 0) {
        toast.error(`Failed to launch ${failCount} profiles`);
      }
    } catch (error) {
      console.error('🚀 BULK OPEN: Exception occurred:', error);
      toast.error('Failed to launch selected profiles');
    } finally {
      setSelectedProfiles([]); // Clear selection after launching
    }
  };

  const handleCloseAllProfiles = async () => {
    if (selectedProfiles.length === 0) {
      toast.error('No profiles selected');
      return;
    }

    console.log('🔴 BULK CLOSE: Starting bulk profile close for:', selectedProfiles.length, 'profiles');
    
    let successCount = 0;
    let failCount = 0;
    const safeProfiles = Array.isArray(profiles) ? profiles : [];

    try {
      // Track which profiles were successfully closed for immediate state updates
      const closedProfiles: string[] = [];
      
      for (const profileId of selectedProfiles) {
        const profile = safeProfiles.find(p => p.id === profileId);
        if (profile) {
          try {
            // Check if profile is actually open before trying to close
            let isOpen = false;
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              isOpen = status.isOpen;
            } else {
              isOpen = profile.isActive;
            }
            
            if (isOpen) {
              console.log(`🔴 BULK CLOSE: Closing profile ${profile.name} (${successCount + 1}/${selectedProfiles.length})`);
              await handleCloseProfile(profile);
              closedProfiles.push(profileId);
              successCount++;
              console.log(`🔴 BULK CLOSE: Successfully closed ${profile.name}`);
              
              // Small delay between closes to prevent overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.log(`🔴 BULK CLOSE: Profile ${profile.name} already closed, skipping`);
              // Still count as success since desired state is achieved
              successCount++;
            }
          } catch (error) {
            failCount++;
            console.error(`🔴 BULK CLOSE: Failed to close profile ${profile.name}:`, error);
          }
        }
      }

      // CRITICAL: Force immediate status update for all closed profiles
      if (closedProfiles.length > 0) {
        console.log('🔴 BULK CLOSE: Forcing immediate status sync for closed profiles:', closedProfiles);
        
        // Update React state immediately for all closed profiles
        const updatedProfiles = safeProfiles.map(p => 
          closedProfiles.includes(p.id) ? { ...p, isActive: false } : p
        );
        onProfilesChange(updatedProfiles);
        
        // Force localStorage update immediately
        localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        
        // Force status synchronization after a short delay
        setTimeout(async () => {
          console.log('🔴 BULK CLOSE: Running forced status update...');
          await updateProfileStatuses();
        }, 1500);
      }

      if (successCount > 0) {
        toast.success(`Successfully closed ${successCount} profiles - all profiles remain saved in dashboard`);
      }
      if (failCount > 0) {
        toast.error(`Failed to close ${failCount} profiles`);
      }
      if (successCount === 0 && failCount === 0) {
        toast.info('No open profiles to close');
      }
    } catch (error) {
      console.error('🔴 BULK CLOSE: Exception occurred:', error);
      toast.error('Failed to close selected profiles');
    } finally {
      setSelectedProfiles([]); // Clear selection after closing
    }
  };

  const handleRPAAction = () => {
    if (selectedProfiles.length === 0) {
      toast.error('Please select profiles first');
      return;
    }
    
    // Debug localStorage before refreshing
    rpaService.debugLocalStorage();
    
    // Refresh RPA scripts before opening modal to get latest scripts
    try {
      const latestScripts = rpaService.getAllScripts();
      console.log('🔄 Refreshed RPA scripts, found:', latestScripts.length, 'scripts');
      console.log('📝 Script details:', latestScripts.map(s => ({ name: s.name, id: s.id, category: s.category })));
      setAvailableRPAScripts(latestScripts);
      console.log('✅ Set available RPA scripts state');
    } catch (error) {
      console.warn('Failed to refresh RPA scripts:', error);
    }
    
    setShowRPAModal(true);
  };

  const handleProfileSelection = (profileId: string, checked: boolean) => {
    if (checked) {
      setSelectedProfiles(prev => [...prev, profileId]);
    } else {
      setSelectedProfiles(prev => prev.filter(id => id !== profileId));
    }
  };

  const copyProxyToClipboard = (profile: Profile) => {
    if (!profile.proxy?.host) return;
    
    const proxyString = profile.proxy.username 
      ? `${profile.proxy.username}:${profile.proxy.password}@${profile.proxy.host}:${profile.proxy.port}`
      : `${profile.proxy.host}:${profile.proxy.port}`;
    
    navigator.clipboard.writeText(proxyString);
    toast.success('Proxy copied to clipboard');
  };

  const formatProxyDisplay = (profile: Profile) => {
    if (!profile.proxy?.host) return 'No Proxy';
    return `${profile.proxy.host}:${profile.proxy.port}`;
  };

  const getDeviceIcon = (profile: Profile) => {
    if (profile.userAgent?.includes('Mobile')) return <Smartphone className="h-4 w-4" />;
    if (profile.userAgent?.includes('Tablet')) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getRunningRPAScript = (profileId: string) => {
    const execution = rpaExecutions.find(exec => exec.profileId === profileId && exec.status === 'running');
    if (!execution) return null;
    
    const script = rpaService.getScriptById(execution.scriptId);
    return script ? { script, execution } : null;
  };


  const handleRefreshProfiles = async () => {
    setIsLoading(true);
    try {
      // Force update profile statuses
      await updateProfileStatuses();
      toast.success('Profile list refreshed');
    } catch (error) {
      console.error('Failed to refresh profiles:', error);
      toast.error('Failed to refresh profile list');
    } finally {
      setIsLoading(false);
    }
  };

  const safeProfiles = Array.isArray(profiles) ? profiles : [];

  return (
    <div className="container mx-auto p-6 space-y-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen rounded-xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl shadow-lg">
        <div>  
          <h1 className="text-3xl font-bold flex items-center gap-3">
            👥 Profile Manager
          </h1>
          <p className="text-indigo-100 mt-1">Manage antidetection browser profiles with proxy support and RPA automation</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleRefreshProfiles} 
            variant="outline"
            className="border-white/30 text-black hover:bg-white/20"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsBulkCreateOpen(true)} 
            className="bg-white text-purple-600 hover:bg-gray-100"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Bulk Create
          </Button>
          <Button 
            onClick={handleCreateProfile} 
            className="bg-white text-indigo-600 hover:bg-gray-100"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Profile
          </Button>
        </div>
      </div>

      {/* Profile Selection Controls */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-t-lg">
          <CardTitle className="text-blue-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎯 Profile Selection & Actions
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllProfiles}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                disabled={isLoading}
              >
                {selectedProfiles.length === safeProfiles.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenAllProfiles}
                disabled={selectedProfiles.length === 0 || isLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Open All ({selectedProfiles.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseAllProfiles}
                disabled={selectedProfiles.length === 0 || isLoading}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                title="Close browser windows for selected profiles (profiles will remain in dashboard)"
              >
                <Square className="w-4 h-4 mr-2" />
                Close All Browsers ({selectedProfiles.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelectedProfiles}
                disabled={selectedProfiles.length === 0 || isLoading}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                title="Permanently delete selected profiles (cannot be undone)"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Profiles ({selectedProfiles.length})
              </Button>
              <Button
                onClick={handleRPAAction}
                disabled={selectedProfiles.length === 0 || isLoading}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
              >
                <Bot className="w-4 h-4 mr-2" />
                Run RPA ({selectedProfiles.length})
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg border border-blue-200">
              <Label className="text-blue-700 font-medium flex items-center gap-2">
                📈 Total Profiles
              </Label>
              <p className="text-3xl font-bold text-blue-800">{safeProfiles.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-lg border border-green-200">
              <Label className="text-green-700 font-medium flex items-center gap-2">
                ✅ Selected Profiles
              </Label>
              <p className="text-3xl font-bold text-green-800">{selectedProfiles.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-4 rounded-lg border border-purple-200">
              <Label className="text-purple-700 font-medium flex items-center gap-2">
                🤖 Available Scripts
              </Label>
              <p className="text-3xl font-bold text-purple-800">{availableRPAScripts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Indicator - Only show during actual creation, not for other operations */}
      {isLoading && (isBulkCreateOpen || isCreateModalOpen) && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-100 border-orange-300 shadow-lg">
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-orange-600 mr-3" />
            <p className="text-orange-700 font-medium">🚀 Creating profiles, please wait...</p>
          </CardContent>
        </Card>
      )}

      {/* Profiles List */}
      <div className="space-y-3">
        {isEditing ? (
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Edit Profile</CardTitle>
              <CardDescription className="text-gray-600">
                Configure profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {formErrors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-gray-700">Profile Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter profile name"
                    className="bg-white border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-proxyType" className="text-gray-700">Proxy Type</Label>
                  <Select
                    value={formData.proxyType || 'none'}
                    onValueChange={(value: 'none' | 'http' | 'https' | 'socks5') => 
                      setFormData(prev => ({ ...prev, proxyType: value }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">No Proxy</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-startingUrl" className="text-gray-700">Starting URL (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-gray-500" />
                    <Input
                      id="edit-startingUrl"
                      value={formData.startingUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, startingUrl: e.target.value }))}
                      placeholder="Enter URL (optional)"
                      className="bg-white border-gray-300"
                    />
                  </div>
                </div>

                {/* REMOVED: Timezone input field - now auto-detected from proxy IP */}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-notes" className="text-gray-700">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes about this profile"
                    rows={3}
                    className="bg-white border-gray-300"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-700">
                  Update Profile
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="border-gray-300">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {safeProfiles.length === 0 ? (
              <Card className="bg-white border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No profiles found</p>
                  <Button onClick={handleCreateProfile} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Profile
                  </Button>
                </CardContent>
              </Card>
            ) : (
              safeProfiles.map((profile) => {
                const status = profileStatuses.get(profile.id);
                const testResult = testResults.get(profile.id);
                const runningRPA = getRunningRPAScript(profile.id);
                const isClearing = clearingProfiles.has(profile.id);
                
                return (
                  <Card key={profile.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedProfiles.includes(profile.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProfiles(prev => [...prev, profile.id]);
                              } else {
                                setSelectedProfiles(prev => prev.filter(id => id !== profile.id));
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(profile)}
                              <h3 className="text-lg font-semibold text-gray-900 truncate">{profile.name}</h3>
                            </div>
                            <Badge variant={profile.isActive ? 'default' : 'secondary'} className="shrink-0">
                              {profile.isActive ? 'Running' : 'Stopped'}
                            </Badge>
                            {runningRPA && (
                              <Badge variant="outline" className="text-purple-600 border-purple-300 shrink-0">
                                <Bot className="h-3 w-3 mr-1" />
                                {runningRPA.script.name}
                              </Badge>
                            )}
                            {isClearing && (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 shrink-0">
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Clearing...
                              </Badge>
                            )}
                            {profile.tags?.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs shrink-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-medium">Proxy:</span>
                              <span className="font-mono text-gray-900 truncate">
                                {formatProxyDisplay(profile)}
                              </span>
                              {profile.proxy?.host && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyProxyToClipboard(profile)}
                                  className="p-1 h-6 w-6"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium">Platform:</span>
                              <span className="ml-1 text-gray-900">{getPlatformDisplayInfo(profile.userAgentPlatform).name}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {getPlatformDisplayInfo(profile.userAgentPlatform).viewport}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium">Type:</span>
                              <span className="ml-1 text-gray-900">{profile.proxyType?.toUpperCase() || 'None'}</span>
                            </div>
                            {/* REMOVED: Timezone display - now handled automatically */}
                            <div className="flex items-center gap-1">
                              <Link className="h-3 w-3 text-gray-500" />
                              <span className="text-gray-500 font-medium">URL:</span>
                              <span className="ml-1 text-gray-900 truncate">
                                {profile.startingUrl || 'None'}
                              </span>
                            </div>
                          </div>

                          {testResult && (
                            <div className="mt-2 flex items-center gap-2">
                              {testResult.success ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm">Proxy OK - IP: {testResult.ip}{testResult.timezone ? `, Timezone: ${testResult.timezone}` : ''}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm">Proxy Error: {testResult.error}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {runningRPA && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center gap-1 text-purple-600">
                                <Bot className="w-4 h-4 animate-pulse" />
                                <span className="text-sm">
                                  Running {runningRPA.script.name} with {runningRPA.execution.threads} threads
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4 flex-wrap">
                          {/* NEW: Cache clearing buttons */}
                          {profile.isActive && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClearCache(profile)}
                                disabled={isClearing}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                title="Clear cache for this profile"
                              >
                                <HardDrive className="w-4 h-4 mr-1" />
                                Cache
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClearCookies(profile)}
                                disabled={isClearing}
                                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                                title="Clear cookies for this profile"
                              >
                                <Cookie className="w-4 h-4 mr-1" />
                                Cookies
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClearHistory(profile)}
                                disabled={isClearing}
                                className="border-purple-300 text-purple-600 hover:bg-purple-50"
                                title="Clear history for this profile"
                              >
                                <History className="w-4 h-4 mr-1" />
                                History
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDataClearModal(profile)}
                                disabled={isClearing}
                                className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                                title="Clear selected data types"
                              >
                                <Database className="w-4 h-4 mr-1" />
                                Clear Data
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClearAllData(profile)}
                                disabled={isClearing}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                title="Clear all browsing data"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Clear All
                              </Button>
                            </>
                          )}

                          {profile.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloseProfile(profile)}
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                              title="Close browser window (profile will remain in dashboard)"
                            >
                              <Square className="w-4 h-4 mr-1" />
                              Close Browser
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleLaunchProfile(profile)}
                              className="bg-green-600 hover:bg-green-700"
                              title="Launch browser window for this profile"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Launch
                            </Button>
                          )}
                          
                          {profile.proxy?.host && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestProxy(profile)}
                              className="border-gray-300"
                              title="Test proxy connection"
                            >
                              <TestTube className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProfile(profile)}
                            className="border-gray-300"
                            title="Edit profile settings"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProfile(profile)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            title="Permanently delete this profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* NEW: Data Clear Modal */}
      {showDataClearModal && selectedProfileForClear && (
        <Dialog open={showDataClearModal} onOpenChange={setShowDataClearModal}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">Clear Profile Data</DialogTitle>
              <DialogDescription className="text-gray-600">
                Select which data types to clear for profile "{selectedProfileForClear.name}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-gray-700 font-medium">Select Data Types to Clear:</Label>
                
                {[
                  { id: 'cache', label: 'Cache', icon: HardDrive, description: 'Temporary files and images' },
                  { id: 'cookies', label: 'Cookies', icon: Cookie, description: 'Login sessions and preferences' },
                  { id: 'history', label: 'History', icon: History, description: 'Browsing history' },
                  { id: 'downloads', label: 'Downloads', icon: Database, description: 'Download history' },
                  { id: 'formdata', label: 'Form Data', icon: Database, description: 'Saved form inputs' },
                  { id: 'passwords', label: 'Passwords', icon: Database, description: 'Saved passwords' }
                ].map((dataType) => {
                  const IconComponent = dataType.icon;
                  return (
                    <div key={dataType.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={dataType.id}
                        checked={selectedDataTypes.includes(dataType.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDataTypes(prev => [...prev, dataType.id]);
                          } else {
                            setSelectedDataTypes(prev => prev.filter(id => id !== dataType.id));
                          }
                        }}
                      />
                      <IconComponent className="h-4 w-4 text-gray-500" />
                      <div className="flex-1">
                        <Label htmlFor={dataType.id} className="text-gray-700 cursor-pointer font-medium">
                          {dataType.label}
                        </Label>
                        <p className="text-xs text-gray-500">{dataType.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  ⚠️ This action cannot be undone. Selected data will be permanently removed from this profile.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setShowDataClearModal(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleClearSelectedData}
                disabled={selectedDataTypes.length === 0 || clearingProfiles.has(selectedProfileForClear.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {clearingProfiles.has(selectedProfileForClear.id) ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Selected Data ({selectedDataTypes.length})
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Profile Modal */}
      <CreateProfileModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProfileCreated={handleProfileCreated}
      />

      {/* Bulk Create Sheet - slides from right */}
      {isBulkCreateOpen && (
        <Sheet open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
          <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-y-auto overflow-x-hidden bg-white">
            <SheetHead>
              <SheetTtl className="text-lg font-bold text-gray-900">Bulk Create Profiles</SheetTtl>
              <SheetDesc className="text-gray-600 text-sm">
                Create multiple profiles with automated settings. Timezone will be auto-detected from proxy IP.
              </SheetDesc>
            </SheetHead>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 text-sm">Browser Type</Label>
                <Select 
                  value={bulkSettings.browserType}
                  onValueChange={(value: any) => setBulkSettings(prev => ({ ...prev, browserType: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="beast">BeastBrowser (Electron)</SelectItem>
                    <SelectItem value="anti">Anti-Browser (Puppeteer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700 text-sm">Number of Profiles</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bulkSettings.count}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setBulkSettings(prev => ({ ...prev, count: value }));
                    }}
                    onInput={(e) => {
                      const value = parseInt((e.target as HTMLInputElement).value) || 1;
                      setBulkSettings(prev => ({ ...prev, count: value }));
                    }}
                    onFocus={(e) => e.target.focus()}
                    className="bg-white border-gray-300"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 text-sm">Name Prefix</Label>
                  <Input
                    value={bulkSettings.namePrefix}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBulkSettings(prev => ({ ...prev, namePrefix: value }));
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLInputElement).value;
                      setBulkSettings(prev => ({ ...prev, namePrefix: value }));
                    }}
                    onFocus={(e) => e.target.focus()}
                    className="bg-white border-gray-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700 text-sm">Starting URL (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-gray-500" />
                  <Input
                    value={bulkSettings.startingUrl}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBulkSettings(prev => ({ ...prev, startingUrl: value }));
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLInputElement).value;
                      setBulkSettings(prev => ({ ...prev, startingUrl: value }));
                    }}
                    onFocus={(e) => e.target.focus()}
                    placeholder="Enter starting URL (optional)"
                    className="bg-white border-gray-300"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">URL that will open when profile launches</p>
              </div>

              <div>
                <Label className="text-gray-700 mb-2 block text-sm">Select Multiple Platforms</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availablePlatforms.map(platform => (
                    <div key={platform.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-${platform.id}`}
                        checked={bulkSettings.selectedPlatforms.includes(platform.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkSettings(prev => ({ 
                              ...prev, 
                              selectedPlatforms: [...prev.selectedPlatforms, platform.id] 
                            }));
                          } else {
                            setBulkSettings(prev => ({ 
                              ...prev, 
                              selectedPlatforms: prev.selectedPlatforms.filter(id => id !== platform.id) 
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`bulk-${platform.id}`} className="text-gray-700 cursor-pointer text-sm">
                        {platform.icon} {platform.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Profiles will rotate through selected platforms</p>
              </div>

              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <Label className="text-gray-700 font-medium text-sm">Random Fingerprints</Label>
                  <p className="text-xs text-gray-500">Generate unique fingerprints for each profile</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="randomize-fingerprints"
                    checked={bulkSettings.randomizeFingerprints}
                    onCheckedChange={(checked) => 
                      setBulkSettings(prev => ({ ...prev, randomizeFingerprints: checked as boolean }))
                    }
                  />
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </div>
              </div>

              <div>
                <Label className="text-gray-700 text-sm">Proxy Configuration</Label>
                <Select 
                  value={bulkSettings.proxyType} 
                  onValueChange={(value: any) => setBulkSettings(prev => ({ ...prev, proxyType: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">No Proxy</SelectItem>
                    <SelectItem value="saved">Use Saved Proxy</SelectItem>
                    <SelectItem value="http">HTTP Proxy</SelectItem>
                    <SelectItem value="https">HTTPS Proxy</SelectItem>
                    <SelectItem value="socks5">SOCKS5 Proxy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkSettings.proxyType === 'saved' && (
                <div>
                  <Label className="text-gray-700">Select Saved Proxy</Label>
                  <Select 
                    value={bulkSettings.selectedSavedProxy} 
                    onValueChange={(value) => setBulkSettings(prev => ({ ...prev, selectedSavedProxy: value }))}
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Choose a saved proxy..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {savedProxies.filter(p => p.status === 'active').map((proxy) => (
                        <SelectItem key={proxy.id} value={proxy.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{proxy.type?.toUpperCase()}</Badge>
                            {proxy.host}:{proxy.port}
                          </div>
                        </SelectItem>
                      ))}
                      {savedProxies.filter(p => p.status === 'active').length === 0 && (
                        <SelectItem value="" disabled>No active proxies available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">Timezone will be auto-detected from proxy IP</p>
                </div>
              )}

              {bulkSettings.proxyType !== 'none' && bulkSettings.proxyType !== 'saved' && (
                <div>
                  <Label className="text-gray-700">Proxy List (One per line)</Label>
                  <Textarea
                    value={bulkSettings.bulkProxyInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBulkSettings(prev => ({ ...prev, bulkProxyInput: value }));
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLTextAreaElement).value;
                      setBulkSettings(prev => ({ ...prev, bulkProxyInput: value }));
                    }}
                    onFocus={(e) => e.target.focus()}
                    placeholder={`Enter proxies one per line:
127.0.0.1:8080
127.0.0.1:8081:user:pass
user:pass@127.0.0.1:8082
http://user:pass@127.0.0.1:8083`}
                    className="bg-white border-gray-300 font-mono text-sm"
                    rows={6}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: host:port, host:port:user:pass, user:pass@host:port, protocol://user:pass@host:port
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsBulkCreateOpen(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkCreateProfiles}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={bulkSettings.selectedPlatforms.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create {bulkSettings.count} Profiles</>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* RPA Modal */}
      {showRPAModal && (
        <Dialog open={showRPAModal} onOpenChange={setShowRPAModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">Choose RPA Script</DialogTitle>
              <DialogDescription className="text-gray-600">
                Select an RPA script to run on {selectedProfiles.length} selected profiles
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Script Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-gray-700 font-medium">Available RPA Scripts</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      try {
                        console.log('🔄 Manual refresh button clicked');
                        rpaService.debugLocalStorage();
                        const latestScripts = rpaService.getAllScripts();
                        console.log('🔄 Manual refresh found:', latestScripts.length, 'scripts');
                        console.log('📝 Manual refresh script details:', latestScripts.map(s => ({ name: s.name, id: s.id })));
                        setAvailableRPAScripts(latestScripts);
                        toast.success(`Refreshed! Found ${latestScripts.length} RPA scripts`);
                      } catch (error) {
                        console.error('❌ Manual refresh failed:', error);
                        toast.error('Failed to refresh scripts');
                      }
                    }}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Scripts
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      localStorage.removeItem('antidetect_rpa_scripts');
                      toast.info('Cleared localStorage - refresh to see defaults');
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    🗑️ Clear Storage
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Direct localStorage inspection
                      const rawData = localStorage.getItem('antidetect_rpa_scripts');
                      console.log('🕵️ RAW localStorage data:', rawData);
                      
                      if (rawData) {
                        try {
                          const parsed = JSON.parse(rawData);
                          console.log('✅ Parsed successfully:', parsed);
                          alert(`Found ${parsed.length} scripts in localStorage:\n${parsed.map(s => `- ${s.name} (${s.category})`).join('\n')}`);
                        } catch (e) {
                          console.error('❌ Parse error:', e);
                          alert('Error parsing localStorage data: ' + e.message);
                        }
                      } else {
                        alert('No RPA scripts found in localStorage');
                      }
                    }}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    🔍 Inspect Storage
                  </Button>
                </div>
                
                {/* Debug info */}
                <div className="text-xs text-gray-500 mb-2">
                  🔍 Debug: Showing {availableRPAScripts.length} scripts in state
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableRPAScripts.map((script) => {
                  console.log('📄 Rendering script:', script.name, script.id);
                  return (
                    <Card 
                      key={script.id} 
                      className={`cursor-pointer transition-all ${
                        selectedRPAScript === script.id 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedRPAScript(script.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{script.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{script.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{script.description}</p>
                            <Badge variant="outline" className="text-xs">
                              {script.category}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                  {availableRPAScripts.length === 0 && (
                    <div className="col-span-2 text-center text-gray-500 py-8">
                      No RPA scripts available. Create scripts in the RPA Manager first.
                    </div>
                  )}
                </div>
              </div>

              {selectedRPAScript && (
                <>
                  <Card className="bg-gray-50 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900 text-sm">🧵 Threads Configuration</CardTitle>
                      <p className="text-xs text-gray-600">Configure how many profiles run simultaneously</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="rpa-threads" className="text-gray-700">Concurrent Profiles (Threads)</Label>
                          <Input
                            id="rpa-threads"
                            type="number"
                            min="1"
                            value={rpaThreads}
                            onChange={(e) => setRpaThreads(Math.max(1, parseInt(e.target.value) || 1))}
                            className="bg-white border-gray-300"
                          />
                          <p className="text-xs text-gray-500 mt-1">Unlimited - run as many profiles as you want simultaneously</p>
                        </div>
                        <div>
                          <Label htmlFor="execution-delay" className="text-gray-700">Delay Between Batches (seconds)</Label>
                          <Input
                            id="execution-delay"
                            type="number"
                            min="30"
                            value={Math.round(autoCloseAfter * 60)}
                            onChange={(e) => setAutoCloseAfter(Math.max(30, parseInt(e.target.value) || 30) / 60)}
                            className="bg-white border-gray-300"
                          />
                          <p className="text-xs text-gray-500 mt-1">Minimum 30 seconds between profile batches</p>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Bot className="w-4 h-4" />
                          <span className="font-medium">Execution Plan:</span>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                          Will process {selectedProfiles.length} profiles with {rpaThreads} running concurrently.
                          Estimated batches: {Math.ceil(selectedProfiles.length / rpaThreads)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setShowRPAModal(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRunRPAScript}
                disabled={!selectedRPAScript}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Bot className="w-4 h-4 mr-2" />
                Start RPA Script on {selectedProfiles.length} Profiles
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProfileManager;