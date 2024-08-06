@echo off

REM Copyright (c) 2013-2024, The PurpleI2P Project
REM This file is part of Purple i2pd project and licensed under BSD3
REM See full license text in LICENSE file at top of project tree

setlocal enableextensions

set CURL=%~dp0curl.exe
set FFversion=115.13.0esr
set I2Pdversion=2.53.1
call :GET_LOCALE
call :GET_PROXY
call :GET_ARCH

if "%locale%"=="ru" (
	echo ���ઠ I2Pd Browser Portable
	echo ��� ��㧥�: %locale%, ���⥪���: %xOS%
	echo.
	echo ����㧪� ��⠭��騪� Firefox ESR
) else (
	echo Building I2Pd Browser Portable
	echo Browser locale: %locale%, architecture: %xOS%
	echo.
	echo Downloading Firefox ESR installer
)

"%CURL%" -L -f -# -o firefox.exe https://ftp.mozilla.org/pub/firefox/releases/%FFversion%/%xOS%/%locale%/Firefox%%20Setup%%20%FFversion%.exe %$X%
if errorlevel 1 (
	echo ERROR:%ErrorLevel%
	pause
	exit
) else (echo OK!)

echo.
if "%locale%"=="ru" (
	echo ��ᯠ����� ��⠭��騪� � 㤠����� �� �㦭�� 䠩���
) else (
	echo Unpacking the installer and deleting unnecessary files
)

7z x -y -o..\Firefox\App firefox.exe > nul
del /Q firefox.exe
ren ..\Firefox\App\core Firefox
del /Q ..\Firefox\App\setup.exe
del /Q ..\Firefox\App\Firefox\browser\crashreporter-override.ini
rmdir /S /Q ..\Firefox\App\Firefox\browser\features
rmdir /S /Q ..\Firefox\App\Firefox\gmp-clearkey
rmdir /S /Q ..\Firefox\App\Firefox\uninstall
del /Q ..\Firefox\App\Firefox\Accessible*.*
del /Q ..\Firefox\App\Firefox\application.ini
del /Q ..\Firefox\App\Firefox\crashreporter.*
del /Q ..\Firefox\App\Firefox\*.sig
del /Q ..\Firefox\App\Firefox\maintenanceservice*.*
del /Q ..\Firefox\App\Firefox\minidump-analyzer.exe
del /Q ..\Firefox\App\Firefox\precomplete
del /Q ..\Firefox\App\Firefox\removed-files
del /Q ..\Firefox\App\Firefox\ucrtbase.dll
del /Q ..\Firefox\App\Firefox\update*.*

mkdir ..\Firefox\App\Firefox\browser\extensions > nul
echo OK!

echo.
if "%locale%"=="ru" (
	echo ���稬 ����७��� 䠩�� ��㧥� ��� �⪫�祭�� ����稢�� ����ᮢ
) else (
	echo Patching browser internal files to disable annoying external requests
)

7z -bso0 -y x ..\Firefox\App\Firefox\omni.ja -o..\Firefox\App\tmp > nul 2>&1

REM Patching them
sed -i "s/https\:\/\/firefox\.settings\.services\.mozilla\.com\/v1/http\:\/\/127\.0\.0\.1/" ..\Firefox\App\tmp\modules\SearchUtils.sys.mjs
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo Patched 1/2)
sed -i "s/\"https\:\/\/firefox\.settings\.services\.mozilla\.com\/v1\",$/\"\",/" ..\Firefox\App\tmp\modules\AppConstants.sys.mjs
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo Patched 2/2)

REM Backing up old omni.ja
ren ..\Firefox\App\Firefox\omni.ja omni.ja.bak

REM Repacking patched files
7z a -mx0 -tzip ..\Firefox\App\Firefox\omni.ja -r ..\Firefox\App\tmp\* > nul

REM Removing temporary files
rmdir /S /Q ..\Firefox\App\tmp
del ..\Firefox\App\Firefox\omni.ja.bak
echo OK!

echo.
if "%locale%"=="ru" (
	echo ����㧪� �몮��� ����⮢
) else (
	echo Downloading language packs
)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\langpack-ru@firefox.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/4144376/russian_ru_language_pack-115.0.20230726.201356.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\ruspell-wiktionary@addons.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/4215701/2696307-1.77.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\langpack-en-US@firefox.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/4144407/english_us_language_pack-115.0.20230726.201356.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\en-US@dictionaries.addons.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/4175230/us_english_dictionary-115.0.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)

echo.
if "%locale%"=="ru" (
	echo ����㧪� ���������� NoScript
) else (
	echo Downloading NoScript extension
)
"%CURL%" -L -f -# -o ..\Firefox\App\Firefox\browser\extensions\{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi https://addons.mozilla.org/firefox/downloads/file/4206186/noscript-11.4.29.xpi
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)

echo.
if "%locale%"=="ru" (
	echo ����஢���� 䠩��� ����஥� � ����� Firefox
) else (
	echo Copying Firefox launcher and settings
)
mkdir ..\Firefox\App\DefaultData\profile\ > nul
xcopy /E /Y profile\* ..\Firefox\App\DefaultData\profile\ > nul
if "%locale%"=="ru" (
	copy /Y profile-ru\* ..\Firefox\App\DefaultData\profile\ > nul
) else (
	copy /Y profile-en\* ..\Firefox\App\DefaultData\profile\ > nul
)
copy /Y firefox-portable\* ..\Firefox\ > nul
xcopy /E /Y preferences\* ..\Firefox\App\Firefox\ > nul
echo OK!

echo.
if "%locale%"=="ru" (
	echo ����㧪� I2Pd
) else (
	echo Downloading I2Pd
)
"%CURL%" -L -f -# -O https://github.com/PurpleI2P/i2pd/releases/download/%I2Pdversion%/i2pd_%I2Pdversion%_%xOS%_mingw.zip
if errorlevel 1 ( echo ERROR:%ErrorLevel% && pause && exit ) else (echo OK!)
7z x -y -o..\i2pd i2pd_%I2Pdversion%_%xOS%_mingw.zip i2pd.exe > nul
del /Q i2pd_%I2Pdversion%_%xOS%_mingw.zip

xcopy /E /I /Y i2pd ..\i2pd > nul

echo.
if "%locale%"=="ru" (
	echo I2Pd Browser Portable ��⮢ � ������!
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
if defined PROCESSOR_ARCHITEW6432 (set xOS=win64) else if "%PROCESSOR_ARCHITECTURE%" neq "x86" (set xOS=win64)
goto :eof

:eof
