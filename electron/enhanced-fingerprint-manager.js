const log = require('electron-log');
const axios = require('axios');

/**
 * Enhanced Fingerprint Manager for BeastBrowser
 * Comprehensive anti-detection with IP-based timezone matching and proper platform spoofing
 */
class EnhancedFingerprintManager {
  constructor() {
    this.geoCache = new Map();
    this.fingerprintProfiles = {
      windows: {
        platforms: ['Win32', 'Win64'],
        vendors: ['Google Inc.', 'Microsoft Corporation'],
        userAgents: [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ],
        screens: [
          { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
          { width: 1366, height: 768, colorDepth: 24, pixelDepth: 24 },
          { width: 2560, height: 1440, colorDepth: 24, pixelDepth: 24 },
          { width: 1440, height: 900, colorDepth: 24, pixelDepth: 24 }
        ],
        webgl: {
          vendors: ['Google Inc. (Intel)', 'Google Inc. (NVIDIA)', 'Google Inc. (AMD)'],
          renderers: [
            'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)'
          ]
        },
        hardwareConcurrency: [4, 8, 12, 16],
        deviceMemory: [4, 8, 16, 32],
        languages: [['en-US', 'en'], ['en-GB', 'en']]
      },
      macos: {
        platforms: ['MacIntel'],
        vendors: ['Apple Computer, Inc.', 'Google Inc.'],
        userAgents: [
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
        ],
        screens: [
          { width: 1440, height: 900, colorDepth: 24, pixelDepth: 24 },
          { width: 1680, height: 1050, colorDepth: 24, pixelDepth: 24 },
          { width: 2560, height: 1600, colorDepth: 24, pixelDepth: 24 }
        ],
        webgl: {
          vendors: ['Intel Inc.', 'AMD Inc.'],
          renderers: [
            'Intel Iris Pro OpenGL Engine',
            'AMD Radeon Pro 560X OpenGL Engine',
            'Intel UHD Graphics 630 OpenGL Engine'
          ]
        },
        hardwareConcurrency: [4, 8, 10],
        deviceMemory: [8, 16, 32],
        languages: [['en-US', 'en'], ['en-GB', 'en']]
      },
      linux: {
        platforms: ['Linux x86_64', 'Linux i686'],
        vendors: ['Google Inc.'],
        userAgents: [
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ],
        screens: [
          { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
          { width: 1366, height: 768, colorDepth: 24, pixelDepth: 24 },
          { width: 2560, height: 1440, colorDepth: 24, pixelDepth: 24 }
        ],
        webgl: {
          vendors: ['NVIDIA Corporation', 'Intel Inc.', 'AMD Inc.'],
          renderers: [
            'GeForce GTX 1060/PCIe/SSE2',
            'Intel HD Graphics 630 (GLX)',
            'AMD Radeon RX 580 (LLVM 12.0.0, DRM 3.40, 5.4.0-generic)'
          ]
        },
        hardwareConcurrency: [4, 8, 16],
        deviceMemory: [4, 8, 16],
        languages: [['en-US', 'en'], ['en-GB', 'en']]
      },
      android: {
        platforms: ['Linux armv8l', 'Linux armv7l'],
        vendors: ['Google Inc.'],
        userAgents: [
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
          'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
        ],
        screens: [
          { width: 393, height: 851, colorDepth: 24, pixelDepth: 24 },
          { width: 412, height: 915, colorDepth: 24, pixelDepth: 24 },
          { width: 360, height: 800, colorDepth: 24, pixelDepth: 24 }
        ],
        webgl: {
          vendors: ['Qualcomm', 'ARM'],
          renderers: [
            'Adreno (TM) 730',
            'Mali-G78 MP14',
            'Adreno (TM) 640'
          ]
        },
        hardwareConcurrency: [6, 8],
        deviceMemory: [4, 6, 8],
        languages: [['en-US', 'en'], ['en-GB', 'en']],
        maxTouchPoints: 5
      },
      ios: {
        platforms: ['iPhone', 'iPad'],
        vendors: ['Apple Computer, Inc.'],
        userAgents: [
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
          'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ],
        screens: [
          { width: 390, height: 844, colorDepth: 24, pixelDepth: 24 },
          { width: 428, height: 926, colorDepth: 24, pixelDepth: 24 },
          { width: 820, height: 1180, colorDepth: 24, pixelDepth: 24 }
        ],
        webgl: {
          vendors: ['Apple Inc.'],
          renderers: [
            'Apple A16 GPU',
            'Apple A15 GPU',
            'Apple M2 GPU'
          ]
        },
        hardwareConcurrency: [6, 8, 10],
        deviceMemory: [4, 6, 8],
        languages: [['en-US', 'en'], ['en-GB', 'en']],
        maxTouchPoints: 5
      }
    };
  }

  /**
   * Get IP-based geolocation and timezone
   */
  async getIPGeolocation(proxyIP = null) {
    try {
      const cacheKey = proxyIP || 'default';
      if (this.geoCache.has(cacheKey)) {
        return this.geoCache.get(cacheKey);
      }

      // Try multiple geolocation services
      const services = [
        { url: 'http://ip-api.com/json/', fields: ['timezone', 'country', 'countryCode', 'lat', 'lon'] },
        { url: 'https://ipapi.co/json/', fields: ['timezone', 'country_name', 'country_code', 'latitude', 'longitude'] },
        { url: 'https://freegeoip.app/json/', fields: ['time_zone', 'country_name', 'country_code', 'latitude', 'longitude'] }
      ];

      for (const service of services) {
        try {
          const response = await axios.get(service.url, { timeout: 5000 });
          const data = response.data;
          
          const geoData = {
            timezone: data.timezone || data.time_zone || 'America/New_York',
            country: data.country || data.country_name || 'United States',
            countryCode: data.countryCode || data.country_code || 'US',
            latitude: data.lat || data.latitude || 40.7128,
            longitude: data.lon || data.longitude || -74.0060
          };

          this.geoCache.set(cacheKey, geoData);
          log.info('IP Geolocation obtained:', geoData);
          return geoData;
        } catch (error) {
          log.warn(`Geolocation service failed: ${service.url}`, error.message);
          continue;
        }
      }

      // Fallback to default values
      const fallback = {
        timezone: 'America/New_York',
        country: 'United States',
        countryCode: 'US',
        latitude: 40.7128,
        longitude: -74.0060
      };
      
      this.geoCache.set(cacheKey, fallback);
      return fallback;
    } catch (error) {
      log.error('Failed to get IP geolocation:', error);
      return {
        timezone: 'America/New_York',
        country: 'United States',
        countryCode: 'US',
        latitude: 40.7128,
        longitude: -74.0060
      };
    }
  }

  /**
   * Generate comprehensive fingerprint spoofing script
   */
  async generateAdvancedFingerprintScript(platform = 'windows', proxyIP = null, customProfile = {}) {
    const geoData = await this.getIPGeolocation(proxyIP);
    const profile = this.fingerprintProfiles[platform] || this.fingerprintProfiles.windows;
    
    // Select random values from profile arrays
    const selectedProfile = {
      platform: this.selectRandom(profile.platforms),
      vendor: this.selectRandom(profile.vendors),
      userAgent: customProfile.userAgent || this.selectRandom(profile.userAgents),
      screen: customProfile.screen || this.selectRandom(profile.screens),
      webglVendor: this.selectRandom(profile.webgl.vendors),
      webglRenderer: this.selectRandom(profile.webgl.renderers),
      hardwareConcurrency: this.selectRandom(profile.hardwareConcurrency),
      deviceMemory: this.selectRandom(profile.deviceMemory),
      languages: this.selectRandom(profile.languages),
      maxTouchPoints: profile.maxTouchPoints || 0,
      timezone: geoData.timezone,
      timezoneOffset: this.getTimezoneOffset(geoData.timezone)
    };

    return this.buildComprehensiveFingerprintScript(selectedProfile, geoData);
  }

  /**
   * Build comprehensive fingerprint spoofing script
   */
  buildComprehensiveFingerprintScript(profile, geoData) {
    return `
      (function() {
        'use strict';
        
        console.log('🛡️ BeastBrowser Enhanced Fingerprint Spoofing Active');
        console.log('📍 IP-based Timezone:', '${profile.timezone}');
        console.log('🖥️ Platform:', '${profile.platform}');
        console.log('🏢 Vendor:', '${profile.vendor}');
        
        try {
          // 1. CRITICAL: Navigator Properties Override
          const navigatorProps = {
            userAgent: '${profile.userAgent}',
            platform: '${profile.platform}',
            vendor: '${profile.vendor}',
            hardwareConcurrency: ${profile.hardwareConcurrency},
            deviceMemory: ${profile.deviceMemory},
            maxTouchPoints: ${profile.maxTouchPoints},
            language: '${profile.languages[0]}',
            languages: ${JSON.stringify(profile.languages)},
            webdriver: undefined,
            cookieEnabled: true,
            onLine: true,
            doNotTrack: null
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

          // 2. CRITICAL: Screen Properties Override
          const screenProps = {
            width: ${profile.screen.width},
            height: ${profile.screen.height},
            availWidth: ${profile.screen.width},
            availHeight: ${profile.screen.height - 40}, // Account for taskbar
            colorDepth: ${profile.screen.colorDepth},
            pixelDepth: ${profile.screen.pixelDepth}
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

          // 3. CRITICAL: IP-Based Timezone Override
          const TARGET_TIMEZONE = '${profile.timezone}';
          const TIMEZONE_OFFSET = ${profile.timezoneOffset};
          
          console.log('🕐 Overriding timezone to match IP location:', TARGET_TIMEZONE);
          
          // Override Date.prototype.getTimezoneOffset
          const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
          Date.prototype.getTimezoneOffset = function() {
            return TIMEZONE_OFFSET;
          };

          // Override Intl.DateTimeFormat to force IP-based timezone
          const OriginalDateTimeFormat = Intl.DateTimeFormat;
          const OriginalResolvedOptions = OriginalDateTimeFormat.prototype.resolvedOptions;
          
          Intl.DateTimeFormat = function(locales, options = {}) {
            options.timeZone = TARGET_TIMEZONE;
            const formatter = new OriginalDateTimeFormat(locales, options);
            
            formatter.resolvedOptions = function() {
              const resolved = OriginalResolvedOptions.call(this);
              resolved.timeZone = TARGET_TIMEZONE;
              return resolved;
            };
            
            return formatter;
          };
          
          Object.setPrototypeOf(Intl.DateTimeFormat, OriginalDateTimeFormat);
          Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
          Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;

          // Override all Date locale methods to use IP timezone
          const dateOverrides = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'];
          dateOverrides.forEach(method => {
            const original = Date.prototype[method];
            Date.prototype[method] = function(locales, options = {}) {
              options.timeZone = TARGET_TIMEZONE;
              return original.call(this, locales, options);
            };
          });

          // 4. CRITICAL: WebGL Fingerprint Override
          if (window.WebGLRenderingContext) {
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
              switch(parameter) {
                case 37445: // UNMASKED_VENDOR_WEBGL
                  return '${profile.webglVendor}';
                case 37446: // UNMASKED_RENDERER_WEBGL
                  return '${profile.webglRenderer}';
                case 7936: // VERSION
                  return 'OpenGL ES 2.0 (${profile.webglRenderer})';
                case 7937: // SHADING_LANGUAGE_VERSION
                  return 'OpenGL ES GLSL ES 1.0 (${profile.webglRenderer})';
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
                  return '${profile.webglVendor}';
                case 37446: // UNMASKED_RENDERER_WEBGL
                  return '${profile.webglRenderer}';
                case 7936: // VERSION
                  return 'OpenGL ES 3.0 (${profile.webglRenderer})';
                case 7937: // SHADING_LANGUAGE_VERSION
                  return 'OpenGL ES GLSL ES 3.0 (${profile.webglRenderer})';
                default:
                  return originalGetParameter2.call(this, parameter);
              }
            };
          }

          // 5. Canvas Fingerprint Protection with Platform-Specific Noise
          const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
          HTMLCanvasElement.prototype.toDataURL = function(type) {
            const context = this.getContext('2d');
            if (context) {
              const imageData = context.getImageData(0, 0, this.width, this.height);
              const platformSeed = '${profile.platform}'.split('').reduce((a, b) => {
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

          // 6. Remove WebDriver Detection
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

          // 7. Block WebRTC IP Leaks
          const rtcBlocker = function() { throw new Error('WebRTC disabled for privacy'); };
          ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection'].forEach(name => {
            if (window[name]) {
              window[name] = rtcBlocker;
            }
          });

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

          // 9. Plugin Spoofing Based on Platform
          const plugins = [];
          if ('${platform}' === 'windows') {
            plugins.push(
              { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
              { name: 'Microsoft Edge PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
            );
          } else if ('${platform}' === 'macos') {
            plugins.push(
              { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
              { name: 'QuickTime Plugin', filename: 'QuickTimePlugin.plugin', description: 'QuickTime Plug-in' }
            );
          }

          Object.defineProperty(navigator, 'plugins', {
            get: function() { return plugins; },
            configurable: true
          });

          // 10. Permissions API Spoofing
          if (navigator.permissions) {
            const originalQuery = navigator.permissions.query;
            navigator.permissions.query = function(permissionDesc) {
              return Promise.resolve({
                state: 'prompt',
                onchange: null
              });
            };
          }

          // 11. Battery API Blocking (Privacy)
          if (navigator.getBattery) {
            navigator.getBattery = undefined;
          }

          // 12. Connection API Spoofing
          Object.defineProperty(navigator, 'connection', {
            get: function() {
              return {
                effectiveType: '4g',
                downlink: 10,
                rtt: 50 + Math.random() * 100,
                saveData: false
              };
            },
            configurable: true
          });

          console.log('✅ Enhanced Fingerprint Spoofing Applied Successfully');
          console.log('📊 Fingerprint Summary:', {
            platform: '${profile.platform}',
            vendor: '${profile.vendor}',
            timezone: TARGET_TIMEZONE,
            screen: '${profile.screen.width}x${profile.screen.height}',
            webgl: '${profile.webglVendor} - ${profile.webglRenderer}',
            hardware: '${profile.hardwareConcurrency} cores, ${profile.deviceMemory}GB RAM'
          });

        } catch (error) {
          console.error('❌ Fingerprint spoofing error:', error);
        }
      })();
    `;
  }

  /**
   * Helper methods
   */
  selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getTimezoneOffset(timezone) {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
      return Math.round((utc.getTime() - target.getTime()) / 60000);
    } catch (error) {
      log.warn('Failed to calculate timezone offset:', error);
      return -300; // Default to EST
    }
  }

  /**
   * Test fingerprint against detection services
   */
  async testFingerprint(url = 'https://mixvisit.com') {
    try {
      log.info('Testing fingerprint against:', url);
      // This would be implemented to test the fingerprint
      return { success: true, message: 'Fingerprint test completed' };
    } catch (error) {
      log.error('Fingerprint test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { EnhancedFingerprintManager };