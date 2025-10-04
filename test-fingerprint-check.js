// Fingerprint Test Script for BeastBrowser
// This script will check all fingerprint parameters that mixvisit.com detects

const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const testWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'electron', 'enhanced-webview-preload.js')
    },
    show: true,
    title: 'Fingerprint Test'
  });

  // Set Chrome user agent
  testWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

  // Navigate to mixvisit.com
  testWindow.loadURL('https://mixvisit.com');

  // Wait for page to load and then extract fingerprint data
  testWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      const extractScript = `
        (function() {
          const fingerprint = {
            // Navigator properties
            navigator: {
              userAgent: navigator.userAgent,
              appName: navigator.appName,
              appVersion: navigator.appVersion,
              appCodeName: navigator.appCodeName,
              platform: navigator.platform,
              vendor: navigator.vendor,
              vendorSub: navigator.vendorSub,
              product: navigator.product,
              productSub: navigator.productSub,
              language: navigator.language,
              languages: navigator.languages,
              hardwareConcurrency: navigator.hardwareConcurrency,
              deviceMemory: navigator.deviceMemory,
              maxTouchPoints: navigator.maxTouchPoints,
              doNotTrack: navigator.doNotTrack,
              cookieEnabled: navigator.cookieEnabled,
              onLine: navigator.onLine,
              webdriver: navigator.webdriver,
              pdfViewerEnabled: navigator.pdfViewerEnabled,
              userAgentData: navigator.userAgentData ? {
                brands: navigator.userAgentData.brands,
                mobile: navigator.userAgentData.mobile,
                platform: navigator.userAgentData.platform
              } : null
            },
            
            // Screen properties
            screen: {
              width: screen.width,
              height: screen.height,
              availWidth: screen.availWidth,
              availHeight: screen.availHeight,
              colorDepth: screen.colorDepth,
              pixelDepth: screen.pixelDepth
            },
            
            // Window properties
            window: {
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              outerWidth: window.outerWidth,
              outerHeight: window.outerHeight,
              devicePixelRatio: window.devicePixelRatio
            },
            
            // Timezone
            timezone: {
              timezoneOffset: new Date().getTimezoneOffset(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              locale: Intl.DateTimeFormat().resolvedOptions().locale
            },
            
            // WebGL
            webgl: (function() {
              try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!gl) return null;
                
                return {
                  vendor: gl.getParameter(gl.VENDOR),
                  renderer: gl.getParameter(gl.RENDERER),
                  unmaskedVendor: gl.getExtension('WEBGL_debug_renderer_info') ? 
                    gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_VENDOR_WEBGL) : null,
                  unmaskedRenderer: gl.getExtension('WEBGL_debug_renderer_info') ? 
                    gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL) : null,
                  version: gl.getParameter(gl.VERSION),
                  shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
                };
              } catch (e) {
                return { error: e.message };
              }
            })(),
            
            // Canvas fingerprint
            canvas: (function() {
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillText('BeastBrowser Test 🦁', 2, 2);
                return canvas.toDataURL();
              } catch (e) {
                return { error: e.message };
              }
            })(),
            
            // Plugins
            plugins: Array.from(navigator.plugins).map(plugin => ({
              name: plugin.name,
              filename: plugin.filename,
              description: plugin.description
            })),
            
            // Chrome object
            chrome: window.chrome ? {
              runtime: !!window.chrome.runtime,
              loadTimes: typeof window.chrome.loadTimes === 'function',
              csi: typeof window.chrome.csi === 'function'
            } : null,
            
            // Electron detection
            electronDetection: {
              process: typeof process !== 'undefined',
              global: typeof global !== 'undefined',
              Buffer: typeof Buffer !== 'undefined',
              require: typeof require !== 'undefined',
              module: typeof module !== 'undefined',
              electronAPI: typeof electronAPI !== 'undefined',
              electron: typeof electron !== 'undefined'
            },
            
            // Additional detection methods
            detection: {
              webdriver: navigator.webdriver,
              automationIndicators: [
                'cdc_adoQpoasnfa76pfcZLmcfl_Array',
                'cdc_adoQpoasnfa76pfcZLmcfl_Promise', 
                'cdc_adoQpoasnfa76pfcZLmcfl_Symbol',
                '__webdriver_evaluate',
                '__selenium_evaluate',
                '__webdriver_script_fn'
              ].filter(prop => window[prop] !== undefined),
              
              // Check for common automation frameworks
              phantomJS: window.callPhantom || window._phantom,
              selenium: window.__selenium_evaluate || window.__webdriver_evaluate,
              webdriverIO: window.browser,
              puppeteer: window.navigator.webdriver
            }
          };
          
          return JSON.stringify(fingerprint, null, 2);
        })();
      `;
      
      testWindow.webContents.executeJavaScript(extractScript).then(result => {
        console.log('='.repeat(80));
        console.log('FINGERPRINT ANALYSIS FROM MIXVISIT.COM');
        console.log('='.repeat(80));
        console.log(result);
        console.log('='.repeat(80));
        
        // Also save to file
        const fs = require('fs');
        fs.writeFileSync('fingerprint-analysis.json', result);
        console.log('Fingerprint analysis saved to fingerprint-analysis.json');
        
        // Keep window open for manual inspection
        console.log('Window kept open for manual inspection. Check mixvisit.com results.');
      }).catch(error => {
        console.error('Failed to extract fingerprint:', error);
      });
    }, 5000); // Wait 5 seconds for page to fully load
  });
});

app.on('window-all-closed', () => {
  // Don't quit the app so we can keep inspecting
});