@ECHO OFF
REM BFCPEOPTIONSTART
REM Advanced BAT to EXE Converter www.BatToExeConverter.com
REM BFCPEEXE=StartI2PdBrowser.exe
REM BFCPEICON=i2pd_browser_icon_v3.ico
REM BFCPEICONINDEX=-1
REM BFCPEEMBEDDISPLAY=0
REM BFCPEEMBEDDELETE=1
REM BFCPEADMINEXE=0
REM BFCPEINVISEXE=0
REM BFCPEVERINCLUDE=1
REM BFCPEVERVERSION=1.2.1.0
REM BFCPEVERPRODUCT=I2Pd Browser Portable
REM BFCPEVERDESC=I2Pd Browser
REM BFCPEVERCOMPANY=PurpleI2P
REM BFCPEVERCOPYRIGHT=Copyright © 2013-2017 PurpleI2P Project
REM BFCPEOPTIONEND

REM Copyright (c) 2013-2017, The PurpleI2P Project
REM This file is part of Purple i2pd project and licensed under BSD3
REM See full license text in LICENSE file at top of project tree

title Starting I2Pd Browser
set $pause=ping.exe 0.0.0.0 -n
ver| find "6." >nul && set $pause=timeout.exe /t

set fire=firefox.exe
set port=FirefoxPortable.exe
set i2pd=i2pd.exe

taskList|find /i "%port%">nul&&(taskkill /im "%port%" /t>nul)&&(%$pause% 2 >nul)
REM taskList|find /i "%fire%">nul&&(taskkill /im "%fire%" >nul)
taskList|find /i "%i2pd%">nul&&(goto runfox)||(goto starti2p)

:starti2p

start "" "I2Pd/%i2pd%"

echo i2pd Browser starting
echo Please wait
echo -------------------------------------
for /L %%B in (0,1,35) do (call :EchoWithoutCrLf "." && %$pause% 2 >nul)
echo .
echo -------------------------------------
echo Welcome to I2P Network

:runfox

start "" "FireFox/%port%"

exit /b 0


rem ==========================================================================

rem ==========================================================================
rem Процедура EchoWithoutCrLf
rem 
rem %1 : текст для вывода.
rem ==========================================================================
:EchoWithoutCrLf
    
    <nul set /p strTemp=%~1
    exit /b 0
rem ==========================================================================