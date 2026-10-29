// Post-build step: turns the packaged Electron app into "launcher + app" so a splash screen appears instantly.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'dist', 'OfflineCraft-win32-x64'), L = path.join(__dirname, '..', 'launcher');
if (!fs.existsSync(path.join(dir, 'OfflineCraft.exe'))) { console.error('Run the build first.'); process.exit(1); }
if (!fs.existsSync(path.join(dir, 'OfflineCraft-app.exe'))) fs.renameSync(path.join(dir, 'OfflineCraft.exe'), path.join(dir, 'OfflineCraft-app.exe'));
fs.copyFileSync(path.join(L, 'OfflineCraft-launcher.exe'), path.join(dir, 'OfflineCraft.exe'));
fs.copyFileSync(path.join(__dirname, 'icon.ico'), path.join(dir, 'icon.ico'));
const crlf = s => s.replace(/\r?\n/g, '\r\n');
fs.writeFileSync(path.join(dir, 'Start OfflineCraft.bat'), crlf(`@echo off
setlocal
cd /d "%~dp0"
if /i "%~1"=="run" goto :main
start "" /min cmd /c ""%~f0" run"
exit /b
:main
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -Force | Unblock-File" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){ $l=$s.CreateShortcut((Join-Path $d 'OfflineCraft.lnk')); $l.TargetPath='%~dp0OfflineCraft.exe'; $l.WorkingDirectory='%~dp0'; $l.IconLocation='%~dp0icon.ico'; $l.Save() }" >nul 2>&1
start "" "%~dp0OfflineCraft.exe"
exit /b
`));
fs.writeFileSync(path.join(dir, 'Troubleshoot - log startup.bat'), crlf(`@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -Force | Unblock-File" >nul 2>&1
start /wait "" OfflineCraft-app.exe --enable-logging=file --log-file="%~dp0startup-log.txt" --v=0
echo OfflineCraft exited with code %errorlevel%. Send me data\\launcher.log and startup-log.txt if something went wrong.
pause
`));
fs.writeFileSync(path.join(dir, 'README.txt'), crlf(`OFFLINECRAFT

1. Extract the whole zip (right-click > Extract All).
2. Double-click "Start OfflineCraft.bat" once (unblocks files, makes a desktop shortcut, starts the launcher).
3. Afterwards use the desktop shortcut.

If it restarts a few times on the first run, that is normal: it is testing which graphics mode your PC supports.
Data lives in the "data" folder. Logs: data\\launcher.log
Problems? Run "Troubleshoot - log startup.bat".
`));
console.log('Launcher + splash installed into', dir);
