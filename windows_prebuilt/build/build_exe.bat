@echo off

REM Copyright (c) 2013-2022 The PurpleI2P Project
REM This file is part of Purple i2pd project and licensed under BSD3
REM See full license text in LICENSE file at top of project tree

echo ������� 7z ��娢 � ����஬...
REM �� ��室� ����砥� 7z ��娢, � ���஬ ���� ������ ����� Firefox, I2Pd, src � 䠩� StartI2PdBrowser.exe �஢��� ���.
7z a -t7z -m0=lzma2:d192m -mx=9 -aoa -mfb=273 -md=128m -ms=on -- I2PdBrowserPortable.7z ..\..\windows\Firefox ..\..\windows\i2pd ..\src\StartI2PdBrowser.bat ..\src\browser.ico

echo ������� 7z SFX - ᠬ��ᯠ���뢠�騩�� ��娢...
REM �� ��室� ����砥� ᠬ��ᯠ���뢠�騩�� ��娢, ��娢 ��᫥ �⮣� 㤠�塞.
copy /b 7zsd_LZMA2_i2pdbrowser_1.3.1.sfx + config.txt + I2PdBrowserPortable.7z I2PdBrowserPortable_1.3.1.exe >> nul
del I2PdBrowserPortable.7z >> nul

echo ��⮢�!
pause