export interface Fingerprint {
  userAgent: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  navigator: {
    platform: string;
    language: string;
    languages: string[];
    cookieEnabled: boolean;
    doNotTrack: string;
    hardwareConcurrency: number;
    deviceMemory: number;
    maxTouchPoints: number;
  };
  timezone: string;
  canvas: string;
  webgl: string;
  audio: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  touchSupport: boolean;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export interface Platform {
  name: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'tv';
  userAgents: string[];
  screens: Array<{ width: number; height: number }>;
  languages: string[];
  platforms: string[];
}

export class FingerprintGenerator {
  private platforms: Record<string, Platform> = {
    windows: {
      name: 'windows',
      userAgents: [], // Will be loaded from JSON files
      screens: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 },
        { width: 1440, height: 900 },
        { width: 1680, height: 1050 },
        { width: 3840, height: 2160 }
      ],
      languages: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'ru-RU'],
      platforms: ['Win32', 'Win64']
    },
    macos: {
      name: 'macos',
      userAgents: [],
      screens: [
        { width: 1440, height: 900 },
        { width: 1680, height: 1050 },
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 },
        { width: 2880, height: 1800 }
      ],
      languages: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'ja-JP'],
      platforms: ['MacIntel']
    },
    linux: {
      name: 'linux',
      userAgents: [],
      screens: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 },
        { width: 1600, height: 900 },
        { width: 1280, height: 1024 }
      ],
      languages: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ru-RU', 'zh-CN'],
      platforms: ['Linux x86_64', 'Linux i686']
    },
    ios: {
      name: 'ios',
      userAgents: [],
      screens: [
        { width: 375, height: 667 }, // iPhone SE
        { width: 414, height: 896 }, // iPhone 11
        { width: 390, height: 844 }, // iPhone 12/13
        { width: 393, height: 852 }, // iPhone 14
        { width: 768, height: 1024 }, // iPad
        { width: 834, height: 1194 }, // iPad Pro 11"
        { width: 1024, height: 1366 }  // iPad Pro 12.9"
      ],
      languages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'],
      platforms: ['iPhone', 'iPad']
    },
    android: {
      name: 'android',
      userAgents: [],
      screens: [
        { width: 360, height: 640 },
        { width: 375, height: 667 },
        { width: 414, height: 896 },
        { width: 393, height: 851 },
        { width: 412, height: 915 },
        { width: 768, height: 1024 }, // Tablet
        { width: 800, height: 1280 }  // Tablet
      ],
      languages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'pt-BR', 'hi-IN', 'zh-CN'],
      platforms: ['Linux armv7l', 'Linux aarch64']
    },
    tv: {
      name: 'tv',
      userAgents: [],
      screens: [
        { width: 1920, height: 1080 },
        { width: 3840, height: 2160 },
        { width: 1280, height: 720 }
      ],
      languages: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ja-JP'],
      platforms: ['SmartTV']
    }
  };

  constructor() {
    this.loadUserAgents();
  }

  private async loadUserAgents() {
    // Load user agents from JSON files
    for (const platformName of Object.keys(this.platforms)) {
      try {
        const response = await fetch(`/useragents/${platformName}.json`);
        if (response.ok) {
          const userAgents = await response.json();
          this.platforms[platformName].userAgents = userAgents;
        }
      } catch (error) {
        console.warn(`Failed to load user agents for ${platformName}:`, error);
        // Keep default empty array
      }
    }
  }

  generateRandomFingerprint(
    platformName?: string,
    deviceType?: 'desktop' | 'mobile' | 'tablet'
  ): Fingerprint {
    // Select platform
    const availablePlatforms = Object.keys(this.platforms);
    const selectedPlatformName = platformName || this.getRandomElement(availablePlatforms);
    const platform = this.platforms[selectedPlatformName];

    if (!platform) {
      throw new Error(`Unknown platform: ${selectedPlatformName}`);
    }

    // Determine device type based on platform if not specified
    let finalDeviceType = deviceType;
    if (!finalDeviceType) {
      if (platform.name === 'ios' || platform.name === 'android') {
        finalDeviceType = Math.random() > 0.7 ? 'tablet' : 'mobile';
      } else {
        finalDeviceType = 'desktop';
      }
    }

    // Select user agent
    const userAgent = platform.userAgents.length > 0 
      ? this.getRandomElement(platform.userAgents)
      : this.getDefaultUserAgent(platform.name);

    // Select screen resolution
    const screen = this.getRandomElement(platform.screens);
    const screenVariation = {
      width: screen.width + this.getRandomInt(-10, 10),
      height: screen.height + this.getRandomInt(-10, 10),
      colorDepth: this.getRandomElement([24, 32]),
      pixelRatio: finalDeviceType === 'mobile' ? this.getRandomFloat(1.5, 3.0) : this.getRandomFloat(1.0, 2.0)
    };

    // Generate navigator properties
    const navigator = {
      platform: this.getRandomElement(platform.platforms),
      language: this.getRandomElement(platform.languages),
      languages: this.generateLanguageArray(platform.languages),
      cookieEnabled: true,
      doNotTrack: this.getRandomElement(['1', '0', 'unspecified']),
      hardwareConcurrency: this.getRandomInt(2, 16),
      deviceMemory: Math.pow(2, this.getRandomInt(2, 6)), // 4GB to 64GB
      maxTouchPoints: finalDeviceType === 'desktop' ? 0 : this.getRandomInt(1, 10)
    };

    // Generate unique hashes
    const canvas = this.generateCanvasHash();
    const webgl = this.generateWebGLHash();
    const audio = this.generateAudioHash();

    // Generate timezone (will be overridden if proxy timezone is detected)
    const timezone = this.getRandomTimezone();

    // Generate connection info for mobile devices
    const connection = finalDeviceType !== 'desktop' ? {
      effectiveType: this.getRandomElement(['slow-2g', '2g', '3g', '4g']),
      downlink: this.getRandomFloat(0.5, 10.0),
      rtt: this.getRandomInt(50, 300)
    } : undefined;

    return {
      userAgent,
      screen: screenVariation,
      navigator,
      timezone,
      canvas,
      webgl,
      audio,
      deviceType: finalDeviceType,
      touchSupport: finalDeviceType !== 'desktop',
      connection
    };
  }

  private getDefaultUserAgent(platform: string): string {
    const defaults: Record<string, string> = {
      windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
      android: "Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      tv: "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.0 TV Safari/537.36"
    };
    return defaults[platform] || defaults.windows;
  }

  private generateLanguageArray(availableLanguages: string[]): string[] {
    const primary = this.getRandomElement(availableLanguages);
    const secondary = availableLanguages.filter(lang => lang !== primary);
    const result = [primary];
    
    // Add 0-2 additional languages
    const additionalCount = this.getRandomInt(0, 3);
    for (let i = 0; i < additionalCount && secondary.length > 0; i++) {
      const lang = this.getRandomElement(secondary);
      result.push(lang);
      secondary.splice(secondary.indexOf(lang), 1);
    }
    
    return result;
  }

  private generateCanvasHash(): string {
    // Generate a unique canvas fingerprint hash
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 32; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }

  private generateWebGLHash(): string {
    // Generate a unique WebGL fingerprint hash
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 32; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }

  private generateAudioHash(): string {
    // Generate a unique audio context fingerprint hash
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 32; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }

  private getRandomTimezone(): string {
    const timezones = [
      'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
      'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
    ];
    return this.getRandomElement(timezones);
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  // Generate multiple unique fingerprints
  generateBulkFingerprints(
    count: number,
    platformName?: string,
    deviceType?: 'desktop' | 'mobile' | 'tablet'
  ): Fingerprint[] {
    const fingerprints: Fingerprint[] = [];
    const usedHashes = new Set<string>();

    for (let i = 0; i < count; i++) {
      let fingerprint: Fingerprint;
      let attempts = 0;
      
      do {
        fingerprint = this.generateRandomFingerprint(platformName, deviceType);
        attempts++;
        
        // Create a unique identifier for this fingerprint
        const fingerprintId = `${fingerprint.canvas}-${fingerprint.webgl}-${fingerprint.audio}`;
        
        if (!usedHashes.has(fingerprintId) || attempts > 10) {
          usedHashes.add(fingerprintId);
          break;
        }
      } while (attempts <= 10);
      
      fingerprints.push(fingerprint);
    }

    return fingerprints;
  }
}

export const fingerprintGenerator = new FingerprintGenerator();

// Export wrapper function for compatibility
export const getRandomFingerprint = (profile: any) => {
  return fingerprintGenerator.generateRandomFingerprint(
    profile.userAgentPlatform || 'windows',
    profile.deviceType || 'desktop'
  );
};