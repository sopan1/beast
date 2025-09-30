const fetch = require('node-fetch');
const log = require('electron-log');

/**
 * IP-based Timezone Manager
 * Automatically fetches timezone based on IP/proxy and injects it into browser
 */
class IPTimezoneManager {
  constructor() {
    this.cache = new Map(); // Cache IP -> timezone mappings
    this.timezoneCache = new Map(); // Cache timezone data
  }

  /**
   * Get timezone from IP address using multiple APIs
   */
  async getTimezoneFromIP(ip = null, proxyAgent = null) {
    try {
      // If no specific IP provided, get current IP through proxy
      if (!ip) {
        const ipResult = await this.getCurrentIP(proxyAgent);
        if (!ipResult.success) {
          throw new Error('Failed to get current IP');
        }
        ip = ipResult.ip;
      }

      // Check cache first (valid for 24 hours)
      const cacheKey = `ip_${ip}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          log.info(`Using cached timezone for IP ${ip}: ${cached.timezone}`);
          return cached;
        }
      }

      // Try multiple timezone APIs
      const apis = [
        {
          url: `http://ip-api.com/json/${ip}?fields=timezone,country,regionName,city,lat,lon`,
          parser: (data) => ({
            timezone: data.timezone,
            country: data.country,
            region: data.regionName,
            city: data.city,
            latitude: data.lat,
            longitude: data.lon
          })
        },
        {
          url: `https://ipinfo.io/${ip}/json`,
          parser: (data) => ({
            timezone: data.timezone,
            country: data.country,
            region: data.region,
            city: data.city,
            latitude: data.loc ? parseFloat(data.loc.split(',')[0]) : null,
            longitude: data.loc ? parseFloat(data.loc.split(',')[1]) : null
          })
        },
        {
          url: `https://ipapi.co/${ip}/json/`,
          parser: (data) => ({
            timezone: data.timezone,
            country: data.country_name,
            region: data.region,
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude
          })
        }
      ];

      for (const api of apis) {
        try {
          log.info(`Fetching timezone from ${api.url}`);
          
          const response = await fetch(api.url, {
            agent: proxyAgent,
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          if (response.ok) {
            const data = await response.json();
            const parsed = api.parser(data);
            
            if (parsed.timezone) {
              const result = {
                success: true,
                ip: ip,
                timezone: parsed.timezone,
                country: parsed.country,
                region: parsed.region,
                city: parsed.city,
                latitude: parsed.latitude,
                longitude: parsed.longitude,
                timestamp: Date.now(),
                source: api.url
              };

              // Cache the result
              this.cache.set(cacheKey, result);
              
              log.info(`✅ Timezone found for IP ${ip}: ${parsed.timezone} (${parsed.country})`);
              return result;
            }
          }
        } catch (error) {
          log.warn(`API ${api.url} failed:`, error.message);
          continue;
        }
      }

      throw new Error('All timezone APIs failed');

    } catch (error) {
      log.error('Failed to get timezone from IP:', error.message);
      return {
        success: false,
        error: error.message,
        timezone: 'America/New_York' // Fallback timezone
      };
    }
  }

  /**
   * Get current IP address through proxy
   */
  async getCurrentIP(proxyAgent = null) {
    const ipApis = [
      'https://api.ipify.org?format=json',
      'https://httpbin.org/ip',
      'http://icanhazip.com',
      'https://ifconfig.me/ip'
    ];

    for (const apiUrl of ipApis) {
      try {
        const response = await fetch(apiUrl, {
          agent: proxyAgent,
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.ok) {
          const text = await response.text();
          let ip;

          try {
            const data = JSON.parse(text);
            ip = data.ip || data.origin || text.trim();
          } catch {
            ip = text.trim();
          }

          if (ip && this.isValidIP(ip)) {
            return { success: true, ip: ip.trim() };
          }
        }
      } catch (error) {
        log.warn(`IP API ${apiUrl} failed:`, error.message);
        continue;
      }
    }

    return { success: false, error: 'All IP APIs failed' };
  }

  /**
   * Validate IP address format
   */
  isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Generate timezone spoofing script for injection
   */
  generateTimezoneScript(targetTimezone) {
    return `
      (function() {
        'use strict';
        
        const TARGET_TIMEZONE = '${targetTimezone}';
        console.log('🕐 Applying timezone spoof:', TARGET_TIMEZONE);
        
        try {
          // Override Intl.DateTimeFormat
          const OriginalDateTimeFormat = Intl.DateTimeFormat;
          const OriginalResolvedOptions = OriginalDateTimeFormat.prototype.resolvedOptions;
          
          Intl.DateTimeFormat = function(locales, options = {}) {
            // Force timezone in options
            const enhancedOptions = { ...options, timeZone: TARGET_TIMEZONE };
            const formatter = new OriginalDateTimeFormat(locales, enhancedOptions);
            
            // Override resolvedOptions to always return our timezone
            formatter.resolvedOptions = function() {
              const resolved = OriginalResolvedOptions.call(this);
              resolved.timeZone = TARGET_TIMEZONE;
              return resolved;
            };
            
            return formatter;
          };
          
          // Copy static methods
          Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
          Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
          
          // Override Date methods
          const OriginalDate = Date;
          const OriginalToLocaleString = Date.prototype.toLocaleString;
          const OriginalToLocaleDateString = Date.prototype.toLocaleDateString;
          const OriginalToLocaleTimeString = Date.prototype.toLocaleTimeString;
          
          // Override toLocaleString methods to use our timezone
          Date.prototype.toLocaleString = function(locales, options = {}) {
            const opts = { ...options, timeZone: TARGET_TIMEZONE };
            return OriginalToLocaleString.call(this, locales, opts);
          };
          
          Date.prototype.toLocaleDateString = function(locales, options = {}) {
            const opts = { ...options, timeZone: TARGET_TIMEZONE };
            return OriginalToLocaleDateString.call(this, locales, opts);
          };
          
          Date.prototype.toLocaleTimeString = function(locales, options = {}) {
            const opts = { ...options, timeZone: TARGET_TIMEZONE };
            return OriginalToLocaleTimeString.call(this, locales, opts);
          };
          
          // Override getTimezoneOffset (approximate)
          const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
          Date.prototype.getTimezoneOffset = function() {
            try {
              // Calculate timezone offset for our target timezone
              const date = new OriginalDate(this.getTime());
              const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
              const targetTime = new OriginalDate(utc + (getTimezoneOffsetForTimezone(TARGET_TIMEZONE) * 60000));
              return -getTimezoneOffsetForTimezone(TARGET_TIMEZONE);
            } catch (e) {
              return originalGetTimezoneOffset.call(this);
            }
          };
          
          // Helper function to get timezone offset
          function getTimezoneOffsetForTimezone(timezone) {
            try {
              const now = new OriginalDate();
              const utc = new OriginalDate(now.toLocaleString('en-US', { timeZone: 'UTC' }));
              const target = new OriginalDate(now.toLocaleString('en-US', { timeZone: timezone }));
              return (target.getTime() - utc.getTime()) / (1000 * 60);
            } catch (e) {
              return 0; // Fallback to UTC
            }
          }
          
          // Override toString methods to reflect timezone
          const originalToString = Date.prototype.toString;
          Date.prototype.toString = function() {
            try {
              return this.toLocaleString('en-US', { 
                timeZone: TARGET_TIMEZONE,
                weekday: 'short',
                month: 'short', 
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'long'
              });
            } catch (e) {
              return originalToString.call(this);
            }
          };
          
          console.log('✅ Timezone spoofing applied successfully:', TARGET_TIMEZONE);
          
          // Test the spoofing
          console.log('🧪 Timezone test:', {
            'Intl.DateTimeFormat().resolvedOptions().timeZone': new Intl.DateTimeFormat().resolvedOptions().timeZone,
            'new Date().toString()': new Date().toString(),
            'new Date().getTimezoneOffset()': new Date().getTimezoneOffset()
          });
          
        } catch (error) {
          console.error('❌ Timezone spoofing failed:', error);
        }
      })();
    `;
  }

  /**
   * Apply timezone spoofing to a BrowserWindow
   */
  async applyTimezoneToWindow(browserWindow, timezone) {
    try {
      // Wait for content to be ready
      await new Promise(resolve => {
        if (browserWindow.webContents.isLoading()) {
          browserWindow.webContents.once('did-finish-load', resolve);
        } else {
          resolve();
        }
      });

      // Apply CDP timezone override
      if (!browserWindow.webContents.debugger.isAttached()) {
        try {
          browserWindow.webContents.debugger.attach('1.3');
        } catch (error) {
          log.warn('CDP debugger attachment failed:', error.message);
        }
      }

      if (browserWindow.webContents.debugger.isAttached()) {
        try {
          await browserWindow.webContents.debugger.sendCommand('Emulation.setTimezoneOverride', {
            timezoneId: timezone
          });
          log.info(`✅ CDP timezone override applied: ${timezone}`);
        } catch (error) {
          log.warn('CDP timezone override failed:', error.message);
        }
      }

      // Inject JavaScript timezone spoofing
      const script = this.generateTimezoneScript(timezone);
      try {
        await browserWindow.webContents.executeJavaScript(script);
        log.info(`✅ JavaScript timezone spoofing applied: ${timezone}`);
      } catch (error) {
        log.error('JavaScript timezone injection failed:', error.message);
      }

      return { success: true, timezone };

    } catch (error) {
      log.error('Failed to apply timezone to window:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.timezoneCache.clear();
  }
}

module.exports = { IPTimezoneManager };