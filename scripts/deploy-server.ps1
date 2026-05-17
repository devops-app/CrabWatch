param(
  [string]$ResourceGroup = "VSES-CrabWatch-MY-RG",
  [string]$ApiAppName = "crabwatch-api",
  [string]$ZipPath = "",
  [switch]$SkipInstall,
  [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$ErrorMessage
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$ErrorMessage (exit code $LASTEXITCODE)"
  }
}

function Get-AzCommand {
  $az = Get-Command az -ErrorAction SilentlyContinue
  if ($az) {
    return $az.Source
  }

  $localAz = Join-Path $env:LOCALAPPDATA "AzureCLI\\bin\\az.cmd"
  if (Test-Path -LiteralPath $localAz) {
    return $localAz
  }

  throw "Azure CLI (az) not found. Install Azure CLI and run az login."
}

function Get-KuduHeaders {
  param(
    [string]$AzPath,
    [string]$ResourceGroupName,
    [string]$WebAppName
  )

  $credJson = & $AzPath webapp deployment list-publishing-credentials --resource-group $ResourceGroupName --name $WebAppName
  $creds = $credJson | ConvertFrom-Json
  $pair = "$($creds.publishingUserName):$($creds.publishingPassword)"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{ Authorization = "Basic $encoded" }
}

function Invoke-KuduCommand {
  param(
    [string]$ApiName,
    [hashtable]$Headers,
    [string]$Command
  )

  $body = @{ command = $Command } | ConvertTo-Json
  return Invoke-RestMethod -Uri "https://$ApiName.scm.azurewebsites.net/api/command" -Method POST -Headers $Headers -ContentType "application/json" -Body $body
}

function Invoke-KuduCommandWithRetry {
  param(
    [string]$ApiName,
    [hashtable]$Headers,
    [string]$Command,
    [int]$MaxAttempts = 4,
    [int]$SleepSeconds = 8
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      return Invoke-KuduCommand -ApiName $ApiName -Headers $Headers -Command $Command
    } catch {
      if ($attempt -eq $MaxAttempts) {
        throw
      }
      Write-Warning "Kudu command failed on attempt $attempt/$MaxAttempts. Retrying in $SleepSeconds seconds."
      Start-Sleep -Seconds $SleepSeconds
    }
  }
}

function Wait-ForHealthySite {
  param(
    [string]$ApiName,
    [int]$TimeoutSeconds = 240,
    [int]$IntervalSeconds = 8
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-WebRequest -Uri "https://$ApiName.azurewebsites.net/health" -Method GET -UseBasicParsing
      if ($health.StatusCode -eq 200) {
        return $health
      }
    } catch {
    }
    Start-Sleep -Seconds $IntervalSeconds
  }

  throw "Health check did not return 200 within $TimeoutSeconds seconds."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverDir = Join-Path $repoRoot "server"

if (-not (Test-Path -LiteralPath $serverDir)) {
  throw "Server directory not found: $serverDir"
}

if ([string]::IsNullOrWhiteSpace($ZipPath)) {
  $ZipPath = Join-Path $repoRoot "server-deploy.zip"
}

$azPath = Get-AzCommand

Push-Location $repoRoot
try {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue (Join-Path $serverDir "dist")
  Remove-Item -Force -ErrorAction SilentlyContinue $ZipPath

  if (-not $SkipInstall) {
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm install failed"
    }
  }

  pnpm --filter=shared build
  if ($LASTEXITCODE -ne 0) {
    throw "shared build failed"
  }

  pnpm --filter=server exec prisma generate
  if ($LASTEXITCODE -ne 0) {
    throw "prisma generate failed"
  }

  pnpm --filter=server exec tsc
  if ($LASTEXITCODE -ne 0) {
    throw "server TypeScript build failed"
  }

  tar -a -cf $ZipPath -C $serverDir dist package.json prisma
  if ($LASTEXITCODE -ne 0) {
    throw "Packaging failed for $ZipPath"
  }

  $seedEntry = tar -tf $ZipPath | Select-String -Pattern "dist/server/src/services/seedEngagement.js" -SimpleMatch
  if (-not $seedEntry) {
    throw "Package verification failed: dist/server/src/services/seedEngagement.js is missing from $ZipPath"
  }

  Invoke-Checked -FilePath $azPath -Arguments @(
    'webapp', 'config', 'appsettings', 'set',
    '--resource-group', $ResourceGroup,
    '--name', $ApiAppName,
    '--settings',
    'SCM_DO_BUILD_DURING_DEPLOYMENT=false',
    'ENABLE_ORYX_BUILD=false',
    'WEBSITE_NODE_DEFAULT_VERSION=22'
  ) -ErrorMessage "Failed to set deployment app settings"

  Invoke-Checked -FilePath $azPath -Arguments @(
    'webapp', 'config', 'set',
    '--resource-group', $ResourceGroup,
    '--name', $ApiAppName,
    '--generic-configurations', '{"linuxFxVersion":"NODE|22-lts"}',
    '--startup-file', 'node dist/server/src/index.js'
  ) -ErrorMessage "Failed to set runtime/startup configuration"

  $deployed = $false
  try {
    Invoke-Checked -FilePath $azPath -Arguments @(
      'webapp', 'deploy',
      '--resource-group', $ResourceGroup,
      '--name', $ApiAppName,
      '--src-path', $ZipPath,
      '--type', 'zip',
      '--clean', 'false'
    ) -ErrorMessage "az webapp deploy failed"
    $deployed = $true
  } catch {
    Write-Warning "az webapp deploy failed. Falling back to Kudu upload + unzip."
  }

  $kuduHeaders = Get-KuduHeaders -AzPath $azPath -ResourceGroupName $ResourceGroup -WebAppName $ApiAppName

  if (-not $deployed) {
    $uploadHeaders = @{}
    foreach ($key in $kuduHeaders.Keys) {
      $uploadHeaders[$key] = $kuduHeaders[$key]
    }
    $uploadHeaders['If-Match'] = '*'

    Invoke-WebRequest -Uri "https://$ApiAppName.scm.azurewebsites.net/api/vfs/tmp/server-deploy.zip" -Method PUT -Headers $uploadHeaders -InFile $ZipPath -ContentType "application/zip" -UseBasicParsing | Out-Null
    $unzipResult = Invoke-KuduCommandWithRetry -ApiName $ApiAppName -Headers $kuduHeaders -Command 'bash -lc "rm -rf /home/site/wwwroot/* && unzip -o /home/tmp/server-deploy.zip -d /home/site/wwwroot"'
    if ($unzipResult.ExitCode -ne 0) {
      throw "Kudu unzip failed: $($unzipResult.Error)"
    }
  }

  $installResult = Invoke-KuduCommandWithRetry -ApiName $ApiAppName -Headers $kuduHeaders -Command 'bash -lc "cd /home/site/wwwroot && rm -rf node_modules package-lock.json && npm install --omit=dev"'
  if ($installResult.ExitCode -ne 0) {
    throw "Production dependency install failed: $($installResult.Error)"
  }

  Invoke-Checked -FilePath $azPath -Arguments @('webapp', 'restart', '--resource-group', $ResourceGroup, '--name', $ApiAppName) -ErrorMessage "Failed to restart app service"

  $health = Wait-ForHealthySite -ApiName $ApiAppName

  if (-not $SkipSeed) {
    $seedResult = Invoke-KuduCommandWithRetry -ApiName $ApiAppName -Headers $kuduHeaders -Command 'node /home/site/wwwroot/dist/server/src/services/seedEngagement.js'
    if ($seedResult.ExitCode -ne 0) {
      throw "Engagement seed failed: $($seedResult.Error)"
    }
    Write-Host $seedResult.Output
  }

  Write-Host "Server deployment complete: https://$ApiAppName.azurewebsites.net"
  Write-Host "Health response: $($health.Content)"
}
finally {
  Pop-Location
}
