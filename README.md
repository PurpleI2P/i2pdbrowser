# i2pdbrowser

*Note: repository was force-pushed to remove bundled Firefox and big binaries from repository archive. Clone repository again to fetch new commit tree.*

-----

This is a collection of scripts that will download the recent Firefox ESR release and configure it to connect over I2P, using i2pd.
Since 1.2.6 pre-built version for Windows is excluded from repository, but releases will contain it.

## How to use it on Linux

1. Build preconfigured FireFox using script `build.sh` from `build` folder
2. Run i2pd by executing `./i2pd` from `i2pd` folder
3. Run FireFox by executing `./firefox-portable`

### Release signing
Release hashsums signed with key [66f6c87b98ebcfe2](http://keyserver.ubuntu.com/pks/lookup?op=vindex&search=0x66F6C87B98EBCFE2)
