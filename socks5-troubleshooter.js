const { EnhancedProxyManager } = require('./electron/enhanced-proxy-manager.js');
const { SocksClient } = require('socks');
const net = require('net');

class SOCKS5Troubleshooter {
    constructor() {
        this.proxyManager = new EnhancedProxyManager();
    }

    async diagnoseSOCKS5Issue(proxyInput) {
        console.log('🔍 SOCKS5 TROUBLESHOOTING STARTED');
        console.log('=====================================');
        console.log(`Input: ${proxyInput}\n`);

        const results = {
            format: false,
            parsing: false,
            basicConnection: false,
            socksHandshake: false,
            authentication: false,
            tunneling: false,
            issues: [],
            recommendations: []
        };

        try {
            // Step 1: Test proxy format normalization
            console.log('📋 Step 1: Testing proxy format...');
            const normalized = this.proxyManager.normalizeProxy(proxyInput, 'socks5');
            console.log(`✅ Normalized format: ${normalized}`);
            results.format = true;

            // Step 2: Parse proxy URL
            console.log('\n🔍 Step 2: Parsing proxy URL...');
            const proxyUrl = new URL(normalized);
            const socksConfig = {
                proxy: {
                    host: proxyUrl.hostname,
                    port: parseInt(proxyUrl.port) || 1080,
                    type: 5,
                    userId: proxyUrl.username ? decodeURIComponent(proxyUrl.username) : undefined,
                    password: proxyUrl.password ? decodeURIComponent(proxyUrl.password) : undefined
                },
                command: 'connect',
                destination: {
                    host: 'httpbin.org',
                    port: 80
                }
            };

            console.log('✅ SOCKS configuration:', {
                host: socksConfig.proxy.host,
                port: socksConfig.proxy.port,
                hasAuth: !!(socksConfig.proxy.userId && socksConfig.proxy.password),
                userId: socksConfig.proxy.userId || 'none',
                password: socksConfig.proxy.password ? '***' : 'none'
            });
            results.parsing = true;

            // Step 3: Test basic TCP connection
            console.log('\n🔌 Step 3: Testing basic TCP connection...');
            try {
                await this.testBasicConnection(socksConfig.proxy.host, socksConfig.proxy.port);
                console.log('✅ Basic TCP connection successful');
                results.basicConnection = true;
            } catch (connError) {
                console.log(`❌ Basic TCP connection failed: ${connError.message}`);
                results.issues.push(`TCP connection failed: ${connError.message}`);
                
                if (connError.message.includes('ECONNREFUSED')) {
                    results.recommendations.push('Check if SOCKS5 server is running on the specified port');
                    results.recommendations.push('Verify the proxy host/port configuration');
                } else if (connError.message.includes('ENOTFOUND')) {
                    results.recommendations.push('Check if the proxy hostname/IP address is correct');
                    results.recommendations.push('Verify DNS resolution is working');
                } else if (connError.message.includes('ETIMEDOUT')) {
                    results.recommendations.push('Check network connectivity to the proxy server');
                    results.recommendations.push('Verify firewall is not blocking the connection');
                }
                
                // Continue with other tests even if basic connection fails
            }

            // Step 4: Test SOCKS5 handshake and authentication
            console.log('\n🤝 Step 4: Testing SOCKS5 handshake...');
            try {
                const socksConnection = await SocksClient.createConnection(socksConfig);
                console.log('✅ SOCKS5 handshake successful');
                results.socksHandshake = true;
                results.authentication = true;
                
                // Step 5: Test data tunneling
                console.log('\n🌐 Step 5: Testing data tunneling...');
                try {
                    const httpRequest = 'GET /ip HTTP/1.1\r\nHost: httpbin.org\r\nConnection: close\r\n\r\n';
                    socksConnection.socket.write(httpRequest);
                    
                    const response = await new Promise((resolve, reject) => {
                        let data = '';
                        const timeout = setTimeout(() => {
                            reject(new Error('Tunneling test timeout'));
                        }, 10000);
                        
                        socksConnection.socket.on('data', (chunk) => {
                            data += chunk.toString();
                            if (data.includes('\r\n\r\n')) {
                                clearTimeout(timeout);
                                resolve(data);
                            }
                        });
                        
                        socksConnection.socket.on('error', (error) => {
                            clearTimeout(timeout);
                            reject(error);
                        });
                    });
                    
                    console.log('✅ Data tunneling successful');
                    console.log('📊 HTTP Response preview:', response.substring(0, 200) + '...');
                    results.tunneling = true;
                    
                } catch (tunnelingError) {
                    console.log(`❌ Data tunneling failed: ${tunnelingError.message}`);
                    results.issues.push(`Data tunneling failed: ${tunnelingError.message}`);
                    results.recommendations.push('The SOCKS5 proxy may not be properly forwarding data');
                }
                
                socksConnection.socket.destroy();
                
            } catch (socksError) {
                console.log(`❌ SOCKS5 handshake failed: ${socksError.message}`);
                results.issues.push(`SOCKS5 handshake failed: ${socksError.message}`);
                
                if (socksError.message.includes('authentication')) {
                    results.recommendations.push('Check SOCKS5 username and password');
                    results.recommendations.push('Verify the proxy server supports username/password authentication');
                } else if (socksError.message.includes('Connection not allowed')) {
                    results.recommendations.push('The SOCKS5 server denied the connection request');
                    results.recommendations.push('Check if your IP is whitelisted on the proxy server');
                } else {
                    results.recommendations.push('The SOCKS5 server may not be responding correctly');
                    results.recommendations.push('Try a different SOCKS5 proxy server');
                }
            }

            // Step 6: Test enhanced local proxy creation
            console.log('\n🔧 Step 6: Testing enhanced local proxy...');
            try {
                const localProxy = await this.proxyManager.createEnhancedLocalProxy(normalized, 'troubleshoot-test');
                console.log(`✅ Enhanced local proxy created on port: ${localProxy.port}`);
                
                // Test a quick HTTP request through the local proxy
                try {
                    const testResult = await this.proxyManager.testProxyConnectivity(normalized);
                    if (testResult.success) {
                        console.log(`✅ Proxy connectivity test passed: IP ${testResult.ip}`);
                    } else {
                        console.log(`❌ Proxy connectivity test failed: ${testResult.error}`);
                        results.issues.push(`Connectivity test failed: ${testResult.error}`);
                    }
                } catch (testError) {
                    console.log(`❌ Connectivity test error: ${testError.message}`);
                }
                
                localProxy.server.close();
                
            } catch (localProxyError) {
                console.log(`❌ Enhanced local proxy failed: ${localProxyError.message}`);
                results.issues.push(`Local proxy creation failed: ${localProxyError.message}`);
            }

        } catch (formatError) {
            console.log(`❌ Proxy format error: ${formatError.message}`);
            results.issues.push(`Format error: ${formatError.message}`);
            results.recommendations.push('Check the proxy format (should be host:port or host:port:user:pass)');
        }

        // Final diagnosis
        console.log('\n📋 DIAGNOSIS SUMMARY');
        console.log('====================');
        console.log(`Format validation: ${results.format ? '✅' : '❌'}`);
        console.log(`URL parsing: ${results.parsing ? '✅' : '❌'}`);
        console.log(`Basic connection: ${results.basicConnection ? '✅' : '❌'}`);
        console.log(`SOCKS5 handshake: ${results.socksHandshake ? '✅' : '❌'}`);
        console.log(`Authentication: ${results.authentication ? '✅' : '❌'}`);
        console.log(`Data tunneling: ${results.tunneling ? '✅' : '❌'}`);

        if (results.issues.length > 0) {
            console.log('\n❌ ISSUES FOUND:');
            results.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        }

        if (results.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            results.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }

        const overallSuccess = results.format && results.parsing && results.basicConnection && 
                             results.socksHandshake && results.authentication && results.tunneling;

        console.log(`\n🏁 OVERALL STATUS: ${overallSuccess ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
        
        return results;
    }

    async testBasicConnection(host, port, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(timeoutMs);

            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('error', (error) => {
                reject(error);
            });

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Connection timeout'));
            });

            socket.connect(port, host);
        });
    }
}

// Example usage and testing
async function main() {
    const troubleshooter = new SOCKS5Troubleshooter();
    
    // Get proxy input from command line or use a test proxy
    const proxyInput = process.argv[2] || '127.0.0.1:1080';
    
    console.log('SOCKS5 TROUBLESHOOTING TOOL');
    console.log('===========================');
    console.log('Usage: node socks5-troubleshooter.js [proxy]');
    console.log('Examples:');
    console.log('  node socks5-troubleshooter.js 127.0.0.1:1080');
    console.log('  node socks5-troubleshooter.js 127.0.0.1:1080:user:pass');
    console.log('  node socks5-troubleshooter.js socks5://user:pass@proxy.example.com:1080');
    console.log('');
    
    await troubleshooter.diagnoseSOCKS5Issue(proxyInput);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { SOCKS5Troubleshooter };