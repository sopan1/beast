// Express API endpoints for Puppeteer profile management
// Provides REST API for browser automation and testing

const express = require('express');
const { PuppeteerAntiBrowserManager, testProxyAndGetTimezone, checkWebRTCLeaks } = require('./puppeteer-browser');

class PuppeteerAPI {
  constructor(port = 3001) {
    this.app = express();
    this.port = port;
    this.manager = new PuppeteerAntiBrowserManager();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error('API Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
      });
    });
  }

  setupRoutes() {
    // Profile management endpoints
    this.app.post('/api/profiles', this.createProfile.bind(this));
    this.app.get('/api/profiles', this.getAllProfiles.bind(this));
    this.app.get('/api/profiles/:id', this.getProfile.bind(this));
    this.app.put('/api/profiles/:id', this.updateProfile.bind(this));
    this.app.delete('/api/profiles/:id', this.deleteProfile.bind(this));

    // Browser control endpoints
    this.app.post('/api/profiles/:id/launch', this.launchProfile.bind(this));
    this.app.post('/api/profiles/:id/close', this.closeProfile.bind(this));
    this.app.get('/api/profiles/:id/status', this.getProfileStatus.bind(this));

    // Proxy and testing endpoints
    this.app.post('/api/profiles/:id/proxy/test', this.testProfileProxy.bind(this));
    this.app.post('/api/proxy/test', this.testProxy.bind(this));
    this.app.post('/api/profiles/:id/webrtc/check', this.checkWebRTC.bind(this));

    // RPA automation endpoints
    this.app.post('/api/profiles/:id/run-rpa', this.runRPAScript.bind(this));
    this.app.post('/api/profiles/:id/process-links', this.processLinks.bind(this));

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        success: true, 
        message: 'Puppeteer API is running',
        timestamp: new Date().toISOString(),
        activeProfiles: this.manager.getAllProfiles().length
      });
    });
  }

  // Profile management methods
  async createProfile(req, res) {
    try {
      const profile = {
        id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: req.body.name || 'Unnamed Profile',
        userAgent: req.body.userAgent,
        platform: req.body.platform || 'windows',
        viewport: req.body.viewport || { width: 1920, height: 1080 },
        proxy: req.body.proxy,
        timezone: req.body.timezone,
        timezoneMode: req.body.timezoneMode || 'auto', // auto, manual
        chromePath: req.body.chromePath,
        createdAt: new Date().toISOString(),
        ...req.body
      };

      // Validate required fields
      if (!profile.name) {
        return res.status(400).json({
          success: false,
          error: 'Profile name is required'
        });
      }

      res.json({
        success: true,
        profile,
        message: 'Profile created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getAllProfiles(req, res) {
    try {
      const activeProfiles = this.manager.getAllProfiles();
      res.json({
        success: true,
        profiles: activeProfiles
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getProfile(req, res) {
    try {
      const profileId = req.params.id;
      const status = this.manager.getStatus(profileId);
      
      res.json(status);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const profileId = req.params.id;
      const updates = req.body;
      
      const result = await this.manager.updateProfile(profileId, updates);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteProfile(req, res) {
    try {
      const profileId = req.params.id;
      
      // Close browser if running
      await this.manager.close(profileId);
      
      res.json({
        success: true,
        message: 'Profile deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Browser control methods
  async launchProfile(req, res) {
    try {
      const profileId = req.params.id;
      const options = req.body || {};
      
      // Create profile object from request
      const profile = {
        id: profileId,
        name: options.name || 'API Profile',
        userAgent: options.userAgent,
        platform: options.platform,
        viewport: options.viewport,
        chromePath: options.chromePath,
        ...options
      };

      const result = await this.manager.launch(profile, {
        proxy: options.proxy,
        timezone: options.timezone,
        headless: options.headless || false,
        defaultUrl: options.defaultUrl
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async closeProfile(req, res) {
    try {
      const profileId = req.params.id;
      const result = await this.manager.close(profileId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getProfileStatus(req, res) {
    try {
      const profileId = req.params.id;
      const status = this.manager.getStatus(profileId);
      res.json(status);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Proxy and testing methods
  async testProfileProxy(req, res) {
    try {
      const profileId = req.params.id;
      const status = this.manager.getStatus(profileId);
      
      if (!status.success) {
        return res.status(404).json(status);
      }

      if (!status.proxy) {
        return res.status(400).json({
          success: false,
          error: 'No proxy configured for this profile'
        });
      }

      const result = await testProxyAndGetTimezone(status.proxy);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async testProxy(req, res) {
    try {
      const proxy = req.body;
      
      if (!proxy || !proxy.host || !proxy.port) {
        return res.status(400).json({
          success: false,
          error: 'Proxy host and port are required'
        });
      }

      const result = await testProxyAndGetTimezone(proxy);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async checkWebRTC(req, res) {
    try {
      const profileId = req.params.id;
      const result = await this.manager.checkWebRTCLeaks(profileId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // RPA automation methods
  async runRPAScript(req, res) {
    try {
      const profileId = req.params.id;
      const { tasks, options = {} } = req.body;

      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({
          success: false,
          error: 'Tasks array is required'
        });
      }

      const result = await this.manager.runRPAScript(profileId, tasks, options);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async processLinks(req, res) {
    try {
      const profileId = req.params.id;
      const { links, taskFunction, options = {} } = req.body;

      if (!links || !Array.isArray(links)) {
        return res.status(400).json({
          success: false,
          error: 'Links array is required'
        });
      }

      // Convert taskFunction string to actual function if provided
      let taskFn = (page, url) => Promise.resolve({ url, processed: true });
      if (taskFunction && typeof taskFunction === 'string') {
        try {
          taskFn = new Function('page', 'url', taskFunction);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid task function'
          });
        }
      }

      const result = await this.manager.processLinks(profileId, links, taskFn, options);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Start the API server
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`Puppeteer API server running on port ${this.port}`);
          console.log(`Health check: http://localhost:${this.port}/api/health`);
          resolve(this.server);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop the API server
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Puppeteer API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export API class and create default instance
const api = new PuppeteerAPI();

module.exports = {
  PuppeteerAPI,
  api
};

// Start server if run directly
if (require.main === module) {
  api.start().catch(console.error);
}
