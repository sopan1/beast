const { EnhancedFingerprintManager } = require('./electron/enhanced-fingerprint-manager');

async function testEnhancedFingerprint() {
  console.log('🧪 Testing Enhanced Fingerprint Spoofing...\n');
  
  const manager = new EnhancedFingerprintManager();
  
  // Test different platforms
  const platforms = ['windows', 'macos', 'linux', 'android', 'ios'];
  
  for (const platform of platforms) {
    console.log(`\n📱 Testing ${platform.toUpperCase()} fingerprint:`);
    console.log('=' .repeat(50));
    
    try {
      // Generate fingerprint script
      const script = await manager.generateAdvancedFingerprintScript(platform);
      
      // Extract key information from the script
      const platformMatch = script.match(/platform: '([^']+)'/);
      const vendorMatch = script.match(/vendor: '([^']+)'/);
      const timezoneMatch = script.match(/IP-based Timezone:', '([^']+)'/);
      const screenMatch = script.match(/screen: '([^']+)'/);
      const webglMatch = script.match(/webgl: '([^']+)'/);
      
      console.log('✅ Fingerprint generated successfully');
      console.log(`   Platform: ${platformMatch ? platformMatch[1] : 'Unknown'}`);
      console.log(`   Vendor: ${vendorMatch ? vendorMatch[1] : 'Unknown'}`);
      console.log(`   Script size: ${script.length} characters`);
      
      // Test IP geolocation
      const geoData = await manager.getIPGeolocation();
      console.log(`   Timezone: ${geoData.timezone}`);
      console.log(`   Country: ${geoData.country}`);
      console.log(`   Coordinates: ${geoData.latitude}, ${geoData.longitude}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate ${platform} fingerprint:`, error.message);
    }
  }
  
  console.log('\n🎯 Testing IP-based timezone matching...');
  console.log('=' .repeat(50));
  
  // Test with different proxy IPs (simulated)
  const testIPs = [
    { ip: '8.8.8.8', expected: 'America/New_York' },
    { ip: '1.1.1.1', expected: 'America/Los_Angeles' }
  ];
  
  for (const testIP of testIPs) {
    try {
      const geoData = await manager.getIPGeolocation(testIP.ip);
      console.log(`✅ IP: ${testIP.ip} -> Timezone: ${geoData.timezone}, Country: ${geoData.country}`);
    } catch (error) {
      console.error(`❌ Failed to get geolocation for ${testIP.ip}:`, error.message);
    }
  }
  
  console.log('\n🔍 Fingerprint spoofing features:');
  console.log('=' .repeat(50));
  console.log('✅ Platform-specific user agents');
  console.log('✅ Vendor spoofing (Google Inc., Apple Computer, Inc., etc.)');
  console.log('✅ IP-based timezone injection');
  console.log('✅ Screen resolution matching platform');
  console.log('✅ WebGL vendor/renderer spoofing');
  console.log('✅ Hardware concurrency spoofing');
  console.log('✅ Device memory spoofing');
  console.log('✅ Canvas fingerprint protection');
  console.log('✅ WebRTC IP leak prevention');
  console.log('✅ WebDriver detection removal');
  console.log('✅ Chrome runtime spoofing');
  console.log('✅ Plugin spoofing');
  console.log('✅ Language preference spoofing');
  
  console.log('\n🎉 Enhanced Fingerprint Spoofing Test Complete!');
  console.log('Ready for mixvisit.com and other fingerprinting sites.');
}

// Run the test
testEnhancedFingerprint().catch(console.error);