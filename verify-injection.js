// Verification script to test user agent injection in BeastBrowser
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying User Agent Injection in BeastBrowser Profiles\n');

// Function to load user agents from files
function loadUserAgents(platform) {
  try {
    const userAgentsPath = path.join(__dirname, 'useragents', `${platform}.json`);
    if (fs.existsSync(userAgentsPath)) {
      const userAgents = JSON.parse(fs.readFileSync(userAgentsPath, 'utf8'));
      if (Array.isArray(userAgents) && userAgents.length > 0) {
        return userAgents;
      }
    }
    return [];
  } catch (error) {
    console.error(`❌ Error loading user agents for ${platform}:`, error.message);
    return [];
  }
}

// Test all platforms
const platforms = ['windows', 'macos', 'linux', 'android', 'ios', 'tv'];

console.log('📋 Checking user agent files:');
let totalUserAgents = 0;
platforms.forEach(platform => {
  const userAgents = loadUserAgents(platform);
  console.log(`  ${platform}: ${userAgents.length} user agents`);
  totalUserAgents += userAgents.length;
});

console.log(`\n✅ Total: ${totalUserAgents} user agents across ${platforms.length} platforms\n`);

// Verify the injection logic in main.js
console.log('🔧 Verifying injection logic in main.js:');

const mainJsPath = path.join(__dirname, 'electron', 'main.js');
if (fs.existsSync(mainJsPath)) {
  const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
  
  // Check for key injection points
  const checks = [
    { pattern: /window\.platformConfig\s*=/, description: 'Platform config injection' },
    { pattern: /realUserAgent:\s*'[^']*'/, description: 'Real user agent injection' },
    { pattern: /window\.platform\s*=/, description: 'Window platform injection (NEW)' },
    { pattern: /window\.realUserAgent\s*=/, description: 'Window real user agent injection (NEW)' }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(mainJsContent)) {
      console.log(`  ✅ ${check.description} - FOUND`);
    } else {
      console.log(`  ❌ ${check.description} - NOT FOUND`);
    }
  });
} else {
  console.log('  ❌ main.js not found');
}

// Verify the preload script
console.log('\n🔧 Verifying preload script (enhanced-webview-preload.js):');

const preloadPath = path.join(__dirname, 'electron', 'enhanced-webview-preload.js');
if (fs.existsSync(preloadPath)) {
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  
  // Check for key injection points
  const checks = [
    { pattern: /window\.platform/, description: 'Window platform access' },
    { pattern: /window\.platformConfig\?\.platform/, description: 'Platform config access' },
    { pattern: /window\.realUserAgent/, description: 'Window real user agent access (NEW)' },
    { pattern: /console\.log\('🔍 Platform injection status'/, description: 'Injection status logging (NEW)' }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(preloadContent)) {
      console.log(`  ✅ ${check.description} - FOUND`);
    } else {
      console.log(`  ❌ ${check.description} - NOT FOUND`);
    }
  });
} else {
  console.log('  ❌ enhanced-webview-preload.js not found');
}

console.log('\n🧪 Testing user agent selection logic:');

// Simulate the user agent selection logic
function selectRandomUserAgent(platform) {
  const userAgents = loadUserAgents(platform);
  if (userAgents.length === 0) {
    return null;
  }
  
  const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
  return randomUA;
}

// Test selection for each platform
platforms.forEach(platform => {
  const selectedUA = selectRandomUserAgent(platform);
  if (selectedUA) {
    console.log(`  ${platform}: ${selectedUA.substring(0, 60)}...`);
  } else {
    console.log(`  ${platform}: ❌ No user agent found`);
  }
});

console.log('\n✅ Verification complete. If all checks show ✅, the injection should work properly.');
console.log('   If you still have issues, try restarting BeastBrowser completely.');