Add-Type -AssemblyName System.Drawing

$srcFile = Join-Path (Get-Location) "public\logo.jpg"
if (-not (Test-Path $srcFile)) {
    Write-Error "No se encontro public\logo.jpg"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcFile)
$bgColor = $srcBmp.GetPixel(10, 10)

function Resize-Image {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [string]$destPath,
        [double]$scaleFactor = 1.0,
        [System.Drawing.Color]$background
    )

    $targetBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Limpiar fondo
    $brush = New-Object System.Drawing.SolidBrush($background)
    $g.FillRectangle($brush, 0, 0, $width, $height)
    $brush.Dispose()

    if ($scaleFactor -eq 1.0) {
        $g.DrawImage($source, 0, 0, $width, $height)
    } else {
        $drawW = [int]($width * $scaleFactor)
        $drawH = [int]($height * $scaleFactor)
        $offsetX = [int](($width - $drawW) / 2)
        $offsetY = [int](($height - $drawH) / 2)
        $g.DrawImage($source, $offsetX, $offsetY, $drawW, $drawH)
    }

    $g.Dispose()

    # Guardar en PNG
    $targetBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()
    Write-Host "Generado: $destPath ($($width)x$($height))"
}

# 1. public\icons\icon-192.png
Resize-Image -source $srcBmp -width 192 -height 192 -destPath (Join-Path (Get-Location) "public\icons\icon-192.png") -background $bgColor

# 2. public\icons\icon-512.png
Resize-Image -source $srcBmp -width 512 -height 512 -destPath (Join-Path (Get-Location) "public\icons\icon-512.png") -background $bgColor

# 3. public\icons\icon-maskable.png (con padding 80% safe zone para Android / PWA)
Resize-Image -source $srcBmp -width 512 -height 512 -destPath (Join-Path (Get-Location) "public\icons\icon-maskable.png") -scaleFactor 0.82 -background $bgColor

# 4. public\icons\apple-touch-icon.png (180x180)
Resize-Image -source $srcBmp -width 180 -height 180 -destPath (Join-Path (Get-Location) "public\icons\apple-touch-icon.png") -background $bgColor

# 5. public\apple-touch-icon.png (180x180 en la raiz)
Resize-Image -source $srcBmp -width 180 -height 180 -destPath (Join-Path (Get-Location) "public\apple-touch-icon.png") -background $bgColor

# 6. public\favicon.png (64x64)
Resize-Image -source $srcBmp -width 64 -height 64 -destPath (Join-Path (Get-Location) "public\favicon.png") -background $bgColor

# 7. public\favicon.ico (256x256 alta resolucion)
$icoBmp = New-Object System.Drawing.Bitmap($srcBmp, 256, 256)
$iconHandle = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$icoDest = Join-Path (Get-Location) "public\favicon.ico"
$stream = [System.IO.File]::Create($icoDest)
$icon.Save($stream)
$stream.Close()
$icon.Dispose()
$icoBmp.Dispose()
Write-Host "Generado favicon.ico (256x256)"

$srcBmp.Dispose()
Write-Host "Todos los iconos PWA de Sora fueron generados exitosamente a partir de public\logo.jpg!"
