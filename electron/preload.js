const { contextBridge, ipcRenderer } = require('electron');

// Enhanced BeastBrowser API with advanced anti-detection and proxy support
contextBridge.exposeInMainWorld('electronAPI', {
  // Profile management
  openProfile: (profile) => ipcRenderer.invoke('profiles:open', profile),
  closeProfile: (profileId) => ipcRenderer.invoke('profiles:close', profileId),
  closeAllProfiles: () => ipcRenderer.invoke('profiles:close-all'),
  getProfileStatus: (profileId) => ipcRenderer.invoke('profiles:get-status', profileId),
  
  // Enhanced RPA script execution
  executeRPAScript: (profileId, script) => ipcRenderer.invoke('rpa:execute-script', profileId, script),
  executeRPASteps: (scriptId, steps, profileId) => ipcRenderer.invoke('rpa:execute', scriptId, steps, profileId),
  
  // Enhanced proxy testing and management
  testProxy: (proxyConfig) => ipcRenderer.invoke('proxy:test', proxyConfig),
  setProxy: (proxyConfig) => ipcRenderer.invoke('proxy:set', proxyConfig),
  getProxyConfig: () => ipcRenderer.invoke('proxy:get'),
  setAntiDetection: (config) => ipcRenderer.invoke('anti-detection:set', config),
  getAntiDetectionConfig: () => ipcRenderer.invoke('anti-detection:get'),
  
  // Profile logging
  getProfileLogs: (profileId) => ipcRenderer.invoke('profiles:get-logs', profileId),
  clearProfileLogs: (profileId) => ipcRenderer.invoke('profiles:clear-logs', profileId),
  
  // System information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // File operations
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  
  // Navigation for browser windows
  navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
  
  // Navigation listener
  onNavigateToProfiles: (callback) => {
    ipcRenderer.on('navigate-to-profiles', callback);
  },
  
  // Anti-Browser (Puppeteer)
  antiBrowserOpen: (profile, options) => ipcRenderer.invoke('antiBrowser:open', profile, options || {}),
  antiBrowserClose: (profileId) => ipcRenderer.invoke('antiBrowser:close', profileId),
  
  // Profile window events
  onProfileWindowClosed: (callback) => {
    ipcRenderer.on('profile-window-closed', callback);
  },
  
  // Data clearing events
  onDataCleared: (callback) => {
    ipcRenderer.on('data-cleared', callback);
  },
  
  // Proxy settings events
  onShowProxySettings: (callback) => {
    ipcRenderer.on('show-proxy-settings', callback);
  },
  
  // Anti-detection settings events
  onShowAntiDetectionSettings: (callback) => {
    ipcRenderer.on('show-anti-detection-settings', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

console.log('🦁 BeastBrowser Enhanced Preload Script loaded successfully');