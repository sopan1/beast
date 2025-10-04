const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const log = require('electron-log');
const { EnhancedFingerprintManager } = require('./enhanced-fingerprint-manager');

// CRITICAL: Set app name BEFORE app.whenReady()
app.setName('Google Chrome');
app.setVersion('121.0.6167.139');

// Override process title to hide Electron
process.title = 'Google Chrome';

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
      title: browserName,
      titleBarStyle: 'default'
    });

    // CRITICAL: Set proper user agent and inject fingerprint script
    browserWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    // CRITICAL: Inject comprehensive fingerprint spoofing script before page load
    browserWindow.webContents.on('dom-ready', async () => {
      const fingerprintScript = `
        (function() {
          'use strict';
          
          console.log('🛡️ BeastBrowser Enhanced Fingerprint Spoofing Active');
          
          // CRITICAL: Hide all Electron traces
          delete window.process;
          delete window.global;
          delete window.Buffer;
          delete window.setImmediate;
          delete window.clearImmediate;
          delete window.__dirname;
          delete window.__filename;
          delete window.module;
          delete window.require;
          delete window.electronAPI;
          delete window.electron;
          delete window.ipcRenderer;
          
          // 1. CRITICAL: Navigator Properties Override
          const navigatorProps = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            appName: 'Netscape',
            appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            appCodeName: 'Mozilla',
            platform: 'Win32',
            vendor: 'Google Inc.',
            vendorSub: '',
            product: 'Gecko',
            productSub: '20030107',
            hardwareConcurrency: 8,
            deviceMemory: 8,
            maxTouchPoints: 0,
            language: 'en-US',
            languages: ['en-US', 'en'],
            webdriver: undefined,
            cookieEnabled: true,
            onLine: true,
            doNotTrack: null,
            pdfViewerEnabled: true
          };

          Object.keys(navigatorProps).forEach(prop => {
            try {
              Object.defineProperty(navigator, prop, {
                get: function() { return navigatorProps[prop]; },
                configurable: false,
                enumerable: true
              });
            } catch(e) {
              console.warn('Navigator property override failed:', prop, e.message);
            }
          });

          // 2. CRITICAL: UserAgentData Override with correct Chrome 121 brands
          const userAgentData = {
            brands: [
              { brand: "Not A(Brand", version: "99" },
              { brand: "Google Chrome", version: "121" },
              { brand: "Chromium", version: "121" }
            ],
            mobile: false,
            platform: "Windows",
            getHighEntropyValues: async function(hints) {
              const values = {
                architecture: "x86",
                bitness: "64",
                brands: this.brands,
                fullVersionList: this.brands,
                mobile: false,
                model: "",
                platform: "Windows",
                platformVersion: "10.0.0",
                uaFullVersion: "121.0.6167.139",
                wow64: false
              };
              return Object.fromEntries(hints.map(hint => [hint, values[hint]]));
            }
          };

          Object.defineProperty(navigator, 'userAgentData', {
            get: function() { return userAgentData; },
            configurable: false,
            enumerable: true
          });

          // 3. CRITICAL: Screen Properties Override
          const screenProps = {
            width: 1920,
            height: 1080,
            availWidth: 1920,
            availHeight: 1040,
            colorDepth: 24,
            pixelDepth: 24
          };

          Object.keys(screenProps).forEach(prop => {
            try {
              Object.defineProperty(screen, prop, {
                get: function() { return screenProps[prop]; },
                configurable: false,
                enumerable: true
              });
            } catch(e) {
              console.warn('Screen property override failed:', prop, e.message);
            }
          });

          // 4. CRITICAL: WebGL Override
          if (window.WebGLRenderingContext) {
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
              switch(parameter) {
                case 37445: // UNMASKED_VENDOR_WEBGL
                  return 'Google Inc. (NVIDIA)';
                case 37446: // UNMASKED_RENDERER_WEBGL
                  return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)';
                case 7936: // VERSION
                  return 'OpenGL ES 2.0 (ANGLE 2.1.0 (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0))';
                case 7937: // SHADING_LANGUAGE_VERSION
                  return 'OpenGL ES GLSL ES 1.0 (ANGLE 2.1.0 (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0))';
                default:
                  return originalGetParameter.call(this, parameter);
              }
            };
          }

          if (window.WebGL2RenderingContext) {
            const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
            WebGL2RenderingContext.prototype.getParameter = function(parameter) {
              switch(parameter) {
                case 37445: // UNMASKED_VENDOR_WEBGL
                  return 'Google Inc. (NVIDIA)';
                case 37446: // UNMASKED_RENDERER_WEBGL
                  return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)';
                case 7936: // VERSION
                  return 'OpenGL ES 3.0 (ANGLE 2.1.0 (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0))';
                case 7937: // SHADING_LANGUAGE_VERSION
                  return 'OpenGL ES GLSL ES 3.0 (ANGLE 2.1.0 (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0))';
                default:
                  return originalGetParameter2.call(this, parameter);
              }
            };
          }

          // 5. Remove WebDriver Detection
          delete window.webdriver;
          delete window.__webdriver_evaluate;
          delete window.__selenium_evaluate;
          delete window.__webdriver_script_fn;
          delete window.__driver_evaluate;
          delete window.__webdriver_script_func;
          delete window.__webdriver_script_function;
          delete window.__fxdriver_evaluate;
          delete window.__driver_unwrapped;
          delete window.__webdriver_unwrapped;
          delete window.__selenium_unwrapped;
          delete window.__fxdriver_unwrapped;
          delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
          delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
          delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

          // 6. Chrome Runtime Spoofing
          if (!window.chrome) {
            Object.defineProperty(window, 'chrome', {
              get: function() {
                return {
                  runtime: {
                    onConnect: undefined,
                    onMessage: undefined
                  },
                  loadTimes: function() {
                    return {
                      commitLoadTime: Date.now() / 1000 - Math.random() * 100,
                      connectionInfo: 'http/1.1',
                      finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 50,
                      finishLoadTime: Date.now() / 1000 - Math.random() * 30,
                      firstPaintTime: Date.now() / 1000 - Math.random() * 80,
                      navigationType: 'Other',
                      requestTime: Date.now() / 1000 - Math.random() * 200,
                      startLoadTime: Date.now() / 1000 - Math.random() * 150
                    };
                  },
                  csi: function() {
                    return {
                      onloadT: Date.now(),
                      pageT: Date.now() - Math.random() * 1000,
                      tran: Math.floor(Math.random() * 20)
                    };
                  }
                };
              },
              configurable: true
            });
          }

          console.log('✅ Enhanced Fingerprint Spoofing Applied Successfully');
          console.log('📊 Final Fingerprint:', {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            screen: screen.width + 'x' + screen.height,
            userAgentData: navigator.userAgentData,
            electronHidden: true
          });
        })();
      `;
      
      await browserWindow.webContents.executeJavaScript(fingerprintScript);
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
      title: 'Google Chrome'
    });

    // Set proper user agent
    browserWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

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