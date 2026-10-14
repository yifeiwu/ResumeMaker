<#
.SYNOPSIS
  Runs the resume builder's unit + browser integration tests. No Node required.

.DESCRIPTION
  Starts a temporary static server, loads /test.html and /e2e.html in headless
  Edge (or Chrome), parses the rendered results and exits non-zero on failure.

.EXAMPLE
  .\check.ps1
  .\check.ps1 -Port 9000
#>
[CmdletBinding()]
param(
  [int]$Port = 8477,
  [string]$EdgePath = "",
  [int]$VirtualTimeMs = 20000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$failures = 0

function Find-Browser {
  param([string]$Explicit)
  if ($Explicit) {
    if (Test-Path -LiteralPath $Explicit) { return $Explicit }
    throw "Browser not found at $Explicit"
  }
  $candidates = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $candidates) { if ($c -and (Test-Path -LiteralPath $c)) { return $c } }
  return $null
}

function Invoke-Page {
  param([string]$Browser, [string]$Url, [string]$OutFile, [string]$Profile)
  & $Browser --headless=new --disable-gpu --no-first-run --no-default-browser-check `
    --user-data-dir="$Profile" --virtual-time-budget=$VirtualTimeMs --dump-dom "$Url" 2>$null | Out-File -Encoding utf8 $OutFile
}

$browser = Find-Browser -Explicit $EdgePath
if (-not $browser) {
  Write-Warning "No Edge/Chrome found - skipping browser checks (open test.html manually)."
  exit 2
}

$profile = Join-Path $env:TEMP "resume-builder-headless"
New-Item -ItemType Directory -Force -Path $profile | Out-Null
$server = $null
try {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
  if (-not $python) { throw "python not found - needed to serve the folder" }

  $server = Start-Process -FilePath $python.Source -ArgumentList "-m", "http.server", "$Port" `
    -WorkingDirectory $root -WindowStyle Hidden -PassThru

  $base = "http://localhost:$Port"
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    try { if ((Invoke-WebRequest -Uri "$base/index.html" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { $ready = $true; break } } catch { }
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) { throw "static server did not come up on port $Port" }

  $pages = @(
    @{ Name = "unit tests";        Url = "$base/test.html"; Expect = 'All \d+ checks passed' },
    @{ Name = "integration tests"; Url = "$base/e2e.html";   Expect = 'All \d+ checks passed' }
  )

  foreach ($p in $pages) {
    $out = Join-Path $env:TEMP ("resume-" + [IO.Path]::GetFileNameWithoutExtension($p.Url) + "-dom.html")
    Invoke-Page -Browser $browser -Url $p.Url -OutFile $out -Profile $profile
    $dom = ""
    if (Test-Path -LiteralPath $out) { $dom = Get-Content -LiteralPath $out -Raw }
    $bad = [regex]::Matches($dom, '<li class="fail">FAIL ([^<]*)</li>')
    $status = "no results found (page did not finish?)"
    if ($dom -match '<h2[^>]*>(All \d+ checks passed|\d+ failing|harness error)</h2>') { $status = $Matches[1] }
    if ($bad.Count -eq 0 -and $dom -match $p.Expect) {
      Write-Host ("PASS  " + $p.Name.PadRight(18) + $Matches[0]) -ForegroundColor Green
    } else {
      Write-Host ("FAIL  " + $p.Name.PadRight(18) + $status) -ForegroundColor Red
      foreach ($b in $bad) { Write-Host ("      - " + $b.Groups[1].Value) -ForegroundColor Red }
      $failures++
    }
    Remove-Item -LiteralPath $out -ErrorAction SilentlyContinue
  }
} catch {
  Write-Host ("ERROR " + $_.Exception.Message) -ForegroundColor Red
  $failures++
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}

if ($failures -gt 0) { Write-Host ""; Write-Host "$failures suite(s) failing" -ForegroundColor Red; exit 1 }
Write-Host ""; Write-Host "All suites passed" -ForegroundColor Green
exit 0
