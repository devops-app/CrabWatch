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

function Install-ProductionDependencies {
  param(
    [string]$ApiName,
    [hashtable]$Headers,
    [int]$TimeoutSeconds = 900,
    [int]$PollSeconds = 8
  )

  Invoke-KuduCommandWithRetry -ApiName $ApiName -Headers $Headers -Command 'bash -lc "rm -f /home/site/install-deps.exitcode /home/LogFiles/install-deps.log"' | Out-Null

  $startResult = Invoke-KuduCommandWithRetry -ApiName $ApiName -Headers $Headers -Command 'bash -lc "nohup sh -c ''cd /home/site/wwwroot && npm install --omit=dev --no-audit --no-fund > /home/LogFiles/install-deps.log 2>&1; echo $? > /home/site/install-deps.exitcode'' >/dev/null 2>&1 & echo INSTALL_STARTED"'
  if ($startResult.ExitCode -ne 0) {
    throw "Failed to start production dependency install: $($startResult.Error)"
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $status = Invoke-KuduCommandWithRetry -ApiName $ApiName -Headers $Headers -Command 'bash -lc "if [ -f /home/site/install-deps.exitcode ]; then echo DONE:$(cat /home/site/install-deps.exitcode); else echo RUNNING; fi"'
    if ($status.ExitCode -ne 0) {
      throw "Failed while checking dependency install status: $($status.Error)"
    }

    $output = ($status.Output | Out-String).Trim()
    if ($output -like 'DONE:*') {
      $exitCodeText = $output.Substring(5).Trim()
      $exitCode = 1
      if (-not [int]::TryParse($exitCodeText, [ref]$exitCode)) {
        throw "Dependency install status returned invalid exit code: $output"
      }

      if ($exitCode -ne 0) {
        $logTail = Invoke-KuduCommandWithRetry -ApiName $ApiName -Headers $Headers -Command 'bash -lc "tail -n 200 /home/LogFiles/install-deps.log 2>/dev/null || echo install log not found"'
        throw "Production dependency install failed with exit code $exitCode. Tail log:`n$($logTail.Output)"
      }

      return
    }

    Start-Sleep -Seconds $PollSeconds
  }

  $finalLogTail = Invoke-KuduCommandWithRetry -ApiName $ApiName -Headers $Headers -Command 'bash -lc "tail -n 120 /home/LogFiles/install-deps.log 2>/dev/null || echo install log not found"'
  throw "Timed out waiting for production dependency install after $TimeoutSeconds seconds. Tail log:`n$($finalLogTail.Output)"
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

  tar -a -cf $ZipPath -C $serverDir dist package.json prisma
  if ($LASTEXITCODE -ne 0) {
    throw "Packaging failed for $ZipPath"
  }

  $seedEntry = tar -tf $ZipPath | Select-String -Pattern "dist/server/src/services/seedEngagement.js" -SimpleMatch
  if (-not $seedEntry) {
    throw "Package verification failed: dist/server/src/services/seedEngagement.js is missing from $ZipPath"
  }

  Write-Host "Package ready: $ZipPath"

  if ($SkipDeploy) {
    Write-Host "Skipping Azure deployment. Use without -SkipDeploy to push to $ApiAppName."
  }
  else {
    $azPath = Get-AzCommand

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
    # Keep surrounding quotes in the argument so az.cmd (cmd.exe wrapper) doesn't treat | as a pipe.
    $linuxFxVersion = '"NODE|22-lts"'
    Invoke-Checked -FilePath $azPath -Arguments @(
      'webapp', 'config', 'set',
      '--resource-group', $ResourceGroup,
      '--name', $ApiAppName,
      '--linux-fx-version', $linuxFxVersion,
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
        '--clean', 'true',
        '--restart', 'false',
        '--track-status', 'false'
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

    Install-ProductionDependencies -ApiName $ApiAppName -Headers $kuduHeaders

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

    $verifyDepsResult = Invoke-KuduCommandWithRetry -ApiName $ApiAppName -Headers $kuduHeaders -Command 'bash -lc "cd /home/site/wwwroot && node -e \"require.resolve(\\\"compression\\\"); require.resolve(\\\"bcryptjs\\\"); require.resolve(\\\"@azure/monitor-opentelemetry\\\"); console.log(\\\"Dependency verification passed\\\")\""'
    if ($verifyDepsResult.ExitCode -ne 0) {
      throw "Production dependency verification failed: $($verifyDepsResult.Error)"
    }

    Invoke-Checked -FilePath $azPath -Arguments @('webapp', 'restart', '--resource-group', $ResourceGroup, '--name', $ApiAppName) -ErrorMessage "Failed to restart app service"

    $health = Wait-ForHealthySite -ApiName $ApiAppName

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
  Pop-Location
}
