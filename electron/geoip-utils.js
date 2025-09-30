// GeoIP to timezone mapping utility
const geoip = require('geoip-lite');

// Comprehensive timezone mapping based on country and region
const TIMEZONE_MAP = {
  // North America
  'US': {
    'CA': 'America/Los_Angeles',
    'NV': 'America/Los_Angeles', 
    'OR': 'America/Los_Angeles',
    'WA': 'America/Los_Angeles',
    'AZ': 'America/Phoenix',
    'MT': 'America/Denver',
    'CO': 'America/Denver',
    'UT': 'America/Denver',
    'WY': 'America/Denver',
    'NM': 'America/Denver',
    'ND': 'America/Denver',
    'SD': 'America/Denver',
    'NE': 'America/Denver',
    'KS': 'America/Denver',
    'OK': 'America/Denver',
    'TX': 'America/Chicago',
    'MN': 'America/Chicago',
    'IA': 'America/Chicago',
    'MO': 'America/Chicago',
    'AR': 'America/Chicago',
    'LA': 'America/Chicago',
    'MS': 'America/Chicago',
    'AL': 'America/Chicago',
    'TN': 'America/Chicago',
    'KY': 'America/Chicago',
    'IN': 'America/Chicago',
    'IL': 'America/Chicago',
    'WI': 'America/Chicago',
    'MI': 'America/New_York',
    'OH': 'America/New_York',
    'WV': 'America/New_York',
    'VA': 'America/New_York',
    'NC': 'America/New_York',
    'SC': 'America/New_York',
    'GA': 'America/New_York',
    'FL': 'America/New_York',
    'PA': 'America/New_York',
    'NY': 'America/New_York',
    'VT': 'America/New_York',
    'NH': 'America/New_York',
    'ME': 'America/New_York',
    'MA': 'America/New_York',
    'RI': 'America/New_York',
    'CT': 'America/New_York',
    'NJ': 'America/New_York',
    'DE': 'America/New_York',
    'MD': 'America/New_York',
    'DC': 'America/New_York',
    'AK': 'America/Anchorage',
    'HI': 'Pacific/Honolulu'
  },
  'CA': {
    'BC': 'America/Vancouver',
    'AB': 'America/Edmonton', 
    'SK': 'America/Regina',
    'MB': 'America/Winnipeg',
    'ON': 'America/Toronto',
    'QC': 'America/Montreal',
    'NB': 'America/Moncton',
    'NS': 'America/Halifax',
    'PE': 'America/Halifax',
    'NL': 'America/St_Johns',
    'YT': 'America/Whitehorse',
    'NT': 'America/Yellowknife',
    'NU': 'America/Iqaluit'
  },
  'MX': 'America/Mexico_City',
  
  // Europe
  'GB': 'Europe/London',
  'IE': 'Europe/Dublin', 
  'FR': 'Europe/Paris',
  'DE': 'Europe/Berlin',
  'IT': 'Europe/Rome',
  'ES': 'Europe/Madrid',
  'PT': 'Europe/Lisbon',
  'NL': 'Europe/Amsterdam',
  'BE': 'Europe/Brussels',
  'CH': 'Europe/Zurich',
  'AT': 'Europe/Vienna',
  'PL': 'Europe/Warsaw',
  'CZ': 'Europe/Prague',
  'SK': 'Europe/Bratislava',
  'HU': 'Europe/Budapest',
  'RO': 'Europe/Bucharest',
  'BG': 'Europe/Sofia',
  'GR': 'Europe/Athens',
  'SE': 'Europe/Stockholm',
  'NO': 'Europe/Oslo',
  'DK': 'Europe/Copenhagen',
  'FI': 'Europe/Helsinki',
  'RU': 'Europe/Moscow',
  'UA': 'Europe/Kiev',
  'TR': 'Europe/Istanbul',
  
  // Asia
  'JP': 'Asia/Tokyo',
  'KR': 'Asia/Seoul',
  'CN': 'Asia/Shanghai',
  'TW': 'Asia/Taipei',
  'HK': 'Asia/Hong_Kong',
  'SG': 'Asia/Singapore',
  'MY': 'Asia/Kuala_Lumpur',
  'TH': 'Asia/Bangkok',
  'VN': 'Asia/Ho_Chi_Minh',
  'PH': 'Asia/Manila',
  'ID': 'Asia/Jakarta',
  'IN': 'Asia/Kolkata',
  'PK': 'Asia/Karachi',
  'BD': 'Asia/Dhaka',
  'AE': 'Asia/Dubai',
  'SA': 'Asia/Riyadh',
  'IL': 'Asia/Jerusalem',
  
  // Oceania
  'AU': {
    'WA': 'Australia/Perth',
    'SA': 'Australia/Adelaide',
    'NT': 'Australia/Darwin',
    'QLD': 'Australia/Brisbane',
    'NSW': 'Australia/Sydney',
    'VIC': 'Australia/Melbourne',
    'TAS': 'Australia/Hobart'
  },
  'NZ': 'Pacific/Auckland',
  
  // South America
  'BR': 'America/Sao_Paulo',
  'AR': 'America/Argentina/Buenos_Aires',
  'CL': 'America/Santiago',
  'CO': 'America/Bogota',
  'PE': 'America/Lima',
  'VE': 'America/Caracas',
  
  // Africa
  'ZA': 'Africa/Johannesburg',
  'EG': 'Africa/Cairo',
  'NG': 'Africa/Lagos',
  'KE': 'Africa/Nairobi',
  'MA': 'Africa/Casablanca'
};

/**
 * Get timezone for IP address using GeoIP lookup
 * @param {string} ip - IP address to lookup
 * @returns {string|null} IANA timezone string or null if not found
 */
function getTimezoneForIp(ip) {
  try {
    const geo = geoip.lookup(ip);
    if (!geo) return null;
    
    const country = geo.country;
    const region = geo.region;
    
    const mapping = TIMEZONE_MAP[country];
    if (!mapping) return null;
    
    // If mapping is an object (like US states), look up by region
    if (typeof mapping === 'object') {
      return mapping[region] || Object.values(mapping)[0]; // fallback to first timezone
    }
    
    // If mapping is a string, return directly
    return mapping;
  } catch (error) {
    console.error('GeoIP lookup failed:', error);
    return null;
  }
}

/**
 * Get timezone offset in minutes for a given timezone
 * @param {string} timezone - IANA timezone string
 * @returns {number} Offset in minutes from UTC
 */
function getTimezoneOffset(timezone) {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const target = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (utc.getTime() - target.getTime()) / (1000 * 60);
  } catch (error) {
    console.error('Timezone offset calculation failed:', error);
    return 0;
  }
}

/**
 * Get locale string for timezone
 * @param {string} timezone - IANA timezone string
 * @returns {string} Locale string (e.g., 'en-US')
 */
function getLocaleForTimezone(timezone) {
  const localeMap = {
    'Europe/London': 'en-GB',
    'Europe/Berlin': 'de-DE',
    'Europe/Paris': 'fr-FR',
    'Europe/Madrid': 'es-ES',
    'Europe/Rome': 'it-IT',
    'Europe/Lisbon': 'pt-PT',
    'Europe/Warsaw': 'pl-PL',
    'Europe/Amsterdam': 'nl-NL',
    'Europe/Brussels': 'nl-BE',
    'Europe/Prague': 'cs-CZ',
    'Europe/Athens': 'el-GR',
    'Europe/Bucharest': 'ro-RO',
    'Europe/Sofia': 'bg-BG',
    'Europe/Stockholm': 'sv-SE',
    'Europe/Helsinki': 'fi-FI',
    'Europe/Copenhagen': 'da-DK',
    'Europe/Dublin': 'en-IE',
    'Asia/Tokyo': 'ja-JP',
    'Asia/Seoul': 'ko-KR',
    'Asia/Shanghai': 'zh-CN',
    'Asia/Taipei': 'zh-TW',
    'Asia/Hong_Kong': 'zh-HK',
    'Asia/Singapore': 'en-SG',
    'Asia/Kolkata': 'en-IN',
    'Asia/Dubai': 'ar-AE',
    'America/New_York': 'en-US',
    'America/Chicago': 'en-US',
    'America/Los_Angeles': 'en-US',
    'America/Toronto': 'en-CA',
    'America/Vancouver': 'en-CA',
    'America/Sao_Paulo': 'pt-BR',
    'America/Mexico_City': 'es-MX',
    'Australia/Sydney': 'en-AU',
    'Pacific/Auckland': 'en-NZ'
  };
  
  return localeMap[timezone] || 'en-US';
}

/**
 * Test proxy and get IP information
 * @param {Object} proxy - Proxy configuration
 * @returns {Promise<Object>} IP information with timezone
 */
async function testProxyAndGetTimezone(proxy) {
  const fetch = require('node-fetch');
  const { HttpsProxyAgent } = require('https-proxy-agent');
  const { SocksProxyAgent } = require('socks-proxy-agent');
  
  try {
    let agent;
    if (proxy.type === 'socks5' || proxy.type === 'socks') {
      const proxyUrl = `socks5://${proxy.username ? `${proxy.username}:${proxy.password}@` : ''}${proxy.host}:${proxy.port}`;
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      const proxyUrl = `http://${proxy.username ? `${proxy.username}:${proxy.password}@` : ''}${proxy.host}:${proxy.port}`;
      agent = new HttpsProxyAgent(proxyUrl);
    }
    
    const response = await fetch('https://api.ipify.org?format=json', {
      agent,
      timeout: 10000
    });
    
    const data = await response.json();
    const ip = data.ip;
    const timezone = getTimezoneForIp(ip);
    const locale = getLocaleForTimezone(timezone);
    const offset = getTimezoneOffset(timezone);
    
    return {
      success: true,
      ip,
      timezone,
      locale,
      offset,
      country: geoip.lookup(ip)?.country || 'Unknown',
      region: geoip.lookup(ip)?.region || 'Unknown'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getTimezoneForIp,
  getTimezoneOffset,
  getLocaleForTimezone,
  testProxyAndGetTimezone
};
