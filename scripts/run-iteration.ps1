# New Life Solutions - SEO/GEO Iteration Automation Script
# Master script to run complete monthly iteration

param(
    [int]$IterationNumber = 1,
    [switch]$RunAll,
    [switch]$SkipPerformance,
    [switch]$SkipAiCrawlers,
    [switch]$SkipContent
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  New Life Solutions - SEO/GEO Iteration #$IterationNumber" -ForegroundColor Cyan
Write-Host "  $(Get-Date)" -ForegroundColor Gray
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Setup iteration directory
$iterationDir = "iteration-$IterationNumber"
$dataDir = "..\..\data\$iterationDir"

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "📁 Created directory: $dataDir" -ForegroundColor Green
}

Write-Host "Running iteration with: PowerShell $($PSVersionTable.PSVersion)" -ForegroundColor White
Write-Host ""

# Performance
if (-not $SkipPerformance) {
    Write-Host "STEP 1: Performance..." -ForegroundColor Yellow
    $output = "..\..\data\$iterationDir\performance.json"
    & .\measure-performance-FIXED.ps1 -OutputFile $output
    Write-Host "✅ Done" -ForegroundColor Green
    Write-Host ""
}

# AI Crawlers
if (-not $SkipAiCrawlers) {
    Write-Host "STEP 2: AI Crawlers..." -ForegroundColor Yellow
    $output = "..\..\data\$iterationDir\ai-crawlers.json"
    & .\check-ai-crawlers.ps1 -OutputFile $output
    Write-Host "✅ Done" -ForegroundColor Green
    Write-Host ""
}

# Content
if (-not $SkipContent) {
    Write-Host "STEP 3: Content Metrics..." -ForegroundColor Yellow
    $output = "..\..\data\$iterationDir\content-metrics.json"
    & .\measure-content-metrics.ps1 -OutputFile $output
    Write-Host "✅ Done" -ForegroundColor Green
    Write-Host ""
}

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  ✅ ITERATION #$IterationNumber COMPLETED!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Data saved in: $dataDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT: Review data files and plan next iteration" -ForegroundColor White

exit 0
