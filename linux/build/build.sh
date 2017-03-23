#!/bin/sh

# Copyright (c) 2013-2017, The PurpleI2P Project
#
# This file is part of Purple i2pd project and licensed under BSD3
#
# See full license text in LICENSE file at top of project tree

arch=$(uname -m)
language=$(echo $LANG | cut -c-5 | sed s/_/-/g)
version="45.8.0esr"
application="firefox"
ftpmirror="https://ftp.mozilla.org/pub/$application/releases/$version"

curlfind=$(which curl)
if [ -z $curlfind ]; then
	echo "Can't find 'cURL' installed. That script needs it!";
	exit 1;
fi

echo "This script prepearing $application $version for use with I2Pd"

file="$application-$version.tar.bz2"
filepath="linux-$arch/$language/$file"

echo "Downloading $application..."
curl -L -f -# -O $ftpmirror/$filepath
if [ $? -ne 0 ]; then # Not found error, trying to cut language variable
	echo "[TRY 2] I'll try download Firefox with shortener language code";
	language=$(echo $language | cut -c-2)
	# re-create variable with cutted lang
	filepath="linux-$arch/$language/$file"
	curl -L -f -# -O $ftpmirror/$filepath
	if [ $? -ne 0 ]; then # Not found error, trying to download english version
		echo "[TRY 3] I'll try download Firefox with English language code";
		language="en_US"
		# re-create lang variable
		filepath="linux-$arch/$language/$file"
		curl -L -f -# -O $ftpmirror/$filepath
		if [ $? -ne 0 ]; then # After that i can say only that user haven't internet connection
			echo "[Error] Can't download file. Check your internet connectivity."
			exit 1;
		fi
	fi
fi

if [ ! -f $file ]; then
	echo "[Error] Can't find downloaded file. Is it really exists?"
	exit 1;
fi

echo "Downloading checksum file and checking SHA512 checksum"
curl -L -f -# -O $ftpmirror/SHA512SUMS
recv_sum=$(grep "$filepath" SHA512SUMS | cut -c-128)
file_sum=$(sha512sum $file | cut -c-128)
if [ $recv_sum != $file_sum ]; then
	echo "[Error] File checksum failed!"
	exit 1;
else
	echo "Checksum correct."
	rm SHA512SUMS
fi

echo "Extracting archive, please wait..."
tar xfj $file
rm $file
mv $application ../app
mkdir ../data

# Deleting some not needed files
rm ../app/crashreporter*
rm ../app/removed-files
rm ../app/run-mozilla.sh
rm ../app/update*
rm ../app/browser/blocklist.xml
rm -r ../app/dictionaries
# And edit some places
sed -i 's/Enabled=1/Enabled=0/g' ../app/application.ini
sed -i 's/ServerURL=.*/ServerURL=-/' ../app/application.ini
sed -i 's/Enabled=1/Enabled=0/g' ../app/webapprt/webapprt.ini
sed -i 's/ServerURL=.*/ServerURL=-/' ../app/webapprt/webapprt.ini
# Done!

echo "Downloading NoScript extension..."
curl -L -f -# -O https://addons.mozilla.org/firefox/downloads/latest/noscript/addon-722-latest.xpi
mv addon-722-latest.xpi ../app/browser/extensions/{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi

echo "Adding standart configs..."
cp configs/* ../data/

echo '#!/bin/sh' > "../${application}-portable"
echo 'dir=${0%/*}' >> "../${application}-portable"
echo 'if [ "$dir" = "$0" ]; then' >> "../${application}-portable"
echo '	dir="."' >> "../${application}-portable"
echo 'fi' >> "../${application}-portable"
echo 'cd "$dir/app"' >> "../${application}-portable"
echo './firefox -profile ../data -no-remote' >> "../${application}-portable"

chmod +x "../$application-portable"
echo ... finished
