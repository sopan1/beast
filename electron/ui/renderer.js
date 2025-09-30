// Enhanced Anti-Detection Browser Renderer with Advanced Features
// DOM elements
const addressBar = document.getElementById('address-bar');
const goBtn = document.getElementById('go-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');

const proxyBtn = document.getElementById('proxy-btn');
const antiDetectionBtn = document.getElementById('anti-detection-btn');
const settingsBtn = document.getElementById('settings-btn');

const proxyModal = document.getElementById('proxy-modal');
const antiDetectionModal = document.getElementById('anti-detection-modal');

const statusText = document.getElementById('status-text');
const proxyStatusIndicator = document.getElementById('proxy-status-indicator');
const antiDetectionStatusIndicator = document.getElementById('anti-detection-status-indicator');

// Enhanced webview with advanced anti-detection
let webview = null;
let antiDetectionConfig = {
    randomizeUserAgent: true,
    spoofCanvas: true,
    randomizeScreen: true,
    randomizeTimezone: false,
    randomizeHardware: true,
    blockWebRTC: false,
    blockTracking: true,
    spoofWebGL: true,
    preventFingerprinting: true
};

// Enhanced webview creation with advanced anti-detection
function createWebview() {
    // Remove existing webview if any
    const existingWebview = document.getElementById('webview');
    if (existingWebview) {
        existingWebview.remove();
    }

    // Create new webview with enhanced anti-detection
    webview = document.createElement('webview');
    webview.id = 'webview';
    webview.src = 'about:blank'; // Start with blank page
    webview.style.cssText = `
        width: 100%;
        height: calc(100vh - 120px);
        border: none;
        background: #0a0a1a;
        border-radius: 0 0 15px 15px;
    `;
    
    // Ensure the dedicated webview preload runs inside the webview process
    // Path is relative to this UI file (electron/ui/index.html)
    webview.setAttribute('preload', '../webview-preload.js');
    
    // Enhanced user agent randomization
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    const randomUserAgent = window.userAgent || userAgents[Math.floor(Math.random() * userAgents.length)];
    webview.setAttribute('useragent', randomUserAgent);
    
    // Set partition to match main process session: persist:profile_<id>
    const profileId = window.profileId || 'default';
    webview.setAttribute('partition', `persist:profile_${profileId}`);
    
    // Add webview to body after status bar
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
        document.body.insertBefore(webview, statusBar);
    } else {
        document.body.appendChild(webview);
    }

    // Enhanced webview event listeners with better error handling
    webview.addEventListener('dom-ready', () => {
        console.log('🦁 BeastBrowser webview DOM ready');
        
        // Inject advanced anti-detection scripts
        injectAntiDetectionScripts();
        
        statusText.textContent = 'Ready';
    });

    webview.addEventListener('did-start-loading', () => {
        console.log('🔄 Loading started');
        statusText.textContent = 'Loading...';
        updateLoadingProgress(30);
    });

    webview.addEventListener('did-stop-loading', () => {
        console.log('✅ Loading completed');
        statusText.textContent = 'Ready';
        updateLoadingProgress(100);
        setTimeout(() => updateLoadingProgress(0), 500);
        updateAddressBar();
    });

    webview.addEventListener('did-fail-load', (event) => {
        console.error('❌ Failed to load:', event.errorDescription);
        statusText.textContent = `Failed: ${event.errorDescription}`;
        updateLoadingProgress(0);
    });

    webview.addEventListener('new-window', (event) => {
        event.preventDefault();
        console.log('🔗 New window blocked, navigating in same tab:', event.url);
        navigateToUrl(event.url);
    });

    webview.addEventListener('page-title-updated', (event) => {
        document.title = `BeastBrowser - ${event.title}`;
    });

    return webview;
}

// Advanced anti-detection script injection
function injectAntiDetectionScripts() {
    if (!webview) return;
    
    try {
        console.log('🔒 Injecting advanced anti-detection scripts');
        
        const antiDetectionScript = `
            (function() {
                'use strict';
                
                console.log('🔒 BeastBrowser Anti-Detection Shield Activated');
                
                // Canvas fingerprinting protection
                if (${antiDetectionConfig.spoofCanvas}) {
                    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
                    
                    HTMLCanvasElement.prototype.toDataURL = function() {
                        const context = this.getContext('2d');
                        const imageData = context.getImageData(0, 0, this.width, this.height);
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            imageData.data[i] += Math.floor(Math.random() * 10) - 5;
                            imageData.data[i + 1] += Math.floor(Math.random() * 10) - 5;
                            imageData.data[i + 2] += Math.floor(Math.random() * 10) - 5;
                        }
                        context.putImageData(imageData, 0, 0);
                        return originalToDataURL.apply(this, arguments);
                    };
                }
                
                // WebGL fingerprinting protection
                if (${antiDetectionConfig.spoofWebGL}) {
                    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = function(parameter) {
                        if (parameter === this.RENDERER) {
                            return 'BeastBrowser WebGL Renderer';
                        }
                        if (parameter === this.VENDOR) {
                            return 'BeastBrowser Graphics';
                        }
                        return originalGetParameter.apply(this, arguments);
                    };
                }
                
                // Screen resolution randomization
                if (${antiDetectionConfig.randomizeScreen}) {
                    Object.defineProperty(screen, 'width', {
                        get: () => 1920 + Math.floor(Math.random() * 100)
                    });
                    Object.defineProperty(screen, 'height', {
                        get: () => 1080 + Math.floor(Math.random() * 100)
                    });
                    Object.defineProperty(screen, 'availWidth', {
                        get: () => screen.width
                    });
                    Object.defineProperty(screen, 'availHeight', {
                        get: () => screen.height - 40
                    });
                }
                
                // Hardware concurrency randomization
                if (${antiDetectionConfig.randomizeHardware}) {
                    Object.defineProperty(navigator, 'hardwareConcurrency', {
                        get: () => Math.floor(Math.random() * 8) + 4
                    });
                    Object.defineProperty(navigator, 'deviceMemory', {
                        get: () => Math.pow(2, Math.floor(Math.random() * 4) + 2)
                    });
                }
                
                // WebRTC blocking handled by dedicated preload and Chromium switches
                // (Do not manipulate WebRTC here to avoid conflicts)
                
                // Advanced tracking protection
                if (${antiDetectionConfig.blockTracking}) {
                    // Block common tracking methods
                    const blockedDomains = ['google-analytics.com', 'googletagmanager.com', 'facebook.com/tr', 'doubleclick.net'];
                    const originalFetch = window.fetch;
                    const originalXHR = XMLHttpRequest.prototype.open;
                    
                    window.fetch = function(url) {
                        if (blockedDomains.some(domain => url.includes(domain))) {
                            console.log('BeastBrowser blocked tracking request:', url);
                            return Promise.reject(new Error('Blocked by BeastBrowser'));
                        }
                        return originalFetch.apply(this, arguments);
                    };
                    
                    XMLHttpRequest.prototype.open = function(method, url) {
                        if (blockedDomains.some(domain => url.includes(domain))) {
                            console.log('BeastBrowser blocked XHR tracking request:', url);
                            return;
                        }
                        return originalXHR.apply(this, arguments);
                    };
                }
                
                // Timezone spoofing is handled by main/preload using IP-based detection
                // Do not randomize timezone here to keep it consistent with proxy IP
                
                // Enhanced fingerprinting protection
                if (${antiDetectionConfig.preventFingerprinting}) {
                    // Spoof plugins
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => []
                    });
                    
                    // Spoof languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                    
                    // Spoof platform
                    Object.defineProperty(navigator, 'platform', {
                        get: () => 'Win32'
                    });
                    
                    // Remove battery API
                    delete navigator.getBattery;
                    
                    // Spoof connection
                    if (navigator.connection) {
                        Object.defineProperty(navigator.connection, 'downlink', {
                            get: () => Math.random() * 10 + 1
                        });
                    }
                }
                
                console.log('✅ BeastBrowser Anti-Detection Shield fully deployed');
            })();
        `;
        
        webview.executeJavaScript(antiDetectionScript).then(() => {
            console.log('✅ Anti-detection scripts injected successfully');
        }).catch(error => {
            console.error('❌ Failed to inject anti-detection scripts:', error);
        });
        
    } catch (error) {
        console.error('❌ Error injecting anti-detection scripts:', error);
    }
}

// Enhanced loading progress visualization
function updateLoadingProgress(percentage) {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.width = percentage + '%';
    }
}

// Enhanced navigation with better URL handling and RPA compatibility
async function navigateToUrl(url = null) {
    const targetUrl = url || addressBar.value.trim();
    if (!targetUrl) return;
    
    let finalUrl = targetUrl;
    
    // Enhanced URL processing for better compatibility
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        // Check if it looks like a domain or is a search query
        if (targetUrl.includes('.') && !targetUrl.includes(' ') && !targetUrl.includes('?')) {
            // Looks like a domain - add https
            finalUrl = 'https://' + targetUrl;
        } else {
            // Treat as search query - use Google
            finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(targetUrl);
        }
    }
    
    // Log navigation for RPA compatibility
    console.log('🌍 BeastBrowser navigating to:', finalUrl);
    statusText.textContent = 'Loading...';
    addressBar.value = finalUrl;
    updateLoadingProgress(10);
    
    try {
        if (webview) {
            // Inject anti-detection before navigation
            if (webview.src !== 'about:blank') {
                await new Promise(resolve => {
                    const checkReady = () => {
                        if (webview.isLoading && webview.isLoading()) {
                            setTimeout(checkReady, 100);
                        } else {
                            resolve();
                        }
                    };
                    checkReady();
                });
            }
            
            webview.src = finalUrl;
            updateLoadingProgress(50);
            
            // Notify main process for proxy handling and RPA integration
            if (window.electronAPI && window.electronAPI.navigate) {
                try {
                    await window.electronAPI.navigate(finalUrl);
                } catch (apiError) {
                    console.warn('ElectronAPI navigation notification failed:', apiError);
                }
            }
            
            // Update proxy status indicator based on current config
            updateProxyStatusFromConfig();
            
        } else {
            console.error('❌ Webview not initialized');
            statusText.textContent = 'Browser not ready';
            updateLoadingProgress(0);
        }
    } catch (error) {
        console.error('❌ Navigation error:', error);
        statusText.textContent = `Navigation failed: ${error.message}`;
        updateLoadingProgress(0);
    }
}

// Enhanced proxy status management
function updateProxyStatusFromConfig() {
    try {
        const hasProxy = window.hasProxy || false;
        const proxyType = window.proxyType || 'SOCKS5';
        
        updateProxyStatus(hasProxy, proxyType);
        
        // Also update the UI indicator if it exists
        const proxyIndicator = document.getElementById('proxy-indicator');
        if (proxyIndicator) {
            if (hasProxy) {
                proxyIndicator.textContent = proxyType;
                proxyIndicator.className = 'proxy-indicator active';
            } else {
                proxyIndicator.textContent = 'Direct';
                proxyIndicator.className = 'proxy-indicator inactive';
            }
        }
    } catch (error) {
        console.error('Error updating proxy status:', error);
    }
}

async function updateAddressBar() {
    try {
        if (webview && webview.src && webview.src !== 'about:blank') {
            addressBar.value = webview.src;
        }
    } catch (error) {
        console.error('Failed to update address bar:', error);
    }
}

// Event listeners for navigation
goBtn.addEventListener('click', () => navigateToUrl());

addressBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        navigateToUrl();
    }
});

backBtn.addEventListener('click', () => {
    if (webview && webview.canGoBack()) {
        webview.goBack();
        setTimeout(updateAddressBar, 100);
    }
});

forwardBtn.addEventListener('click', () => {
    if (webview && webview.canGoForward()) {
        webview.goForward();
        setTimeout(updateAddressBar, 100);
    }
});

reloadBtn.addEventListener('click', () => {
    if (webview) {
        webview.reload();
        statusText.textContent = 'Reloading...';
    }
});

// Modal management
function openModal(modal) {
    modal.style.display = 'block';
}

function closeModal(modal) {
    modal.style.display = 'none';
}

// Proxy settings
proxyBtn.addEventListener('click', () => {
    openModal(proxyModal);
    loadProxySettings();
});

document.getElementById('proxy-close').addEventListener('click', () => {
    closeModal(proxyModal);
});

document.getElementById('proxy-rotation').addEventListener('change', (e) => {
    const proxyListGroup = document.getElementById('proxy-list-group');
    proxyListGroup.style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('save-proxy-btn').addEventListener('click', async () => {
    const config = {
        enabled: document.getElementById('proxy-enabled').checked,
        type: document.getElementById('proxy-type').value,
        host: document.getElementById('proxy-host').value,
        port: parseInt(document.getElementById('proxy-port').value),
        username: document.getElementById('proxy-username').value,
        password: document.getElementById('proxy-password').value,
        rotation: document.getElementById('proxy-rotation').checked
    };
    
    // Handle proxy list for rotation
    if (config.rotation) {
        const proxyListText = document.getElementById('proxy-list').value;
        config.proxies = parseProxyList(proxyListText);
    } else if (config.host && config.port) {
        config.proxies = [config];
    }
    
    try {
        // Save to localStorage for persistence
        localStorage.setItem('proxyConfig', JSON.stringify(config));
        
        // Try to set proxy via electronAPI if available
        if (window.electronAPI && window.electronAPI.setProxy) {
            const result = await window.electronAPI.setProxy(config);
            showStatus('proxy-status', result.success ? 'Proxy settings saved successfully!' : result.error, result.success ? 'success' : 'error');
        } else {
            showStatus('proxy-status', 'Proxy settings saved locally!', 'success');
        }
        
        updateProxyStatus(config.enabled);
        setTimeout(() => closeModal(proxyModal), 1500);
    } catch (error) {
        showStatus('proxy-status', `Failed to save proxy settings: ${error.message}`, 'error');
    }
});

document.getElementById('test-proxy-btn').addEventListener('click', async () => {
    const config = {
        type: document.getElementById('proxy-type').value,
        host: document.getElementById('proxy-host').value,
        port: parseInt(document.getElementById('proxy-port').value),
        username: document.getElementById('proxy-username').value,
        password: document.getElementById('proxy-password').value
    };
    
    if (!config.host || !config.port) {
        showStatus('proxy-status', 'Please enter proxy host and port', 'error');
        return;
    }
    
    showStatus('proxy-status', '🔍 Testing proxy connection...', 'info');
    
    try {
        // First test via electronAPI if available
        let testResult = null;
        if (window.electronAPI && window.electronAPI.testProxy) {
            try {
                testResult = await window.electronAPI.testProxy(config);
            } catch (apiError) {
                console.warn('ElectronAPI proxy test failed, using fallback:', apiError);
            }
        }
        
        if (testResult && testResult.success) {
            showStatus('proxy-status', 
                `✅ Proxy Test Successful!\n` +
                `IP: ${testResult.ip || 'Unknown'}\n` +
                `Location: ${testResult.location || 'Unknown'}\n` +
                `Connection Time: ${testResult.responseTime || 'Unknown'}ms`, 
                'success'
            );
        } else {
            // Fallback: Test by navigating to IP check service
            const testUrls = [
                'https://httpbin.org/ip',
                'https://api.ipify.org?format=json',
                'https://ifconfig.me/ip'
            ];
            
            // Try each test URL
            for (const testUrl of testUrls) {
                try {
                    showStatus('proxy-status', `🔍 Testing with ${testUrl}...`, 'info');
                    
                    // Navigate to test URL
                    navigateToUrl(testUrl);
                    
                    showStatus('proxy-status', 
                        `✅ Proxy test initiated with ${testUrl}\n` +
                        `Check the browser to see your current IP address.\n` +
                        `If the IP differs from your real IP, the proxy is working!`, 
                        'success'
                    );
                    break;
                } catch (error) {
                    console.warn(`Test URL ${testUrl} failed:`, error);
                    continue;
                }
            }
        }
    } catch (error) {
        console.error('Proxy test error:', error);
        showStatus('proxy-status', 
            `❌ Proxy test failed: ${error.message}\n` +
            `Please check your proxy settings and try again.`, 
            'error'
        );
    }
});

async function loadProxySettings() {
    try {
        // Try to load from electronAPI first, then localStorage
        let config = {};
        
        if (window.electronAPI && window.electronAPI.getProxyConfig) {
            try {
                config = await window.electronAPI.getProxyConfig();
            } catch (e) {
                console.log('ElectronAPI proxy config not available, using localStorage');
            }
        }
        
        // Fallback to localStorage
        if (!config.host) {
            const savedConfig = localStorage.getItem('proxyConfig');
            if (savedConfig) {
                config = JSON.parse(savedConfig);
            }
        }
        
        document.getElementById('proxy-enabled').checked = config.enabled || false;
        document.getElementById('proxy-type').value = config.type || 'http';
        document.getElementById('proxy-host').value = config.host || '';
        document.getElementById('proxy-port').value = config.port || '';
        document.getElementById('proxy-username').value = config.username || '';
        document.getElementById('proxy-password').value = config.password || '';
        document.getElementById('proxy-rotation').checked = config.rotation || false;
        
        const proxyListGroup = document.getElementById('proxy-list-group');
        proxyListGroup.style.display = config.rotation ? 'block' : 'none';
        
        if (config.proxies && config.proxies.length > 1) {
            document.getElementById('proxy-list').value = config.proxies.map(p => 
                `${p.type}://${p.username && p.password ? `${p.username}:${p.password}@` : ''}${p.host}:${p.port}`
            ).join('\n');
        }
        
        updateProxyStatus(config.enabled);
    } catch (error) {
        console.error('Failed to load proxy settings:', error);
    }
}

function parseProxyList(proxyListText) {
    const lines = proxyListText.split('\n').filter(line => line.trim());
    const proxies = [];
    
    for (const line of lines) {
        try {
            const url = new URL(line.trim());
            const proxy = {
                type: url.protocol.replace(':', ''),
                host: url.hostname,
                port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80)
            };
            
            if (url.username && url.password) {
                proxy.username = url.username;
                proxy.password = url.password;
            }
            
            proxies.push(proxy);
        } catch (error) {
            console.warn('Invalid proxy URL:', line);
        }
    }
    
    return proxies;
}

// Anti-detection settings
antiDetectionBtn.addEventListener('click', () => {
    openModal(antiDetectionModal);
    loadAntiDetectionSettings();
});

document.getElementById('anti-detection-close').addEventListener('click', () => {
    closeModal(antiDetectionModal);
});

document.getElementById('save-anti-detection-btn').addEventListener('click', async () => {
    const config = {
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
        // Save to localStorage
        localStorage.setItem('antiDetectionConfig', JSON.stringify(config));
        
        // Try to set via electronAPI if available
        if (window.electronAPI && window.electronAPI.setAntiDetection) {
            const result = await window.electronAPI.setAntiDetection(config);
            showStatus('anti-detection-status', result.success ? 'Anti-detection settings saved successfully!' : result.error, result.success ? 'success' : 'error');
        } else {
            showStatus('anti-detection-status', 'Anti-detection settings saved locally!', 'success');
        }
        
        updateAntiDetectionStatus(true);
        setTimeout(() => closeModal(antiDetectionModal), 1500);
    } catch (error) {
        showStatus('anti-detection-status', `Failed to save anti-detection settings: ${error.message}`, 'error');
    }
});

async function loadAntiDetectionSettings() {
    try {
        let config = {};
        
        // Try electronAPI first, then localStorage
        if (window.electronAPI && window.electronAPI.getAntiDetectionConfig) {
            try {
                config = await window.electronAPI.getAntiDetectionConfig();
            } catch (e) {
                console.log('ElectronAPI anti-detection config not available, using localStorage');
            }
        }
        
        // Fallback to localStorage
        if (!Object.keys(config).length) {
            const savedConfig = localStorage.getItem('antiDetectionConfig');
            if (savedConfig) {
                config = JSON.parse(savedConfig);
            }
        }
        
        document.getElementById('randomize-ua').checked = config.randomizeUserAgent !== false;
        document.getElementById('spoof-canvas').checked = config.spoofCanvas !== false;
        document.getElementById('randomize-screen').checked = config.randomizeScreen !== false;
        document.getElementById('randomize-timezone').checked = config.randomizeTimezone !== false;
        document.getElementById('randomize-hardware').checked = config.randomizeHardware !== false;
        document.getElementById('block-webrtc').checked = config.blockWebRTC !== false;
        document.getElementById('block-tracking').checked = config.blockTracking !== false;
        document.getElementById('spoof-webgl').checked = config.spoofWebGL !== false;
        
        updateAntiDetectionStatus(true);
    } catch (error) {
        console.error('Failed to load anti-detection settings:', error);
    }
}

// Settings button
settingsBtn.addEventListener('click', () => {
    alert('General settings coming soon!');
});

// Utility functions
function showStatus(elementId, message, type) {
    const statusElement = document.getElementById(elementId);
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

function updateProxyStatus(enabled) {
    proxyStatusIndicator.textContent = `Proxy: ${enabled ? 'Enabled' : 'Disabled'}`;
    proxyStatusIndicator.className = `status-indicator ${enabled ? 'active' : ''}`;
    proxyBtn.className = `control-btn ${enabled ? 'active' : ''}`;
}

function updateAntiDetectionStatus(enabled) {
    antiDetectionStatusIndicator.textContent = `Anti-Detection: ${enabled ? 'Enabled' : 'Disabled'}`;
    antiDetectionStatusIndicator.className = `status-indicator ${enabled ? 'active' : ''}`;
    antiDetectionBtn.className = `control-btn ${enabled ? 'active' : ''}`;
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === proxyModal) {
        closeModal(proxyModal);
    }
    if (e.target === antiDetectionModal) {
        closeModal(antiDetectionModal);
    }
});

// Listen for IPC events from main process if available
if (window.electronAPI) {
    if (window.electronAPI.onShowProxySettings) {
        window.electronAPI.onShowProxySettings(() => {
            openModal(proxyModal);
            loadProxySettings();
        });
    }

    if (window.electronAPI.onShowAntiDetectionSettings) {
        window.electronAPI.onShowAntiDetectionSettings(() => {
            openModal(antiDetectionModal);
            loadAntiDetectionSettings();
        });
    }

    if (window.electronAPI.onDataCleared) {
        window.electronAPI.onDataCleared(() => {
            statusText.textContent = 'Browsing data cleared';
            setTimeout(() => {
                statusText.textContent = 'Ready';
            }, 2000);
        });
    }
}

// Enhanced initialization with RPA compatibility
document.addEventListener('DOMContentLoaded', () => {
    console.log('🦁 BeastBrowser Enhanced Renderer loaded');
    
    // Initialize webview with anti-detection
    webview = createWebview();
    
    // Set initial status
    statusText.textContent = 'Initializing BeastBrowser...';
    
    // Load enhanced settings
    loadProxySettings();
    loadAntiDetectionSettings();
    
    // Update proxy status from window config
    updateProxyStatusFromConfig();
    
    // Set default URL based on starting URL or use new tab page
    const startingUrl = window.startingUrl;
    if (startingUrl && startingUrl.trim() && startingUrl !== 'about:blank') {
        console.log('🌍 Auto-navigating to starting URL:', startingUrl);
        addressBar.value = startingUrl;
        // Delay navigation to ensure webview is ready
        setTimeout(() => {
            navigateToUrl(startingUrl);
        }, 1500);
    } else {
        // Show new tab page
        addressBar.value = '';
    }
    
    // Set ready status after initialization
    setTimeout(() => {
        if (statusText.textContent === 'Initializing BeastBrowser...') {
            statusText.textContent = 'Ready';
        }
    }, 2000);
    
    // Log profile information
    console.log('🦁 BeastBrowser Profile Information:', {
        profileId: window.profileId || 'default',
        profileName: window.profileName || 'Default Profile',
        hasProxy: window.hasProxy || false,
        proxyType: window.proxyType || 'None',
        userAgent: (window.userAgent || 'Default').substring(0, 50) + '...',
        startingUrl: window.startingUrl || 'New Tab Page'
    });
});

// Periodically update address bar and navigation state
setInterval(() => {
    if (webview && webview.src) {
        updateAddressBar();
        updateNavigationButtons();
    }
}, 2000);

// Enhanced global navigation function for RPA compatibility
window.navigateToUrl = navigateToUrl;

// RPA automation support functions
window.rpaAutomation = {
    // Navigate to URL (RPA compatible)
    navigate: async (url) => {
        console.log('🤖 RPA: Navigating to', url);
        return navigateToUrl(url);
    },
    
    // Wait for page load
    waitForLoad: async (timeout = 30000) => {
        console.log('🤖 RPA: Waiting for page load');
        return new Promise((resolve, reject) => {
            if (!webview) {
                reject(new Error('Webview not initialized'));
                return;
            }
            
            const startTime = Date.now();
            const checkLoad = () => {
                if (!webview.isLoading || !webview.isLoading()) {
                    console.log('✅ RPA: Page loaded');
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for page load'));
                } else {
                    setTimeout(checkLoad, 100);
                }
            };
            checkLoad();
        });
    },
    
    // Execute JavaScript in webview
    executeScript: async (script) => {
        console.log('🤖 RPA: Executing script');
        if (!webview) {
            throw new Error('Webview not initialized');
        }
        return webview.executeJavaScript(script);
    },
    
    // Scroll page
    scroll: async (direction = 'down', amount = 500) => {
        console.log(`🤖 RPA: Scrolling ${direction} by ${amount}px`);
        const script = `
            window.scrollBy(0, ${direction === 'down' ? amount : -amount});
            window.scrollY;
        `;
        return window.rpaAutomation.executeScript(script);
    },
    
    // Smooth scroll
    smoothScroll: async (direction = 'down', amount = 500, duration = 1000) => {
        console.log(`🤖 RPA: Smooth scrolling ${direction}`);
        const script = `
            (function() {
                const startY = window.scrollY;
                const targetY = startY + (${direction === 'down' ? amount : -amount});
                const startTime = Date.now();
                const duration = ${duration};
                
                function animateScroll() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
                    
                    window.scrollTo(0, startY + (targetY - startY) * easeProgress);
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateScroll);
                    }
                }
                
                requestAnimationFrame(animateScroll);
                return targetY;
            })();
        `;
        return window.rpaAutomation.executeScript(script);
    },
    
    // Wait for element
    waitForElement: async (selector, timeout = 30000) => {
        console.log(`🤖 RPA: Waiting for element: ${selector}`);
        const script = `
            (function() {
                return new Promise((resolve, reject) => {
                    const startTime = Date.now();
                    const timeout = ${timeout};
                    
                    function checkElement() {
                        const element = document.querySelector('${selector}');
                        if (element) {
                            resolve(true);
                        } else if (Date.now() - startTime > timeout) {
                            reject(new Error('Timeout waiting for element: ${selector}'));
                        } else {
                            setTimeout(checkElement, 200);
                        }
                    }
                    
                    checkElement();
                });
            })();
        `;
        return window.rpaAutomation.executeScript(script);
    },
    
    // Get current URL
    getCurrentUrl: () => {
        return webview ? webview.src : '';
    },
    
    // Get page title
    getPageTitle: async () => {
        const script = 'document.title';
        return window.rpaAutomation.executeScript(script);
    }
};

// Expose RPA functions globally for main process access
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'RPA_COMMAND') {
        try {
            const { command, params, id } = event.data;
            let result;
            
            switch (command) {
                case 'navigate':
                    result = await window.rpaAutomation.navigate(params.url);
                    break;
                case 'waitForLoad':
                    result = await window.rpaAutomation.waitForLoad(params.timeout);
                    break;
                case 'scroll':
                    result = await window.rpaAutomation.scroll(params.direction, params.amount);
                    break;
                case 'smoothScroll':
                    result = await window.rpaAutomation.smoothScroll(params.direction, params.amount, params.duration);
                    break;
                case 'waitForElement':
                    result = await window.rpaAutomation.waitForElement(params.selector, params.timeout);
                    break;
                case 'executeScript':
                    result = await window.rpaAutomation.executeScript(params.script);
                    break;
                default:
                    throw new Error(`Unknown RPA command: ${command}`);
            }
            
            // Send result back
            event.source.postMessage({
                type: 'RPA_RESULT',
                id,
                success: true,
                result
            }, '*');
            
        } catch (error) {
            console.error('❌ RPA command failed:', error);
            event.source.postMessage({
                type: 'RPA_RESULT',
                id: event.data.id,
                success: false,
                error: error.message
            }, '*');
        }
    }
});