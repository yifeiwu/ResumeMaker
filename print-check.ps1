<#
.SYNOPSIS
  Verifies the real print path: preview pagination vs actual print-to-PDF output.

.DESCRIPTION
  Starts a temporary static server, loads /print-probe.html?tpl=<ats|modern|sidebar>
  in headless Edge (or Chrome) at desktop width, prints each to PDF, and checks the
  PDFs with print-verify.py (needs the `pypdf` python package).

  Two headless traps this script works around — do not "simplify" them away:
  - `--virtual-time-budget` combined with `--print-to-pdf` silently produces no file,
    so printing runs WITHOUT a time budget (the fixture content is synchronous).
  - The default 800px viewport trips the mobile CSS that hides the preview pane,
    which also blinds the overflow guard — so both runs use --window-size=1400,1000.

.EXAMPLE
  .\print-check.ps1
  .\print-check.ps1 -Port 8486
#>
[CmdletBinding()]
param(
  [int]$Port = 8486,
  [string]$EdgePath = ""
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

$browser = Find-Browser -Explicit $EdgePath
if (-not $browser) {
  Write-Warning "No Edge/Chrome found - skipping print checks."
  exit 2
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
if (-not $python) { throw "python not found - needed to serve the folder and verify PDFs" }
& $python.Source -c "import pypdf" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Warning "python package 'pypdf' not installed (pip install pypdf) - skipping print checks."
  exit 2
}

$work = Join-Path $env:TEMP ("resume-print-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force -Path $work | Out-Null
$profile = Join-Path $env:TEMP ("resume-print-prof-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$server = $null
try {
  $server = Start-Process -FilePath $python.Source -ArgumentList "-m", "http.server", "$Port" `
    -WorkingDirectory $root -WindowStyle Hidden -PassThru
  $base = "http://localhost:$Port"
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    try { if ((Invoke-WebRequest -Uri "$base/print-probe.html" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { $ready = $true; break } } catch { }
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) { throw "static server did not come up on port $Port" }

  foreach ($t in @("ats", "modern", "sidebar")) {
    # a FRESH profile per invocation: reusing one across headless runs intermittently
    # yields empty output (stale Singleton lock), for both dump-dom and print-to-pdf
    $profA = Join-Path $env:TEMP ("resume-print-a-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
    $domOut = Join-Path $work "$t.dom.html"
    # preview DOM (settled layout for the self-calibrating page count)
    & $browser --headless=new --disable-gpu --no-first-run --no-default-browser-check `
      --user-data-dir="$profA" --window-size=1400,1000 --virtual-time-budget=8000 `
      --dump-dom "$base/print-probe.html?tpl=$t" 2>$null | Out-File -Encoding utf8 $domOut
    Remove-Item -LiteralPath $profA -Recurse -Force -ErrorAction SilentlyContinue
    $profB = Join-Path $env:TEMP ("resume-print-b-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
    $pdfOut = Join-Path $work "$t.pdf"
    # real print path: no virtual-time-budget (see trap note above). Retry: a headless run
    # occasionally exits without writing (e.g. singleton contention with a running
    # interactive browser), so attempt until the file exists instead of failing blind.
    $pdfOk = $false
    for ($a = 0; $a -lt 3 -and -not $pdfOk; $a++) {
      if ($a -gt 0) { Start-Sleep -Seconds 2 }
      & $browser --headless=new --disable-gpu --no-first-run --no-default-browser-check `
        --user-data-dir="$profB" --window-size=1400,1000 `
        --print-to-pdf="$pdfOut" --no-pdf-header-footer "$base/print-probe.html?tpl=$t" 2>$null
      $pdfOk = (Test-Path -LiteralPath $pdfOut) -and ((Get-Item $pdfOut).Length -gt 0)
    }
    Remove-Item -LiteralPath $profB -Recurse -Force -ErrorAction SilentlyContinue
  }
  & $python.Source (Join-Path $root "print-verify.py") $work
  if ($LASTEXITCODE -ne 0) { $failures++ }
} catch {
  Write-Host ("ERROR " + $_.Exception.Message) -ForegroundColor Red
  $failures++
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $profile -Recurse -Force -ErrorAction SilentlyContinue
}

if ($failures -gt 0) { Write-Host ""; Write-Host "print checks failing" -ForegroundColor Red; exit 1 }
Write-Host ""; Write-Host "All print checks passed" -ForegroundColor Green
exit 0
