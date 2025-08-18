
# Building the firefox extension
```
git clone https://github.com/kalintas/wplace-bot
cd wplace-bot
npm install
npx webpack
```
The extension is ready to use as a temporary extension. Open firefox, go to ```about:debugging#/runtime/this-firefox```. Press Load Temporary Add-on, and select the manifest.json file. Go to wplace.live, hit refresh and start using.

# Signing the extension
To sign the extension and make it permanent. Use the web-ext cli. First do the previous steps. Then run:
```
npm install --global web-ext
web-ext sign --api-key="JWT issuer" --api-secret="JWT secret" --channel="unlisted"
```

# Usage with local overrides
If you wish to not use the firefox extension, you can use local overrides.
```
git clone https://github.com/kalintas/wplace-bot
cd wplace-bot
npm install
node override.js
```
Then open chrome and go to https://wplace.live/. Open dev tools with F12. Go to "Sources" tab, click on the "Overrides" sub tab. Click "Select folder for overrides" then select this repositories folder. It iss crucial that you select the right folder. It should be the folder of this project, not the wplace.live folder. Hit refresh and start using.
If the website breaks at some point run the ```node override.js``` command and refresh the page.