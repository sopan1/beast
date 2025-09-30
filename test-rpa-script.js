// Test RPA script to verify scrolling and other actions work
console.log('🧪 Starting RPA Test Script');

// Navigate to a test page
await page.goto('https://example.com');
await page.waitForTimeout(3000);
console.log('✅ Navigation completed');

// Test scrolling
console.log('🔄 Testing scroll functionality...');
await page.scroll({ amount: 300, direction: 'down' });
await page.waitForTimeout(2000);

await page.scroll({ amount: 200, direction: 'up' });
await page.waitForTimeout(2000);

// Test random scrolling
for (let i = 0; i < 3; i++) {
  await page.scroll({ amount: Math.random() * 200 + 100, direction: 'down' });
  await page.waitForTimeout(Math.random() * 1000 + 500);
}

console.log('✅ Scroll tests completed');

// Test mouse movement
console.log('🖱️ Testing mouse movement...');
await page.mouse.move(Math.random() * 300 + 100, Math.random() * 300 + 100);
await page.waitForTimeout(1000);

console.log('🎉 RPA Test Script completed successfully!');