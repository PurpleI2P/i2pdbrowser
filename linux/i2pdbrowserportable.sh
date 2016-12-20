#!/bin/sh
arch=$(uname -m)

# Configure the following default variables according to your requirements
#language="en-US" # e.g. "de" or "en-US" # We will detect language from system!
language=$(echo $LANG | cut -c-5 | sed s/_/-/g)
# default if no argument is set:
version="45.6.0esr" # chose from http://download.cdn.mozilla.net/pub/mozilla.org/firefox/releases/
application="firefox"

echo "This script prepearing $application $version for use with I2Pd"
#read -n1 -r -p "Press space to continue..." key

file="$application-$version.tar.bz2"
url="http://ftp.mozilla.org/pub/$application/releases/$version/linux-$arch/$language/$file"
# or example for firefox nightly:
#file=firefox-32.0a2.en-US.linux-i686.tar.bz2
#url=http://download.cdn.mozilla.net/pub/mozilla.org/firefox/nightly/latest-mozilla-aurora/$file

dir="$application-portable"
mkdir "$dir"
cd "$dir"
echo "Downloading $application..."
wget -q $url
if [ $? -ne 0 ]; then # Not found error, trying to cut language variable
	language=$(echo $language | cut -c-2)
	# re-create variable with cutted lang
	url="http://ftp.mozilla.org/pub/$application/releases/$version/linux-$arch/$language/$file"
	wget -q $url
fi
if [ ! -f $file ]; then
	echo "Can't find downloaded file. Does FireFox support your system language?"
	exit 1;
fi
echo "Extracting archive, please wait..."
tar xfj $file
rm $file
mv $application app
mkdir data

echo "Downloading NoScript extension..."
wget -q https://addons.mozilla.org/firefox/downloads/latest/noscript/addon-722-latest.xpi?src=search -O app/browser/extensions/{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi

echo "Adding standart configs..."
mv ../configs/* data/
rm -rf ../configs

echo '#!/bin/sh' > "${application}-portable"
echo 'dir=${0%/*}' >> "${application}-portable"
echo 'if [ "$dir" = "$0" ]; then' >> "${application}-portable"
echo ' dir="."' >> "${application}-portable"
echo 'fi' >> "${application}-portable"
echo 'cd "$dir/app"' >> "${application}-portable"
echo './firefox -profile ../data' >> "${application}-portable" 

chmod +x "$application-portable"
echo ... finished
rm ../$0
