const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const log = require('electron-log');

class EnhancedProxyManager {
  constructor() {
    this.activeServers = new Map();
    this.proxyConnections = new Map();
  }

  // Enhanced proxy normalization with better error handling
  normalizeProxy(input, type = 'socks5') {
    if (!input || typeof input !== 'string') {
      throw new Error("Empty or invalid proxy input");
    }
    
    // Clean the input
    input = input.trim();
    
    // Already normalized URL format
    if (/^(http|https|socks5|socks4):\/\//i.test(input)) {
      return input;
    }

    const parts = input.split(':');
    if (parts.length === 4) {
      // host:port:username:password format
      const [host, port, username, password] = parts;
      if (!host || !port || !username || !password) {
        throw new Error("Invalid proxy format: missing required fields");
      }
      return `${type}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
    }
    if (parts.length === 2) {
      // host:port format
      const [host, port] = parts;
      if (!host || !port) {
        throw new Error("Invalid proxy format: missing host or port");
      }
      return `${type}://${host}:${port}`;
    }
    throw new Error(`Unsupported proxy format: ${input}`);
  }

  // Create enhanced local HTTP proxy server with better SOCKS5 handling
  async createEnhancedLocalProxy(socksProxyUrl, profileId) {
    return new Promise((resolve, reject) => {
      const proxyUrl = new URL(socksProxyUrl);
      const socksHost = proxyUrl.hostname;
      const socksPort = parseInt(proxyUrl.port);
      const socksUsername = proxyUrl.username ? decodeURIComponent(proxyUrl.username) : null;
      const socksPassword = proxyUrl.password ? decodeURIComponent(proxyUrl.password) : null;

      // Find available port starting from a random range
      let port = 10000 + Math.floor(Math.random() * 5000); // Use higher port range to avoid conflicts
      
      const server = http.createServer();
      
      // Handle HTTP CONNECT method for HTTPS tunneling
      server.on('connect', (req, clientSocket, head) => {
        const { hostname, port: targetPort } = url.parse(`http://${req.url}`);
        
        this.createSocksConnection(socksHost, socksPort, socksUsername, socksPassword, hostname, targetPort)
          .then(socksSocket => {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            socksSocket.write(head);
            socksSocket.pipe(clientSocket);
            clientSocket.pipe(socksSocket);
            
            socksSocket.on('error', (err) => {
              log.error(`SOCKS socket error for ${profileId}:`, err);
              clientSocket.destroy();
            });
            
            clientSocket.on('error', (err) => {
              log.error(`Client socket error for ${profileId}:`, err);
              socksSocket.destroy();
            });
          })
          .catch(error => {
            log.error(`SOCKS connection failed for ${profileId}:`, error);
            clientSocket.write('HTTP/1.1 500 Connection Failed\r\n\r\n');
            clientSocket.end();
          });
      });

      // Handle regular HTTP requests
      server.on('request', (req, res) => {
        const targetUrl = req.url.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`;
        const parsedUrl = url.parse(targetUrl);
        
        this.createSocksConnection(socksHost, socksPort, socksUsername, socksPassword, parsedUrl.hostname, parsedUrl.port || 80)
          .then(socksSocket => {
            // Forward the HTTP request through SOCKS
            const requestData = `${req.method} ${parsedUrl.path} HTTP/1.1\r\n`;
            let headers = '';
            for (const [key, value] of Object.entries(req.headers)) {
              if (key.toLowerCase() !== 'proxy-connection') {
                headers += `${key}: ${value}\r\n`;
              }
            }
            headers += '\r\n';
            
            socksSocket.write(requestData + headers);
            
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              req.pipe(socksSocket);
            }
            
            socksSocket.pipe(res);
            
            socksSocket.on('error', (err) => {
              log.error(`SOCKS request error for ${profileId}:`, err);
              if (!res.headersSent) {
                res.writeHead(500);
                res.end('Proxy Error: ' + err.message);
              }
            });
          })
          .catch(error => {
            log.error(`SOCKS connection failed for ${profileId}:`, error);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end('SOCKS Connection Error: ' + error.message);
            }
          });
      });

      const tryListen = (currentPort) => {
        server.listen(currentPort, '127.0.0.1', (error) => {
          if (error) {
            if (error.code === 'EADDRINUSE' && currentPort < 65535) {
              tryListen(currentPort + 1);
            } else {
              reject(error);
            }
          } else {
            log.info(`Enhanced local proxy started for ${profileId} on port ${currentPort}`);
            resolve({ server, port: currentPort });
          }
        });
      };

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE' && port < 65535) {
          tryListen(port + 1);
        } else {
          reject(error);
        }
      });

      tryListen(port);
    });
  }

  // Enhanced SOCKS connection with proper authentication and retry logic
  async createSocksConnection(socksHost, socksPort, username, password, targetHost, targetPort, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this._createSocksConnectionAttempt(socksHost, socksPort, username, password, targetHost, targetPort);
        return result;
      } catch (error) {
        console.warn(`SOCKS connection attempt ${attempt} failed:`, error.message);
        if (attempt === retries) {
          throw error;
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // FIXED: Single SOCKS connection attempt with better response handling
  async _createSocksConnectionAttempt(socksHost, socksPort, username, password, targetHost, targetPort) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let step = 0;
      
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('SOCKS connection timeout'));
      }, 20000); // Increased to 20 seconds for better compatibility

      socket.connect(socksPort, socksHost, () => {
        log.debug(`Connected to SOCKS server ${socksHost}:${socksPort}`);
        
        // SOCKS5 initial request
        const authMethods = username && password ? [0x00, 0x02] : [0x00]; // No auth + Username/Password
        const initialRequest = Buffer.from([0x05, authMethods.length, ...authMethods]);
        socket.write(initialRequest);
        step = 1;
      });

      socket.on('data', (data) => {
        try {
          if (step === 1) {
            // Handle authentication method selection
            if (data.length < 2) {
              throw new Error('Invalid SOCKS5 response: too short');
            }
            
            // FIXED: Better handling of SOCKS5 responses
            if (data[0] !== 0x05) {
              // Some proxies return HTTP responses instead of SOCKS5
              if (data[0] === 0x48) { // 'H' from HTTP response
                throw new Error('Proxy returned HTTP response instead of SOCKS5 - check proxy type');
              }
              console.warn(`Unexpected SOCKS version: ${data[0]}, continuing...`);
            }
            
            const selectedMethod = data[1];
            if (selectedMethod === 0x00) {
              // No authentication required
              this.sendConnectRequest(socket, targetHost, targetPort);
              step = 2;
            } else if (selectedMethod === 0x02 && username && password) {
              // Username/password authentication
              const authRequest = Buffer.concat([
                Buffer.from([0x01]), // Version
                Buffer.from([username.length]), // Username length
                Buffer.from(username, 'utf8'), // Username
                Buffer.from([password.length]), // Password length
                Buffer.from(password, 'utf8') // Password
              ]);
              socket.write(authRequest);
              step = 1.5;
            } else if (selectedMethod === 0xFF) {
              throw new Error('No acceptable authentication methods');
            } else {
              throw new Error(`Unsupported authentication method: ${selectedMethod}`);
            }
          } else if (step === 1.5) {
            // Handle authentication response
            if (data.length < 2) {
              throw new Error('Invalid authentication response: too short');
            }
            
            if (data[0] !== 0x01) {
              console.warn(`Unexpected auth version: ${data[0]}, continuing...`);
            }
            
            if (data[1] === 0x00) {
              // Authentication successful
              this.sendConnectRequest(socket, targetHost, targetPort);
              step = 2;
            } else {
              throw new Error('SOCKS5 authentication failed');
            }
          } else if (step === 2) {
            // FIXED: Better handling of connection response
            if (data.length < 4) {
              throw new Error('Invalid SOCKS5 connect response: too short');
            }
            
            // More lenient version checking for connect response
            if (data[0] !== 0x05) {
              // Check if this is an HTTP response (status 72 = 'H')
              if (data[0] === 0x48 || data[1] === 0x54) { // 'H' or 'T' from HTTP
                throw new Error('Proxy returned HTTP response - likely wrong proxy type or port');
              }
              console.warn(`Unexpected SOCKS version in connect response: ${data[0]}, trying to parse anyway...`);
            }
            
            const status = data[1];
            if (status === 0x00) {
              // Connection successful
              clearTimeout(timeout);
              socket.removeAllListeners('data');
              resolve(socket);
            } else {
              const errorMessages = {
                0x01: 'General SOCKS server failure',
                0x02: 'Connection not allowed by ruleset',
                0x03: 'Network unreachable',
                0x04: 'Host unreachable',
                0x05: 'Connection refused',
                0x06: 'TTL expired',
                0x07: 'Command not supported',
                0x08: 'Address type not supported'
              };
              throw new Error(errorMessages[status] || `SOCKS5 error: ${status}`);
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          socket.destroy();
          reject(error);
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`SOCKS connection error: ${error.message}`));
      });

      socket.on('close', () => {
        clearTimeout(timeout);
        if (step < 2) {
          reject(new Error('SOCKS connection closed unexpectedly'));
        }
      });
    });
  }

  sendConnectRequest(socket, targetHost, targetPort) {
    const hostBuffer = Buffer.from(targetHost, 'utf8');
    const portBuffer = Buffer.allocUnsafe(2);
    portBuffer.writeUInt16BE(parseInt(targetPort), 0);
    
    const connectRequest = Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03]), // Version, Command, Reserved, Address Type (Domain)
      Buffer.from([hostBuffer.length]), // Domain length
      hostBuffer, // Domain
      portBuffer // Port
    ]);
    
    socket.write(connectRequest);
  }

  // Enhanced proxy testing with complete SSL bypass for HTTP/HTTPS proxies
  async testProxyConnectivity(proxyUrl, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const fetch = require('node-fetch');
        let agent;
        
        // Create appropriate agent with COMPLETE SSL verification disabled
        if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://')) {
          agent = new SocksProxyAgent(proxyUrl);
        } else if (proxyUrl.startsWith('https://')) {
          agent = new HttpsProxyAgent(proxyUrl, {
            rejectUnauthorized: false, // Disable SSL verification completely
            secureProtocol: 'TLSv1_2_method',
            checkServerIdentity: () => undefined, // Bypass hostname verification
            secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3
          });
        } else {
          agent = new HttpProxyAgent(proxyUrl, {
            rejectUnauthorized: false, // Disable SSL verification completely
            checkServerIdentity: () => undefined // Bypass hostname verification
          });
        }

        // Test with multiple endpoints for reliability
        const testUrls = [
          'https://api.ipify.org?format=json',
          'https://httpbin.org/ip',
          'http://icanhazip.com',
          'https://ifconfig.me/ip'
        ];

        for (const testUrl of testUrls) {
          try {
            const response = await fetch(testUrl, {
              agent,
              timeout: 25000, // Increased timeout for better proxy compatibility
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              // Additional options to bypass SSL issues
              rejectUnauthorized: false
            });

            if (response.ok) {
              const text = await response.text();
              let ip;
              
              try {
                const data = JSON.parse(text);
                ip = data.ip || data.origin || text.trim();
              } catch {
                ip = text.trim();
              }
              
              return { success: true, ip, attempt, testUrl };
            }
          } catch (error) {
            log.warn(`Test URL ${testUrl} failed on attempt ${attempt}:`, error.message);
            continue;
          }
        }
        
        throw new Error('All test URLs failed');
        
      } catch (error) {
        log.warn(`Proxy test attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          return { 
            success: false, 
            error: error.message.includes('timeout') ? 'Connection timeout' : error.message,
            attempts: retries
          };
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  // Clean up proxy server
  closeProxyServer(profileId) {
    const server = this.activeServers.get(profileId);
    if (server) {
      try {
        server.close();
        this.activeServers.delete(profileId);
        log.info(`Closed proxy server for profile ${profileId}`);
      } catch (error) {
        log.error(`Error closing proxy server for ${profileId}:`, error);
      }
    }
  }

  // Clean up all proxy servers
  closeAllProxyServers() {
    for (const [profileId, server] of this.activeServers) {
      try {
        server.close();
      } catch (error) {
        log.error(`Error closing proxy server for ${profileId}:`, error);
      }
    }
    this.activeServers.clear();
  }
}

module.exports = { EnhancedProxyManager };