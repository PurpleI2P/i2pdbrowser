@echo off

echo Создаем 7z архив с набором...
REM На выходе получаем 7z архив, в котором будут лежать папки Firefox, I2Pd, src и файл StartI2PdBrowser.exe уровнем выше.
7z a -t7z -m0=lzma2 -mx=9 -aoa -mfb=273 -md=512m -ms=on I2PdBrowserPortable.7z ..\Firefox ..\I2Pd ..\src ..\StartI2PdBrowser.exe

echo Создаем 7z SFX - самораспаковывающийся архив...
REM На выходе получаем самораспаковывающийся архив, архив после этого удаляем.
copy /b 7zsd_LZMA2_i2pdbrowser_1.1.1.sfx + config.txt + I2PdBrowserPortable.7z I2PdBrowserPortable_1.1.1.exe >> nul
del I2PdBrowserPortable.7z >> nul

echo Готово!
pause