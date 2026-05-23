param(
  [string]$OutputPath = "crabwatch-mobile.tar.gz"
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$staging = Join-Path $repoRoot "mobile-staging"
$outputFile = Join-Path $repoRoot $OutputPath

Write-Host "=== Building shared package ===" -ForegroundColor Cyan
pnpm --filter=@crabwatch/shared build

Write-Host "=== Preparing staging directory ===" -ForegroundColor Cyan
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $staging
New-Item -ItemType Directory -Path $staging | Out-Null

# Root files
Copy-Item (Join-Path $repoRoot "package.json") $staging
Copy-Item (Join-Path $repoRoot "pnpm-lock.yaml") $staging -ErrorAction SilentlyContinue
Copy-Item (Join-Path $repoRoot "pnpm-workspace.yaml") $staging -ErrorAction SilentlyContinue

# Shared
Write-Host "Copying shared..." -ForegroundColor Yellow
Copy-Item -Recurse (Join-Path $repoRoot "shared") (Join-Path $staging "shared")

# Mobile
Write-Host "Copying mobile..." -ForegroundColor Yellow
Copy-Item -Recurse (Join-Path $repoRoot "mobile") (Join-Path $staging "mobile")

# Remove old archive
Remove-Item $outputFile -Force -ErrorAction SilentlyContinue

Write-Host "=== Creating tar.gz ===" -ForegroundColor Cyan

# Use 7zip if available (MUCH more reliable on Windows)
$sevenZip = "${env:ProgramFiles}\7-Zip\7z.exe"

if (Test-Path $sevenZip) {
  Push-Location $staging

  & $sevenZip a -ttar temp.tar *
  & $sevenZip a -tgzip $outputFile temp.tar

  Remove-Item temp.tar

  Pop-Location
}
else {
  # Fallback to tar
  Push-Location $staging
  tar -cvzf $outputFile .
  Pop-Location
}

# Validate archive
Write-Host "=== Validating archive ===" -ForegroundColor Cyan
tar -tzf $outputFile | Out-Null

$size = [math]::Round((Get-Item $outputFile).Length / 1MB, 2)

Write-Host "`nDone! Package: $OutputPath ($size MB)" -ForegroundColor Green