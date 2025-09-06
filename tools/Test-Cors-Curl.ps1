param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [object] $Ports = @(5173,5174),
  [string] $Api  = "http://localhost:3001",
  [string] $Path = "/auth/login"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Ujednolić $Ports do tablicy intów (obsługa: "5173,5174", "5173 5174", 5173,5174)
if ($Ports -is [string]) {
  $Ports = $Ports -split '[,; ]+' | Where-Object { $_ -match '^\d+$' } | ForEach-Object { [int]$_ }
} elseif ($Ports -isnot [System.Collections.IEnumerable]) {
  $Ports = @([int]$Ports)
} else {
  $Ports = @($Ports) | ForEach-Object {
    if ($_ -is [int]) { $_ } else { ($_ -replace '[^\d]','') -as [int] }
  } | Where-Object { $_ -ne $null }
}

function Test-Origin {
  param(
    [Parameter(Mandatory=$true)][string]$origin,
    [Parameter(Mandatory=$true)][string]$api,
    [Parameter(Mandatory=$true)][string]$path
  )
  $url = "$api$path"
  $args = @(
    "-s","-o","NUL","-D","-",
    "-X","OPTIONS","--max-time","10","--noproxy","*",
    "-H","Origin: $origin",
    "-H","Access-Control-Request-Method: POST",
    "-H","Access-Control-Request-Headers: content-type, authorization",
    $url
  )
  $headers = & curl.exe @args 2>$null
  if (-not $headers) { Write-Host "[FAIL] $origin -> no response" -ForegroundColor Red; return }
  $lines = $headers -split "`r?`n"
  $status = ($lines | Select-Object -First 1)
  $acao = ($lines | Where-Object { $_ -match '^Access-Control-Allow-Origin:\s*(.+)$' } | ForEach-Object { ($_ -replace '^Access-Control-Allow-Origin:\s*','').Trim() }) -join ','
  $acac = ($lines | Where-Object { $_ -match '^Access-Control-Allow-Credentials:\s*(.+)$' } | ForEach-Object { ($_ -replace '^Access-Control-Allow-Credentials:\s*','').Trim() }) -join ','
  if (-not $acao) { $acao = "(brak ACAO)" }
  if (-not $acac) { $acac = "(brak ACAC)" }
  Write-Host "[OK] Preflight $origin -> $status | ACAO=$acao | ACAC=$acac" -ForegroundColor Green
}

foreach($p in $Ports){
  if ($p -is [int]) {
    Test-Origin -origin "http://localhost:$p" -api $Api -path $Path
  }
}
