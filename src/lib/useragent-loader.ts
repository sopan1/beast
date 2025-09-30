export type PlatformType = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'tv';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface UserAgentInfo {
  userAgent: string;
  platform: PlatformType;
  device: DeviceType;
  browser: string;
  version: string;
}

export class UserAgentLoader {
  private cache = new Map<PlatformType, string[]>();
  private loaded = new Set<PlatformType>();
  
  private readonly PLATFORM_FILES: Record<PlatformType, string> = {
    windows: '/useragents/windows.json',
    macos: '/useragents/macos.json',
    linux: '/useragents/linux.json',
    ios: '/useragents/ios.json',
    android: '/useragents/android.json',
    tv: '/useragents/tv.json'
  };

  async loadUserAgents(platform: PlatformType): Promise<string[]> {
    // Return cached data if available
    if (this.cache.has(platform)) {
      return this.cache.get(platform)!;
    }

    try {
      // In Electron environment, we need to load from the file system
      if (typeof window === 'undefined' || !window.fetch) {
        // Server-side or Node.js environment
        const fs = require('fs');
        const path = require('path');
        
        // Get the user agents directory path
        const userAgentsDir = path.join(__dirname, '../../useragents');
        const filePath = path.join(userAgentsDir, `${platform}.json`);
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const userAgents: string[] = JSON.parse(fileContent);
          
          // Validate that we got an array
          if (!Array.isArray(userAgents)) {
            throw new Error('Invalid user agent file format');
          }

          // Cache the results
          this.cache.set(platform, userAgents);
          this.loaded.add(platform);

          console.log(`✅ Loaded ${userAgents.length} user agents for ${platform} from file system`);
          return userAgents;
        } else {
          throw new Error(`User agent file not found: ${filePath}`);
        }
      } else {
        // Client-side environment (Electron renderer)
        if (typeof window !== 'undefined' && (window as any).electronAPI?.loadUserAgents) {
          const userAgents: string[] = await (window as any).electronAPI.loadUserAgents(platform);

          // Validate that we got an array
          if (!Array.isArray(userAgents)) {
            throw new Error('Invalid user agent file format');
          }

          // Cache the results
          this.cache.set(platform, userAgents);
          this.loaded.add(platform);

          console.log(`✅ Loaded ${userAgents.length} user agents for ${platform} from Electron API`);
          return userAgents;
        } else {
          // Fallback for non-Electron environments
          console.warn(`⚠️ Electron API not available, using fallback user agents for ${platform}`);
          const fallback = this.getFallbackUserAgents(platform);
          this.cache.set(platform, fallback);
          return fallback;
        }
      }
    } catch (error) {
      console.error(`Failed to load user agents for ${platform}:`, error);
      
      // Return fallback user agents
      const fallback = this.getFallbackUserAgents(platform);
      this.cache.set(platform, fallback);
      return fallback;
    }
  }

  async loadAllUserAgents(): Promise<Record<PlatformType, string[]>> {
    const results: Record<PlatformType, string[]> = {} as any;
    
    const platforms: PlatformType[] = ['windows', 'macos', 'linux', 'ios', 'android', 'tv'];
    
    await Promise.all(
      platforms.map(async (platform) => {
        results[platform] = await this.loadUserAgents(platform);
      })
    );

    return results;
  }

  getRandomUserAgent(platform: PlatformType): string {
    const userAgents = this.cache.get(platform);
    if (!userAgents || userAgents.length === 0) {
      return this.getFallbackUserAgents(platform)[0];
    }

    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  getRandomUserAgentByDevice(deviceType: DeviceType): string {
    let platforms: PlatformType[];
    
    switch (deviceType) {
      case 'desktop':
        platforms = ['windows', 'macos', 'linux'];
        break;
      case 'mobile':
        platforms = ['ios', 'android'];
        break;
      case 'tablet':
        platforms = ['ios', 'android'];
        break;
      default:
        platforms = ['windows', 'macos', 'linux'];
    }

    const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
    return this.getRandomUserAgent(randomPlatform);
  }

  parseUserAgent(userAgent: string): UserAgentInfo {
    const platform = this.detectPlatform(userAgent);
    const device = this.detectDevice(userAgent);
    const browser = this.detectBrowser(userAgent);
    const version = this.detectVersion(userAgent, browser);

    return {
      userAgent,
      platform,
      device,
      browser,
      version
    };
  }

  private detectPlatform(userAgent: string): PlatformType {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64')) {
      return 'windows';
    }
    if (ua.includes('macintosh') || ua.includes('mac os x')) {
      return 'macos';
    }
    if (ua.includes('linux') && !ua.includes('android')) {
      return 'linux';
    }
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return 'ios';
    }
    if (ua.includes('android')) {
      return 'android';
    }
    if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('tizen') || ua.includes('webos')) {
      return 'tv';
    }
    
    return 'windows'; // Default fallback
  }

  private detectDevice(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    if (ua.includes('smart-tv') || ua.includes('smarttv')) {
      return 'desktop'; // TVs are treated as desktop for our purposes
    }
    
    return 'desktop';
  }

  private detectBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
    if (ua.includes('firefox/')) return 'Firefox';
    if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
    if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';
    
    return 'Unknown';
  }

  private detectVersion(userAgent: string, browser: string): string {
    try {
      const patterns: Record<string, RegExp> = {
        Chrome: /chrome\/(\d+\.\d+\.\d+\.\d+)/i,
        Firefox: /firefox\/(\d+\.\d+)/i,
        Safari: /version\/(\d+\.\d+)/i,
        Edge: /edg\/(\d+\.\d+\.\d+\.\d+)/i,
        Opera: /(?:opera|opr)\/(\d+\.\d+)/i
      };

      const pattern = patterns[browser];
      if (pattern) {
        const match = userAgent.match(pattern);
        return match ? match[1] : 'Unknown';
      }
    } catch (error) {
      console.warn('Failed to detect browser version:', error);
    }
    
    return 'Unknown';
  }

  private getFallbackUserAgents(platform: PlatformType): string[] {
    const fallbacks: Record<PlatformType, string[]> = {
      windows: [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
      ],
      macos: [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
      ],
      linux: [
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0"
      ],
      ios: [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1"
      ],
      android: [
        "Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36"
      ],
      tv: [
        "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.0 TV Safari/537.36",
        "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager"
      ]
    };

    return fallbacks[platform] || fallbacks.windows;
  }

  // Bulk upload functionality
  async uploadUserAgents(platform: PlatformType, userAgents: string[]): Promise<boolean> {
    try {
      // Validate user agents
      const validUserAgents = userAgents.filter(ua => 
        typeof ua === 'string' && 
        ua.trim().length > 0 && 
        ua.includes('Mozilla')
      );

      if (validUserAgents.length === 0) {
        throw new Error('No valid user agents provided');
      }

      // Update cache
      this.cache.set(platform, validUserAgents);
      this.loaded.add(platform);

      console.log(`📁 Uploaded ${validUserAgents.length} user agents for ${platform}`);
      return true;
    } catch (error) {
      console.error(`Failed to upload user agents for ${platform}:`, error);
      return false;
    }
  }

  // Get statistics
  getStats(): Record<PlatformType, number> {
    const stats: Record<PlatformType, number> = {} as any;
    
    for (const platform of Object.keys(this.PLATFORM_FILES) as PlatformType[]) {
      stats[platform] = this.cache.get(platform)?.length || 0;
    }
    
    return stats;
  }

  // Clear cache
  clearCache(platform?: PlatformType): void {
    if (platform) {
      this.cache.delete(platform);
      this.loaded.delete(platform);
    } else {
      this.cache.clear();
      this.loaded.clear();
    }
  }

  // Check if platform is loaded
  isLoaded(platform: PlatformType): boolean {
    return this.loaded.has(platform);
  }
}

export const userAgentLoader = new UserAgentLoader();