#!/bin/sh

# Copyright (c) 2013-2017, The PurpleI2P Project
#
# This file is part of Purple i2pd project and licensed under BSD3
#
# See full license text in LICENSE file at top of project tree

arch=$(uname -m)
language=$(echo $LANG | cut -c-5 | sed s/_/-/g)
version="45.7.0esr"
application="firefox"

echo "This script prepearing $application $version for use with I2Pd"

file="$application-$version.tar.bz2"
url="https://ftp.mozilla.org/pub/$application/releases/$version/linux-$arch/$language/$file"

echo "Downloading $application..."
curl -L -f -# -O $url
if [ $? -ne 0 ]; then # Not found error, trying to cut language variable
	language=$(echo $language | cut -c-2)
	# re-create variable with cutted lang
	url="https://ftp.mozilla.org/pub/$application/releases/$version/linux-$arch/$language/$file"
	curl -L -f -# -O $url
fi
if [ ! -f $file ]; then
	echo "Can't find downloaded file. Does FireFox support your system language?"
	exit 1;
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
