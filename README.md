
# WPlace Bot - Auto Pixel Firefox Extension
Download the extension by clicking [here](https://github.com/kalintas/wplace-bot/releases/latest/download/wplace-bot.xpi). Install the extension and open wplace.live on firefox and hit refresh. For now the extension only works on firefox. 

![Screenshot](https://github.com/kalintas/wplace-bot/blob/main/screenshots/meyan.png?raw=true)


You can see the logs of the bot by pressing F12 and going to console. If the bot showing "Captcha is not ready", means you have to wait until you can paint more pixels. Bot will automatically refresh the page if it can't receive a captcha under 60 seconds.

![Screenshot](https://github.com/kalintas/wplace-bot/blob/main/screenshots/finished.png?raw=true)

Bot will go to anti-invasion mode when the pixel art is finished. Then you may keep open the bot to preserve you pixel art.

Optionally because the bot is written for the firefox you can use [Firefox Containers](https://addons.mozilla.org/en-US/firefox/addon/multi-account-containers/) to open up multiple accounts in different tabs. And open the bot in each tab allowing you to farm with multiple accounts. 
You can copy the current config via the 📋 emoji then paste it via the 📥 emoji on the bot.

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

# ⚠️ Disclaimer
This tool is for educational purposes only. I am not responsible for any bans, suspensions, or consequences that may occur from using this bot on wplace.live. Use at your own risk.