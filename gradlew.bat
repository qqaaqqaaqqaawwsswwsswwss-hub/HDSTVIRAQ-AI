@echo off
setlocal
set VERSION=8.14.8
set SHA256=94da89692fc3ca6d2d0ce6bb48548762ea0f1897ba444286f5c7f3759c7af651
if not defined GRADLE_USER_HOME set GRADLE_USER_HOME=%USERPROFILE%\.gradle
set CACHE=%GRADLE_USER_HOME%\mdr-bootstrap\gradle-%VERSION%
if not exist "%CACHE%\bin\gradle.bat" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $u='https://services.gradle.org/distributions/gradle-%VERSION%-bin.zip'; $z=Join-Path $env:TEMP 'mdr-gradle.zip'; Invoke-WebRequest $u -OutFile $z; if ((Get-FileHash $z -Algorithm SHA256).Hash.ToLower() -ne '%SHA256%') { throw 'Gradle SHA-256 mismatch' }; Expand-Archive -Force $z $env:TEMP; New-Item -ItemType Directory -Force '%GRADLE_USER_HOME%\mdr-bootstrap' | Out-Null; Move-Item -Force (Join-Path $env:TEMP 'gradle-%VERSION%') '%CACHE%'" || exit /b 1
)
call "%CACHE%\bin\gradle.bat" %*
