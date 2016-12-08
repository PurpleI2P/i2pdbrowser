@echo off

echo Создаем 7z архив с набором...
REM На выходе получаем 7z архив, в котором будут лежать папки Firefox, I2Pd и StartI2PdBrowser.bat из папки src уровнем выше.
7z a -t7z -m0=lzma2 -mx=9 -aoa -mfb=273 -md=512m -ms=on I2PdBrowserPortable_1.1.7z ..\Firefox ..\I2Pd ..\src\StartI2PdBrowser.bat

echo Готово!
pause