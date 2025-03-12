# Create necessary directories
$null = New-Item -ItemType Directory -Force -Path downloads
$null = New-Item -ItemType Directory -Force -Path assets/windows

# Get the current ExifTool version
Write-Host "Fetching current ExifTool version..."
$VERSION = (Invoke-WebRequest -Uri "https://exiftool.org/ver.txt" -UseBasicParsing).Content.Trim()
if (-not $VERSION) {
    Write-Host "Failed to retrieve version information"
    exit 1
}
Write-Host "Current ExifTool version: $VERSION"

# Download the 64-bit zip version (WINDOWS)
$WINDOWS_URL = "https://exiftool.org/exiftool-${VERSION}_64.zip"
$WINDOWS_FILE = "downloads/exiftool-${VERSION}_64.zip"
Write-Host "Downloading WINDOWS version from $WINDOWS_URL..."
try {
    Invoke-WebRequest -Uri $WINDOWS_URL -OutFile $WINDOWS_FILE -UseBasicParsing
    Write-Host "Successfully downloaded WINDOWS version to $WINDOWS_FILE"
} catch {
    Write-Host "Failed to download WINDOWS version from $WINDOWS_URL"
    exit 1
}

# Verify the file exists and has non-zero size before extraction
if (-not (Test-Path $WINDOWS_FILE) -or (Get-Item $WINDOWS_FILE).Length -eq 0) {
    Write-Host "WINDOWS file is empty or does not exist"
    exit 1
}

# Extract the WINDOWS (zip) version to assets/windows with suppressed output
Write-Host "Extracting WINDOWS version to assets/windows..."
try {
		Expand-Archive -Path $WINDOWS_FILE -DestinationPath assets/windows -Force
		# Move the contents of the extracted folder to the destination path
		$extractedFolder = Get-ChildItem -Path assets/windows | Where-Object { $_.PSIsContainer } | Select-Object -First 1
		if ($extractedFolder) {
			Move-Item -Path "$($extractedFolder.FullName)\*" -Destination "assets/windows" -Force
			Remove-Item -Path $extractedFolder.FullName -Recurse -Force
		}
    Write-Host "Successfully extracted WINDOWS version to assets/windows"
} catch {
    Write-Host "Failed to extract WINDOWS version"
    exit 1
}

# Rename exiftool(-k).exe to exiftool.exe
Write-Host "Renaming exiftool(-k).exe to exiftool.exe..."
try {
    Rename-Item -Path "assets/windows/exiftool(-k).exe" -NewName "exiftool.exe" -Force
    Write-Host "Successfully renamed exiftool(-k).exe to exiftool.exe"
} catch {
    Write-Host "Failed to rename exiftool(-k).exe to exiftool.exe"
    exit 1
}

Write-Host "WINDOWS download and extraction completed successfully!"
