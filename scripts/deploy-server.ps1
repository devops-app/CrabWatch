param(
  [string]$ResourceGroup = "VSES-CrabWatch-MY-RG",
  [string]$ApiAppName = "crabwatch-api",
  [string]$ZipPath = "",
  [switch]$SkipInstall,
  [switch]$SkipDeploy,
  [switch]$GeneratePrisma,
  [switch]$Migrate,
  [switch]$Seed
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
  # Prefer az.exe to avoid cmd.exe re-parsing arguments (pipe in NODE|22-lts gets interpreted)
  $azExe = Get-Command az -ErrorAction SilentlyContinue
  if ($azExe) {
    $source = $azExe.Source
    if ($source -match '\.exe$') {
      return $source
    }
    $exePath = $source -replace '\.cmd$', '.exe'
    if (Test-Path -LiteralPath $exePath) {
      return $exePath
    }
    return $source
  }

  $localAz = Join-Path $env:LOCALAPPDATA "AzureCLI\\bin\\az.exe"
  if (Test-Path -LiteralPath $localAz) {
    return $localAz
  }
  $localAzCmd = Join-Path $env:LOCALAPPDATA "AzureCLI\\bin\\az.cmd"
  if (Test-Path -LiteralPath $localAzCmd) {
    return $localAzCmd
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

function Upload-StartupWrapper {
  param(
    [string]$ApiName,
    [hashtable]$Headers,
    [string]$AzPath,
    [string]$ResourceGroupName,
    [string]$WebAppName
  )

  $wrapperPath = Join-Path $PSScriptRoot "startup-wrapper.sh"
  if (-not (Test-Path -LiteralPath $wrapperPath)) {
    throw "Startup wrapper script not found: $wrapperPath"
  }

  $uploadHeaders = @{}
  foreach ($key in $Headers.Keys) {
    $uploadHeaders[$key] = $Headers[$key]
  }
  $uploadHeaders['If-Match'] = '*'

  Invoke-WebRequest -Uri "https://$ApiName.scm.azurewebsites.net/api/vfs/site/wwwroot/start.sh" -Method PUT -Headers $uploadHeaders -InFile $wrapperPath -ContentType "application/octet-stream" -UseBasicParsing | Out-Null

  $verifyResult = Invoke-KuduCommandWithRetry -ApiName $ApiName -Headers $Headers -Command 'bash -lc "test -f /home/site/wwwroot/start.sh && chmod 755 /home/site/wwwroot/start.sh && echo startup wrapper uploaded"'
  if ($verifyResult.ExitCode -ne 0) {
    throw "Failed to verify startup wrapper upload: $($verifyResult.Error)"
  }
  Write-Host $verifyResult.Output

  Invoke-Checked -FilePath $AzPath -Arguments @(
    'webapp', 'config', 'set',
    '--resource-group', $ResourceGroupName,
    '--name', $WebAppName,
    '--startup-file', 'bash /home/site/wwwroot/start.sh'
  ) -ErrorMessage "Failed to set startup wrapper"
}

function Upload-SharedBackup {
  param(
    [string]$ApiName,
    [hashtable]$Headers
  )

  $copyResult = Invoke-KuduCommandWithRetry -ApiName $ApiName -Headers $Headers -Command 'bash -lc "rm -rf /home/site/shared-backup && if [ -d /home/site/wwwroot/node_modules/@crabwatch/shared ]; then mkdir -p /home/site/shared-backup && cp -r /home/site/wwwroot/node_modules/@crabwatch/shared /home/site/shared-backup/ && echo Shared backup created; else echo WARNING: bundled shared package not found; fi"'
  if ($copyResult.ExitCode -ne 0) {
    throw "Failed to backup shared package: $($copyResult.Error)"
  }
  Write-Host $copyResult.Output
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

$ZipPath = [System.IO.Path]::GetFullPath($ZipPath)
$zipParentDir = Split-Path -Parent $ZipPath
if (-not (Test-Path -LiteralPath $zipParentDir)) {
  throw "Zip output directory not found: $zipParentDir"
}

$stagingRoot = $null

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

  if ($GeneratePrisma) {
    pnpm --filter=server exec prisma generate
    if ($LASTEXITCODE -ne 0) {
      throw "prisma generate failed. If another local process is locking Prisma engine files, stop it and rerun deployment."
    }
  } else {
    Write-Host "Skipping local prisma generate. Use -GeneratePrisma when schema/client regeneration is required."
  }

  pnpm --filter=server exec tsc
  if ($LASTEXITCODE -ne 0) {
    throw "server TypeScript build failed"
  }

  $distLocalesDir = Join-Path $serverDir "dist/server/src/locales"
  New-Item -ItemType Directory -Force -Path $distLocalesDir | Out-Null
  Copy-Item -Path (Join-Path $serverDir "src/locales/*.json") -Destination $distLocalesDir -Force

  # Build deployment archive in an isolated staging folder to avoid mutating workspace files.
  $stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("crabwatch-server-deploy-" + [Guid]::NewGuid().ToString("N"))
  $stagingServerDir = Join-Path $stagingRoot "server"
  $stagingSharedBundleDir = Join-Path $stagingServerDir "node_modules/@crabwatch/shared"

  New-Item -ItemType Directory -Force -Path $stagingServerDir | Out-Null
  New-Item -ItemType Directory -Force -Path $stagingSharedBundleDir | Out-Null

  Copy-Item -Path (Join-Path $serverDir "dist") -Destination (Join-Path $stagingServerDir "dist") -Recurse -Force
  Copy-Item -Path (Join-Path $serverDir "package.json") -Destination (Join-Path $stagingServerDir "package.json") -Force
  Copy-Item -Path (Join-Path $serverDir "prisma") -Destination (Join-Path $stagingServerDir "prisma") -Recurse -Force
  Copy-Item -Path (Join-Path $repoRoot "shared/dist") -Destination (Join-Path $stagingSharedBundleDir "dist") -Recurse -Force
  Copy-Item -Path (Join-Path $repoRoot "shared/package.json") -Destination $stagingSharedBundleDir -Force

  # Install production dependencies in staging so they're bundled in the zip.
  # This eliminates the fragile post-deploy npm install and Oryx symlink race condition.
  Write-Host "Installing production dependencies in staging directory..."
  Push-Location $stagingServerDir
  npm install --omit=dev --no-audit --no-fund --no-package-lock 2>&1 | Select-Object -Last 5
  if ($LASTEXITCODE -ne 0) {
    Pop-Location
    throw "npm install in staging directory failed"
  }
  Pop-Location
  Write-Host "Production dependencies installed in staging"

  # Include startup wrapper in package so direct zip deploys always have start.sh.
  $startupWrapperPath = Join-Path $PSScriptRoot "startup-wrapper.sh"
  if (-not (Test-Path -LiteralPath $startupWrapperPath)) {
    throw "Startup wrapper script not found: $startupWrapperPath"
  }
  Copy-Item -Path $startupWrapperPath -Destination (Join-Path $stagingServerDir "start.sh") -Force

  # Rename to bundled_modules so Oryx doesn't detect/destroy it on deploy
  Rename-Item -Path (Join-Path $stagingServerDir "node_modules") -NewName "bundled_modules" -Force

  tar -a -cf $ZipPath -C $stagingServerDir dist package.json prisma start.sh bundled_modules
  if ($LASTEXITCODE -ne 0) {
    throw "Packaging failed for $ZipPath"
  }

  $seedEntry = tar -tf $ZipPath | Select-String -Pattern "dist/server/src/services/seedEngagement.js" -SimpleMatch
  if (-not $seedEntry) {
    throw "Package verification failed: dist/server/src/services/seedEngagement.js is missing from $ZipPath"
  }

  $localeEntry = tar -tf $ZipPath | Select-String -Pattern "dist/server/src/locales/en.json" -SimpleMatch
  if (-not $localeEntry) {
    throw "Package verification failed: dist/server/src/locales/en.json is missing from $ZipPath"
  }

  $startupEntry = tar -tf $ZipPath | Select-String -Pattern "start.sh" -SimpleMatch
  if (-not $startupEntry) {
    throw "Package verification failed: start.sh is missing from $ZipPath"
  }

  Write-Host "Package ready: $ZipPath"

  if ($SkipDeploy) {
    Write-Host "Skipping Azure deployment. Use without -SkipDeploy to push to $ApiAppName."
  }
  else {
    $azPath = Get-AzCommand

    $appInfoJson = & $azPath webapp show --resource-group $ResourceGroup --name $ApiAppName --query "{name:name,kind:kind,state:state,defaultHostName:defaultHostName}" -o json
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to find App Service '$ApiAppName' in resource group '$ResourceGroup'"
    }

    $appInfo = $appInfoJson | ConvertFrom-Json
    if ($appInfo.kind -notmatch 'linux') {
      Write-Warning "Target app kind '$($appInfo.kind)' does not appear to be Linux. Current deploy flow expects Linux App Service."
    }
    Write-Host "Deploy target: $($appInfo.name) ($($appInfo.state)) at $($appInfo.defaultHostName)"

    $kuduHeaders = Get-KuduHeaders -AzPath $azPath -ResourceGroupName $ResourceGroup -WebAppName $ApiAppName

    Invoke-Checked -FilePath $azPath -Arguments @(
      'webapp', 'config', 'appsettings', 'set',
      '--resource-group', $ResourceGroup,
      '--name', $ApiAppName,
      '--settings',
      'SCM_DO_BUILD_DURING_DEPLOYMENT=false',
      'ENABLE_ORYX_BUILD=false',
      'WEBSITE_NODE_DEFAULT_VERSION=22'
    ) -ErrorMessage "Failed to set deployment app settings"

    # Must use NODE|<version> for Linux code stack so Azure Portal detects Node runtime correctly.
    $linuxFxVersion = '"NODE|22-lts"'
    Invoke-Checked -FilePath $azPath -Arguments @(
      'webapp', 'config', 'set',
      '--resource-group', $ResourceGroup,
      '--name', $ApiAppName,
      '--linux-fx-version', $linuxFxVersion
    ) -ErrorMessage "Failed to set runtime configuration"

    $deployed = $false
    try {
      Invoke-Checked -FilePath $azPath -Arguments @(
        'webapp', 'deploy',
        '--resource-group', $ResourceGroup,
        '--name', $ApiAppName,
        '--src-path', $ZipPath,
        '--type', 'zip',
        '--clean', 'true',
        '--restart', 'false',
        '--track-status', 'false'
      ) -ErrorMessage "az webapp deploy failed"
      $deployed = $true
    } catch {
      Write-Warning "az webapp deploy failed. Falling back to Kudu upload + unzip."
    }

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

    # Upload startup wrapper AFTER deploy so it survives --clean true
    Upload-StartupWrapper -ApiName $ApiAppName -Headers $kuduHeaders -AzPath $azPath -ResourceGroupName $ResourceGroup -WebAppName $ApiAppName

    # Backup bundled shared package to persistent /home/ location for startup wrapper
    Upload-SharedBackup -ApiName $ApiAppName -Headers $kuduHeaders

    # Clear first-boot marker so wrapper runs npm install on restart
    Invoke-KuduCommandWithRetry -ApiName $ApiAppName -Headers $kuduHeaders -Command 'bash -lc "rm -f /home/site/install-done"' | Out-Null

    # Restart — startup wrapper handles npm install + app launch
    Invoke-Checked -FilePath $azPath -Arguments @('webapp', 'restart', '--resource-group', $ResourceGroup, '--name', $ApiAppName) -ErrorMessage "Failed to restart app service"

    # Wait for health (wrapper runs npm install on first boot, then starts app)
    $health = Wait-ForHealthySite -ApiName $ApiAppName -TimeoutSeconds 300

    if ($Migrate) {
      Write-Host "Applying Prisma migrations with migrate deploy..."
      $migrateResult = Invoke-KuduCommandWithRetry -ApiName $ApiAppName -Headers $kuduHeaders -Command 'bash -lc "cd /home/site/wwwroot && npx prisma migrate deploy"'
      if ($migrateResult.ExitCode -ne 0) {
        throw "Prisma migrate deploy failed: $($migrateResult.Error)"
      }
      Write-Host $migrateResult.Output
    } else {
      Write-Host "Skipping Prisma migrations. Use -Migrate to run prisma migrate deploy after deploy."
    }

    if ($Seed) {
      $seedResult = Invoke-KuduCommandWithRetry -ApiName $ApiAppName -Headers $kuduHeaders -Command 'node /home/site/wwwroot/dist/server/src/services/seedEngagement.js'
      if ($seedResult.ExitCode -ne 0) {
        throw "Engagement seed failed: $($seedResult.Error)"
      }
      Write-Host $seedResult.Output
    } else {
      Write-Host "Skipping engagement seed. Use -Seed to run seedEngagement after deploy."
    }

    Write-Host "Server deployment complete: https://$ApiAppName.azurewebsites.net"
    Write-Host "Health response: $($health.Content)"
  }
}
finally {
  if ($stagingRoot -and (Test-Path -LiteralPath $stagingRoot)) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
  Pop-Location
}
