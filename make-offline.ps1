param(
  [ValidateSet("x64", "x86")]
  [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$templateDir = Join-Path $root "deploy\offline"

if ($Arch -eq "x86") {
  $out = Join-Path $root "offline-package-x86"
  $nodeSrc = Join-Path $root "runtime-cache\node-v22.23.2-win-x86\node.exe"
} else {
  $out = Join-Path $root "offline-package"
  $nodeSrc = "C:\Users\Administrator\.ai-manager\runtimes\node\24.19.0\node.exe"
}

$nodeDir = Split-Path -Parent $nodeSrc
$npmCmd = Join-Path $nodeDir "npm.cmd"

$resolvedRoot = [System.IO.Path]::GetFullPath($root)
$resolvedOut = [System.IO.Path]::GetFullPath($out)
if (-not $resolvedOut.StartsWith($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar)) {
  throw "offline-package must stay inside project root: $resolvedOut"
}

if (-not (Test-Path $nodeSrc)) {
  throw "Local node.exe not found: $nodeSrc"
}
if (-not (Test-Path $npmCmd)) {
  throw "Local npm.cmd not found: $npmCmd"
}

Write-Host "Step 1/5: build offline frontend..."
Push-Location (Join-Path $root "web")
try {
  $env:VITE_NETDISK_URL = "auto"
  pnpm build --outDir dist-offline --emptyOutDir
}
finally {
  Pop-Location
  Remove-Item Env:VITE_NETDISK_URL -ErrorAction SilentlyContinue
}

Write-Host "Step 2/5: reset offline-package..."
if (Test-Path $out) {
  Remove-Item -LiteralPath $out -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $out "node") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out "web") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out "server") -Force | Out-Null

Write-Host "Step 3/5: copy frontend, backend and portable Node..."
Copy-Item -LiteralPath $nodeSrc -Destination (Join-Path $out "node\node.exe") -Force
Copy-Item -LiteralPath (Join-Path $root "web\dist-offline") -Destination (Join-Path $out "web\dist") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "server\src") -Destination (Join-Path $out "server\src") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "server\scripts") -Destination (Join-Path $out "server\scripts") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "server\package.json") -Destination (Join-Path $out "server\package.json") -Force
if (Test-Path (Join-Path $root "server\data")) {
  Copy-Item -LiteralPath (Join-Path $root "server\data") -Destination (Join-Path $out "server\data") -Recurse -Force
}

Write-Host "Step 4/5: install portable server dependencies..."
Push-Location (Join-Path $out "server")
try {
  & $npmCmd install --omit=dev --no-audit --no-fund --ignore-scripts
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

Write-Host "Step 5/5: copy launcher templates..."
Copy-Item -LiteralPath (Join-Path $templateDir "start-offline.bat") -Destination (Join-Path $out "start-offline.bat") -Force
Copy-Item -LiteralPath (Join-Path $templateDir "start-server.bat") -Destination (Join-Path $out "start-server.bat") -Force
Copy-Item -LiteralPath (Join-Path $templateDir "start-lan.bat") -Destination (Join-Path $out "start-lan.bat") -Force
Copy-Item -LiteralPath (Join-Path $templateDir "README.txt") -Destination (Join-Path $out "README.txt") -Force

Write-Host ""
Write-Host "Offline package created: $out"
Write-Host "Copy the whole offline-package folder to a USB drive."
