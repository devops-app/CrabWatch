# Generates a 1024x500 Google Play feature graphic for CrabWatch
Add-Type -AssemblyName System.Drawing

$W = 1024
$H = 500
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Ocean gradient background (top-left to bottom-right)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $W, $H)),
    [System.Drawing.Color]::FromArgb(255, 30, 58, 95),    # #1e3a5f deep ocean
    [System.Drawing.Color]::FromArgb(255, 44, 122, 183),  # #2c7ab7 lighter ocean
    35.0
)
$g.FillRectangle($brush, 0, 0, $W, $H)

# Subtle decorative circles (bubbles) on the right side
$bubbleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
$g.FillEllipse($bubbleBrush, 820, 60, 140, 140)
$g.FillEllipse($bubbleBrush, 930, 330, 90, 90)
$bubbleBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 255, 255, 255))
$g.FillEllipse($bubbleBrush2, 700, 380, 60, 60)

# App icon on the left, rounded, vertically centered
$iconSrc = [System.Drawing.Image]::FromFile("C:\Works\CrabWatch\images\Icons\Web\android-chrome-512x512.png")
$iconSize = 360
$iconX = 70
$iconY = [int](($H - $iconSize) / 2)

# Rounded-rectangle clip for the icon
$radius = 72
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc($iconX, $iconY, $radius, $radius, 180, 90)
$path.AddArc($iconX + $iconSize - $radius, $iconY, $radius, $radius, 270, 90)
$path.AddArc($iconX + $iconSize - $radius, $iconY + $iconSize - $radius, $radius, $radius, 0, 90)
$path.AddArc($iconX, $iconY + $iconSize - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()

# Soft shadow behind icon
$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 0, 0, 0))
$shadowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$shadowPath.AddArc($iconX + 8, $iconY + 10, $radius, $radius, 180, 90)
$shadowPath.AddArc($iconX + $iconSize - $radius + 8, $iconY + 10, $radius, $radius, 270, 90)
$shadowPath.AddArc($iconX + $iconSize - $radius + 8, $iconY + $iconSize - $radius + 10, $radius, $radius, 0, 90)
$shadowPath.AddArc($iconX + 8, $iconY + $iconSize - $radius + 10, $radius, $radius, 90, 90)
$shadowPath.CloseFigure()
$g.FillPath($shadowBrush, $shadowPath)

# Draw icon clipped to rounded rect
$oldClip = $g.Clip
$g.SetClip($path)
$g.DrawImage($iconSrc, (New-Object System.Drawing.Rectangle($iconX, $iconY, $iconSize, $iconSize)))
$g.ResetClip()
$g.Clip = $oldClip

# Text block on the right
$textX = 500
$white = [System.Drawing.Color]::White
$lightBlue = [System.Drawing.Color]::FromArgb(255, 186, 220, 245)

$titleFont = New-Object System.Drawing.Font("Segoe UI", 84, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString("CrabWatch", $titleFont, (New-Object System.Drawing.SolidBrush $white), $textX, 120)

$tagFont = New-Object System.Drawing.Font("Segoe UI", 34, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString("AI-Powered Crab Identification", $tagFont, (New-Object System.Drawing.SolidBrush $lightBlue), $textX, 250)

$subFont = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString("Snap. Identify. Contribute to marine research.", $subFont, (New-Object System.Drawing.SolidBrush $lightBlue), $textX, 310)

# Thin accent line under title
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 120, 200, 255), 4)
$g.DrawLine($linePen, $textX, 225, $textX + 300, 225)

$out = "C:\Works\CrabWatch\images\feature-graphic-1024x500.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$iconSrc.Dispose()

$fi = Get-Item $out
Write-Output "Saved: $out ($($fi.Length) bytes)"
