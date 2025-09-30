class AntiDetectionManager {
    constructor() {
        this.settings = {
            randomizeUserAgent: true,
            spoofCanvas: true,
            randomizeScreen: true,
            randomizeTimezone: true,
            randomizeHardware: true,
            blockWebRTC: true,
            blockTracking: true,
            spoofWebGL: true
        };

        this.userAgents = {
            windows: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76'
            ],
            macos: [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0'
            ],
            linux: [
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0'
            ]
        };

        this.screenResolutions = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 },
            { width: 1280, height: 720 },
            { width: 2560, height: 1440 }
        ];

        this.timezones = [
            'America/New_York',
            'America/Los_Angeles',
            'Europe/London',
            'Europe/Berlin',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Australia/Sydney',
            'America/Chicago'
        ];

        this.initializeEventListeners();
        this.loadSavedSettings();
        this.applyAntiDetection();
    }

    initializeEventListeners() {
        // Anti-detection modal controls
        document.getElementById('anti-detection-btn').addEventListener('click', () => {
            this.showAntiDetectionModal();
        });

        document.getElementById('anti-detection-close').addEventListener('click', () => {
            this.hideAntiDetectionModal();
        });

        document.getElementById('save-anti-detection-btn').addEventListener('click', () => {
            this.saveAntiDetectionSettings();
        });

        // Close modal when clicking outside
        document.getElementById('anti-detection-modal').addEventListener('click', (e) => {
            if (e.target.id === 'anti-detection-modal') {
                this.hideAntiDetectionModal();
            }
        });
    }

    showAntiDetectionModal() {
        document.getElementById('anti-detection-modal').style.display = 'block';
        this.populateAntiDetectionForm();
    }

    hideAntiDetectionModal() {
        document.getElementById('anti-detection-modal').style.display = 'none';
    }

    populateAntiDetectionForm() {
        document.getElementById('randomize-ua').checked = this.settings.randomizeUserAgent;
        document.getElementById('spoof-canvas').checked = this.settings.spoofCanvas;
        document.getElementById('randomize-screen').checked = this.settings.randomizeScreen;
        document.getElementById('randomize-timezone').checked = this.settings.randomizeTimezone;
        document.getElementById('randomize-hardware').checked = this.settings.randomizeHardware;
        document.getElementById('block-webrtc').checked = this.settings.blockWebRTC;
        document.getElementById('block-tracking').checked = this.settings.blockTracking;
        document.getElementById('spoof-webgl').checked = this.settings.spoofWebGL;
    }

    async saveAntiDetectionSettings() {
        const newSettings = {
            randomizeUserAgent: document.getElementById('randomize-ua').checked,
            spoofCanvas: document.getElementById('spoof-canvas').checked,
            randomizeScreen: document.getElementById('randomize-screen').checked,
            randomizeTimezone: document.getElementById('randomize-timezone').checked,
            randomizeHardware: document.getElementById('randomize-hardware').checked,
            blockWebRTC: document.getElementById('block-webrtc').checked,
            blockTracking: document.getElementById('block-tracking').checked,
            spoofWebGL: document.getElementById('spoof-webgl').checked
        };

        try {
            // Save settings using Electron IPC
            if (window.electronAPI) {
                const result = await window.electronAPI.setAntiDetection(newSettings);
                if (result.success) {
                    this.settings = newSettings;
                    this.showAntiDetectionStatus('success', 'Anti-detection settings saved successfully');
                    this.saveToLocalStorage(newSettings);
                    this.applyAntiDetection();
                    
                    // Hide modal after successful save
                    setTimeout(() => {
                        this.hideAntiDetectionModal();
                    }, 1500);
                } else {
                    this.showAntiDetectionStatus('error', result.error || 'Failed to apply anti-detection settings');
                }
            } else {
                // Fallback for testing without Electron
                this.settings = newSettings;
                this.showAntiDetectionStatus('success', 'Anti-detection settings saved (test mode)');
                this.saveToLocalStorage(newSettings);
                this.applyAntiDetection();
            }
        } catch (error) {
            console.error('Error saving anti-detection settings:', error);
            this.showAntiDetectionStatus('error', 'Failed to save settings: ' + error.message);
        }
    }

    applyAntiDetection() {
        if (this.settings.randomizeUserAgent) {
            this.randomizeUserAgent();
        }

        if (this.settings.spoofCanvas) {
            this.spoofCanvas();
        }

        if (this.settings.randomizeScreen) {
            this.randomizeScreen();
        }

        if (this.settings.randomizeTimezone) {
            this.randomizeTimezone();
        }

        if (this.settings.randomizeHardware) {
            this.randomizeHardware();
        }

        if (this.settings.blockWebRTC) {
            this.blockWebRTC();
        }

        if (this.settings.spoofWebGL) {
            this.spoofWebGL();
        }

        this.updateAntiDetectionStatus();
    }

    randomizeUserAgent() {
        const platform = this.detectPlatform();
        const agents = this.userAgents[platform] || this.userAgents.windows;
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        
        // Apply through Electron if available
        if (window.electronAPI) {
            window.electronAPI.setUserAgent(randomAgent);
        }
        
        console.log('Randomized User Agent:', randomAgent);
    }

    spoofCanvas() {
        // Canvas fingerprinting protection
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

        HTMLCanvasElement.prototype.toDataURL = function(type) {
            const shift = Math.floor(Math.random() * 10) - 5;
            const imageData = this.getContext('2d').getImageData(0, 0, this.width, this.height);
            
            for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + shift));
            }
            
            this.getContext('2d').putImageData(imageData, 0, 0);
            return originalToDataURL.apply(this, arguments);
        };

        CanvasRenderingContext2D.prototype.getImageData = function() {
            const imageData = originalGetImageData.apply(this, arguments);
            const shift = Math.floor(Math.random() * 10) - 5;
            
            for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + shift));
            }
            
            return imageData;
        };

        console.log('Canvas fingerprinting protection enabled');
    }

    randomizeScreen() {
        const resolution = this.screenResolutions[Math.floor(Math.random() * this.screenResolutions.length)];
        
        // Override screen properties
        Object.defineProperty(screen, 'width', { value: resolution.width });
        Object.defineProperty(screen, 'height', { value: resolution.height });
        Object.defineProperty(screen, 'availWidth', { value: resolution.width });
        Object.defineProperty(screen, 'availHeight', { value: resolution.height - 40 });
        
        console.log('Randomized Screen Resolution:', resolution);
    }

    randomizeTimezone() {
        const timezone = this.timezones[Math.floor(Math.random() * this.timezones.length)];
        
        // Override Date methods
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
            // Simplified timezone offset calculation
            const offsets = {
                'America/New_York': 300,
                'America/Los_Angeles': 480,
                'Europe/London': 0,
                'Europe/Berlin': -60,
                'Asia/Tokyo': -540,
                'Asia/Shanghai': -480,
                'Australia/Sydney': -660,
                'America/Chicago': 360
            };
            return offsets[timezone] || 0;
        };
        
        console.log('Randomized Timezone:', timezone);
    }

    randomizeHardware() {
        const cores = [2, 4, 6, 8, 12, 16][Math.floor(Math.random() * 6)];
        const memory = [2, 4, 8, 16, 32][Math.floor(Math.random() * 5)];
        
        // Override navigator properties
        Object.defineProperty(navigator, 'hardwareConcurrency', { value: cores });
        Object.defineProperty(navigator, 'deviceMemory', { value: memory });
        
        console.log('Randomized Hardware:', { cores, memory });
    }

    blockWebRTC() {
        // Disable WebRTC to prevent IP leaks
        const originalRTCPeerConnection = window.RTCPeerConnection;
        const originalGetUserMedia = navigator.getUserMedia;
        
        window.RTCPeerConnection = function() {
            throw new Error('WebRTC is disabled for privacy');
        };
        
        navigator.getUserMedia = function() {
            throw new Error('getUserMedia is disabled for privacy');
        };
        
        // Also block newer APIs
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = function() {
                return Promise.reject(new Error('getUserMedia is disabled for privacy'));
            };
        }
        
        console.log('WebRTC blocked for privacy protection');
    }

    spoofWebGL() {
        // WebGL fingerprinting protection
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            // Spoof common fingerprinting parameters
            if (parameter === this.RENDERER) {
                return 'Intel Iris OpenGL Engine';
            }
            if (parameter === this.VENDOR) {
                return 'Intel Inc.';
            }
            if (parameter === this.VERSION) {
                return 'OpenGL ES 2.0';
            }
            if (parameter === this.SHADING_LANGUAGE_VERSION) {
                return 'OpenGL ES GLSL ES 1.0';
            }
            
            return originalGetParameter.apply(this, arguments);
        };
        
        console.log('WebGL fingerprinting protection enabled');
    }

    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('mac')) {
            return 'macos';
        } else if (userAgent.includes('linux')) {
            return 'linux';
        } else {
            return 'windows';
        }
    }

    updateAntiDetectionStatus() {
        const indicator = document.getElementById('anti-detection-status-indicator');
        const enabledCount = Object.values(this.settings).filter(Boolean).length;
        
        if (enabledCount > 0) {
            indicator.textContent = `Anti-Detection: ${enabledCount}/8 Active`;
            indicator.className = 'status-indicator active';
        } else {
            indicator.textContent = 'Anti-Detection: Disabled';
            indicator.className = 'status-indicator inactive';
        }
    }

    showAntiDetectionStatus(type, message) {
        const statusElement = document.getElementById('anti-detection-status');
        statusElement.className = `status-message ${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    saveToLocalStorage(settings) {
        try {
            localStorage.setItem('beastbrowser_antidetection_settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save anti-detection settings to localStorage:', error);
        }
    }

    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('beastbrowser_antidetection_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load saved anti-detection settings:', error);
        }
    }

    // Public methods
    getSettings() {
        return { ...this.settings };
    }

    isEnabled() {
        return Object.values(this.settings).some(Boolean);
    }

    generateFingerprint() {
        return {
            userAgent: this.settings.randomizeUserAgent ? 'randomized' : navigator.userAgent,
            screen: this.settings.randomizeScreen ? 'randomized' : `${screen.width}x${screen.height}`,
            timezone: this.settings.randomizeTimezone ? 'randomized' : Intl.DateTimeFormat().resolvedOptions().timeZone,
            hardware: this.settings.randomizeHardware ? 'randomized' : navigator.hardwareConcurrency,
            canvas: this.settings.spoofCanvas ? 'spoofed' : 'original',
            webgl: this.settings.spoofWebGL ? 'spoofed' : 'original',
            webrtc: this.settings.blockWebRTC ? 'blocked' : 'enabled'
        };
    }
}

// Initialize anti-detection manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.antiDetectionManager = new AntiDetectionManager();
});