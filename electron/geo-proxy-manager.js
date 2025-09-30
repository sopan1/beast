const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const fetch = require('node-fetch');
const log = require('electron-log');

/**
 * Enhanced Geo-Proxy Manager for HTTP/HTTPS proxies with automatic anti-detection
 * Based on AdsPower-style behavior with IP-based geolocation overrides
 */
class GeoProxyManager {
  constructor() {
    this.cache = new Map(); // Cache proxy test results
    this.geoCache = new Map(); // Cache geolocation data
  }

  /**
   * Parse proxy input in multiple formats
   * Supports: host:port, host:port:username:password, http://user:pass@host:port
   */
  parseProxyInput(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid proxy input');
    }

    const trimmed = input.trim();
    
    // Handle URL format: http://username:password@host:port
    if (trimmed.match(/^https?:\/\//)) {
      try {
        const url = new URL(trimmed);
        return {
          type: url.protocol === 'https:' ? 'https' : 'http',
          host: url.hostname,
          port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          username: url.username ? decodeURIComponent(url.username) : undefined,
          password: url.password ? decodeURIComponent(url.password) : undefined
        };
      } catch (error) {
        throw new Error('Invalid proxy URL format');
      }
    }

    // Handle host:port or host:port:username:password format
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      return {
        type: 'http',
        host: parts[0].trim(),
        port: parseInt(parts[1])
      };
    } else if (parts.length === 4) {
      return {
        type: 'http',
        host: parts[0].trim(),
        port: parseInt(parts[1]),
        username: parts[2].trim(),
        password: parts[3].trim()
      };
    }

    throw new Error('Unsupported proxy format. Use host:port, host:port:username:password, or http://user:pass@host:port');
  }

  /**
   * Test proxy connectivity and get IP geolocation data
   * Returns comprehensive geo data for anti-detection setup
   */
  async testProxyWithGeoLookup(proxyConfig, retries = 1) {
    const cacheKey = `${proxyConfig.host}:${proxyConfig.port}`;
    
    // Check cache first (valid for 1 hour)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 3600000) {
        log.info(`Using cached proxy test result for ${cacheKey}`);
        return cached.result;
      }
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        log.info(`Testing proxy ${cacheKey}, attempt ${attempt}/${retries}`);
        
        // Test endpoints with geo data (reduced for faster launch)
        const geoEndpoints = [
          'https://ipinfo.io/json'
        ];

        for (const endpoint of geoEndpoints) {
          try {
            // Create the correct proxy agent for each endpoint separately.
            // For HTTPS destinations, always use HttpsProxyAgent, even if the proxy itself is HTTP (uses CONNECT tunneling).
            const proxyUrl = this.buildProxyUrl(proxyConfig);
            const isHttpsEndpoint = endpoint.startsWith('https://');
            const agentOptions = {
              rejectUnauthorized: false,
              checkServerIdentity: () => undefined,
              timeout: 5000
            };
            const agent = isHttpsEndpoint
              ? new HttpsProxyAgent(proxyUrl, agentOptions)
              : new HttpProxyAgent(proxyUrl, agentOptions);

            const startTime = Date.now();
            const response = await fetch(endpoint, {
              agent,
              timeout: 5000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
              }
            });

            if (response.ok) {
              const geoData = await response.json();
              const responseTime = Date.now() - startTime;
              
              // Normalize geo data from different APIs
              const normalizedGeo = this.normalizeGeoData(geoData, endpoint);
              
              const result = {
                success: true,
                ip: normalizedGeo.ip,
                country: normalizedGeo.country,
                region: normalizedGeo.region,
                city: normalizedGeo.city,
                latitude: normalizedGeo.latitude,
                longitude: normalizedGeo.longitude,
                timezone: normalizedGeo.timezone,
                locale: this.getLocaleFromCountry(normalizedGeo.country),
                responseTime,
                testEndpoint: endpoint,
                testedAt: new Date().toISOString(),
                proxyConfig: {
                  type: proxyConfig.type,
                  host: proxyConfig.host,
                  port: proxyConfig.port,
                  hasAuth: !!(proxyConfig.username && proxyConfig.password)
                }
              };

              // Cache result
              this.cache.set(cacheKey, {
                result,
                timestamp: Date.now()
              });

              log.info(`Proxy test successful: ${normalizedGeo.ip} (${normalizedGeo.country})`);
              return result;
            }
          } catch (error) {
            log.warn(`Geo endpoint ${endpoint} failed:`, error.message);
            continue;
          }
        }
        
        throw new Error('All geo endpoints failed');
        
      } catch (error) {
        log.warn(`Proxy test attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          return {
            success: false,
            error: error.message.includes('timeout') ? 'Connection timeout' : error.message,
            attempts: retries,
            testedAt: new Date().toISOString()
          };
        }
        
        // Skip delay for faster launch
        // await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  /**
    const proxyUrl = this.buildProxyUrl(proxyConfig);
    
    const agentOptions = {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
      timeout: 15000
    };

    if (proxyConfig.type === 'https') {
      return new HttpsProxyAgent(proxyUrl, agentOptions);
    } else {
      return new HttpProxyAgent(proxyUrl, agentOptions);
    }
  }

  /**
   * Build proxy URL for agent
   */
  buildProxyUrl(proxyConfig) {
    let url = `${proxyConfig.type}://`;
    
    if (proxyConfig.username && proxyConfig.password) {
      url += `${encodeURIComponent(proxyConfig.username)}:${encodeURIComponent(proxyConfig.password)}@`;
    }
    
    url += `${proxyConfig.host}:${proxyConfig.port}`;
    return url;
  }

  /**
   * Normalize geo data from different API responses with enhanced timezone detection
   */
  normalizeGeoData(data, endpoint) {
    let normalizedData;
    
    if (endpoint.includes('ipinfo.io')) {
      normalizedData = {
        ip: data.ip,
        country: data.country,
        region: data.region,
        city: data.city,
        latitude: data.loc ? parseFloat(data.loc.split(',')[0]) : null,
        longitude: data.loc ? parseFloat(data.loc.split(',')[1]) : null,
        timezone: data.timezone || null
      };
    } else if (endpoint.includes('ip-api.com')) {
      normalizedData = {
        ip: data.query,
        country: data.countryCode,
        region: data.regionName,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone || null
      };
    } else if (endpoint.includes('ipapi.co')) {
      normalizedData = {
        ip: data.ip,
        country: data.country_code,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone || null
      };
    } else {
      // Fallback normalization
      normalizedData = {
        ip: data.ip || data.query,
        country: data.country || data.countryCode || data.country_code,
        region: data.region || data.regionName,
        city: data.city,
        latitude: data.lat || data.latitude,
        longitude: data.lon || data.longitude,
        timezone: data.timezone
      };
    }
    
    // ENHANCED: Fix timezone for US IPs if not properly detected
    if (normalizedData.country === 'US') {
      if (!normalizedData.timezone) {
        // Determine US timezone based on region/city or use longitude-based fallback
        normalizedData.timezone = this.inferUSTimezone(normalizedData.region, normalizedData.city, normalizedData.longitude);
        console.log(`🇺🇸 Inferred US timezone: ${normalizedData.timezone} for ${normalizedData.city}, ${normalizedData.region}`);
      } else {
        // Verify existing timezone is correct for US
        const inferredTz = this.inferUSTimezone(normalizedData.region, normalizedData.city, normalizedData.longitude);
        if (normalizedData.timezone !== inferredTz) {
          console.log(`🔄 Correcting US timezone from ${normalizedData.timezone} to ${inferredTz}`);
          normalizedData.timezone = inferredTz;
        }
      }
    }
    
    // Enhanced timezone fixes for UK and other European countries
    if (normalizedData.country === 'GB' || normalizedData.country === 'UK') {
      if (!normalizedData.timezone || normalizedData.timezone === 'America/New_York') {
        normalizedData.timezone = 'Europe/London';
        console.log(`🇬🇧 Fixed UK timezone: ${normalizedData.timezone} for ${normalizedData.city}, ${normalizedData.region}`);
      }
    }
    
    // Additional timezone fixes for common cases
    if (!normalizedData.timezone) {
      normalizedData.timezone = this.getDefaultTimezoneForCountry(normalizedData.country);
    }
    
    return normalizedData;
  }
  
  /**
   * Enhanced US timezone inference with comprehensive mapping
   */
  inferUSTimezone(region, city, longitude) {
    // Convert longitude to number for calculations
    const lng = parseFloat(longitude) || -74; // Default to NY longitude
    
    console.log(`🗺️ Inferring US timezone for: region=${region}, city=${city}, lng=${lng}`);
    
    // US timezone mapping by region/state - COMPREHENSIVE
    const regionTimezones = {
      // Pacific Time (UTC-8/-7)
      'California': 'America/Los_Angeles',
      'Nevada': 'America/Los_Angeles', 
      'Washington': 'America/Los_Angeles',
      'Oregon': 'America/Los_Angeles',
      'Alaska': 'America/Anchorage',
      'Hawaii': 'Pacific/Honolulu',
      
      // Mountain Time (UTC-7/-6)
      'Arizona': 'America/Phoenix', // No DST
      'Utah': 'America/Denver',
      'Colorado': 'America/Denver',
      'Montana': 'America/Denver',
      'Wyoming': 'America/Denver',
      'New Mexico': 'America/Denver',
      'North Dakota': 'America/Denver',
      'South Dakota': 'America/Denver',
      'Idaho': 'America/Boise',
      
      // Central Time (UTC-6/-5)
      'Nebraska': 'America/Chicago',
      'Kansas': 'America/Chicago',
      'Oklahoma': 'America/Chicago',
      'Texas': 'America/Chicago',
      'Minnesota': 'America/Chicago',
      'Iowa': 'America/Chicago',
      'Missouri': 'America/Chicago',
      'Arkansas': 'America/Chicago',
      'Louisiana': 'America/Chicago',
      'Wisconsin': 'America/Chicago',
      'Illinois': 'America/Chicago',
      'Mississippi': 'America/Chicago',
      'Alabama': 'America/Chicago',
      'Tennessee': 'America/Chicago',
      
      // Eastern Time (UTC-5/-4)
      'Michigan': 'America/Detroit',
      'Indiana': 'America/Indiana/Indianapolis',
      'Ohio': 'America/New_York',
      'Kentucky': 'America/New_York',
      'Georgia': 'America/New_York',
      'Florida': 'America/New_York',
      'South Carolina': 'America/New_York',
      'North Carolina': 'America/New_York',
      'Virginia': 'America/New_York',
      'West Virginia': 'America/New_York',
      'Maryland': 'America/New_York',
      'Delaware': 'America/New_York',
      'Pennsylvania': 'America/New_York',
      'New Jersey': 'America/New_York',
      'New York': 'America/New_York',
      'Connecticut': 'America/New_York',
      'Rhode Island': 'America/New_York',
      'Massachusetts': 'America/New_York',
      'Vermont': 'America/New_York',
      'New Hampshire': 'America/New_York',
      'Maine': 'America/New_York'
    };
    
    // Check by region first (most reliable)
    if (region && regionTimezones[region]) {
      console.log(`✅ Found timezone by region: ${region} -> ${regionTimezones[region]}`);
      return regionTimezones[region];
    }
    
    // Enhanced city mapping with major cities
    const cityTimezones = {
      // Pacific
      'Los Angeles': 'America/Los_Angeles',
      'San Francisco': 'America/Los_Angeles',
      'San Diego': 'America/Los_Angeles',
      'San Jose': 'America/Los_Angeles',
      'Seattle': 'America/Los_Angeles',
      'Portland': 'America/Los_Angeles',
      'Las Vegas': 'America/Los_Angeles',
      'Sacramento': 'America/Los_Angeles',
      'Fresno': 'America/Los_Angeles',
      'Oakland': 'America/Los_Angeles',
      
      // Mountain
      'Phoenix': 'America/Phoenix',
      'Denver': 'America/Denver',
      'Salt Lake City': 'America/Denver',
      'Albuquerque': 'America/Denver',
      'Boulder': 'America/Denver',
      'Colorado Springs': 'America/Denver',
      'Boise': 'America/Boise',
      
      // Central  
      'Chicago': 'America/Chicago',
      'Dallas': 'America/Chicago',
      'Houston': 'America/Chicago',
      'San Antonio': 'America/Chicago',
      'Austin': 'America/Chicago',
      'Fort Worth': 'America/Chicago',
      'Oklahoma City': 'America/Chicago',
      'Kansas City': 'America/Chicago',
      'Minneapolis': 'America/Chicago',
      'Milwaukee': 'America/Chicago',
      'New Orleans': 'America/Chicago',
      'Memphis': 'America/Chicago',
      'Nashville': 'America/Chicago',
      'St. Louis': 'America/Chicago',
      'Omaha': 'America/Chicago',
      
      // Eastern
      'New York': 'America/New_York',
      'New York City': 'America/New_York',
      'Brooklyn': 'America/New_York',
      'Manhattan': 'America/New_York',
      'Boston': 'America/New_York',
      'Philadelphia': 'America/New_York',
      'Washington': 'America/New_York',
      'Washington DC': 'America/New_York',
      'Atlanta': 'America/New_York',
      'Miami': 'America/New_York',
      'Orlando': 'America/New_York',
      'Tampa': 'America/New_York',
      'Jacksonville': 'America/New_York',
      'Charlotte': 'America/New_York',
      'Detroit': 'America/Detroit',
      'Baltimore': 'America/New_York',
      'Virginia Beach': 'America/New_York',
      'Richmond': 'America/New_York',
      'Pittsburgh': 'America/New_York',
      'Buffalo': 'America/New_York',
      'Rochester': 'America/New_York',
      'Syracuse': 'America/New_York'
    };
    
    if (city && cityTimezones[city]) {
      console.log(`✅ Found timezone by city: ${city} -> ${cityTimezones[city]}`);
      return cityTimezones[city];
    }
    
    // Enhanced longitude-based fallback with more precise boundaries
    console.log(`🗺️ Using longitude-based fallback for lng=${lng}`);
    
    if (lng >= -180 && lng <= -155) {
      return 'Pacific/Honolulu'; // Hawaii Time
    } else if (lng >= -155 && lng <= -130) {
      return 'America/Anchorage'; // Alaska Time  
    } else if (lng >= -125 && lng <= -114) {
      return 'America/Los_Angeles'; // Pacific Time
    } else if (lng >= -114 && lng <= -107) {
      return 'America/Denver'; // Mountain Time
    } else if (lng >= -107 && lng <= -90) {
      return 'America/Chicago'; // Central Time
    } else if (lng >= -90 && lng <= -67) {
      return 'America/New_York'; // Eastern Time
    }
    
    // Final fallback to Eastern Time (most common)
    console.log(`⚠️ Using fallback timezone: America/New_York`);
    return 'America/New_York';
  }
  
  /**
   * Get default timezone for country if none detected
   */
  getDefaultTimezoneForCountry(countryCode) {
    const countryTimezones = {
      'US': 'America/New_York',
      'CA': 'America/Toronto',
      'GB': 'Europe/London',
      'UK': 'Europe/London', // Alternative code for United Kingdom
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'ES': 'Europe/Madrid',
      'IT': 'Europe/Rome',
      'NL': 'Europe/Amsterdam',
      'RU': 'Europe/Moscow',
      'JP': 'Asia/Tokyo',
      'KR': 'Asia/Seoul',
      'CN': 'Asia/Shanghai',
      'IN': 'Asia/Kolkata',
      'AU': 'Australia/Sydney',
      'BR': 'America/Sao_Paulo',
      'MX': 'America/Mexico_City',
      'IE': 'Europe/Dublin',
      'SE': 'Europe/Stockholm',
      'NO': 'Europe/Oslo',
      'DK': 'Europe/Copenhagen',
      'FI': 'Europe/Helsinki',
      'PL': 'Europe/Warsaw',
      'CZ': 'Europe/Prague',
      'AT': 'Europe/Vienna',
      'CH': 'Europe/Zurich',
      'BE': 'Europe/Brussels',
      'PT': 'Europe/Lisbon'
    };
    
    return countryTimezones[countryCode] || 'UTC';
  }

  /**
   * Get appropriate locale from country code
   */
  getLocaleFromCountry(countryCode) {
    const localeMap = {
      'US': 'en-US', 'CA': 'en-CA', 'GB': 'en-GB', 'AU': 'en-AU',
      'DE': 'de-DE', 'FR': 'fr-FR', 'ES': 'es-ES', 'IT': 'it-IT',
      'NL': 'nl-NL', 'SE': 'sv-SE', 'NO': 'nb-NO', 'DK': 'da-DK',
      'FI': 'fi-FI', 'PL': 'pl-PL', 'CZ': 'cs-CZ', 'HU': 'hu-HU',
      'RU': 'ru-RU', 'JP': 'ja-JP', 'KR': 'ko-KR', 'CN': 'zh-CN',
      'TW': 'zh-TW', 'HK': 'zh-HK', 'SG': 'en-SG', 'IN': 'en-IN',
      'BR': 'pt-BR', 'MX': 'es-MX', 'AR': 'es-AR', 'CL': 'es-CL',
      'TR': 'tr-TR', 'AE': 'ar-AE', 'SA': 'ar-SA', 'IL': 'he-IL',
      'ZA': 'en-ZA', 'EG': 'ar-EG', 'NG': 'en-NG', 'KE': 'en-KE'
    };
    
    return localeMap[countryCode] || 'en-US';
  }

  /**
   * Generate Chrome launch flags for HTTP/HTTPS proxy with isolation
   */
  generateChromiumFlags(proxyConfig, profileDir) {
    const flags = [
      `--user-data-dir=${profileDir}`,
      `--proxy-server=${this.buildProxyUrl(proxyConfig)}`,
      '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ];

    return flags;
  }

  /**
   * Generate anti-detection overrides for CDP
   */
  generateAntiDetectionOverrides(geoData) {
    return {
      timezone: {
        command: 'Emulation.setTimezoneOverride',
        params: { timezoneId: geoData.timezone || 'UTC' }
      },
      geolocation: {
        command: 'Emulation.setGeolocationOverride',
        params: {
          latitude: geoData.latitude || 0,
          longitude: geoData.longitude || 0,
          accuracy: 100
        }
      },
      locale: {
        command: 'Network.setExtraHTTPHeaders',
        params: {
          headers: {
            'Accept-Language': geoData.locale || 'en-US,en;q=0.9'
          }
        }
      },
      userAgent: {
        command: 'Network.setUserAgentOverride',
        params: {
          userAgent: this.generateUserAgent(geoData.locale)
        }
      }
    };
  }

  /**
   * Generate appropriate user agent for locale
   */
  generateUserAgent(locale = 'en-US') {
    const baseUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Add locale-specific variations if needed
    const localeVariations = {
      'de-DE': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'fr-FR': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'es-ES': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    return localeVariations[locale] || baseUA;
  }

  /**
   * Generate WebRTC blocking script
   */
  generateWebRTCBlockingScript() {
    return `
      // Block WebRTC to prevent IP leaks
      (function() {
        const originalRTCPeerConnection = window.RTCPeerConnection;
        const originalGetUserMedia = navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : null;
        
        // Override RTCPeerConnection
        window.RTCPeerConnection = function() {
          throw new Error('WebRTC is disabled for privacy');
        };
        
        // Override getUserMedia
        if (navigator.mediaDevices) {
          navigator.mediaDevices.getUserMedia = function() {
            return Promise.reject(new Error('Media access disabled for privacy'));
          };
        }
        
        // Override legacy getUserMedia
        if (navigator.getUserMedia) {
          navigator.getUserMedia = function() {
            throw new Error('Media access disabled for privacy');
          };
        }
        
        console.log('🛡️ WebRTC blocking active');
      })();
    `;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    this.geoCache.clear();
  }
}

module.exports = { GeoProxyManager };