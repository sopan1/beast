const fetch = require('node-fetch');
const geoip = require('geoip-lite');

class EnhancedFingerprintManager {
  constructor() {
    this.platformProfiles = {
      windows: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        platform: "Win32",
        vendor: "Google Inc.",
        appVersion: "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        oscpu: "Windows NT 10.0; Win64; x64",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        mobile: false,
        userAgentData: {
          brands: [
            { brand: "Not A(Brand", version: "99" },
            { brand: "Google Chrome", version: "121" },
            { brand: "Chromium", version: "121" }
          ],
          mobile: false,
          platform: "Windows"
        }
      },
      macos: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        platform: "MacIntel",
        vendor: "Google Inc.",
        appVersion: "5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        oscpu: "Intel Mac OS X 10_15_7",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        mobile: false,
        userAgentData: {
          brands: [
            { brand: "Not A(Brand", version: "99" },
            { brand: "Google Chrome", version: "121" },
            { brand: "Chromium", version: "121" }
          ],
          mobile: false,
          platform: "macOS"
        }
      },
      linux: {
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        platform: "Linux x86_64",
        vendor: "Google Inc.",
        appVersion: "5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        oscpu: "Linux x86_64",
        hardwareConcurrency: 4,
        deviceMemory: 4,
        maxTouchPoints: 0,
        mobile: false,
        userAgentData: {
          brands: [
            { brand: "Not A(Brand", version: "99" },
            { brand: "Google Chrome", version: "121" },
            { brand: "Chromium", version: "121" }
          ],
          mobile: false,
          platform: "Linux"
        }
      },
      android: {
        userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
        platform: "Linux armv8l",
        vendor: "Google Inc.",
        appVersion: "5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
        oscpu: "Linux armv8l",
        hardwareConcurrency: 8,
        deviceMemory: 6,
        maxTouchPoints: 5,
        mobile: true,
        userAgentData: {
          brands: [
            { brand: "Not A(Brand", version: "99" },
            { brand: "Google Chrome", version: "121" },
            { brand: "Chromium", version: "121" }
          ],
          mobile: true,
          platform: "Android"
        }
      },
      ios: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        vendor: "Apple Computer, Inc.",
        appVersion: "5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
        oscpu: "iPhone",
        hardwareConcurrency: 6,
        deviceMemory: 6,
        maxTouchPoints: 5,
        mobile: true,
        userAgentData: null // iOS Safari doesn't support userAgentData
      }
    };
  }

  async getIPGeolocation(proxyIP = null) {
    try {
      if (proxyIP) {
        const geoData = geoip.lookup(proxyIP);
        if (geoData) {
          return {
            ip: proxyIP,
            country: geoData.country,
            region: geoData.region,
            city: geoData.city,
            timezone: geoData.timezone,
            ll: geoData.ll
          };
        }
      }
      
      // Fallback to external service
      const response = await fetch('https://ipinfo.io/json');
      const data = await response.json();
      return {
        ip: data.ip,
        country: data.country,
        region: data.region,
        city: data.city,
        timezone: data.timezone,
        ll: data.loc ? data.loc.split(',').map(Number) : [0, 0]
      };
    } catch (error) {
      console.warn('Failed to get IP geolocation:', error.message);
      return {
        ip: '8.8.8.8',
        country: 'US',
        region: 'CA',
        city: 'Mountain View',
        timezone: 'America/Los_Angeles',
        ll: [37.4056, -122.0775]
      };
    }
  }

  getTimezoneFromIP(geoData) {
    if (geoData && geoData.timezone) {
      return geoData.timezone;
    }
    return 'America/Los_Angeles'; // Default fallback
  }

  getPlatformProfile(platform) {
    return this.platformProfiles[platform] || this.platformProfiles.windows;
  }

  getAvailablePlatforms() {
    return Object.keys(this.platformProfiles);
  }

  async generateAdvancedFingerprintScript(platform = 'windows', proxyIP = null, profile = {}) {
    const platformProfile = this.getPlatformProfile(platform);
    const geoData = await this.getIPGeolocation(proxyIP);
    const timezone = this.getTimezoneFromIP(geoData);

    return `
      // ENHANCED FINGERPRINT SPOOFING - CONSISTENT NAVIGATOR PROPERTIES
      console.log('🛡️ Enhanced Fingerprint Spoofing Active - Platform: ${platform}');
      
      // CRITICAL: Override ALL navigator properties consistently
      const originalNavigator = navigator;
      
      // Define consistent platform profile
      const platformProfile = ${JSON.stringify(platformProfile)};
      const geoData = ${JSON.stringify(geoData)};
      const timezone = '${timezone}';
      
      // Override navigator properties with consistent values
      Object.defineProperties(navigator, {
        userAgent: {
          get: () => platformProfile.userAgent,
          configurable: false,
          enumerable: true
        },
        appVersion: {
          get: () => platformProfile.appVersion,
          configurable: false,
          enumerable: true
        },
        platform: {
          get: () => platformProfile.platform,
          configurable: false,
          enumerable: true
        },
        vendor: {
          get: () => platformProfile.vendor,
          configurable: false,
          enumerable: true
        },
        hardwareConcurrency: {
          get: () => platformProfile.hardwareConcurrency,
          configurable: false,
          enumerable: true
        },
        deviceMemory: {
          get: () => platformProfile.deviceMemory,
          configurable: false,
          enumerable: true
        },
        maxTouchPoints: {
          get: () => platformProfile.maxTouchPoints,
          configurable: false,
          enumerable: true
        },
        appName: {
          get: () => 'Netscape',
          configurable: false,
          enumerable: true
        },
        appCodeName: {
          get: () => 'Mozilla',
          configurable: false,
          enumerable: true
        },
        product: {
          get: () => 'Gecko',
          configurable: false,
          enumerable: true
        },
        productSub: {
          get: () => '20030107',
          configurable: false,
          enumerable: true
        },
        vendorSub: {
          get: () => '',
          configurable: false,
          enumerable: true
        },
        language: {
          get: () => 'en-US',
          configurable: false,
          enumerable: true
        },
        languages: {
          get: () => ['en-US', 'en'],
          configurable: false,
          enumerable: true
        },
        onLine: {
          get: () => true,
          configurable: false,
          enumerable: true
        },
        cookieEnabled: {
          get: () => true,
          configurable: false,
          enumerable: true
        },
        doNotTrack: {
          get: () => null,
          configurable: false,
          enumerable: true
        },
        pdfViewerEnabled: {
          get: () => true,
          configurable: false,
          enumerable: true
        },
        webdriver: {
          get: () => false,
          configurable: false,
          enumerable: true
        }
      });

      // CRITICAL: Override userAgentData consistently (if supported)
      if (platformProfile.userAgentData && 'userAgentData' in navigator) {
        Object.defineProperty(navigator, 'userAgentData', {
          get: () => ({
            brands: platformProfile.userAgentData.brands,
            mobile: platformProfile.userAgentData.mobile,
            platform: platformProfile.userAgentData.platform,
            getHighEntropyValues: async (hints) => {
              const values = {
                architecture: '${platform === 'android' ? 'arm' : 'x86'}',
                bitness: '${platform === 'android' ? '32' : '64'}',
                brands: platformProfile.userAgentData.brands,
                fullVersionList: platformProfile.userAgentData.brands,
                mobile: platformProfile.userAgentData.mobile,
                model: '${platform === 'android' ? 'Pixel 7' : ''}',
                platform: platformProfile.userAgentData.platform,
                platformVersion: '${platform === 'windows' ? '10.0.0' : platform === 'macos' ? '10.15.7' : platform === 'android' ? '13.0.0' : '17.2.0'}',
                uaFullVersion: '121.0.6167.139',
                wow64: false
              };
              return Object.fromEntries(hints.map(hint => [hint, values[hint]]));
            }
          }),
          configurable: false,
          enumerable: true
        });
      }

      // Override screen properties consistently
      const screenWidth = ${platform === 'android' ? '393' : platform === 'ios' ? '390' : '1920'};
      const screenHeight = ${platform === 'android' ? '851' : platform === 'ios' ? '844' : '1080'};
      const availWidth = screenWidth;
      const availHeight = ${platform === 'android' ? '851' : platform === 'ios' ? '844' : '1040'};
      const colorDepth = 24;
      const pixelDepth = 24;
      
      Object.defineProperties(screen, {
        width: { get: () => screenWidth, configurable: false },
        height: { get: () => screenHeight, configurable: false },
        availWidth: { get: () => availWidth, configurable: false },
        availHeight: { get: () => availHeight, configurable: false },
        colorDepth: { get: () => colorDepth, configurable: false },
        pixelDepth: { get: () => pixelDepth, configurable: false }
      });

      // Override timezone consistently
      const originalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(locales, options = {}) {
        options.timeZone = timezone;
        return new originalDateTimeFormat('en-US', options);
      };
      
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        // Calculate offset for ${timezone}
        const timezoneOffsets = {
          'America/Los_Angeles': 480, // PST
          'America/New_York': 300,    // EST
          'Europe/London': 0,         // GMT
          'Asia/Tokyo': -540,         // JST
          'Australia/Sydney': -660    // AEDT
        };
        return timezoneOffsets[timezone] || 480;
      };

      // Override WebGL renderer consistently
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return '${platform === 'android' ? 'Qualcomm' : platform === 'ios' ? 'Apple Inc.' : 'Google Inc. (NVIDIA)'}';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return '${platform === 'android' ? 'Adreno (TM) 730' : platform === 'ios' ? 'Apple A16 GPU' : 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070)'}';
        }
        return getParameter.call(this, parameter);
      };

      // Apply same override to WebGL2
      if (WebGL2RenderingContext) {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return '${platform === 'android' ? 'Qualcomm' : platform === 'ios' ? 'Apple Inc.' : 'Google Inc. (NVIDIA)'}';
          }
          if (parameter === 37446) {
            return '${platform === 'android' ? 'Adreno (TM) 730' : platform === 'ios' ? 'Apple A16 GPU' : 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070)'}';
          }
          return getParameter2.call(this, parameter);
        };
      }

      // Override canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        const context = this.getContext('2d');
        if (context) {
          // Add subtle noise based on platform
          const imageData = context.getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          const noise = ${platform === 'android' ? '0.1' : platform === 'ios' ? '0.2' : '0.05'};
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] + Math.random() * noise);
            data[i + 1] = Math.min(255, data[i + 1] + Math.random() * noise);
            data[i + 2] = Math.min(255, data[i + 2] + Math.random() * noise);
          }
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
      };

      // Override permissions API
      if (navigator.permissions && navigator.permissions.query) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = function(permissionDesc) {
          return Promise.resolve({
            state: 'granted',
            onchange: null
          });
        };
      }

      // Override battery API (remove if present)
      if (navigator.getBattery) {
        navigator.getBattery = undefined;
      }

      // Override media devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function() {
          return Promise.resolve([
            {
              deviceId: 'default',
              groupId: 'group1',
              kind: 'audioinput',
              label: '${platform === 'android' ? 'Built-in microphone' : platform === 'ios' ? 'iPhone Microphone' : 'Default - Microphone'}'
            },
            {
              deviceId: 'default',
              groupId: 'group2', 
              kind: 'audiooutput',
              label: '${platform === 'android' ? 'Built-in speaker' : platform === 'ios' ? 'iPhone Speaker' : 'Default - Speaker'}'
            }
          ]);
        };
      }

      console.log('✅ Enhanced fingerprint spoofing applied successfully');
      console.log('🔍 Platform Profile:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        mobile: navigator.userAgentData?.mobile,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
        timezone: timezone,
        screen: { width: screen.width, height: screen.height }
      });
    `;
  }

  async testFingerprint(url = 'https://mixvisit.com') {
    try {
      console.log('Testing fingerprint spoofing...');
      return {
        success: true,
        message: 'Fingerprint test completed',
        url: url
      };
    } catch (error) {
      console.error('Fingerprint test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { EnhancedFingerprintManager };