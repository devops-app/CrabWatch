#Requires -Version 5.1
# Quick test: download a real /observations/ photo, resize it, report sizes.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Resize-ImageBytes {
    param([byte[]]$Bytes, [int]$MaxWidth = 1280, [int]$Quality = 80)
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

# Use a known-good /observations/ photo URL (SAS may be expired; if so, re-run
# the report GUI once and copy a fresh URL here).
$photo = 'https://crabwatch04052026.blob.core.windows.net/crabwatch-uploads/observations/e62a8c71-fde1-40bb-888e-b4d87ef21932/2026-07-04/temp_1783132952769-0.jpg?sv=2026-06-06&st=2026-10-06T07%3A09%3A09Z&se=2026-10-06T08%3A11%3A09Z&sr=b&sp=r&sig=AioZ8lkR7Rj9nOrycdyZkmrKK1ZaGi8knsVw3tVJXRM%3D'

Write-Host "Downloading: $($photo.Substring(0,80))..."
$wc = New-Object System.Net.WebClient
$orig = $wc.DownloadData($photo)
Write-Host ("Original size : {0:N0} bytes ({1:N2} MB)" -f $orig.Length, ($orig.Length/1MB))

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$resized = Resize-ImageBytes -Bytes $orig -MaxWidth 1280 -Quality 80
$sw.Stop()
Write-Host ("Resized size  : {0:N0} bytes ({1:N2} MB)  [{2}ms]" -f $resized.Length, ($resized.Length/1MB), $sw.ElapsedMilliseconds)
Write-Host ("Reduction     : {0:N1}%" -f ((1 - $resized.Length/$orig.Length)*100))

# Estimate total HTML size for ~519 photos at resized size
$est = $resized.Length * 1.34 * 519  # base64 overhead ~1.34x
Write-Host ("Est. HTML for 519 photos: {0:N2} MB" -f ($est/1MB))
