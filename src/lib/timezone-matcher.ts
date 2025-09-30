export interface TimezoneInfo {
  timezone: string;
  country: string;
  city: string;
  offset: string;
  success: boolean;
  error?: string;
}

export class TimezoneMatcher {
  private cache = new Map<string, TimezoneInfo>();
  private readonly API_ENDPOINTS = [
    'https://ipapi.co/{ip}/json/',
    'https://ip-api.com/json/{ip}',
    'https://ipinfo.io/{ip}/json',
    'https://api.ipgeolocation.io/ipgeo?apiKey=free&ip={ip}'
  ];

  async getTimezoneFromIP(ip: string): Promise<TimezoneInfo> {
    // Check cache first
    if (this.cache.has(ip)) {
      return this.cache.get(ip)!;
    }

    // Try each API endpoint
    for (const endpoint of this.API_ENDPOINTS) {
      try {
        const url = endpoint.replace('{ip}', ip);
        const response = await fetch(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) continue;

        const data = await response.json();
        const timezoneInfo = this.parseTimezoneResponse(data, endpoint);
        
        if (timezoneInfo.success) {
          // Cache successful result
          this.cache.set(ip, timezoneInfo);
          return timezoneInfo;
        }
      } catch (error) {
        console.warn(`Failed to get timezone from ${endpoint}:`, error);
        continue;
      }
    }

    // If all APIs fail, return default
    const defaultInfo: TimezoneInfo = {
      timezone: 'UTC',
      country: 'Unknown',
      city: 'Unknown',
      offset: '+00:00',
      success: false,
      error: 'All timezone APIs failed'
    };

    return defaultInfo;
  }

  private parseTimezoneResponse(data: any, endpoint: string): TimezoneInfo {
    try {
      if (endpoint.includes('ipapi.co')) {
        return {
          timezone: data.timezone || 'UTC',
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          offset: data.utc_offset || '+00:00',
          success: !!data.timezone
        };
      }
      
      if (endpoint.includes('ip-api.com')) {
        return {
          timezone: data.timezone || 'UTC',
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          offset: this.getOffsetFromTimezone(data.timezone),
          success: !!data.timezone
        };
      }
      
      if (endpoint.includes('ipinfo.io')) {
        return {
          timezone: data.timezone || 'UTC',
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          offset: this.getOffsetFromTimezone(data.timezone),
          success: !!data.timezone
        };
      }
      
      if (endpoint.includes('ipgeolocation.io')) {
        return {
          timezone: data.time_zone?.name || 'UTC',
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          offset: data.time_zone?.offset || '+00:00',
          success: !!data.time_zone?.name
        };
      }
    } catch (error) {
      console.warn('Failed to parse timezone response:', error);
    }

    return {
      timezone: 'UTC',
      country: 'Unknown',
      city: 'Unknown',
      offset: '+00:00',
      success: false,
      error: 'Failed to parse response'
    };
  }

  private getOffsetFromTimezone(timezone: string): string {
    if (!timezone) return '+00:00';
    
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
      const offset = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60);
      
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.abs(Math.floor(offset));
      const minutes = Math.abs((offset % 1) * 60);
      
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '+00:00';
    }
  }

  // Generate timezone spoofing script for browser injection
  generateTimezoneSpoof(targetTimezone: string): string {
    return `
      // Override timezone-related functions
      (function() {
        const originalDateToLocaleString = Date.prototype.toLocaleString;
        const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
        const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
        const originalIntlDateTimeFormat = Intl.DateTimeFormat;
        
        // Override Date methods
        Date.prototype.toLocaleString = function(locales, options) {
          options = options || {};
          options.timeZone = '${targetTimezone}';
          return originalDateToLocaleString.call(this, locales, options);
        };
        
        Date.prototype.toLocaleDateString = function(locales, options) {
          options = options || {};
          options.timeZone = '${targetTimezone}';
          return originalDateToLocaleDateString.call(this, locales, options);
        };
        
        Date.prototype.toLocaleTimeString = function(locales, options) {
          options = options || {};
          options.timeZone = '${targetTimezone}';
          return originalDateToLocaleTimeString.call(this, locales, options);
        };
        
        // Override Intl.DateTimeFormat
        Intl.DateTimeFormat = function(locales, options) {
          options = options || {};
          if (!options.timeZone) {
            options.timeZone = '${targetTimezone}';
          }
          return new originalIntlDateTimeFormat(locales, options);
        };
        
        // Copy static methods
        Object.setPrototypeOf(Intl.DateTimeFormat, originalIntlDateTimeFormat);
        Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
          value: originalIntlDateTimeFormat.prototype,
          writable: false
        });
        
        // Override getTimezoneOffset
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
          try {
            const now = new Date();
            const utc = new Date(now.getTime() + (originalGetTimezoneOffset.call(now) * 60000));
            const target = new Date(utc.toLocaleString('en-US', { timeZone: '${targetTimezone}' }));
            return -((target.getTime() - utc.getTime()) / (1000 * 60));
          } catch (e) {
            return originalGetTimezoneOffset.call(this);
          }
        };
        
        console.log('🕐 Timezone spoofed to: ${targetTimezone}');
      })();
    `;
  }

  // Extract IP from proxy string
  extractIPFromProxy(proxyString: string): string | null {
    try {
      // Handle different proxy formats
      let cleanProxy = proxyString.trim();
      
      // Remove protocol if present
      cleanProxy = cleanProxy.replace(/^(https?|socks[45]?):\/\//, '');
      
      // Remove credentials if present
      if (cleanProxy.includes('@')) {
        cleanProxy = cleanProxy.split('@')[1];
      }
      
      // Extract IP (before port)
      const ip = cleanProxy.split(':')[0];
      
      // Validate IP format
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      
      return ipRegex.test(ip) ? ip : null;
    } catch (error) {
      console.warn('Failed to extract IP from proxy:', error);
      return null;
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return this.cache.size;
  }
}

export const timezoneMatcher = new TimezoneMatcher();