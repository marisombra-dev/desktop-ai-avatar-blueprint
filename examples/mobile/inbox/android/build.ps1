$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!$env:ANDROID_HOME -or !$env:JAVA_HOME) { throw 'Set ANDROID_HOME and JAVA_HOME first' }
if (!$env:COMPANION_SIGNING_KEY -or !(Test-Path $env:COMPANION_SIGNING_KEY)) { throw 'Set COMPANION_SIGNING_KEY to a private existing keystore outside the repository' }
if (!$env:COMPANION_SIGNING_ALIAS) { throw 'Set COMPANION_SIGNING_ALIAS' }
if ((Get-Content MainActivity.java -Raw).Contains('YOUR_PRIVATE_HOST.example')) { throw 'Configure private HTTPS host in MainActivity.java first' }
$bt = Join-Path $env:ANDROID_HOME 'build-tools\34.0.0'
$jar = Join-Path $env:ANDROID_HOME 'platforms\android-34\android.jar'
$jdk = Join-Path $env:JAVA_HOME 'bin'
function check { if ($LASTEXITCODE -ne 0) { throw "Build failed: $LASTEXITCODE" } }
$work = Join-Path ([IO.Path]::GetTempPath()) ('companion-inbox-' + [guid]::NewGuid())
New-Item -ItemType Directory -Force "$work\classes","$work\dex" | Out-Null
try {
 & "$bt\aapt2.exe" link -I $jar --manifest AndroidManifest.xml -o "$work\base.apk"; check
 & "$jdk\javac.exe" -encoding UTF-8 -source 8 -target 8 -classpath $jar -d "$work\classes" MainActivity.java; check
 $classes = @(Get-ChildItem "$work\classes" -Recurse -Filter *.class | ForEach-Object FullName)
 & "$bt\d8.bat" --lib $jar --min-api 26 --output "$work\dex" @classes; check
 Copy-Item "$work\base.apk" "$work\unsigned.apk"
 Push-Location "$work\dex"
 try { & "$jdk\jar.exe" uf "$work\unsigned.apk" classes.dex; check } finally { Pop-Location }
 & "$bt\zipalign.exe" -f 4 "$work\unsigned.apk" "$work\aligned.apk"; check
 # apksigner prompts for private key passwords; never commit or print them.
 & "$bt\apksigner.bat" sign --ks $env:COMPANION_SIGNING_KEY --ks-key-alias $env:COMPANION_SIGNING_ALIAS --out Companion-Inbox.apk "$work\aligned.apk"; check
 & "$bt\apksigner.bat" verify --verbose Companion-Inbox.apk; check
} finally { Remove-Item $work -Recurse -Force }
