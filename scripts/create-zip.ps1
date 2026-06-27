param([string]$SourceDir, [string]$DestZip)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = New-Object System.IO.FileStream($DestZip, 'Create')
$zip = New-Object System.IO.Compression.ZipArchive($stream, 'Create')
$files = Get-ChildItem -Path $SourceDir -Recurse -File
$count = 0
foreach ($file in $files) {
    $relative = $file.FullName.Substring($SourceDir.Length + 1) -replace '\\', '/'
    $entry = $zip.CreateEntry($relative)
    $entryStream = $entry.Open()
    $reader = [System.IO.File]::OpenRead($file.FullName)
    $reader.CopyTo($entryStream)
    $reader.Dispose()
    $entryStream.Dispose()
    $count++
    if ($count % 1000 -eq 0) { Write-Host "Processed $count files..." }
}
$zip.Dispose()
$stream.Dispose()
Write-Host "Done: $count files, size: $([math]::Round((Get-Item $DestZip).Length/1MB, 2)) MB"
