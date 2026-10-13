#Requires -Version 5.1
<#
.SYNOPSIS
    Diagnoses observation photo paths: counts /analysis/ (temp, likely 404)
    vs /observations/ (permanent) URLs across all observations.

.DESCRIPTION
    Logs in as admin, fetches every observation (paginated + deduped by id),
    and tallies each photo URL by path type. Reports per-observation detail
    for any observation that still references /analysis/.

.PARAMETER BaseUrl
    API base URL. Defaults to the Azure production API.

.PARAMETER Email
    Admin email. Defaults to the seed admin.

.PARAMETER Password
    Admin password. Defaults to the seed password.

.EXAMPLE
    .\Diagnose-PhotoPaths.ps1
    .\Diagnose-PhotoPaths.ps1 -Email wilson.tchui@gmail.com -Password 'xxx'
#>
[CmdletBinding()]
param(
    [string]$BaseUrl  = 'https://crabwatch-api.azurewebsites.net',
    [string]$Email    = 'admin@crabwatch.my',
    [string]$Password = 'Pa55w.rd'
)

$ErrorActionPreference = 'Stop'

# --- Login ---
Write-Host "Logging in as $Email ..." -ForegroundColor Cyan
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/login" `
    -Body $loginBody -ContentType 'application/json'
if (-not $login.success) { throw "Login failed: $($login.message)" }
$token = $login.data.token
$role  = $login.data.user.role
Write-Host "Logged in as $($login.data.user.name) (role: $role)" -ForegroundColor Green
if ($role -ne 'admin') { throw "Account is not admin (role: $role). Re-run with -Email/-Password for an admin account." }

# --- Fetch all observations (paginated + deduped) ---
$all = @()
$seen = @{}
$page = 1
$limit = 100
$totalPages = 1
do {
    $qs = "page=$page&limit=$limit"
    $resp = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/observations?$qs" `
        -Headers @{ Authorization = "Bearer $token" }
    if (-not $resp.success) { throw "API error: $($resp.message)" }
    foreach ($o in $resp.data.observations) {
        $oid = [string]$o.id
        if (-not $seen.ContainsKey($oid)) { $seen[$oid] = $true; $all += $o }
    }
    $totalPages = $resp.data.totalPages
    Write-Host "  page $page : $($resp.data.observations.Count) rows ($($all.Count) unique so far; total $($resp.data.total))"
    $page++
} while ($page -le $totalPages)

Write-Host ""
Write-Host "Fetched $($all.Count) unique observations." -ForegroundColor Cyan

# --- Tally photo paths ---
$analysisCount = 0
$observationCount = 0
$otherCount = 0
$placeholderCount = 0
$totalPhotos = 0
$analysisObs = @()   # observations that have at least one /analysis/ photo

foreach ($o in $all) {
    $photos = @($o.photos)
    $hasAnalysis = $false
    foreach ($p in $photos) {
        if (-not $p) { continue }
        $totalPhotos++
        if ($p -match '/analysis/')      { $analysisCount++;    $hasAnalysis = $true }
        elseif ($p -match '/observations/') { $observationCount++ }
        elseif ($p -match '^(file|content|ph|assets-library|placeholder):') { $placeholderCount++ }
        else { $otherCount++ }
    }
    if ($hasAnalysis) {
        $analysisObs += [pscustomobject]@{
            id       = $o.id
            user     = $o.user.name
            email    = $o.user.email
            created  = $o.createdAt
            status   = $o.status
            analysisPhotos = @($photos | Where-Object { $_ -match '/analysis/' }).Count
            totalPhotos    = $photos.Count
        }
    }
}

# --- Report ---
Write-Host ""
Write-Host "================ PHOTO PATH SUMMARY ================" -ForegroundColor Yellow
Write-Host ("Total observations : {0}" -f $all.Count)
Write-Host ("Total photos       : {0}" -f $totalPhotos)
Write-Host ("  /observations/   : {0}  (permanent, should work)" -f $observationCount) -ForegroundColor Green
Write-Host ("  /analysis/       : {0}  (temp staging, likely 404)" -f $analysisCount) -ForegroundColor Red
Write-Host ("  placeholder/other: {0}  (local/placeholder URIs)" -f $placeholderCount)
Write-Host ("  other            : {0}" -f $otherCount)
Write-Host ("Observations with >=1 /analysis/ photo: {0}" -f $analysisObs.Count) -ForegroundColor Red
Write-Host "====================================================" -ForegroundColor Yellow

if ($analysisObs.Count -gt 0) {
    Write-Host ""
    Write-Host "Observations still referencing /analysis/ (newest first):" -ForegroundColor Red
    $analysisObs | Sort-Object { [datetime]::Parse($_.created) } -Descending |
        Select-Object -First 50 |
        Format-Table -AutoSize id, user, created, status, analysisPhotos, totalPhotos |
        Out-String | Write-Host
    if ($analysisObs.Count -gt 50) {
        Write-Host "  ... and $($analysisObs.Count - 50) more." -ForegroundColor DarkGray
    }
}
