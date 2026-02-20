# Troubleshooting Guide - Testing System

## Overview

This troubleshooting guide provides systematic approaches to resolve common issues encountered in the testing system. Each issue includes symptoms, root causes, diagnostic steps, and resolution strategies.

## Quick Diagnostic Flow

```
Test Failure → Check Error Type → Follow Specific Guide → Verify Fix
     ↓
Infrastructure Issue → Check Resources → Restart/Scale → Monitor
     ↓
Performance Issue → Profile Tests → Optimize → Validate
     ↓
Environment Issue → Check Config → Reset/Rebuild → Test
```

## Common Test Failures

### 1. Flaky Tests

#### Symptoms
- Tests pass intermittently
- Different results on retry
- Time-dependent failures
- Environment-sensitive failures

#### Diagnostic Steps
```bash
# Check failure patterns
npm run test:analyze-failures -- --test-name="failing-test"

# Review test history
npm run test:history -- --test-name="failing-test" --days=7

# Check for timing issues
npm run test:timing-analysis -- --test-name="failing-test"
```

#### Root Causes
1. **Race Conditions**
   ```javascript
   // Problem: Waiting for element that may not be ready
   await page.click('.dynamic-button'); // Fails if element not ready

   // Solution: Add proper wait conditions
   await page.waitForSelector('.dynamic-button', { state: 'visible' });
   await page.click('.dynamic-button');
   ```

2. **Network Timing**
   ```javascript
   // Problem: Test continues before network request completes
   await page.click('#submit');
   await expect(page).toHaveURL('/success'); // May fail if slow network

   // Solution: Wait for network idle
   await page.click('#submit');
   await page.waitForLoadState('networkidle');
   await expect(page).toHaveURL('/success');
   ```

3. **Dynamic Content**
   ```javascript
   // Problem: Content loads after initial render
   const text = await page.textContent('.dynamic-content');
   expect(text).toContain('Expected Text'); // May fail if content not loaded

   // Solution: Wait for content
   await page.waitForSelector('.dynamic-content:has-text("Expected Text")');
   const text = await page.textContent('.dynamic-content');
   expect(text).toContain('Expected Text');
   ```

#### Resolution Strategies
```javascript
// Stabilization utilities
class TestStabilization {
  // Smart wait with timeout
  async waitForStable(page, selector, options = {}) {
    const { timeout = 30000, checkInterval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = await page.$(selector);
      if (element) {
        // Check if element is stable (not moving)
        const box1 = await element.boundingBox();
        await page.waitForTimeout(checkInterval);
        const box2 = await element.boundingBox();

        if (this.isStable(box1, box2)) {
          return element;
        }
      }
      await page.waitForTimeout(checkInterval);
    }

    throw new Error(`Element ${selector} not stable within ${timeout}ms`);
  }

  // Retry mechanism with exponential backoff
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

### 2. Browser-Specific Failures

#### Chrome-Specific Issues

**Issue: Chrome crashes during tests**
```bash
# Check Chrome logs
cat /tmp/chrome_debug.log | grep -i error

# Diagnostic commands
chrome --version
chrome --disable-gpu --no-sandbox --headless --dump-dom https://example.com
```

**Solution:**
```javascript
// Optimized Chrome launch configuration
const chromeConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-features=VizDisplayCompositor'
  ]
};
```

#### Firefox-Specific Issues

**Issue: Firefox memory leaks**
```bash
# Monitor memory usage
ps aux | grep firefox | awk '{print $6}' | sort -n

# Check for zombie processes
ps aux | grep firefox | grep -i defunct
```

**Solution:**
```javascript
// Firefox memory management
const firefoxConfig = {
  headless: true,
  firefoxUserPrefs: {
    'browser.cache.disk.enable': false,
    'browser.cache.memory.enable': false,
    'browser.cache.offline.enable': false,
    'network.http.use-cache': false,
    'dom.enable_performance': false
  }
};
```

#### Safari-Specific Issues

**Issue: Safari WebDriver connection failures**
```bash
# Check Safari WebDriver status
/usr/bin/safaridriver --status

# Enable remote automation
sudo safaridriver --enable
```

**Solution:**
```javascript
// Safari-specific waits
await page.waitForTimeout(1000); // Safari needs more time
await page.keyboard.press('Enter'); // Use keyboard events instead of clicks
```

### 3. File Upload Failures

#### Common Issues
1. **File Path Issues**
   ```javascript
   // Wrong: Relative path
   await page.setInputFiles('input[type="file"]', '../fixtures/test.pdf');

   // Correct: Absolute path
   const path = require('path');
   const filePath = path.resolve(__dirname, '../fixtures/test.pdf');
   await page.setInputFiles('input[type="file"]', filePath);
   ```

2. **File Size Limits**
   ```javascript
   // Check file size before upload
   const fs = require('fs');
   const stats = fs.statSync(filePath);
   const fileSizeInMB = stats.size / (1024 * 1024);

   if (fileSizeInMB > 50) {
     console.log('File too large, using chunked upload');
     await performChunkedUpload(page, filePath);
   }
   ```

3. **File Type Validation**
   ```javascript
   // Validate file type before upload
   const mime = require('mime-types');
   const mimeType = mime.lookup(filePath);

   if (!allowedTypes.includes(mimeType)) {
     throw new Error(`File type ${mimeType} not allowed`);
   }
   ```

## Infrastructure Issues

### 1. Resource Exhaustion

#### Memory Issues
```bash
# Monitor memory usage
free -h
cat /proc/meminfo | grep MemAvailable

# Check process memory
ps aux --sort=-%mem | head -20

# Memory leak detection
valgrind --tool=memcheck --leak-check=full npm run test
```

**Resolution:**
```javascript
// Memory optimization
class MemoryOptimizer {
  async optimizeMemoryUsage() {
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    // Clear browser cache
    await context.clearCookies();
    await context.clearPermissions();

    // Close unused pages
    const pages = context.pages();
    for (const page of pages.slice(1)) {
      await page.close();
    }

    // Reduce screenshot quality
    await page.screenshot({
      path: 'screenshot.png',
      quality: 80,
      fullPage: false
    });
  }
}
```

#### CPU Issues
```bash
# Monitor CPU usage
top -p $(pgrep -f playwright)

# Check CPU per core
mpstat -P ALL 1

# Profile CPU usage
perf record -g npm run test
perf report
```

### 2. Network Issues

#### Connection Timeouts
```javascript
// Network diagnostic utilities
class NetworkDiagnostics {
  async diagnoseNetworkIssues(page) {
    // Enable network logging
    page.on('requestfailed', request => {
      console.log('Request failed:', request.url(), request.failure());
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('Error response:', response.url(), response.status());
      }
    });

    // Monitor network performance
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.loadingFailed', params => {
      console.log('Network loading failed:', params);
    });
  }

  async testConnectivity() {
    const testUrls = [
      'https://www.google.com',
      'https://www.cloudflare.com',
      'https://example.com'
    ];

    for (const url of testUrls) {
      try {
        const response = await fetch(url, { timeout: 5000 });
        console.log(`${url}: ${response.status}`);
      } catch (error) {
        console.log(`${url}: Failed - ${error.message}`);
      }
    }
  }
}
```

### 3. Storage Issues

#### Disk Space
```bash
# Check disk usage
df -h

# Find large files
find /tmp -type f -size +100M -exec ls -lh {} \;

# Clean up test artifacts
npm run test:cleanup
```

**Automated Cleanup:**
```javascript
// cleanup-manager.js
class CleanupManager {
  async cleanup() {
    const patterns = [
      'test-results/**/*',
      'playwright-report/**/*',
      'screenshots/**/*',
      'videos/**/*',
      'traces/**/*',
      'downloads/**/*'
    ];

    for (const pattern of patterns) {
      await this.cleanPattern(pattern);
    }

    // Clean old files (older than 7 days)
    const expiredDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.cleanOldFiles('/tmp', expiredDate);
  }

  async cleanPattern(pattern) {
    const files = await glob(pattern);
    for (const file of files) {
      try {
        await fs.promises.unlink(file);
        console.log(`Deleted: ${file}`);
      } catch (error) {
        console.error(`Failed to delete ${file}:`, error);
      }
    }
  }
}
```

## Performance Issues

### 1. Slow Test Execution

#### Diagnostic Steps
```bash
# Profile test execution
time npm run test:single -- --test-name="slow-test"

# Enable debug logging
DEBUG=pw:api npm run test

# Check for memory usage spikes
node --inspect npm run test
```

#### Common Causes and Solutions

**1. Inefficient Selectors**
```javascript
// Slow: Generic selectors
await page.click('button');
await page.fill('input', 'text');

// Fast: Specific selectors
await page.click('button[data-testid="submit-btn"]');
await page.fill('input[data-testid="email-input"]', 'text');
```

**2. Excessive Waits**
```javascript
// Slow: Fixed waits
await page.waitForTimeout(5000);

// Fast: Smart waits
await page.waitForSelector('.result', { state: 'visible' });
await page.waitForLoadState('networkidle');
```

**3. Unnecessary Actions**
```javascript
// Slow: Multiple navigations
await page.goto('https://example.com/page1');
await page.goto('https://example.com/page2');
await page.goto('https://example.com/page3');

// Fast: Single context, multiple pages
const context = await browser.newContext();
const page1 = await context.newPage();
const page2 = await context.newPage();
const page3 = await context.newPage();

await Promise.all([
  page1.goto('https://example.com/page1'),
  page2.goto('https://example.com/page2'),
  page3.goto('https://example.com/page3')
]);
```

### 2. Memory Leaks

#### Detection
```javascript
// Memory profiling
class MemoryProfiler {
  async profileMemoryUsage(testFn) {
    const initialMemory = process.memoryUsage();

    await testFn();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalMemory = process.memoryUsage();

    return {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external,
      rss: finalMemory.rss - initialMemory.rss
    };
  }

  detectMemoryLeaks(metrics) {
    const thresholds = {
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 20 * 1024 * 1024, // 20MB
      rss: 150 * 1024 * 1024 // 150MB
    };

    return Object.entries(metrics)
      .filter(([key, value]) => Math.abs(value) > thresholds[key])
      .map(([key, value]) => ({
        metric: key,
        increase: value,
        severity: value > thresholds[key] * 2 ? 'high' : 'medium'
      }));
  }
}
```

## Environment Issues

### 1. Configuration Problems

#### Environment Variables
```bash
# Check environment variables
env | grep -E "(PLAYWRIGHT|TEST|BROWSER)"

# Validate configuration
npm run test:validate-config
```

**Common Issues:**
```javascript
// Missing environment variables
if (!process.env.TEST_ENV) {
  throw new Error('TEST_ENV is required but not set');
}

// Invalid browser configuration
const supportedBrowsers = ['chromium', 'firefox', 'webkit'];
if (!supportedBrowsers.includes(process.env.BROWSER)) {
  throw new Error(`Unsupported browser: ${process.env.BROWSER}`);
}
```

### 2. Permission Issues

#### File Permissions
```bash
# Check file permissions
ls -la /path/to/test/files

# Fix permissions
chmod 755 /path/to/test/files
chown -R testuser:testgroup /path/to/test/files
```

#### Browser Permissions
```javascript
// Grant necessary permissions
const context = await browser.newContext({
  permissions: ['camera', 'microphone', 'geolocation']
});

// Handle permission dialogs
page.on('dialog', async dialog => {
  if (dialog.type() === 'permission') {
    await dialog.accept();
  }
});
```

## Test-Specific Issues

### 1. PDF Tool Testing

#### Common Problems
```javascript
// PDF loading issues
await page.waitForSelector('#pdf-viewer', { timeout: 10000 });
await page.waitForFunction(() => {
  const viewer = document.querySelector('#pdf-viewer');
  return viewer.classList.contains('loaded');
});

// Large PDF handling
const largePdfConfig = {
  timeout: 60000,
  expect: {
    timeout: 30000
  }
};
```

### 2. Video Processing Issues

#### FFmpeg Problems
```bash
# Check FFmpeg installation
ffmpeg -version

# Test video conversion
ffmpeg -i input.mp4 -vf scale=320:240 output.mp4
```

### 3. Large File Handling

```javascript
// Chunked file processing
async function processLargeFile(file, chunkSize = 10 * 1024 * 1024) {
  const chunks = [];
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    chunks.push(chunk);
    offset += chunkSize;
  }

  return Promise.all(chunks.map(processChunk));
}
```

## Diagnostic Tools

### 1. Test Debugging

```javascript
// Debug configuration
const debugConfig = {
  headless: false,
  slowMo: 100,
  devtools: true,
  logger: {
    isEnabled: (name, severity) => true,
    log: (name, severity, message, args) => console.log(`[${name}] ${message}`)
  }
};
```

### 2. Screenshot Debugging

```javascript
// Screenshot on failure
const screenshotOnFailure = async (page, testName) => {
  try {
    await page.screenshot({
      path: `screenshots/${testName}-failure-${Date.now()}.png`,
      fullPage: true
    });
  } catch (error) {
    console.error('Failed to take screenshot:', error);
  }
};
```

### 3. Video Recording

```javascript
// Record test execution
const context = await browser.newContext({
  recordVideo: {
    dir: 'videos/',
    size: { width: 1280, height: 720 }
  }
});

// Save video on failure
await context.close();
const videoPath = await page.video().path();
await page.video().saveAs(`videos/${testName}-failure.mp4`);
```

## Recovery Procedures

### 1. Test Environment Recovery

```bash
# Reset test environment
npm run test:reset-env

# Clean and rebuild
cd apps/web
rm -rf node_modules package-lock.json
npm install
npx playwright install

# Restart services
npm run dev &
```

### 2. Browser Recovery

```bash
# Clear browser data
rm -rf ~/Library/Caches/ms-playwright  # macOS
rm -rf ~/.cache/ms-playwright          # Linux
rm -rf %USERPROFILE%\AppData\Local\ms-playwright  # Windows

# Reinstall browsers
npx playwright install --force
```

### 3. Database Recovery

```bash
# Reset test database
npm run db:reset:test

# Restore from backup
npm run db:restore -- --backup=test-backup.sql
```

## Escalation Procedures

### Level 1 - Self-Service
- Check this troubleshooting guide
- Search existing issues
- Review test logs
- Attempt basic fixes

### Level 2 - Team Support
- Contact testing team
- Share diagnostic information
- Create detailed issue report
- Implement team suggestions

### Level 3 - Vendor Support
- Contact Playwright support
- Engage cloud provider support
- Involve security team if needed
- Document incident thoroughly

## Emergency Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Infrastructure | DevOps Team | 30 minutes |
| Security | Security Team | 15 minutes |
| Vendor Support | Playwright Support | 24 hours |
| Critical Outage | On-call Engineer | 5 minutes |

## Prevention Strategies

### 1. Proactive Monitoring
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: checkDatabase(),
      storage: checkStorage(),
      browsers: checkBrowsers()
    }
  };

  const isHealthy = Object.values(health.services).every(s => s.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 2. Automated Recovery
```javascript
// Self-healing mechanism
class SelfHealing {
  async attemptRecovery(error) {
    const recoveryStrategies = [
      this.retryWithDelay,
      this.restartBrowser,
      this.clearCache,
      this.resetEnvironment
    ];

    for (const strategy of recoveryStrategies) {
      try {
        await strategy(error);
        return true;
      } catch (recoveryError) {
        console.log(`Recovery strategy failed: ${recoveryError.message}`);
        continue;
      }
    }

    return false;
  }
}
```

### 3. Regular Health Checks
```bash
# Daily health check script
#!/bin/bash

# Check test environment
npm run test:health-check

# Verify infrastructure
./scripts/check-infrastructure.sh

# Validate configurations
npm run test:validate-config

# Report issues
if [ $? -ne 0 ]; then
  ./scripts/send-alert.sh "Test environment unhealthy"
fi
```

## Documentation Updates

This troubleshooting guide is updated:
- Weekly with new issues
- Monthly with resolution statistics
- Quarterly with prevention strategies
- As needed for new features

Last Updated: [Current Date]
Next Review: [Next Review Date]