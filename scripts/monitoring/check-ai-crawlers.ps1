# AI Crawler Monitoring Script for Windows (PowerShell)
# New Life Solutions - AI Search Bot Access Verification

param(
    [string]$OutputFile = "",
    [switch]$Verbose
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  AI Search Bot Monitoring - New Life Solutions" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Timestamp: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss UTC'))" -ForegroundColor Gray
Write-Host ""

# Default output file
if (-not $OutputFile) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputFile = "..\..\data\ai-crawlers-$timestamp.json"
}

# Create output directory
$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$robotsUrl = "https://www.newlifesolutions.dev/robots.txt"

# AI bots to monitor (critical for GEO)
$AI_BOTS = @(
    @{ name = "GPTBot"; importance = "critical"; description = "OpenAI ChatGPT crawler" }
    @{ name = "ClaudeBot"; importance = "critical"; description = "Anthropic Claude crawler" }
    @{ name = "PerplexityBot"; importance = "high"; description = "Perplexity AI crawler" }
    @{ name = "OAI-SearchBot"; importance = "high"; description = "OpenAI search crawler" }
    @{ name = "ChatGPT-User"; importance = "high"; description = "ChatGPT browser extension" }
    @{ name = "Google-Extended"; importance = "medium"; description = "Google Bard/Gemini crawler" }
)

Write-Host "🔍 Checking AI bots configuration in robots.txt..." -ForegroundColor Yellow
Write-Host ""

# Function to fetch robots.txt
function Get-RobotsTxtConfig {
    try {
        $response = Invoke-WebRequest -Uri $robotsUrl -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ robots.txt accessible" -ForegroundColor Green
            return $response.Content
        } else {
            Write-Host "❌ Cannot fetch robots.txt (HTTP $($response.StatusCode))" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "❌ Failed to fetch robots.txt: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fetch robots.txt
$robotsContent = Get-RobotsTxtConfig

Write-Host "📊 Analyzing AI bot configuration:" -ForegroundColor Yellow
Write-Host ""

$botResults = @{}
$configuredCount = 0

foreach ($bot in $AI_BOTS) {
    Write-Host "Testing: $($bot.name)" -NoNewline -ForegroundColor Cyan
    $isConfigured = $false
    if ($robotsContent) {
        $pattern = "User-agent:\s*$($bot.name)"
        if ($robotsContent -match $pattern) { $isConfigured = $true }
    }

    if ($isConfigured) {
        $configuredCount++
        Write-Host " ✅ configured" -ForegroundColor Green
        $status = "configured"
    } else {
        Write-Host " ❌ not configured" -ForegroundColor Red
        $status = "not_configured"
    }

    $botResults[$bot.name] = @{
        importance = $bot.importance
        description = $bot.description
        configured = $isConfigured
        status = $status
        last_access = $null
        access_count = 0
        notes = if ($isConfigured) { "Allowed in robots.txt" } else { "Not found in robots.txt - ADD IMMEDIATELY" }
    }
    Write-Host ""
}

Write-Host "Configuration Summary:" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow
Write-Host "Configured: $configuredCount/$($AI_BOTS.Count)" -ForegroundColor $(if ($configuredCount -eq $AI_BOTS.Count) { "Green" } else { "Red" })
Write-Host ""

# Check for llms.txt
Write-Host "🔍 Checking llms.txt..." -ForegroundColor Yellow
try {
    $llmsResponse = Invoke-WebRequest -Uri "https://www.newlifesolutions.dev/llms.txt" -UseBasicParsing -TimeoutSec 10
    if ($llmsResponse.StatusCode -eq 200) {
        Write-Host "✅ llms.txt is accessible" -ForegroundColor Green
        $llmsAccessible = $true
        $llmsSize = $llmsResponse.Content.Length
        Write-Host "   Size: $llmsSize bytes" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  llms.txt returned HTTP $($llmsResponse.StatusCode)" -ForegroundColor Yellow
        $llmsAccessible = $false
    }
} catch {
    Write-Host "⚠️  llms.txt not found (404)" -ForegroundColor Yellow
    $llmsAccessible = $false
}
Write-Host ""

# Output results
$output = @{
    audit_type = "ai_crawler_access"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss UTC")
    domain = "newlifesolutions.dev"
    robots_txt_url = $robotsUrl
    llms_txt_url = "https://www.newlifesolutions.dev/llms.txt"
    llms_txt_accessible = $llmsAccessible
    total_bots = $AI_BOTS.Count
    configured_bots = $configuredCount
    configuration_percentage = [Math]::Round(($configuredCount / $AI_BOTS.Count) * 100, 1)
    bots = $botResults
    recommendations = @(
        @{
            severity = "high"
            message = "Re-run this script in 7-14 days to check for crawler visits"
            action = "Monitor server access logs for AI bot User-Agent strings"
        }
    )
}

$output | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8

# Display summary
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  ✅ AI Crawler Audit Complete!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Results: $OutputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "SUMMARY:" -ForegroundColor Yellow
Write-Host "=========" -ForegroundColor Yellow

foreach ($bot in $AI_BOTS) {
    $status = $botResults[$bot.name]
    $icon = if ($status.configured) { "✅" } else { "❌" }
    $color = if ($status.configured) { "Green" } else { "Red" }
    Write-Host "  $icon $($bot.name.PadRight(15)) - $($status.status)" -ForegroundColor $color
}

Write-Host ""
Write-Host "CRITICAL for GEO Success:" -ForegroundColor Yellow
Write-Host "  • All 6 bots must be ALLOWED (not blocked)" -ForegroundColor White
Write-Host "  • This enables AI crawlers to index your content" -ForegroundColor White
Write-Host "  • Indexing can take 14-30 days after configuration" -ForegroundColor Gray
Write-Host "  • Monitor access logs for first crawler visits" -ForegroundColor Gray

if ($configuredCount -lt $AI_BOTS.Count) {
    Write-Host ""
    Write-Host "⚠️  ACTION REQUIRED: Add missing bots to robots.txt" -ForegroundColor Red
    Write-Host "   Example:" -ForegroundColor Gray
    Write-Host "   User-agent: GPTBot`n   Allow: /" -ForegroundColor Gray
}

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Green
Write-Host "============"
Write-Host "1. Re-run this script weekly to check for crawler visits"
Write-Host "2. Monitor server access logs for AI bot User-Agent strings"
Write-Host "3. Check Search Console for indexation status"
Write-Host "4. Use manual AI prompts to test citation appearance"
Write-Host ""
Write-Host "Expected timeline to first AI citations: 30-60 days" -ForegroundColor DarkGray
Write-Host "================================================================================" -ForegroundColor Green

exit 0
