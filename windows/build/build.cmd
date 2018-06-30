@echo off

REM Copyright (c) 2013-2018, The PurpleI2P Project
REM This file is part of Purple i2pd project and licensed under BSD3
REM See full license text in LICENSE file at top of project tree

setlocal enableextensions

set CURL=%~dp0curl.exe
set FFversion=60.1.0
set I2Pdversion=2.19.0
call :GET_LOCALE
call :GET_PROXY
call :GET_ARCH

if "%locale%"=="ru" (
	echo Сборка I2Pd Browser Portable
	echo Язык браузера: %locale%, архитектура: %xOS%
	echo.
	echo Загрузка установщика Firefox ESR
) else (
	echo Building I2Pd Browser Portable
	echo Browser locale: %locale%, architecture: %xOS%
	echo.
	echo Downloading Firefox ESR installer
)

"%CURL%" -L -f -# -o firefox.exe https://ftp.mozilla.org/pub/firefox/releases/%FFversion%esr/%xOS%/%locale%/Firefox%%20Setup%%20%FFversion%esr.exe %$X%
if errorlevel 1 (
	echo ERROR:%ErrorLevel%
	pause
	exit
) else (echo OK!)

echo.
if "%locale%"=="ru" (
	echo Распаковка установщика и удаление не нужных файлов
) else (
	echo Unpacking the installer and deleting unnecessary files
)

7z x -y -o..\Firefox\App firefox.exe > nul
del /Q firefox.exe
ren ..\Firefox\App\core Firefox
del /Q ..\Firefox\App\setup.exe
rmdir /S /Q ..\Firefox\App\Firefox\dictionaries
rmdir /S /Q ..\Firefox\App\Firefox\uninstall
del /Q ..\Firefox\App\Firefox\browser\blocklist.xml
del /Q ..\Firefox\App\Firefox\browser\crashreporter-override.ini
del /Q ..\Firefox\App\Firefox\crashreporter.*
del /Q ..\Firefox\App\Firefox\maintenanceservice*.*
del /Q ..\Firefox\App\Firefox\update*.*

if "%locale%"=="ru" (
	echo Отключение отчетов о падении
) else (
	echo Disabling crash reports
)
sed -i "s/Enabled=1/Enabled=0/g" ..\Firefox\App\Firefox\application.ini
sed -i "s/ServerURL=.*/ServerURL=-/" ..\Firefox\App\Firefox\application.ini

if "%locale%"=="ru" (
	echo Загрузка языковых пакетов
) else (
	echo Downloading language packs
)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\langpack-ru@firefox.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/978562/russian_ru_language_pack-60.0buildid20180605171542-an+fx.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\langpack-en-US@firefox.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/978493/english_us_language_pack-60.0buildid20180605171542-an+fx.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)

echo.
if "%locale%"=="ru" (
	echo Загрузка дополнения NoScript
) else (
	echo Downloading NoScript extension
)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi https://addons.mozilla.org/firefox/downloads/file/972162/noscript_security_suite-10.1.8.2-an+fx.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)

echo.
if "%locale%"=="ru" (
	echo Копирование файлов настроек в папку Firefox
) else (
	echo Copying Firefox launcher and settings
)
mkdir ..\Firefox\App\DefaultData\profile\ > nul
copy /Y profile\* ..\Firefox\App\DefaultData\profile\ > nul
copy /Y firefox-portable\* ..\Firefox\ > nul
xcopy /E /Y preferences\* ..\Firefox\App\Firefox\ > nul

if "%locale%"=="ru" (
	echo Загрузка I2Pd
) else (
	echo Downloading I2Pd
)
if "xOS"=="x86" (
	"%CURL%" -L -f -# -O https://github.com/PurpleI2P/i2pd/releases/download/%I2Pdversion%/i2pd_%I2Pdversion%_win32_mingw.zip
	if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
	7z x -y -o..\i2pd i2pd_%I2Pdversion%_win32_mingw.zip i2pd.exe > nul
	del /Q i2pd_%I2Pdversion%_win32_mingw.zip
) else (
	"%CURL%" -L -f -# -O https://github.com/PurpleI2P/i2pd/releases/download/%I2Pdversion%/i2pd_%I2Pdversion%_win64_mingw.zip
	if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
	7z x -y -o..\i2pd i2pd_%I2Pdversion%_win64_mingw.zip i2pd.exe > nul
	del /Q i2pd_%I2Pdversion%_win64_mingw.zip
)
xcopy /E /I /Y i2pd ..\i2pd > nul

echo.
if "%locale%"=="ru" (
	echo I2Pd Browser Portable готов к запуску!
) else (
	echo I2Pd Browser Portable is ready to start!
)
pause
exit

:GET_LOCALE
for /f "tokens=3" %%a in ('reg query "HKEY_USERS\.DEFAULT\Keyboard Layout\Preload"^|find "REG_SZ"') do (
	if %%a==00000419 (set locale=ru) else (set locale=en-US)
	goto :eof
)
goto :eof

:GET_PROXY
set $X=&set $R=HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings
for /F "Tokens=1,3" %%i in ('reg query "%$R%"^|find "Proxy"') do set %%i=%%j
if %ProxyEnable%==0x1 set $X=-x %ProxyServer%
goto :eof

:GET_ARCH
set xOS=win32
if defined PROCESSOR_ARCHITEW6432 (set xOS=x64) else if "%PROCESSOR_ARCHITECTURE%" neq "x86" (set xOS=win64)
goto :eof

:eof
