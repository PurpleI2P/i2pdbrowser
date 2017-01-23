@echo off
setlocal enableextensions

set CURL=%~dp0curl.exe
call :GET_LOCALE
call :GET_PROXY
call :GET_ARCH

echo Сборка I2Pd Browser Portable
echo Системная локаль: %locale%, архитектура: %xOS%
echo.
echo Загрузка установщика Firefox Portable ESR

"%CURL%" -L -f -# -O https://downloads.sourceforge.net/project/portableapps/Mozilla%%20Firefox%%2C%%20Portable%%20Ed./Mozilla%%20Firefox%%20ESR%%2C%%20Portable%%20Edition%%2045.6.0/FirefoxPortableESR_45.6.0_%locale%.paf.exe %$X%
if errorlevel 1 (echo ERROR:%ErrorLevel%) else (echo OK!)

echo.
echo Распаковка установщика и удаление не нужных файлов

7z x -y -o..\Firefox FirefoxPortableESR_45.6.0_%locale%.paf.exe > nul
del /Q FirefoxPortableESR_45.6.0_%locale%.paf.exe
rmdir /S /Q ..\Firefox\$PLUGINSDIR
rmdir /S /Q ..\Firefox\App\AppInfo
rmdir /S /Q ..\Firefox\App\Bin
rmdir /S /Q ..\Firefox\App\DefaultData\plugins
rmdir /S /Q ..\Firefox\Other
del /Q ..\Firefox\App\readme.txt
del /Q ..\Firefox\help.html
rem if "xOS"=="x86" (
rem rmdir /S /Q ..\Firefox\App\Firefox64
	rmdir /S /Q ..\Firefox\App\Firefox\dictionaries
	rmdir /S /Q ..\Firefox\App\Firefox\uninstall
	del /Q ..\Firefox\App\Firefox\browser\blocklist.xml
	del /Q ..\Firefox\App\Firefox\crashreporter.*
	del /Q ..\Firefox\App\Firefox\maintenanceservice*.*
	del /Q ..\Firefox\App\Firefox\update*.*
rem ) else (
rem rmdir /S /Q ..\Firefox\App\Firefox
	rmdir /S /Q ..\Firefox\App\Firefox64\dictionaries
	rmdir /S /Q ..\Firefox\App\Firefox64\uninstall
	del /Q ..\Firefox\App\Firefox64\browser\blocklist.xml
	del /Q ..\Firefox\App\Firefox64\crashreporter.*
	del /Q ..\Firefox\App\Firefox64\maintenanceservice*.*
	del /Q ..\Firefox\App\Firefox64\update*.*
rem )

echo Загрузка дополнения NoScript

"%CURL%" -L -f -# -O https://addons.mozilla.org/firefox/downloads/latest/noscript/addon-722-latest.xpi
if errorlevel 1 (echo ERROR:%ErrorLevel%) else (echo OK!)
if "xOS"=="x86" (
	move /Y addon-722-latest.xpi ..\Firefox\App\Firefox\browser\extensions\{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi > nul
) else (
	move /Y addon-722-latest.xpi ..\Firefox\App\Firefox64\browser\extensions\{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi > nul
)

echo Копирование файлов настроек в папку Firefox
copy /Y profile\* ..\Firefox\App\DefaultData\profile\ > nul
copy /Y settings\FirefoxPortable.ini ..\Firefox\ > nul

echo Загрузка I2Pd
if "xOS"=="x86" (
	"%CURL%" -L -f -# -O https://github.com/PurpleI2P/i2pd/releases/download/2.11.0/i2pd_2.11.0_win32_mingw.zip
	if errorlevel 1 (echo ERROR:%ErrorLevel%) else (echo OK!)
	7z x -y -o..\i2pd i2pd_2.11.0_win32_mingw.zip > nul
	del /Q i2pd_2.11.0_win32_mingw.zip
) else (
	"%CURL%" -L -f -# -O https://github.com/PurpleI2P/i2pd/releases/download/2.11.0/i2pd_2.11.0_win64_mingw.zip
	if errorlevel 1 (echo ERROR:%ErrorLevel%) else (echo OK!)
	7z x -y -o..\i2pd i2pd_2.11.0_win64_mingw.zip > nul
	del /Q i2pd_2.11.0_win64_mingw.zip
)
xcopy /E /I /Y i2pd ..\i2pd > nul

echo I2Pd Browser portable готов к запуску!
pause
exit

:GET_LOCALE
for /f "tokens=3" %%a in ('reg query "HKEY_USERS\.DEFAULT\Keyboard Layout\Preload"^|find "REG_SZ"') do (
 if %%a==00000419 (set locale=Russian) else (set locale=English)
 goto :eof
)
goto :eof

:GET_PROXY
 set $X=&set $R=HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings
 for /F "Tokens=1,3" %%i in ('reg query "%$R%"^|find "Proxy"') do set %%i=%%j
 if %ProxyEnable%==0x1 set $X=-x %ProxyServer%
goto :eof

:GET_ARCH
set xOS=x86
if defined PROCESSOR_ARCHITEW6432 (set xOS=x64) else if "%PROCESSOR_ARCHITECTURE%"=="AMD64" set xOS=x64
goto :eof

:eof