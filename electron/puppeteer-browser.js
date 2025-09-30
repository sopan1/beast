// Enhanced Puppeteer-based Anti-Detection Browser
// Comprehensive anti-detection with proxy-driven timezone mapping, WebRTC blocking, and RPA automation

const fs = require('fs');
const path = require('path');

// Import HTTP proxy handler
const { PuppeteerHttpProxyManager } = require('./puppeteer-http');
const { getTimezoneForIp, getTimezoneOffset, getLocaleForTimezone, testProxyAndGetTimezone } = require('./geoip-utils');
const { buildAntiDetectionScript, generatePlatformOverrides } = require('./anti-detection-scripts');
const { humanType, humanClick, humanScroll, executeRPAScript, processLinksSequentially, checkWebRTCLeaks } = require('./rpa-automation');

// Import proxy agents like BeastBrowser
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

let puppeteer, puppeteerExtra, StealthPlugin;

// Load Puppeteer libraries
try {
  puppeteer = require('puppeteer');
  console.log('✅ Puppeteer core loaded');
} catch (e) {
  console.warn('⚠️ Puppeteer core not found:', e.message);
}

try {
  puppeteerExtra = require('puppeteer-extra');
  console.log('✅ Puppeteer-extra loaded');
} catch (e) {
  console.warn('⚠️ Puppeteer-extra not found:', e.message);
}

try {
  StealthPlugin = require('puppeteer-extra-plugin-stealth');
  console.log('✅ Stealth plugin loaded');
} catch (e) {
  console.warn('⚠️ Stealth plugin not found:', e.message);
}
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Enhanced launch arguments for maximum anti-detection
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
  // WebRTC-related flags
  '--disable-webrtc',
  '--disable-webrtc-encryption',
  '--disable-media-stream',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--webrtc-ip-handling-policy=default_public_interface_only',
  '--enable-features=WebRtcHideLocalIpsWithMdns',
  '--disable-features=PrefetchPrivacyChanges,InterestCohort'
];

function buildLocaleFromTimezone(tz) {
  const map = {
    'Europe/London': 'en-GB',
    'Europe/Berlin': 'de-DE',
    'Europe/Paris': 'fr-FR',
    'Europe/Madrid': 'es-ES',
    'Europe/Rome': 'it-IT',
    'Europe/Lisbon': 'pt-PT',
    'Europe/Warsaw': 'pl-PL',
    'Europe/Amsterdam': 'nl-NL',
    'Europe/Brussels': 'nl-BE',
    'Europe/Prague': 'cs-CZ',
    'Europe/Athens': 'el-GR',
    'Europe/Bucharest': 'ro-RO',
    'Europe/Sofia': 'bg-BG',
    'Europe/Stockholm': 'sv-SE',
    'Europe/Helsinki': 'fi-FI',
    'Europe/Copenhagen': 'da-DK',
    'Europe/Dublin': 'en-IE',
    'Asia/Tokyo': 'ja-JP',
    'Asia/Seoul': 'ko-KR',
    'Asia/Shanghai': 'zh-CN',
    'Asia/Taipei': 'zh-TW',
    'Asia/Hong_Kong': 'zh-HK',
    'Asia/Singapore': 'en-SG',
    'Asia/Kolkata': 'en-IN',
    'Asia/Dubai': 'ar-AE',
    'America/New_York': 'en-US',
    'America/Chicago': 'en-US',
    'America/Los_Angeles': 'en-US',
    'America/Toronto': 'en-CA',
    'America/Vancouver': 'en-CA',
    'America/Sao_Paulo': 'pt-BR',
    'America/Mexico_City': 'es-MX',
    'Australia/Sydney': 'en-AU',
    'Pacific/Auckland': 'en-NZ'
  };
  return map[tz] || 'en-US';
}

function buildWebRTCHardeningArgs() {
  return [
    // WebRTC blocking flags
    '--disable-webrtc',
    '--disable-webrtc-encryption', 
    '--disable-media-stream',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--webrtc-ip-handling-policy=default_public_interface_only',
    '--enable-features=WebRtcHideLocalIpsWithMdns',
    '--disable-features=PrefetchPrivacyChanges,InterestCohort,AudioServiceOutOfProcess',
    // Additional anti-detection flags
    '--disable-background-networking',
    '--disable-web-security',
    '--disable-features=site-per-process,Translate,IsolateOrigins',
    '--disable-hang-monitor',
    '--enable-features=NetworkService,NetworkServiceInProcess'
  ];
}

// Create proxy agent like BeastBrowser
function createProxyAgent(proxyConfig) {
  if (!proxyConfig) return null;
  
  const { type, host, port, username, password } = proxyConfig;
  let proxyUrl;
  
  if (username && password) {
    proxyUrl = `${type}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
  } else {
    proxyUrl = `${type}://${host}:${port}`;
  }
  
  console.log(`🌍 Creating ${type.toUpperCase()} proxy agent: ${host}:${port}`);
  
  switch (type.toLowerCase()) {
    case 'socks5':
    case 'socks':
      return new SocksProxyAgent(proxyUrl);
    case 'http':
      return new HttpProxyAgent(proxyUrl);
    case 'https':
      return new HttpsProxyAgent(proxyUrl);
    default:
      console.warn(`Unknown proxy type: ${type}, defaulting to HTTP`);
      return new HttpProxyAgent(proxyUrl.replace(type, 'http'));
  }
}

function buildProxyArgs(proxy) {
  if (!proxy) return [];
  
  // Use the converted proxy type (HTTP for local tunnel)
  const scheme = proxy.type || 'http';
  
  let proxyUrl = `${scheme}://${proxy.host}:${proxy.port}`;
  
  // Add authentication if provided
  if (proxy.username && proxy.password) {
    proxyUrl = `${scheme}://${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@${proxy.host}:${proxy.port}`;
  }
  
  console.log(`🔗 Building ${scheme.toUpperCase()} proxy args: ${proxyUrl}`);
  return [ `--proxy-server=${proxyUrl}` ];
}

function buildUserDataDir(profile) {
  const dir = path.join(process.cwd(), 'puppeteer-profiles', profile.id || 'default');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function buildTimezoneInjectionScript(tz, geoData = null) {
  return `(() => {
    const TARGET_TIMEZONE = ${JSON.stringify(tz)};
    const GEO_DATA = ${JSON.stringify(geoData)};
    
    console.log('🌍 Injecting timezone data:', TARGET_TIMEZONE);
    console.log('🚫 SYSTEM TIMEZONE WILL BE COMPLETELY BLOCKED');
    if (GEO_DATA) {
      console.log('📍 Location data:', GEO_DATA.city, GEO_DATA.region, GEO_DATA.country);
      console.log('🕰️ Proxy current time:', GEO_DATA.currentTime);
    }
    
    // CRITICAL: Block all system timezone access
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('🚫 BLOCKING system timezone:', systemTimezone);
    
    // Prevent any access to original timezone methods
    const blockedMethods = ['getTimezoneOffset', 'toString', 'toDateString', 'toTimeString'];
    blockedMethods.forEach(method => {
      try {
        Object.defineProperty(Date.prototype, '_original_' + method, {
          value: Date.prototype[method],
          configurable: false, enumerable: false, writable: false
        });
      } catch (e) {
        console.warn('Failed to backup method:', method, e);
      }
    });
    
    // Calculate the timezone offset for the target timezone
    function calculateTimezoneOffset(timeZone) {
      try {
        const now = new Date();
        const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
        const target = new Date(utc.toLocaleString('en-US', { timeZone }));
        return (utc.getTime() - target.getTime()) / 60000;
      } catch (e) {
        console.warn('Failed to calculate timezone offset:', e);
        return 0;
      }
    }
    
    const TARGET_OFFSET = calculateTimezoneOffset(TARGET_TIMEZONE);
    console.log('🕰️ Timezone spoofing active:', TARGET_TIMEZONE, 'Offset:', TARGET_OFFSET);
    
    // Store original functions
    const OriginalDate = Date;
    const OriginalDateTimeFormat = Intl.DateTimeFormat;
    const OriginalResolvedOptions = OriginalDateTimeFormat.prototype.resolvedOptions;
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    const originalToString = Date.prototype.toString;
    const originalToDateString = Date.prototype.toDateString;
    const originalToTimeString = Date.prototype.toTimeString;
    
    // Override getTimezoneOffset to return target timezone offset
    Object.defineProperty(Date.prototype, 'getTimezoneOffset', {
      configurable: true, writable: true,
      value: function() {
        return TARGET_OFFSET;
      }
    });
    
    // Override toString to show target timezone
    Object.defineProperty(Date.prototype, 'toString', {
      configurable: true, writable: true,
      value: function() {
        try {
          // Convert to target timezone and format properly
          const targetTime = new Date(this.toLocaleString('en-US', { timeZone: TARGET_TIMEZONE }));
          const offset = TARGET_OFFSET;
          const offsetHours = Math.floor(Math.abs(offset) / 60);
          const offsetMinutes = Math.abs(offset) % 60;
          const offsetSign = offset <= 0 ? '+' : '-';
          const offsetString = offsetSign + String(offsetHours).padStart(2, '0') + String(offsetMinutes).padStart(2, '0');
          
          // Get timezone abbreviation
          const tzAbbr = this.toLocaleString('en-US', { 
            timeZone: TARGET_TIMEZONE, 
            timeZoneName: 'short' 
          }).split(' ').pop();
          
          return targetTime.toDateString() + ' ' + targetTime.toTimeString().split(' ')[0] + ' GMT' + offsetString + ' (' + tzAbbr + ')';
        } catch (e) {
          return originalToString.call(this);
        }
      }
    });
    
    // Override toDateString and toTimeString for consistency
    Object.defineProperty(Date.prototype, 'toDateString', {
      configurable: true, writable: true,
      value: function() {
        try {
          const targetTime = new Date(this.toLocaleString('en-US', { timeZone: TARGET_TIMEZONE }));
          return targetTime.toDateString();
        } catch (e) {
          return originalToDateString.call(this);
        }
      }
    });
    
    Object.defineProperty(Date.prototype, 'toTimeString', {
      configurable: true, writable: true,
      value: function() {
        try {
          const targetTime = new Date(this.toLocaleString('en-US', { timeZone: TARGET_TIMEZONE }));
          const offset = TARGET_OFFSET;
          const offsetHours = Math.floor(Math.abs(offset) / 60);
          const offsetMinutes = Math.abs(offset) % 60;
          const offsetSign = offset <= 0 ? '+' : '-';
          const offsetString = offsetSign + String(offsetHours).padStart(2, '0') + String(offsetMinutes).padStart(2, '0');
          
          const tzAbbr = this.toLocaleString('en-US', { 
            timeZone: TARGET_TIMEZONE, 
            timeZoneName: 'short' 
          }).split(' ').pop();
          
          return targetTime.toTimeString().split(' ')[0] + ' GMT' + offsetString + ' (' + tzAbbr + ')';
        } catch (e) {
          return originalToTimeString.call(this);
        }
      }
    });

    // Override Intl.DateTimeFormat
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

    // Override locale string methods
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

    // Override Date constructor to maintain timezone consistency
    function FakeDate(...args) {
      if (args.length === 0) {
        return new OriginalDate();
      }
      return new OriginalDate(...args);
    }
    
    // Copy static methods
    FakeDate.now = OriginalDate.now;
    FakeDate.UTC = OriginalDate.UTC;
    FakeDate.parse = OriginalDate.parse;
    FakeDate.prototype = OriginalDate.prototype;
    
    // Replace global Date
    window.Date = FakeDate;

    // navigator.language/languages dynamic
    let __beastLocale = ${JSON.stringify(buildLocaleFromTimezone(tz))};
    try {
      Object.defineProperty(navigator, 'language', { get: () => __beastLocale, configurable: true, enumerable: true });
      Object.defineProperty(navigator, 'languages', { get: () => [__beastLocale, __beastLocale.split('-')[0]], configurable: true, enumerable: true });
    } catch (e) {}

    window.BEAST_BROWSER_TIMEZONE = TARGET_TIMEZONE;
    
    // AGGRESSIVE SYSTEM TIMEZONE BLOCKING
    console.log('🔒 Applying aggressive system timezone blocking...');
    
    // Block Intl.DateTimeFormat from ever returning system timezone
    const originalIntlDateTimeFormat = Intl.DateTimeFormat;
    Object.defineProperty(Intl, 'DateTimeFormat', {
      value: function(locales, options) {
        const enhancedOptions = { ...options, timeZone: TARGET_TIMEZONE };
        const formatter = new originalIntlDateTimeFormat(locales, enhancedOptions);
        
        // Ensure resolvedOptions never returns system timezone
        const originalResolvedOptions = formatter.resolvedOptions;
        formatter.resolvedOptions = function() {
          const resolved = originalResolvedOptions.call(this);
          resolved.timeZone = TARGET_TIMEZONE;
          return resolved;
        };
        
        return formatter;
      },
      configurable: false, enumerable: true, writable: false
    });
    
    // Block any attempt to access system timezone through performance APIs
    try {
      if (window.performance && window.performance.getEntriesByType) {
        const originalGetEntriesByType = performance.getEntriesByType;
        performance.getEntriesByType = function(type) {
          const entries = originalGetEntriesByType.call(this, type);
          // Filter out any entries that might contain timezone info
          return entries.filter(entry => !entry.name || !entry.name.includes('timezone'));
        };
      }
    } catch (e) {
      console.warn('Failed to block performance timezone access:', e);
    }
    
    // Block system timezone through Error.stack traces
    const originalError = Error;
    window.Error = function(...args) {
      const error = new originalError(...args);
      if (error.stack) {
        // Remove any timezone information from stack traces
        error.stack = error.stack.replace(/\([^)]*\s+(IST|PST|EST|CST|MST|GMT|UTC)[^)]*\)/g, '(Proxy Timezone)');
      }
      return error;
    };
    window.Error.prototype = originalError.prototype;
    
    // Final verification - ensure system timezone is completely blocked
    setTimeout(() => {
      try {
        const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (currentTz !== TARGET_TIMEZONE) {
          console.error('🚨 SYSTEM TIMEZONE LEAK DETECTED:', currentTz);
          console.error('🚨 FORCING TIMEZONE OVERRIDE TO:', TARGET_TIMEZONE);
          // Force override again
          Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
            value: function() {
              const original = Object.getPrototypeOf(this).resolvedOptions.call(this);
              original.timeZone = TARGET_TIMEZONE;
              return original;
            },
            configurable: false, enumerable: false, writable: false
          });
        } else {
          console.log('✅ SYSTEM TIMEZONE SUCCESSFULLY BLOCKED');
          console.log('✅ ONLY PROXY TIMEZONE ACTIVE:', TARGET_TIMEZONE);
        }
      } catch (e) {
        console.log('✅ Timezone verification completed');
      }
    }, 1000);
    
    console.log('✅ Enhanced timezone spoofing applied:', TARGET_TIMEZONE, 'Test:', new Date().toString());
    console.log('🚫 System timezone completely blocked - only proxy timezone will be used');
  })();`;
}

function buildWebRTCBlockingScript() {
  return `(() => {
    try {
      // Comprehensive WebRTC blocking
      const NoOp = function() { throw new Error('WebRTC disabled'); };
      const NoOpAsync = function() { return Promise.reject(new Error('WebRTC disabled')); };
      
      // Override RTCPeerConnection constructors
      const rtcConstructors = ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection', 'msRTCPeerConnection'];
      rtcConstructors.forEach(name => {
        try {
          if (window[name]) {
            Object.defineProperty(window, name, {
              get: () => NoOp,
              set: () => {},
              configurable: false,
              enumerable: true
            });
          }
        } catch(e) {}
      });
      
      // Override media APIs
      const mediaApis = ['MediaStream', 'MediaStreamTrack', 'MediaRecorder'];
      mediaApis.forEach(name => {
        try {
          if (window[name]) {
            Object.defineProperty(window, name, {
              get: () => NoOp,
              set: () => {},
              configurable: false,
              enumerable: true
            });
          }
        } catch(e) {}
      });
      
      // Override navigator.mediaDevices
      if (navigator.mediaDevices) {
        try {
          Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            get: () => NoOpAsync,
            configurable: false,
            enumerable: true
          });
          Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
            get: () => NoOpAsync,
            configurable: false,
            enumerable: true
          });
          Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
            get: () => () => Promise.resolve([]),
            configurable: false,
            enumerable: true
          });
        } catch (e) {}
      }
      
      // Prevent WebRTC IP leakage by overriding prototype methods
      if (window.RTCPeerConnection && window.RTCPeerConnection.prototype) {
        const proto = window.RTCPeerConnection.prototype;
        proto.createOffer = () => Promise.reject('WebRTC disabled');
        proto.createAnswer = () => Promise.reject('WebRTC disabled');
        proto.addIceCandidate = () => Promise.reject('WebRTC disabled');
        proto.createDataChannel = () => { throw new Error('WebRTC disabled'); };
      }
      
      // Override RTCIceCandidate
      if (window.RTCIceCandidate) {
        window.RTCIceCandidate = NoOp;
      }
      
    } catch (err) {
      console.error('WebRTC blocking injection failed', err);
    }
  })();`;
}

class PuppeteerAntiBrowserManager {
  constructor() {
    this.instances = new Map();
    this.localProxyServers = new Map();
    this.connectionPool = new Map(); // Connection pooling for SOCKS5
    this.lastConnectionTime = 0; // Throttling for unstable proxies
    this.connectionThrottle = 500; // Minimum 500ms between connections
    this.httpProxyManager = new PuppeteerHttpProxyManager(); // Dedicated HTTP proxy handler
    this.logger = {
      log: (msg) => console.log(`${new Date().toLocaleTimeString()} > ${msg}`),
      warn: (msg, ...args) => console.warn(`⚠️ ${msg}`, ...args),
      error: (msg, ...args) => console.error(`❌ ${msg}`, ...args)
    };
  }
  // Create local HTTP proxy that tunnels to SOCKS5 (like BeastBrowser)
  // Detect timezone by making API call through proxy
  async detectTimezoneFromProxy(proxy) {
    try {
      const fetch = require('node-fetch');
      let agent;
      
      // Create proxy agent
      if (proxy.type === 'socks5') {
        const { SocksProxyAgent } = require('socks-proxy-agent');
        const proxyUrl = `socks5://${proxy.username ? encodeURIComponent(proxy.username) + ':' + encodeURIComponent(proxy.password) + '@' : ''}${proxy.host}:${proxy.port}`;
        agent = new SocksProxyAgent(proxyUrl);
      } else {
        const proxyUrl = `${proxy.type}://${proxy.username ? encodeURIComponent(proxy.username) + ':' + encodeURIComponent(proxy.password) + '@' : ''}${proxy.host}:${proxy.port}`;
        if (proxy.type === 'https') {
          agent = new HttpsProxyAgent(proxyUrl);
        } else {
          agent = new HttpProxyAgent(proxyUrl);
        }
      }
      
      // Multiple API endpoints for timezone detection
      const apiEndpoints = [
        'http://worldtimeapi.org/api/ip',
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'http://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query'
      ];
      
      for (const endpoint of apiEndpoints) {
        try {
          this.logger.log(`🌐 Trying API endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            agent,
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            this.logger.log(`📡 API Response from ${endpoint}:`, JSON.stringify(data, null, 2));
            
            // Parse different API response formats
            let timezoneData = this.parseTimezoneApiResponse(data, endpoint);
            
            if (timezoneData.timezone) {
              // Get current time in detected timezone
              const now = new Date();
              const currentTime = now.toLocaleString('en-US', { 
                timeZone: timezoneData.timezone,
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
              });
              
              return {
                success: true,
                ...timezoneData,
                currentTime,
                apiEndpoint: endpoint,
                detectedAt: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          this.logger.warn(`API endpoint ${endpoint} failed:`, error.message);
          continue;
        }
      }
      
      return { success: false, error: 'All API endpoints failed' };
      
    } catch (error) {
      this.logger.error('Proxy timezone detection failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Parse different API response formats
  parseTimezoneApiResponse(data, endpoint) {
    let result = {};
    
    if (endpoint.includes('worldtimeapi.org')) {
      result = {
        timezone: data.timezone,
        ip: data.client_ip,
        country: data.timezone?.split('/')[0] === 'America' ? 'US' : 
                data.timezone?.split('/')[0] === 'Europe' ? 'GB' : 'Unknown',
        city: data.timezone?.split('/')[1]?.replace('_', ' '),
        region: data.timezone?.split('/')[1]?.replace('_', ' '),
        latitude: null,
        longitude: null
      };
    } else if (endpoint.includes('ipapi.co')) {
      result = {
        timezone: data.timezone,
        ip: data.ip,
        country: data.country_code,
        city: data.city,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude
      };
    } else if (endpoint.includes('ipinfo.io')) {
      result = {
        timezone: data.timezone,
        ip: data.ip,
        country: data.country,
        city: data.city,
        region: data.region,
        latitude: data.loc ? parseFloat(data.loc.split(',')[0]) : null,
        longitude: data.loc ? parseFloat(data.loc.split(',')[1]) : null
      };
    } else if (endpoint.includes('ip-api.com')) {
      result = {
        timezone: data.timezone,
        ip: data.query,
        country: data.countryCode,
        city: data.city,
        region: data.regionName,
        latitude: data.lat,
        longitude: data.lon
      };
    }
    
    return result;
  }

  async createLocalSocksProxy(socksProxy, localPort) {
    const http = require('http');
    const { SocksProxyAgent } = require('socks-proxy-agent');
    
    return new Promise((resolve, reject) => {
      // Create SOCKS proxy agent
      const socksUrl = `socks5://${encodeURIComponent(socksProxy.username)}:${encodeURIComponent(socksProxy.password)}@${socksProxy.host}:${socksProxy.port}`;
      const socksAgent = new SocksProxyAgent(socksUrl);
      
      const server = http.createServer();
      
      // Handle HTTP CONNECT method for HTTPS tunneling
      server.on('connect', async (req, clientSocket, head) => {
        const startTime = Date.now();
        try {
          const [host, port] = req.url.split(':');
          this.logger.log(`🔗 CONNECT request: ${host}:${port}`);
          
          // Use SocksClient for direct SOCKS5 connection with retry
          const { SocksClient } = require('socks');
          
          let socksConnection;
          let lastError;
          
          // Throttle connections to avoid overwhelming unstable proxy
          const now = Date.now();
          const timeSinceLastConnection = now - this.lastConnectionTime;
          if (timeSinceLastConnection < this.connectionThrottle) {
            const waitTime = this.connectionThrottle - timeSinceLastConnection;
            this.logger.log(`⏳ Throttling connection, waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          this.lastConnectionTime = Date.now();
          
          // Robust SOCKS5 connection with retry mechanism for unstable proxies
          const maxRetries = 3;
          let retryCount = 0;
          
          while (retryCount < maxRetries && !socksConnection) {
            try {
              retryCount++;
              this.logger.log(`🔄 SOCKS5 connecting to ${host}:${port} (attempt ${retryCount}/${maxRetries})`);
              
              // Progressive timeout increase for retries
              const timeout = 8000 + (retryCount * 2000); // 8s, 10s, 12s
              
              socksConnection = await SocksClient.createConnection({
                proxy: {
                  host: socksProxy.host,
                  port: parseInt(socksProxy.port),
                  type: 5,
                  userId: socksProxy.username,
                  password: socksProxy.password
                },
                command: 'connect',
                destination: {
                  host: host,
                  port: parseInt(port)
                },
                timeout: timeout
              });
              
              this.logger.log(`✅ SOCKS5 connection successful for ${host}:${port} (attempt ${retryCount})`);
              break; // Success, exit retry loop
              
            } catch (error) {
              lastError = error;
              this.logger.warn(`⚠️ SOCKS5 attempt ${retryCount} failed for ${host}:${port}:`, error.message);
              
              // Check if it's a DNS or network issue
              if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
                this.logger.warn(`🚨 DNS resolution failed for proxy server: ${socksProxy.host}`);
              }
              
              // Wait before retry (except on last attempt)
              if (retryCount < maxRetries) {
                const waitTime = 1000 * retryCount; // 1s, 2s wait
                this.logger.log(`⏳ Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            }
          }
          
          if (!socksConnection) {
            this.logger.error(`❌ All ${maxRetries} SOCKS5 connection attempts failed for ${host}:${port}`);
            this.logger.error(`🚨 Proxy server ${socksProxy.host}:${socksProxy.port} appears to be unstable or down`);
            throw lastError || new Error(`All ${maxRetries} SOCKS5 connection attempts failed`);
          }
          
          const connectionTime = Date.now() - startTime;
          this.logger.log(`✅ SOCKS5 connection established for ${host}:${port} (${connectionTime}ms, ${retryCount} attempts)`);
          
          // Send success response
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          
          // Pipe data between client and SOCKS5 connection
          socksConnection.socket.pipe(clientSocket, { end: false });
          clientSocket.pipe(socksConnection.socket, { end: false });
          
          // Handle connection cleanup
          socksConnection.socket.on('error', (error) => {
            this.logger.warn(`SOCKS5 socket error for ${host}:${port}:`, error.message);
            clientSocket.destroy();
          });
          
          clientSocket.on('error', (error) => {
            this.logger.warn(`Client socket error for ${host}:${port}:`, error.message);
            socksConnection.socket.destroy();
          });
          
          socksConnection.socket.on('close', () => {
            clientSocket.destroy();
          });
          
          clientSocket.on('close', () => {
            socksConnection.socket.destroy();
          });
          
        } catch (error) {
          this.logger.warn(`SOCKS5 tunnel connection failed for ${req.url}:`, error.message);
          clientSocket.write('HTTP/1.1 500 Connection Failed\r\n\r\n');
          clientSocket.destroy();
        }
      });
      
      // Handle regular HTTP requests
      server.on('request', (req, res) => {
        this.logger.log(`HTTP request: ${req.method} ${req.url}`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('SOCKS5 Proxy Tunnel Active');
      });
      
      server.listen(localPort, '127.0.0.1', () => {
        this.logger.log(`🎆 Local SOCKS5 tunnel listening on 127.0.0.1:${localPort}`);
        resolve(server);
      });
      
      server.on('error', (error) => {
        this.logger.error('SOCKS5 tunnel server error:', error.message);
        reject(error);
      });
    });
  }

  async launch(profile, options = {}) {
    this.logger.log('📝 Starting Puppeteer launch process...');
    
    if (!puppeteer && !puppeteerExtra) {
      this.logger.error('❌ Puppeteer not found!');
      throw new Error('Puppeteer is not installed. Please run: npm i puppeteer puppeteer-extra puppeteer-extra-plugin-stealth');
    }
    
    this.logger.log('✅ Puppeteer libraries loaded successfully');

    let proxy = options.proxy || null;
    let timezone = options.timezone || null;
    let detectedIP = null;
    
    // For SOCKS5, we need to create a local HTTP proxy tunnel like BeastBrowser
    if (proxy && proxy.type === 'socks5') {
      this.logger.log('🔄 Converting SOCKS5 to local HTTP proxy tunnel for Chromium compatibility...');
      
      try {
        // Test SOCKS5 proxy connectivity before creating tunnel
        this.logger.log(`🔍 Testing SOCKS5 proxy connectivity: ${proxy.host}:${proxy.port}`);
        
        const { SocksClient } = require('socks');
        let connectivityTestPassed = false;
        
        try {
          const testConnection = await SocksClient.createConnection({
            proxy: {
              host: proxy.host,
              port: parseInt(proxy.port),
              type: 5,
              userId: proxy.username,
              password: proxy.password
            },
            command: 'connect',
            destination: {
              host: 'google.com',
              port: 80
            },
            timeout: 10000
          });
          
          testConnection.socket.destroy();
          this.logger.log(`✅ SOCKS5 proxy connectivity test passed`);
          connectivityTestPassed = true;
          
        } catch (testError) {
          this.logger.warn(`⚠️ SOCKS5 proxy connectivity test failed:`, testError.message);
          this.logger.warn(`🚨 Proxy server may be down or credentials invalid`);
          this.logger.warn(`🔄 Will continue without proxy tunnel (direct SOCKS5 may not work)`);
        }
        
        // Only create tunnel if connectivity test passed
        if (connectivityTestPassed) {
          // Create local HTTP proxy that forwards to SOCKS5 (like BeastBrowser)
          const localProxyPort = 10000 + Math.floor(Math.random() * 5000);
          const localProxyServer = await this.createLocalSocksProxy(proxy, localProxyPort);
        
          // Store server for cleanup later
          this.localProxyServers.set(profile.id, localProxyServer);
        
          // Replace SOCKS5 proxy with local HTTP proxy
          proxy = {
            type: 'http',
            host: '127.0.0.1',
            port: localProxyPort,
            username: null,
            password: null,
            _originalSocks5: proxy // Keep reference to original
          };
        
          this.logger.log(`✅ SOCKS5 tunnel created: 127.0.0.1:${localProxyPort} -> ${proxy._originalSocks5.host}:${proxy._originalSocks5.port}`);
        } else {
          this.logger.warn(`⚠️ Skipping tunnel creation due to connectivity test failure`);
          this.logger.warn(`🚨 SOCKS5 proxy server appears to be completely down`);
          this.logger.log(`🚫 Disabling proxy to allow normal browsing`);
          
          // Disable proxy completely when server is down
          proxy = null;
          
          this.logger.log(`✅ Proxy disabled - browser will use direct connection`);
          this.logger.log(`🌍 Timezone spoofing will still work (America/New_York)`);
        }
        
      } catch (tunnelError) {
        this.logger.warn('Failed to create SOCKS5 tunnel:', tunnelError.message);
        this.logger.warn(`🚨 Disabling proxy due to tunnel creation failure`);
        
        // Disable proxy on any tunnel creation error
        proxy = null;
        
        this.logger.log(`✅ Proxy disabled - browser will use direct connection`);
      }
    }
    
    // Set timezone - skip proxy detection if proxy is disabled
    if (proxy) {
      this.logger.log('🌍 CRITICAL: Detecting timezone from proxy IP geolocation...');
      try {
        // Quick timeout for timezone detection to avoid hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timezone detection timeout')), 10000)
        );
        
        const proxyTimezoneData = await Promise.race([
          this.detectTimezoneFromProxy(proxy),
          timeoutPromise
        ]);
        
        if (proxyTimezoneData.success) {
          timezone = proxyTimezoneData.timezone;
          detectedIP = proxyTimezoneData.ip;
          this.logger.log(`✅ Proxy IP timezone detected: ${timezone} (IP: ${detectedIP})`);
          this.logger.log(`🚫 System timezone will be COMPLETELY BLOCKED`);
        } else {
          this.logger.warn('⚠️ Proxy timezone detection failed:', proxyTimezoneData.error);
          timezone = this.getProxyFallbackTimezone(proxy);
          this.logger.log(`🔄 Using fallback proxy timezone: ${timezone}`);
        }
      } catch (error) {
        this.logger.warn('⚠️ Proxy timezone detection error:', error.message);
        timezone = this.getProxyFallbackTimezone(proxy);
        this.logger.log(`🔄 Using fallback proxy timezone: ${timezone}`);
      }
    } else {
      // No proxy - use default timezone that's NOT the system timezone
      timezone = timezone || 'America/New_York';
      this.logger.log(`🌍 No proxy - using default timezone: ${timezone}`);
      this.logger.log(`🚫 System timezone will still be BLOCKED for anti-detection`);
    }

    // CRITICAL: Ensure timezone is NEVER system timezone
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone || timezone === systemTimezone) {
      timezone = 'America/New_York'; // Force different timezone
      this.logger.warn(`⚠️ Forced timezone change to avoid system timezone leak`);
    }
    
    this.logger.log(`🌍 Final proxy-based timezone: ${timezone}`);
    this.logger.log(`🚫 System timezone (${systemTimezone}) will be COMPLETELY BLOCKED`);
    this.logger.warn(`⚠️ System timezone will be BLOCKED, only proxy timezone will be used`);

    const userDataDir = buildUserDataDir(profile);

    // Build launch arguments with aggressive system timezone blocking
    let args = [
      ...DEFAULT_ARGS,
      ...buildProxyArgs(proxy),
      
      // CRITICAL: Block system timezone at Chrome level
      '--disable-features=VizDisplayCompositor',
      '--disable-field-trial-config',
      '--force-color-profile=srgb',
      '--disable-blink-features=AutomationControlled',
      
      // System timezone blocking arguments
      '--disable-timezone-tracking',
      '--disable-geolocation',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      
      // Force timezone override - use proxy timezone
      `--timezone=${timezone}`,
      '--local-timezone',
      
      // Additional anti-detection
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ];
    
    // Add essential args for proxy support (simplified)
    if (proxy) {
      args.push('--ignore-certificate-errors');
      args.push('--ignore-ssl-errors');
      args.push('--disable-web-security');
      args.push('--allow-running-insecure-content');
      
      this.logger.log(`🌍 Using ${proxy.type.toUpperCase()} proxy: ${proxy.host}:${proxy.port}`);
    } else {
      this.logger.warn('No proxy configured - browser will use direct connection');
    }

    // Setup Puppeteer with stealth plugin
    let pptr = puppeteerExtra || puppeteer;
    if (pptr === puppeteerExtra && StealthPlugin) {
      pptr.use(StealthPlugin());
    }

    // Create proxy agent for proper SOCKS5 support
    const proxyAgent = createProxyAgent(proxy);
    
    const launchOptions = {
      headless: options.headless || false,
      args,
      userDataDir,
      defaultViewport: profile.viewport || null,
      executablePath: profile.chromePath || undefined
    };
    
    // Note: Proxy agent will be set on page level after browser launch

    this.logger.log(`🚀 Launching browser for profile ${profile.id} with timezone ${timezone}`);
    this.logger.log(`🔧 Launch options:`, JSON.stringify(launchOptions, null, 2));
    
    let browser;
    try {
      browser = await pptr.launch(launchOptions);
      this.logger.log(`✅ Browser launched successfully!`);
    } catch (launchError) {
      this.logger.error(`❌ Browser launch failed:`, launchError.message);
      throw launchError;
    }

    // Create regular context (no incognito mode as requested)
    const context = browser.defaultBrowserContext();
    const page = await context.newPage();

    // Set up CDP session for advanced features
    const cdpSession = await page.target().createCDPSession();

    // Close any extra default pages but keep our main page
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

    // Set proxy authentication (works for both HTTP and SOCKS5 through Chrome args)
    if (proxy && proxy.username && proxy.password) {
      try {
        await page.authenticate({ 
          username: proxy.username, 
          password: proxy.password 
        });
        this.logger.log(`✅ ${proxy.type.toUpperCase()} proxy authentication set successfully`);
      } catch (error) {
        this.logger.warn('Failed to set proxy authentication:', error.message);
        // Try alternative authentication method
        try {
          await page.setExtraHTTPHeaders({
            'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')}`
          });
          this.logger.log('Alternative proxy authentication method applied');
        } catch (altError) {
          this.logger.warn('Alternative proxy authentication also failed:', altError.message);
        }
      }
    }
    
    // Log proxy configuration
    if (proxy) {
      this.logger.log(`🎆 Using ${proxy.type.toUpperCase()} proxy: ${proxy.host}:${proxy.port} (via Chrome args)`);
    }

    // Set user agent
    const userAgent = profile.customUserAgent || profile.userAgent || DEFAULT_USER_AGENT;
    await page.setUserAgent(userAgent);

    // Set viewport
    if (profile.viewport) {
      await page.setViewport(profile.viewport);
    }

    // Set timezone via CDP
    if (timezone !== 'UTC') {
      try {
        await cdpSession.send('Emulation.setTimezoneOverride', { 
          timezoneId: timezone 
        });
        this.logger.log(`Set timezone override to ${timezone}`);
      } catch (error) {
        this.logger.warn('Failed to set timezone override:', error.message);
      }
    }

    // Generate platform-specific overrides
    const platformOverrides = generatePlatformOverrides(profile);
    platformOverrides.userAgent = userAgent;
    platformOverrides.timezone = timezone;
    platformOverrides.timezoneOffsetMinutes = getTimezoneOffset(timezone);

    // Inject comprehensive anti-detection scripts
    await page.evaluateOnNewDocument(buildWebRTCBlockingScript());
    await page.evaluateOnNewDocument(buildTimezoneInjectionScript(timezone, this.proxyGeoData));
    await page.evaluateOnNewDocument(buildAntiDetectionScript(platformOverrides));

    // Navigate to DuckDuckGo as default search engine with multiple fallbacks
    const defaultUrl = options.defaultUrl || 'https://duckduckgo.com/';
    let navigationSuccess = false;
    
    // Navigation with reasonable timeouts for SOCKS5 tunnel
    const navigationMethods = [
      { url: defaultUrl, name: 'DuckDuckGo HTTPS', timeout: 15000 },
      { url: 'http://duckduckgo.com/', name: 'DuckDuckGo HTTP', timeout: 10000 },
      { url: 'about:blank', name: 'Blank page', timeout: 2000 }
    ];
    
    this.logger.log('⚡ Using fast navigation mode for quicker startup');
    
    for (const method of navigationMethods) {
      try {
        await page.goto(method.url, { 
          waitUntil: 'domcontentloaded', 
          timeout: method.timeout
        });
        this.logger.log(`✅ Successfully navigated to ${method.name}: ${method.url}`);
        navigationSuccess = true;
        break;
      } catch (error) {
        this.logger.warn(`❌ Failed to navigate to ${method.name}:`, error.message);
        
        // If it's a proxy error and we haven't tried without proxy yet
        if (error.message.includes('ERR_NO_SUPPORTED_PROXIES') && proxy) {
          this.logger.warn('🔄 Proxy causing issues, will try remaining URLs without proxy if needed');
        }
        continue;
      }
    }
    
    if (!navigationSuccess) {
      this.logger.warn('⚠️ Navigation failed, but browser is ready for manual use');
    }

    // Store instance data
    const instanceData = {
      browser,
      context,
      firstPage: page,
      cdpSession,
      launchedAt: new Date().toISOString(),
      timezone,
      detectedIP,
      proxy,
      profile,
      status: 'running'
    };
    
    this.instances.set(profile.id, instanceData);
    
    this.logger.log(`Browser launched successfully for profile ${profile.id}`);
    
    return {
      success: true,
      browserWSEndpoint: browser.wsEndpoint(),
      timezone,
      detectedIP,
      userDataDir,
      profileId: profile.id
    };
  }

  async close(profileId) {
    const inst = this.instances.get(profileId);
    if (!inst) return { success: true, message: 'Not running' };
    
    try {
      inst.status = 'closing';
      
      // Close CDP session
      if (inst.cdpSession) {
        try {
          await inst.cdpSession.detach();
        } catch (error) {
          this.logger.warn('Failed to detach CDP session:', error.message);
        }
      }
      
      // Close browser
      await inst.browser.close();
      
      // Clean up local proxy server if exists
      const localProxyServer = this.localProxyServers.get(profileId);
      if (localProxyServer) {
        localProxyServer.close();
        this.localProxyServers.delete(profileId);
        this.logger.log(`🗑️ Cleaned up local proxy server for profile ${profileId}`);
      }
      
      this.instances.delete(profileId);
      
      this.logger.log(`Browser closed for profile ${profileId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to close browser:', error.message);
      return { success: false, error: error.message };
    }
  }

  // New methods for enhanced functionality
  
  async testProxy(proxy) {
    return await testProxyAndGetTimezone(proxy);
  }

  // Get fallback timezone based on proxy characteristics
  getProxyFallbackTimezone(proxy) {
    if (!proxy) return 'America/New_York';
    
    // Common proxy server locations and their timezones
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
        this.logger.log(`🎯 Detected proxy location from '${keyword}': ${timezone}`);
        return timezone;
      }
    }
    
    // Default fallback for unknown proxies
    return 'America/New_York';
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

      if (timezone && timezone !== inst.timezone) {
        await inst.cdpSession.send('Emulation.setTimezoneOverride', { 
          timezoneId: timezone 
        });
        inst.timezone = timezone;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async runRPAScript(profileId, tasks, options = {}) {
    const inst = this.instances.get(profileId);
    if (!inst) {
      return { success: false, error: 'Profile not found' };
    }

    try {
      const page = inst.firstPage;
      const results = await executeRPAScript(page, tasks, options);
      
      this.logger.log(`RPA script completed for profile ${profileId}: ${results.completedTasks}/${tasks.length} tasks`);
      return results;
    } catch (error) {
      this.logger.error('RPA script execution failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async processLinks(profileId, links, taskFunction, options = {}) {
    const inst = this.instances.get(profileId);
    if (!inst) {
      return { success: false, error: 'Profile not found' };
    }

    try {
      const results = await processLinksSequentially(
        inst.browser, 
        links, 
        taskFunction, 
        options
      );
      
      this.logger.log(`Processed ${links.length} links for profile ${profileId}`);
      return { success: true, results };
    } catch (error) {
      this.logger.error('Link processing failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async checkWebRTCLeaks(profileId) {
    const inst = this.instances.get(profileId);
    if (!inst) {
      return { success: false, error: 'Profile not found' };
    }

    try {
      const page = inst.firstPage;
      const leaks = await checkWebRTCLeaks(page);
      
      return {
        success: true,
        leaks,
        blocked: leaks.includes('webrtc-blocked')
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getStatus(profileId) {
    const inst = this.instances.get(profileId);
    if (!inst) {
      return { success: false, error: 'Profile not found' };
    }

    return {
      success: true,
      status: inst.status,
      launchedAt: inst.launchedAt,
      timezone: inst.timezone,
      detectedIP: inst.detectedIP,
      proxy: inst.proxy ? {
        host: inst.proxy.host,
        port: inst.proxy.port,
        type: inst.proxy.type
      } : null
    };
  }

  getAllProfiles() {
    const profiles = [];
    for (const [profileId, inst] of this.instances) {
      profiles.push({
        id: profileId,
        status: inst.status,
        launchedAt: inst.launchedAt,
        timezone: inst.timezone,
        detectedIP: inst.detectedIP
      });
    }
    return profiles;
  }
}

// Export enhanced manager and utilities
module.exports = { 
  PuppeteerAntiBrowserManager,
  humanType,
  humanClick,
  humanScroll,
  executeRPAScript,
  testProxyAndGetTimezone,
  checkWebRTCLeaks
};
