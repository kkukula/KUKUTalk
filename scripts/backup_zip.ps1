# backup_zip.ps1  (ASCII only)
# ZIP backup C:\projekty\KUKUTalk -> C:\projekty\KUKUTalk\backups
# - zachowuje strukturę (także puste foldery)
# - pomija: backups/, ukryte/systemowe, reparse (junction/symlink), typowe katalogi buildowe

$ErrorActionPreference = 'Stop'

function Title([string]$t){ Write-Host ("==== " + $t + " ====") -ForegroundColor Cyan }
function Info([string]$t){ Write-Host $t -ForegroundColor Gray }
function Ok([string]$t){ Write-Host $t -ForegroundColor Green }

# Load required .NET assemblies (fix for PS 5.1)
try {
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
} catch {
  throw "Nie mogę załadować bibliotek kompresji .NET: $($_.Exception.Message)"
}

# SETTINGS
$Root      = 'C:\projekty\KUKUTalk'
$BackupDir = Join-Path $Root 'backups'
$TimeStamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$ZipPath   = Join-Path $BackupDir ("kukutalk_backup_" + $TimeStamp + ".zip")

# Exclusions by path segment
$ExcludeDirNames  = @('backups','.git','node_modules','.pnpm-store','dist','build','.next','.expo','coverage')
$ExcludeFileNames = @('Thumbs.db','desktop.ini')

# Helpers
function RelPath([string]$root, [string]$full){
  $rel = $full.Substring($root.Length).TrimStart('\')
  return ($rel -replace '\\','/')
}
function PathHasExcludedDir([string]$root, [string]$full){
  if ($full.Length -le $root.Length) { return $false }
  $rel = $full.Substring($root.Length).TrimStart('\')
  foreach($seg in ($rel -split '\\')){
    if ($ExcludeDirNames -contains $seg) { return $true }
  }
  return $false
}
function IsHiddenOrSystem($item){
  return ( ($item.Attributes -band [IO.FileAttributes]::Hidden) -ne 0 -or
           ($item.Attributes -band [IO.FileAttributes]::System) -ne 0 )
}
function IsReparsePoint($item){
  return ( ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 )
}

# PREP
Title 'Prepare'
if (-not (Test-Path $Root)) { throw "Root not found: $Root" }
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# Open ZIP for writing
$fs  = [System.IO.File]::Create($ZipPath)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create, $false)

try {
  Title 'Add directory entries (to keep empty folders)'
  $dirs = Get-ChildItem -Path $Root -Directory -Recurse -Force:$false | Where-Object {
    -not (IsHiddenOrSystem $_) -and -not (IsReparsePoint $_) -and -not (PathHasExcludedDir $Root $_.FullName)
  }
  foreach($d in $dirs){
    $rel = RelPath $Root $d.FullName
    if ($rel) { [void]$zip.CreateEntry($rel.TrimEnd('/') + '/') }
  }
  Info ("Dirs added: " + $dirs.Count)

  Title 'Add files'
  $files = Get-ChildItem -Path $Root -File -Recurse -Force:$false | Where-Object {
    -not (IsHiddenOrSystem $_) -and -not (IsReparsePoint $_) -and
    -not (PathHasExcludedDir $Root $_.FullName) -and
    -not ($ExcludeFileNames -contains $_.Name)
  }

  $added = 0
  foreach($f in $files){
    $rel = RelPath $Root $f.FullName
    if (-not $rel) { continue }
    $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $in  = [System.IO.File]::OpenRead($f.FullName)
    $out = $entry.Open()
    try { $in.CopyTo($out) } finally { $in.Dispose(); $out.Dispose() }
    $added++
  }
  Ok ("Files added: " + $added)
}
finally {
  $zip.Dispose()
  $fs.Dispose()
}

$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Ok ("Backup created: " + $ZipPath + "  (" + $sizeMB + " MB)")
