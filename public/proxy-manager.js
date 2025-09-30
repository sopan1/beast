class ProxyManager {
    constructor() {
        this.proxies = [];
        this.currentProxyIndex = 0;
        this.isRotationEnabled = false;
        this.currentProxy = null;
        this.testResults = new Map();
        
        this.initializeEventListeners();
        this.loadSavedSettings();
    }

    initializeEventListeners() {
        // Proxy modal controls
        document.getElementById('proxy-btn').addEventListener('click', () => {
            this.showProxyModal();
        });

        document.getElementById('proxy-close').addEventListener('click', () => {
            this.hideProxyModal();
        });

        document.getElementById('save-proxy-btn').addEventListener('click', () => {
            this.saveProxySettings();
        });

        document.getElementById('test-proxy-btn').addEventListener('click', () => {
            this.testCurrentProxy();
        });

        document.getElementById('proxy-rotation').addEventListener('change', (e) => {
            this.toggleProxyRotation(e.target.checked);
        });

        // Close modal when clicking outside
        document.getElementById('proxy-modal').addEventListener('click', (e) => {
            if (e.target.id === 'proxy-modal') {
                this.hideProxyModal();
            }
        });
    }

    showProxyModal() {
        document.getElementById('proxy-modal').style.display = 'block';
        this.populateProxyForm();
    }

    hideProxyModal() {
        document.getElementById('proxy-modal').style.display = 'none';
    }

    populateProxyForm() {
        const settings = this.getCurrentSettings();
        
        document.getElementById('proxy-enabled').checked = settings.enabled;
        document.getElementById('proxy-type').value = settings.type;
        document.getElementById('proxy-host').value = settings.host;
        document.getElementById('proxy-port').value = settings.port;
        document.getElementById('proxy-username').value = settings.username;
        document.getElementById('proxy-password').value = settings.password;
        document.getElementById('proxy-rotation').checked = settings.rotation;
        
        if (settings.rotation && settings.proxies) {
            document.getElementById('proxy-list').value = settings.proxies.join('\n');
        }
    }

    getCurrentSettings() {
        return {
            enabled: false,
            type: 'http',
            host: '',
            port: '',
            username: '',
            password: '',
            rotation: false,
            proxies: []
        };
    }

    async saveProxySettings() {
        const settings = {
            enabled: document.getElementById('proxy-enabled').checked,
            type: document.getElementById('proxy-type').value,
            host: document.getElementById('proxy-host').value.trim(),
            port: parseInt(document.getElementById('proxy-port').value) || 0,
            username: document.getElementById('proxy-username').value.trim(),
            password: document.getElementById('proxy-password').value.trim(),
            rotation: document.getElementById('proxy-rotation').checked
        };

        // Validate settings
        if (settings.enabled && (!settings.host || !settings.port)) {
            this.showStatus('error', 'Please enter valid host and port');
            return;
        }

        // Handle proxy rotation
        if (settings.rotation) {
            const proxyListText = document.getElementById('proxy-list').value.trim();
            if (proxyListText) {
                settings.proxies = this.parseProxyList(proxyListText);
            } else {
                this.showStatus('error', 'Please enter proxy list for rotation');
                return;
            }
        }

        try {
            // Save settings using Electron IPC
            if (window.electronAPI) {
                const result = await window.electronAPI.setProxy(settings);
                if (result.success) {
                    this.currentProxy = settings;
                    this.updateProxyStatus(settings.enabled, settings.type);
                    this.showStatus('success', 'Proxy settings saved successfully');
                    this.saveToLocalStorage(settings);
                    
                    // Hide modal after successful save
                    setTimeout(() => {
                        this.hideProxyModal();
                    }, 1500);
                } else {
                    this.showStatus('error', result.error || 'Failed to apply proxy settings');
                }
            } else {
                // Fallback for testing without Electron
                this.currentProxy = settings;
                this.updateProxyStatus(settings.enabled, settings.type);
                this.showStatus('success', 'Proxy settings saved (test mode)');
                this.saveToLocalStorage(settings);
            }
        } catch (error) {
            console.error('Error saving proxy settings:', error);
            this.showStatus('error', 'Failed to save proxy settings: ' + error.message);
        }
    }

    parseProxyList(proxyListText) {
        const lines = proxyListText.split('\n').filter(line => line.trim());
        const proxies = [];

        for (const line of lines) {
            const proxy = this.parseProxyString(line.trim());
            if (proxy) {
                proxies.push(proxy);
            }
        }

        return proxies;
    }

    parseProxyString(proxyString) {
        try {
            // Support formats:
            // http://host:port
            // socks5://user:pass@host:port
            // host:port (defaults to http)
            
            let url;
            if (proxyString.includes('://')) {
                url = new URL(proxyString);
            } else {
                url = new URL('http://' + proxyString);
            }

            return {
                type: url.protocol.replace(':', ''),
                host: url.hostname,
                port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
                username: url.username || '',
                password: url.password || ''
            };
        } catch (error) {
            console.warn('Invalid proxy format:', proxyString);
            return null;
        }
    }

    async testCurrentProxy() {
        const settings = {
            enabled: document.getElementById('proxy-enabled').checked,
            type: document.getElementById('proxy-type').value,
            host: document.getElementById('proxy-host').value.trim(),
            port: parseInt(document.getElementById('proxy-port').value) || 0,
            username: document.getElementById('proxy-username').value.trim(),
            password: document.getElementById('proxy-password').value.trim()
        };

        if (!settings.host || !settings.port) {
            this.showStatus('error', 'Please enter host and port to test');
            return;
        }

        const testBtn = document.getElementById('test-proxy-btn');
        const originalText = testBtn.textContent;
        
        try {
            testBtn.textContent = 'Testing...';
            testBtn.disabled = true;
            testBtn.classList.add('loading');

            // Test proxy connection
            const result = await this.performProxyTest(settings);
            
            if (result.success) {
                this.showStatus('success', `Proxy test successful! Response time: ${result.responseTime}ms`);
                this.testResults.set(this.getProxyKey(settings), result);
            } else {
                this.showStatus('error', `Proxy test failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Proxy test error:', error);
            this.showStatus('error', 'Proxy test failed: ' + error.message);
        } finally {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
            testBtn.classList.remove('loading');
        }
    }

    async performProxyTest(proxySettings) {
        const startTime = Date.now();
        
        try {
            // Create a test request through the proxy
            const testUrl = 'https://httpbin.org/ip';
            const proxyUrl = this.buildProxyUrl(proxySettings);
            
            // Use fetch with proxy (in real Electron environment)
            if (window.electronAPI) {
                const result = await window.electronAPI.testProxy({
                    url: testUrl,
                    proxy: proxySettings
                });
                
                return {
                    success: result.success,
                    responseTime: Date.now() - startTime,
                    error: result.error,
                    data: result.data
                };
            } else {
                // Fallback test (simulate success for demo)
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                
                return {
                    success: Math.random() > 0.3, // 70% success rate for demo
                    responseTime: Date.now() - startTime,
                    error: Math.random() > 0.7 ? 'Connection timeout' : null
                };
            }
        } catch (error) {
            return {
                success: false,
                responseTime: Date.now() - startTime,
                error: error.message
            };
        }
    }

    buildProxyUrl(settings) {
        let url = `${settings.type}://`;
        
        if (settings.username && settings.password) {
            url += `${settings.username}:${settings.password}@`;
        }
        
        url += `${settings.host}:${settings.port}`;
        
        return url;
    }

    getProxyKey(settings) {
        return `${settings.type}://${settings.host}:${settings.port}`;
    }

    toggleProxyRotation(enabled) {
        this.isRotationEnabled = enabled;
        const proxyListGroup = document.getElementById('proxy-list-group');
        
        if (enabled) {
            proxyListGroup.style.display = 'block';
        } else {
            proxyListGroup.style.display = 'none';
        }
    }

    updateProxyStatus(enabled, type = 'direct') {
        const indicator = document.getElementById('proxy-status-indicator');
        
        if (enabled) {
            indicator.textContent = `Proxy: ${type.toUpperCase()}`;
            indicator.className = 'status-indicator active';
        } else {
            indicator.textContent = 'Proxy: Disabled';
            indicator.className = 'status-indicator inactive';
        }
    }

    showStatus(type, message) {
        const statusElement = document.getElementById('proxy-status');
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
            // Don't save password to localStorage for security
            const safeSettings = { ...settings };
            delete safeSettings.password;
            
            localStorage.setItem('beastbrowser_proxy_settings', JSON.stringify(safeSettings));
        } catch (error) {
            console.warn('Failed to save proxy settings to localStorage:', error);
        }
    }

    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('beastbrowser_proxy_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.currentProxy = settings;
                this.updateProxyStatus(settings.enabled, settings.type);
            }
        } catch (error) {
            console.warn('Failed to load saved proxy settings:', error);
        }
    }

    // Public methods for external use
    async rotateProxy() {
        if (!this.isRotationEnabled || this.proxies.length === 0) {
            return false;
        }

        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        const nextProxy = this.proxies[this.currentProxyIndex];

        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.setProxy(nextProxy);
                if (result.success) {
                    this.currentProxy = nextProxy;
                    this.updateProxyStatus(true, nextProxy.type);
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to rotate proxy:', error);
        }

        return false;
    }

    getCurrentProxy() {
        return this.currentProxy;
    }

    isProxyEnabled() {
        return this.currentProxy && this.currentProxy.enabled;
    }
}

// Initialize proxy manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.proxyManager = new ProxyManager();
});