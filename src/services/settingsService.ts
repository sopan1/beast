export interface GlobalSettings {
  browserPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  autoSaveProfiles: boolean;
  maxConcurrentBrowsers: number;
  defaultTimeout: number;
  antiDetection: {
    patchWebDriver: boolean;
    spoofWebGL: boolean;
    spoofCanvas: boolean;
    spoofAudioContext: boolean;
    blockWebRTC: boolean;
    spoofTimezone: boolean;
    randomizeViewport: boolean;
    spoofLanguages: boolean;
    spoofPlugins: boolean;
    spoofFonts: boolean;
  };
  proxy: {
    defaultType: 'HTTP' | 'HTTPS' | 'SOCKS5';
    rotationEnabled: boolean;
    rotationInterval: number;
    validateOnAdd: boolean;
    timeoutSeconds: number;
  };
  performance: {
    disableImages: boolean;
    disableCSS: boolean;
    disableJavaScript: boolean;
    enableCache: boolean;
    maxMemoryUsage: number;
  };
  ui: {
    showWelcomePage: boolean;
  };
}

export class SettingsService {
  private static instance: SettingsService;
  private settings: GlobalSettings;

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
  }

  private getDefaultSettings(): GlobalSettings {
    return {
      browserPath: '',
      logLevel: 'info',
      autoSaveProfiles: true,
      maxConcurrentBrowsers: 10,
      defaultTimeout: 30000,
      antiDetection: {
        patchWebDriver: true,
        spoofWebGL: true,
        spoofCanvas: true,
        spoofAudioContext: true,
        blockWebRTC: true,
        spoofTimezone: true,
        randomizeViewport: true,
        spoofLanguages: true,
        spoofPlugins: true,
        spoofFonts: true,
      },
      proxy: {
        defaultType: 'HTTP',
        rotationEnabled: false,
        rotationInterval: 300,
        validateOnAdd: true,
        timeoutSeconds: 10,
      },
      performance: {
        disableImages: false,
        disableCSS: false,
        disableJavaScript: false,
        enableCache: true,
        maxMemoryUsage: 2048,
      },
      ui: {
        showWelcomePage: true
      }
    };
  }

  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem('antidetect_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.settings = { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getSettings(): GlobalSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<GlobalSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('antidetect_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  // Get specific setting values for profile creation
  getDefaultTimezone(): string {
    return 'auto'; // Based on system timezone
  }

  getDefaultLocale(): string {
    return 'en-US';
  }

  getDefaultProxyType(): 'HTTP' | 'HTTPS' | 'SOCKS5' {
    return this.settings.proxy.defaultType;
  }

  shouldValidateProxiesOnAdd(): boolean {
    return this.settings.proxy.validateOnAdd;
  }
}

export const settingsService = SettingsService.getInstance();