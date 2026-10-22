Add-Type -AssemblyName System.Drawing

$srcFile = Join-Path (Get-Location) "public\logo.jpg"
$destFile = Join-Path (Get-Location) "public\favicon.ico"

$bmp = [System.Drawing.Bitmap]::FromFile($srcFile)
$thumb = New-Object System.Drawing.Bitmap($bmp, 48, 48)
$iconHandle = $thumb.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$stream = [System.IO.File]::Create($destFile)
$icon.Save($stream)
$stream.Close()
$icon.Dispose()
$thumb.Dispose()
$bmp.Dispose()

Write-Host "Generated favicon.ico successfully! Size: $((Get-Item $destFile).Length) bytes"
