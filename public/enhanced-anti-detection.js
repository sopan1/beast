class EnhancedAntiDetectionManager {
    constructor() {
        this.settings = {
            randomizeUserAgent: true,
            spoofCanvas: true,
            randomizeScreen: true,
            randomizeTimezone: true,
            randomizeHardware: true,
            blockWebRTC: true,
            blockTracking: true,
            spoofWebGL: true,
            // Enhanced Google-specific anti-detection
            spoofMouseMovements: true,
            randomizeTypingPatterns: true,
            spoofBrowserFeatures: true,
            hideAutomationFlags: true,
            randomizeRequestHeaders: true,
            spoofPlugins: true,
            randomizeFonts: true,
            spoofLanguages: true
        };

        // More comprehensive user agents with recent versions
        this.userAgents = {
            windows: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
                'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            ],
            macos: [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
            ],
            linux: [
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
            ]
        };

        // More realistic screen resolutions
        this.screenResolutions = [
            { width: 1920, height: 1080, ratio: 1 },
            { width: 1366, height: 768, ratio: 1 },
            { width: 1440, height: 900, ratio: 1 },
            { width: 1536, height: 864, ratio: 1.25 },
            { width: 2560, height: 1440, ratio: 1 },
            { width: 1680, height: 1050, ratio: 1 },
            { width: 1280, height: 720, ratio: 1 },
            { width: 3840, height: 2160, ratio: 1.5 }
        ];

        // Common browser plugins to spoof
        this.commonPlugins = [
            'Chrome PDF Plugin',
            'Chrome PDF Viewer',
            'Native Client',
            'Widevine Content Decryption Module'
        ];

        // Common fonts to spoof
        this.commonFonts = [
            'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
            'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
            'Trebuchet MS', 'Arial Black', 'Impact', 'Segoe UI', 'Tahoma'
        ];

        // Language preferences
        this.languages = [
            ['en-US', 'en'],
            ['en-GB', 'en'],
            ['fr-FR', 'fr'],
            ['de-DE', 'de'],
            ['es-ES', 'es'],
            ['it-IT', 'it'],
            ['pt-BR', 'pt'],
            ['ru-RU', 'ru'],
            ['ja-JP', 'ja'],
            ['ko-KR', 'ko']
        ];

        this.initializeEventListeners();
        this.loadSavedSettings();
        this.applyEnhancedAntiDetection();
    }

    initializeEventListeners() {
        // Enhanced anti-detection modal controls
        const antiDetectionBtn = document.getElementById('anti-detection-btn');
        if (antiDetectionBtn) {
            antiDetectionBtn.addEventListener('click', () => {
                this.showAntiDetectionModal();
            });
        }

        const closeBtn = document.getElementById('anti-detection-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideAntiDetectionModal();
            });
        }

        const saveBtn = document.getElementById('save-anti-detection-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveAntiDetectionSettings();
            });
        }

        // Close modal when clicking outside
        const modal = document.getElementById('anti-detection-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'anti-detection-modal') {
                    this.hideAntiDetectionModal();
                }
            });
        }
    }

    applyEnhancedAntiDetection() {
        console.log('🛡️ Applying Enhanced Anti-Detection for Google CAPTCHA Prevention...');

        // Apply all original protections
        if (this.settings.randomizeUserAgent) this.randomizeUserAgent();
        if (this.settings.spoofCanvas) this.spoofCanvas();
        if (this.settings.randomizeScreen) this.randomizeScreen();
        if (this.settings.randomizeTimezone) this.randomizeTimezone();
        if (this.settings.randomizeHardware) this.randomizeHardware();
        if (this.settings.blockWebRTC) this.blockWebRTC();
        if (this.settings.spoofWebGL) this.spoofWebGL();

        // Apply enhanced Google-specific protections
        if (this.settings.hideAutomationFlags) this.hideAutomationFlags();
        if (this.settings.spoofBrowserFeatures) this.spoofBrowserFeatures();
        if (this.settings.spoofPlugins) this.spoofPlugins();
        if (this.settings.randomizeFonts) this.randomizeFonts();
        if (this.settings.spoofLanguages) this.spoofLanguages();
        if (this.settings.spoofMouseMovements) this.initMouseMovementSpoof();
        if (this.settings.randomizeTypingPatterns) this.initTypingPatternSpoof();
        if (this.settings.randomizeRequestHeaders) this.spoofRequestHeaders();

        // Additional Google-specific protections
        this.hideWebDriverProperties();
        this.spoofPermissions();
        this.spoofBatteryAPI();
        this.spoofConnectionAPI();
        this.preventHeadlessDetection();
        this.spoofChromeRuntime();

        this.updateAntiDetectionStatus();
        console.log('✅ Enhanced Anti-Detection Applied Successfully');
    }

    hideAutomationFlags() {
        // Hide webdriver property
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true
        });

        // Hide automation flags in window.chrome
        if (window.chrome) {
            Object.defineProperty(window.chrome, 'runtime', {
                get: () => ({
                    onConnect: undefined,
                    onMessage: undefined
                }),
                configurable: true
            });
        }

        // Remove automation-related properties
        delete window.__webdriver_script_fn;
        delete window.__webdriver_evaluate;
        delete window.__selenium_evaluate;
        delete window.__webdriver_unwrapped;
        delete window.__driver_evaluate;
        delete window.__webdriver_script_func;

        console.log('🔒 Automation flags hidden');
    }

    spoofBrowserFeatures() {
        // Spoof notification permission
        Object.defineProperty(Notification, 'permission', {
            get: () => 'default',
            configurable: true
        });

        // Spoof battery API
        if (navigator.getBattery) {
            navigator.getBattery = () => Promise.resolve({
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 0.8 + Math.random() * 0.2
            });
        }

        // Spoof connection API
        Object.defineProperty(navigator, 'connection', {
            get: () => ({
                effectiveType: '4g',
                downlink: 10,
                rtt: 100,
                saveData: false
            }),
            configurable: true
        });

        console.log('🔧 Browser features spoofed');
    }

    spoofPlugins() {
        const plugins = this.commonPlugins.map((name, index) => ({
            name,
            filename: `${name.toLowerCase().replace(/\s+/g, '')}.dll`,
            description: name,
            length: 0,
            item: () => null,
            namedItem: () => null
        }));

        Object.defineProperty(navigator, 'plugins', {
            get: () => plugins,
            configurable: true
        });

        console.log('🔌 Browser plugins spoofed');
    }

    randomizeFonts() {
        // Randomize available fonts
        const availableFonts = this.commonFonts
            .sort(() => Math.random() - 0.5)
            .slice(0, 8 + Math.floor(Math.random() * 7));

        // Override font detection methods
        const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
        const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            get: function() {
                if (this.style && this.style.fontFamily) {
                    return originalOffsetWidth.get.call(this) + Math.floor(Math.random() * 3) - 1;
                }
                return originalOffsetWidth.get.call(this);
            },
            configurable: true
        });

        console.log('🔤 Font fingerprinting randomized');
    }

    spoofLanguages() {
        const selectedLang = this.languages[Math.floor(Math.random() * this.languages.length)];
        
        Object.defineProperty(navigator, 'language', {
            get: () => selectedLang[0],
            configurable: true
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => selectedLang,
            configurable: true
        });

        console.log('🌍 Language preferences spoofed:', selectedLang);
    }

    initMouseMovementSpoof() {
        let mouseX = 0, mouseY = 0;
        let isMoving = false;

        // Add natural mouse movement simulation
        const simulateMouseMovement = () => {
            if (!isMoving && Math.random() < 0.1) {
                isMoving = true;
                const targetX = Math.random() * window.innerWidth;
                const targetY = Math.random() * window.innerHeight;
                
                const steps = 10 + Math.floor(Math.random() * 20);
                const stepX = (targetX - mouseX) / steps;
                const stepY = (targetY - mouseY) / steps;

                let step = 0;
                const moveInterval = setInterval(() => {
                    mouseX += stepX + (Math.random() - 0.5) * 2;
                    mouseY += stepY + (Math.random() - 0.5) * 2;
                    
                    // Dispatch synthetic mouse move event
                    const event = new MouseEvent('mousemove', {
                        clientX: mouseX,
                        clientY: mouseY,
                        bubbles: true
                    });
                    document.dispatchEvent(event);

                    step++;
                    if (step >= steps) {
                        clearInterval(moveInterval);
                        isMoving = false;
                    }
                }, 50 + Math.random() * 50);
            }
        };

        // Simulate mouse movements periodically
        setInterval(simulateMouseMovement, 2000 + Math.random() * 3000);
        console.log('🖱️ Natural mouse movement simulation enabled');
    }

    initTypingPatternSpoof() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'keydown' || type === 'keyup' || type === 'keypress') {
                const wrappedListener = function(event) {
                    // Add random delays to typing patterns
                    if (Math.random() < 0.3) {
                        setTimeout(() => listener.call(this, event), Math.random() * 50);
                    } else {
                        listener.call(this, event);
                    }
                };
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        console.log('⌨️ Typing pattern randomization enabled');
    }

    spoofRequestHeaders() {
        // Override fetch to add randomized headers
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            const headers = new Headers(options.headers);
            
            // Add common browser headers with slight variations
            if (!headers.has('Accept')) {
                headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
            }
            if (!headers.has('Accept-Language')) {
                headers.set('Accept-Language', 'en-US,en;q=0.9');
            }
            if (!headers.has('Accept-Encoding')) {
                headers.set('Accept-Encoding', 'gzip, deflate, br');
            }
            if (!headers.has('DNT')) {
                headers.set('DNT', Math.random() < 0.5 ? '1' : '0');
            }
            if (!headers.has('Sec-Fetch-Dest')) {
                headers.set('Sec-Fetch-Dest', 'document');
            }
            if (!headers.has('Sec-Fetch-Mode')) {
                headers.set('Sec-Fetch-Mode', 'navigate');
            }
            if (!headers.has('Sec-Fetch-Site')) {
                headers.set('Sec-Fetch-Site', 'none');
            }

            options.headers = headers;
            return originalFetch.call(this, url, options);
        };

        console.log('📡 Request headers randomized');
    }

    hideWebDriverProperties() {
        // More comprehensive webdriver hiding
        const props = [
            'webdriver',
            '__webdriver_evaluate',
            '__selenium_evaluate',
            '__webdriver_script_fn',
            '__webdriver_script_func',
            '__webdriver_script_function',
            '__fxdriver_evaluate',
            '__driver_unwrapped',
            '__webdriver_unwrapped',
            '__driver_evaluate',
            '__selenium_unwrapped',
            '__fxdriver_unwrapped'
        ];

        props.forEach(prop => {
            if (window[prop]) {
                delete window[prop];
            }
            if (navigator[prop]) {
                delete navigator[prop];
            }
        });

        // Override webdriver property specifically
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true
        });

        console.log('🕵️ WebDriver properties hidden');
    }

    spoofPermissions() {
        // Override permissions API
        if (navigator.permissions) {
            const originalQuery = navigator.permissions.query;
            navigator.permissions.query = function(permissionDesc) {
                return Promise.resolve({
                    state: 'prompt',
                    onchange: null
                });
            };
        }

        console.log('🔐 Permissions API spoofed');
    }

    spoofBatteryAPI() {
        if (navigator.getBattery) {
            navigator.getBattery = () => Promise.resolve({
                charging: Math.random() < 0.5,
                chargingTime: Math.random() * 3600,
                dischargingTime: Math.random() * 7200,
                level: 0.1 + Math.random() * 0.8,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true
            });
        }

        console.log('🔋 Battery API spoofed');
    }

    spoofConnectionAPI() {
        const connectionTypes = ['slow-2g', '2g', '3g', '4g'];
        const effectiveType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
        
        Object.defineProperty(navigator, 'connection', {
            get: () => ({
                effectiveType,
                downlink: Math.random() * 10,
                rtt: 50 + Math.random() * 200,
                saveData: Math.random() < 0.1,
                addEventListener: () => {},
                removeEventListener: () => {}
            }),
            configurable: true
        });

        console.log('📶 Connection API spoofed');
    }

    preventHeadlessDetection() {
        // Add missing properties that headless browsers lack
        if (!window.outerHeight) {
            Object.defineProperty(window, 'outerHeight', {
                get: () => window.innerHeight,
                configurable: true
            });
        }

        if (!window.outerWidth) {
            Object.defineProperty(window, 'outerWidth', {
                get: () => window.innerWidth,
                configurable: true
            });
        }

        // Spoof chrome object if missing
        if (!window.chrome) {
            Object.defineProperty(window, 'chrome', {
                get: () => ({
                    runtime: {
                        onConnect: undefined,
                        onMessage: undefined
                    },
                    loadTimes: () => ({
                        commitLoadTime: Date.now() / 1000 - Math.random() * 100,
                        connectionInfo: 'http/1.1',
                        finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 50,
                        finishLoadTime: Date.now() / 1000 - Math.random() * 30,
                        firstPaintAfterLoadTime: 0,
                        firstPaintTime: Date.now() / 1000 - Math.random() * 80,
                        navigationType: 'Other',
                        npnNegotiatedProtocol: 'unknown',
                        requestTime: Date.now() / 1000 - Math.random() * 200,
                        startLoadTime: Date.now() / 1000 - Math.random() * 150,
                        wasAlternateProtocolAvailable: false,
                        wasFetchedViaSpdy: false,
                        wasNpnNegotiated: false
                    }),
                    csi: () => ({
                        onloadT: Date.now(),
                        pageT: Date.now() - Math.random() * 1000,
                        tran: Math.floor(Math.random() * 20)
                    })
                }),
                configurable: true
            });
        }

        console.log('👻 Headless detection prevention applied');
    }

    spoofChromeRuntime() {
        // Ensure chrome.runtime exists and behaves like a real browser
        if (window.chrome && !window.chrome.runtime) {
            Object.defineProperty(window.chrome, 'runtime', {
                get: () => ({
                    onConnect: undefined,
                    onMessage: undefined,
                    sendMessage: () => {},
                    connect: () => ({
                        onMessage: { addListener: () => {}, removeListener: () => {} },
                        onDisconnect: { addListener: () => {}, removeListener: () => {} },
                        postMessage: () => {}
                    })
                }),
                configurable: true
            });
        }

        console.log('🔧 Chrome runtime spoofed');
    }

    // Enhanced canvas spoofing with more sophisticated noise
    spoofCanvas() {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

        HTMLCanvasElement.prototype.toDataURL = function(type) {
            const context = this.getContext('2d');
            const imageData = context.getImageData(0, 0, this.width, this.height);
            
            // Add sophisticated noise pattern
            for (let i = 0; i < imageData.data.length; i += 4) {
                const noise = Math.floor((Math.random() - 0.5) * 4);
                imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
                imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
                imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
            }
            
            context.putImageData(imageData, 0, 0);
            return originalToDataURL.apply(this, arguments);
        };

        console.log('🎨 Enhanced canvas fingerprinting protection enabled');
    }

    // Enhanced WebGL spoofing
    spoofWebGL() {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        const vendors = ['Intel Inc.', 'NVIDIA Corporation', 'ATI Technologies Inc.'];
        const renderers = [
            'Intel Iris OpenGL Engine',
            'NVIDIA GeForce GTX 1060',
            'AMD Radeon RX 580',
            'Intel HD Graphics 630'
        ];

        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === this.VENDOR) {
                return vendors[Math.floor(Math.random() * vendors.length)];
            }
            if (parameter === this.RENDERER) {
                return renderers[Math.floor(Math.random() * renderers.length)];
            }
            if (parameter === this.VERSION) {
                return 'OpenGL ES 2.0 (' + renderers[Math.floor(Math.random() * renderers.length)] + ')';
            }
            if (parameter === this.SHADING_LANGUAGE_VERSION) {
                return 'OpenGL ES GLSL ES 1.0 (' + renderers[Math.floor(Math.random() * renderers.length)] + ')';
            }
            
            return originalGetParameter.apply(this, arguments);
        };

        console.log('🎮 Enhanced WebGL fingerprinting protection enabled');
    }

    // Show/hide modal methods (same as original)
    showAntiDetectionModal() {
        const modal = document.getElementById('anti-detection-modal');
        if (modal) {
            modal.style.display = 'block';
            this.populateAntiDetectionForm();
        }
    }

    hideAntiDetectionModal() {
        const modal = document.getElementById('anti-detection-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateAntiDetectionForm() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (element) {
                element.checked = this.settings[key];
            }
        });
    }

    async saveAntiDetectionSettings() {
        const newSettings = {};
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (element) {
                newSettings[key] = element.checked;
            } else {
                newSettings[key] = this.settings[key];
            }
        });

        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.setAntiDetection(newSettings);
                if (result.success) {
                    this.settings = newSettings;
                    this.showAntiDetectionStatus('success', 'Enhanced anti-detection settings saved successfully');
                    this.saveToLocalStorage(newSettings);
                    this.applyEnhancedAntiDetection();
                    
                    setTimeout(() => {
                        this.hideAntiDetectionModal();
                    }, 1500);
                } else {
                    this.showAntiDetectionStatus('error', result.error || 'Failed to apply anti-detection settings');
                }
            } else {
                this.settings = newSettings;
                this.showAntiDetectionStatus('success', 'Enhanced anti-detection settings saved (test mode)');
                this.saveToLocalStorage(newSettings);
                this.applyEnhancedAntiDetection();
            }
        } catch (error) {
            console.error('Error saving anti-detection settings:', error);
            this.showAntiDetectionStatus('error', 'Failed to save settings: ' + error.message);
        }
    }

    updateAntiDetectionStatus() {
        const indicator = document.getElementById('anti-detection-status-indicator');
        if (indicator) {
            const enabledCount = Object.values(this.settings).filter(Boolean).length;
            const totalCount = Object.keys(this.settings).length;
            
            if (enabledCount > 0) {
                indicator.textContent = `🛡️ Enhanced Anti-Detection: ${enabledCount}/${totalCount} Active`;
                indicator.className = 'status-indicator active';
            } else {
                indicator.textContent = 'Anti-Detection: Disabled';
                indicator.className = 'status-indicator inactive';
            }
        }
    }

    showAntiDetectionStatus(type, message) {
        const statusElement = document.getElementById('anti-detection-status');
        if (statusElement) {
            statusElement.className = `status-message ${type}`;
            statusElement.textContent = message;
            statusElement.style.display = 'block';

            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    saveToLocalStorage(settings) {
        try {
            localStorage.setItem('beastbrowser_enhanced_antidetection_settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save enhanced anti-detection settings to localStorage:', error);
        }
    }

    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('beastbrowser_enhanced_antidetection_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load saved enhanced anti-detection settings:', error);
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
            webrtc: this.settings.blockWebRTC ? 'blocked' : 'enabled',
            plugins: this.settings.spoofPlugins ? 'spoofed' : 'original',
            fonts: this.settings.randomizeFonts ? 'randomized' : 'original',
            languages: this.settings.spoofLanguages ? 'spoofed' : 'original',
            mouseMovements: this.settings.spoofMouseMovements ? 'simulated' : 'original',
            typingPatterns: this.settings.randomizeTypingPatterns ? 'randomized' : 'original'
        };
    }
}

// Initialize enhanced anti-detection manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedAntiDetectionManager = new EnhancedAntiDetectionManager();
    console.log('🛡️ Enhanced Anti-Detection Manager initialized for Google CAPTCHA prevention');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedAntiDetectionManager;
}