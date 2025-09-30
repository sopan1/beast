import { DeviceProfile } from './deviceProfileService';

export interface BrowserSession {
  id: string;
  name: string;
  url: string;
  deviceProfile: DeviceProfile;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  createdAt: Date;
  lastActivity: Date;
}

export interface AutomationScript {
  id: string;
  name: string;
  description: string;
  steps: AutomationStep[];
  createdAt: Date;
}

export interface AutomationStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot' | 'scroll' | 'extract';
  selector?: string;
  value?: string;
  delay?: number;
  description: string;
}

class BrowserAutomationService {
  private sessionsKey = 'browser_automation_sessions';
  private scriptsKey = 'browser_automation_scripts';
  private activeSessions: Map<string, BrowserSession> = new Map();

  createSession(name: string, url: string, deviceProfile: DeviceProfile): BrowserSession {
    const session: BrowserSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      url,
      deviceProfile,
      status: 'idle',
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.activeSessions.set(session.id, session);
    this.saveSessions();
    return session;
  }

  getSessions(): BrowserSession[] {
    const stored = localStorage.getItem(this.sessionsKey);
    const sessions = stored ? JSON.parse(stored) : [];
    return sessions.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      lastActivity: new Date(s.lastActivity)
    }));
  }

  private saveSessions(): void {
    const sessions = Array.from(this.activeSessions.values());
    localStorage.setItem(this.sessionsKey, JSON.stringify(sessions));
  }

  async startSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    try {
      session.status = 'running';
      session.lastActivity = new Date();
      
      // In a real implementation, this would start a browser instance
      // For now, we'll simulate the browser automation
      console.log(`Starting browser session with profile: ${session.deviceProfile.name}`);
      console.log(`Navigating to: ${session.url}`);
      
      this.saveSessions();
      return { success: true, message: 'Session started successfully' };
    } catch (error) {
      session.status = 'error';
      return { success: false, message: 'Failed to start session' };
    }
  }

  async stopSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    session.status = 'idle';
    session.lastActivity = new Date();
    this.saveSessions();
    
    return { success: true, message: 'Session stopped' };
  }

  createScript(name: string, description: string): AutomationScript {
    const script: AutomationScript = {
      id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      steps: [],
      createdAt: new Date()
    };

    const scripts = this.getScripts();
    scripts.push(script);
    this.saveScripts(scripts);
    return script;
  }

  getScripts(): AutomationScript[] {
    const stored = localStorage.getItem(this.scriptsKey);
    const scripts = stored ? JSON.parse(stored) : [];
    return scripts.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt)
    }));
  }

  private saveScripts(scripts: AutomationScript[]): void {
    localStorage.setItem(this.scriptsKey, JSON.stringify(scripts));
  }

  addStepToScript(scriptId: string, step: Omit<AutomationStep, 'id'>): void {
    const scripts = this.getScripts();
    const script = scripts.find(s => s.id === scriptId);
    if (script) {
      const newStep: AutomationStep = {
        ...step,
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      script.steps.push(newStep);
      this.saveScripts(scripts);
    }
  }

  async executeScript(scriptId: string, sessionId: string): Promise<{ success: boolean; message: string }> {
    const script = this.getScripts().find(s => s.id === scriptId);
    const session = this.activeSessions.get(sessionId);

    if (!script || !session) {
      return { success: false, message: 'Script or session not found' };
    }

    try {
      session.status = 'running';
      
      // Simulate script execution
      for (const step of script.steps) {
        console.log(`Executing step: ${step.description}`);
        await new Promise(resolve => setTimeout(resolve, step.delay || 1000));
      }

      session.status = 'completed';
      session.lastActivity = new Date();
      this.saveSessions();

      return { success: true, message: 'Script executed successfully' };
    } catch (error) {
      session.status = 'error';
      return { success: false, message: 'Script execution failed' };
    }
  }

  deleteSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.saveSessions();
  }

  deleteScript(scriptId: string): void {
    const scripts = this.getScripts().filter(s => s.id !== scriptId);
    this.saveScripts(scripts);
  }
}

export const browserAutomationService = new BrowserAutomationService();