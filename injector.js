function injectScripts() {
    const injectScript = (name) => {
        fetch(browser.runtime.getURL(`./src/${name}.js`))
            .then(r => r.text())
            .then(hooksScript => {
                const id = `wplaceBotScript__${name}`;
                if (!document.getElementById(id)) {
                    const script = document.createElement('script');
                    script.id = id;
                    script.textContent = hooksScript;
                    document.head.prepend(script);
                }
            })
            .catch(console.error);
    }

    injectScript('hooks');

    fetch(browser.runtime.getURL('./src/popup.html'))
        .then(r => r.text())
        .then(popupHtml => {
            if (!document.getElementById('wplaceBot')) {
                const popup = document.createElement('div');
                popup.innerHTML = popupHtml;
                document.body.appendChild(popup);
                injectScript('popup');
            }
        })
        .catch(console.error);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectScripts);
} else {
    injectScripts();
}