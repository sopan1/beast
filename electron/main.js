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

// CRITICAL: Override app name to hide Electron
app.setName('Google Chrome');
app.setVersion('121.0.6167.139');

// Override process title to hide Electron
process.title = 'Google Chrome';

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
    titleBarStyle: 'default',
    title: 'Google Chrome'
  });

  // Override user agent for main window
  mainWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

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
    log.info('BeastBrowser main window ready - Electron name hidden');
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
          label: 'About Google Chrome',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Google Chrome',
              message: 'Google Chrome v121.0.6167.139',
              detail: 'Advanced Web Browser with Enhanced Privacy Features'
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

// FIXED: Profile opening with proper fingerprint injection
ipcMain.handle('profiles:open', async (event, profile, options = {}) => {
  try {
    log.info('Opening profile:', profile, options);
    
    // Determine platform for proper browser name spoofing
    const platform = profile.platform || 'windows';
    let browserName = 'Google Chrome';
    
    if (platform === 'macos') {
      browserName = 'Google Chrome';
    } else if (platform === 'android') {
      browserName = 'Chrome Mobile';
    } else if (platform === 'ios') {
      browserName = 'Safari';
    }
    
    // Get platform-specific profile data
    const platformProfile = fingerprintManager.fingerprintProfiles[platform] || fingerprintManager.fingerprintProfiles.windows;
    const selectedProfile = {
      platform: fingerprintManager.selectRandom(platformProfile.platforms),
      vendor: fingerprintManager.selectRandom(platformProfile.vendors),
      userAgent: profile.userAgent || fingerprintManager.selectRandom(platformProfile.userAgents),
      screen: profile.screen || fingerprintManager.selectRandom(platformProfile.screens),
      webglVendor: fingerprintManager.selectRandom(platformProfile.webgl.vendors),
      webglRenderer: fingerprintManager.selectRandom(platformProfile.webgl.renderers),
      hardwareConcurrency: fingerprintManager.selectRandom(platformProfile.hardwareConcurrency),
      deviceMemory: fingerprintManager.selectRandom(platformProfile.deviceMemory),
      languages: fingerprintManager.selectRandom(platformProfile.languages),
      maxTouchPoints: platformProfile.maxTouchPoints || 0,
      timezone: 'America/New_York',
      timezoneOffset: -300
    };
    
    // Create new browser window with enhanced fingerprint spoofing
    const browserWindow = new BrowserWindow({
      width: selectedProfile.screen.width,
      height: selectedProfile.screen.height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: path.join(__dirname, 'enhanced-webview-preload.js')
      },
      show: false,
      title: browserName,
      titleBarStyle: 'default'
    });

    // Set proper user agent
    browserWindow.webContents.setUserAgent(selectedProfile.userAgent);

    // CRITICAL: Inject profile data into the page before loading
    browserWindow.webContents.on('dom-ready', () => {
      const profileScript = `
        try {
          sessionStorage.setItem('beastbrowser_profile', ${JSON.stringify(JSON.stringify(selectedProfile))});
          console.log('🎯 Profile data injected:', ${JSON.stringify(selectedProfile)});
        } catch (error) {
          console.error('Failed to inject profile data:', error);
        }
      `;
      browserWindow.webContents.executeJavaScript(profileScript);
    });

    const url = options.url || profile?.startingUrl || 'https://google.com';
    browserWindow.loadURL(url);
    
    browserWindow.once('ready-to-show', () => {
      browserWindow.show();
    });

    log.info('Profile browser window opened with fingerprint spoofing:', profile.id);
    return { success: true, message: 'Profile opened successfully' };
    
  } catch (error) {
    log.error('Failed to open profile:', error);
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
    
    // Determine browser name based on platform
    const platform = profile?.platform || 'windows';
    let browserName = 'Google Chrome';
    
    if (platform === 'android') {
      browserName = 'Chrome Mobile';
    } else if (platform === 'ios') {
      browserName = 'Safari';
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
      show: false,
      title: browserName
    });

    // Set proper user agent
    if (profile) {
      const platformProfile = fingerprintManager.fingerprintProfiles[platform] || fingerprintManager.fingerprintProfiles.windows;
      const userAgent = profile.userAgent || platformProfile.userAgents[0];
      browserWindow.webContents.setUserAgent(userAgent);
    }

    browserWindow.loadURL(url);
    
    browserWindow.once('ready-to-show', () => {
      browserWindow.show();
    });

    log.info('Browser session launched with hidden Electron name:', { profileId, url });
    return { success: true, message: 'Browser session launched' };
    
  } catch (error) {
    log.error('Failed to launch browser session:', error);
    return { success: false, error: error.message };
  }
});

// Proxy management
ipcMain.handle('test-proxy', async (event, proxyConfig) => {
  try {
    log.info('Testing proxy:', proxyConfig);
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

// App info - HIDE ELECTRON
ipcMain.handle('get-app-info', async () => {
  return {
    version: '121.0.6167.139',
    name: 'Google Chrome',
    platform: process.platform,
    arch: process.arch,
    electronVersion: undefined,
    nodeVersion: undefined,
    chromeVersion: '121.0.6167.139'
  };
});

log.info('Google Chrome Enhanced Edition started - Electron name hidden');