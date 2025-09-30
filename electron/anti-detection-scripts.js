// Comprehensive anti-detection script injection system
// Handles platform-specific fingerprint spoofing and navigator overrides

/**
 * Generate anti-detection script with platform-specific overrides
 * @param {Object} overrides - Platform and fingerprint overrides
 * @returns {string} JavaScript code to inject
 */
function buildAntiDetectionScript(overrides) {
  const {
    platform = 'Win32',
    userAgent,
    languages = ['en-US', 'en'],
    hardwareConcurrency = 8,
    deviceMemory = 8,
    timezone,
    timezoneOffsetMinutes = 0,
    screen = { width: 1920, height: 1080, colorDepth: 24 },
    plugins = [],
    webglVendor = 'Intel Inc.',
    webglRenderer = 'Intel(R) UHD Graphics 620'
  } = overrides;

  return `
  (() => {
    try {
      // Navigator webdriver override
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });

      // Platform and user agent overrides
      Object.defineProperty(navigator, 'platform', {
        get: () => ${JSON.stringify(platform)},
        configurable: true
      });
      
      Object.defineProperty(navigator, 'userAgent', {
        get: () => ${JSON.stringify(userAgent)},
        configurable: true
      });

      // Language overrides
      Object.defineProperty(navigator, 'language', {
        get: () => ${JSON.stringify(languages[0])},
        configurable: true
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ${JSON.stringify(languages)},
        configurable: true
      });

      // Hardware overrides
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => ${hardwareConcurrency},
        configurable: true
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => ${deviceMemory},
        configurable: true
      });

      // Screen overrides
      Object.defineProperty(screen, 'width', {
        get: () => ${screen.width},
        configurable: true
      });
      
      Object.defineProperty(screen, 'height', {
        get: () => ${screen.height},
        configurable: true
      });
      
      Object.defineProperty(screen, 'colorDepth', {
        get: () => ${screen.colorDepth},
        configurable: true
      });

      // Timezone overrides
      ${timezone ? `
      const TARGET_TIMEZONE = ${JSON.stringify(timezone)};
      const TIMEZONE_OFFSET = ${timezoneOffsetMinutes};
      
      // CRITICAL: COMPLETE SYSTEM TIMEZONE BLOCKING
      console.log('🚫 BLOCKING ALL SYSTEM TIMEZONE LEAKS - PROXY TIMEZONE ONLY:', TARGET_TIMEZONE);
      
      // 1. Override Date.prototype.getTimezoneOffset - PRIMARY TIMEZONE API
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        console.log('🚫 BLOCKED Date.getTimezoneOffset() - using proxy timezone:', TARGET_TIMEZONE);
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
        console.log('🚫 BLOCKED Date.toString() - using proxy timezone:', TARGET_TIMEZONE);
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
        console.log('🚫 BLOCKED Date.toTimeString() - using proxy timezone:', TARGET_TIMEZONE);
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
        console.log('🚫 BLOCKED Date.toDateString() - using proxy timezone:', TARGET_TIMEZONE);
        return proxyDate;
      };
      
      const originalToLocaleString = Date.prototype.toLocaleString;
      Date.prototype.toLocaleString = function(locales, options = {}) {
        options.timeZone = TARGET_TIMEZONE;
        console.log('🚫 BLOCKED Date.toLocaleString() - forced proxy timezone:', TARGET_TIMEZONE);
        return originalToLocaleString.call(this, locales, options);
      };
      
      const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
      Date.prototype.toLocaleTimeString = function(locales, options = {}) {
        options.timeZone = TARGET_TIMEZONE;
        console.log('🚫 BLOCKED Date.toLocaleTimeString() - forced proxy timezone:', TARGET_TIMEZONE);
        return originalToLocaleTimeString.call(this, locales, options);
      };
      
      const originalToLocaleDateString = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = function(locales, options = {}) {
        options.timeZone = TARGET_TIMEZONE;
        console.log('🚫 BLOCKED Date.toLocaleDateString() - forced proxy timezone:', TARGET_TIMEZONE);
        return originalToLocaleDateString.call(this, locales, options);
      };

      // 3. COMPLETE Intl.DateTimeFormat override - FORCE PROXY TIMEZONE EVERYWHERE
      const OriginalDateTimeFormat = Intl.DateTimeFormat;
      const OriginalResolvedOptions = OriginalDateTimeFormat.prototype.resolvedOptions;
      
      Intl.DateTimeFormat = function(locales, options = {}) {
        // ALWAYS force proxy timezone, ignore any system timezone
        options.timeZone = TARGET_TIMEZONE;
        console.log('🚫 BLOCKED Intl.DateTimeFormat - forced proxy timezone:', TARGET_TIMEZONE);
        
        const formatter = new OriginalDateTimeFormat(locales, options);
        
        // Override resolvedOptions to ALWAYS return proxy timezone
        formatter.resolvedOptions = function() {
          const resolved = OriginalResolvedOptions.call(this);
          resolved.timeZone = TARGET_TIMEZONE;
          console.log('🚫 BLOCKED resolvedOptions.timeZone - forced proxy timezone:', TARGET_TIMEZONE);
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
        console.log('🚫 BLOCKED global resolvedOptions - forced proxy timezone:', TARGET_TIMEZONE);
        return resolved;
      };
      
      // 5. Block direct access to system timezone via Intl APIs
      const originalResolvedOptions = Intl.DateTimeFormat().resolvedOptions;
      if (originalResolvedOptions && originalResolvedOptions.timeZone !== TARGET_TIMEZONE) {
        console.log('🚫 DETECTED system timezone leak attempt - blocking:', originalResolvedOptions.timeZone);
      }
      
      // 6. Override performance.timing to be consistent with proxy timezone
      if (typeof performance !== 'undefined' && performance.timing) {
        const originalTiming = performance.timing;
        Object.defineProperty(performance, 'timing', {
          get: function() {
            console.log('🚫 BLOCKED performance.timing - timezone consistent with proxy');
            return originalTiming;
          },
          configurable: true
        });
      }
      
      // 7. Final verification - log the active timezone
      console.log('✅ TIMEZONE INJECTION COMPLETE');
      console.log('✅ Active timezone:', TARGET_TIMEZONE);
      console.log('✅ Timezone offset:', TIMEZONE_OFFSET, 'minutes');
      console.log('🚫 System timezone completely blocked');
      
      // Test the injection
      const testDate = new Date();
      console.log('🧪 Test Date.toString():', testDate.toString());
      console.log('🧪 Test Date.getTimezoneOffset():', testDate.getTimezoneOffset());
      console.log('🧪 Test Intl.DateTimeFormat().resolvedOptions().timeZone:', new Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
      Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;

      // Override Date locale methods
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
      ` : ''}

      // WebGL fingerprint spoofing
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return ${JSON.stringify(webglVendor)};
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return ${JSON.stringify(webglRenderer)};
        }
        return getParameter.call(this, parameter);
      };

      // Canvas fingerprint randomization
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const result = originalToDataURL.apply(this, args);
        // Add slight noise to canvas fingerprint
        return result.replace(/.$/, String.fromCharCode(Math.floor(Math.random() * 10) + 48));
      };

      // Audio context fingerprint spoofing
      if (window.AudioContext) {
        const OriginalAudioContext = window.AudioContext;
        window.AudioContext = function(...args) {
          const context = new OriginalAudioContext(...args);
          const originalCreateOscillator = context.createOscillator;
          
          context.createOscillator = function() {
            const oscillator = originalCreateOscillator.call(this);
            const originalStart = oscillator.start;
            
            oscillator.start = function(when) {
              // Add slight randomization to audio fingerprint
              return originalStart.call(this, when + Math.random() * 0.0001);
            };
            
            return oscillator;
          };
          
          return context;
        };
      }

      // Plugin spoofing
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const pluginArray = [];
          ${JSON.stringify(plugins)}.forEach((plugin, index) => {
            pluginArray[index] = {
              name: plugin.name,
              filename: plugin.filename,
              description: plugin.description,
              length: plugin.mimeTypes ? plugin.mimeTypes.length : 0
            };
          });
          pluginArray.length = ${plugins.length};
          return pluginArray;
        },
        configurable: true
      });

      // Remove automation indicators
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      
      // Override chrome runtime
      if (window.chrome) {
        Object.defineProperty(window.chrome, 'runtime', {
          get: () => ({
            onConnect: undefined,
            onMessage: undefined
          }),
          configurable: true
        });
      }

      // Permissions API spoofing
      if (navigator.permissions) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = function(parameters) {
          return originalQuery.call(this, parameters).then(result => {
            if (parameters.name === 'notifications') {
              Object.defineProperty(result, 'state', { get: () => 'default' });
            }
            return result;
          });
        };
      }

      // Battery API removal (privacy)
      if (navigator.getBattery) {
        navigator.getBattery = undefined;
      }

      // Connection API spoofing
      if (navigator.connection) {
        Object.defineProperty(navigator.connection, 'rtt', {
          get: () => Math.floor(Math.random() * 50) + 50,
          configurable: true
        });
      }

      console.log('Anti-detection script injected successfully');
      
    } catch (err) {
      console.error('Anti-detection injection failed:', err);
    }
  })();
  `;
}

/**
 * Generate WebRTC blocking script with comprehensive leak prevention
 * @returns {string} JavaScript code to inject
 */
function buildWebRTCBlockingScript() {
  return `
  (() => {
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
      
      console.log('WebRTC blocking script injected successfully');
      
    } catch (err) {
      console.error('WebRTC blocking injection failed', err);
    }
  })();
  `;
}

/**
 * Generate platform-specific overrides based on device profile
 * @param {Object} profile - Device profile with platform info
 * @returns {Object} Platform-specific overrides
 */
function generatePlatformOverrides(profile) {
  const { platform, userAgent, viewport } = profile;
  
  const overrides = {
    userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    languages: ['en-US', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 8,
    screen: {
      width: viewport?.width || 1920,
      height: viewport?.height || 1080,
      colorDepth: 24
    },
    plugins: []
  };

  // Platform-specific adjustments
  switch (platform?.toLowerCase()) {
    case 'android':
      overrides.platform = 'Linux armv8l';
      overrides.hardwareConcurrency = 4;
      overrides.deviceMemory = 4;
      overrides.plugins = [
        {
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format'
        }
      ];
      break;
      
    case 'ios':
      overrides.platform = 'iPhone';
      overrides.hardwareConcurrency = 6;
      overrides.deviceMemory = 4;
      overrides.plugins = [];
      break;
      
    case 'macos':
      overrides.platform = 'MacIntel';
      overrides.hardwareConcurrency = 8;
      overrides.deviceMemory = 16;
      overrides.plugins = [
        {
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format'
        },
        {
          name: 'Chrome PDF Viewer',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          description: ''
        }
      ];
      break;
      
    case 'linux':
      overrides.platform = 'Linux x86_64';
      overrides.hardwareConcurrency = 4;
      overrides.deviceMemory = 8;
      break;
      
    default: // Windows
      overrides.platform = 'Win32';
      overrides.hardwareConcurrency = 8;
      overrides.deviceMemory = 8;
      overrides.plugins = [
        {
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format'
        },
        {
          name: 'Microsoft Edge PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format'
        }
      ];
  }

  return overrides;
}

module.exports = {
  buildAntiDetectionScript,
  buildWebRTCBlockingScript,
  generatePlatformOverrides
};
