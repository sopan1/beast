// Enhanced WebView Preload Script for BeastBrowser
// This script runs in the context of web pages to apply fingerprint spoofing

console.log('🦁 BeastBrowser Enhanced WebView Preload Script Loading...');

// CRITICAL: Hide all Electron traces immediately
(function() {
  'use strict';
  
  // Remove all Electron-specific globals
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
  
  // Override process if it still exists
  if (typeof process !== 'undefined') {
    Object.defineProperty(window, 'process', {
      get: function() { return undefined; },
      configurable: false
    });
  }
  
  console.log('🛡️ Electron traces removed from window object');
})();

// Apply enhanced fingerprint spoofing based on current profile
window.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Applying enhanced fingerprint spoofing on DOMContentLoaded');
  
  // Get profile data from session storage or use defaults
  let profileData = {};
  try {
    const storedProfile = sessionStorage.getItem('beastbrowser_profile');
    if (storedProfile) {
      profileData = JSON.parse(storedProfile);
    }
  } catch (error) {
    console.warn('Failed to load profile data:', error);
  }
  
  // Default Windows Chrome profile
  const defaultProfile = {
    platform: 'Win32',
    vendor: 'Google Inc.',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    languages: ['en-US', 'en'],
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
    timezone: 'America/New_York',
    timezoneOffset: -300
  };
  
  const profile = { ...defaultProfile, ...profileData };
  
  console.log('🎯 Applying fingerprint profile:', profile);
  
  // 1. CRITICAL: Navigator Properties Override
  const navigatorProps = {
    userAgent: profile.userAgent,
    appName: 'Netscape',
    appVersion: profile.userAgent.split('Mozilla/')[1],
    appCodeName: 'Mozilla',
    platform: profile.platform,
    vendor: profile.vendor,
    vendorSub: '',
    product: 'Gecko',
    productSub: '20030107',
    hardwareConcurrency: profile.hardwareConcurrency,
    deviceMemory: profile.deviceMemory,
    maxTouchPoints: profile.maxTouchPoints,
    language: profile.languages[0],
    languages: profile.languages,
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

  // 2. CRITICAL: UserAgentData Override
  if (profile.platform !== 'iPhone' && profile.platform !== 'iPad') {
    const userAgentData = {
      brands: [
        { brand: "Not A(Brand", version: "99" },
        { brand: "Google Chrome", version: "121" },
        { brand: "Chromium", version: "121" }
      ],
      mobile: profile.maxTouchPoints > 0,
      platform: profile.platform.includes('Win') ? 'Windows' : 
                profile.platform.includes('Mac') ? 'macOS' : 
                profile.platform.includes('Linux') && profile.platform.includes('arm') ? 'Android' : 'Linux',
      getHighEntropyValues: async function(hints) {
        const values = {
          architecture: profile.platform.includes('arm') ? 'arm' : 'x86',
          bitness: profile.platform.includes('arm') ? '32' : '64',
          brands: this.brands,
          fullVersionList: this.brands,
          mobile: this.mobile,
          model: profile.platform.includes('arm') ? 'Pixel 7' : '',
          platform: this.platform,
          platformVersion: profile.platform.includes('Win') ? '10.0.0' : 
                          profile.platform.includes('Mac') ? '10.15.7' : 
                          profile.platform.includes('arm') ? '13.0.0' : '5.4.0',
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
  }

  // 3. CRITICAL: Screen Properties Override
  const screenProps = {
    width: profile.screen.width,
    height: profile.screen.height,
    availWidth: profile.screen.width,
    availHeight: profile.screen.height - 40,
    colorDepth: profile.screen.colorDepth,
    pixelDepth: profile.screen.pixelDepth
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

  // 4. CRITICAL: Timezone Override
  if (profile.timezone && profile.timezoneOffset !== undefined) {
    const TARGET_TIMEZONE = profile.timezone;
    const TIMEZONE_OFFSET = profile.timezoneOffset;
    
    // Override Date.prototype.getTimezoneOffset
    Date.prototype.getTimezoneOffset = function() {
      return TIMEZONE_OFFSET;
    };

    // Override Intl.DateTimeFormat
    const OriginalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locales, options = {}) {
      options.timeZone = TARGET_TIMEZONE;
      return new OriginalDateTimeFormat(locales, options);
    };
    Object.setPrototypeOf(Intl.DateTimeFormat, OriginalDateTimeFormat);
    Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
  }

  // 5. CRITICAL: WebGL Override
  if (window.WebGLRenderingContext) {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      switch(parameter) {
        case 37445: // UNMASKED_VENDOR_WEBGL
          return profile.webglVendor;
        case 37446: // UNMASKED_RENDERER_WEBGL
          return profile.webglRenderer;
        case 7936: // VERSION
          return `OpenGL ES 2.0 (${profile.webglRenderer})`;
        case 7937: // SHADING_LANGUAGE_VERSION
          return `OpenGL ES GLSL ES 1.0 (${profile.webglRenderer})`;
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
          return profile.webglVendor;
        case 37446: // UNMASKED_RENDERER_WEBGL
          return profile.webglRenderer;
        case 7936: // VERSION
          return `OpenGL ES 3.0 (${profile.webglRenderer})`;
        case 7937: // SHADING_LANGUAGE_VERSION
          return `OpenGL ES GLSL ES 3.0 (${profile.webglRenderer})`;
        default:
          return originalGetParameter2.call(this, parameter);
      }
    };
  }

  // 6. Canvas Fingerprint Protection
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      const platformSeed = profile.platform.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      // Apply consistent platform-based noise
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = ((platformSeed + i) % 3) - 1;
        imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
      }
      context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, arguments);
  };

  // 7. Remove WebDriver Detection
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

  // 8. Chrome Runtime Spoofing
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
    screen: `${screen.width}x${screen.height}`,
    webgl: `${profile.webglVendor} - ${profile.webglRenderer}`,
    electronHidden: true
  });
});

console.log('🦁 BeastBrowser Enhanced WebView Preload Script Loaded');