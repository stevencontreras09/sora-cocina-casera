Add-Type -AssemblyName System.Drawing

$srcFile = Join-Path (Get-Location) "public\logo.jpg"
$src = [System.Drawing.Image]::FromFile($srcFile)

function Save-Resized($relativePath, $w, $h) {
    $destFile = Join-Path (Get-Location) $relativePath
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $w, $h)
    $bmp.Save($destFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $relativePath ($w x $h)"
}

Save-Resized "public\icons\icon-192.png" 192 192
Save-Resized "public\icons\icon-512.png" 512 512
Save-Resized "public\icons\icon-maskable.png" 512 512
Save-Resized "public\icons\apple-touch-icon.png" 180 180
Save-Resized "public\favicon.png" 64 64

$src.Dispose()
Write-Host "All icons generated successfully from official logo!"
