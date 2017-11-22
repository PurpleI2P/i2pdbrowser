curl -O https://ftp.mozilla.org/pub/firefox/releases/52.5.0esr/mac/en-US/Firefox%2052.5.0esr.dmg
hdiutil attach Firefox%2052.5.0esr.dmg
cp -rf /Volumes/Firefox/Firefox.app ./FirefoxESR.app
cp ./syspref.js ./FirefoxESR.app/Contents/Resources/defaults/pref/
curl -O https://secure.informaction.com/download/releases/noscript-5.1.7.xpi
mv ./noscript-5.1.7.xpi ./FirefoxESR.app/Contents/Resources/browser/extensions/{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi
