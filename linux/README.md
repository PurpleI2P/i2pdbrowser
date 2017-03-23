I2Pd Browser Portable builder for Linux
=====
This is script-based builder of I2Pd Browser Portable

What works now
-----
* Auto detecting system language
* Auto detecting architecture
* Pre-configuring FireFox to use with I2Pd
* Auto downloading NoScript extension

How to use
-----
1. Build preconfigured FireFox using script `build.sh` from `build` folder
2. Run i2pd by executing `./i2pd` from `i2pd` folder
3. Run FireFox by executing `./firefox-portable`

Additional info
-----
`./i2pd` from `i2pd` folder starts screen session with i2pd in it.
To stop i2pd router you can use command `Start graceful shutdown` of `Force shutdown`
from i2pd webconsole page `http://127.0.0.1:7070/?page=commands`

SHA512SUMS created with `find * -type f -print0 | xargs -0 -i sha512sum {}` command
