const { EnhancedProxyManager } = require('./electron/enhanced-proxy-manager.js');
const net = require('net');

async function testSOCKS5Connection() {
    console.log('🔍 Testing SOCKS5 Connection...');
    
    const proxyManager = new EnhancedProxyManager();
    
    // Test with a sample SOCKS5 proxy format
    const testProxies = [
        'socks5://127.0.0.1:1080',
        'socks5://user:pass@127.0.0.1:1080',
        '127.0.0.1:1080:user:pass'
    ];
    
    for (const proxy of testProxies) {
        console.log(`\n📝 Testing proxy format: ${proxy}`);
        
        try {
            // Test proxy normalization
            const normalized = proxyManager.normalizeProxy(proxy, 'socks5');
            console.log(`✅ Normalized: ${normalized}`);
            
            // Test URL parsing
            const proxyUrl = new URL(normalized);
            console.log(`✅ Parsed URL:`, {
                protocol: proxyUrl.protocol,
                hostname: proxyUrl.hostname,
                port: proxyUrl.port,
                username: proxyUrl.username,
                password: proxyUrl.password ? '***' : 'none'
            });
            
            // Test actual connection (will fail but show the error)
            try {
                console.log('🔌 Testing actual connection...');
                const socket = new net.Socket();
                socket.setTimeout(5000);
                
                const connectionPromise = new Promise((resolve, reject) => {
                    socket.on('connect', () => {
                        console.log('✅ Socket connected successfully');
                        socket.destroy();
                        resolve(true);
                    });
                    
                    socket.on('error', (error) => {
                        console.log(`❌ Socket connection failed: ${error.message}`);
                        reject(error);
                    });
                    
                    socket.on('timeout', () => {
                        console.log('⏰ Socket connection timeout');
                        socket.destroy();
                        reject(new Error('Connection timeout'));
                    });
                    
                    socket.connect(parseInt(proxyUrl.port) || 1080, proxyUrl.hostname);
                });
                
                await connectionPromise;
                
            } catch (connectionError) {
                console.log(`❌ Expected connection error: ${connectionError.message}`);
                console.log('This is normal if no SOCKS5 server is running locally');
            }
            
        } catch (error) {
            console.log(`❌ Format error: ${error.message}`);
        }
    }
    
    console.log('\n🔍 Testing Enhanced Local Proxy Creation...');
    
    try {
        // Test local proxy creation (will fail but show setup)
        const localProxy = await proxyManager.createEnhancedLocalProxy('socks5://127.0.0.1:1080', 'test-profile');
        console.log('✅ Local proxy created on port:', localProxy.port);
        localProxy.server.close();
    } catch (error) {
        console.log(`❌ Local proxy creation failed: ${error.message}`);
        
        // Check if it's a specific type of error
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 DIAGNOSIS: SOCKS5 server connection refused');
            console.log('   - Check if your SOCKS5 proxy server is running');
            console.log('   - Verify the proxy host and port are correct');
            console.log('   - Make sure there are no firewall blocks');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 DIAGNOSIS: SOCKS5 server hostname not found');
            console.log('   - Check if the proxy hostname/IP is correct');
            console.log('   - Verify DNS resolution is working');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 DIAGNOSIS: SOCKS5 connection timeout');
            console.log('   - Check if the proxy server is reachable');
            console.log('   - Verify network connectivity');
            console.log('   - Try increasing timeout values');
        } else if (error.message.includes('authentication')) {
            console.log('\n💡 DIAGNOSIS: SOCKS5 authentication failed');
            console.log('   - Check if username/password are correct');
            console.log('   - Verify the proxy supports authentication');
        }
    }
    
    console.log('\n🏁 SOCKS5 connection test completed');
}

// Run the test
testSOCKS5Connection().catch(console.error);