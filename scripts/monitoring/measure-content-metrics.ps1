# Content & AI Citation Monitoring for New Life Solutions
# Measures content performance and AI citation metrics

param(
    [string]$OutputFile = "",
    [string]$SiteUrl = "https://www.newlifesolutions.dev",
    [switch]$UseGoogleSearchConsole         # Requires authentication
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  Content & AI Citation Monitoring" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Timestamp: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss UTC'))" -ForegroundColor Gray
Write-Host ""

# Default output file
if (-not $OutputFile) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputFile = "..\..\data\content-metrics-$timestamp.json"
}

# Create output directory
$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Conversational pages to monitor
$CONVERSATIONAL_PAGES = @(
    @{ path = "/guides/merge-pdfs-privacy"; target_query = "merge pdf files without uploading"; priority = "high" }
    @{ path = "/guides/compress-images-lossless"; target_query = "compress images without quality loss"; priority = "high" }
    @{ path = "/guides/video-compress-no-watermark"; target_query = "compress video no watermark"; priority = "medium" }
    @{ path = "/guides/transcribe-audio-privacy"; target_query = "transcribe audio private"; priority = "medium" }
    @{ path = "/guides/json-format-validator"; target_query = "json format validator online"; priority = "low" }
)

# Tool pages to monitor
$TOOL_PAGES = @(
    @{ path = "/tools/pdf-merge"; name = "PDF Merge"; category = "pdf" }
    @{ path = "/tools/image-compress"; name = "Image Compress"; category = "image" }
    @{ path = "/tools/video-compress"; name = "Video Compress"; category = "video" }
    @{ path = "/tools/ai-transcribe"; name = "AI Transcribe"; category = "ai" }
)

Write-Host "📊 Checking content metrics..." -ForegroundColor Yellow
Write-Host ""

# Function to check if page exists and is indexable
function Test-PageIndexability {
    param($PagePath)

    $fullUrl = "$SiteUrl$PagePath"

    try {
        $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing -TimeoutSec 10

        # Check for noindex meta tag
        $hasNoIndex = $response.Content -match '<meta[^>]*name=["''\']robots["''\'][^>]*content=["''\'][^>]*noindex[^>]*["''\']'

        return @{
            exists = $true
            status_code = $response.StatusCode
            indexable = -not $hasNoIndex
            noindex_tag = $hasNoIndex
            content_length = $response.Content.Length
        }
    } catch {
        return @{
            exists = $false
            status_code = 0
            indexable = $false
            error = $_.Exception.Message
        }
    }
}

# Check conversational pages
$conversationalResults = @()
$totalPages = $CONVERSATIONAL_PAGES.Count + $TOOL_PAGES.Count
$indexedPages = 0

Write-Host "📝 Conversational Pages:" -ForegroundColor Cyan
foreach ($page in $CONVERSATIONAL_PAGES) {
    Write-Host "  Checking: $($page.path)" -ForegroundColor Gray -NoNewline

    $indexability = Test-PageIndexability -PagePath $page.path

    if ($indexability.exists) {
        if ($indexability.indexable) {
            $indexedPages++
            Write-Host " ✅ (indexed)" -ForegroundColor Green
        } else {
            Write-Host " ⚠️  (noindex tag)" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ❌ (does not exist)" -ForegroundColor Red
    }

    $conversationalResults += @{
        path = $page.path
        target_query = $page.target_query
        priority = $page.priority
        exists = $indexability.exists
        status_code = $indexability.status_code
        indexable = $indexability.indexable
        noindex_tag = $indexability.noindex_tag
        last_modified = $null  # Would need CMS integration
        word_count = $null     # Would need content analysis
    }
}

Write-Host ""

# Check tool pages
$toolResults = @()

Write-Host "🔧 Tool Pages:" -ForegroundColor Cyan
foreach ($page in $TOOL_PAGES) {
    Write-Host "  Checking: $($page.path)" -ForegroundColor Gray -NoNewline

    $indexability = Test-PageIndexability -PagePath $page.path

    if ($indexability.exists) {
        if ($indexability.indexable) {
            $indexedPages++
            Write-Host " ✅ (indexed)" -ForegroundColor Green
        } else {
            Write-Host " ⚠️  (noindex)" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ❌ (404)" -ForegroundColor Red
    }

    $toolResults += @{
        name = $page.name
        path = $page.path
        category = $page.category
        exists = $indexability.exists
        status_code = $indexability.status_code
        indexable = $indexability.indexable
        structured_data = $null  # Would validate schema markup
    }
}

Write-Host ""
Write-Host "Indexing Status:" -ForegroundColor Yellow
Write-Host "   Total pages: $totalPages" -ForegroundColor Gray
Write-Host "   Indexed: $indexedPages" -ForegroundColor $(if ($indexedPages -eq $totalPages) { "Green" } else { "Yellow" })
if ($totalPages -gt 0) {
    $pctIndexed = [Math]::Round(($indexedPages / $totalPages) * 100, 1)
    Write-Host "   Percentage: $pctIndexed%" -ForegroundColor $(if ($pctIndexed -eq 100) { "Green" } else { "Yellow" })
}
Write-Host ""

Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  ✅ Content Metrics Collection Complete!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Results saved to: $OutputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTES:" -ForegroundColor Yellow
Write-Host "======="
Write-Host "⚠️  AI citation tracking requires manual testing currently"
Write-Host "⚠️  Use prompts like: '$($CONVERSATIONAL_PAGES[0].target_query)' in ChatGPT/Perplexity"
Write-Host "⚠️  Document appearances in data/ai-citation-manual-tests.json"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Green
Write-Host "============"
Write-Host "1. Run manual AI citation tests weekly"
Write-Host "2. Update $($OutputFile) with positive results"
Write-Host "3. Track trends over 30-60 days"
Write-Host "4. Use Google Search Console API when available"
Write-Host "================================================================================" -ForegroundColor Green

# Save results
$contentMetrics = @{
    audit_type = "content_and_ai_citations"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss UTC")
    site_url = $SiteUrl
    conversational_pages = $conversationalResults
    tool_pages = $toolResults
    summary = @{
        total_pages = $totalPages
        indexed_pages = $indexedPages
        indexing_percentage = if ($totalPages -gt 0) { [Math]::Round(($indexedPages / $totalPages) * 100, 1) } else { 0 }
        ai_citations_detected = 0  # Manual tracking
        manual_test_recommended = $true
    }
}

$contentMetrics | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8

exit 0
