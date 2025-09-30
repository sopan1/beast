const { app, BrowserWindow, BrowserView, ipcMain, session, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

let apiServer;
try {
  apiServer = require('./puppeteer-api').api;
} catch (e) {
  console.warn('⚠️ Puppeteer API not available:', e.message);
  apiServer = null;
}

// Harden WebRTC and enforce proxy usage at Chromium level
// These must be set before the app is ready
try {
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');
  app.commandLine.appendSwitch('webrtc-ip-handling-policy', 'default_public_interface_only');
  app.commandLine.appendSwitch('enforce-webrtc-ip-permission-check');
  // Hide local IPs with mDNS to prevent WebRTC local IP leaks
  app.commandLine.appendSwitch('enable-features', 'WebRtcHideLocalIpsWithMdns');
  // Optional: ensure all traffic goes via proxy when set
  app.commandLine.appendSwitch('proxy-bypass-list', '<-loopback>');
} catch (e) {
  console.warn('⚠️ Failed to set Chromium command-line switches:', e.message);
}

let PuppeteerAntiBrowserManager; 
let pptrManager;
try {
  // console.log('📝 Initializing Puppeteer manager...');
  const PuppeteerAntiBrowserManager = require('./puppeteer-browser').PuppeteerAntiBrowserManager;
  pptrManager = new PuppeteerAntiBrowserManager();
  console.log('✅ Puppeteer manager initialized successfully');
} catch (e) {
  console.error('❌ Puppeteer manager initialization failed:', e.message);
  console.error('Stack trace:', e.stack);
  PuppeteerAntiBrowserManager = class {
    async launch() { throw new Error('Puppeteer not installed'); }
    async close() { return { success: true }; }
  };
}

// IPC: Provide current timezone to preload on demand
ipcMain.handle('timezone-spoof:get-current', async () => {
  return lastAppliedTimezone;
});

// Anti-Browser (Puppeteer) IPC
ipcMain.handle('antiBrowser:open', async (event, profile, options = {}) => {
  try {
    // options.proxy may be string or object
    let parsedProxy = null;
    if (options.proxy) {
      if (typeof options.proxy === 'string') {
        try {
          parsedProxy = geoProxyManager.parseProxyInput(options.proxy);
        } catch (e) {
          return { success: false, error: `Invalid proxy format: ${e.message}` };
        }
      } else if (typeof options.proxy === 'object' && options.proxy.host) {
        parsedProxy = options.proxy;
      }
      if (parsedProxy && !parsedProxy.type) parsedProxy.type = options.proxyType || 'http';
    }

    // Determine timezone from proxy geo when possible (with timeout)
    let tz = options.timezone || null;
    if (!tz) {
      try {
        // Add short timeout for faster launch
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timezone detection timeout')), 3000)
        );
        
        if (parsedProxy) {
          const geo = await Promise.race([
            geoProxyManager.testProxyWithGeoLookup(parsedProxy),
            timeoutPromise
          ]);
          if (geo && geo.success && geo.timezone) tz = geo.timezone;
        }
        if (!tz) {
          const tzRes = await Promise.race([
            getTimezoneFromProxyIP(null),
            timeoutPromise
          ]);
          if (tzRes && tzRes.success) tz = tzRes.timezone;
        }
      } catch (e) {
        console.warn('⚠️ Timezone detection failed, using default proxy timezone:', e.message);
        // Use a default proxy timezone instead of system timezone
        tz = 'America/New_York'; // Default to US timezone for proxy
      }
    }
    // Always use proxy timezone, never system timezone
    tz = tz || 'America/New_York'; // Default US timezone if no proxy timezone detected

    // Use detected proxy timezone, not system timezone
    let proxyTimezone = tz;
    
    // If timezone detection failed or returned system timezone, force proper proxy timezone
    if (!proxyTimezone || proxyTimezone === 'Asia/Kolkata' || proxyTimezone === 'Asia/Calcutta') {
      // Try to get timezone from proxy location
      if (parsedProxy) {
        try {
          const geoResult = await geoProxyManager.testProxyWithGeoLookup(parsedProxy, 1);
          if (geoResult.success && geoResult.timezone) {
            proxyTimezone = geoResult.timezone;
            // console.log(`🎆 Using proxy geo timezone: ${proxyTimezone}`);
          }
        } catch (error) {
          console.warn('Failed to get proxy geo timezone:', error.message);
        }
      }
      
      // Final fallback based on proxy type/location
      if (!proxyTimezone || proxyTimezone === 'Asia/Kolkata') {
        proxyTimezone = 'Europe/London'; // Default for most proxies
        // console.log(`🇬🇧 Using default proxy timezone: ${proxyTimezone}`);
      }
    }
    
    // console.log(`🚀 About to launch Puppeteer for profile:`, profile.id);
    // console.log(`🔧 Proxy config:`, parsedProxy);
    // console.log(`🌍 Final timezone:`, proxyTimezone);
    // console.log(`⚠️ System timezone will be BLOCKED, only proxy timezone will be used`);
    
    try {
      const launchRes = await pptrManager.launch(profile, { proxy: parsedProxy, timezone: proxyTimezone });
      console.log(`✅ Puppeteer launch successful:`, launchRes);
      return { success: true, ...launchRes };
    } catch (launchError) {
      console.error(`❌ Puppeteer launch failed:`, launchError);
      return { success: false, error: launchError.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('antiBrowser:close', async (event, profileId) => {
  try {
    const res = await pptrManager.close(profileId);
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Check if enhanced modules exist, use fallbacks if not
let EnhancedProxyManager, GeoProxyManager, AdvancedFingerprintSpoofing, IPTimezoneManager;

try {
  EnhancedProxyManager = require('./enhanced-proxy-manager').EnhancedProxyManager;
} catch (error) {
  console.warn('⚠️ Enhanced proxy manager not found, using fallback');
  EnhancedProxyManager = class {
    constructor() {
      this.activeServers = new Map();
    }
    async createEnhancedLocalProxy(proxy, profileId) {
      return { port: 8080 };
    }
    closeProxyServer(profileId) {}
    closeAllProxyServers() {}
    normalizeProxy(proxyString, type) {
      return `${type}://${proxyString}`;
    }
    async testProxyConnectivity(proxy) {
      return { success: true, ip: '127.0.0.1' };
    }
  };
}

try {
  GeoProxyManager = require('./geo-proxy-manager').GeoProxyManager;
} catch (error) {
  console.warn('⚠️ Geo proxy manager not found, using fallback');
  GeoProxyManager = class {
    constructor() {
      this.cache = new Map();
    }
    parseProxyInput(input) {
      const parts = input.split(':');
      return {
        host: parts[0],
        port: parseInt(parts[1]) || 8080,
        username: parts[2],
        password: parts[3]
      };
    }
    async testProxyWithGeoLookup(proxy) {
      return { success: true, ip: '127.0.0.1', country: 'US' };
    }
  };
}

try {
  AdvancedFingerprintSpoofing = require('./advanced-fingerprint-spoofing').AdvancedFingerprintSpoofing;
} catch (error) {
  console.warn('⚠️ Advanced fingerprint spoofing not found, using fallback');
  AdvancedFingerprintSpoofing = class {
    generateFingerprintScript(platform, geoData) {
      return `
        // console.log('🛡️ Basic fingerprint spoofing applied for ${platform}');
        // Basic fingerprint spoofing
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      `;
    }
  };
}

try {
  IPTimezoneManager = require('./ip-timezone-manager').IPTimezoneManager;
} catch (error) {
  console.warn('⚠️ IP timezone manager not found, using fallback');
  IPTimezoneManager = class {
    async getTimezoneFromIP() {
      return { success: false, timezone: 'America/New_York' };
    }
    async applyTimezoneToWindow() {
      return { success: false };
    }
    generateTimezoneScript(tz) {
      return `// console.log('Timezone spoofing not available');`;
    }
  };
}

// ENHANCED: Load real user agents with comprehensive fingerprint data
function loadUserAgents(platform, profile = null) {
  try {
    const userAgentsPath = path.join(__dirname, '..', 'useragents', `${platform}.json`);
    // console.log(`🔍 Loading user agents from: ${userAgentsPath}`);
    
    if (fs.existsSync(userAgentsPath)) {
      const userAgents = JSON.parse(fs.readFileSync(userAgentsPath, 'utf8'));
      if (Array.isArray(userAgents) && userAgents.length > 0) {
        // Use profile ID for consistent randomization
        const seed = profile?.id ? profile.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : Math.random();
        const randomIndex = Math.floor((seed % 1000) / 1000 * userAgents.length);
        const randomUA = userAgents[randomIndex];
        
        console.log(`✅ Loaded real user agent for ${platform}:`, randomUA.substring(0, 80) + '...');
        return randomUA;
      }
    }
    console.warn(`⚠️ User agent file not found for ${platform}, using enhanced fallback`);
  } catch (error) {
    console.error(`❌ Error loading user agents for ${platform}:`, error.message);
  }
  
  // Enhanced fallback user agents with more variety
  const fallbackUserAgents = {
    android: [
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    ],
    ios: [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
    ],
    windows: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    ],
    macos: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ],
    linux: [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0'
    ],
    tv: [
      'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.0 TV Safari/537.36',
      'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.5) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/5.5 TV Safari/537.36'
    ]
  };
  
  const platformUAs = fallbackUserAgents[platform] || fallbackUserAgents.windows;
  const seed = profile?.id ? profile.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : Math.random();
  const randomIndex = Math.floor((seed % 1000) / 1000 * platformUAs.length);
  
  return platformUAs[randomIndex];
}

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow;
const profileWindows = new Map();
const profileLogs = new Map();
const proxyManager = new EnhancedProxyManager();
const geoProxyManager = new GeoProxyManager();
const fingerprintSpoofer = new AdvancedFingerprintSpoofing();
const timezoneManager = new IPTimezoneManager(); // NEW: IP Timezone Manager
// pptrManager is initialized above
let lastAppliedTimezone = null; // Track most recently applied timezone for preload access

// Profile logging system
function logProfileEvent(profileId, event, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, event, data };
  
  if (!profileLogs.has(profileId)) {
    profileLogs.set(profileId, []);
  }
  
  profileLogs.get(profileId).push(logEntry);
  
  // Keep only last 100 entries per profile
  if (profileLogs.get(profileId).length > 100) {
    profileLogs.get(profileId).shift();
  }
  
  log.info(`Profile ${profileId}: ${event}`, data);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'free.ico'),
    title: 'BeastBrowser - Advanced Anti-Detection Browser'
  });

  // Enhanced Windows-specific taskbar configuration
  if (process.platform === 'win32') {
    try {
      mainWindow.setIcon(path.join(__dirname, 'free.ico'));
      
      mainWindow.setAppDetails({
        appId: 'BeastBrowser.Main.Application',
        appIconPath: path.join(__dirname, 'free.ico'),
        appIconIndex: 0,
        relaunchCommand: process.execPath,
        relaunchDisplayName: 'BeastBrowser'
      });
      
      console.log('✅ Windows taskbar icon configured:', path.join(__dirname, 'free.ico'));
    } catch (error) {
      console.error('❌ Error setting Windows taskbar icon:', error);
    }
  }

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // Load the original React app from src folder
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      const distPath = path.join(__dirname, '../dist-new/index.html');
      if (fs.existsSync(distPath)) {
        mainWindow.loadFile(distPath);
      } else {
        log.error('Neither dev server nor built files found');
      }
    });
    
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-new/index.html'));
  }

  createMenu();

  mainWindow.on('close', (event) => {
    const openProfiles = profileWindows.size;
    if (openProfiles > 0) {
      event.preventDefault();
      
      const { dialog } = require('electron');
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'BeastBrowser - Cannot Close',
        message: `Cannot close application`,
        detail: `Please close all ${openProfiles} browser profile(s) first, then try closing the main window.\n\nCurrently open profiles: ${[...profileWindows.keys()].join(', ')}`,
        buttons: ['OK', 'Force Close All Profiles'],
        defaultId: 0,
        icon: path.join(__dirname, 'free.ico')
      }).then((result) => {
        if (result.response === 1) {
          // console.log('🔥 Force closing all profiles...');
          for (const [profileId, profileData] of profileWindows) {
            try {
              if (!profileData.window.isDestroyed()) {
                profileData.window.destroy();
              }
            } catch (error) {
              log.error(`Error force closing profile ${profileId}:`, error);
            }
          }
          profileWindows.clear();
          proxyManager.closeAllProxyServers();
          
          mainWindow.destroy();
        }
      });
      
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Main window is now visible');
  });
  
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      // console.log('⚠️ Forcing main window to show...');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Profile Manager',
          click: () => mainWindow.webContents.send('navigate-to-profiles')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// FIXED: Get timezone from IP using actual geolocation APIs
function getTimezoneFromIPRange(ip) {
  // console.log(`🌍 [${new Date().toISOString()}] Getting actual timezone for IP: ${ip}`);
  
  // Don't force any timezone - let the IP-based detection work naturally
  // This function now just logs and returns null to let the API-based detection work
  // console.log(`🔍 [${new Date().toISOString()}] Using API-based timezone detection for IP: ${ip}`);
  return null; // Let the actual timezone APIs determine the timezone
}

// FIXED: Generate fingerprint with actual IP-based timezone
function getRandomFingerprint(profile, proxyTimezone = null) {
  const platforms = {
    windows: {
      screens: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 }
      ]
    },
    macos: {
      screens: [
        { width: 1440, height: 900 },
        { width: 1680, height: 1050 },
        { width: 1920, height: 1080 }
      ]
    },
    linux: {
      screens: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 }
      ]
    },
    android: {
      screens: [
        { width: 412, height: 915 },
        { width: 360, height: 800 },
        { width: 414, height: 896 }
      ]
    },
    ios: {
      screens: [
        { width: 414, height: 896 },
        { width: 375, height: 812 },
        { width: 820, height: 1180 }
      ]
    },
    tv: {
      screens: [
        { width: 1920, height: 1080 },
        { width: 3840, height: 2160 },
        { width: 1280, height: 720 }
      ]
    }
  };

  const platformName = profile.userAgentPlatform || 'windows';
  const realUserAgent = loadUserAgents(platformName);
  
  const platform = platforms[platformName] || platforms.windows;
  const userAgent = profile.customUserAgent || realUserAgent;
  const screen = platform.screens[Math.floor(Math.random() * platform.screens.length)];
  
  // FIXED: Use actual timezone from proxy/geo data
  let timezone = null;
  let locale = 'en-US'; // Default locale
  
  if (proxyTimezone) {
    // Proxy timezone has highest priority
    timezone = proxyTimezone;
    // console.log(`🌍 Using proxy-detected timezone: ${timezone}`);
  } else if (profile.geoData?.timezone) {
    // Use geo timezone
    timezone = profile.geoData.timezone;
    // console.log(`🗺️ Using geo data timezone: ${timezone}`);
  } else {
    // Use system timezone as fallback
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // console.log(`⚙️ Using system timezone: ${timezone}`);
  }
  
  // Set locale based on timezone/country
  if (profile.geoData?.country) {
    const countryLocales = {
      'US': 'en-US',
      'GB': 'en-GB',
      'CA': 'en-CA',
      'AU': 'en-AU',
      'DE': 'de-DE',
      'FR': 'fr-FR',
      'ES': 'es-ES',
      'IT': 'it-IT',
      'JP': 'ja-JP',
      'CN': 'zh-CN',
      'IN': 'en-IN',
      'BR': 'pt-BR',
      'RU': 'ru-RU'
    };
    locale = countryLocales[profile.geoData.country] || 'en-US';
    // console.log(`🌐 Using locale based on country ${profile.geoData.country}: ${locale}`);
  }
  
  return {
    userAgent,
    screen: {
      ...screen,
      width: screen.width + Math.floor((Math.random() - 0.5) * 20),
      height: screen.height + Math.floor((Math.random() - 0.5) * 20)
    },
    hardwareConcurrency: Math.floor(Math.random() * 16) + 2,
    deviceMemory: Math.pow(2, Math.floor(Math.random() * 5) + 2),
    timezone: timezone, // This will be the actual IP-based timezone
    locale: profile.locale || locale // Use appropriate locale
  };
}

function getPlatformDeviceMetrics(platform) {
  const deviceMetrics = {
    android: {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      fitWindow: false,
      touchEnabled: true,
      userAgent: ""
    },
    ios: {
      width: 430,
      height: 932,
      deviceScaleFactor: 3,
      mobile: true,
      fitWindow: false,
      touchEnabled: true,
      userAgent: ""
    },
    tv: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
      fitWindow: false,
      touchEnabled: false,
      userAgent: ""
    },
    windows: {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
      fitWindow: false,
      touchEnabled: false,
      userAgent: ""
    },
    macos: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
      fitWindow: false,
      touchEnabled: false,
      userAgent: ""
    },
    linux: {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
      fitWindow: false,
      touchEnabled: false,
      userAgent: ""
    }
  };
  
  return deviceMetrics[platform] || deviceMetrics.windows;
}

function getWindowSizeForPlatform(platform) {
  const platformSizes = {
    android: { width: 450, height: 950 },
    ios: { width: 480, height: 1020 },
    tv: { width: 1920, height: 1080 },
    windows: { width: 1400, height: 900 },
    macos: { width: 1500, height: 1000 },
    linux: { width: 1400, height: 900 }
  };
  
  return platformSizes[platform] || platformSizes.windows;
}

// FIXED: Better IP extraction from malformed HTTP responses
function extractIPFromResponse(responseText) {
  try {
    // Try to parse as JSON first
    const data = JSON.parse(responseText);
    return data.ip || data.origin || null;
  } catch {
    // Extract IP from malformed HTTP response
    const lines = responseText.split('\n');
    
    // Look for IP in the response body (usually last non-empty line)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line && isValidIP(line)) {
        return line;
      }
    }
    
    // Look for IP patterns anywhere in the response
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const matches = responseText.match(ipPattern);
    
    if (matches) {
      for (const match of matches) {
        if (isValidIP(match) && !match.startsWith('127.') && !match.startsWith('192.168.') && !match.startsWith('10.')) {
          return match;
        }
      }
    }
    
    return null;
  }
}

// FIXED: Improved IP-based timezone detection using actual geolocation APIs
async function getTimezoneFromProxyIP(localProxyPort = null) {
  const timestamp = new Date().toISOString();
  // console.log(`🕐 [${timestamp}] Starting actual timezone detection from proxy IP...`);
  
  try {
    // First, get the IP through the proxy
    const fetch = require('node-fetch');
    let proxyAgent = null;
    
    if (localProxyPort) {
      const { HttpProxyAgent } = require('http-proxy-agent');
      proxyAgent = new HttpProxyAgent(`http://127.0.0.1:${localProxyPort}`);
      // console.log(`🔗 [${new Date().toISOString()}] Using proxy agent on port: ${localProxyPort}`);
    }

    // Simple IP detection APIs that return plain text or simple JSON
    const ipApis = [
      'https://api.ipify.org?format=json',
      'https://httpbin.org/ip',
      'https://ifconfig.me/ip',
      'http://icanhazip.com'
    ];

    let currentIP = null;
    
    for (const apiUrl of ipApis) {
      try {
        // console.log(`🔍 [${new Date().toISOString()}] Trying IP API: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          agent: proxyAgent,
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.ok) {
          const text = await response.text();
          // console.log(`📡 [${new Date().toISOString()}] Raw response from ${apiUrl}:`, text.substring(0, 100));
          
          currentIP = extractIPFromResponse(text);
          
          if (currentIP && isValidIP(currentIP)) {
            console.log(`✅ [${new Date().toISOString()}] Got IP from proxy: ${currentIP}`);
            break;
          }
        }
      } catch (error) {
        console.warn(`❌ [${new Date().toISOString()}] IP API ${apiUrl} failed:`, error.message);
        continue;
      }
    }

    if (!currentIP) {
      throw new Error('Failed to get IP through proxy');
    }

    // Use actual timezone detection APIs and be tolerant to proxy-mangled responses
    // console.log(`🌍 [${new Date().toISOString()}] Getting actual timezone for IP: ${currentIP}`);

    const tryParseTimezoneFromText = (text) => {
      // Try JSON parse first
      try {
        const data = JSON.parse(text);
        if (data && (data.timezone || data.time_zone || data.timeZone)) {
          return data.timezone || data.time_zone || data.timeZone;
        }
      } catch (_) {}
      // Regex fallback for common patterns
      const tzMatch = text.match(/"timezone"\s*:\s*"([^"]+)"/i) || text.match(/\b([A-Za-z]+\/[A-Za-z_]+)\b/);
      if (tzMatch && tzMatch[1]) return tzMatch[1];
      return null;
    };

    const parseJsonSafe = (text) => { try { return JSON.parse(text); } catch { return null; } };

    const timezoneApis = [
      // ip-api.com JSON (may be returned as raw HTTP by some proxies; handle text)
      {
        url: `http://ip-api.com/json/${currentIP}?fields=timezone,country,regionName,city,lat,lon`,
        process: async (resp) => {
          const text = await resp.text();
          const data = parseJsonSafe(text) || {};
          const tz = data.timezone || tryParseTimezoneFromText(text);
          return tz ? {
            timezone: tz,
            country: data.country || null,
            region: data.regionName || null,
            city: data.city || null,
            latitude: data.lat || null,
            longitude: data.lon || null
          } : null;
        }
      },
      // ipinfo.io JSON (sometimes truncated; handle text)
      {
        url: `https://ipinfo.io/${currentIP}/json`,
        process: async (resp) => {
          const text = await resp.text();
          const data = parseJsonSafe(text) || {};
          const tz = data.timezone || tryParseTimezoneFromText(text);
          const loc = data.loc || null;
          return tz ? {
            timezone: tz,
            country: data.country || null,
            region: data.region || null,
            city: data.city || null,
            latitude: loc ? parseFloat(loc.split(',')[0]) : null,
            longitude: loc ? parseFloat(loc.split(',')[1]) : null
          } : null;
        }
      },
      // ipapi.co plain text timezone
      {
        url: `https://ipapi.co/${currentIP}/timezone/`,
        process: async (resp) => {
          const tz = (await resp.text()).trim();
          return tz ? { timezone: tz } : null;
        }
      },
      // worldtimeapi.org JSON
      {
        url: `https://worldtimeapi.org/api/ip/${currentIP}.json`,
        process: async (resp) => {
          const text = await resp.text();
          const data = parseJsonSafe(text) || {};
          const tz = data.timezone || tryParseTimezoneFromText(text);
          return tz ? { timezone: tz } : null;
        }
      }
    ];

    for (const api of timezoneApis) {
      try {
        // console.log(`🔍 [${new Date().toISOString()}] Trying timezone API: ${api.url}`);
        const response = await fetch(api.url, {
          agent: proxyAgent,
          timeout: 12000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const parsed = await api.process(response);
        if (parsed && parsed.timezone) {
          console.log(`✅ [${new Date().toISOString()}] Got actual timezone: ${parsed.timezone}`);
          return {
            success: true,
            ip: currentIP,
            timezone: parsed.timezone,
            country: parsed.country || 'Unknown',
            region: parsed.region || 'Unknown',
            city: parsed.city || 'Unknown',
            latitude: parsed.latitude || null,
            longitude: parsed.longitude || null,
            source: 'IP-based timezone detection'
          };
        }
      } catch (error) {
        console.warn(`❌ [${new Date().toISOString()}] Timezone API failed (${api.url}):`, error.message);
        continue;
      }
    }

    // Fallback to system timezone if all APIs fail
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // console.log(`⚠️ [${new Date().toISOString()}] Using system timezone as fallback: ${systemTimezone}`);
    return {
      success: true,
      ip: currentIP,
      timezone: systemTimezone,
      country: 'Unknown',
      city: 'Unknown',
      source: 'system timezone fallback'
    };

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Failed to get timezone from proxy IP:`, error.message);
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      success: false,
      error: error.message,
      timezone: systemTimezone
    };
  }
}

// Helper functions for IP-based timezone detection
function isValidIP(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

function getCountryFromIP(ip) {
  // This function is no longer used - country detection is done via API
  return null;
}

function getFallbackTimezone(ip) {
  // Use system timezone as fallback instead of forcing USA
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// ENHANCED: Generate comprehensive USA timezone spoofing script for webview injection
function generateTimezoneScript(targetTimezone) {
  return `
    (function() {
      'use strict';
      
      const TARGET_TIMEZONE = '${targetTimezone}';
      console.log('[BEAST] [' + new Date().toISOString() + '] Applying timezone spoof:', TARGET_TIMEZONE);
      
      try {
        // 1. Override Intl.DateTimeFormat
        const OriginalDateTimeFormat = Intl.DateTimeFormat;
        const OriginalResolvedOptions = OriginalDateTimeFormat.prototype.resolvedOptions;
        
        Intl.DateTimeFormat = function(locales, options = {}) {
          const enhancedOptions = { ...options, timeZone: TARGET_TIMEZONE };
          const formatter = new OriginalDateTimeFormat(locales, enhancedOptions);
          formatter.resolvedOptions = function() {
            const resolved = OriginalResolvedOptions.call(this);
            resolved.timeZone = TARGET_TIMEZONE;
            return resolved;
          };
          return formatter;
        };
        
        Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
        Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
        
        // 2. Override Date locale methods
        const OriginalToLocaleString = Date.prototype.toLocaleString;
        const OriginalToLocaleDateString = Date.prototype.toLocaleDateString;
        const OriginalToLocaleTimeString = Date.prototype.toLocaleTimeString;
        
        Date.prototype.toLocaleString = function(locales, options = {}) {
          const opts = { ...options, timeZone: TARGET_TIMEZONE };
          return OriginalToLocaleString.call(this, locales, opts);
        };
        Date.prototype.toLocaleDateString = function(locales, options = {}) {
          const opts = { ...options, timeZone: TARGET_TIMEZONE };
          return OriginalToLocaleDateString.call(this, locales, opts);
        };
        Date.prototype.toLocaleTimeString = function(locales, options = {}) {
          const opts = { ...options, timeZone: TARGET_TIMEZONE };
          return OriginalToLocaleTimeString.call(this, locales, opts);
        };
        
        // 3. Override getTimezoneOffset using target TZ
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
          try {
            const now = new Date();
            const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
            const target = new Date(now.toLocaleString('en-US', { timeZone: TARGET_TIMEZONE }));
            return (utc.getTime() - target.getTime()) / (1000 * 60);
          } catch (e) {
            return originalGetTimezoneOffset.call(this);
          }
        };
        
        // 4. Expose info
        window.beastBrowserTimezone = {
          timezone: TARGET_TIMEZONE,
          applied: true,
          timestamp: new Date().toISOString(),
          source: 'beast-timezone-script'
        };
        window.BEAST_BROWSER_TIMEZONE = TARGET_TIMEZONE;
        
        console.log('✅ [BEAST] Timezone spoof applied:', TARGET_TIMEZONE);
      } catch (error) {
        console.error('❌ [BEAST] Timezone spoof failed:', error);
        window.beastBrowserTimezone = {
          timezone: TARGET_TIMEZONE,
          applied: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          source: 'beast-timezone-script'
        };
      }
    })();
  `;
}

// CRITICAL FIX: Apply USA timezone override WITHOUT blocking window creation
async function applyTimezoneOverrideDelayed(profileWindow, targetTimezone) {
  const timestamp = new Date().toISOString();
  console.log(`[BEAST] [${timestamp}] Applying timezone override AFTER window loads: ${targetTimezone}`);
  
  return new Promise((resolve) => {
    // Wait for the window to be fully loaded before applying timezone
    profileWindow.webContents.once('did-finish-load', async () => {
      try {
        console.log(`[BEAST] [${new Date().toISOString()}] Window loaded, applying timezone override: ${targetTimezone}`);
        
        // Ensure CDP debugger is attached
        if (!profileWindow.webContents.debugger.isAttached()) {
          profileWindow.webContents.debugger.attach('1.3');
          console.log(`✅ [${new Date().toISOString()}] CDP debugger attached for timezone override`);
        }
        
        const cdpDebugger = profileWindow.webContents.debugger;
        
        // Enable necessary CDP domains
        await cdpDebugger.sendCommand('Runtime.enable');
        await cdpDebugger.sendCommand('Page.enable');
        
        // Apply CDP timezone override
        await cdpDebugger.sendCommand('Emulation.setTimezoneOverride', {
          timezoneId: targetTimezone
        });
        console.log(`✅ [${new Date().toISOString()}] CDP Timezone override applied: ${targetTimezone}`);
        
        // Locale override is handled during initial anti-detection setup; skip here to avoid scope issues
        
        // Record applied timezone for preload queries
        lastAppliedTimezone = targetTimezone;

        // Inject timezone spoofing script
        const timezoneScript = generateTimezoneScript(targetTimezone);
        
        // Add script to be executed on every page load
        await cdpDebugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
          source: timezoneScript
        });
        console.log(`✅ [${new Date().toISOString()}] Timezone spoofing script added to evaluate on new document`);
        
        // Also inject immediately for current context
        await cdpDebugger.sendCommand('Runtime.evaluate', {
          expression: timezoneScript,
          worldName: 'main'
        });
        console.log(`✅ [${new Date().toISOString()}] Timezone spoofing script executed in current context`);
        
        // Notify preload scripts
        profileWindow.webContents.send('timezone-spoof:apply', targetTimezone);
        
        resolve({ success: true, timezone: targetTimezone });
        
      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Delayed USA timezone override failed:`, error.message);
        resolve({ success: false, error: error.message });
      }
    });
  });
}

// ENHANCED: Apply anti-detection overrides with improved webview USA timezone injection
async function applyAntiDetectionOverrides(profileWindow, geoData, platform = 'windows', realUserAgent = null, localProxyPort = null) {
  try {
    // console.log('🛡️ Applying enhanced anti-detection overrides with USA timezone:', { geoData, platform });
    
    await new Promise(resolve => {
      if (profileWindow.webContents.isLoading()) {
        profileWindow.webContents.once('did-finish-load', resolve);
      } else {
        resolve();
      }
    });
    
    if (!profileWindow.webContents.debugger.isAttached()) {
      try {
        profileWindow.webContents.debugger.attach('1.3');
        console.log('✅ CDP debugger attached');
      } catch (error) {
        console.warn('⚠️ CDP debugger attachment failed:', error.message);
        return;
      }
    }
    
    const cdpDebugger = profileWindow.webContents.debugger;
    
    try {
      await cdpDebugger.sendCommand('Runtime.enable');
      await cdpDebugger.sendCommand('Page.enable');
    } catch (enableError) {
      console.warn('⚠️ CDP domain enable failed:', enableError.message);
    }
    
    const deviceMetrics = getPlatformDeviceMetrics(platform);
    try {
      await cdpDebugger.sendCommand('Emulation.setDeviceMetricsOverride', {
        width: deviceMetrics.width,
        height: deviceMetrics.height,
        deviceScaleFactor: deviceMetrics.deviceScaleFactor,
        mobile: deviceMetrics.mobile,
        fitWindow: deviceMetrics.fitWindow
      });
      console.log(`✅ Device metrics applied for ${platform}`);
    } catch (error) {
      console.error('❌ Device metrics override failed:', error.message);
    }
    
    if (deviceMetrics.touchEnabled) {
      try {
        await cdpDebugger.sendCommand('Emulation.setTouchEmulationEnabled', {
          enabled: true,
          maxTouchPoints: 5
        });
        console.log('✅ Touch emulation enabled');
      } catch (error) {
        console.warn('⚠️ Touch emulation failed:', error.message);
      }
    }
    
    try {
      const platformUA = realUserAgent || loadUserAgents(platform);
      
      await cdpDebugger.sendCommand('Emulation.setUserAgentOverride', {
        userAgent: platformUA,
        acceptLanguage: 'en-US,en;q=0.9', // FORCE USA LOCALE
        platform: platform
      });
      console.log(`✅ User Agent overridden for ${platform} with USA locale`);
      
      profileWindow.webContents.setUserAgent(platformUA);
      deviceMetrics.userAgent = platformUA;
    } catch (error) {
      console.error('❌ User Agent override failed:', error.message);
    }
    
    // console.log('🔧 Applying fingerprint spoofing...');
    const fingerprintScript = fingerprintSpoofer.generateFingerprintScript(platform, geoData);
    
    try {
      const result = await cdpDebugger.sendCommand('Runtime.evaluate', {
        expression: fingerprintScript,
        worldName: 'main'
      });
      
      if (result.exceptionDetails) {
        console.warn('⚠️ Fingerprint spoofing had exceptions:', result.exceptionDetails);
      } else {
        console.log('✅ Fingerprint spoofing applied');
      }
    } catch (error) {
      console.error('❌ Fingerprint spoofing failed:', error.message);
    }
    
    // Set locale based on geoData.country (fallback to en-US)
    try {
      const country = (geoData && (geoData.country || geoData.countryCode)) || null;
      const countryLocales = {
        'US': 'en-US',
        'GB': 'en-GB',
        'UK': 'en-GB',
        'CA': 'en-CA',
        'AU': 'en-AU',
        'IN': 'en-IN',
        'DE': 'de-DE',
        'FR': 'fr-FR',
        'ES': 'es-ES',
        'IT': 'it-IT',
        'JP': 'ja-JP',
        'CN': 'zh-CN',
        'BR': 'pt-BR',
        'RU': 'ru-RU'
      };
      const locale = countryLocales[country] || 'en-US';
      await cdpDebugger.sendCommand('Emulation.setLocaleOverride', {
        locale
      });
      console.log(`✅ Locale override applied: ${locale}`);
    } catch (error) {
      console.warn('⚠️ Locale override failed:', error.message);
    }
    
    console.log('✅ All enhanced anti-detection overrides applied with USA timezone');
    
    // Return the applied timezone for fingerprint generation
    return { appliedTimezone: geoData.timezone };
    
  } catch (error) {
    console.error('❌ Anti-detection override setup failed:', error);
    return { appliedTimezone: null };
  }
}

async function createProfileWindow(profile) {
  if (profileWindows.has(profile.id)) {
    const existingData = profileWindows.get(profile.id);
    if (!existingData.window.isDestroyed()) {
      existingData.window.focus();
      return existingData.window;
    } else {
      profileWindows.delete(profile.id);
    }
  }

  // CRITICAL FIX: Establish proxy connection and fetch USA timezone BEFORE creating window
  let proxyTimezone = null;
  let localProxyPort = null;
  let proxyConnected = false;
  
  // console.log(`🚀 [${new Date().toISOString()}] Starting profile creation for: ${profile.name}`);
  
  // Set up proxy first to get USA timezone
  if (profile.proxy) {
    let proxyString = '';
    let hasValidProxy = false;
    
    if (typeof profile.proxy === 'string') {
      proxyString = profile.proxy.trim();
      hasValidProxy = proxyString.length > 0;
    } else if (typeof profile.proxy === 'object' && profile.proxy.host) {
      proxyString = `${profile.proxy.host}:${profile.proxy.port}`;
      if (profile.proxy.username && profile.proxy.password) {
        proxyString = `${proxyString}:${profile.proxy.username}:${profile.proxy.password}`;
      }
      hasValidProxy = true;
    }

    if (hasValidProxy && (profile.proxyType === 'socks5' || profile.proxyType === 'socks4')) {
      try {
        // console.log(`🔗 [${new Date().toISOString()}] Setting up SOCKS proxy connection...`);
        const normalizedProxy = proxyManager.normalizeProxy(proxyString, profile.proxyType);
        const localProxy = await proxyManager.createEnhancedLocalProxy(normalizedProxy, profile.id);
        localProxyPort = localProxy.port;
        proxyConnected = true;
        
        console.log(`✅ [${new Date().toISOString()}] SOCKS proxy connected on local port: ${localProxyPort}`);
        
        // OPTIMIZED: Reduced proxy ready wait time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // CRITICAL: Fetch USA timezone from proxy IP BEFORE creating window
        // console.log(`🔍 [${new Date().toISOString()}] Fetching USA timezone from proxy IP...`);
        const timezoneResult = await getTimezoneFromProxyIP(localProxyPort);
        if (timezoneResult.success) {
          proxyTimezone = timezoneResult.timezone;
          console.log(`✅ [${new Date().toISOString()}] Proxy USA timezone detected: ${proxyTimezone} (IP: ${timezoneResult.ip})`);
        } else {
          console.warn(`⚠️ [${new Date().toISOString()}] Failed to fetch timezone from proxy:`, timezoneResult.error);
          proxyTimezone = 'America/Los_Angeles'; // Fallback to USA West Coast
        }
      } catch (error) {
        console.warn(`⚠️ [${new Date().toISOString()}] Failed to setup proxy:`, error.message);
        proxyConnected = false;
      }
    }
  }

  // Generate fingerprint with USA timezone
  const fingerprint = getRandomFingerprint(profile, proxyTimezone);
  const windowSize = getWindowSizeForPlatform(profile.userAgentPlatform);
  const deviceMetrics = getPlatformDeviceMetrics(profile.userAgentPlatform);
  
  const realUserAgent = loadUserAgents(profile.userAgentPlatform || 'windows', profile);
  
  fingerprint.userAgent = realUserAgent;
  deviceMetrics.userAgent = realUserAgent;
  
  console.log(`✅ Using real user agent for ${profile.userAgentPlatform}:`, realUserAgent.substring(0, 100) + '...');
  
  logProfileEvent(profile.id, 'window_created', { 
    fingerprint, 
    windowSize, 
    platform: profile.userAgentPlatform,
    deviceMetrics,
    realUserAgent: realUserAgent.substring(0, 100) + '...',
    proxyTimezone: proxyTimezone, // Log the USA timezone
    proxyConnected: proxyConnected
  });

  const profileWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    minWidth: profile.userAgentPlatform === 'android' || profile.userAgentPlatform === 'ios' ? 400 : 400,
    minHeight: profile.userAgentPlatform === 'android' || profile.userAgentPlatform === 'ios' ? 600 : 300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'enhanced-webview-preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      webviewTag: true,
      partition: `persist:profile_${profile.id}`,
      experimentalFeatures: true,
      ignoreCertificateErrors: true,
      userAgent: realUserAgent,
      additionalArguments: [
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor',
        '--ignore-urlfetcher-cert-requests',
        `--window-size=${deviceMetrics.width},${deviceMetrics.height}`,
        deviceMetrics.touchEnabled ? '--touch-events=enabled' : '--touch-events=disabled',
        deviceMetrics.mobile ? '--enable-viewport-meta' : '--disable-viewport-meta',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        `--user-agent="${realUserAgent}"`
      ]
    },
    title: `BeastBrowser - ${profile.name}`,
    icon: path.join(__dirname, 'free.ico'),
    show: false
  });

  // CRITICAL FIX: Apply timezone override AFTER window loads (non-blocking)
  if (proxyTimezone) {
    // console.log(`🕰️ [${new Date().toISOString()}] Scheduling timezone override for after window loads: ${proxyTimezone}`);
    applyTimezoneOverrideDelayed(profileWindow, proxyTimezone).then(result => {
      if (result.success) {
        console.log(`✅ [${new Date().toISOString()}] Delayed timezone override successful: ${proxyTimezone}`);
      } else {
        console.error(`❌ [${new Date().toISOString()}] Delayed timezone override failed:`, result.error);
      }
    });
  }

  // FIXED: Enable F12 developer tools for profile windows
  profileWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      profileWindow.webContents.toggleDevTools();
    }
  });

  if (process.platform === 'win32') {
    try {
      profileWindow.setIcon(path.join(__dirname, 'free.ico'));
      
      profileWindow.setAppDetails({
        appId: `BeastBrowser.Profile.${profile.id}`,
        appIconPath: path.join(__dirname, 'free.ico'),
        appIconIndex: 0,
        relaunchCommand: process.execPath,
        relaunchDisplayName: `BeastBrowser - ${profile.name}`,
        appUserModelId: `BeastBrowser.Profile.${profile.id}`
      });
      
      console.log(`✅ Profile window icon configured for ${profile.name}`);
    } catch (error) {
      console.error(`❌ Error setting profile window icon for ${profile.name}:`, error);
    }
  }

  let proxyString = '';
  let hasValidProxy = false;
  
  if (profile.proxy) {
    if (typeof profile.proxy === 'string') {
      proxyString = profile.proxy.trim();
      hasValidProxy = proxyString.length > 0;
    } else if (typeof profile.proxy === 'object' && profile.proxy.host) {
      proxyString = `${profile.proxy.host}:${profile.proxy.port}`;
      if (profile.proxy.username && profile.proxy.password) {
        proxyString = `${proxyString}:${profile.proxy.username}:${profile.proxy.password}`;
      }
      hasValidProxy = true;
    }
  }

  if (hasValidProxy) {
    const proxyType = profile.proxyType || 'http';
    
    if (proxyType === 'http' || proxyType === 'https') {
      try {
        // console.log('🌍 Setting up HTTP/HTTPS proxy...');
        
        const normalizedProxy = proxyManager.normalizeProxy(proxyString, proxyType);
        logProfileEvent(profile.id, 'http_proxy_attempting', { proxy: normalizedProxy });
        
        const connectivityTest = await proxyManager.testProxyConnectivity(normalizedProxy);
        if (!connectivityTest.success) {
          throw new Error(`HTTP/HTTPS proxy connectivity test failed: ${connectivityTest.error}`);
        }
        
        console.log(`✅ HTTP/HTTPS proxy connectivity verified: ${connectivityTest.ip}`);
        
        const profileDir = path.join(__dirname, '../profile-data', `profile_${profile.id}`);
        if (!fs.existsSync(profileDir)) {
          fs.mkdirSync(profileDir, { recursive: true });
        }
        
        let geoResult = null;
        try {
          const parsedProxy = geoProxyManager.parseProxyInput(proxyString);
          parsedProxy.type = proxyType;
          geoResult = await geoProxyManager.testProxyWithGeoLookup(parsedProxy);
          
          if (geoResult.success) {
            // console.log(`🌍 Geo data obtained: ${geoResult.country} (${geoResult.timezone})`);
            
            // FIXED: Use actual geo data from API response
            profile.geoData = {
              ip: geoResult.ip,
              country: geoResult.country || 'Unknown',
              region: geoResult.region || 'Unknown',
              city: geoResult.city || 'Unknown',
              latitude: geoResult.latitude || null,
              longitude: geoResult.longitude || null,
              timezone: geoResult.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
              locale: geoResult.locale || 'en-US',
              testedAt: geoResult.testedAt
            };
            
            try {
              const geoDataPath = path.join(profileDir, 'geo-data.json');
              fs.writeFileSync(geoDataPath, JSON.stringify(profile.geoData, null, 2));
              // console.log(`💾 Geo data saved to: ${geoDataPath}`);
            } catch (saveError) {
              console.warn('⚠️ Failed to save geo data:', saveError.message);
            }
          }
        } catch (geoError) {
          console.warn('⚠️ Geo-lookup failed, proceeding without geo data:', geoError.message);
        }
        
        const profileSession = session.fromPartition(`persist:profile_${profile.id}`);
        
        // Enhanced proxy configuration with better error handling
        try {
          await profileSession.setProxy({
            proxyRules: normalizedProxy,
            proxyBypassRules: 'localhost,127.0.0.1,<-loopback>'
          });
          
          // Also set proxy for the window's webContents session
          await profileWindow.webContents.session.setProxy({
            proxyRules: normalizedProxy,
            proxyBypassRules: 'localhost,127.0.0.1,<-loopback>'
          });
        } catch (proxyError) {
          console.warn('⚠️ Failed to set proxy, trying alternative method:', proxyError.message);
          
          // Fallback: try without bypass rules
          await profileSession.setProxy({
            proxyRules: normalizedProxy
          });
          
          await profileWindow.webContents.session.setProxy({
            proxyRules: normalizedProxy
          });
        }
        
        profileSession.setCertificateVerifyProc((request, callback) => {
          callback(0);
        });
        
        const proxyUrl = new URL(normalizedProxy);
        if (proxyUrl.username && proxyUrl.password) {
          profileSession.on('login', (event, request, authInfo, callback) => {
            if (authInfo.isProxy) {
              event.preventDefault();
              callback(decodeURIComponent(proxyUrl.username), decodeURIComponent(proxyUrl.password));
              logProfileEvent(profile.id, 'http_proxy_auth_success', { host: authInfo.host });
            }
          });
        }
        
        console.log(`✅ HTTP/HTTPS proxy configured successfully: ${connectivityTest.ip}`);
        
        logProfileEvent(profile.id, 'http_proxy_setup_success', {
          proxy: normalizedProxy,
          ip: connectivityTest.ip,
          geoData: profile.geoData
        });
        
        hasValidProxy = true;
        
      } catch (error) {
        console.error('❌ HTTP/HTTPS proxy setup failed:', error.message);
        logProfileEvent(profile.id, 'http_proxy_setup_error', { error: error.message });
        hasValidProxy = false;
      }
      
    } else if (proxyType === 'socks5' || proxyType === 'socks4') {
      try {
        const normalizedProxy = proxyManager.normalizeProxy(proxyString, proxyType);
        logProfileEvent(profile.id, 'proxy_attempting', { proxy: normalizedProxy });
        
        const profileSession = session.fromPartition(`persist:profile_${profile.id}`);
        
        if (normalizedProxy.startsWith('socks5://') || normalizedProxy.startsWith('socks4://')) {
          // Use existing local proxy if already created
          if (!localProxyPort) {
            const localProxy = await proxyManager.createEnhancedLocalProxy(normalizedProxy, profile.id);
            localProxyPort = localProxy.port;
          }
          
          proxyManager.activeServers.set(profile.id, proxyManager.activeServers.get(profile.id));
          
          await profileSession.setProxy({
            proxyRules: `http://127.0.0.1:${localProxyPort}`,
            proxyBypassRules: ''
          });
          
          await profileWindow.webContents.session.setProxy({
            proxyRules: `http://127.0.0.1:${localProxyPort}`,
            proxyBypassRules: ''
          });
          
          console.log(`✅ [${new Date().toISOString()}] SOCKS proxy configured via local HTTP proxy on port ${localProxyPort}`);
          
          logProfileEvent(profile.id, 'proxy_set_success', { 
            proxy: normalizedProxy,
            localPort: localProxyPort,
            timezone: proxyTimezone
          });
          
          hasValidProxy = true;
        }
      } catch (error) {
        console.error('❌ SOCKS5 proxy setup failed:', error.message);
        logProfileEvent(profile.id, 'socks_proxy_setup_error', { error: error.message });
        hasValidProxy = false;
      }
    }
  }

  profileWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['notifications'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  profileWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') {
      return false;
    }
    return true;
  });

  const browserInterfacePath = path.join(__dirname, 'ui/index.html');
  
  // CRITICAL FIX: Load the browser interface WITHOUT blocking
  // console.log(`🌐 [${new Date().toISOString()}] Loading browser interface: ${browserInterfacePath}`);
  profileWindow.loadFile(browserInterfacePath);

  profileWindow.webContents.once('dom-ready', async () => {
    // console.log(`🎯 [${new Date().toISOString()}] Browser interface DOM ready for profile: ${profile.name}`);
    
    // Apply anti-detection overrides AFTER DOM is ready
    if (hasValidProxy && profile.geoData) {
      // console.log(`🔄 Applying enhanced CDP overrides for ${profile.proxyType} proxy...`);
      
      setTimeout(async () => {
        await applyAntiDetectionOverrides(profileWindow, profile.geoData, profile.userAgentPlatform, realUserAgent, localProxyPort);
      }, 300); // Optimized delay for faster loading
    } else if (hasValidProxy && localProxyPort) {
      // console.log('🔄 Applying platform-specific overrides with USA timezone detection...');
      setTimeout(async () => {
        // Create geoData with USA timezone
        const geoData = {
          timezone: proxyTimezone,
          ip: 'detected-from-proxy',
          country: 'US',
          source: 'proxy-ip-detection'
        };
        await applyAntiDetectionOverrides(profileWindow, geoData, profile.userAgentPlatform, realUserAgent, localProxyPort);
      }, 300);
    } else {
      // console.log('🔄 Applying platform-specific overrides for:', profile.userAgentPlatform);
      setTimeout(async () => {
        await applyAntiDetectionOverrides(profileWindow, {}, profile.userAgentPlatform, realUserAgent, localProxyPort);
      }, 300);
    }
    
    // Inject profile configuration - optimized timing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    profileWindow.webContents.executeJavaScript(`
      window.profileId = '${profile.id}';
      window.profileName = '${profile.name}';
      window.userAgent = '${realUserAgent || fingerprint.userAgent}';
      window.hasProxy = ${hasValidProxy};
      window.proxyType = '${profile.proxyType || 'SOCKS5'}';
      window.localProxyPort = ${localProxyPort || 'null'};
      window.startingUrl = '${profile.startingUrl || ''}';
      window.geoData = ${profile.geoData ? JSON.stringify(profile.geoData) : 'null'};
      window.platformConfig = {
        platform: '${profile.userAgentPlatform}',
        deviceMetrics: ${JSON.stringify(deviceMetrics)},
        realUserAgent: '${realUserAgent || fingerprint.userAgent}',
        proxyTimezone: '${proxyTimezone || 'not-detected'}',
        proxyConnected: ${proxyConnected}
      };
      
      // console.log('🐈 [' + new Date().toISOString() + '] REAL USER AGENT INJECTED:', '${realUserAgent ? realUserAgent.substring(0, 100) + '...' : 'fallback'}');
      
      if (typeof updateProxyStatus === 'function') {
        updateProxyStatus(${hasValidProxy}, '${profile.proxyType || 'SOCKS5'}');
      }
      
      setTimeout(() => {
        if (window.startingUrl && window.startingUrl.trim() && typeof navigateToUrl === 'function') {
          navigateToUrl(window.startingUrl);
        }
      }, 2000);
      
      // console.log('🦁 [' + new Date().toISOString() + '] BeastBrowser Profile loaded:', {
        name: '${profile.name}',
        platform: '${profile.userAgentPlatform}',
        proxy: '${hasValidProxy ? 'Active (' + (profile.proxyType || 'SOCKS5') + ')' : 'Direct connection'}',
        userAgent: '${deviceMetrics.userAgent ? deviceMetrics.userAgent.substring(0, 50) + '...' : 'fallback'}',
        antiDetection: 'Active',
        geoData: window.geoData,
        timezone: '${proxyTimezone || fingerprint.timezone}',
        timezoneSource: '${proxyTimezone ? 'proxy-ip-detection' : 'profile-default'}',
        proxyConnected: ${proxyConnected},
        devTools: 'Press F12 to open developer tools'
      });
    `);
  });

  profileWindows.set(profile.id, { 
    window: profileWindow, 
    localProxyServer: proxyManager.activeServers.get(profile.id) 
  });

  profileWindow.on('closed', () => {
    proxyManager.closeProxyServer(profile.id);
    logProfileEvent(profile.id, 'window_closed');
    
    // console.log(`📊 Profile ${profile.id} closed. Remaining profiles: ${profileWindows.size}`);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('profile-window-closed', profile.id);
    }
  });

  // CRITICAL FIX: Show window immediately after creation
  profileWindow.once('ready-to-show', () => {
    // console.log(`👁️ [${new Date().toISOString()}] Profile window ready to show: ${profile.name}`);
    profileWindow.show();
    profileWindow.focus();
  });

  return profileWindow;
}

// CRITICAL NEW FEATURE: Cache, Cookies और History clearing functionality
ipcMain.handle('clear-profile-data', async (event, profileId, dataTypes) => {
  try {
    // console.log(`🧹 [CLEAR] Clearing profile data for ${profileId}:`, dataTypes);
    
    const profileData = profileWindows.get(profileId);
    if (!profileData || profileData.window.isDestroyed()) {
      return { success: false, error: 'Profile window not found or closed' };
    }
    
    const profileSession = profileData.window.webContents.session;
    const clearOptions = {};
    
    // Configure what to clear based on dataTypes array
    if (dataTypes.includes('cookies')) {
      clearOptions.storages = (clearOptions.storages || []).concat(['cookies']);
    }
    
    if (dataTypes.includes('cache')) {
      clearOptions.storages = (clearOptions.storages || []).concat(['appcache', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']);
    }
    
    if (dataTypes.includes('history')) {
      clearOptions.storages = (clearOptions.storages || []).concat(['history']);
    }
    
    if (dataTypes.includes('downloads')) {
      clearOptions.storages = (clearOptions.storages || []).concat(['downloads']);
    }
    
    if (dataTypes.includes('formdata')) {
      clearOptions.storages = (clearOptions.storages || []).concat(['formdata']);
    }
    
    if (dataTypes.includes('passwords')) {
      clearOptions.storages = (clearOptions.storages || []).concat(['passwords']);
    }
    
    // Clear the specified data
    await profileSession.clearStorageData(clearOptions);
    
    // Also clear HTTP cache if cache is requested
    if (dataTypes.includes('cache')) {
      await profileSession.clearCache();
    }
    
    // Clear cookies separately for better control
    if (dataTypes.includes('cookies')) {
      await profileSession.clearStorageData({ storages: ['cookies'] });
      
      // Also manually clear all cookies
      const cookies = await profileSession.cookies.get({});
      for (const cookie of cookies) {
        await profileSession.cookies.remove(`http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`, cookie.name);
      }
    }
    
    console.log(`✅ [CLEAR] Successfully cleared profile data for ${profileId}:`, dataTypes);
    logProfileEvent(profileId, 'data_cleared', { dataTypes });
    
    return { 
      success: true, 
      message: `Cleared ${dataTypes.join(', ')} for profile ${profileId}`,
      clearedTypes: dataTypes
    };
    
  } catch (error) {
    console.error(`❌ [CLEAR] Failed to clear profile data:`, error);
    logProfileEvent(profileId, 'data_clear_error', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Enhanced clear all profile data
ipcMain.handle('clear-all-profile-data', async (event, profileId) => {
  try {
    // console.log(`🧹 [CLEAR-ALL] Clearing all data for profile ${profileId}`);
    
    const profileData = profileWindows.get(profileId);
    if (!profileData || profileData.window.isDestroyed()) {
      return { success: false, error: 'Profile window not found or closed' };
    }
    
    const profileSession = profileData.window.webContents.session;
    
    // Clear all storage data
    await profileSession.clearStorageData({
      storages: [
        'appcache',
        'cookies', 
        'filesystem',
        'indexdb',
        'localstorage',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage',
        'history',
        'downloads',
        'formdata',
        'passwords'
      ]
    });
    
    // Clear HTTP cache
    await profileSession.clearCache();
    
    // Clear host resolver cache
    await profileSession.clearHostResolverCache();
    
    // Clear auth cache
    await profileSession.clearAuthCache();
    
    // Manually clear all cookies
    const cookies = await profileSession.cookies.get({});
    for (const cookie of cookies) {
      await profileSession.cookies.remove(`http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`, cookie.name);
    }
    
    // Reload the browser interface to apply changes
    await profileData.window.webContents.reload();
    
    console.log(`✅ [CLEAR-ALL] Successfully cleared all data for profile ${profileId}`);
    logProfileEvent(profileId, 'all_data_cleared', { clearedItems: cookies.length });
    
    return { 
      success: true, 
      message: `All browsing data cleared for profile ${profileId}`,
      clearedItems: {
        cookies: cookies.length,
        cache: true,
        storage: true,
        history: true
      }
    };
    
  } catch (error) {
    console.error(`❌ [CLEAR-ALL] Failed to clear all profile data:`, error);
    logProfileEvent(profileId, 'all_data_clear_error', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Get profile data usage statistics
ipcMain.handle('get-profile-data-usage', async (event, profileId) => {
  try {
    const profileData = profileWindows.get(profileId);
    if (!profileData || profileData.window.isDestroyed()) {
      return { success: false, error: 'Profile window not found or closed' };
    }
    
    const profileSession = profileData.window.webContents.session;
    
    // Get cookies count
    const cookies = await profileSession.cookies.get({});
    
    // Get storage usage (approximate)
    const storageUsage = await profileSession.getBlobData();
    
    return {
      success: true,
      usage: {
        cookies: cookies.length,
        storageSize: storageUsage ? storageUsage.length : 0,
        profileName: profileId,
        lastAccessed: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to get profile data usage:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handlers
ipcMain.handle('profiles:open', async (event, profile) => {
  try {
    logProfileEvent(profile.id, 'open_requested', { name: profile.name });
    
    if (profile.geoData && profile.geoData.testedAt) {
      const cacheAge = Date.now() - new Date(profile.geoData.testedAt).getTime();
      const is24HoursOld = cacheAge > 24 * 60 * 60 * 1000;
      
      if (is24HoursOld && profile.proxy && (profile.proxyType === 'http' || profile.proxyType === 'https')) {
        // console.log('🔄 Geo data cache expired, refreshing for profile:', profile.name);
        
        try {
          let proxyString = '';
          if (typeof profile.proxy === 'string') {
            proxyString = profile.proxy.trim();
          } else if (typeof profile.proxy === 'object' && profile.proxy.host) {
            proxyString = `${profile.proxy.host}:${profile.proxy.port}`;
            if (profile.proxy.username && profile.proxy.password) {
              proxyString = `${proxyString}:${profile.proxy.username}:${profile.proxy.password}`;
            }
          }
          
          if (proxyString) {
            const parsedProxy = geoProxyManager.parseProxyInput(proxyString);
            parsedProxy.type = profile.proxyType;
            
            // Add timeout to prevent hanging on geo lookup
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Geo lookup timeout')), 10000)
            );
            
            const geoResult = await Promise.race([
              geoProxyManager.testProxyWithGeoLookup(parsedProxy),
              timeoutPromise
            ]);
            if (geoResult.success) {
              // CRITICAL FIX: FORCE USA DATA EVEN ON REFRESH
              // FIXED: Use actual geo data from proxy IP instead of forcing USA
              profile.geoData = {
                ip: geoResult.ip,
                country: geoResult.country || 'Unknown',
                region: geoResult.region || 'Unknown',
                city: geoResult.city || 'Unknown',
                latitude: geoResult.latitude || null,
                longitude: geoResult.longitude || null,
                timezone: geoResult.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                locale: geoResult.locale || 'en-US',
                testedAt: geoResult.testedAt
              };
              
              console.log('✅ USA Geo data refreshed for profile:', profile.name);
            }
          }
        } catch (refreshError) {
          console.warn('⚠️ Failed to refresh geo data:', refreshError.message);
        }
      }
    }
    
    const window = await createProfileWindow(profile);
    logProfileEvent(profile.id, 'open_success', { windowId: window.id });
    return { success: true, message: 'Profile window created' };
  } catch (error) {
    logProfileEvent(profile.id, 'open_failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('timezone-spoof:fetch-from-ip', async (event, ip, proxyConfig) => {
  try {
    let localProxyPort = null;
    
    if (proxyConfig && proxyConfig.localPort) {
      localProxyPort = proxyConfig.localPort;
    }
    
    const result = await getTimezoneFromProxyIP(localProxyPort);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('profiles:close', async (event, profileId) => {
  try {
    const profileData = profileWindows.get(profileId);
    if (profileData) {
      if (!profileData.window.isDestroyed()) {
        profileData.window.close();
      }
      profileWindows.delete(profileId);
      logProfileEvent(profileId, 'closed');
      return { success: true };
    }
    return { success: false, error: 'Profile window not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('profiles:close-all', async (event) => {
  try {
    let closedCount = 0;
    const profilesToClose = [...profileWindows.keys()];
    
    for (const profileId of profilesToClose) {
      const profileData = profileWindows.get(profileId);
      if (profileData && !profileData.window.isDestroyed()) {
        profileData.window.close();
        closedCount++;
      }
      profileWindows.delete(profileId);
      logProfileEvent(profileId, 'closed_via_close_all');
    }
    
    return { success: true, closedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('profiles:get-status', async (event, profileId) => {
  const profileData = profileWindows.get(profileId);
  return {
    id: profileId,
    isOpen: profileData && !profileData.window?.isDestroyed(),
    logs: profileLogs.get(profileId) || []
  };
});

ipcMain.handle('proxy:test', async (event, proxyConfig) => {
  try {
    let proxyString = '';
    if (proxyConfig.proxy) {
      if (typeof proxyConfig.proxy === 'string') {
        proxyString = proxyConfig.proxy.trim();
      } else if (typeof proxyConfig.proxy === 'object' && proxyConfig.proxy.host) {
        proxyString = `${proxyConfig.proxy.host}:${proxyConfig.proxy.port}`;
        if (proxyConfig.proxy.username && proxyConfig.proxy.password) {
          proxyString = `${proxyString}:${proxyConfig.proxy.username}:${proxyConfig.proxy.password}`;
        }
      }
    }
    
    if (!proxyString) {
      return { success: false, error: 'No proxy configuration provided' };
    }
    
    const proxyType = proxyConfig.proxyType || 'http';
    
    if (proxyType === 'http' || proxyType === 'https') {
      try {
        const parsedProxy = geoProxyManager.parseProxyInput(proxyString);
        parsedProxy.type = proxyType;
        
        const result = await geoProxyManager.testProxyWithGeoLookup(parsedProxy);
        
        if (result.success) {
          // Return actual geo results from proxy test
          return {
            success: true,
            ip: result.ip,
            proxy: `${proxyType}://${proxyString}`,
            country: result.country,
            region: result.region,
            city: result.city,
            latitude: result.latitude,
            longitude: result.longitude,
            timezone: result.timezone,
            locale: result.locale,
            responseTime: result.responseTime,
            testEndpoint: result.testEndpoint,
            testedAt: result.testedAt,
            geoData: {
              country: result.country,
              region: result.region,
              city: result.city,
              latitude: result.latitude,
              longitude: result.longitude,
              timezone: result.timezone,
              locale: result.locale
            }
          };
        } else {
          return {
            success: false,
            error: result.error,
            attempts: result.attempts
          };
        }
      } catch (parseError) {
        return { success: false, error: `Invalid proxy format: ${parseError.message}` };
      }
    } else {
      const normalizedProxy = proxyManager.normalizeProxy(proxyString, proxyType);
      const result = await proxyManager.testProxyConnectivity(normalizedProxy);
      
      if (result.success) {
        return { 
          success: true, 
          ip: result.ip, 
          proxy: normalizedProxy,
          attempt: result.attempt,
          testUrl: result.testUrl,
          responseTime: result.responseTime || 'Unknown'
        };
      } else {
        return { 
          success: false, 
          error: result.error,
          attempts: result.attempts
        };
      }
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proxy:test-geo', async (event, proxyInput) => {
  try {
    const parsedProxy = geoProxyManager.parseProxyInput(proxyInput);
    const result = await geoProxyManager.testProxyWithGeoLookup(parsedProxy);
    
    // Use actual geo test results without forcing
    
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proxy:verify-profile', async (event, profileId) => {
  try {
    const profileData = profileWindows.get(profileId);
    if (!profileData || profileData.window.isDestroyed()) {
      return { success: false, error: 'Profile window not found or closed' };
    }
    
    const verificationResult = await profileData.window.webContents.executeJavaScript(`
      (async function() {
        try {
          const ipResponse = await fetch('https://ipinfo.io/json');
          const ipData = await ipResponse.json();
          
          const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const detectedLanguage = navigator.language;
          const detectedLanguages = navigator.languages;
          
          let geoLocation = null;
          try {
            geoLocation = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
          } catch (geoError) {
            // Geolocation permission denied or not available
          }
          
          let webRTCBlocked = false;
          try {
            new RTCPeerConnection();
            webRTCBlocked = false;
          } catch (rtcError) {
            webRTCBlocked = true;
          }
          
          return {
            success: true,
            verification: {
              ip: ipData.ip,
              country: ipData.country,
              region: ipData.region,
              city: ipData.city,
              timezone: detectedTimezone,
              locale: detectedLanguage,
              languages: detectedLanguages,
              geolocation: geoLocation ? {
                latitude: geoLocation.coords.latitude,
                longitude: geoLocation.coords.longitude
              } : null,
              webRTCBlocked: webRTCBlocked,
              userAgent: navigator.userAgent,
              beastBrowserTimezone: window.beastBrowserTimezone || null,
              globalTimezone: window.BEAST_BROWSER_TIMEZONE || null
            },
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })()
    `);
    
    return verificationResult;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proxy:set', async (event, proxyConfig) => {
  try {
    global.currentProxyConfig = proxyConfig;
    return { success: true, message: 'Proxy configuration saved' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proxy:get', async (event) => {
  return global.currentProxyConfig || {};
});

ipcMain.handle('anti-detection:set', async (event, config) => {
  try {
    global.antiDetectionConfig = config;
    return { success: true, message: 'Anti-detection configuration saved' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('anti-detection:get', async (event) => {
  return global.antiDetectionConfig || {
    randomizeUserAgent: true,
    spoofCanvas: true,
    randomizeScreen: true,
    randomizeTimezone: true,
    randomizeHardware: true,
    blockWebRTC: true,
    blockTracking: true,
    spoofWebGL: true
  };
});

ipcMain.handle('browser:navigate', async (event, url) => {
  try {
    // console.log('📍 Navigation request received:', url);
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rpa:execute-script', async (event, profileId, script) => {
  try {
    const profileData = profileWindows.get(profileId);
    if (!profileData || profileData.window.isDestroyed()) {
      return { success: false, error: 'Profile window not found or closed' };
    }

    logProfileEvent(profileId, 'rpa_script_start', { scriptName: script.name });
    
    // console.log('🤖 Starting RPA script execution...', script.name);
    
    const result = await profileData.window.webContents.executeJavaScript(`
      (async function() {
        try {
          // console.log('🤖 RPA Script: ${script.name} - Starting execution');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          let webview = null;
          let attempts = 0;
          const maxAttempts = 30;
          
          while (!webview && attempts < maxAttempts) {
            attempts++;
            // console.log('🔍 Webview detection attempt ' + attempts + '/' + maxAttempts);
            
            webview = document.querySelector('webview') || 
                     document.querySelector('#webview') || 
                     document.querySelector('.webview');
            
            if (!webview && window.tabs && window.currentTabId) {
              const currentTab = window.tabs[window.currentTabId];
              if (currentTab && currentTab.webview) {
                webview = currentTab.webview;
                console.log('✅ Found webview in current tab');
              }
            }
            
            if (!webview && attempts === 5) {
              // console.log('🔄 Creating webview by navigation...');
              if (typeof window.navigateToUrl === 'function') {
                window.navigateToUrl('about:blank');
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
            
            if (!webview && attempts === 10) {
              // console.log('🔄 Creating new tab...');
              if (typeof window.createNewTab === 'function') {
                window.createNewTab();
                await new Promise(resolve => setTimeout(resolve, 2000));
              } else {
                const newTabBtn = document.querySelector('.new-tab-btn');
                if (newTabBtn) {
                  newTabBtn.click();
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            }
            
            if (!webview) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          if (!webview) {
            throw new Error(
              'Webview not found after ' + maxAttempts + ' attempts. ' +
              'Browser interface may not be fully loaded. ' +
              'Please wait a moment and try again.'
            );
          }
          
          console.log('✅ Webview found! Executing script...');
          
          const scriptResult = await webview.executeJavaScript(\`
            (async function() {
              try {
                // console.log('🌐 RPA Script executing in webview context');
                
                const page = {
                  goto: async (url) => {
                    // console.log('📍 Navigating to:', url);
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = 'https://' + url;
                    }
                    window.location.href = url;
                    await new Promise(resolve => {
                      const checkLoad = () => {
                        if (document.readyState === 'complete') {
                          resolve();
                        } else {
                          setTimeout(checkLoad, 100);
                        }
                      };
                      checkLoad();
                    });
                    console.log('✅ Navigation completed');
                  },
                  
                  waitForSelector: async (selector, timeout = 30000) => {
                    // console.log('⏳ Waiting for selector:', selector);
                    return new Promise((resolve, reject) => {
                      const startTime = Date.now();
                      const checkElement = () => {
                        const element = document.querySelector(selector);
                        if (element) {
                          console.log('✅ Element found:', selector);
                          resolve(element);
                        } else if (Date.now() - startTime > timeout) {
                          reject(new Error('Timeout waiting for selector: ' + selector));
                        } else {
                          setTimeout(checkElement, 200);
                        }
                      };
                      checkElement();
                    });
                  },
                  
                  waitForTimeout: async (ms) => {
                    // console.log('⏱️ Waiting for:', ms + 'ms');
                    await new Promise(resolve => setTimeout(resolve, ms));
                  },
                  
                  type: async (selector, text, options = {}) => {
                    // console.log('⌨️ Typing in:', selector, 'text:', text);
                    const element = document.querySelector(selector);
                    if (!element) {
                      throw new Error('Element not found: ' + selector);
                    }
                    
                    element.focus();
                    element.value = '';
                    
                    for (let i = 0; i < text.length; i++) {
                      const char = text[i];
                      element.value += char;
                      
                      element.dispatchEvent(new Event('input', { bubbles: true }));
                      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
                      
                      const delay = options.delay || (50 + Math.random() * 100);
                      await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Typing completed');
                  },
                  
                  click: async (selector) => {
                    // console.log('👆 Clicking:', selector);
                    const element = document.querySelector(selector);
                    if (!element) {
                      throw new Error('Element not found: ' + selector);
                    }
                    
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const rect = element.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;
                    
                    ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                      element.dispatchEvent(new MouseEvent(eventType, {
                        bubbles: true,
                        cancelable: true,
                        clientX: x,
                        clientY: y,
                        button: 0
                      }));
                    });
                    
                    element.click();
                    console.log('✅ Click completed');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  },
                  
                  scroll: async (options = {}) => {
                    // console.log('📜 Scrolling:', options);
                    const amount = options.amount || 300;
                    const direction = options.direction === 'up' ? -1 : 1;
                    const scrollAmount = amount * direction;
                    
                    window.scrollBy({
                      top: scrollAmount,
                      left: 0,
                      behavior: 'smooth'
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    console.log('✅ Scroll completed');
                  },
                  
                  evaluate: async (func) => {
                    // console.log('🔄 Executing custom function');
                    return func();
                  },
                  
                  mouse: {
                    move: async (x, y) => {
                      // console.log('🖱️ Mouse move to:', x, y);
                      const cursor = document.createElement('div');
                      cursor.style.cssText = \\\`
                        position: fixed;
                        top: \\\${y}px;
                        left: \\\${x}px;
                        width: 20px;
                        height: 20px;
                        background: rgba(255, 0, 0, 0.8);
                        border: 2px solid white;
                        border-radius: 50%;
                        z-index: 999999;
                        pointer-events: none;
                        animation: pulse 0.5s ease-out;
                      \\\`;
                      document.body.appendChild(cursor);
                      setTimeout(() => cursor.remove(), 1000);
                    }
                  }
                };
                
                // console.log('🚀 Executing RPA script code...');
                
                ${script.code}
                
                // console.log('🎉 RPA script completed successfully!');
                return { success: true, message: 'Script executed successfully' };
                
              } catch (error) {
                console.error('❌ RPA script error:', error);
                return { success: false, error: error.message };
              }
            })()
          \`);
          
          return scriptResult;
          
        } catch (error) {
          console.error('❌ RPA execution error:', error);
          return { success: false, error: error.message };
        }
      })()
    `);
    
    logProfileEvent(profileId, 'rpa_script_complete', { 
      scriptName: script.name, 
      success: result.success 
    });
    
    return result;
    
  } catch (error) {
    logProfileEvent(profileId, 'rpa_script_error', { 
      scriptName: script.name, 
      error: error.message 
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('profiles:get-logs', async (event, profileId) => {
  return profileLogs.get(profileId) || [];
});

ipcMain.handle('profiles:clear-logs', async (event, profileId) => {
  profileLogs.delete(profileId);
  return { success: true };
});

ipcMain.handle('get-system-info', async (event) => {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    version: process.version,
    openProfiles: profileWindows.size,
    proxyServers: proxyManager.activeServers.size,
    geoProxyCache: geoProxyManager.cache.size,
    features: {
      httpProxySupport: true,
      httpsProxySupport: true,
      socks5ProxySupport: true,
      geoDetection: true,
      antiDetection: true,
      cdpOverrides: true,
      ipTimezoneSpoof: true, // NEW feature
      profileDataClearing: true // NEW feature
    }
  };
});

ipcMain.handle('show-save-dialog', async (event) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('show-open-dialog', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

// App event handlers with SSL bypass and WebRTC blocking
app.commandLine.appendSwitch('--ignore-certificate-errors');
app.commandLine.appendSwitch('--ignore-ssl-errors');
app.commandLine.appendSwitch('--ignore-certificate-errors-spki-list');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--allow-running-insecure-content');
app.commandLine.appendSwitch('--disable-features=VizDisplayCompositor');
app.commandLine.appendSwitch('--ignore-urlfetcher-cert-requests');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-field-trial-config');
app.commandLine.appendSwitch('--disable-extensions');
app.commandLine.appendSwitch('--no-first-run');

// CRITICAL: WebRTC blocking switches to prevent IP leaks
app.commandLine.appendSwitch('--disable-webrtc');
app.commandLine.appendSwitch('--disable-webrtc-hw-decoding');
app.commandLine.appendSwitch('--disable-webrtc-hw-encoding');
app.commandLine.appendSwitch('--disable-webrtc-multiple-routes');
app.commandLine.appendSwitch('--disable-webrtc-hw-vp8-encoding');
app.commandLine.appendSwitch('--disable-webrtc-hw-vp9-encoding');
app.commandLine.appendSwitch('--disable-webrtc-hw-h264-encoding');
app.commandLine.appendSwitch('--disable-webrtc-hw-h264-decoding');
app.commandLine.appendSwitch('--disable-webrtc-hw-vp8-decoding');
app.commandLine.appendSwitch('--disable-webrtc-hw-vp9-decoding');
app.commandLine.appendSwitch('--disable-webrtc-encryption');
app.commandLine.appendSwitch('--disable-webrtc-stun-origin');
app.commandLine.appendSwitch('--disable-webrtc-ice-transports');
app.commandLine.appendSwitch('--disable-webrtc-ice-candidate-pool-size');
app.commandLine.appendSwitch('--disable-webrtc-ice-servers');
app.commandLine.appendSwitch('--disable-webrtc-peer-connection');
app.commandLine.appendSwitch('--disable-webrtc-data-channels');
app.commandLine.appendSwitch('--disable-webrtc-media-stream');
app.commandLine.appendSwitch('--disable-webrtc-media-recorder');
app.commandLine.appendSwitch('--disable-webrtc-screen-capture');
app.commandLine.appendSwitch('--disable-webrtc-audio-processing');
app.commandLine.appendSwitch('--disable-webrtc-echo-cancellation');
app.commandLine.appendSwitch('--disable-webrtc-noise-suppression');
app.commandLine.appendSwitch('--disable-webrtc-automatic-gain-control');
app.commandLine.appendSwitch('--disable-webrtc-typing-detection');
app.commandLine.appendSwitch('--disable-webrtc-experimental-features');
app.commandLine.appendSwitch('--disable-webrtc-stun-origin');
app.commandLine.appendSwitch('--disable-webrtc-turn-origin');
app.commandLine.appendSwitch('--disable-webrtc-ice-candidate-pool-size');
app.commandLine.appendSwitch('--disable-webrtc-ice-servers');
app.commandLine.appendSwitch('--disable-webrtc-peer-connection');
app.commandLine.appendSwitch('--disable-webrtc-data-channels');
app.commandLine.appendSwitch('--disable-webrtc-media-stream');
app.commandLine.appendSwitch('--disable-webrtc-media-recorder');
app.commandLine.appendSwitch('--disable-webrtc-screen-capture');
app.commandLine.appendSwitch('--disable-webrtc-audio-processing');
app.commandLine.appendSwitch('--disable-webrtc-echo-cancellation');
app.commandLine.appendSwitch('--disable-webrtc-noise-suppression');
app.commandLine.appendSwitch('--disable-webrtc-automatic-gain-control');
app.commandLine.appendSwitch('--disable-webrtc-typing-detection');
app.commandLine.appendSwitch('--disable-webrtc-experimental-features');

// Billing and Usage Management IPC Handlers
ipcMain.handle('billing:get-plans', async () => {
  try {
    // For now, return default plans - in production this would use the billing service
    return [
      {
        id: 'free_plan',
        name: 'Free',
        description: 'Perfect for getting started with basic automation',
        price: 0,
        currency: 'INR',
        interval: 'day',
        intervalCount: 7,
        features: [
          { id: 'profiles', name: 'Profiles', description: 'Browser profiles', included: true, limit: 7 },
          { id: 'executions', name: 'Daily Executions', description: 'RPA executions per day', included: true, limit: 10 },
          { id: 'support', name: 'Support', description: 'Community support', included: true },
          { id: 'api', name: 'API Access', description: 'REST API access', included: false }
        ],
        limits: {
          maxProfiles: 7,
          maxProfilesPerDay: 7,
          maxExecutionsPerDay: 10,
          maxConcurrentExecutions: 1,
          trialDays: 7,
          supportLevel: 'basic',
          apiAccess: false,
          customIntegrations: false,
          advancedAnalytics: false,
          whiteLabel: false
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'monthly_plan',
        name: 'Monthly Pro',
        description: 'Unlimited profiles and executions for power users',
        price: 1900, // ₹19.00
        currency: 'INR',
        interval: 'month',
        intervalCount: 1,
        features: [
          { id: 'profiles', name: 'Unlimited Profiles', description: 'Unlimited browser profiles', included: true },
          { id: 'executions', name: 'Unlimited Executions', description: 'Unlimited RPA executions', included: true },
          { id: 'concurrent', name: 'Concurrent Executions', description: 'Run up to 5 tasks simultaneously', included: true, limit: 5 },
          { id: 'support', name: 'Priority Support', description: 'Priority email support', included: true },
          { id: 'api', name: 'API Access', description: 'Full REST API access', included: true },
          { id: 'analytics', name: 'Advanced Analytics', description: 'Detailed execution analytics', included: true }
        ],
        limits: {
          maxProfiles: -1, // unlimited
          maxProfilesPerDay: -1,
          maxExecutionsPerDay: -1,
          maxConcurrentExecutions: 5,
          trialDays: 7,
          supportLevel: 'priority',
          apiAccess: true,
          customIntegrations: true,
          advancedAnalytics: true,
          whiteLabel: false
        },
        isPopular: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'yearly_plan',
        name: 'Yearly Pro',
        description: 'Best value with 2 months free + white-label options',
        price: 19900, // ₹199.00
        currency: 'INR',
        interval: 'year',
        intervalCount: 1,
        features: [
          { id: 'profiles', name: 'Unlimited Profiles', description: 'Unlimited browser profiles', included: true },
          { id: 'executions', name: 'Unlimited Executions', description: 'Unlimited RPA executions', included: true },
          { id: 'concurrent', name: 'Concurrent Executions', description: 'Run up to 10 tasks simultaneously', included: true, limit: 10 },
          { id: 'support', name: 'Premium Support', description: '24/7 priority support', included: true },
          { id: 'api', name: 'API Access', description: 'Full REST API access', included: true },
          { id: 'analytics', name: 'Advanced Analytics', description: 'Detailed execution analytics', included: true },
          { id: 'whitelabel', name: 'White Label', description: 'Custom branding options', included: true },
          { id: 'integrations', name: 'Custom Integrations', description: 'Custom third-party integrations', included: true }
        ],
        limits: {
          maxProfiles: -1,
          maxProfilesPerDay: -1,
          maxExecutionsPerDay: -1,
          maxConcurrentExecutions: 10,
          trialDays: 7,
          supportLevel: 'premium',
          apiAccess: true,
          customIntegrations: true,
          advancedAnalytics: true,
          whiteLabel: true
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  } catch (error) {
    console.error('Error getting billing plans:', error);
    return [];
  }
});

ipcMain.handle('billing:get-subscription', async (event, userId) => {
  try {
    // For now, return null (no subscription) - in production this would query the database
    // console.log(`[Billing] Getting subscription for user: ${userId}`);
    return null;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
});

ipcMain.handle('billing:create-subscription', async (event, userId, planId, couponCode) => {
  try {
    // console.log(`[Billing] Creating subscription for user: ${userId}, plan: ${planId}, coupon: ${couponCode}`);
    
    // For now, just return a mock subscription - in production this would integrate with Razorpay
    const mockSubscription = {
      id: `sub_${Date.now()}`,
      userId,
      planId,
      status: 'trialing',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days trial
      trialStart: new Date().toISOString(),
      trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        couponCode,
        originalPrice: 1900,
        finalPrice: 1900
      }
    };
    
    return { subscription: mockSubscription };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
});

ipcMain.handle('billing:cancel-subscription', async (event, userId, cancelAtPeriodEnd) => {
  try {
    // console.log(`[Billing] Cancelling subscription for user: ${userId}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`);
    
    // For now, return a mock cancelled subscription
    const mockSubscription = {
      id: `sub_${Date.now()}`,
      userId,
      planId: 'monthly_plan',
      status: cancelAtPeriodEnd ? 'active' : 'cancelled',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      cancelledAt: cancelAtPeriodEnd ? null : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return mockSubscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
});

ipcMain.handle('billing:get-usage-stats', async (event, userId) => {
  try {
    // console.log(`[Billing] Getting usage stats for user: ${userId}`);
    
    // For now, return mock usage stats - in production this would query the database
    return {
      userId,
      currentPeriod: {
        profilesCreated: 2,
        executionsRun: 5,
        profilesUsed: ['profile_1', 'profile_2']
      },
      limits: {
        maxProfiles: 7,
        maxProfilesPerDay: 7,
        maxExecutionsPerDay: 10,
        maxConcurrentExecutions: 1,
        trialDays: 7,
        supportLevel: 'basic',
        apiAccess: false,
        customIntegrations: false,
        advancedAnalytics: false,
        whiteLabel: false
      },
      remaining: {
        profiles: 5,
        executions: 5
      },
      resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return null;
  }
});

ipcMain.handle('billing:validate-coupon', async (event, code, planId) => {
  try {
    // console.log(`[Billing] Validating coupon: ${code} for plan: ${planId}`);
    
    // For now, return null (no valid coupon) - in production this would validate against the database
    return null;
  } catch (error) {
    console.error('Error validating coupon:', error);
    return null;
  }
});

// Usage Enforcement IPC Handlers
ipcMain.handle('usage:check-profile-creation', async (event, userId) => {
  try {
    // console.log(`[Usage] Checking profile creation limit for user: ${userId}`);
    
    // For now, always allow profile creation - in production this would check actual limits
    return { 
      allowed: true, 
      remainingProfiles: 5,
      remainingExecutions: 5
    };
  } catch (error) {
    console.error('Error checking profile creation limit:', error);
    return { allowed: false, reason: 'Unable to verify usage limits' };
  }
});

ipcMain.handle('usage:check-execution', async (event, userId) => {
  try {
    // console.log(`[Usage] Checking execution limit for user: ${userId}`);
    
    // For now, always allow execution - in production this would check actual limits
    return { 
      allowed: true, 
      remainingProfiles: 5,
      remainingExecutions: 5
    };
  } catch (error) {
    console.error('Error checking execution limit:', error);
    return { allowed: false, reason: 'Unable to verify usage limits' };
  }
});

ipcMain.handle('usage:record-profile-creation', async (event, userId, profileId) => {
  try {
    // console.log(`[Usage] Recording profile creation for user: ${userId}, profile: ${profileId}`);
    
    // For now, just log - in production this would update the database
    return { success: true };
  } catch (error) {
    console.error('Error recording profile creation:', error);
    return { success: false };
  }
});

ipcMain.handle('usage:record-execution', async (event, userId) => {
  try {
    // console.log(`[Usage] Recording execution for user: ${userId}`);
    
    // For now, just log - in production this would update the database
    return { success: true };
  } catch (error) {
    console.error('Error recording execution:', error);
    return { success: false };
  }
});

app.on('gpu-process-crashed', (event, killed) => {
  // console.log('⚠️ GPU process crashed, attempting recovery...');
  if (!killed) {
    app.relaunch();
    app.exit(0);
  }
});

app.whenReady().then(() => {
  createWindow();

  // Start Puppeteer API server
  if (apiServer) {
    apiServer.start().catch((err) => {
      console.error('❌ Failed to start Puppeteer API server:', err.message);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // console.log('🚪 All windows closed');
  
  profileWindows.forEach((profileData, profileId) => {
    if (!profileData.window.isDestroyed()) {
      // console.log('🚪 Force destroying remaining window: ' + profileId);
      profileData.window.destroy();
    }
  });
  
  proxyManager.closeAllProxyServers();
  profileWindows.clear();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // console.log('🚪 Application is closing - cleaning up all resources...');
  
  const profileIds = [...profileWindows.keys()];
  // console.log('🔄 Closing ' + profileIds.length + ' profile windows...');
  
  for (const [profileId, profileData] of profileWindows) {
    try {
      if (!profileData.window.isDestroyed()) {
        // console.log(`🚪 Closing profile window: ${profileId}`);
        profileData.window.destroy();
      }
    } catch (error) {
      log.error(`Error closing profile window ${profileId}:`, error);
    }
  }
  
  profileWindows.clear();
  console.log('✅ All profile windows closed');
  
  // console.log('🔄 Cleaning up proxy servers...');
  proxyManager.closeAllProxyServers();
  console.log('✅ All proxy servers cleaned up');
  
  // Stop Puppeteer API server
  try {
    if (apiServer) {
      apiServer.stop();
      console.log('✅ Puppeteer API server stopped');
    }
  } catch (e) {
    console.warn('⚠️ Failed to stop Puppeteer API server:', e.message);
  }
  
  if (global.gc) {
    global.gc();
  }
  
  // console.log('🎉 Application cleanup completed successfully');
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    log.warn('Blocked new window creation:', navigationUrl);
  });
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (!['http:', 'https:', 'data:', 'blob:'].includes(parsedUrl.protocol)) {
      event.preventDefault();
      log.warn('Blocked navigation to external protocol:', navigationUrl);
    }
  });
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

if (process.env.NODE_ENV === 'development') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}