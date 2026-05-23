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
  $ZipPath = Join-Path $repoRoot "crabwatch-web.zip"
}

$webDir = Join-Path $repoRoot "web"
$nextDir = Join-Path $webDir ".next"
$standaloneDir = Join-Path $nextDir "standalone"
$publicDir = Join-Path $webDir "public"
$packageJsonPath = Join-Path $webDir "package.json"

if (-not (Test-Path -LiteralPath $webDir)) {
  throw "Web directory not found: $webDir"
}

Push-Location $repoRoot
try {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $nextDir
  Remove-Item -Force -ErrorAction SilentlyContinue $ZipPath

  $env:BACKEND_URL = $BackendUrl

  pnpm --filter=shared build
  pnpm --filter=web build

  if (-not (Test-Path -LiteralPath $nextDir)) {
    throw "Missing Next.js build output at $nextDir"
  }

  # Install production deps in standalone directory
  Push-Location $standaloneDir
  try {
    # Replace monorepo package.json with web package.json
    Copy-Item -Force $packageJsonPath (Join-Path $standaloneDir "package.json")
    npm install --omit=dev --ignore-scripts
  }
  finally {
    Pop-Location
  }

  # Copy static files
  $staticDest = Join-Path $standaloneDir "web\.next\static"
  New-Item -ItemType Directory -Path $staticDest -Force | Out-Null
  Copy-Item -Recurse -Force (Join-Path $nextDir "static\*") $staticDest -ErrorAction SilentlyContinue

  # Copy public files
  if (Test-Path -LiteralPath $publicDir) {
    Copy-Item -Recurse -Force $publicDir (Join-Path $standaloneDir "web\public") -ErrorAction SilentlyContinue
  }

  # Create zip from standalone directory
  Compress-Archive -Path (Join-Path $standaloneDir "*") -DestinationPath $ZipPath -Force

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
    --startup-file "node web/server.js"

  # Deploy using ZipDeploy API
  $publishCreds = az webapp deployment list-publishing-profiles `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --query "[?PublishMethod=='ZipDeploy'].{User:User, Password:Password}" `
    -o json | ConvertFrom-Json
  
  $user = $publishCreds[0].User
  $password = $publishCreds[0].Password
  $pair = "$user`:$password"
  $creds = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  $headers = @{
    'Authorization' = "Basic $creds"
    'Content-Type' = 'application/zip'
  }
  
  Invoke-WebRequest `
    -Uri "https://$WebAppName.scm.azurewebsites.net/api/zipdeploy" `
    -Headers $headers `
    -Method Post `
    -InFile $ZipPath `
    -TimeoutSec 300 `
    -UseBasicParsing

  az webapp restart `
    --resource-group $ResourceGroup `
    --name $WebAppName

  Write-Host "Deployment complete: https://$WebAppName.azurewebsites.net"
}
finally {
  Pop-Location
}
