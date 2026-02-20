# New Life Solutions - Performance Measurement Script (Windows)
# Usage: .\measure-performance.ps1 -Baseline -OutputFile "data\performance-YYYYMM.json"

param(
    [switch]$Baseline,
    [string]$OutputFile = "",
    [string]$BaseUrl = "https://www.newlifesolutions.dev"
)

Write-Host "=== New Life Solutions Performance Audit (Windows) ===" -ForegroundColor Cyan
Write-Host "Timestamp: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss UTC'))"
Write-Host ""

if (-not $OutputFile) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputFile = "..\..\data\performance-$timestamp.json"
}

$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$lighthouseCmd = Get-Command lighthouse -ErrorAction SilentlyContinue
$npxCmd = Get-Command npx -ErrorAction SilentlyContinue

if (-not $lighthouseCmd -and -not $npxCmd) {
    Write-Error "Lighthouse is not available. Install it with: npm install -D lighthouse"
    exit 1
}

function Invoke-LighthouseRun {
    param(
        [string]$Url,
        [string]$Preset
    )

    $tempFile = [System.IO.Path]::GetTempFileName()
    $args = @(
        $Url,
        '--output=json',
        "--output-path=$tempFile",
        '--only-categories=performance',
        "--preset=$Preset",
        '--quiet',
        '--chrome-flags=--headless'
    )

    if ($lighthouseCmd) {
        & $lighthouseCmd.Source @args | Out-Null
    } else {
        & $npxCmd.Source @('lighthouse') + $args | Out-Null
    }

    if ($LASTEXITCODE -ne 0) {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        throw "Lighthouse failed for $Url ($Preset)"
    }

    $report = Get-Content -Raw $tempFile | ConvertFrom-Json
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue

    return @{
        lcp_ms = [Math]::Round($report.audits.'largest-contentful-paint'.numericValue)
        cls = [Math]::Round($report.audits.'cumulative-layout-shift'.numericValue, 3)
        tbt_ms = [Math]::Round($report.audits.'total-blocking-time'.numericValue)
        score = [Math]::Round($report.categories.performance.score * 100)
    }
}

$tools = @(
    @{ url = "$BaseUrl/tools/pdf-merge"; name = "pdf-merge" }
    @{ url = "$BaseUrl/tools/image-compress"; name = "image-compress" }
    @{ url = "$BaseUrl/tools/video-compressor"; name = "video-compressor" }
    @{ url = "$BaseUrl/tools/audio-transcription"; name = "audio-transcription" }
    @{ url = "$BaseUrl/tools/json-formatter"; name = "json-formatter" }
)

$output = @{
    audit_type = "performance"
    baseline_mode = [bool]$Baseline
    timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss UTC')
    url_tested = $BaseUrl
    audit_source = "lighthouse"
    metric_notes = @{
        tbt_ms = "Total Blocking Time (lab proxy for interactivity)"
    }
    tools = @{}
}

try {
    foreach ($tool in $tools) {
        Write-Host "Testing: $($tool.name)" -ForegroundColor Green

        $desktopMetrics = Invoke-LighthouseRun -Url $tool.url -Preset "desktop"
        $mobileMetrics = Invoke-LighthouseRun -Url $tool.url -Preset "mobile"

        $output.tools[$tool.name] = @{
            desktop_lcp_ms = $desktopMetrics.lcp_ms
            desktop_cls = $desktopMetrics.cls
            desktop_tbt_ms = $desktopMetrics.tbt_ms
            desktop_score = $desktopMetrics.score
            mobile_lcp_ms = $mobileMetrics.lcp_ms
            mobile_cls = $mobileMetrics.cls
            mobile_tbt_ms = $mobileMetrics.tbt_ms
            mobile_score = $mobileMetrics.score
        }
    }
} catch {
    Write-Error $_
    exit 1
}

$output | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host ""
Write-Host "Performance audit complete." -ForegroundColor Green
Write-Host "Results saved to: $OutputFile" -ForegroundColor Cyan
Write-Host ""

foreach ($tool in $tools) {
    $data = $output.tools[$tool.name]
    if ($null -ne $data) {
        Write-Host "$($tool.name): LCP=$($data.desktop_lcp_ms)ms, Score=$($data.desktop_score)/100"
    }
}

exit 0
