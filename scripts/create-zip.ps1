param([string]$SourceDir, [string]$DestZip)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($DestZip, 'Create')
$files = Get-ChildItem -Path $SourceDir -Recurse -File
$count = 0
foreach ($file in $files) {
    $relative = $file.FullName.Substring($SourceDir.Length + 1) -replace '\\', '/'
    $entry = $zip.CreateEntry($relative)
    using ($stream = $entry.Open()) {
        using ($reader = [System.IO.File]::OpenRead($file.FullName)) {
            $reader.CopyTo($stream)
        }
    }
    $count++
    if ($count % 1000 -eq 0) { Write-Host "Processed $count files..." }
}
$zip.Dispose()
Write-Host "Done: $count files, size: $([math]::Round((Get-Item $DestZip).Length/1MB, 2)) MB"
