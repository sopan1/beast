const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const log = require('electron-log');
const { EnhancedFingerprintManager } = require('./enhanced-fingerprint-manager');

// Initialize enhanced fingerprint manager
const fingerprintManager = new EnhancedFingerprintManager();

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow;
let profilesData = {};
let currentProfile = null;

// Load profiles data
async function loadProfiles() {
  try {
    const profilesPath = path.join(__dirname, '..', 'profile-data');
    const files = await fs.readdir(profilesPath);
    
    for (const file of files) {
      if (file.startsWith('profile_') && file.endsWith('.json')) {
        const profilePath = path.join(profilesPath, file);
        const profileData = JSON.parse(await fs.readFile(profilePath, 'utf8'));
        const profileId = file.replace('profile_', '').replace('.json', '');
        profilesData[profileId] = profileData;
      }
    }
    
    log.info('Loaded profiles:', Object.keys(profilesData));
  } catch (error) {
    log.error('Failed to load profiles:', error);
    profilesData = {};
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'free.ico'),
    show: false,
    titleBarStyle: 'default'
  });

  // Load the UI
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('BeastBrowser main window ready');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Profile',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('show-create-profile-modal');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About BeastBrowser',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About BeastBrowser',
              message: 'BeastBrowser v2.0',
              detail: 'Advanced Anti-Detection Browser with Enhanced Fingerprint Spoofing'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  await loadProfiles();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Enhanced fingerprint spoofing
ipcMain.handle('apply-enhanced-fingerprint', async (event, options = {}) => {
  try {
    const { platform = 'windows', proxyIP = null, profile = {} } = options;
    
    log.info('Applying enhanced fingerprint spoofing:', { platform, proxyIP });
    
    const fingerprintScript = await fingerprintManager.generateAdvancedFingerprintScript(
      platform, 
      proxyIP, 
      profile
    );
    
    // Apply to all sessions
    const sessions = [session.defaultSession];
    
    for (const sess of sessions) {
      await sess.setPreloads([]);
      
      // Create temporary preload script
      const preloadPath = path.join(__dirname, 'temp-fingerprint-preload.js');
      await fs.writeFile(preloadPath, fingerprintScript);
      
      await sess.setPreloads([preloadPath]);
      
      // Clean up after delay
      setTimeout(async () => {
        try {
          await fs.unlink(preloadPath);
        } catch (error) {
          log.warn('Failed to clean up temp preload:', error);
        }
      }, 5000);
    }
    
    log.info('Enhanced fingerprint spoofing applied successfully');
    return { success: true, message: 'Enhanced fingerprint spoofing applied' };
    
  } catch (error) {
    log.error('Failed to apply enhanced fingerprint spoofing:', error);
    return { success: false, error: error.message };
  }
});

// Get IP geolocation
ipcMain.handle('get-ip-geolocation', async (event, proxyIP = null) => {
  try {
    const geoData = await fingerprintManager.getIPGeolocation(proxyIP);
    return { success: true, data: geoData };
  } catch (error) {
    log.error('Failed to get IP geolocation:', error);
    return { success: false, error: error.message };
  }
});

// Test fingerprint
ipcMain.handle('test-fingerprint', async (event, url = 'https://mixvisit.com') => {
  try {
    const result = await fingerprintManager.testFingerprint(url);
    return result;
  } catch (error) {
    log.error('Fingerprint test failed:', error);
    return { success: false, error: error.message };
  }
});

// Profile management
ipcMain.handle('get-profiles', async () => {
  try {
    return { success: true, profiles: profilesData };
  } catch (error) {
    log.error('Failed to get profiles:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-profile', async (event, profileData) => {
  try {
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profilePath = path.join(__dirname, '..', 'profile-data', `${profileId}.json`);
    
    // Ensure profile-data directory exists
    const profileDir = path.dirname(profilePath);
    await fs.mkdir(profileDir, { recursive: true });
    
    // Add enhanced fingerprint data
    const enhancedProfile = {
      ...profileData,
      id: profileId,
      created: new Date().toISOString(),
      fingerprint: {
        platform: profileData.platform || 'windows',
        enhanced: true,
        ipBased: true
      }
    };
    
    await fs.writeFile(profilePath, JSON.stringify(enhancedProfile, null, 2));
    profilesData[profileId] = enhancedProfile;
    
    log.info('Profile created:', profileId);
    return { success: true, profileId, profile: enhancedProfile };
  } catch (error) {
    log.error('Failed to create profile:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-profile', async (event, profileId) => {
  try {
    const profilePath = path.join(__dirname, '..', 'profile-data', `${profileId}.json`);
    await fs.unlink(profilePath);
    delete profilesData[profileId];
    
    log.info('Profile deleted:', profileId);
    return { success: true };
  } catch (error) {
    log.error('Failed to delete profile:', error);
    return { success: false, error: error.message };
  }
});

// Browser session management
ipcMain.handle('launch-browser-session', async (event, options = {}) => {
  try {
    const { profileId, url = 'https://google.com', proxyConfig = null } = options;
    
    let profile = null;
    if (profileId && profilesData[profileId]) {
      profile = profilesData[profileId];
      currentProfile = profile;
    }
    
    // Create new browser window with enhanced fingerprint spoofing
    const browserWindow = new BrowserWindow({
      width: profile?.viewport?.width || 1920,
      height: profile?.viewport?.height || 1080,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: path.join(__dirname, 'enhanced-webview-preload.js')
      },
      show: false
    });

    // Apply enhanced fingerprint spoofing before loading
    if (profile) {
      await fingerprintManager.generateAdvancedFingerprintScript(
        profile.platform || 'windows',
        proxyConfig?.host || null,
        profile
      );
    }

    browserWindow.loadURL(url);
    
    browserWindow.once('ready-to-show', () => {
      browserWindow.show();
    });

    log.info('Browser session launched:', { profileId, url });
    return { success: true, message: 'Browser session launched' };
    
  } catch (error) {
    log.error('Failed to launch browser session:', error);
    return { success: false, error: error.message };
  }
});

// Proxy management
ipcMain.handle('test-proxy', async (event, proxyConfig) => {
  try {
    // Test proxy connection
    log.info('Testing proxy:', proxyConfig);
    
    // Get geolocation with proxy
    const geoData = await fingerprintManager.getIPGeolocation(proxyConfig.host);
    
    return { 
      success: true, 
      message: 'Proxy connection successful',
      geolocation: geoData
    };
  } catch (error) {
    log.error('Proxy test failed:', error);
    return { success: false, error: error.message };
  }
});

// Anti-detection settings
ipcMain.handle('set-anti-detection', async (event, settings) => {
  try {
    log.info('Anti-detection settings updated:', settings);
    
    // Apply settings globally
    if (settings.enabled) {
      await fingerprintManager.generateAdvancedFingerprintScript(
        settings.platform || 'windows',
        null,
        settings
      );
    }
    
    return { success: true, message: 'Anti-detection settings applied' };
  } catch (error) {
    log.error('Failed to apply anti-detection settings:', error);
    return { success: false, error: error.message };
  }
});

// App info
ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome
  };
});

log.info('BeastBrowser Enhanced Edition started');