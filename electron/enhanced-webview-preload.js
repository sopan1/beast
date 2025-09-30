const { contextBridge, ipcRenderer } = require('electron');

// Enhanced fingerprint spoofing preload script
contextBridge.exposeInMainWorld('beastBrowserAPI', {
  // Get current fingerprint status
  getFingerprintStatus: () => ipcRenderer.invoke('get-fingerprint-status'),
  
  // Apply enhanced fingerprint spoofing
  applyEnhancedFingerprint: (options) => ipcRenderer.invoke('apply-enhanced-fingerprint', options),
  
  // Get IP geolocation
  getIPGeolocation: (proxyIP) => ipcRenderer.invoke('get-ip-geolocation', proxyIP),
  
  // Test fingerprint
  testFingerprint: (url) => ipcRenderer.invoke('test-fingerprint', url)
});

// Inject enhanced anti-detection script immediately
(function() {
  'use strict';
  
  console.log('🛡️ BeastBrowser Enhanced Anti-Detection Preload Active');
  
  // Basic anti-detection measures that run immediately
  try {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: false,
      enumerable: true
    });
    
    // Remove automation indicators
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
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
    
    // Basic chrome runtime spoofing
    if (!window.chrome) {
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {
            onConnect: undefined,
            onMessage: undefined
          }
        }),
        configurable: true
      });
    }
    
    console.log('✅ Basic anti-detection measures applied');
    
  } catch (error) {
    console.error('❌ Preload anti-detection error:', error);
  }
})();

// Listen for enhanced fingerprint spoofing from main process
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Request enhanced fingerprint spoofing
    const result = await window.beastBrowserAPI.applyEnhancedFingerprint({
      platform: 'windows', // Default, will be overridden by profile
      proxyIP: null
    });
    
    if (result.success) {
      console.log('✅ Enhanced fingerprint spoofing applied via preload');
    } else {
      console.warn('⚠️ Enhanced fingerprint spoofing failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Failed to apply enhanced fingerprint spoofing:', error);
  }
});