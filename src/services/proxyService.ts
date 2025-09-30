import { ProxyConfig } from '@/data/fingerprints';

export class ProxyService {
  private static instance: ProxyService;
  
  static getInstance(): ProxyService {
    if (!ProxyService.instance) {
      ProxyService.instance = new ProxyService();
    }
    return ProxyService.instance;
  }

  // Get all saved proxies from localStorage
  getSavedProxies(): ProxyConfig[] {
    try {
      const savedProxies = localStorage.getItem('antidetect_proxies');
      if (savedProxies) {
        const parsed = JSON.parse(savedProxies);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error('Failed to load saved proxies:', error);
      return [];
    }
  }

  // Get only active/working proxies
  getActiveProxies(): ProxyConfig[] {
    return this.getSavedProxies().filter(proxy => proxy.status === 'active');
  }

  // Get proxies by type
  getProxiesByType(type: 'HTTP' | 'HTTPS' | 'SOCKS5'): ProxyConfig[] {
    return this.getSavedProxies().filter(proxy => proxy.type === type);
  }

  // Save proxies to localStorage
  saveProxies(proxies: ProxyConfig[]): void {
    try {
      localStorage.setItem('antidetect_proxies', JSON.stringify(proxies));
    } catch (error) {
      console.error('Failed to save proxies:', error);
    }
  }

  // Add a new proxy
  addProxy(proxy: Omit<ProxyConfig, 'id'>): ProxyConfig {
    const newProxy: ProxyConfig = {
      ...proxy,
      id: `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const existingProxies = this.getSavedProxies();
    const updatedProxies = [...existingProxies, newProxy];
    this.saveProxies(updatedProxies);
    
    return newProxy;
  }

  // Update proxy status
  updateProxyStatus(proxyId: string, status: 'active' | 'inactive'): void {
    const proxies = this.getSavedProxies();
    const updatedProxies = proxies.map(proxy => 
      proxy.id === proxyId ? { ...proxy, status } : proxy
    );
    this.saveProxies(updatedProxies);
  }

  // Delete proxy
  deleteProxy(proxyId: string): void {
    const proxies = this.getSavedProxies();
    const updatedProxies = proxies.filter(proxy => proxy.id !== proxyId);
    this.saveProxies(updatedProxies);
  }

  // Get proxy statistics
  getProxyStats(): { total: number; active: number; inactive: number; byType: Record<string, number> } {
    const proxies = this.getSavedProxies();
    const active = proxies.filter(p => p.status === 'active').length;
    const inactive = proxies.filter(p => p.status === 'inactive').length;
    
    const byType = proxies.reduce((acc, proxy) => {
      acc[proxy.type] = (acc[proxy.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: proxies.length,
      active,
      inactive,
      byType
    };
  }
}

export const proxyService = ProxyService.getInstance();