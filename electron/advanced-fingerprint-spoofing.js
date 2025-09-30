const log = require('electron-log');

/**
 * Advanced Fingerprint Spoofing for BeastBrowser
 * Comprehensive anti-detection with platform-specific fingerprints
 */
class AdvancedFingerprintSpoofing {
  constructor() {
    this.platformFingerprints = {
      android: {
        userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        platform: "Linux armv7l",
        vendor: "Google Inc.",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 5,
        languages: ["en-US", "en"],
        webgl: { vendor: "Qualcomm", renderer: "Adreno (TM) 640" }
      },
      ios: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        vendor: "Apple Computer, Inc.",
        hardwareConcurrency: 6,
        deviceMemory: 6,
        maxTouchPoints: 5,
        languages: ["en-US", "en"],
        webgl: { vendor: "Apple Inc.", renderer: "Apple A15 GPU" }
      },
      windows: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "Win32",
        vendor: "Google Inc.",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        languages: ["en-US", "en"],
        webgl: { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon (TM) Graphics Direct3D11 vs_5_0 ps_5_0)" }
      },
      macos: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "MacIntel",
        vendor: "Google Inc.",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        languages: ["en-US", "en"],
        webgl: { vendor: "Intel Inc.", renderer: "Intel Iris Pro OpenGL Engine" }
      },
      linux: {
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "Linux x86_64",
        vendor: "Google Inc.",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        languages: ["en-US", "en"],
        webgl: { vendor: "NVIDIA Corporation", renderer: "GeForce GTX 1060/PCIe/SSE2" }
      },
      tv: {
        userAgent: "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.93 TV Safari/537.36",
        platform: "Linux armv7l",
        vendor: "Google Inc.",
        hardwareConcurrency: 4,
        deviceMemory: 4,
        maxTouchPoints: 0,
        languages: ["en-US", "en"],
        webgl: { vendor: "ARM", renderer: "Mali-G52 MC1" }
      }
    };
  }

  /**
   * Generate comprehensive fingerprint spoofing script
   */
  generateFingerprintScript(platform = 'windows', geoData = {}, realUserAgent = null) {
    const fingerprint = this.platformFingerprints[platform] || this.platformFingerprints.windows;
    
    // Use real user agent if provided
    if (realUserAgent) {
      fingerprint.userAgent = realUserAgent;
    }

    return `
      (function() {
        'use strict';
        
        try {
          console.log('🛡️ BeastBrowser Advanced Fingerprint Spoofing for ${platform}');
          
          const fingerprint = ${JSON.stringify(fingerprint)};
          
          // 1. Override Navigator Properties (SAFE METHOD)
          try {
            Object.defineProperty(navigator, 'userAgent', {
              get: function() { return fingerprint.userAgent; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('UserAgent override failed:', e.message); }
          
          try {
            Object.defineProperty(navigator, 'platform', {
              get: function() { return fingerprint.platform; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('Platform override failed:', e.message); }
          
          try {
            Object.defineProperty(navigator, 'vendor', {
              get: function() { return fingerprint.vendor; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('Vendor override failed:', e.message); }
          
          try {
            Object.defineProperty(navigator, 'hardwareConcurrency', {
              get: function() { return fingerprint.hardwareConcurrency; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('HardwareConcurrency override failed:', e.message); }
          
          try {
            Object.defineProperty(navigator, 'deviceMemory', {
              get: function() { return fingerprint.deviceMemory; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('DeviceMemory override failed:', e.message); }
          
          try {
            Object.defineProperty(navigator, 'maxTouchPoints', {
              get: function() { return fingerprint.maxTouchPoints; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('MaxTouchPoints override failed:', e.message); }
          
          try {
            Object.defineProperty(navigator, 'languages', {
              get: function() { return fingerprint.languages; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('Languages override failed:', e.message); }
          
          try {
            Object.defineProperty(navigator, 'language', {
              get: function() { return fingerprint.languages[0]; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('Language override failed:', e.message); }
          
          // 2. Remove WebDriver Detection
          try {
            Object.defineProperty(navigator, 'webdriver', {
              get: function() { return undefined; },
              configurable: false,
              enumerable: true
            });
          } catch(e) { console.warn('WebDriver removal failed:', e.message); }
          
          // 3. Override WebGL Fingerprint
          try {
            if (window.WebGLRenderingContext) {
              const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
              WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return fingerprint.webgl.vendor;
                if (parameter === 37446) return fingerprint.webgl.renderer;
                if (parameter === 7936) return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
                if (parameter === 7937) return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)';
                return originalGetParameter.apply(this, arguments);
              };
            }
            
            if (window.WebGL2RenderingContext) {
              const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
              WebGL2RenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return fingerprint.webgl.vendor;
                if (parameter === 37446) return fingerprint.webgl.renderer;
                if (parameter === 7936) return 'WebGL 2.0 (OpenGL ES 3.0 Chromium)';
                if (parameter === 7937) return 'WebGL GLSL ES 3.0 (OpenGL ES GLSL ES 3.0 Chromium)';
                return originalGetParameter2.apply(this, arguments);
              };
            }
          } catch(e) { console.warn('WebGL override failed:', e.message); }
          
          // 4. Canvas Fingerprint Protection
          try {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
              const context = this.getContext('2d');
              if (context) {
                const imageData = context.getImageData(0, 0, this.width, this.height);
                const platformSeed = '${platform}'.split('').reduce((a, b) => {
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
              }
              return originalToDataURL.apply(this, arguments);
            };
          } catch(e) { console.warn('Canvas protection failed:', e.message); }
          
          // 5. Block WebRTC
          try {
            if (window.RTCPeerConnection) {
              window.RTCPeerConnection = function() {
                throw new Error('WebRTC disabled for privacy');
              };
            }
            if (window.webkitRTCPeerConnection) {
              window.webkitRTCPeerConnection = function() {
                throw new Error('WebRTC disabled for privacy');
              };
            }
            if (window.mozRTCPeerConnection) {
              window.mozRTCPeerConnection = function() {
                throw new Error('WebRTC disabled for privacy');
              };
            }
          } catch(e) { console.warn('WebRTC blocking failed:', e.message); }
          
          // 6. Remove Chrome Runtime
          try {
            if (window.chrome && window.chrome.runtime) {
              delete window.chrome.runtime;
            }
          } catch(e) { console.warn('Chrome runtime removal failed:', e.message); }
          
          // 7. Remove Automation Indicators
          try {
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
          } catch(e) { console.warn('Automation indicator removal failed:', e.message); }
          
          console.log('✅ Advanced fingerprint spoofing applied successfully');
          
        } catch (error) {
          console.error('❌ Fingerprint spoofing error:', error.message);
        }
      })();
    `;
  }
}

module.exports = { AdvancedFingerprintSpoofing };