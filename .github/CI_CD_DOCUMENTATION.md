# Optimized CI/CD Pipeline Documentation

## Overview

This CI/CD pipeline is designed for the New Life Solutions monorepo, featuring:

- **54 browser-based tools** (PDF, images, AI utilities)
- **995 tests** across 5 browsers
- **6.5 minute** total test execution time
- **39 second** build time
- **100% client-side processing** (no server uploads)

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Changes       │────▶│   Build & Cache  │────▶│   Test Matrix   │
│   Detection     │     │   Dependencies   │     │   (Parallel)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                       ┌──────────────────┐            ▼
                       │   Deploy Gate    │◀──┌─────────────────┐
                       │   (Conditional)  │   │   Test Summary  │
                       └──────────────────┘   │   & Reports     │
                                │             └─────────────────┘
                                ▼                    │
                       ┌──────────────────┐          │
                       │   Notifications  │◀─────────┘
                       │   & Monitoring   │
                       └──────────────────┘
```

## Key Features

### 1. Smart Change Detection
- **Paths-based filtering** with `dorny/paths-filter`
- **Affected test detection** maps changed files to tests
- **Import analysis** finds tests that import changed modules
- **Tag-based filtering** for selective test execution

### 2. Optimized Caching Strategy

#### NPM Dependencies Cache
```yaml
- path: |
    ~/.npm
    apps/web/node_modules
    node_modules
- key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
```

#### Build Output Cache
```yaml
- path: apps/web/dist
- key: ${{ runner.os }}-build-${{ hashFiles('apps/web/**') }}
```

#### Playwright Browser Cache
```yaml
- path: ~/.cache/ms-playwright
- key: ${{ runner.os }}-playwright-${{ env.PLAYWRIGHT_VERSION }}
```

### 3. Parallel Test Execution

#### Test Sharding (4 shards)
- **Shard 1**: Tools 1-14 (PDF tools)
- **Shard 2**: Tools 15-28 (Image tools)
- **Shard 3**: Tools 29-42 (Media tools)
- **Shard 4**: Tools 43-54 + Admin + Guides

#### Browser Matrix (CI Optimized)
- **Primary**: Chromium (desktop + mobile)
- **Full suite**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

### 4. Visual Regression Testing

#### Conditional Execution
```yaml
if: |
  needs.changes.outputs.web-changed == 'true' &&
  needs.changes.outputs.should-skip-visual != 'true'
```

#### Baseline Management
- **Update on main**: Auto-update baselines after merge
- **Compare on PR**: Check against main branch baselines
- **Artifact storage**: 14-day retention for visual diffs

### 5. Performance Monitoring

#### Metrics Tracked
- Build time (target: <60s)
- Bundle size (target: <25MB)
- Test execution time (target: <7min)
- Lighthouse scores (performance >90)

#### Regression Detection
```javascript
const thresholds = {
  buildTime: 1.2,    // 20% increase threshold
  bundleSize: 1.1,   // 10% increase threshold
  testTime: 1.3,     // 30% increase threshold
};
```

## Workflow Jobs

### 1. `changes` - Change Detection
- **Purpose**: Identify what changed and what to test
- **Duration**: ~15s
- **Outputs**:
  - `web-changed`: Web app changes detected
  - `tests-changed`: Test files modified
  - `affected-tests`: List of affected test files
  - `should-skip-visual`: Skip visual tests flag

### 2. `build` - Build & Cache
- **Purpose**: Build application and cache dependencies
- **Duration**: 39s (with cache hit: ~5s)
- **Key features**:
  - Parallel dependency installation
  - Build output caching
  - Artifact upload for downstream jobs

### 3. `playwright-deps` - Browser Setup
- **Purpose**: Install Playwright browsers with caching
- **Duration**: ~45s (with cache hit: ~5s)
- **Browsers**: Chromium, Firefox, WebKit

### 4. `quality-check` - Code Quality
- **Purpose**: Type checking and security audit
- **Duration**: ~20s
- **Checks**:
  - TypeScript compilation
  - npm audit (high/critical vulnerabilities)

### 5. `e2e-tests` - End-to-End Tests
- **Purpose**: Run E2E tests in parallel shards
- **Duration**: ~6.5min total (1.6min per shard)
- **Configuration**:
  - 4 parallel shards
  - 3 workers per shard
  - 1 retry on failure
  - 20s timeout per test

### 6. `visual-tests` - Visual Regression
- **Purpose**: Screenshot comparison testing
- **Duration**: ~3min
- **Features**:
  - Conditional execution based on changes
  - Automatic baseline updates on main
  - 0.2% pixel tolerance

### 7. `a11y-tests` - Accessibility
- **Purpose**: WCAG 2.1 AA compliance testing
- **Duration**: ~2min
- **Tool**: axe-core with Playwright

### 8. `performance-tests` - Lighthouse CI
- **Purpose**: Performance and best practices audit
- **Duration**: ~2min
- **URLs tested**:
  - Homepage
  - PDF Merge tool
  - Image Converter tool
  - Hub page

### 9. `deploy` - Deployment
- **Purpose**: Deploy to Vercel (conditional)
- **Triggers**:
  - Push to main/master
  - PR with 'deploy-preview' label
- **Features**:
  - Automatic rollback on failure
  - Environment-specific deployments

### 10. `test-summary` - Reporting
- **Purpose**: Aggregate results and notifications
- **Features**:
  - Test result aggregation
  - Slack notifications
  - Performance regression alerts

## Test Organization

### Directory Structure
```
apps/web/tests/
├── e2e/                    # End-to-end tests
│   ├── tools/             # Tool-specific tests
│   ├── guides/            # Guide page tests
│   └── use-cases/         # Use case tests
├── visual/                # Visual regression tests
├── accessibility/         # a11y tests
├── performance/           # Performance tests
└── utils/                 # Test utilities
```

### Test Naming Convention
```
[feature]-[subfeature].[spec|test|e2e].ts

Examples:
- pdf-merge.spec.ts
- image-converter-visual.spec.ts
- accessibility-homepage.spec.ts
```

### Test Tags
```typescript
const TAGS = {
  SMOKE: 'smoke',           // Critical path tests
  CRITICAL: 'critical',     // Must-pass tests
  VISUAL: 'visual',         # Visual regression
  ACCESSIBILITY: 'a11y',    # Accessibility tests
  PERFORMANCE: 'performance', // Performance tests
  E2E: 'e2e',               # End-to-end tests
  MOBILE: 'mobile',         # Mobile-specific
  DESKTOP: 'desktop',       # Desktop-specific
};
```

## Performance Optimizations

### 1. Parallel Execution
- **4 test shards** run simultaneously
- **3 workers per shard** for test parallelization
- **Build and test** jobs run in parallel

### 2. Smart Caching
- **NPM cache**: ~2min saved per run
- **Build cache**: ~30s saved per run
- **Browser cache**: ~40s saved per run

### 3. Affected Tests Detection
- **~70% test reduction** for typical changes
- **Sub-second detection** time
- **Automatic test mapping** based on imports

### 4. Resource Optimization
- **Filtered browser testing** in CI (Chromium only)
- **Conditional visual tests** (skip for docs changes)
- **Fail-fast configuration** (max 10 failures)

## Deployment Strategy

### Production Deployment
```
main branch → Build → All tests pass → Deploy to prod
```

### Preview Deployment
```
PR + label → Build → Smoke tests pass → Deploy preview
```

### Rollback Strategy
1. **Automatic rollback** on test failure
2. **Issue creation** with rollback details
3. **Notification** to #ci-cd channel
4. **Previous version** deployment

## Monitoring & Alerting

### Metrics Dashboard
- **Build duration** tracking
- **Test success rate** monitoring
- **Performance regression** detection
- **Bundle size** alerts

### Slack Notifications
- **Success**: Build duration, test summary
- **Failure**: Error details, affected components
- **Performance**: Regression warnings

### GitHub Integration
- **PR comments** with test results
- **Status checks** for required tests
- **Auto-merge** on passing checks

## Best Practices

### 1. Test Writing
- Use `test-helpers.ts` for common operations
- Tag tests appropriately for selective execution
- Write atomic, independent tests
- Use Page Object Model for complex pages

### 2. Performance
- Keep tests under 20s each
- Use `waitFor` instead of fixed delays
- Reuse page instances when possible
- Clean up resources after tests

### 3. Reliability
- Use unique test data
- Handle network conditions
- Add retries for flaky operations
- Use stable selectors

### 4. Maintenance
- Update visual baselines regularly
- Review and remove obsolete tests
- Keep test data fresh
- Monitor test performance

## Troubleshooting

### Common Issues

#### 1. Cache Misses
```bash
# Clear all caches
gh cache delete --all
```

#### 2. Visual Test Failures
```bash
# Update baselines locally
npm run test:update-snapshots
```

#### 3. Flaky Tests
```bash
# Run with retries
npx playwright test --retries=3
```

#### 4. Performance Issues
```bash
# Run performance monitor
node scripts/performance-monitor.js --with-tests
```

### Debug Mode
```bash
# Run tests in headed mode
npm run test:e2e:headed

# Run specific test with debug
npx playwright test -g "test name" --debug
```

## Migration Guide

### From Current Setup
1. **Backup existing workflows**
2. **Update package.json scripts**
3. **Configure secrets** (Vercel, Slack)
4. **Test in feature branch**
5. **Update branch protection rules**

### Rollback Plan
1. **Keep old workflow** as `legacy.yml`
2. **Monitor for 1 week** after deployment
3. **Quick switch** via GitHub UI if needed

## Future Enhancements

### Planned Features
- **Test analytics dashboard** (Grafana)
- **ML-based test selection**
- **Cross-browser visual testing**
- **Performance budgets enforcement**
- **Auto-healing tests**

### Performance Targets
- **Build time**: <30s (currently 39s)
- **Test time**: <5min (currently 6.5min)
- **Deploy time**: <2min (currently ~1min)
- **Total pipeline**: <8min (currently ~9min)

---

For questions or issues, contact the DevOps team or create an issue in the repository.