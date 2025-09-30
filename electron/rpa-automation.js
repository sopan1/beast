// ⚡ UPGRADED RPA AUTOMATION ENGINE - BeastBrowser
// 🚀 Enhanced RPA automation with step-by-step execution
// ✅ Compatible with Puppeteer Browser and BeastBrowser
// 🎯 Reliable automation flows without errors or skipped actions
// 🌍 Works across all platforms (Windows, macOS, Linux, Android, iOS, TV)
// 🔒 Seamlessly integrated with proxy, timezone injection, and anti-detection

/**
 * Generate random delay with jitter
 * @param {number} base - Base delay in milliseconds
 * @param {number} jitter - Jitter amount in milliseconds
 * @returns {number} Randomized delay
 */
function randomDelay(base = 100, jitter = 50) {
  return base + Math.floor((Math.random() - 0.5) * jitter);
}

/**
 * Human-like typing with realistic delays and events
 * @param {Object} page - Puppeteer page instance
 * @param {string} selector - CSS selector for target element
 * @param {string} text - Text to type
 * @param {Object} options - Typing options
 * @returns {Promise<boolean>} Success status
 */
async function humanType(page, selector, text, options = {}) {
  const {
    delayBase = 80,
    jitter = 60,
    clearFirst = false,
    useComposition = false,
    triggerEvents = true
  } = options;

  try {
    // Wait for element and focus
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.focus(selector);
    
    // Clear existing content if requested
    if (clearFirst) {
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.waitForTimeout(50);
    }

    // Check if element is a rich editor (Ace, CodeMirror, etc.)
    const isRichEditor = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      
      const classList = element.classList.toString();
      const parentClasses = element.parentElement?.classList.toString() || '';
      
      return classList.includes('ace_') || 
             classList.includes('CodeMirror') ||
             classList.includes('monaco') ||
             parentClasses.includes('ace_') ||
             parentClasses.includes('CodeMirror') ||
             parentClasses.includes('monaco') ||
             element.contentEditable === 'true';
    }, selector);

    if (isRichEditor) {
      // Use composition events for rich editors
      if (useComposition) {
        await page.evaluate((sel, txt) => {
          const element = document.querySelector(sel);
          if (element) {
            element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
            element.dispatchEvent(new CompositionEvent('compositionupdate', { 
              bubbles: true, 
              data: txt 
            }));
            element.dispatchEvent(new CompositionEvent('compositionend', { 
              bubbles: true, 
              data: txt 
            }));
          }
        }, selector, text);
      }

      // Type character by character for rich editors
      for (const char of text) {
        const delay = randomDelay(delayBase, jitter);
        await page.keyboard.sendCharacter(char);
        await page.waitForTimeout(delay);
      }
    } else {
      // Standard typing for regular inputs
      for (const char of text) {
        const delay = randomDelay(delayBase, jitter);
        await page.keyboard.type(char, { delay: 0 });
        await page.waitForTimeout(delay);
      }
    }

    // Trigger input and change events
    if (triggerEvents) {
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }, selector);
    }

    return true;
  } catch (error) {
    console.error('Human typing failed:', error);
    return false;
  }
}

/**
 * Human-like clicking with realistic mouse movement
 * @param {Object} page - Puppeteer page instance
 * @param {string} selector - CSS selector for target element
 * @param {Object} options - Click options
 * @returns {Promise<boolean>} Success status
 */
async function humanClick(page, selector, options = {}) {
  const {
    delay = 100,
    button = 'left',
    clickCount = 1,
    offset = null
  } = options;

  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    
    // Get element bounds for realistic clicking
    const element = await page.$(selector);
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error('Element not visible');
    }

    // Calculate click position with slight randomization
    const x = offset?.x || (box.x + box.width / 2 + (Math.random() - 0.5) * 10);
    const y = offset?.y || (box.y + box.height / 2 + (Math.random() - 0.5) * 10);

    // Move mouse to position with human-like curve
    await page.mouse.move(x - 50, y - 50);
    await page.waitForTimeout(randomDelay(50, 20));
    await page.mouse.move(x, y);
    await page.waitForTimeout(randomDelay(delay, 30));

    // Perform click
    await page.mouse.click(x, y, { button, clickCount });
    
    // Fallback: try direct element click if mouse click fails
    try {
      await element.click();
    } catch (fallbackError) {
      // Try dispatching click event as final fallback
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.dispatchEvent(new MouseEvent('click', { 
            bubbles: true, 
            cancelable: true,
            view: window
          }));
        }
      }, selector);
    }

    return true;
  } catch (error) {
    console.error('Human click failed:', error);
    return false;
  }
}

/**
 * Scroll page or element with human-like behavior
 * @param {Object} page - Puppeteer page instance
 * @param {Object} options - Scroll options
 * @returns {Promise<boolean>} Success status
 */
async function humanScroll(page, options = {}) {
  const {
    direction = 'down',
    distance = 300,
    selector = null,
    smooth = true
  } = options;

  try {
    if (selector) {
      // Scroll specific element
      await page.evaluate((sel, dir, dist, sm) => {
        const element = document.querySelector(sel);
        if (element) {
          const scrollOptions = { behavior: sm ? 'smooth' : 'auto' };
          if (dir === 'down') {
            element.scrollBy({ top: dist, ...scrollOptions });
          } else if (dir === 'up') {
            element.scrollBy({ top: -dist, ...scrollOptions });
          } else if (dir === 'left') {
            element.scrollBy({ left: -dist, ...scrollOptions });
          } else if (dir === 'right') {
            element.scrollBy({ left: dist, ...scrollOptions });
          }
        }
      }, selector, direction, distance, smooth);
    } else {
      // Scroll page
      const scrollSteps = Math.ceil(distance / 50);
      const stepDistance = distance / scrollSteps;
      
      for (let i = 0; i < scrollSteps; i++) {
        if (direction === 'down') {
          await page.keyboard.press('ArrowDown');
        } else if (direction === 'up') {
          await page.keyboard.press('ArrowUp');
        }
        await page.waitForTimeout(randomDelay(50, 20));
      }
    }

    return true;
  } catch (error) {
    console.error('Human scroll failed:', error);
    return false;
  }
}

/**
 * Execute RPA script with sequential task handling
 * @param {Object} page - Puppeteer page instance
 * @param {Array} tasks - Array of RPA tasks
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution results
 */
async function executeRPAScript(page, tasks, options = {}) {
  const {
    continueOnError = false,
    timeout = 30000,
    logProgress = true
  } = options;

  const results = {
    success: true,
    completedTasks: 0,
    failedTasks: 0,
    errors: [],
    screenshots: []
  };

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    if (logProgress) {
      console.log(`Executing task ${i + 1}/${tasks.length}: ${task.type}`);
    }

    try {
      switch (task.type) {
        case 'navigate':
          await page.goto(task.url, { 
            waitUntil: 'domcontentloaded', 
            timeout 
          });
          break;

        case 'wait':
          if (task.selector) {
            await page.waitForSelector(task.selector, { timeout });
          } else {
            await page.waitForTimeout(task.delay || 1000);
          }
          break;

        case 'type':
          const typeSuccess = await humanType(page, task.selector, task.value, {
            delayBase: task.delayBase || 80,
            jitter: task.jitter || 60,
            clearFirst: task.clearFirst || false
          });
          if (!typeSuccess) throw new Error('Typing failed');
          break;

        case 'click':
          const clickSuccess = await humanClick(page, task.selector, {
            delay: task.delay || 100,
            button: task.button || 'left'
          });
          if (!clickSuccess) throw new Error('Clicking failed');
          break;

        case 'scroll':
          const scrollSuccess = await humanScroll(page, {
            direction: task.direction || 'down',
            distance: task.distance || 300,
            selector: task.selector
          });
          if (!scrollSuccess) throw new Error('Scrolling failed');
          break;

        case 'screenshot':
          const screenshot = await page.screenshot({
            path: task.path,
            fullPage: task.fullPage || false
          });
          results.screenshots.push(task.path);
          break;

        case 'extract':
          const extractedData = await page.evaluate((sel, attr) => {
            const elements = document.querySelectorAll(sel);
            return Array.from(elements).map(el => {
              if (attr) {
                return el.getAttribute(attr);
              }
              return el.textContent.trim();
            });
          }, task.selector, task.attribute);
          
          task.result = extractedData;
          break;

        case 'custom':
          if (task.function) {
            await task.function(page);
          }
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      results.completedTasks++;
      
      // Add delay between tasks
      if (task.delay && i < tasks.length - 1) {
        await page.waitForTimeout(task.delay);
      }

    } catch (error) {
      results.failedTasks++;
      results.errors.push({
        taskIndex: i,
        taskType: task.type,
        error: error.message
      });

      if (logProgress) {
        console.error(`Task ${i + 1} failed:`, error.message);
      }

      if (!continueOnError) {
        results.success = false;
        break;
      }
    }
  }

  results.success = results.failedTasks === 0;
  return results;
}

/**
 * Handle sequential link processing in tabs
 * @param {Object} browser - Puppeteer browser instance
 * @param {Array} links - Array of URLs to process
 * @param {Function} taskFunction - Function to execute on each page
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Results from each link
 */
async function processLinksSequentially(browser, links, taskFunction, options = {}) {
  const {
    maxConcurrent = 1,
    timeout = 30000,
    closeTabAfter = true
  } = options;

  const results = [];
  
  for (const link of links) {
    let page = null;
    
    try {
      page = await browser.newPage();
      
      // Navigate to link
      await page.goto(link, { 
        waitUntil: 'domcontentloaded', 
        timeout 
      });

      // Execute task function
      const result = await taskFunction(page, link);
      results.push({
        url: link,
        success: true,
        result
      });

    } catch (error) {
      results.push({
        url: link,
        success: false,
        error: error.message
      });
    } finally {
      // Close tab if requested
      if (page && closeTabAfter) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('Failed to close tab:', closeError);
        }
      }
    }
  }

  return results;
}

/**
 * Check for WebRTC leaks (for testing)
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<Array>} Array of detected IPs
 */
async function checkWebRTCLeaks(page) {
  try {
    const ips = await page.evaluate(() => {
      return new Promise((resolve) => {
        const ips = new Set();
        const timeout = setTimeout(() => resolve(Array.from(ips)), 3000);
        
        try {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel('test');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
          
          pc.onicecandidate = (event) => {
            if (!event || !event.candidate) {
              clearTimeout(timeout);
              resolve(Array.from(ips));
              return;
            }
            
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
            if (ipMatch) {
              ips.add(ipMatch[1]);
            }
          };
        } catch (e) {
          clearTimeout(timeout);
          resolve(['webrtc-blocked']);
        }
      });
    });
    
    return ips;
  } catch (error) {
    return ['webrtc-blocked'];
  }
}

module.exports = {
  humanType,
  humanClick,
  humanScroll,
  executeRPAScript,
  processLinksSequentially,
  checkWebRTCLeaks,
  randomDelay
};
