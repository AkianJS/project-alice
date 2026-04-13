$ErrorActionPreference = "Stop"

$Repo = "AkianJS/project-alice"
$AppName = "Project Alice"

function Write-Info($msg)  { Write-Host "[info] " -ForegroundColor Cyan -NoNewline; Write-Host $msg }
function Write-Ok($msg)    { Write-Host "[ok] " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Write-Fail($msg)  { Write-Host "[error] " -ForegroundColor Red -NoNewline; Write-Host $msg; exit 1 }

Write-Host ""
Write-Host "  Project Alice Installer" -ForegroundColor Cyan
Write-Host ""

# Fetch latest release
Write-Info "Fetching latest release..."
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ "User-Agent" = "project-alice-installer" }
} catch {
    Write-Fail "Could not fetch release info. Check your internet connection."
}

$tag = $release.tag_name
Write-Info "Latest version: $tag"

# Find MSI or NSIS installer
$msiAsset = $release.assets | Where-Object { $_.name -like "*.msi" } | Select-Object -First 1
$exeAsset = $release.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1

if ($msiAsset) {
    $asset = $msiAsset
    $installType = "msi"
} elseif ($exeAsset) {
    $asset = $exeAsset
    $installType = "nsis"
} else {
    Write-Fail "No Windows installer found in release $tag."
}

$url = $asset.browser_download_url
$filename = $asset.name
$tmpDir = Join-Path $env:TEMP "project-alice-install"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$filePath = Join-Path $tmpDir $filename

Write-Info "Downloading $filename..."
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $url -OutFile $filePath -UseBasicParsing
} catch {
    Write-Fail "Download failed: $_"
}

Write-Ok "Downloaded $filename"

# Install
if ($installType -eq "msi") {
    Write-Info "Running MSI installer..."
    $process = Start-Process msiexec.exe -ArgumentList "/i `"$filePath`" /passive /norestart" -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        Write-Fail "MSI installation failed with exit code $($process.ExitCode)."
    }
} else {
    Write-Info "Running installer..."
    $process = Start-Process -FilePath $filePath -ArgumentList "/S" -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        Write-Fail "Installation failed with exit code $($process.ExitCode)."
    }
}

# Cleanup
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Ok "$AppName $tag installed successfully!"
Write-Host ""
