// Simple RPA test script for debugging
console.log('🚀 Starting simple RPA test...');

// Test 1: Simple scroll down
await page.scroll({ amount: 200, direction: 'down' });
await page.waitForTimeout(1000);

// Test 2: Simple scroll up  
await page.scroll({ amount: 100, direction: 'up' });
await page.waitForTimeout(1000);

// Test 3: Mouse movement
await page.mouse.move(200, 300);
await page.waitForTimeout(500);

console.log('✅ Simple RPA test completed!');