version="52.5.2esr"

echo "This script is preparing Firefox ESR $version for use with i2pd"
echo "Downloading latest Firefox ESR..."
curl --proto =https -L -f -# https://download.mozilla.org/?product=firefox-esr-latest-ssl&os=osx&lang=en-US
echo "Attaching image..."
hdiutil attach ./Firefox\ $version.dmg
echo "Copying files..."
cp -rf /Volumes/Firefox/Firefox.app ./FirefoxESR.app
cp ./syspref.js ./FirefoxESR.app/Contents/Resources/defaults/pref/
echo "Detaching image and removing image file..."
hdiutil detach /Volumes/Firefox
rm ./Firefox\ $version.dmg
echo "Downloading NoScript extension..."
curl --proto =https -L -f -# https://secure.informaction.com/download/releases/noscript-5.1.7.xpi
mv ./noscript-5.1.7.xpi ./FirefoxESR.app/Contents/Resources/browser/extensions/{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi
echo "Done."
