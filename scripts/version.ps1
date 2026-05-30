param(
    [string]$VersionFile = "VERSION",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$versionPath = Join-Path $repoRoot $VersionFile

if (!(Test-Path -LiteralPath $versionPath)) {
    Write-Error "VERSION file not found at $versionPath"
    exit 1
}

$currentVersion = (Get-Content -LiteralPath $versionFile -Raw).Trim()
Write-Host "[version] Current: $currentVersion"

# Parse version: semver+build (e.g. 1.0.0+0001)
if ($currentVersion -match '^(\d+\.\d+\.\d+)\+(\d+)$') {
    $semver = $matches[1]
    $build = [int]$matches[2]
    $newBuild = $build + 1
    $newBuildStr = $newBuild.ToString("D4")
    $newVersion = "$semver+$newBuildStr"
} elseif ($currentVersion -match '^(\d+\.\d+\.\d+)$') {
    # No build number yet, start at 0001
    $semver = $matches[1]
    $newVersion = "$semver+0001"
} else {
    Write-Error "Invalid version format: $currentVersion (expected X.Y.Z+BBBB or X.Y.Z)"
    exit 1
}

Write-Host "[version] Next:    $newVersion"

# Target package.json files
$targets = @(
    "package.json",
    "server\package.json",
    "web\package.json",
    "mobile\package.json"
)

foreach ($relPath in $targets) {
    $pkgPath = Join-Path $repoRoot $relPath
    if (!(Test-Path -LiteralPath $pkgPath)) {
        Write-Warning "[version] Skipping (not found): $relPath"
        continue
    }

    $pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
    $oldVersion = $pkg.version
    $pkg.version = $newVersion

    if ($DryRun) {
        Write-Host "[version] DRY-RUN $relPath : $oldVersion -> $newVersion"
    } else {
        $pkg | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $pkgPath -NoNewline
        Write-Host "[version] Updated $relPath : $oldVersion -> $newVersion"
    }
}

# Update mobile app.json version (Expo uses this for app store version)
$appJsonPath = Join-Path $repoRoot "mobile\app.json"
if (Test-Path -LiteralPath $appJsonPath) {
    $appJson = Get-Content -LiteralPath $appJsonPath -Raw | ConvertFrom-Json
    # Extract semver only (without +build) for Expo version field
    $appJson.expo.version = $semver
    if ($DryRun) {
        Write-Host "[version] DRY-RUN mobile\app.json : expo.version -> $semver"
    } else {
        $appJson | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $appJsonPath -NoNewline
        Write-Host "[version] Updated mobile\app.json : expo.version -> $semver"
    }
}

# Write new version to VERSION file
if ($DryRun) {
    Write-Host "[version] DRY-RUN VERSION file -> $newVersion"
} else {
    Set-Content -LiteralPath $versionPath -Value "$newVersion`n" -NoNewline
    Write-Host "[version] Written VERSION file"
}

if (!$DryRun) {
    # Stage all modified files so they're included in the commit
    Set-Location -LiteralPath $repoRoot
    git add -- $VersionFile $targets "mobile\app.json"
    Write-Host "[version] Staged version files for commit"
}
