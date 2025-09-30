// Enhanced WebView Preload Script with Advanced Platform Fingerprint Spoofing
// This script is injected into all browser profiles for comprehensive anti-detection

const { contextBridge, ipcRenderer } = require('electron');

(function() {
  'use strict';

  console.log('🛡️ BeastBrowser Enhanced Anti-Detection Shield Loading...');

  // Get platform from window.location or environment
  const platform = window.platform || process.platform || 'windows';
  
  // Use real user agent from window object if available, otherwise use platform-specific fingerprints
  const realUserAgent = window.platformConfig?.realUserAgent || window.userAgent;
  
  // Platform-specific fingerprints with real user agents
  const platformFingerprints = {
    android: {
      userAgent: realUserAgent || "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv7l",
      vendor: "Google Inc.",
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 5,
      languages: ["en-US", "en"],
      webgl: { vendor: "Qualcomm", renderer: "Adreno (TM) 640" }
    },
    ios: {
      userAgent: realUserAgent || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      vendor: "Apple Computer, Inc.",
      hardwareConcurrency: 6,
      deviceMemory: 6,
      maxTouchPoints: 5,
      languages: ["en-US", "en"],
      webgl: { vendor: "Apple Inc.", renderer: "Apple A15 GPU" }
    },
    windows: {
      userAgent: realUserAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "Win32",
      vendor: "Google Inc.",
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 0,
      languages: ["en-US", "en"],
      webgl: { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon (TM) Graphics (0x000015E7) Direct3D11 vs_5_0 ps_5_0, D3D11)" }
    },
    macos: {
      userAgent: realUserAgent || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "MacIntel",
      vendor: "Google Inc.",
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 0,
      languages: ["en-US", "en"],
      webgl: { vendor: "Intel Inc.", renderer: "Intel Iris Pro OpenGL Engine" }
    },
    linux: {
      userAgent: realUserAgent || "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "Linux x86_64",
      vendor: "Google Inc.",
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 0,
      languages: ["en-US", "en"],
      webgl: { vendor: "NVIDIA Corporation", renderer: "GeForce GTX 1060/PCIe/SSE2" }
    },
    tv: {
      userAgent: realUserAgent || "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.93 TV Safari/537.36",
      platform: "Linux armv7l",
      vendor: "Google Inc.",
      hardwareConcurrency: 4,
      deviceMemory: 4,
      maxTouchPoints: 0,
      languages: ["en-US", "en"],
      webgl: { vendor: "ARM", renderer: "Mali-G52 MC1" }
    }
  };

  // Get platform fingerprint
  const fingerprint = platformFingerprints[platform] || platformFingerprints.windows;

  // 1. CRITICAL: Override User Agent
  Object.defineProperty(navigator, 'userAgent', {
    get: () => fingerprint.userAgent,
    configurable: false,
    enumerable: true
  });

  // 2. Override Platform
  Object.defineProperty(navigator, 'platform', {
    get: () => fingerprint.platform,
    configurable: false,
    enumerable: true
  });

  // 3. Override Hardware Concurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => fingerprint.hardwareConcurrency,
    configurable: false,
    enumerable: true
  });

  // 4. Override Device Memory
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => fingerprint.deviceMemory,
    configurable: false,
    enumerable: true
  });

  // 5. Override Max Touch Points
  Object.defineProperty(navigator, 'maxTouchPoints', {
    get: () => fingerprint.maxTouchPoints,
    configurable: false,
    enumerable: true
  });

  // 6. Override Vendor
  Object.defineProperty(navigator, 'vendor', {
    get: () => fingerprint.vendor,
    configurable: false,
    enumerable: true
  });

  // 7. Override Languages (configurable so we can update after timezone is known)
  let __beastLocale = (fingerprint.languages && fingerprint.languages[0]) || 'en-US';
  let __beastLanguages = fingerprint.languages || ['en-US', 'en'];
  Object.defineProperty(navigator, 'languages', {
    get: () => __beastLanguages,
    configurable: true,
    enumerable: true
  });

  Object.defineProperty(navigator, 'language', {
    get: () => __beastLocale,
    configurable: true,
    enumerable: true
  });

  // 8. Remove WebDriver Detection
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: false,
    enumerable: true
  });

  // 9. Override WebGL Fingerprint
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
      return fingerprint.webgl.vendor;
    }
    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
      return fingerprint.webgl.renderer;
    }
    if (parameter === 7936) { // VERSION
      return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
    }
    if (parameter === 7937) { // SHADING_LANGUAGE_VERSION
      return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)';
    }
    return originalGetParameter.apply(this, arguments);
  };

  // Also apply to WebGL2
  if (window.WebGL2RenderingContext) {
    WebGL2RenderingContext.prototype.getParameter = WebGLRenderingContext.prototype.getParameter;
  }

  // 10. Canvas Fingerprint Protection
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const context = this.getContext('2d');
    const imageData = context.getImageData(0, 0, this.width, this.height);
    
    // Add platform-specific consistent noise
    const platformSeed = platform.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = ((platformSeed + i) % 5) - 2;
      imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
    }
    
    context.putImageData(imageData, 0, 0);
    return originalToDataURL.apply(this, arguments);
  };

  // 11. Audio Context Fingerprint Protection
  if (window.AudioContext || window.webkitAudioContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    
    const originalCreateAnalyser = AudioContextConstructor.prototype.createAnalyser;
    AudioContextConstructor.prototype.createAnalyser = function() {
      const analyser = originalCreateAnalyser.apply(this, arguments);
      
      const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
      analyser.getFloatFrequencyData = function(array) {
        originalGetFloatFrequencyData.apply(this, arguments);
        // Add platform-specific audio noise
        const audioSeed = platform === 'android' ? 12345 : platform === 'ios' ? 23456 : 34567;
        for (let i = 0; i < array.length; i++) {
          array[i] += ((audioSeed + i) % 100) * 0.00001 - 0.0005;
        }
      };
      
      return analyser;
    };
  }

  // 12. ENHANCED WebRTC Blocking to prevent IP leaks
  (function() {
    'use strict';
    
    console.log('🛡️ Applying enhanced WebRTC blocking...');
    
    // Enhanced WebRTC blocking with better error handling
    const blockWebRTC = () => {
      const noop = function() { 
        console.warn('🚫 WebRTC access blocked for security');
        throw new DOMException('WebRTC is disabled for security', 'NotSupportedError'); 
      };
      
      const noopAsync = function() {
        console.warn('🚫 WebRTC async access blocked for security');
        return Promise.reject(new DOMException('WebRTC is disabled for security', 'NotSupportedError'));
      };
      
      // Block RTCPeerConnection (all variants)
      const rtcConstructors = [
        'RTCPeerConnection',
        'webkitRTCPeerConnection', 
        'mozRTCPeerConnection',
        'msRTCPeerConnection'
      ];
      
      rtcConstructors.forEach(constructor => {
        try {
          if (window[constructor]) {
            Object.defineProperty(window, constructor, {
              get: () => noop,
              set: () => {},
              configurable: false,
              enumerable: true
            });
            console.log(`✅ Blocked ${constructor}`);
          }
        } catch (e) {
          console.warn(`⚠️ Could not block ${constructor}:`, e.message);
        }
      });
      
      // Block RTCDataChannel and related APIs
      const rtcApis = [
        'RTCDataChannel',
        'RTCSessionDescription',
        'RTCIceCandidate',
        'RTCStatsReport',
        'RTCRtpSender',
        'RTCRtpReceiver',
        'RTCRtpTransceiver'
      ];
      
      rtcApis.forEach(api => {
        try {
          if (window[api]) {
            Object.defineProperty(window, api, {
              get: () => noop,
              set: () => {},
              configurable: false,
              enumerable: true
            });
            console.log(`✅ Blocked ${api}`);
          }
        } catch (e) {
          console.warn(`⚠️ Could not block ${api}:`, e.message);
        }
      });
      
      // Block MediaStream APIs
      const mediaApis = [
        'MediaStream',
        'MediaStreamTrack',
        'MediaRecorder',
        'MediaStreamAudioSourceNode',
        'MediaStreamAudioDestinationNode'
      ];
      
      mediaApis.forEach(api => {
        try {
          if (window[api]) {
            Object.defineProperty(window, api, {
              get: () => noop,
              set: () => {},
              configurable: false,
              enumerable: true
            });
            console.log(`✅ Blocked ${api}`);
          }
        } catch (e) {
          console.warn(`⚠️ Could not block ${api}:`, e.message);
        }
      });
      
      // Enhanced getUserMedia blocking
      const blockGetUserMedia = () => {
        const mediaError = new DOMException('Media access denied for security', 'NotAllowedError');
        
        // Block all getUserMedia variants
        const getUserMediaMethods = [
          'getUserMedia',
          'webkitGetUserMedia',
          'mozGetUserMedia',
          'msGetUserMedia'
        ];
        
        getUserMediaMethods.forEach(method => {
          if (navigator[method]) {
            navigator[method] = function(constraints, success, error) {
              console.warn(`🚫 ${method} access blocked`);
              if (error) error(mediaError);
              return Promise.reject(mediaError);
            };
          }
        });
        
        // Enhanced mediaDevices blocking
        if (navigator.mediaDevices) {
          try {
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
              get: () => noopAsync,
              set: () => {},
              configurable: false,
              enumerable: true
            });
            
            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
              get: () => noopAsync,
              set: () => {},
              configurable: false,
              enumerable: true
            });
            
            Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
              get: () => () => Promise.resolve([]),
              set: () => {},
              configurable: false,
              enumerable: true
            });
            
            console.log('✅ Enhanced mediaDevices blocking applied');
          } catch (e) {
            console.warn('⚠️ Could not fully block mediaDevices:', e.message);
          }
        }
      };
      
      blockGetUserMedia();
      
      // Block MediaRecorder
      try {
        if (window.MediaRecorder) {
          window.MediaRecorder = noop;
          window.MediaRecorder.prototype = {};
        }
      } catch (e) {
        // Already blocked, ignore
      }
      
      // Block WebRTC stats
      try {
        if (window.RTCStatsReport) {
          window.RTCStatsReport = noop;
        }
      } catch (e) {
        // Already blocked, ignore
      }
      
      // Override navigator.mediaDevices completely (only if not already defined)
      if (!navigator.mediaDevices || navigator.mediaDevices.getUserMedia) {
        try {
          Object.defineProperty(navigator, 'mediaDevices', {
            get: () => ({
              getUserMedia: () => Promise.reject(new Error('Media access denied')),
              enumerateDevices: () => Promise.resolve([]),
              getDisplayMedia: () => Promise.reject(new Error('Screen sharing denied')),
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false
            }),
            configurable: true,
            enumerable: true
          });
        } catch (e) {
          // If already defined, try to override methods directly
          if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Media access denied'));
            navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
            navigator.mediaDevices.getDisplayMedia = () => Promise.reject(new Error('Screen sharing denied'));
          }
        }
      }
      
      // Enhanced WebRTC event blocking
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        const blockedEvents = [
          'icecandidate', 'icecandidateerror', 'iceconnectionstatechange',
          'icegatheringstatechange', 'negotiationneeded', 'signalingstatechange',
          'track', 'datachannel', 'connectionstatechange', 'rtc', 'peer', 'ice'
        ];
        
        const shouldBlock = blockedEvents.some(blocked => 
          type.toLowerCase().includes(blocked.toLowerCase())
        );
        
        if (shouldBlock) {
          console.warn(`🚫 Blocked WebRTC event listener: ${type}`);
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Block WebRTC-related properties
      const blockedProperties = [
        'localDescription', 'remoteDescription', 'signalingState', 'iceConnectionState',
        'iceGatheringState', 'connectionState', 'iceTransport', 'sctpTransport',
        'datachannel', 'ontrack', 'onicecandidate', 'oniceconnectionstatechange',
        'onicegatheringstatechange', 'onconnectionstatechange', 'onsignalingstatechange'
      ];
      
      blockedProperties.forEach(prop => {
        try {
          Object.defineProperty(window, prop, {
            get: () => undefined,
            set: () => {},
            configurable: false,
            enumerable: false
          });
        } catch (e) {
          // Property might not exist, ignore
        }
      });
      
      console.log('✅ Comprehensive WebRTC blocking applied');
    };
    
    // Apply blocking immediately and more frequently
    blockWebRTC();
    
    // Re-apply blocking more frequently to prevent redefinition
    setInterval(blockWebRTC, 500);
    
    // Enhanced window.open blocking
    const originalOpen = window.open;
    window.open = function(...args) {
      const newWindow = originalOpen.apply(this, args);
      if (newWindow) {
        // Apply blocking multiple times to ensure it sticks
        [100, 500, 1000].forEach(delay => {
          setTimeout(() => {
            try {
              newWindow.eval(`(${blockWebRTC.toString()})();`);
              console.log('✅ WebRTC blocking applied to new window');
            } catch (e) {
              // Cross-origin restrictions, ignore
              console.warn('⚠️ Could not apply WebRTC blocking to new window:', e.message);
            }
          }, delay);
        });
      }
      return newWindow;
    };
    
    // Block iframe WebRTC as well
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName);
      if (tagName.toLowerCase() === 'iframe') {
        element.addEventListener('load', () => {
          try {
            if (element.contentWindow) {
              element.contentWindow.eval(`(${blockWebRTC.toString()})();`);
              console.log('✅ WebRTC blocking applied to iframe');
            }
          } catch (e) {
            // Cross-origin restrictions, ignore
            console.warn('⚠️ Could not apply WebRTC blocking to iframe:', e.message);
          }
        });
      }
      return element;
    };
    
    // Enhanced blocking verification
    const verifyBlocking = () => {
      const blockedAPIs = [];
      const testAPIs = [
        'RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection',
        'RTCDataChannel', 'MediaStream', 'MediaRecorder'
      ];
      
      testAPIs.forEach(api => {
        try {
          if (window[api] && typeof window[api] === 'function') {
            new window[api]();
            console.warn(`⚠️ ${api} not properly blocked!`);
          } else {
            blockedAPIs.push(api);
          }
        } catch (e) {
          blockedAPIs.push(api); // Successfully blocked
        }
      });
      
      return blockedAPIs;
    };
    
    const blockedAPIs = verifyBlocking();
    
    // Store enhanced WebRTC blocking status
    window.beastBrowserWebRTCBlocked = {
      blocked: true,
      timestamp: new Date().toISOString(),
      blockedAPIs: blockedAPIs,
      totalBlocked: blockedAPIs.length,
      reason: 'Enhanced IP leak prevention',
      version: '2.0'
    };
    
    console.log(`✅ Enhanced WebRTC blocking complete. Blocked ${blockedAPIs.length} APIs:`, blockedAPIs);
    
    // Additional protection: Monitor for WebRTC API recreation attempts
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj, prop, descriptor) {
      const webrtcProps = [
        'RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection',
        'RTCDataChannel', 'MediaStream', 'MediaRecorder'
      ];
      
      if (obj === window && webrtcProps.includes(prop)) {
        console.warn(`🚫 Blocked attempt to redefine WebRTC API: ${prop}`);
        return obj; // Block the redefinition
      }
      
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };
    
  })();

  // 13. Remove Chrome Runtime Detection
  if (window.chrome) {
    delete window.chrome.runtime;
  }

  // 14. Remove Automation Indicators
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

  // 15. Override Screen Properties (platform-specific)
  const screenDimensions = {
    android: { width: 390, height: 844, availWidth: 390, availHeight: 844 },
    ios: { width: 430, height: 932, availWidth: 430, availHeight: 932 },
    windows: { width: 1366, height: 768, availWidth: 1366, availHeight: 728 },
    macos: { width: 1440, height: 900, availWidth: 1440, availHeight: 877 },
    linux: { width: 1366, height: 768, availWidth: 1366, availHeight: 728 },
    tv: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1080 }
  };

  const screenProps = screenDimensions[platform] || screenDimensions.windows;

  Object.defineProperty(screen, 'width', {
    get: () => screenProps.width,
    configurable: false,
    enumerable: true
  });

  Object.defineProperty(screen, 'height', {
    get: () => screenProps.height,
    configurable: false,
    enumerable: true
  });

  Object.defineProperty(screen, 'availWidth', {
    get: () => screenProps.availWidth,
    configurable: false,
    enumerable: true
  });

  Object.defineProperty(screen, 'availHeight', {
    get: () => screenProps.availHeight,
    configurable: false,
    enumerable: true
  });

  // 16. Override Plugins (platform-specific)
  const plugins = [
    { name: "PDF Viewer", filename: "internal-pdf-viewer", description: "Portable Document Format" },
    { name: "Chrome PDF Viewer", filename: "internal-pdf-viewer", description: "Portable Document Format" }
  ];

  Object.defineProperty(navigator, 'plugins', {
    get: () => plugins,
    configurable: false,
    enumerable: true
  });

  // 17. Override MIME Types
  const mimeTypes = [
    { type: "application/pdf", description: "Portable Document Format", suffixes: "pdf" }
  ];

  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => mimeTypes,
    configurable: false,
    enumerable: true
  });

  // 18. Platform-specific Battery API
  if (navigator.getBattery) {
    navigator.getBattery = function() {
      return Promise.resolve({
        charging: platform === 'android' || platform === 'ios' ? false : true,
        chargingTime: platform === 'android' || platform === 'ios' ? Infinity : 0,
        dischargingTime: platform === 'android' || platform === 'ios' ? Math.floor(Math.random() * 28800) + 7200 : Infinity,
        level: platform === 'android' || platform === 'ios' ? 0.1 + Math.random() * 0.8 : 1.0,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true
      });
    };
  }

  // 19. Platform-specific Connection API
  Object.defineProperty(navigator, 'connection', {
    get: () => ({
      effectiveType: platform === 'android' || platform === 'ios' ? '4g' : 'wifi',
      downlink: platform === 'android' || platform === 'ios' ? 10 : 50,
      rtt: platform === 'android' || platform === 'ios' ? 150 : 50,
      saveData: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    }),
    configurable: false,
    enumerable: true
  });

  // 20. Override toString methods to prevent detection
  if (navigator.userAgent.toString) {
    navigator.userAgent.toString = () => fingerprint.userAgent;
  }
  if (navigator.platform.toString) {
    navigator.platform.toString = () => fingerprint.platform;
  }
  if (navigator.vendor.toString) {
    navigator.vendor.toString = () => fingerprint.vendor;
  }

  console.log('✅ Advanced platform fingerprint spoofing applied successfully for', platform);
  console.log('🔍 Fingerprint verification:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
    webdriver: navigator.webdriver,
    screen: {
      width: screen.width,
      height: screen.height
    }
  });

})();

// ========================================
// 🕐 CRITICAL FIX: ENHANCED TIMEZONE SPOOFING FUNCTIONALITY 
// ========================================

(function() {
  'use strict';

  // FIXED: Enhanced preload script with proper timezone spoofing support
  let currentTimezone = null;
  let timezoneApplied = false;

  // CRITICAL FIX: Get timezone from window.platformConfig first
  function getTimezoneFromConfig() {
    try {
      // Priority 1: Proxy timezone from platformConfig
      if (window.platformConfig && window.platformConfig.proxyTimezone && window.platformConfig.proxyTimezone !== 'not-detected') {
        console.log('🌍 [PRELOAD] Found proxy timezone in platformConfig:', window.platformConfig.proxyTimezone);
        return window.platformConfig.proxyTimezone;
      }
      
      // Priority 2: geoData timezone
      if (window.geoData && window.geoData.timezone) {
        console.log('🗺️ [PRELOAD] Found geoData timezone:', window.geoData.timezone);
        return window.geoData.timezone;
      }
      
      // Priority 3: Check for injected timezone variables
      if (window.BEAST_BROWSER_TIMEZONE) {
        console.log('🔧 [PRELOAD] Found global timezone variable:', window.BEAST_BROWSER_TIMEZONE);
        return window.BEAST_BROWSER_TIMEZONE;
      }
      
      console.warn('⚠️ [PRELOAD] No timezone found in config, using fallback');
      return null;
    } catch (error) {
      console.error('❌ [PRELOAD] Error getting timezone from config:', error);
      return null;
    }
  }

  // ENHANCED: Listen for timezone updates from main process
  ipcRenderer.on('timezone-spoof:apply', (event, timezone) => {
    console.log('📡 [PRELOAD] Received timezone from main process:', timezone);
    currentTimezone = timezone;
    applyTimezoneSpoof(timezone);
  });

  // CRITICAL FIX: Try to get timezone immediately on load
  function initializeTimezone() {
    // Try to get from config first
    const configTimezone = getTimezoneFromConfig();
    if (configTimezone) {
      currentTimezone = configTimezone;
      applyTimezoneSpoof(configTimezone);
      return;
    }
    
    // Fallback: Request from main process
    ipcRenderer.invoke('timezone-spoof:get-current').then(timezone => {
      if (timezone) {
        console.log('📡 [PRELOAD] Got timezone from main process:', timezone);
        currentTimezone = timezone;
        applyTimezoneSpoof(timezone);
      } else {
        console.warn('⚠️ [PRELOAD] No timezone available from main process');
      }
    }).catch(error => {
      console.error('❌ [PRELOAD] Failed to get timezone from main process:', error);
    });
  }

  // ENHANCED: Apply timezone spoofing with better error handling
  function applyTimezoneSpoof(targetTimezone) {
    if (timezoneApplied || !targetTimezone) {
      console.log('🕐 [PRELOAD] Timezone already applied or invalid:', { timezoneApplied, targetTimezone });
      return;
    }
    
    try {
      console.log('🕐 [PRELOAD] Applying timezone spoof:', targetTimezone);
      
      // 1. Override Intl.DateTimeFormat before any scripts load
      const OriginalDateTimeFormat = Intl.DateTimeFormat;
      const OriginalResolvedOptions = OriginalDateTimeFormat.prototype.resolvedOptions;
      
      Intl.DateTimeFormat = function(locales, options = {}) {
        const enhancedOptions = { ...options, timeZone: targetTimezone };
        const formatter = new OriginalDateTimeFormat(locales, enhancedOptions);
        
        formatter.resolvedOptions = function() {
          const resolved = OriginalResolvedOptions.call(this);
          resolved.timeZone = targetTimezone;
          return resolved;
        };
        
        return formatter;
      };
      
      Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
      Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
      
      // 2. Override Date methods
      const OriginalToLocaleString = Date.prototype.toLocaleString;
      const OriginalToLocaleDateString = Date.prototype.toLocaleDateString;
      const OriginalToLocaleTimeString = Date.prototype.toLocaleTimeString;
      
      Date.prototype.toLocaleString = function(locales, options = {}) {
        const opts = { ...options, timeZone: targetTimezone };
        return OriginalToLocaleString.call(this, locales, opts);
      };
      
      Date.prototype.toLocaleDateString = function(locales, options = {}) {
        const opts = { ...options, timeZone: targetTimezone };
        return OriginalToLocaleDateString.call(this, locales, opts);
      };
      
      Date.prototype.toLocaleTimeString = function(locales, options = {}) {
        const opts = { ...options, timeZone: targetTimezone };
        return OriginalToLocaleTimeString.call(this, locales, opts);
      };
      
      // 3. Override getTimezoneOffset (enhanced calculation)
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        try {
          // Calculate timezone offset for our target timezone
          const now = new Date();
          const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
          const target = new Date(now.toLocaleString('en-US', { timeZone: targetTimezone }));
          return (utc.getTime() - target.getTime()) / (1000 * 60);
        } catch (e) {
          console.warn('⚠️ [PRELOAD] Timezone offset calculation failed, using original:', e);
          return originalGetTimezoneOffset.call(this);
        }
      };
      
      // 4. Derive and apply locale based on timezone/country
      try {
        const deriveLocaleFromTimezone = (tz) => {
          if (!tz || typeof tz !== 'string') return 'en-US';
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
          return map[tz] || __beastLocale || 'en-US';
        };
        __beastLocale = deriveLocaleFromTimezone(targetTimezone);
        __beastLanguages = [__beastLocale, __beastLocale.split('-')[0]];
        // Redefine to ensure getters pick updated values (already getters)
        // Expose chosen locale
        window.beastBrowserLocale = {
          locale: __beastLocale,
          languages: __beastLanguages,
          source: 'timezone-derived',
          at: new Date().toISOString()
        };
      } catch (e) {
        console.warn('⚠️ [PRELOAD] Failed to derive locale from timezone:', e.message);
      }

      // 5. CRITICAL: Inject timezone info into window for verification
      window.beastBrowserTimezone = {
        timezone: targetTimezone,
        applied: true,
        timestamp: new Date().toISOString(),
        originalTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        source: 'enhanced-preload-script',
        proxyDetected: window.platformConfig?.proxyConnected || false
      };
      
      // 6. CRITICAL: Also set global timezone variable for webview access
      window.BEAST_BROWSER_TIMEZONE = targetTimezone;
      
      timezoneApplied = true;
      console.log('✅ [PRELOAD] Timezone spoofing applied successfully:', targetTimezone);
      
      // 7. Test the spoofing immediately
      console.log('🧪 [PRELOAD] BeastBrowser Timezone Test:', {
        'Intl timezone': new Intl.DateTimeFormat().resolvedOptions().timeZone,
        'Date string': new Date().toLocaleString(),
        'Timezone offset': new Date().getTimezoneOffset(),
        'Target timezone': targetTimezone,
        'Window timezone': window.beastBrowserTimezone,
        'Global timezone': window.BEAST_BROWSER_TIMEZONE,
        'Locale': __beastLocale,
        'Languages': __beastLanguages
      });
      
    } catch (error) {
      console.error('❌ [PRELOAD] Timezone spoofing failed:', error);
      window.beastBrowserTimezone = {
        timezone: targetTimezone,
        applied: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        source: 'enhanced-preload-script'
      };
    }
  }

  // CRITICAL FIX: Initialize timezone as early as possible
  // Try multiple times to ensure we get the timezone
  let initAttempts = 0;
  const maxInitAttempts = 10;
  
  function tryInitializeTimezone() {
    initAttempts++;
    console.log(`🔄 [PRELOAD] Timezone init attempt ${initAttempts}/${maxInitAttempts}`);
    
    if (currentTimezone || timezoneApplied) {
      console.log('✅ [PRELOAD] Timezone already initialized');
      return;
    }
    
    initializeTimezone();
    
    // If still no timezone and we haven't reached max attempts, try again
    if (!currentTimezone && !timezoneApplied && initAttempts < maxInitAttempts) {
      setTimeout(tryInitializeTimezone, 500);
    }
  }
  
  // Start initialization immediately
  tryInitializeTimezone();
  
  // ENHANCED: Also try when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 [PRELOAD] DOM ready, checking timezone status');
    if (!timezoneApplied) {
      tryInitializeTimezone();
    }
  });
  
  // ENHANCED: Also try when window loads
  window.addEventListener('load', () => {
    console.log('🌐 [PRELOAD] Window loaded, checking timezone status');
    if (!timezoneApplied) {
      tryInitializeTimezone();
    }
  });

  // CRITICAL FIX: Expose timezone APIs to main world for webview access
  window.timezoneAPI = {
    getTimezone: () => currentTimezone,
    isApplied: () => timezoneApplied,
    getBeastTimezone: () => window.beastBrowserTimezone,
    onTimezoneUpdate: (callback) => {
      ipcRenderer.on('timezone-spoof:apply', (event, timezone) => {
        callback(timezone);
      });
    }
  };

})();

// ENHANCED: Expose electronAPI for UI integration with timezone support
contextBridge.exposeInMainWorld('electronAPI', {
  openProfile: (profile) => ipcRenderer.invoke('open-profile', profile),
  closeProfile: (profileId) => ipcRenderer.invoke('close-profile', profileId),
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profile) => ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (profileId) => ipcRenderer.invoke('delete-profile', profileId),
  testProxy: (proxy) => ipcRenderer.invoke('test-proxy', proxy),
  getGeoLocation: (proxy) => ipcRenderer.invoke('get-geo-location', proxy),
  setAntiDetection: (config) => ipcRenderer.invoke('set-anti-detection', config),
  platform: process.platform,
  
  // ENHANCED: Timezone APIs with better error handling
  getTimezone: () => {
    try {
      return window.timezoneAPI?.getTimezone() || window.BEAST_BROWSER_TIMEZONE || null;
    } catch (error) {
      console.error('❌ [PRELOAD] Error getting timezone:', error);
      return null;
    }
  },
  onTimezoneUpdate: (callback) => {
    try {
      ipcRenderer.on('timezone-spoof:apply', (event, timezone) => {
        console.log('📡 [PRELOAD] Timezone update received for callback:', timezone);
        callback(timezone);
      });
    } catch (error) {
      console.error('❌ [PRELOAD] Error setting timezone callback:', error);
    }
  },
  getTimezoneStatus: () => {
    try {
      return {
        current: window.timezoneAPI?.getTimezone(),
        applied: window.timezoneAPI?.isApplied(),
        beastTimezone: window.beastBrowserTimezone,
        globalTimezone: window.BEAST_BROWSER_TIMEZONE,
        platformConfig: window.platformConfig
      };
    } catch (error) {
      console.error('❌ [PRELOAD] Error getting timezone status:', error);
      return null;
    }
  }
});

console.log('🦁 [PRELOAD] BeastBrowser Enhanced Preload Script loaded with timezone support');