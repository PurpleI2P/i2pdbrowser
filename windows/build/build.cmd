@echo off

REM Copyright (c) 2013-2017, The PurpleI2P Project
REM This file is part of Purple i2pd project and licensed under BSD3
REM See full license text in LICENSE file at top of project tree

setlocal enableextensions

set CURL=%~dp0curl.exe
set FFversion=52.4.1
set I2Pdversion=2.15.0
call :GET_LOCALE
call :GET_PROXY
call :GET_ARCH

if "%locale%"=="Russian" (
	echo Сборка I2Pd Browser Portable
	echo Системная локаль: %locale%, архитектура: %xOS%
	echo.
	echo Загрузка установщика Firefox Portable ESR
) else (
	echo Building I2Pd Browser Portable
	echo System locale: %locale%, architecture: %xOS%
	echo.
	echo Downloading Firefox Portable ESR installer
)

"%CURL%" -L -f -# -O https://downloads.sourceforge.net/project/portableapps/Mozilla%%20Firefox%%2C%%20Portable%%20Ed./Mozilla%%20Firefox%%20ESR%%2C%%20Portable%%20Edition%%20%FFversion%/FirefoxPortableESR_%FFversion%_%locale%.paf.exe %$X%
if errorlevel 1 (
	echo ERROR:%ErrorLevel%
	pause
	exit
) else (echo OK!)

echo.
if "%locale%"=="Russian" (
	echo Распаковка установщика и удаление не нужных файлов
) else (
	echo Unpacking the installer and delete unnecessary files
)

7z x -y -o..\Firefox FirefoxPortableESR_%FFversion%_%locale%.paf.exe > nul
del /Q FirefoxPortableESR_%FFversion%_%locale%.paf.exe
rmdir /S /Q ..\Firefox\$PLUGINSDIR
rmdir /S /Q ..\Firefox\App\AppInfo
rmdir /S /Q ..\Firefox\App\Bin
rmdir /S /Q ..\Firefox\App\DefaultData\plugins
rmdir /S /Q ..\Firefox\App\DefaultData\settings
rmdir /S /Q ..\Firefox\Other
del /Q ..\Firefix\App\DefaultData\profile\*
del /Q ..\Firefox\App\readme.txt
del /Q ..\Firefox\help.html
rem if "xOS"=="x86" (
rem	rmdir /S /Q ..\Firefox\App\Firefox64
	rmdir /S /Q ..\Firefox\App\Firefox\dictionaries
	rmdir /S /Q ..\Firefox\App\Firefox\uninstall
	del /Q ..\Firefox\App\Firefox\browser\blocklist.xml
	del /Q ..\Firefox\App\Firefox\crashreporter.*
	del /Q ..\Firefox\App\Firefox\maintenanceservice*.*
	del /Q ..\Firefox\App\Firefox\update*.*
rem ) else (
rem	rmdir /S /Q ..\Firefox\App\Firefox
	rmdir /S /Q ..\Firefox\App\Firefox64\dictionaries
	rmdir /S /Q ..\Firefox\App\Firefox64\uninstall
	del /Q ..\Firefox\App\Firefox64\browser\blocklist.xml
	del /Q ..\Firefox\App\Firefox64\crashreporter.*
	del /Q ..\Firefox\App\Firefox64\maintenanceservice*.*
	del /Q ..\Firefox\App\Firefox64\update*.*
rem )

if "%locale%"=="Russian" (
	echo Отключение отчетов о падении
) else (
	echo Disabling crash reports
)
rem if "xOS"=="x86" (
	sed -i "s/Enabled=1/Enabled=0/g" ..\Firefox\App\Firefox\application.ini
	sed -i "s/ServerURL=.*/ServerURL=-/" ..\Firefox\App\Firefox\application.ini
rem ) else (
	sed -i "s/Enabled=1/Enabled=0/g" ..\Firefox\App\Firefox64\application.ini
	sed -i "s/ServerURL=.*/ServerURL=-/" ..\Firefox\App\Firefox64\application.ini
rem )

if "%locale%"=="Russian" (
	echo Загрузка дополнения NoScript
) else (
	echo Downloading NoScript extension
)

"%CURL%" -L -f -# -O https://addons.mozilla.org/firefox/downloads/latest/noscript/addon-722-latest.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
copy /Y addon-722-latest.xpi ..\Firefox\App\Firefox\browser\extensions\{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi > nul
copy /Y addon-722-latest.xpi ..\Firefox\App\Firefox64\browser\extensions\{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi > nul
del /Q addon-722-latest.xpi

echo.
if "%locale%"=="Russian" (
	echo Копирование файлов настроек в папку Firefox
) else (
	echo Copying Firefox settings
)
copy /Y profile\* ..\Firefox\App\DefaultData\profile\ > nul
copy /Y settings\FirefoxPortable.ini ..\Firefox\ > nul

mkdir ..\Firefox\App\Firefox\browser\defaults\preferences\ > nul
mkdir ..\Firefox\App\Firefox64\browser\defaults\preferences\ > nul
copy /Y preferences\* ..\Firefox\App\Firefox\browser\defaults\preferences\ > nul
copy /Y preferences\* ..\Firefox\App\Firefox64\browser\defaults\preferences\ > nul

if "%locale%"=="Russian" (
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
if "%locale%"=="Russian" (
	echo I2Pd Browser portable готов к запуску!
) else (
	echo I2Pd Browser portable is ready to start!
)
pause
exit

:GET_LOCALE
for /f "tokens=3" %%a in ('reg query "HKEY_USERS\.DEFAULT\Keyboard Layout\Preload"^|find "REG_SZ"') do (
	if %%a==00000419 (set locale=Russian) else (set locale=Russian)
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