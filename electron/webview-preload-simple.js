// Simple webview preload script for BeastBrowser
// This script is injected into every webview to apply basic fingerprint spoofing

(function() {
  'use strict';

  console.log('🦁 BeastBrowser simple anti-detection script loaded');

  // Listen for Ctrl+Shift+I to open dev tools
  document.addEventListener('keydown', function(event) {
    // Ctrl+Shift+I
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      
      // Try to communicate with main process to open dev tools
      if (window.electronAPI && typeof window.electronAPI.openDevTools === 'function') {
        window.electronAPI.openDevTools();
      }
      
      console.log('Inspect element shortcut pressed');
    }
  });

  // Simple user agent spoofing
  if (window.userAgent) {
    Object.defineProperty(navigator, 'userAgent', {
      get: function() {
        return window.userAgent;
      },
      configurable: false
    });
    
    console.log('✅ User agent spoofed:', window.userAgent.substring(0, 50) + '...');
  }

  // Simple platform spoofing
  if (window.platform) {
    Object.defineProperty(navigator, 'platform', {
      get: function() {
        const platforms = {
          windows: 'Win32',
          macos: 'MacIntel',
          linux: 'Linux x86_64',
          android: 'Linux armv7l',
          ios: 'iPhone',
          tv: 'Linux armv7l'
        };
        return platforms[window.platform] || 'Win32';
      },
      configurable: false
    });
  }

  // Block WebRTC to prevent IP leaks
  if (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection) {
    const noop = function() {};
    window.RTCPeerConnection = noop;
    window.webkitRTCPeerConnection = noop;
    window.mozRTCPeerConnection = noop;
  }

  // Simple canvas fingerprint protection
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    // Add subtle noise to prevent exact fingerprinting
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 20) { // Every 20th pixel
        imageData.data[i] += Math.floor(Math.random() * 3) - 1;     // Red
        imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1; // Green  
        imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1; // Blue
      }
      context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, arguments);
  };

  // Simple WebGL spoofing
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    // Spoof common WebGL parameters
    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
      return 'Intel Inc.';
    }
    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
      return 'Intel Iris OpenGL Engine';
    }
    return getParameter.apply(this, arguments);
  };

  console.log('🛡️ Simple anti-detection measures applied');
})();