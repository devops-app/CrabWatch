<#
.SYNOPSIS
    CrabWatch observation report generator.

.DESCRIPTION
    Logs in to the CrabWatch web API (admin role only), lets you pick a date
    range from a calendar, fetches all observations in that range, and builds
    an HTML report grouped by user with each user's submitted photos embedded
    as base64 images. The report can be exported to PDF via Microsoft Edge
    (headless) or Microsoft Word (COM fallback).

    By default a Windows Forms GUI is shown with login fields, calendar date
    pickers, a status filter, an output folder picker, and a live progress log.
    Use -NoUi to run the original console workflow instead.

.PARAMETER BaseUrl
    Base URL of the CrabWatch API. Defaults to the Azure production endpoint.

.PARAMETER StartDate
    Start date of the report range (yyyy-MM-dd). Pre-fills the GUI or console
    prompts; if omitted, the user picks dates interactively.

.PARAMETER EndDate
    End date of the report range (yyyy-MM-dd, inclusive). Defaults to StartDate.

.PARAMETER Status
    Optional observation status filter: PENDING, APPROVED, or REJECTED.

.PARAMETER OutputDir
    Directory where the .html and .pdf files are written. Defaults to the
    current directory.

.PARAMETER NoUi
    Skip the Windows Forms GUI and use console prompts instead.

.PARAMETER NoPdf
    Skip PDF export; only generate the HTML report and open it in the browser.

.EXAMPLE
    .\Generate-ObservationReport.ps1
    Opens the GUI: enter credentials, pick dates on the calendar, click Generate.

.EXAMPLE
    .\Generate-ObservationReport.ps1 -NoUi -StartDate 2026-10-01 -EndDate 2026-10-06
    Runs the console workflow with a fixed date range.

.EXAMPLE
    .\Generate-ObservationReport.ps1 -BaseUrl http://localhost:3000 -Status APPROVED
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'https://crabwatch-api.azurewebsites.net',
    [string]$StartDate,
    [string]$EndDate,
    [ValidateSet('PENDING', 'APPROVED', 'REJECTED', '')]
    [string]$Status = '',
    [string]$OutputDir = (Get-Location).Path,
    [switch]$NoUi,
    [switch]$NoPdf
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Step {
    param([string]$Message)
    Log-Ui $Message 'Info'
}

function Write-Ok {
    param([string]$Message)
    Log-Ui $Message 'Ok'
}

function Write-Warn2 {
    param([string]$Message)
    Log-Ui $Message 'Warn'
}

function ConvertTo-DateOnly {
    param([string]$Text)
    $d = [datetime]::MinValue
    if ([datetime]::TryParse($Text, [ref]$d)) { return $d.Date }
    throw "Invalid date: '$Text' (expected yyyy-MM-dd)"
}

function Get-EdgePath {
    $candidates = @(
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path -LiteralPath $c)) { return $c }
    }
    return $null
}

function Resize-ImageBytes {
    param([byte[]]$Bytes, [int]$MaxWidth = 1280, [int]$Quality = 80)
    # Downscale to at most $MaxWidth px wide (aspect preserved) and re-encode as
    # JPEG. Full-resolution field photos are ~2.7MB each; embedding ~500 of them
    # as base64 OOMs the process. At 1280px/q80 each is ~200-300KB, which is far
    # more than the 220px display size needs and keeps the HTML/PDF small.
    $ms = $null; $src = $null; $bmp = $null; $g = $null; $out = $null
    try {
        $ms = New-Object System.IO.MemoryStream(,$Bytes)
        $src = [System.Drawing.Image]::FromStream($ms)
        $w = $src.Width; $h = $src.Height
        if ($w -le $MaxWidth) { $newW = $w; $newH = $h }
        else { $newW = $MaxWidth; $newH = [int][math]::Max(1, [math]::Round($h * ($MaxWidth / $w))) }
        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($src, 0, 0, $newW, $newH)
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
        $out = New-Object System.IO.MemoryStream
        $bmp.Save($out, $codec, $params)
        return $out.ToArray()
    } finally {
        if ($g) { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
        if ($src) { $src.Dispose() }
        if ($out) { $out.Dispose() }
        if ($ms) { $ms.Dispose() }
    }
}

function ConvertTo-Base64Image {
    param([string]$Url)
    if (-not $Url) { return $null }
    if ($Url -match '^(file|content|ph|assets-library|placeholder):') { return $null }
    # /analysis/ blobs are temporary staging files that get auto-deleted; their
    # source is gone, so they always 404. Skip the download and report missing.
    if ($Url -match '/analysis/') { return $null }
    # HEIC/HEIF (iPhone originals) can't be decoded by GDI+ on Windows, so the
    # resize would throw. Skip the download and report missing.
    if ($Url -match '\.(heic|heif)(\?|$)') { return $null }

    # Cache by blob path (query string stripped) so the same image referenced
    # with different SAS signatures is only downloaded once per run.
    $cacheKey = $Url.Split('?')[0]
    if ($global:ImageCache.ContainsKey($cacheKey)) {
        return $global:ImageCache[$cacheKey]
    }

    $result = $null
    try {
        # WebClient.DownloadData returns a clean byte array with no pipeline
        # pollution (Invoke-WebRequest enumerates bytes to the output stream in
        # PS 5.1, and raw HttpWebRequest was timing out in the GUI process).
        $wc = New-Object System.Net.WebClient
        $bytes = $wc.DownloadData($Url)
        if (-not $bytes -or $bytes.Length -eq 0) { throw 'Empty response body' }
        # Downscale + re-encode to JPEG so the in-memory HTML stays small.
        $resized = Resize-ImageBytes -Bytes $bytes -MaxWidth 1280 -Quality 80
        if (-not $resized -or $resized.Length -eq 0) { $resized = $bytes }
        $b64 = [Convert]::ToBase64String($resized)
        $result = "data:image/jpeg;base64,$b64"
    }
    catch {
        $inner = if ($_.Exception.InnerException) { $_.Exception.InnerException.Message } else { '' }
        $detail = if ($inner) { " -> $($_.Exception.Message) (inner: $inner)" } else { " -> $($_.Exception.Message)" }
        Write-Warn2 "Could not download image: $Url$detail"
        $result = $null
    }
    $global:ImageCache[$cacheKey] = $result
    return $result
}

function ConvertTo-HtmlEntity {
    param([string]$Text)
    if ($null -eq $Text) { return '' }
    return $Text.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;')
}

# ---------------------------------------------------------------------------
# GUI (Windows Forms)
# ---------------------------------------------------------------------------

$global:UiLogBox = $null
$global:UiAbort = $null
$global:UiRunning = $false
$global:UiLogFile = Join-Path $env:TEMP 'CrabWatch_Report_Gen.log'
# Per-run cache of downloaded images, keyed by blob path (query string stripped),
# so the same image referenced with different SAS signatures is fetched once.
$global:ImageCache = @{}

function Log-Ui {
    param([string]$Message, [ValidateSet('Info', 'Ok', 'Warn', 'Error')][string]$Level = 'Info')
    $line = "[{0}] [{1}] {2}" -f (Get-Date).ToString('HH:mm:ss'), $Level, $Message
    # File log: always written, so the full trace survives after the GUI closes.
    try { Add-Content -LiteralPath $global:UiLogFile -Value $line -Encoding UTF8 } catch { }
    # Console output is best-effort: Write-Host can throw when called from a
    # background thread, and the GUI log box is the primary output there.
    try {
        switch ($Level) {
            'Ok'    { Write-Host "    $Message" -ForegroundColor Green }
            'Warn'  { Write-Host "    WARNING: $Message" -ForegroundColor Yellow }
            'Error' { Write-Host "    ERROR: $Message" -ForegroundColor Red }
            default { Write-Host "==> $Message" -ForegroundColor Cyan }
        }
    } catch { }
    $box = $global:UiLogBox
    if ($box -and (-not $box.IsDisposed)) {
        try {
            $box.AppendText($line + [Environment]::NewLine)
            $box.ScrollToCaret()
        } catch { }
    }
}

function Do-Events {
    try { [System.Windows.Forms.Application]::DoEvents() } catch { }
}

function Test-UiCancelled {
    param([System.Threading.CancellationToken]$Token)
    Do-Events
    if ($Token -and $Token.IsCancellationRequested) {
        throw [System.OperationCanceledException]::new('Operation cancelled by user.')
    }
}

function Show-CrabWatchUi {
    param(
        [string]$DefaultBaseUrl,
        [string]$DefaultStart,
        [string]$DefaultEnd,
        [string]$DefaultStatus,
        [string]$DefaultOutputDir,
        [switch]$DefaultNoPdf
    )

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()

    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'CrabWatch - Observation Report Generator'
    $form.Size = New-Object System.Drawing.Size(600, 750)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

    $colX = 16
    $lblW = 110
    $fldX = $colX + $lblW
    $fldW = 440
    $rowH = 34
    $y = 16

    function Add-Row {
        param([string]$Text, [System.Windows.Forms.Control]$Control, [int]$RowY)
        $lbl = New-Object System.Windows.Forms.Label
        $lbl.Text = $Text
        $lbl.Location = New-Object System.Drawing.Point($colX, ($RowY + 4))
        $lbl.Size = New-Object System.Drawing.Size($lblW, 20)
        [void]$form.Controls.Add($lbl)
        $Control.Location = New-Object System.Drawing.Point($fldX, $RowY)
        $Control.Size = New-Object System.Drawing.Size($fldW, 24)
        [void]$form.Controls.Add($Control)
        return ($RowY + $rowH)
    }

    $txtBase = New-Object System.Windows.Forms.TextBox
    $txtBase.Text = $DefaultBaseUrl
    $y = Add-Row 'API base URL:' $txtBase $y

    $txtEmail = New-Object System.Windows.Forms.TextBox
    $y = Add-Row 'Email:' $txtEmail $y

    $txtPass = New-Object System.Windows.Forms.TextBox
    $txtPass.UseSystemPasswordChar = $true
    $y = Add-Row 'Password:' $txtPass $y

    $dpStart = New-Object System.Windows.Forms.DateTimePicker
    $dpStart.Format = 'Short'
    if ($DefaultStart) { $dpStart.Value = ConvertTo-DateOnly $DefaultStart }
    $y = Add-Row 'Start date:' $dpStart $y

    $dpEnd = New-Object System.Windows.Forms.DateTimePicker
    $dpEnd.Format = 'Short'
    if ($DefaultEnd) { $dpEnd.Value = ConvertTo-DateOnly $DefaultEnd }
    elseif ($DefaultStart) { $dpEnd.Value = ConvertTo-DateOnly $DefaultStart }
    $y = Add-Row 'End date:' $dpEnd $y

    $cmbStatus = New-Object System.Windows.Forms.ComboBox
    $cmbStatus.DropDownStyle = 'DropDownList'
    $cmbStatus.Items.AddRange(@('(All statuses)', 'PENDING', 'APPROVED', 'REJECTED'))
    $selIndex = 0
    if ($DefaultStatus) { $selIndex = $cmbStatus.Items.IndexOf($DefaultStatus) }
    $cmbStatus.SelectedIndex = $selIndex
    $y = Add-Row 'Status filter:' $cmbStatus $y

    $txtOut = New-Object System.Windows.Forms.TextBox
    $txtOut.Text = $DefaultOutputDir
    $txtOut.Size = New-Object System.Drawing.Size(380, 24)
    $txtOut.Location = New-Object System.Drawing.Point($fldX, $y)
    [void]$form.Controls.Add($txtOut)
    $btnBrowse = New-Object System.Windows.Forms.Button
    $btnBrowse.Text = 'Browse...'
    $btnBrowse.Location = New-Object System.Drawing.Point(($fldX + 388), ($y - 1))
    $btnBrowse.Size = New-Object System.Drawing.Size(58, 26)
    [void]$form.Controls.Add($btnBrowse)
    $lblOut = New-Object System.Windows.Forms.Label
    $lblOut.Text = 'Output folder:'
    $lblOut.Location = New-Object System.Drawing.Point($colX, ($y + 4))
    $lblOut.Size = New-Object System.Drawing.Size($lblW, 20)
    [void]$form.Controls.Add($lblOut)
    $y += $rowH

    $chkPdf = New-Object System.Windows.Forms.CheckBox
    $chkPdf.Text = 'Export to PDF (requires Microsoft Edge or Word)'
    $chkPdf.Checked = -not [bool]$DefaultNoPdf
    $chkPdf.Location = New-Object System.Drawing.Point($fldX, $y)
    $chkPdf.Size = New-Object System.Drawing.Size($fldW, 22)
    [void]$form.Controls.Add($chkPdf)
    $y += 30

    $lblLog = New-Object System.Windows.Forms.Label
    $lblLog.Text = 'Progress:'
    $lblLog.Location = New-Object System.Drawing.Point($colX, $y)
    $lblLog.Size = New-Object System.Drawing.Size($lblW, 20)
    [void]$form.Controls.Add($lblLog)
    $y += 24

    $logBox = New-Object System.Windows.Forms.TextBox
    $logBox.Multiline = $true
    $logBox.ReadOnly = $true
    $logBox.ScrollBars = 'Vertical'
    $logBox.BackColor = [System.Drawing.Color]::WhiteSmoke
    $logBox.Location = New-Object System.Drawing.Point($colX, $y)
    $logBox.Size = New-Object System.Drawing.Size(560, 330)
    [void]$form.Controls.Add($logBox)
    $y += 340

    $btnGenerate = New-Object System.Windows.Forms.Button
    $btnGenerate.Text = 'Generate Report'
    $btnGenerate.Location = New-Object System.Drawing.Point(330, $y)
    $btnGenerate.Size = New-Object System.Drawing.Size(140, 34)
    [void]$form.Controls.Add($btnGenerate)

    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = 'Close'
    $btnCancel.Location = New-Object System.Drawing.Point(480, $y)
    $btnCancel.Size = New-Object System.Drawing.Size(100, 34)
    $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    [void]$form.Controls.Add($btnCancel)

    $form.AcceptButton = $btnGenerate
    $form.CancelButton = $btnCancel

    $global:UiLogBox = $logBox
    $global:UiAbort = [System.Threading.CancellationTokenSource]::new()
    $logBox.AppendText("Ready. Enter your admin credentials, pick a date range, then click Generate Report.`n")

    $btnGenerate.Add_Click({
        if ($global:UiRunning) { return }
        $email = $txtEmail.Text.Trim()
        $pass = $txtPass.Text
        if (-not $email -or -not $pass) {
            [System.Windows.Forms.MessageBox]::Show('Please enter both email and password.', 'Missing credentials', 'OK', 'Warning') | Out-Null
            return
        }
        $start = $dpStart.Value.Date
        $end = $dpEnd.Value.Date
        if ($end -lt $start) { $tmp = $start; $start = $end; $end = $tmp }
        $statusFilter = if ($cmbStatus.SelectedIndex -gt 0) { $cmbStatus.SelectedItem } else { '' }
        $outDir = $txtOut.Text.Trim()
        if (-not $outDir) { $outDir = (Get-Location).Path }
        $wantPdf = $chkPdf.Checked
        $base = $txtBase.Text.Trim().TrimEnd('/')
        $token = $global:UiAbort.Token

        $btnGenerate.Enabled = $false
        $btnCancel.Text = 'Cancel'
        $global:UiRunning = $true
        Log-Ui "Starting report generation for $($start.ToString('dd MMM yyyy')) to $($end.ToString('dd MMM yyyy'))..." 'Info'

        try {
            Invoke-ReportWorkflow -Base $base -Email $email -Password $pass `
                -Start $start -End $end -StatusFilter $statusFilter `
                -OutputDir $outDir -NoPdf:(-not $wantPdf) -Token $token
        }
        catch [System.OperationCanceledException] {
            Log-Ui 'Cancelled by user.' 'Warn'
        }
        catch {
            $errMsg = $_.Exception.Message
            Log-Ui $errMsg 'Error'
            try { Add-Content -LiteralPath $global:UiLogFile -Value ("    STACKTRACE: " + $_.ScriptStackTrace) -Encoding UTF8 } catch { }
            [System.Windows.Forms.MessageBox]::Show($errMsg, 'Report generation failed', 'OK', 'Error') | Out-Null
        }
        finally {
            $global:UiRunning = $false
            $btnGenerate.Enabled = $true
            $btnCancel.Text = 'Close'
            Do-Events
        }
    })

    $btnBrowse.Add_Click({
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        $dlg.Description = 'Select output folder for the report'
        if ($txtOut.Text -and (Test-Path -LiteralPath $txtOut.Text)) { $dlg.SelectedPath = $txtOut.Text }
        if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            $txtOut.Text = $dlg.SelectedPath
        }
    })

    $btnCancel.Add_Click({
        if ($global:UiRunning) {
            if ($global:UiAbort -and (-not $global:UiAbort.IsCancellationRequested)) {
                $global:UiAbort.Cancel()
            }
        }
        else {
            $form.Close()
        }
    })

    $form.Add_FormClosing({
        param($sender, $e)
        if ($global:UiRunning) {
            $e.Cancel = $true
            if ($global:UiAbort -and (-not $global:UiAbort.IsCancellationRequested)) {
                $global:UiAbort.Cancel()
            }
            Log-Ui 'Closing requested - stopping generation...' 'Warn'
        }
    })

    $form.ShowDialog() | Out-Null

    $global:UiLogBox = $null
    if ($global:UiAbort) { $global:UiAbort.Dispose(); $global:UiAbort = $null }
    $form.Dispose()
}

# ---------------------------------------------------------------------------
# Date range selection (calendar form with console fallback)
# ---------------------------------------------------------------------------

function Read-DateRange {
    param([string]$InitialStart, [string]$InitialEnd)

    $start = $null
    $end = $null

    if ($InitialStart) {
        $start = ConvertTo-DateOnly $InitialStart
        $end = if ($InitialEnd) { ConvertTo-DateOnly $InitialEnd } else { $start }
        return @{ Start = $start; End = $end }
    }

    try {
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing

            $form = New-Object System.Windows.Forms.Form
            $form.Text = 'CrabWatch - Select Report Date Range'
            $form.Size = New-Object System.Drawing.Size(460, 260)
            $form.StartPosition = 'CenterScreen'
            $form.FormBorderStyle = 'FixedDialog'
            $form.MaximizeBox = $false

            $lblStart = New-Object System.Windows.Forms.Label
            $lblStart.Text = 'Start date:'
            $lblStart.Location = New-Object System.Drawing.Point(20, 25)
            $lblStart.Size = New-Object System.Drawing.Size(90, 20)
            [void]$form.Controls.Add($lblStart)

            $dpStart = New-Object System.Windows.Forms.DateTimePicker
            $dpStart.Format = 'Short'
            $dpStart.Location = New-Object System.Drawing.Point(120, 22)
            $dpStart.Width = 160
            [void]$form.Controls.Add($dpStart)

            $lblEnd = New-Object System.Windows.Forms.Label
            $lblEnd.Text = 'End date:'
            $lblEnd.Location = New-Object System.Drawing.Point(20, 60)
            $lblEnd.Size = New-Object System.Drawing.Size(90, 20)
            [void]$form.Controls.Add($lblEnd)

            $dpEnd = New-Object System.Windows.Forms.DateTimePicker
            $dpEnd.Format = 'Short'
            $dpEnd.Location = New-Object System.Drawing.Point(120, 57)
            $dpEnd.Width = 160
            [void]$form.Controls.Add($dpEnd)

            $presetY = 100
            $presets = @(
                @{ Label = 'Today';        Action = { $dpStart.Value = (Get-Date).Date; $dpEnd.Value = (Get-Date).Date } },
                @{ Label = 'Last 7 days';  Action = { $dpStart.Value = (Get-Date).Date.AddDays(-6); $dpEnd.Value = (Get-Date).Date } },
                @{ Label = 'This month';   Action = { $now = Get-Date; $dpStart.Value = [datetime]::new($now.Year, $now.Month, 1); $dpEnd.Value = (Get-Date).Date } },
                @{ Label = 'Last month';   Action = { $now = Get-Date; $first = [datetime]::new($now.Year, $now.Month, 1); $dpStart.Value = $first.AddMonths(-1); $dpEnd.Value = $first.AddDays(-1) } }
            )
            $x = 20
            foreach ($p in $presets) {
                $btn = New-Object System.Windows.Forms.Button
                $btn.Text = $p.Label
                $btn.Location = New-Object System.Drawing.Point($x, $presetY)
                $btn.Size = New-Object System.Drawing.Size(95, 28)
                $action = $p.Action
                $btn.Add_Click({ $action.Invoke() })
                [void]$form.Controls.Add($btn)
                $x += 105
            }

            $okBtn = New-Object System.Windows.Forms.Button
            $okBtn.Text = 'Generate Report'
            $okBtn.Location = New-Object System.Drawing.Point(250, 150)
            $okBtn.Size = New-Object System.Drawing.Size(130, 32)
            $okBtn.DialogResult = [System.Windows.Forms.DialogResult]::OK
            [void]$form.Controls.Add($okBtn)

            $cancelBtn = New-Object System.Windows.Forms.Button
            $cancelBtn.Text = 'Cancel'
            $cancelBtn.Location = New-Object System.Drawing.Point(390, 150)
            $cancelBtn.Size = New-Object System.Drawing.Size(60, 32)
            $cancelBtn.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
            [void]$form.Controls.Add($cancelBtn)

            $form.AcceptButton = $okBtn
            $form.CancelButton = $cancelBtn
            $form.ShowInTaskbar = $true

            $result = $form.ShowDialog()
            $form.Dispose()

            if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
                $start = $dpStart.Value.Date
                $end = $dpEnd.Value.Date
                if ($end -lt $start) { $tmp = $start; $start = $end; $end = $tmp }
                return @{ Start = $start; End = $end }
            }
            Write-Host 'Cancelled.' -ForegroundColor Yellow
            exit 0
        }
    catch {
        Write-Warn2 "Calendar form unavailable ($($_.Exception.Message)); falling back to console."
    }

    # Console fallback
    $startText = Read-Host 'Start date (yyyy-MM-dd)'
    $endText = Read-Host 'End date (yyyy-MM-dd, blank = same as start)'
    $start = ConvertTo-DateOnly $startText
    $end = if ($endText) { ConvertTo-DateOnly $endText } else { $start }
    if ($end -lt $start) { $tmp = $start; $start = $end; $end = $tmp }
    return @{ Start = $start; End = $end }
}

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

function Connect-CrabWatch {
    param(
        [string]$Base,
        [string]$Email,
        [string]$Password
    )

    Write-Step 'Logging in to CrabWatch API'
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Method Post -Uri "$Base/api/v1/auth/login" `
            -Body $body -ContentType 'application/json'
    }
    catch {
        $msg = $_.Exception.Message
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $msg += " | $($_.ErrorDetails.Message)" }
        throw "Login failed: $msg"
    }

    if (-not $resp.success) { throw "Login failed: $($resp.message)" }

    $user = $resp.data.user
    Write-Ok "Logged in as $($user.name) (<$($user.email)>) - role: $($user.role)"

    if ($user.role -ne 'admin') {
        throw "Access denied: only the 'admin' role may generate reports (your role: $($user.role))."
    }

    return @{
        Token = $resp.data.token
        User  = $user
    }
}

function Get-CrabWatchObservations {
    param(
        [string]$Base,
        [string]$Token,
        [datetime]$Start,
        [datetime]$End,
        [string]$StatusFilter,
        [System.Threading.CancellationToken]$Cancel = [System.Threading.CancellationToken]::None
    )

    $all = @()
    $seen = @{}
    $page = 1
    $limit = 100
    $totalPages = 1

    do {
        Test-UiCancelled $Cancel
        $query = [ordered]@{
            page     = $page
            limit    = $limit
            dateFrom = $Start.ToString('yyyy-MM-dd')
            dateTo   = $End.ToString('yyyy-MM-dd')
        }
        if ($StatusFilter) { $query.status = $StatusFilter }

        $qs = ($query.GetEnumerator() | ForEach-Object {
            "$($_.Key)=$([uri]::EscapeDataString([string]$_.Value))"
        }) -join '&'

        $url = "$Base/api/v1/observations?$qs"
        Write-Step "Fetching observations (page $page)..."
        $resp = Invoke-RestMethod -Method Get -Uri $url `
            -Headers @{ Authorization = "Bearer $Token" }

        if (-not $resp.success) { throw "API error: $($resp.message)" }

        # The server sorts by createdAt desc with no tiebreaker, so when several
        # observations share a timestamp, skip/take pagination can return the
        # same row on more than one page. Dedupe by observation id.
        $newCount = 0
        foreach ($o in $resp.data.observations) {
            $oid = [string]$o.id
            if (-not $seen.ContainsKey($oid)) {
                $seen[$oid] = $true
                $all += $o
                $newCount++
            }
        }
        $totalPages = $resp.data.totalPages
        Write-Ok "  $($resp.data.observations.Count) on page ($newCount new, $($all.Count) unique so far; total: $($resp.data.total))"
        $page++
    } while ($page -le $totalPages)

    return $all
}

# ---------------------------------------------------------------------------
# HTML report
# ---------------------------------------------------------------------------

function New-ReportHtml {
    param(
        [datetime]$Start,
        [datetime]$End,
        [array]$Observations,
        [string]$AdminName,
        [System.Threading.CancellationToken]$Cancel = [System.Threading.CancellationToken]::None
    )

    $css = @'
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: #f4f6f8; color: #1f2933; }
    .page { max-width: 900px; margin: 0 auto; padding: 24px; }
    header { background: #0b6e4f; color: #fff; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; }
    header h1 { margin: 0 0 6px 0; font-size: 22px; }
    header .meta { font-size: 13px; opacity: 0.9; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; }
    .summary .card { flex: 1; background: #fff; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .summary .card .num { font-size: 24px; font-weight: 700; color: #0b6e4f; }
    .summary .card .lbl { font-size: 12px; color: #616e7c; text-transform: uppercase; letter-spacing: 0.5px; }
    .user-section { background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; overflow: hidden; page-break-inside: auto; }
    .user-header { background: #eef4f1; padding: 12px 18px; border-bottom: 2px solid #0b6e4f; }
    .user-header h2 { margin: 0; font-size: 16px; color: #0b6e4f; }
    .user-header .sub { font-size: 12px; color: #616e7c; margin-top: 2px; }
    .obs { padding: 14px 18px; border-bottom: 1px solid #e4e7eb; page-break-inside: avoid; }
    .obs:last-child { border-bottom: none; }
    .obs .title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .obs .title .sci { font-style: italic; color: #52606d; font-weight: 400; }
    .obs .meta { font-size: 12px; color: #52606d; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 6px; vertical-align: middle; }
    .badge.APPROVED { background: #d1f2e1; color: #0b6e4f; }
    .badge.PENDING { background: #fdf1d7; color: #92600a; }
    .badge.REJECTED { background: #fde8e8; color: #ab091e; }
    .photos { display: flex; flex-wrap: wrap; gap: 8px; }
    .photos img { max-width: 220px; max-height: 180px; border-radius: 6px; border: 1px solid #d9e2ec; object-fit: cover; }
    .photos .missing { max-width: 220px; height: 120px; display: flex; align-items: center; justify-content: center; background: #f0f4f8; color: #9aa5b1; border-radius: 6px; font-size: 12px; }
    .notes { font-size: 12px; color: #3e4c59; margin-top: 8px; font-style: italic; }
    footer { text-align: center; font-size: 11px; color: #9aa5b1; padding: 16px 0 8px 0; }
    @media print {
        body { background: #fff; }
        .page { padding: 0; max-width: none; }
        .user-section, .obs { box-shadow: none; }
    }
'@

    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('<!DOCTYPE html>')
    [void]$sb.AppendLine('<html lang="en">')
    [void]$sb.AppendLine('<head>')
    [void]$sb.AppendLine('<meta charset="utf-8" />')
    [void]$sb.AppendLine('<title>CrabWatch Observation Report</title>')
    [void]$sb.AppendLine("<style>$css</style>")
    [void]$sb.AppendLine('</head>')
    [void]$sb.AppendLine('<body>')
    [void]$sb.AppendLine('<div class="page">')

    $rangeText = if ($Start -eq $End) {
        $Start.ToString('dd MMM yyyy')
    } else {
        "$($Start.ToString('dd MMM yyyy')) - $($End.ToString('dd MMM yyyy'))"
    }

    [void]$sb.AppendLine('<header>')
    [void]$sb.AppendLine('  <h1>CrabWatch Observation Report</h1>')
    [void]$sb.AppendLine("  <div class='meta'>Period: $rangeText &nbsp;|&nbsp; Generated: $((Get-Date).ToString('dd MMM yyyy HH:mm')) &nbsp;|&nbsp; Generated by: $(ConvertTo-HtmlEntity $AdminName)</div>")
    [void]$sb.AppendLine('</header>')

    $userGroups = $Observations | Group-Object -Property { $_.user.id } |
        Sort-Object -Property { $_.Group[0].user.name }

    $totalPhotos = ($Observations | ForEach-Object { $_.photos.Count } | Measure-Object -Sum).Sum
    if ($null -eq $totalPhotos) { $totalPhotos = 0 }

    [void]$sb.AppendLine('<div class="summary">')
    [void]$sb.AppendLine("  <div class='card'><div class='num'>$($Observations.Count)</div><div class='lbl'>Observations</div></div>")
    [void]$sb.AppendLine("  <div class='card'><div class='num'>$($userGroups.Count)</div><div class='lbl'>Contributors</div></div>")
    [void]$sb.AppendLine("  <div class='card'><div class='num'>$totalPhotos</div><div class='lbl'>Photos</div></div>")
    [void]$sb.AppendLine('</div>')

    if ($Observations.Count -eq 0) {
        [void]$sb.AppendLine('<div class="user-section"><div class="user-header"><h2>No observations</h2></div><div class="obs">No observations were submitted in the selected period.</div></div>')
    }

    foreach ($group in $userGroups) {
        $u = $group.Group[0].user
        $obsCount = $group.Group.Count
        [void]$sb.AppendLine('<div class="user-section">')
        [void]$sb.AppendLine("  <div class='user-header'>")
        [void]$sb.AppendLine("    <h2>$(ConvertTo-HtmlEntity $u.name)</h2>")
        [void]$sb.AppendLine("    <div class='sub'>$(ConvertTo-HtmlEntity $u.email) &mdash; $obsCount observation$(if ($obsCount -ne 1) { 's' })</div>")
        [void]$sb.AppendLine('  </div>')

        $sorted = $group.Group | Sort-Object -Property { [datetime]::Parse($_.createdAt) } -Descending
        foreach ($o in $sorted) {
            $created = [datetime]::Parse($o.createdAt).ToString('dd MMM yyyy HH:mm')
            $species = "$(ConvertTo-HtmlEntity $o.species.commonName) <span class='sci'>($(ConvertTo-HtmlEntity $o.species.scientificName))</span>"
            $bwText = if ($null -ne $o.bw) { "$($o.bw) g" } else { 'n/a' }

            [void]$sb.AppendLine('  <div class="obs">')
            [void]$sb.AppendLine("    <div class='title'>$species <span class='badge $($o.status)'>$($o.status)</span></div>")
            [void]$sb.AppendLine("    <div class='meta'>$created &nbsp;|&nbsp; CW: $($o.cw) mm &nbsp;|&nbsp; BW: $bwText &nbsp;|&nbsp; Gender: $(ConvertTo-HtmlEntity $o.gender) &nbsp;|&nbsp; Maturation: $(ConvertTo-HtmlEntity $o.maturationStatus) &nbsp;|&nbsp; $($o.lat), $($o.lng) ($($o.locationMethod))</div>")

            if ($o.photos -and $o.photos.Count -gt 0) {
                [void]$sb.AppendLine('    <div class="photos">')
                foreach ($photo in $o.photos) {
                    Test-UiCancelled $Cancel
                    if ($photo -match '/analysis/' -or $photo -match '\.(heic|heif)(\?|$)') {
                        # /analysis/ = temporary staging blob, source deleted.
                        # .heic/.heif = iPhone original, not decodable by GDI+.
                        # Report as missing without attempting a download.
                        [void]$sb.AppendLine("      <div class='missing'>Image unavailable</div>")
                        continue
                    }
                    $dataUri = ConvertTo-Base64Image $photo
                    if ($dataUri) {
                        [void]$sb.AppendLine("      <img src='$dataUri' alt='observation photo' />")
                    } elseif ($photo -match '^https?://') {
                        # Download failed but the URL is a live link (e.g. Azure SAS).
                        # Embed the direct URL so the image still renders when the
                        # report is opened while the SAS token is still valid.
                        [void]$sb.AppendLine("      <img src='$photo' alt='observation photo' loading='lazy' />")
                    } else {
                        [void]$sb.AppendLine("      <div class='missing'>Image unavailable</div>")
                    }
                }
                [void]$sb.AppendLine('    </div>')
            }

            if ($o.notes) {
                [void]$sb.AppendLine("    <div class='notes'>$(ConvertTo-HtmlEntity $o.notes)</div>")
            }
            [void]$sb.AppendLine('  </div>')
        }
        [void]$sb.AppendLine('</div>')
    }

    [void]$sb.AppendLine('<footer>CrabWatch &mdash; generated by Generate-ObservationReport.ps1</footer>')
    [void]$sb.AppendLine('</div>')
    [void]$sb.AppendLine('</body>')
    [void]$sb.AppendLine('</html>')

    return $sb.ToString()
}

# ---------------------------------------------------------------------------
# PDF export
# ---------------------------------------------------------------------------

function Export-ReportPdf {
    param([string]$HtmlPath, [string]$PdfPath)

    # Preferred: Microsoft Edge headless
    $edge = Get-EdgePath
    if ($edge) {
        Write-Step "Exporting PDF via Microsoft Edge"
        $argList = @(
            '--headless',
            '--disable-gpu',
            '--no-pdf-header-footer',
            "--print-to-pdf=$PdfPath",
            "--print-to-pdf-no-header",
            $HtmlPath
        )
        & $edge @argList 2>&1 | Out-Null
        if (Test-Path -LiteralPath $PdfPath) {
            Write-Ok "PDF written: $PdfPath"
            return $PdfPath
        }
        Write-Warn2 'Edge headless did not produce a PDF; trying Word COM fallback.'
    }

    # Fallback: Microsoft Word COM
    try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        $doc = $word.Documents.Open($HtmlPath, $false, $true)
        # 17 = wdFormatPDF
        $doc.SaveAs([ref]$PdfPath, [ref]17)
        $doc.Close($false)
        $word.Quit()
        [Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
        if (Test-Path -LiteralPath $PdfPath) {
            Write-Ok "PDF written: $PdfPath"
            return $PdfPath
        }
    }
    catch {
        Write-Warn2 "Word COM export failed: $($_.Exception.Message)"
    }

    throw "Could not export PDF. Install Microsoft Edge or Microsoft Word, or use -NoPdf to keep the HTML report only."
}

# ---------------------------------------------------------------------------
# Report workflow (shared by GUI and console)
# ---------------------------------------------------------------------------

function Invoke-ReportWorkflow {
    param(
        [string]$Base,
        [string]$Email,
        [object]$Password,
        [datetime]$Start,
        [datetime]$End,
        [string]$StatusFilter = '',
        [string]$OutputDir,
        [switch]$NoPdf,
        [System.Threading.CancellationToken]$Token = [System.Threading.CancellationToken]::None
    )

    $log = { param($m, $l = 'Info') Log-Ui $m $l }

    # Fresh image cache for this run (keyed by blob path).
    $global:ImageCache = @{}

    & $log "Report period: $($Start.ToString('dd MMM yyyy')) to $($End.ToString('dd MMM yyyy'))" 'Info'

    # 1. Login (admin only)
    $plainPassword = $Password
    if ($plainPassword -is [System.Security.SecureString]) {
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($plainPassword))
    }
    $session = Connect-CrabWatch -Base $Base -Email $Email -Password $plainPassword
    & $log "Logged in as $($session.User.name) (<$($session.User.email)>) - role: $($session.User.role)" 'Ok'
    if ($session.User.role -ne 'admin') {
        throw "Access denied: only the 'admin' role may generate reports (your role: $($session.User.role))."
    }

    # 2. Fetch observations
    $observations = Get-CrabWatchObservations -Base $Base -Token $session.Token -Start $Start -End $End -StatusFilter $StatusFilter -Cancel $Token
    $contributorCount = ($observations | Group-Object { $_.user.id }).Count
    & $log "Fetched $($observations.Count) observation(s) from $contributorCount contributor(s)." 'Ok'

    # 3. Build HTML report
    if (-not (Test-Path -LiteralPath $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    $baseName = "CrabWatch_Report_$($Start.ToString('yyyyMMdd'))-$($End.ToString('yyyyMMdd'))"
    $htmlPath = Join-Path $OutputDir "$baseName.html"
    $pdfPath = Join-Path $OutputDir "$baseName.pdf"

    & $log 'Building HTML report (embedding photos)...' 'Info'
    $html = New-ReportHtml -Start $Start -End $End -Observations $observations -AdminName $session.User.name -Cancel $Token
    [System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)
    & $log "HTML written: $htmlPath" 'Ok'

    # Free the in-memory image cache now that the HTML is on disk — the base64
    # data is already embedded in $html, so the cache is no longer needed. This
    # cuts peak memory before the (separate) PDF export step.
    $global:ImageCache = @{}
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()

    # 4. PDF export
    if ($NoPdf) {
        & $log 'Opening HTML report in default browser' 'Info'
        Start-Process $htmlPath
    }
    else {
        $pdf = Export-ReportPdf -HtmlPath $htmlPath -PdfPath $pdfPath
        & $log 'Opening PDF report' 'Info'
        Start-Process $pdf
    }

    & $log 'Done.' 'Ok'
}

# ---------------------------------------------------------------------------
# Console workflow
# ---------------------------------------------------------------------------

function Invoke-ConsoleWorkflow {
    param(
        [string]$Base,
        [string]$StartText,
        [string]$EndText,
        [string]$StatusFilter,
        [string]$OutDir,
        [switch]$NoPdf
    )

    Write-Host ''
    Write-Host '============================================' -ForegroundColor Green
    Write-Host '  CrabWatch Observation Report Generator' -ForegroundColor Green
    Write-Host '============================================' -ForegroundColor Green
    Write-Host ''

    $range = Read-DateRange -InitialStart $StartText -InitialEnd $EndText
    $Start = $range.Start
    $End = $range.End
    Write-Ok "Report period: $($Start.ToString('dd MMM yyyy')) to $($End.ToString('dd MMM yyyy'))"

    $email = Read-Host 'Email'
    $password = Read-Host 'Password' -AsSecureString

    Invoke-ReportWorkflow -Base $Base -Email $email -Password $password -Start $Start -End $End `
        -StatusFilter $StatusFilter -OutputDir $OutDir -NoPdf:$NoPdf
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

$BaseUrl = $BaseUrl.TrimEnd('/')

if ($NoUi) {
    Invoke-ConsoleWorkflow -Base $BaseUrl -StartText $StartDate -EndText $EndDate `
        -StatusFilter $Status -OutDir $OutputDir -NoPdf:$NoPdf
}
else {
    try {
        Show-CrabWatchUi -DefaultBaseUrl $BaseUrl -DefaultStart $StartDate -DefaultEnd $EndDate `
            -DefaultStatus $Status -DefaultOutputDir $OutputDir -DefaultNoPdf:$NoPdf
    }
    catch {
        Write-Host "GUI unavailable: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "STACKTRACE:" -ForegroundColor DarkGray
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
        exit 1
    }
}
