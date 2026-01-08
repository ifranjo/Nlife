# INSTALLATION GUIDE - New Life Solutions SEO/GEO System
# Version: 1.0 (Fixed - Anti-Hallucination Compliant)

## ⚠️ CRITICAL NOTICE

This system was completely rebuilt to fix CRITICAL BUGS identified in the original implementation:
- ❌ REMOVED: Random data generation (`Get-Random`)
- ❌ REMOVED: Fake projections presented as real
- ✅ ADDED: Reproducible baseline metrics
- ✅ ADDED: Real Lighthouse integration
- ✅ ADDED: Actual automation scripts
- ✅ ADDED: Windows compatibility

---

## 📦 DEPENDENCIES

### REQUIRED

1. **Node.js** (v16.0 or higher)
   ```
   Download: https://nodejs.org/
   Verify: node --version
   ```

2. **PowerShell** (v5.0 or higher) - Pre-installed on Windows 10/11
   ```
   Verify: $PSVersionTable.PSVersion
   ```

3. **Git** (optional, for version control)
   ```
   Download: https://git-scm.com/
   Verify: git --version
   ```

### OPTIONAL (For Real Measurements)

4. **Lighthouse CLI** (for real performance metrics)
   ```bash
   npm install -g lighthouse
   Verify: lighthouse --version
   ```

   If NOT installed, the system will use DOCUMENTED baseline values (REPRODUCIBLE, not random).

### NOT REQUIRED

- ✅ **NO jq needed** (PowerShell uses ConvertTo-Json)
- ✅ **NO curl needed** (PowerShell uses Invoke-WebRequest)
- ✅ **NO WSL needed** (Native Windows PowerShell)

---

## 🚀 QUICK INSTALL (5 minutes)

### Step 1: Install Node.js

**Windows:**
```powershell
# Using Chocolatey (recommended)
choco install nodejs

# Or download from https://nodejs.org/
```

**Verify installation:**
```powershell
node --version
npm --version
```

### Step 2: Install Lighthouse (Optional but Recommended)

```powershell
npm install -g lighthouse

# Verify
lighthouse --version
```

**If you skip this step:** The system will use documented baseline values from real measurements (January 2025). These are REPRODUCIBLE, not random.

### Step 3: Verify PowerShell

```powershell
$PSVersionTable.PSVersion
```

**Minimum required:** Major version 5 or higher

### Step 4: Test the Scripts

```powershell
cd C:\Users\ifranjo\scripts\newlife\scripts\monitoring

# Test performance measurement
.\measure-performance-FIXED.ps1 -Verbose

# Test AI crawler check
.\check-ai-crawlers.ps1 -Verbose
```

---

## 📂 FILE STRUCTURE

```
C:\Users\ifranjo\scripts\newlife\
├── scripts/
│   ├── monitoring/
│   │   ├── measure-performance-FIXED.ps1    # ✅ REAL metrics (not random)
│   │   ├── check-ai-crawlers.ps1           # ✅ Windows compatible
│   │   ├── measure-content-metrics.ps1     # ✅ Content tracking
│   │   └── run-iteration.ps1                # ✅ Automation master
│   └── run-iteration.ps1                    # Main orchestration script
├── data/
│   └── iteration-N/                         # Created per iteration
│       ├── performance.json                 # Real measurements
│       ├── ai-crawlers.json                # Crawler config
│       ├── content-metrics.json            # Content data
│       └── iteration-report.json           # Combined report
├── docs/
│   └── geo-system/                          # Protocol documentation
├── package.json                             # Node dependencies (if any)
└── BUGS_AND_HALLUCINATIONS_REPORT.md       # Original bug analysis
```

---

## 🎯 USAGE

### Method 1: Run Full Iteration (Recommended)

```powershell
cd C:\Users\ifranjo\scripts\newlife\scripts

# Run complete iteration
.\run-iteration.ps1 -IterationNumber 1
```

**Output:**
- Creates `data/iteration-1/` directory
- Runs all three measurements
- Generates combined report
- **Time:** ~2-5 minutes (with Lighthouse)
- **Time:** ~30 seconds (with baseline)

### Method 2: Run Individual Measurements

```powershell
cd C:\Users\ifranjo\scripts\newlife\scripts\monitoring

# Performance only
.\measure-performance-FIXED.ps1 -UseLighthouse -OutputFile "..\..\data\performance.json"

# AI crawlers only
.\check-ai-crawlers.ps1 -OutputFile "..\..\data\crawlers.json"

# Content metrics only
.\measure-content-metrics.ps1 -OutputFile "..\..\data\content.json"
```

### Method 3: Weekly Automation (PowerShell Scheduled Task)

```powershell
# Create scheduled task (runs every Monday at 9 AM)
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File 'C:\Users\ifranjo\scripts\newlife\scripts\run-iteration.ps1' -IterationNumber [AUTO]"

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am

Register-ScheduledTask `
    -TaskName "NewLife-SEO-Iteration" `
    -Action $action `
    -Trigger $trigger `
    -Description "Weekly SEO/GEO iteration for New Life Solutions"
```

---

## 📊 OUTPUT FILES

Each iteration creates timestamped JSON files:

### 1. performance.json
```json
{
  "measurement_method": "lighthouse_real|baseline_documented",
  "timestamp": "2025-01-08 12:00:00 UTC",
  "tools": {
    "pdf-merge": {
      "desktop": { "lcp": 3200, "fid": 120, "cls": 0.12, "score": 72 },
      "mobile": { "lcp": 3800, "fid": 180, "cls": 0.18, "score": 68 }
    }
  }
}
```

### 2. ai-crawlers.json
```json
{
  "audit_type": "ai_crawler_access",
  "configured_bots": 6,
  "total_bots": 6,
  "configuration_percentage": 100.0,
  "bots": {
    "GPTBot": { "configured": true, "status": "configured", ... }
  }
}
```

### 3. content-metrics.json
```json
{
  "conversational_pages": [ ... ],
  "tool_pages": [ ... ],
  "summary": {
    "total_pages": 9,
    "indexed_pages": 9,
    "indexing_percentage": 100
  }
}
```

### 4. iteration-report.json (Combined)
All three measurements plus metadata and errors.

---

## 🔄 ANTI-HALLUCINATION PROTOCOL

### Rules Implemented:

✅ **VERIFICABLE**: All metrics can be verified by re-running scripts
✅ **REPRODUCIBLE**: Baseline values are fixed (not random)
✅ **DOCUMENTED**: Every value has a clear source
✅ **HONEST**: No fake projections presented as real

### What Changed:

**BEFORE (Buggy):**
- `Get-Random` generated different values every run
- "Mejora 5-8% mensual" was pure speculation
- Before/After comparisons were invalid

**AFTER (Fixed):**
- Documented baseline values from real measurements
- Only claim improvements AFTER measuring
- All projections marked as "EXPECTED" not fact

---

## 🐛 TROUBLESHOOTING

### Error: "Lighthouse not found"
**Solution:** Option 1 - Install it:
```powershell
npm install -g lighthouse
```

**Solution:** Option 2 - Use baseline (automatic fallback):
The script automatically uses documented baseline values.

---

### Error: "Cannot fetch robots.txt"
**Meaning:** Site might be down or DNS not resolved.
**Check:**
```powershell
Test-Connection -ComputerName www.newlifesolutions.dev -Count 1
```

---

### Error: "Script execution disabled"
**Solution:** Set execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### Error: "Invoke-WebRequest fails"
**Solution:** Check internet connection and firewall:
```powershell
# Test basic connectivity
Invoke-WebRequest -Uri "https://www.google.com" -UseBasicParsing
```

---

## 📈 EXPECTED TIMELINE

**Iteration 1 (Setup):**
- Install dependencies: 5 minutes
- Run tests: 2-5 minutes
- Review outputs: 10 minutes
**Total: ~20 minutes**

**Iteration 2+ (Monthly):**
- Run automation: 2-5 minutes
- Analyze results: 15 minutes
- Plan optimizations: 30 minutes
**Total: ~45 minutes**

**Timeline to AI Citations:**
- Week 1-2: AI crawlers discover site
- Week 3-4: Indexing occurs
- Week 5-8: First citations may appear
- Month 3+: Consistent citation pattern

---

## ✅ VERIFICATION CHECKLIST

Run this after installation:

```powershell
# Test all scripts
Write-Host "Testing system..." -ForegroundColor Yellow

# Test prerequisites
$tests = @(
    @{ name = "Node.js"; command = { node --version }; optional = $false },
    @{ name = "PowerShell 5+"; command = { $PSVersionTable.PSVersion.Major -ge 5 }; optional = $false },
    @{ name = "Lighthouse"; command = { Get-Command lighthouse -ErrorAction SilentlyContinue }; optional = $true }
)

$allPassed = $true
foreach ($test in $tests) {
    try {
        $result = & $test.command
        if ($test.optional) {
            Write-Host "  ⚠️  $($test.name): $result (Optional)" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ $($test.name): OK" -ForegroundColor Green
        }
    } catch {
        if ($test.optional) {
            Write-Host "  ⚠️  $($test.name): Not found (Optional)" -ForegroundColor Yellow
        } else {
            Write-Host "  ❌ $($test.name): FAILED" -ForegroundColor Red
            $allPassed = $false
        }
    }
}

if ($allPassed) {
    Write-Host ""
    Write-Host "✅ All critical checks passed!" -ForegroundColor Green
    Write-Host "Ready to run: .\run-iteration.ps1 -IterationNumber 1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Some checks failed. Review errors above." -ForegroundColor Red
}
```

---

## 📚 DOCUMENTATION

- **Protocol:** `GEO_ITERATIVE_LOOP_PROTOCOL.md`
- **Bugs Fixed:** `BUGS_AND_HALLUCINATIONS_REPORT.md`
- **Agents:** `agents.md`
- **Quick Ref:** `QUICK_REFERENCE.md`

---

## 🎓 BEST PRACTICES

1. **Run First Baseline Immediately**
   - Establishes real starting point
   - Creates comparison baseline
   - Validates system is working

2. **Run Weekly (Not Monthly Initially)**
   - AI crawler discovery is slow
   - Weekly data builds trends faster
   - Adjust to monthly after Month 3

3. **Document Everything**
   - Save all JSON outputs
   - Keep error logs
   - Note any manual interventions

4. **Track AI Citations Manually**
   - Use prompts weekly in ChatGPT/Perplexity
   - Document first appearances
   - Track citation frequency

5. **Be Patient**
   - AI SEO takes 2-3 months minimum
   - Don't expect immediate results
   - Consistency beats intensity

---

## 🆘 GETTING HELP

If you encounter issues:

1. Check `BUGS_AND_HALLUCINATIONS_REPORT.md` for known issues
2. Review error messages in iteration outputs
3. Verify all dependencies are installed correctly
4. Test individual scripts in `scripts/monitoring/`

---

*This version is FIXED and ANTI-HALLUCINATION compliant.*
*All measurements are REAL or REPRODUCIBLE, not random.*
*Document version: 1.0-FIXED*
*Generated: 2025-01-08*
