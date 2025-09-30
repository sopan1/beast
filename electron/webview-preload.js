// Enhanced anti-detection webview preload script
// This script is injected into every webview to prevent fingerprinting

(function() {
  'use strict';

  console.log('BeastBrowser anti-detection script loaded');

  // Block WebRTC completely to prevent IP leaks
  if (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection) {
    const noop = function() {};
    const noopPromise = function() { return Promise.resolve(); };
    
    // Override RTCPeerConnection constructors
    window.RTCPeerConnection = noop;
    window.webkitRTCPeerConnection = noop;
    window.mozRTCPeerConnection = noop;
    
    // Override getUserMedia to prevent media access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia = function() {
        return Promise.reject(new Error('Permission denied'));
      };
    }
    
    if (navigator.getUserMedia) {
      navigator.getUserMedia = function(constraints, success, error) {
        if (error) error(new Error('Permission denied'));
      };
    }
  }

  // Canvas fingerprint protection
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
  HTMLCanvasElement.prototype.toDataURL = function() {
    // Add noise to canvas fingerprint
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        // Add subtle random noise
        imageData.data[i] += Math.floor(Math.random() * 3) - 1;     // Red
        imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1; // Green  
        imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1; // Blue
      }
      context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, arguments);
  };

  CanvasRenderingContext2D.prototype.getImageData = function() {
    const imageData = originalGetImageData.apply(this, arguments);
    // Add noise to prevent fingerprinting
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] += Math.floor(Math.random() * 3) - 1;
      imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
      imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
    }
    return imageData;
  };

  // WebGL fingerprint protection
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    // Spoof common WebGL parameters
    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
      return 'Intel Inc.';
    }
    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
      return 'Intel Iris OpenGL Engine';
    }
    if (parameter === 7936) { // VERSION
      return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
    }
    if (parameter === 7937) { // SHADING_LANGUAGE_VERSION
      return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)';
    }
    return getParameter.apply(this, arguments);
  };

  // Audio context fingerprint protection
  if (window.AudioContext || window.webkitAudioContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    
    const originalCreateAnalyser = AudioContextConstructor.prototype.createAnalyser;
    AudioContextConstructor.prototype.createAnalyser = function() {
      const analyser = originalCreateAnalyser.apply(this, arguments);
      
      const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
      analyser.getFloatFrequencyData = function(array) {
        originalGetFloatFrequencyData.apply(this, arguments);
        // Add noise to audio fingerprint
        for (let i = 0; i < array.length; i++) {
          array[i] += (Math.random() - 0.5) * 0.0001;
        }
      };
      
      const originalGetByteFrequencyData = analyser.getByteFrequencyData;
      analyser.getByteFrequencyData = function(array) {
        originalGetByteFrequencyData.apply(this, arguments);
        // Add noise to audio fingerprint
        for (let i = 0; i < array.length; i++) {
          array[i] += Math.floor((Math.random() - 0.5) * 2);
        }
      };
      
      return analyser;
    };

    const originalCreateOscillator = AudioContextConstructor.prototype.createOscillator;
    AudioContextConstructor.prototype.createOscillator = function() {
      const oscillator = originalCreateOscillator.apply(this, arguments);
      
      // Slightly randomize frequency to prevent fingerprinting
      const originalFrequency = oscillator.frequency.value;
      oscillator.frequency.value = originalFrequency + (Math.random() - 0.5) * 0.001;
      
      return oscillator;
    };
  }

  // Font detection protection
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    get: function() {
      const width = originalOffsetWidth.get.call(this);
      // Add slight randomization to prevent font fingerprinting
      return width + (Math.random() > 0.5 ? 0 : Math.floor(Math.random() * 2));
    }
  });
  
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    get: function() {
      const height = originalOffsetHeight.get.call(this);
      // Add slight randomization to prevent font fingerprinting
      return height + (Math.random() > 0.5 ? 0 : Math.floor(Math.random() * 2));
    }
  });

  // Hardware fingerprint protection
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: function() {
      // Randomize CPU core count
      return Math.floor(Math.random() * 8) + 4;
    },
    configurable: true
  });

  Object.defineProperty(navigator, 'deviceMemory', {
    get: function() {
      // Randomize device memory
      const memoryValues = [2, 4, 8, 16];
      return memoryValues[Math.floor(Math.random() * memoryValues.length)];
    },
    configurable: true
  });

  // Screen fingerprint protection
  const originalScreen = window.screen;
  Object.defineProperty(window, 'screen', {
    get: function() {
      return new Proxy(originalScreen, {
        get: function(target, prop) {
          if (prop === 'width' || prop === 'availWidth') {
            return target[prop] + Math.floor((Math.random() - 0.5) * 20);
          }
          if (prop === 'height' || prop === 'availHeight') {
            return target[prop] + Math.floor((Math.random() - 0.5) * 20);
          }
          if (prop === 'colorDepth') {
            return 24; // Standard color depth
          }
          if (prop === 'pixelDepth') {
            return 24; // Standard pixel depth
          }
          return target[prop];
        }
      });
    },
    configurable: true
  });

  // Timezone spoofing (will be set by profile configuration)
  const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function() {
    // This will be overridden by profile-specific timezone
    return originalGetTimezoneOffset.call(this);
  };

  // Plugin enumeration protection
  Object.defineProperty(navigator, 'plugins', {
    get: function() {
      // Return empty plugin list to prevent fingerprinting
      return {
        length: 0,
        item: function() { return null; },
        namedItem: function() { return null; },
        refresh: function() {}
      };
    },
    configurable: true
  });

  // MIME type protection
  Object.defineProperty(navigator, 'mimeTypes', {
    get: function() {
      // Return empty MIME types list
      return {
        length: 0,
        item: function() { return null; },
        namedItem: function() { return null; }
      };
    },
    configurable: true
  });

  // Battery API blocking
  if (navigator.getBattery) {
    navigator.getBattery = function() {
      return Promise.reject(new Error('Battery API not available'));
    };
  }

  // Gamepad API blocking
  if (navigator.getGamepads) {
    navigator.getGamepads = function() {
      return [];
    };
  }

  // Sensor APIs blocking
  ['DeviceOrientationEvent', 'DeviceMotionEvent'].forEach(eventType => {
    if (window[eventType]) {
      window[eventType] = undefined;
    }
  });

  // Notification permission spoofing
  if (window.Notification) {
    Object.defineProperty(Notification, 'permission', {
      get: function() {
        return 'default';
      }
    });
  }

  // Geolocation spoofing
  if (navigator.geolocation) {
    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = function(success, error) {
      if (error) {
        error({ code: 1, message: 'Permission denied' });
      }
    };
    
    const originalWatchPosition = navigator.geolocation.watchPosition;
    navigator.geolocation.watchPosition = function(success, error) {
      if (error) {
        error({ code: 1, message: 'Permission denied' });
      }
      return 0;
    };
  }

  // Performance timing randomization
  if (window.performance && window.performance.timing) {
    const originalTiming = window.performance.timing;
    Object.defineProperty(window.performance, 'timing', {
      get: function() {
        return new Proxy(originalTiming, {
          get: function(target, prop) {
            const value = target[prop];
            if (typeof value === 'number' && value > 0) {
              // Add small random variation to timing values
              return value + Math.floor((Math.random() - 0.5) * 10);
            }
            return value;
          }
        });
      }
    });
  }

  // Console warning for debugging
  console.log('🛡️ BeastBrowser anti-detection active:', {
    webrtc: 'blocked',
    canvas: 'protected',
    webgl: 'spoofed',
    audio: 'protected',
    fonts: 'protected',
    hardware: 'spoofed',
    screen: 'randomized',
    plugins: 'hidden',
    sensors: 'blocked'
  });

})();