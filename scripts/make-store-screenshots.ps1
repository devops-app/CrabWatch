# Generates App Store Connect iPhone screenshots from 6.1" (1179x2556) source captures.
#
# Usage:
#   1. Take 3-5 screenshots on your iPhone 16 (Home, Capture, Analytics, Leaderboard, ...)
#   2. Copy them into  C:\Works\CrabWatch\images\screenshots\iphone-6.1\
#   3. Run:  .\scripts\make-store-screenshots.ps1
#   4. Upload from  C:\Works\CrabWatch\images\screenshots\store\
#
# Output mapping:
#   iphone-6.1_*.png  -> "iPhone with Dynamic Island (small display)"  (1179x2556, originals)
#   iphone-6.7_*.png  -> "iPhone with Dynamic Island (medium display)" (1290x2796)
#   iphone-6.9_*.png  -> "iPhone with Dynamic Island (large display)"  (1320x2868)

param(
    [string]$SourceDir = "C:\Works\CrabWatch\images\screenshots\iphone-6.1",
    [string]$OutDir    = "C:\Works\CrabWatch\images\screenshots\store"
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $SourceDir)) {
    Write-Error "Source folder not found: $SourceDir — copy your iPhone 16 screenshots there first."
    exit 1
}
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$targets = @(
    @{ Name = "iphone-6.7"; W = 1290; H = 2796 },
    @{ Name = "iphone-6.9"; W = 1320; H = 2868 }
)

$files = Get-ChildItem -Path $SourceDir -Filter *.png
if ($files.Count -eq 0) {
    Write-Error "No .png files found in $SourceDir"
    exit 1
}

foreach ($file in $files) {
    $src = [System.Drawing.Image]::FromFile($file.FullName)
    try {
        if ($src.Width -ne 1179 -or $src.Height -ne 2556) {
            Write-Warning "$($file.Name) is $($src.Width)x$($src.Height), expected 1179x2556 — continuing anyway."
        }
        foreach ($t in $targets) {
            $bmp = New-Object System.Drawing.Bitmap($t.W, $t.H)
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.DrawImage($src, 0, 0, $t.W, $t.H)
            $g.Dispose()
            $out = Join-Path $OutDir ("{0}_{1}" -f $t.Name, $file.Name)
            $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
            $bmp.Dispose()
            Write-Host "Created $out"
        }
    }
    finally {
        $src.Dispose()
    }
}

Write-Host ""
Write-Host "Done. Upload plan:" -ForegroundColor Green
Write-Host "  $SourceDir\*.png  -> small display slot (1179x2556)"
Write-Host "  $OutDir\iphone-6.7_*.png -> medium display slot (1290x2796)"
Write-Host "  $OutDir\iphone-6.9_*.png -> large display slot (1320x2868)"
