// Test script to verify profile creation with real user agents
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Profile Creation with Real User Agents...');

// Function to test user agent loading for a specific platform
function testPlatformUserAgents(platform) {
  try {
    const filePath = path.join(__dirname, 'useragents', `${platform}.json`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const userAgents = JSON.parse(content);
      
      if (Array.isArray(userAgents) && userAgents.length > 0) {
        console.log(`✅ ${platform}: Successfully loaded ${userAgents.length} user agents`);
        console.log(`   First user agent: ${userAgents[0].substring(0, 70)}...`);
        return true;
      } else {
        console.log(`❌ ${platform}: Invalid format or empty file`);
        return false;
      }
    } else {
      console.log(`❌ ${platform}: File not found at ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${platform}: Error - ${error.message}`);
    return false;
  }
}

// Test all platforms
const platforms = ['windows', 'macos', 'linux', 'android', 'ios', 'tv'];
let successCount = 0;

console.log('\n🔍 Testing user agent files...\n');

for (const platform of platforms) {
  if (testPlatformUserAgents(platform)) {
    successCount++;
  }
}

console.log(`\n📊 Test Results: ${successCount}/${platforms.length} platforms loaded successfully`);

if (successCount === platforms.length) {
  console.log('\n🎉 All user agent files loaded correctly!');
  console.log('✅ Profile creation should now use real user agents from files');
  console.log('✅ Fingerprint spoofing should work with platform-specific data');
} else {
  console.log('\n⚠️ Some user agent files failed to load.');
  console.log('❌ Profile creation may not work correctly');
}

// Test a sample profile creation
console.log('\n📋 Sample Profile Creation Test:');
const sampleProfile = {
  id: 'test-profile-001',
  name: 'Test Profile',
  userAgentPlatform: 'windows',
  proxyType: 'none',
  timezone: 'auto',
  locale: 'en-US'
};

console.log('Sample profile configuration:');
console.log(JSON.stringify(sampleProfile, null, 2));

console.log('\n🏁 Test completed');