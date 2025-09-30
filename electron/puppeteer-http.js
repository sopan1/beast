// puppeteer-http.js - Dedicated HTTP Proxy Handler for Puppeteer & BeastBrowser
// This file handles HTTP/HTTPS proxy connections specifically

const fs = require('fs');
const path = require('path');

// Load Puppeteer libraries
let puppeteer;
let puppeteerExtra;
let StealthPlugin;

try {
  puppeteer = require('puppeteer');
  console.log('✅ Puppeteer core loaded for HTTP proxy');
} catch (e) {
  console.warn('⚠️ Puppeteer core not found:', e.message);
}

try {
  puppeteerExtra = require('puppeteer-extra');
  console.log('✅ Puppeteer-extra loaded for HTTP proxy');
} catch (e) {
  console.warn('⚠️ Puppeteer-extra not found:', e.message);
}

try {
  StealthPlugin = require('puppeteer-extra-plugin-stealth');
  console.log('✅ Stealth plugin loaded for HTTP proxy');
} catch (e) {
  console.warn('⚠️ Stealth plugin not found:', e.message);
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-blink-features=AutomationControlled',
  '--disable-background-networking',
  '--disable-web-security',
  '--disable-features=site-per-process,Translate,IsolateOrigins,AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--enable-features=NetworkService,NetworkServiceInProcess',
  '--disable-webrtc',
  '--disable-webrtc-encryption',
  '--disable-media-stream',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--webrtc-ip-handling-policy=default_public_interface_only',
  '--enable-features=WebRtcHideLocalIpsWithMdns',
  '--disable-features=PrefetchPrivacyChanges,InterestCohort'
];

// Build user data directory path
function buildUserDataDir(profile) {
  const baseDir = path.join(__dirname, '..', 'puppeteer-profiles');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return path.join(baseDir, profile.id);
}

// Build HTTP proxy arguments for Chrome
function buildHttpProxyArgs(proxy) {
  if (!proxy || proxy.type !== 'http') return [];
  
  const proxyUrl = `http://${proxy.username ? encodeURIComponent(proxy.username) + ':' + encodeURIComponent(proxy.password) + '@' : ''}${proxy.host}:${proxy.port}`;
  
  return [
    `--proxy-server=${proxyUrl}`,
    '--ignore-certificate-errors',
    '--ignore-ssl-errors',
    '--disable-web-security',
    '--allow-running-insecure-content'
  ];
}

// Calculate timezone offset in minutes
function calculateTimezoneOffset(timezone) {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (utc.getTime() - target.getTime()) / 60000;
  } catch (e) {
    console.warn('Failed to calculate timezone offset:', e);
    return 0;
  }
}

// Generate anti-detection scripts for HTTP proxy
function generateAntiDetectionScripts(userAgent, screen, timezone, locale = 'en-US') {
  const timezoneOffsetMinutes = calculateTimezoneOffset(timezone);
  
  return `
  (function() {
    // User Agent override
    Object.defineProperty(navigator, 'userAgent', {
      get: () => ${JSON.stringify(userAgent)},
      configurable: true
    });

    // Screen properties override
    Object.defineProperty(screen, 'width', {
      get: () => ${screen.width},
      configurable: true
    });
    Object.defineProperty(screen, 'height', {
      get: () => ${screen.height},
      configurable: true
    });
    Object.defineProperty(screen, 'availWidth', {
      get: () => ${screen.availWidth},
      configurable: true
    });
    Object.defineProperty(screen, 'availHeight', {
      get: () => ${screen.availHeight},
      configurable: true
    });
    Object.defineProperty(screen, 'colorDepth', {
      get: () => ${screen.colorDepth},
      configurable: true
    });

    // HTTP Proxy Timezone overrides - CRITICAL FOR ANTI-DETECTION
    ${timezone ? `
    const TARGET_TIMEZONE = ${JSON.stringify(timezone)};
    const TIMEZONE_OFFSET = ${timezoneOffsetMinutes};
    
    // CRITICAL: COMPLETE SYSTEM TIMEZONE BLOCKING FOR HTTP PROXY
    console.log('🚫 HTTP PROXY: BLOCKING ALL SYSTEM TIMEZONE LEAKS - PROXY TIMEZONE ONLY:', TARGET_TIMEZONE);
    
    // 1. Override Date.prototype.getTimezoneOffset - PRIMARY TIMEZONE API
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
      console.log('🚫 HTTP PROXY: BLOCKED Date.getTimezoneOffset() - using proxy timezone:', TARGET_TIMEZONE);
      return TIMEZONE_OFFSET;
    };
    
    // 2. Override ALL Date.toString methods to show ONLY proxy timezone
    const originalToString = Date.prototype.toString;
    Date.prototype.toString = function() {
      const proxyTime = new Intl.DateTimeFormat('en-US', {
        timeZone: TARGET_TIMEZONE,
        weekday: 'short',
        month: 'short', 
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(this);
      console.log('🚫 HTTP PROXY: BLOCKED Date.toString() - using proxy timezone:', TARGET_TIMEZONE);
      return proxyTime;
    };
    
    const originalToTimeString = Date.prototype.toTimeString;
    Date.prototype.toTimeString = function() {
      const proxyTime = new Intl.DateTimeFormat('en-US', {
        timeZone: TARGET_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit', 
        second: '2-digit',
        timeZoneName: 'short'
      }).format(this);
      console.log('🚫 HTTP PROXY: BLOCKED Date.toTimeString() - using proxy timezone:', TARGET_TIMEZONE);
      return proxyTime;
    };
    
    const originalToDateString = Date.prototype.toDateString;
    Date.prototype.toDateString = function() {
      const proxyDate = new Intl.DateTimeFormat('en-US', {
        timeZone: TARGET_TIMEZONE,
        weekday: 'short',
        month: 'short',
        day: '2-digit', 
        year: 'numeric'
      }).format(this);
      console.log('🚫 HTTP PROXY: BLOCKED Date.toDateString() - using proxy timezone:', TARGET_TIMEZONE);
      return proxyDate;
    };
    
    const originalToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function(locales, options = {}) {
      options.timeZone = TARGET_TIMEZONE;
      console.log('🚫 HTTP PROXY: BLOCKED Date.toLocaleString() - forced proxy timezone:', TARGET_TIMEZONE);
      return originalToLocaleString.call(this, locales, options);
    };
    
    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = function(locales, options = {}) {
      options.timeZone = TARGET_TIMEZONE;
      console.log('🚫 HTTP PROXY: BLOCKED Date.toLocaleTimeString() - forced proxy timezone:', TARGET_TIMEZONE);
      return originalToLocaleTimeString.call(this, locales, options);
    };
    
    const originalToLocaleDateString = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function(locales, options = {}) {
      options.timeZone = TARGET_TIMEZONE;
      console.log('🚫 HTTP PROXY: BLOCKED Date.toLocaleDateString() - forced proxy timezone:', TARGET_TIMEZONE);
      return originalToLocaleDateString.call(this, locales, options);
    };

    // 3. COMPLETE Intl.DateTimeFormat override - FORCE PROXY TIMEZONE EVERYWHERE
    const OriginalDateTimeFormat = Intl.DateTimeFormat;
    const OriginalResolvedOptions = OriginalDateTimeFormat.prototype.resolvedOptions;
    
    Intl.DateTimeFormat = function(locales, options = {}) {
      // ALWAYS force proxy timezone, ignore any system timezone
      options.timeZone = TARGET_TIMEZONE;
      console.log('🚫 HTTP PROXY: BLOCKED Intl.DateTimeFormat - forced proxy timezone:', TARGET_TIMEZONE);
      
      const formatter = new OriginalDateTimeFormat(locales, options);
      
      // Override resolvedOptions to ALWAYS return proxy timezone
      formatter.resolvedOptions = function() {
        const resolved = OriginalResolvedOptions.call(this);
        resolved.timeZone = TARGET_TIMEZONE;
        console.log('🚫 HTTP PROXY: BLOCKED resolvedOptions.timeZone - forced proxy timezone:', TARGET_TIMEZONE);
        return resolved;
      };
      
      return formatter;
    };
    
    // Copy static methods
    Object.setPrototypeOf(Intl.DateTimeFormat, OriginalDateTimeFormat);
    Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
      value: OriginalDateTimeFormat.prototype,
      writable: false
    });
    
    // 4. Override Intl.DateTimeFormat.prototype.resolvedOptions globally
    OriginalDateTimeFormat.prototype.resolvedOptions = function() {
      const resolved = OriginalResolvedOptions.call(this);
      resolved.timeZone = TARGET_TIMEZONE;
      console.log('🚫 HTTP PROXY: BLOCKED global resolvedOptions - forced proxy timezone:', TARGET_TIMEZONE);
      return resolved;
    };
    
    // 5. Final verification - log the active timezone
    console.log('✅ HTTP PROXY TIMEZONE INJECTION COMPLETE');
    console.log('✅ Active timezone:', TARGET_TIMEZONE);
    console.log('✅ Timezone offset:', TIMEZONE_OFFSET, 'minutes');
    console.log('🚫 System timezone completely blocked for HTTP proxy');
    
    // Test the injection
    const testDate = new Date();
    console.log('🧪 HTTP PROXY Test Date.toString():', testDate.toString());
    console.log('🧪 HTTP PROXY Test Date.getTimezoneOffset():', testDate.getTimezoneOffset());
    console.log('🧪 HTTP PROXY Test Intl.DateTimeFormat().resolvedOptions().timeZone:', new Intl.DateTimeFormat().resolvedOptions().timeZone);
    ` : ''}

    // Language and locale override
    const __beastLocale = ${JSON.stringify(locale)};
    try {
      Object.defineProperty(navigator, 'language', { get: () => __beastLocale, configurable: true, enumerable: true });
      Object.defineProperty(navigator, 'languages', { get: () => [__beastLocale, __beastLocale.split('-')[0]], configurable: true, enumerable: true });
    } catch (e) {}

    window.BEAST_BROWSER_TIMEZONE = TARGET_TIMEZONE;
    console.log('✅ HTTP Proxy enhanced timezone spoofing applied:', TARGET_TIMEZONE, 'Test:', new Date().toString());
    
    // WebRTC IP leak prevention for HTTP proxy
    try {
      ['RTCPeerConnection', 'mozRTCPeerConnection', 'webkitRTCPeerConnection'].forEach(item => {
        if (window[item]) {
          const OriginalRTC = window[item];
          window[item] = function(...args) {
            console.log('🚫 HTTP PROXY: BLOCKED WebRTC connection attempt');
            throw new Error('WebRTC is disabled for HTTP proxy anti-detection');
          };
        }
      });
      
      // Block RTCIceCandidate
      if (window.RTCIceCandidate) {
        window.RTCIceCandidate = function() {
          console.log('🚫 HTTP PROXY: BLOCKED RTCIceCandidate');
          throw new Error('RTCIceCandidate is disabled for HTTP proxy anti-detection');
        };
      }
      
    } catch (err) {
      console.error('HTTP Proxy WebRTC blocking injection failed', err);
    }
  })();`;
}

class PuppeteerHttpProxyManager {
  constructor() {
    this.instances = new Map();
    this.logger = {
      log: (msg) => console.log(`${new Date().toLocaleTimeString()} > ${msg}`),
      warn: (msg, ...args) => console.warn(`⚠️ ${msg}`, ...args),
      error: (msg, ...args) => console.error(`❌ ${msg}`, ...args)
    };
  }

  // Detect timezone by making API call through HTTP proxy
  async detectTimezoneFromProxy(proxy) {
    try {
      const fetch = require('node-fetch');
      let agent;
      
      // Create HTTP proxy agent
      if (proxy.type === 'http') {
        const { HttpsProxyAgent } = require('https-proxy-agent');
        const proxyUrl = `http://${proxy.username ? encodeURIComponent(proxy.username) + ':' + encodeURIComponent(proxy.password) + '@' : ''}${proxy.host}:${proxy.port}`;
        agent = new HttpsProxyAgent(proxyUrl);
      }
      
      const endpoints = [
        'http://worldtimeapi.org/api/ip',
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'http://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query'
      ];
      
      for (const endpoint of endpoints) {
        try {
          this.logger.log(`🌐 Trying HTTP proxy API endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            agent: agent,
            timeout: 15000,
            headers: {
              'User-Agent': DEFAULT_USER_AGENT
            }
          });
          
          const data = await response.json();
          
          if (data.timezone || data.tz) {
            const timezone = data.timezone || data.tz;
            const ip = data.query || data.ip;
            
            this.logger.log(`✅ HTTP Proxy timezone detected: ${timezone} (IP: ${ip})`);
            return { success: true, timezone, ip };
          }
        } catch (error) {
          this.logger.warn(`HTTP Proxy API endpoint ${endpoint} failed:`, error.message);
          continue;
        }
      }
      
      return { success: false, error: 'All HTTP proxy API endpoints failed' };
      
    } catch (error) {
      this.logger.error('HTTP Proxy timezone detection failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get fallback timezone based on HTTP proxy characteristics
  getHttpProxyFallbackTimezone(proxy) {
    if (!proxy) return 'America/New_York';
    
    // Common HTTP proxy server locations and their timezones
    const proxyTimezoneMap = {
      // US-based proxies
      'us': 'America/New_York',
      'usa': 'America/New_York', 
      'united': 'America/New_York',
      'america': 'America/New_York',
      'chicago': 'America/Chicago',
      'los': 'America/Los_Angeles',
      'california': 'America/Los_Angeles',
      'texas': 'America/Chicago',
      'florida': 'America/New_York',
      
      // European proxies
      'uk': 'Europe/London',
      'london': 'Europe/London',
      'germany': 'Europe/Berlin',
      'france': 'Europe/Paris',
      'netherlands': 'Europe/Amsterdam',
      'europe': 'Europe/London',
      
      // Asian proxies
      'japan': 'Asia/Tokyo',
      'singapore': 'Asia/Singapore',
      'hong': 'Asia/Hong_Kong',
      'china': 'Asia/Shanghai',
      'india': 'Asia/Kolkata',
      
      // Other regions
      'canada': 'America/Toronto',
      'australia': 'Australia/Sydney',
      'brazil': 'America/Sao_Paulo'
    };
    
    const proxyHost = proxy.host.toLowerCase();
    const proxyUsername = (proxy.username || '').toLowerCase();
    
    // Check proxy host for location indicators
    for (const [keyword, timezone] of Object.entries(proxyTimezoneMap)) {
      if (proxyHost.includes(keyword) || proxyUsername.includes(keyword)) {
        this.logger.log(`🎯 HTTP Proxy: Detected proxy location from '${keyword}': ${timezone}`);
        return timezone;
      }
    }
    
    // Default fallback for unknown HTTP proxies
    return 'America/New_York';
  }

  async launch(profile, options = {}) {
    try {
      this.logger.log('🔥 Starting HTTP Proxy Puppeteer launch process...');
      this.logger.log('✅ Puppeteer libraries loaded successfully');

      let proxy = options.proxy || null;
      let timezone = options.timezone || null;
      let detectedIP = null;

      // HTTP Proxy timezone detection
      if (proxy && proxy.type === 'http') {
        this.logger.log('🌍 HTTP PROXY: Detecting timezone from proxy IP geolocation...');
        try {
          // Quick timeout for timezone detection to avoid hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('HTTP Proxy timezone detection timeout')), 10000)
          );
          
          const proxyTimezoneData = await Promise.race([
            this.detectTimezoneFromProxy(proxy),
            timeoutPromise
          ]);
          
          if (proxyTimezoneData.success) {
            timezone = proxyTimezoneData.timezone;
            detectedIP = proxyTimezoneData.ip;
            this.logger.log(`✅ HTTP Proxy IP timezone detected: ${timezone} (IP: ${detectedIP})`);
            this.logger.log(`🚫 System timezone will be COMPLETELY BLOCKED`);
          } else {
            this.logger.warn('⚠️ HTTP Proxy timezone detection failed:', proxyTimezoneData.error);
            timezone = this.getHttpProxyFallbackTimezone(proxy);
            this.logger.log(`🔄 Using fallback HTTP proxy timezone: ${timezone}`);
          }
        } catch (error) {
          this.logger.warn('⚠️ HTTP Proxy timezone detection error:', error.message);
          timezone = this.getHttpProxyFallbackTimezone(proxy);
          this.logger.log(`🔄 Using fallback HTTP proxy timezone: ${timezone}`);
        }
      } else {
        // No HTTP proxy - use default timezone that's NOT the system timezone
        timezone = timezone || 'America/New_York';
        this.logger.log(`🌍 No HTTP proxy - using default timezone: ${timezone}`);
        this.logger.log(`🚫 System timezone will still be BLOCKED for anti-detection`);
      }

      // CRITICAL: Ensure timezone is NEVER system timezone
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!timezone || timezone === systemTimezone) {
        timezone = 'America/New_York'; // Force different timezone
        this.logger.warn(`⚠️ Forced timezone change to avoid system timezone leak`);
      }
      
      this.logger.log(`🌍 Final HTTP proxy-based timezone: ${timezone}`);
      this.logger.log(`🚫 System timezone (${systemTimezone}) will be COMPLETELY BLOCKED`);
      this.logger.warn(`⚠️ System timezone will be BLOCKED, only HTTP proxy timezone will be used`);

      const userDataDir = buildUserDataDir(profile);

      // Build launch arguments with HTTP proxy handling
      const args = [
        ...DEFAULT_ARGS,
        ...buildHttpProxyArgs(proxy)
      ];

      // Add essential args for HTTP proxy support
      if (proxy && proxy.type === 'http') {
        args.push('--disable-background-timer-throttling');
        args.push('--disable-backgrounding-occluded-windows');
        args.push('--disable-renderer-backgrounding');
        this.logger.log(`🌐 HTTP Proxy args added: ${proxy.host}:${proxy.port}`);
      }

      const launchOptions = {
        headless: false,
        args: args,
        userDataDir: userDataDir,
        defaultViewport: null
      };

      this.logger.log(`🚀 Launching browser for HTTP proxy profile ${profile.id} with timezone ${timezone}`);
      this.logger.log(`📋 Launch options:`, JSON.stringify(launchOptions, null, 2));

      // Use puppeteer-extra with stealth plugin for better anti-detection
      const pptr = puppeteerExtra || puppeteer;
      if (StealthPlugin && pptr.use) {
        pptr.use(StealthPlugin());
      }

      let browser;
      try {
        browser = await pptr.launch(launchOptions);
        this.logger.log(`✅ Browser launched successfully with HTTP proxy!`);
      } catch (launchError) {
        this.logger.error(`❌ Browser launch failed:`, launchError.message);
        throw launchError;
      }

      // Get the first page
      const pages = await browser.pages();
      let page = pages[0];
      
      if (!page) {
        page = await browser.newPage();
      }

      // Clean up extra pages
      try {
        const defaultPages = await browser.pages();
        for (const p of defaultPages) {
          // Close default blank pages that aren't our main page
          if (!p.isClosed() && p !== page && p.url() === 'about:blank') {
            try { await p.close({ runBeforeUnload: false }); } catch (_) {}
          }
        }
      } catch (cleanupErr) {
        this.logger?.warn?.('Failed to close default pages:', cleanupErr.message || cleanupErr);
      }

      // Set HTTP proxy authentication if needed
      if (proxy && proxy.username && proxy.password) {
        try {
          await page.authenticate({
            username: proxy.username,
            password: proxy.password 
          });
          this.logger.log(`✅ HTTP proxy authentication set successfully`);
        } catch (error) {
          this.logger.warn('Failed to set HTTP proxy authentication:', error.message);
        }
      }

      // Set user agent
      const userAgent = profile.userAgent || options.userAgent || DEFAULT_USER_AGENT;
      await page.setUserAgent(userAgent);

      // Set viewport
      const viewport = profile.viewport || options.viewport || { width: 1366, height: 768 };
      await page.setViewport(viewport);

      // Set timezone override using CDP
      if (timezone) {
        try {
          const client = await page.target().createCDPSession();
          await client.send('Emulation.setTimezoneOverride', { 
            timezoneId: timezone 
          });
          this.logger.log(`Set timezone override to ${timezone}`);
        } catch (error) {
          this.logger.warn('Failed to set timezone override:', error.message);
        }
      }

      // Inject anti-detection scripts
      const screen = profile.screen || options.screen || { 
        width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24 
      };
      
      const antiDetectionScript = generateAntiDetectionScripts(userAgent, screen, timezone, profile.locale);
      
      await page.evaluateOnNewDocument(antiDetectionScript);
      this.logger.log(`✅ Anti-detection scripts injected for HTTP proxy`);

      // Navigate to initial page with HTTP proxy
      const navigationMethods = [
        { name: 'DuckDuckGo HTTPS', url: 'https://duckduckgo.com/' },
        { name: 'DuckDuckGo HTTP', url: 'http://duckduckgo.com/' },
        { name: 'Blank page', url: 'about:blank' }
      ];

      let navigationSuccess = false;
      for (const method of navigationMethods) {
        try {
          this.logger.log(`🔄 Using fast navigation mode for quicker startup`);
          await page.goto(method.url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 2000 
          });
          this.logger.log(`✅ Successfully navigated to ${method.name}: ${method.url}`);
          navigationSuccess = true;
          break;
        } catch (error) {
          this.logger.warn(`❌ Failed to navigate to ${method.name}:`, error.message);
          
          // If it's a proxy error and we haven't tried without proxy yet
          if (error.message.includes('ERR_NO_SUPPORTED_PROXIES') || 
              error.message.includes('ERR_PROXY_CONNECTION_FAILED')) {
            this.logger.warn(`🚨 HTTP Proxy causing issues, will try remaining URLs without proxy if needed`);
          }
        }
      }

      if (!navigationSuccess) {
        this.logger.warn(`⚠️ Navigation failed, but browser is ready for manual use`);
      }

      // Store instance
      const browserWSEndpoint = browser.wsEndpoint();
      
      this.instances.set(profile.id, {
        browser,
        page,
        profile,
        firstPage: page,
        userAgent,
        viewport,
        timezone,
        proxy
      });

      this.logger.log(`Browser launched successfully for HTTP proxy profile ${profile.id}`);
      
      return {
        success: true,
        browserWSEndpoint,
        timezone,
        detectedIP,
        userDataDir,
        profileId: profile.id
      };

    } catch (error) {
      this.logger.error('HTTP Proxy Puppeteer launch failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async close(profileId) {
    try {
      const inst = this.instances.get(profileId);
      if (!inst) {
        return { success: false, error: 'Profile not found' };
      }

      // Close browser
      await inst.browser.close();
      
      this.instances.delete(profileId);
      
      this.logger.log(`HTTP Proxy browser closed for profile ${profileId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to close HTTP proxy browser:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testProxy(proxy) {
    return await this.detectTimezoneFromProxy(proxy);
  }

  async updateProfile(profileId, updates) {
    const inst = this.instances.get(profileId);
    if (!inst) {
      return { success: false, error: 'Profile not found' };
    }

    try {
      const { userAgent, viewport, timezone } = updates;
      const page = inst.firstPage;

      if (userAgent) {
        await page.setUserAgent(userAgent);
        inst.profile.userAgent = userAgent;
      }

      if (viewport) {
        await page.setViewport(viewport);
        inst.profile.viewport = viewport;
      }

      if (timezone) {
        const client = await page.target().createCDPSession();
        await client.send('Emulation.setTimezoneOverride', { 
          timezoneId: timezone 
        });
        inst.profile.timezone = timezone;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export the HTTP proxy manager
module.exports = {
  PuppeteerHttpProxyManager,
  generateAntiDetectionScripts,
  buildHttpProxyArgs,
  buildUserDataDir,
  calculateTimezoneOffset
};
