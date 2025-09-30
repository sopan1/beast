import { Profile } from '@/components/profiles/CreateProfileModal';

export interface UserAgentData {
  userAgent: string;
  platform: string;
  vendor: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  languages: string[];
  webgl: {
    vendor: string;
    renderer: string;
  };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  plugins: Array<{
    name: string;
    filename: string;
    description: string;
  }>;
  mimeTypes: Array<{
    type: string;
    description: string;
    suffixes: string;
  }>;
}

export interface PlatformFingerprint {
  userAgent: string;
  platform: string;
  vendor: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  languages: string[];
  webgl: {
    vendor: string;
    renderer: string;
  };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  plugins: Array<{
    name: string;
    filename: string;
    description: string;
  }>;
  mimeTypes: Array<{
    type: string;
    description: string;
    suffixes: string;
  }>;
}

export class UserAgentService {
  private static instance: UserAgentService;
  private userAgentCache: Map<string, UserAgentData> = new Map();
  private platformFingerprints: Map<string, PlatformFingerprint[]> = new Map();

  static getInstance(): UserAgentService {
    if (!UserAgentService.instance) {
      UserAgentService.instance = new UserAgentService();
    }
    return UserAgentService.instance;
  }

  constructor() {
    this.initializePlatformFingerprints();
  }

  /**
   * Get random user agent for platform with matching fingerprint
   */
  getRandomUserAgent(platform: string, profile?: Profile): UserAgentData {
    const cacheKey = `${platform}_${profile?.id || 'default'}`;
    
    if (this.userAgentCache.has(cacheKey)) {
      return this.userAgentCache.get(cacheKey)!;
    }

    const fingerprints = this.platformFingerprints.get(platform) || this.platformFingerprints.get('windows')!;
    const randomFingerprint = fingerprints[Math.floor(Math.random() * fingerprints.length)];
    
    // Add some randomization to make it unique per profile
    const randomizedFingerprint = this.randomizeFingerprint(randomFingerprint, profile);
    
    this.userAgentCache.set(cacheKey, randomizedFingerprint);
    return randomizedFingerprint;
  }

  /**
   * Get user agent for specific browser version
   */
  getUserAgentForVersion(platform: string, browser: string, version: string): UserAgentData {
    const fingerprints = this.platformFingerprints.get(platform) || this.platformFingerprints.get('windows')!;
    
    // Find fingerprint that matches browser and version
    const matchingFingerprint = fingerprints.find(fp => 
      fp.userAgent.includes(browser) && fp.userAgent.includes(version)
    );

    if (matchingFingerprint) {
      return this.randomizeFingerprint(matchingFingerprint);
    }

    // Fallback to random
    return this.getRandomUserAgent(platform);
  }

  /**
   * Get user agent for specific device model
   */
  getUserAgentForDevice(platform: string, deviceModel: string): UserAgentData {
    const fingerprints = this.platformFingerprints.get(platform) || this.platformFingerprints.get('windows')!;
    
    // Find fingerprint that matches device model
    const matchingFingerprint = fingerprints.find(fp => 
      fp.userAgent.includes(deviceModel)
    );

    if (matchingFingerprint) {
      return this.randomizeFingerprint(matchingFingerprint);
    }

    // Fallback to random
    return this.getRandomUserAgent(platform);
  }

  /**
   * Randomize fingerprint to make it unique
   */
  private randomizeFingerprint(fingerprint: PlatformFingerprint, profile?: Profile): UserAgentData {
    const seed = profile?.id ? this.stringToSeed(profile.id) : Math.random();
    const random = this.seededRandom(seed);

    return {
      ...fingerprint,
      hardwareConcurrency: this.randomizeValue(fingerprint.hardwareConcurrency, random, 0.1),
      deviceMemory: this.randomizeValue(fingerprint.deviceMemory, random, 0.2),
      screen: {
        ...fingerprint.screen,
        width: this.randomizeValue(fingerprint.screen.width, random, 0.05),
        height: this.randomizeValue(fingerprint.screen.height, random, 0.05),
        availWidth: this.randomizeValue(fingerprint.screen.availWidth, random, 0.05),
        availHeight: this.randomizeValue(fingerprint.screen.availHeight, random, 0.05)
      },
      webgl: {
        ...fingerprint.webgl,
        renderer: this.randomizeWebGLRenderer(fingerprint.webgl.renderer, random)
      }
    };
  }

  /**
   * Initialize platform-specific fingerprints
   */
  private initializePlatformFingerprints(): void {
    // Windows fingerprints
    this.platformFingerprints.set('windows', [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
        screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
        plugins: [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        mimeTypes: [
          { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf' },
          { type: 'text/pdf', description: 'Portable Document Format', suffixes: 'pdf' }
        ]
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        hardwareConcurrency: 12,
        deviceMemory: 16,
        maxTouchPoints: 0,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
        screen: { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24 },
        plugins: [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        mimeTypes: [
          { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf' }
        ]
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
        platform: 'Win32',
        vendor: '',
        hardwareConcurrency: 6,
        deviceMemory: 8,
        maxTouchPoints: 0,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Mozilla', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
        screen: { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24 },
        plugins: [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        mimeTypes: [
          { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf' }
        ]
      }
    ]);

    // macOS fingerprints
    this.platformFingerprints.set('macos', [
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel Iris Pro OpenGL Engine, OpenGL 4.1)' },
        screen: { width: 1440, height: 900, availWidth: 1440, availHeight: 877, colorDepth: 24, pixelDepth: 24 },
        plugins: [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        mimeTypes: [
          { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf' }
        ]
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        platform: 'MacIntel',
        vendor: 'Apple Computer, Inc.',
        hardwareConcurrency: 10,
        deviceMemory: 16,
        maxTouchPoints: 0,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Apple Inc.', renderer: 'Apple M1 Pro' },
        screen: { width: 1680, height: 1050, availWidth: 1680, availHeight: 1027, colorDepth: 24, pixelDepth: 24 },
        plugins: [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        mimeTypes: [
          { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf' }
        ]
      }
    ]);

    // Android fingerprints
    this.platformFingerprints.set('android', [
      {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv7l',
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 5,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 640' },
        screen: { width: 412, height: 915, availWidth: 412, availHeight: 915, colorDepth: 24, pixelDepth: 24 },
        plugins: [],
        mimeTypes: []
      },
      {
        userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv7l',
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 5,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Google Inc. (Samsung)', renderer: 'Mali-G78 MP14' },
        screen: { width: 360, height: 800, availWidth: 360, availHeight: 800, colorDepth: 24, pixelDepth: 24 },
        plugins: [],
        mimeTypes: []
      }
    ]);

    // iOS fingerprints
    this.platformFingerprints.set('ios', [
      {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        vendor: 'Apple Computer, Inc.',
        hardwareConcurrency: 6,
        deviceMemory: 6,
        maxTouchPoints: 5,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Apple Inc.', renderer: 'Apple A15 GPU' },
        screen: { width: 430, height: 932, availWidth: 430, availHeight: 932, colorDepth: 24, pixelDepth: 24 },
        plugins: [],
        mimeTypes: []
      },
      {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        vendor: 'Apple Computer, Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 5,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Apple Inc.', renderer: 'Apple M1 GPU' },
        screen: { width: 820, height: 1180, availWidth: 820, availHeight: 1180, colorDepth: 24, pixelDepth: 24 },
        plugins: [],
        mimeTypes: []
      }
    ]);

    // Linux fingerprints
    this.platformFingerprints.set('linux', [
      {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        vendor: 'Google Inc.',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 OpenGL 4.6.0 NVIDIA 470.86)' },
        screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
        plugins: [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        mimeTypes: [
          { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf' }
        ]
      }
    ]);

    // TV fingerprints
    this.platformFingerprints.set('tv', [
      {
        userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.0 TV Safari/537.36',
        platform: 'Linux armv7l',
        vendor: 'Google Inc.',
        hardwareConcurrency: 4,
        deviceMemory: 4,
        maxTouchPoints: 0,
        languages: ['en-US', 'en'],
        webgl: { vendor: 'Google Inc. (ARM)', renderer: 'Mali-G52 MC1' },
        screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1080, colorDepth: 24, pixelDepth: 24 },
        plugins: [],
        mimeTypes: []
      }
    ]);
  }

  /**
   * Convert string to seed for consistent randomization
   */
  private stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  /**
   * Randomize value within percentage range
   */
  private randomizeValue(value: number, random: () => number, variance: number): number {
    const min = Math.floor(value * (1 - variance));
    const max = Math.ceil(value * (1 + variance));
    return Math.floor(min + random() * (max - min));
  }

  /**
   * Randomize WebGL renderer string
   */
  private randomizeWebGLRenderer(renderer: string, random: () => number): string {
    // Add slight variations to WebGL renderer strings
    if (renderer.includes('NVIDIA')) {
      const gpuModels = ['RTX 3060', 'RTX 3070', 'RTX 3080', 'GTX 1660', 'GTX 1060'];
      const randomModel = gpuModels[Math.floor(random() * gpuModels.length)];
      return renderer.replace(/RTX \d+|GTX \d+/, randomModel);
    }
    
    if (renderer.includes('AMD')) {
      const gpuModels = ['RX 6600', 'RX 6700', 'RX 6800', 'RX 580', 'RX 570'];
      const randomModel = gpuModels[Math.floor(random() * gpuModels.length)];
      return renderer.replace(/RX \d+/, randomModel);
    }
    
    return renderer;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.userAgentCache.clear();
  }

  /**
   * Get all available platforms
   */
  getAvailablePlatforms(): string[] {
    return Array.from(this.platformFingerprints.keys());
  }

  /**
   * Get fingerprints for platform
   */
  getPlatformFingerprints(platform: string): PlatformFingerprint[] {
    return this.platformFingerprints.get(platform) || [];
  }

  /**
   * Validate user agent string
   */
  validateUserAgent(userAgent: string): boolean {
    // Basic validation for user agent format
    const uaPattern = /^Mozilla\/5\.0 \([^)]+\) AppleWebKit\/[0-9.]+ \(KHTML, like Gecko\)/;
    return uaPattern.test(userAgent);
  }

  /**
   * Extract browser info from user agent
   */
  extractBrowserInfo(userAgent: string): { browser: string; version: string; platform: string } {
    const browserInfo = {
      browser: 'Unknown',
      version: 'Unknown',
      platform: 'Unknown'
    };

    // Extract Chrome version
    const chromeMatch = userAgent.match(/Chrome\/([0-9.]+)/);
    if (chromeMatch) {
      browserInfo.browser = 'Chrome';
      browserInfo.version = chromeMatch[1];
    }

    // Extract Firefox version
    const firefoxMatch = userAgent.match(/Firefox\/([0-9.]+)/);
    if (firefoxMatch) {
      browserInfo.browser = 'Firefox';
      browserInfo.version = firefoxMatch[1];
    }

    // Extract Safari version
    const safariMatch = userAgent.match(/Version\/([0-9.]+).*Safari/);
    if (safariMatch) {
      browserInfo.browser = 'Safari';
      browserInfo.version = safariMatch[1];
    }

    // Extract Edge version
    const edgeMatch = userAgent.match(/Edg\/([0-9.]+)/);
    if (edgeMatch) {
      browserInfo.browser = 'Edge';
      browserInfo.version = edgeMatch[1];
    }

    // Extract platform
    if (userAgent.includes('Windows')) {
      browserInfo.platform = 'Windows';
    } else if (userAgent.includes('Macintosh')) {
      browserInfo.platform = 'macOS';
    } else if (userAgent.includes('Linux')) {
      browserInfo.platform = 'Linux';
    } else if (userAgent.includes('iPhone')) {
      browserInfo.platform = 'iOS';
    } else if (userAgent.includes('Android')) {
      browserInfo.platform = 'Android';
    }

    return browserInfo;
  }
}

export const userAgentService = UserAgentService.getInstance();

