export interface DeviceProfile {
  id: string;
  name: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  platform: string;
  icon: string;
}

export const deviceProfiles: DeviceProfile[] = [
  {
    id: 'windows_desktop',
    name: 'Windows Desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    platform: 'Windows',
    icon: '🖥️'
  },
  {
    id: 'macos_desktop',
    name: 'macOS Desktop',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    platform: 'macOS',
    icon: '🖥️'
  },
  {
    id: 'linux_desktop',
    name: 'Linux Desktop',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    platform: 'Linux',
    icon: '🐧'
  },
  {
    id: 'android_phone',
    name: 'Android Phone',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    platform: 'Android',
    icon: '📱'
  },
  {
    id: 'iphone',
    name: 'iPhone',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'iOS',
    icon: '📱'
  },
  {
    id: 'android_tablet',
    name: 'Android Tablet',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    platform: 'Android',
    icon: '📱'
  },
  {
    id: 'smart_tv',
    name: 'Smart TV',
    userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 TV Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    platform: 'Tizen',
    icon: '📺'
  }
];

class DeviceProfileService {
  private storageKey = 'browser_automation_device_profiles';
  private selectedProfileKey = 'selected_device_profile';

  getAvailableProfiles(): DeviceProfile[] {
    return deviceProfiles;
  }

  getProfileById(id: string): DeviceProfile | undefined {
    return deviceProfiles.find(profile => profile.id === id);
  }

  getSelectedProfile(): DeviceProfile {
    const selectedId = localStorage.getItem(this.selectedProfileKey);
    return this.getProfileById(selectedId || 'windows_desktop') || deviceProfiles[0];
  }

  setSelectedProfile(profileId: string): void {
    const profile = this.getProfileById(profileId);
    if (profile) {
      localStorage.setItem(this.selectedProfileKey, profileId);
    }
  }

  createCustomProfile(profile: Omit<DeviceProfile, 'id'>): DeviceProfile {
    const customProfile: DeviceProfile = {
      ...profile,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const customProfiles = this.getCustomProfiles();
    customProfiles.push(customProfile);
    this.saveCustomProfiles(customProfiles);

    return customProfile;
  }

  getCustomProfiles(): DeviceProfile[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  private saveCustomProfiles(profiles: DeviceProfile[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(profiles));
  }

  getAllProfiles(): DeviceProfile[] {
    return [...deviceProfiles, ...this.getCustomProfiles()];
  }

  deleteCustomProfile(profileId: string): void {
    const customProfiles = this.getCustomProfiles();
    const filtered = customProfiles.filter(p => p.id !== profileId);
    this.saveCustomProfiles(filtered);
  }

  getBrowserConfig(profile: DeviceProfile) {
    return {
      userAgent: profile.userAgent,
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      isMobile: profile.isMobile,
      hasTouch: profile.hasTouch,
      platform: profile.platform
    };
  }
}

export const deviceProfileService = new DeviceProfileService();