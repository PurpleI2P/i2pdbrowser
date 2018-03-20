#!/bin/sh

# Copyright (c) 2013-2018, The PurpleI2P Project
#
# This file is part of Purple I2P project and licensed under BSD3
#
# See full license text in LICENSE file at top of project tree

arch=$(uname -m)
language=$(echo $LANG | cut -c-5 | sed s/_/-/g)
version="52.7.2esr"
i2pdversion="2.18.0"

ftpmirror="https://ftp.mozilla.org/pub/firefox/releases/${version}"

curlfind=$(which curl)
if [ -z $curlfind ]; then
	echo "'cURL' does not seem to be installed. The script needs it!";
	exit 1;
fi

echo "This script is preparing Firefox $version for use with I2Pd"

file="Firefox\ ${version}.dmg"
filepath="mac/${language}/${file}"

echo "Downloading $application..."
curl -L -f -# -O ${ftpmirror}/${filepath}
if [ $? -ne 0 ]; then # Not found error, trying to cut language variable
	echo "[TRY 2] I'll try downloading Firefox with shorter language code";
	language=$(echo $language | cut -c-2)
	# re-create variable with cutted lang
	filepath="mac/$language/$file"
	curl -L -f -# -O ${ftpmirror}/${filepath}
	if [ $? -ne 0 ]; then # Not found error, trying to download english version
		echo "[TRY 3] I'll try downloading Firefox with the English language code";
		language="en_US"
		# re-create lang variable
		filepath="mac/$language/$file"
		curl -L -f -# -O ${ftpmirror}/${filepath}
		if [ $? -ne 0 ]; then # After that i can say only that user haven't internet connection
			echo "[Error] Can't download file. Check your internet connectivity."
			exit 1;
		fi
	fi
fi

if [ ! -f $file ]; then
	echo "[Error] Can't find downloaded file. Does it really exist?"
	exit 1;
fi

echo "Downloading checksum file and checking SHA512 checksum"
curl -L -f -# -O ${ftpmirror}/SHA512SUMS
recv_sum=$(grep "$filepath" SHA512SUMS | cut -c-128)
file_sum=$(sha512sum $file | cut -c-128)
if [ $recv_sum != $file_sum ]; then
	echo "[Error] File checksum failed!"
	exit 1;
else
	echo "Checksum correct."
	rm SHA512SUMS
fi

echo "Attaching image and copying files..."
hdiutil attach $file
cp -rf /Volumes/Firefox/Firefox.app ../FirefoxESR.app
mkdir ../data

echo "Detaching image and removing image file..."
hdiutil detach /Volumes/Firefox
rm $file

## TODO: check on linux before make that changes
# Deleting some not needed files
#rm ../app/crashreporter*
#rm ../app/removed-files
#rm ../app/run-mozilla.sh
#rm ../app/update*
#rm ../app/browser/blocklist.xml
#rm -r ../app/dictionaries
# And edit some places
#sed -i 's/Enabled=1/Enabled=0/g' ../app/application.ini
#sed -i 's/ServerURL=.*/ServerURL=-/' ../app/application.ini
# sed -i 's/Enabled=1/Enabled=0/g' ../app/webapprt/webapprt.ini
# sed -i 's/ServerURL=.*/ServerURL=-/' ../app/webapprt/webapprt.ini
# Done!

echo "Downloading language packs..."
curl -L -f -# -o ../FirefoxESR.app/Contents/Resources/browser/extensions/langpack-ru@firefox.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/605634/russian_ru_language_pack-52.0-fx.xpi?src=version-history
curl -L -f -# -o ../FirefoxESR.app/Contents/Resources/browser/extensions/langpack-en-US@firefox.mozilla.org.xpi https://addons.mozilla.org/firefox/downloads/file/605596/english_us_language_pack-52.0-fx.xpi?src=version-history

echo "Downloading NoScript extension..."
curl -L -f -# -o ../FirefoxESR.app/Contents/Resources/browser/extensions/{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi https://addons.mozilla.org/firefox/downloads/file/806790/noscript_security_suite-5.1.8.3-fx+sm.xpi

echo "Adding standard configs..."
cp profile/* ../data/
mkdir -p ../FirefoxESR.app/Contents/Resources/browser/defaults
cp -r preferences ../FirefoxESR.app/Contents/Resources/browser/defaults/

echo '#!/bin/sh' > "../i2pdbrowser-portable"
echo 'dir=${0%/*}' >> "../i2pdbrowser-portable"
echo 'if [ "$dir" = "$0" ]; then' >> "../i2pdbrowser-portable"
echo '  dir="."' >> "../i2pdbrowser-portable"
echo 'fi' >> "../i2pdbrowser-portable"
echo 'FirefoxESR.app/Contents/MacOS/firefox -profile ../data -no-remote' >> "../i2pdbrowser-portable"

chmod +x "../i2pdbrowser-portable"

echo "Downloading i2pd..."
curl -L -f -# -O https://github.com/PurpleI2P/i2pd/releases/download/${i2pdversion}/i2pd_${i2pdversion}_osx.tar.gz
mkdir ../i2pd
tar xfz i2pd_${i2pdversion}_osx.tar.gz -C ../i2pd
mv ../i2pd/i2pd ../i2pd/i2pd-osx
cp -rf i2pd ../i2pd

echo "... finished"
