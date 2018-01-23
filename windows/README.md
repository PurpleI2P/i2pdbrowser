I2Pd Browser Portable builder for Windows
=====
This is a script-based builder of I2Pd Browser Portable

How to use
-----
1. Build pre-configured Firefox using script `build.cmd` from `build` folder
2. Run bundle by executing `StartI2PdBrowser.bat`

Links to software used for building i2pdbrowser
-----
* 7z: http://7-zip.org/
* Curl: https://winampplugins.co.uk/curl/
* CA Root Certificates: https://raw.githubusercontent.com/bagder/ca-bundle/master/ca-bundle.crt
* sed: http://unxutils.sourceforge.net/
* Firefox Portable launcher: https://portableapps.com/apps/internet/firefox-portable-esr

SHA512SUMS created with `find * -type f -print0 | xargs -0 -i sha512sum {}` command