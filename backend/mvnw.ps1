# Maven Wrapper PowerShell script
# Usage: .\mvnw.ps1 spring-boot:run

$MAVEN_VERSION = "3.9.6"
$MAVEN_DIR = "$PSScriptRoot\.mvn\maven-$MAVEN_VERSION"
$MAVEN_ZIP = "$PSScriptRoot\.mvn\apache-maven-$MAVEN_VERSION-bin.zip"
$DOWNLOAD_URL = "https://archive.apache.org/dist/maven/maven-3/$MAVEN_VERSION/binaries/apache-maven-$MAVEN_VERSION-bin.zip"

# Auto-detect Java 17
$JAVA_EXE = $null
$candidates = @(
    "C:\Program Files\Java\jdk-17.0.17",
    "C:\Program Files\Java\jdk-17.0.13",
    "C:\Program Files\Java\jdk-17",
    "C:\Program Files\Eclipse Adoptium\jdk-17.0.17+8",
    "C:\Program Files\Microsoft\jdk-17.0.10.7-hotspot"
)
# Also scan Program Files\Java for any jdk-17*
$scanned = Get-ChildItem "C:\Program Files\Java" -Filter "jdk-17*" -Directory -ErrorAction SilentlyContinue
$candidates += $scanned | ForEach-Object { $_.FullName }

foreach ($candidate in $candidates) {
    if (Test-Path "$candidate\bin\java.exe") {
        $JAVA_EXE = "$candidate\bin\java.exe"
        Write-Host "Using Java: $candidate" -ForegroundColor Cyan
        break
    }
}

if (-not $JAVA_EXE) {
    Write-Error "Java 17 not found. Set JAVA_HOME or install JDK 17."
    exit 1
}

# Download Maven if not present
if (-not (Test-Path "$MAVEN_DIR\bin\mvn.cmd")) {
    Write-Host "Downloading Apache Maven $MAVEN_VERSION..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path "$PSScriptRoot\.mvn" | Out-Null
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $MAVEN_ZIP -UseBasicParsing
    Write-Host "Extracting..." -ForegroundColor Cyan
    Expand-Archive -Path $MAVEN_ZIP -DestinationPath "$PSScriptRoot\.mvn" -Force
    Rename-Item -Path "$PSScriptRoot\.mvn\apache-maven-$MAVEN_VERSION" -NewName "maven-$MAVEN_VERSION" -Force
    Remove-Item $MAVEN_ZIP
    Write-Host "Maven $MAVEN_VERSION ready." -ForegroundColor Green
}

# Invoke Maven directly via java.exe — bypasses mvn.cmd batch file entirely
$classworlds = Get-ChildItem "$MAVEN_DIR\boot\plexus-classworlds-*.jar" | Select-Object -First 1
if (-not $classworlds) {
    Write-Error "Maven boot jar not found in $MAVEN_DIR\boot\"
    exit 1
}

& $JAVA_EXE `
    "-Dclassworlds.conf=$MAVEN_DIR\bin\m2.conf" `
    "-Dmaven.home=$MAVEN_DIR" `
    "-Dmaven.multiModuleProjectDirectory=$PSScriptRoot" `
    "-Dfile.encoding=UTF-8" `
    -cp $classworlds.FullName `
    "org.codehaus.plexus.classworlds.launcher.Launcher" `
    @args
