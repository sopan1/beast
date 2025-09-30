// Smoke tests for Puppeteer Anti-Detection module
// Run with: node electron/tests/puppeteer-smoke.js

const { PuppeteerAntiBrowserManager } = require('../puppeteer-browser');

async function testTimezoneAndWebRTC() {
  const manager = new PuppeteerAntiBrowserManager();
  const profile = {
    id: `test_profile_${Date.now()}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'windows',
    viewport: { width: 1280, height: 800 }
  };

  const timezone = 'Europe/London';

  console.log('Launching profile with timezone:', timezone);
  const res = await manager.launch(profile, { timezone, headless: true, defaultUrl: 'about:blank' });
  if (!res.success) throw new Error('Launch failed');

  const status = manager.getStatus(profile.id);
  const page = status && manager.instances.get(profile.id)?.firstPage;

  // Verify timezone in page
  const tzInPage = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('Detected timezone in page:', tzInPage);
  if (tzInPage !== timezone) throw new Error(`Timezone mismatch. Expected ${timezone}, got ${tzInPage}`);

  // Check WebRTC leak
  const webrtc = await manager.checkWebRTCLeaks(profile.id);
  console.log('WebRTC check:', webrtc);
  if (!webrtc.success) throw new Error('WebRTC check failed');

  await manager.close(profile.id);
  console.log('Timezone and WebRTC test passed');
}

async function testHumanTyping() {
  const manager = new PuppeteerAntiBrowserManager();
  const profile = {
    id: `typing_profile_${Date.now()}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'windows',
    viewport: { width: 1280, height: 800 }
  };

  const res = await manager.launch(profile, { timezone: 'UTC', headless: true, defaultUrl: 'about:blank' });
  if (!res.success) throw new Error('Launch failed');

  const page = manager.instances.get(profile.id).firstPage;

  // Simple HTML page with input and contentEditable
  const html = `<!doctype html><html><body>
    <input id="txt" data-test-id="txt" />
    <div id="ed" contenteditable="true" style="border:1px solid #ccc; padding:8px; width:400px; height:120px"></div>
    <script>window._events = []; ['input','change','blur','keydown','keyup'].forEach(ev => {
      document.getElementById('txt').addEventListener(ev, () => window._events.push(ev));
    });</script>
  </body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const { humanType } = require('../rpa-automation');

  const text = 'Hello BeastBrowser!';
  const ok1 = await humanType(page, '#txt', text, { clearFirst: true });
  const value1 = await page.$eval('#txt', el => el.value);
  if (!ok1 || value1 !== text) throw new Error('Typing into input failed');

  const ok2 = await humanType(page, '#ed', text, { useComposition: true });
  const value2 = await page.$eval('#ed', el => el.textContent);
  if (!ok2 || !value2.includes('Hello')) throw new Error('Typing into contentEditable failed');

  // Ensure events fired
  const events = await page.evaluate(() => window._events);
  if (!events.includes('input') || !events.includes('change')) throw new Error('Input/change events missing');

  await manager.close(profile.id);
  console.log('Human typing test passed');
}

async function testSequentialLinks() {
  const manager = new PuppeteerAntiBrowserManager();
  const profile = {
    id: `links_profile_${Date.now()}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'windows',
    viewport: { width: 1280, height: 800 }
  };

  const res = await manager.launch(profile, { timezone: 'UTC', headless: true, defaultUrl: 'about:blank' });
  if (!res.success) throw new Error('Launch failed');

  const links = [
    'https://example.com',
    'https://example.org',
    'https://www.iana.org/domains/reserved'
  ];

  const results = await manager.processLinks(profile.id, links, async (page, url) => {
    await page.waitForSelector('body');
    const title = await page.title();
    return { url, title };
  }, { closeTabAfter: true });

  if (!results.success) throw new Error('Sequential links test failed');
  if (results.results.length !== links.length) throw new Error('Not all links processed');

  await manager.close(profile.id);
  console.log('Sequential links test passed');
}

(async () => {
  try {
    await testTimezoneAndWebRTC();
    await testHumanTyping();
    await testSequentialLinks();
    console.log('\nAll Puppeteer smoke tests passed.');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
})();
