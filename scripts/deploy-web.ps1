param(
  [string]$ResourceGroup = "VSES-CrabWatch-MY-RG",
  [string]$WebAppName = "crabwatch-web",
  [string]$BackendUrl = "https://crabwatch-api.azurewebsites.net",
  [string]$ZipPath = "",
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($ZipPath)) {
  $ZipPath = Join-Path $repoRoot "web-deploy.zip"
}

$runtimeDir = Join-Path $env:TEMP "crabwatch-web-runtime"
$webDir = Join-Path $repoRoot "web"
$nextDir = Join-Path $webDir ".next"
$standaloneDir = Join-Path $nextDir "standalone"
$standaloneWebNextDir = Join-Path $standaloneDir "web/.next"
$publicDir = Join-Path $webDir "public"
$packageJsonPath = Join-Path $webDir "package.json"
$nextConfigPath = Join-Path $webDir "next.config.mjs"

if (-not (Test-Path -LiteralPath $webDir)) {
  throw "Web directory not found: $webDir"
}

Push-Location $repoRoot
try {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $nextDir
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $runtimeDir
  Remove-Item -Force -ErrorAction SilentlyContinue $ZipPath

  $env:BACKEND_URL = $BackendUrl

  pnpm --filter=shared build
  pnpm --filter=web build

  if (-not (Test-Path -LiteralPath $nextDir)) {
    throw "Missing Next.js build output at $nextDir"
  }

  New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
  Copy-Item -Recurse -Force $nextDir (Join-Path $runtimeDir ".next")

  if (Test-Path -LiteralPath $standaloneWebNextDir) {
    $runtimeStandaloneStaticDir = Join-Path $runtimeDir ".next/standalone/web/.next/static"
    New-Item -ItemType Directory -Path $runtimeStandaloneStaticDir -Force | Out-Null
    Copy-Item -Recurse -Force (Join-Path $nextDir "static/*") $runtimeStandaloneStaticDir
  }

  if (Test-Path -LiteralPath $publicDir) {
    Copy-Item -Recurse -Force $publicDir (Join-Path $runtimeDir "public")
  }

  Copy-Item -Force $packageJsonPath (Join-Path $runtimeDir "package.json")
  Copy-Item -Force $nextConfigPath (Join-Path $runtimeDir "next.config.mjs")

  Push-Location $runtimeDir
  try {
    npm install --omit=dev
    tar -a -cf $ZipPath .
  }
  finally {
    Pop-Location
  }

  if ($SkipDeploy) {
    Write-Host "Created package: $ZipPath"
    return
  }

  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) not found in PATH. Install Azure CLI and run az login."
  }

  az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --settings `
      BACKEND_URL=$BackendUrl `
      SCM_DO_BUILD_DURING_DEPLOYMENT=false `
      ENABLE_ORYX_BUILD=false `
      WEBSITE_NODE_DEFAULT_VERSION=22

  az webapp config set `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --startup-file "node .next/standalone/web/server.js"

  az webapp deploy `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --src-path $ZipPath `
    --type zip

  az webapp restart `
    --resource-group $ResourceGroup `
    --name $WebAppName

  Write-Host "Deployment complete: https://$WebAppName.azurewebsites.net"
}
finally {
  Pop-Location
}
