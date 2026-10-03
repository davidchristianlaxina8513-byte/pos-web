#Requires -Version 5.1
# Start-Demo: one-click startup for the consultation demo.
# Starts the production web server (port 3000) + a fresh Cloudflare Quick
# Tunnel, verifies both, and prints the links. Safe to re-run: it reuses
# anything already running and replaces a dead/expired tunnel.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$tempDir = Join-Path $env:LOCALAPPDATA 'Temp\opencode'
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$serverLog = Join-Path $tempDir 'web-prod.log'
$tunnelLog = Join-Path $tempDir 'cf-tunnel2.log'
$cloudflared = Join-Path $tempDir 'cloudflared.exe'

function Test-PortOpen($port) {
  return $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Wait-HttpOk($url, $retries) {
  for ($i = 1; $i -le $retries; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
      if ($r.StatusCode -eq 200) { return $r.Content.Length }
    } catch { Start-Sleep -Seconds 2 }
  }
  throw "GET $url never returned 200"
}

# 1) Production server (serves the last `npm run build` in web/).
if (-not (Test-PortOpen 3000)) {
  Write-Host '[demo] starting production server on :3000 ...'
  Start-Process -FilePath 'cmd.exe' -ArgumentList "/c npm run start -- --port 3000 > `"$serverLog`" 2>&1" -WorkingDirectory (Join-Path $repoRoot 'web')
} else {
  Write-Host '[demo] port 3000 already serving, reusing it.'
}
$len = Wait-HttpOk 'http://localhost:3000/login' 15
Write-Host "[demo] local server OK (login page, $len bytes)."

# 2) Fresh public tunnel (old Quick Tunnel URLs expire — always mint one).
# NOTE: cloudflared is launched directly (not via cmd) so output redirection
# is handled by Start-Process itself — cmd quoting breaks the log file.
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Remove-Item -LiteralPath $tunnelLog -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$tunnelLog.err" -Force -ErrorAction SilentlyContinue
Start-Process -FilePath $cloudflared -ArgumentList 'tunnel', '--url', 'http://localhost:3000' -RedirectStandardOutput $tunnelLog -RedirectStandardError "$tunnelLog.err" -WorkingDirectory $repoRoot
$url = $null
for ($i = 1; $i -le 12; $i++) {
  Start-Sleep -Seconds 3
  $hits = @()
  if (Test-Path -LiteralPath $tunnelLog) { $hits += Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath "$tunnelLog.err") { $hits += Select-String -Path "$tunnelLog.err" -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue }
  $hit = $hits | Where-Object { $_.Line -notmatch '_next/|ERR' } | Select-Object -Last 1
  if ($hit) { $url = ([regex]::Match($hit.Line, 'https://[a-z0-9-]+\.trycloudflare\.com')).Value; if ($url) { break } }
}
if (-not $url) { throw 'Tunnel URL not found — see ' + $tunnelLog }

# 3) Verify the public link end to end (DNS can lag the URL print by seconds).
$hostName = ([uri]$url).Host
$resolved = $false
for ($i = 1; $i -le 10; $i++) {
  try {
    Resolve-DnsName -Name $hostName -ErrorAction Stop | Out-Null
    $resolved = $true
    break
  } catch { Start-Sleep -Seconds 3 }
}
if (-not $resolved) { throw "DNS never resolved for $hostName" }
$tLen = Wait-HttpOk "$url/login" 15
Write-Host "[demo] public tunnel OK ($tLen bytes)."

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1 -ExpandProperty IPAddress)
Write-Host ''
Write-Host '================ DEMO LINKS ================'
Write-Host "Phone (any network):  $url"
if ($lanIp) { Write-Host "Phone (same Wi-Fi):     http://${lanIp}:3000" }
Write-Host 'Laptop:                 http://localhost:3000'
Write-Host '============================================'
Write-Host 'Logins: admin@elvira.cafe / admin123  |  cashier@elvira.cafe / cashier123'
