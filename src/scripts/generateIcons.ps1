Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\HP\.gemini\antigravity-ide\brain\98d1955d-8dc1-473c-92fa-5899c3d88cf3\.user_uploaded\media_1792267316145.jpg"
$destDir = "c:\Users\HP\OneDrive\Desktop\d world\client\public"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($w, $h, $outFile) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graph.DrawImage($srcImg, 0, 0, $w, $h)
    $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $graph.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outFile ($w x $h)"
}

Resize-Image 1024 1024 "$destDir\logo.png"
Resize-Image 512 512 "$destDir\pwa-512x512.png"
Resize-Image 256 256 "$destDir\logo-256.png"
Resize-Image 192 192 "$destDir\pwa-192x192.png"
Resize-Image 192 192 "$destDir\logo-192.png"
Resize-Image 180 180 "$destDir\apple-touch-icon.png"
Resize-Image 64 64 "$destDir\logo-sm.png"
Resize-Image 48 48 "$destDir\favicon-48.png"
Resize-Image 32 32 "$destDir\favicon.png"
Resize-Image 32 32 "$destDir\favicon.ico"

$srcImg.Dispose()
Write-Host "All icons generated successfully from official logo!"
