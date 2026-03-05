# Windows-friendly build script for Open Hivemind
$ErrorActionPreference = 'Stop'

$ROOT_DIR = Get-Location
Write-Host "[build] Starting full build in $ROOT_DIR"

# 1. Build Backend
Write-Host "[build:backend] Running TypeScript compilation..."
# Set memory limit if not already set
if (-not $env:NODE_OPTIONS) {
    $env:NODE_OPTIONS = "--max-old-space-size=2048"
}

# Run tsc via node
& node node_modules/typescript/bin/tsc --noEmitOnError false --skipLibCheck
if ($LASTEXITCODE -ne 0) {
    Write-Warning "TypeScript compilation had warnings/errors, but proceeding as per bash script logic..."
}
Write-Host "[build:backend] Finished backend build"

# 2. Build Frontend
$SKIP_FRONTEND = $env:SKIP_FRONTEND_BUILD -eq 'true'
$LOW_MEM = $env:LOW_MEMORY_MODE -eq 'true'
$FORCE_FRONTEND = $env:FORCE_FRONTEND_BUILD -eq 'true'

if ($SKIP_FRONTEND) {
    Write-Host "[build] SKIP_FRONTEND_BUILD=true, skipping frontend bundle"
    exit 0
}

if ($LOW_MEM -and -not $FORCE_FRONTEND) {
    Write-Host "[build] LOW_MEMORY_MODE=true and FORCE_FRONTEND_BUILD!=true, skipping frontend bundle"
    exit 0
}

Write-Host "[build:frontend] Building Vite application..."
Push-Location src/client
& npx vite build
Pop-Location

Write-Host "[build] Build complete!"
