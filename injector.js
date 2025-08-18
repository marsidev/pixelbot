
document.addEventListener("DOMContentLoaded", () => {

    const injectScript = (name) => {
        fetch(browser.runtime.getURL(`${name}.js`))
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

    fetch(browser.runtime.getURL('popup.html'))
        .then(r => r.text())
        .then(popupHtml => {
            if (!document.getElementById('wplaceBot')) {
                document.body.insertAdjacentHTML('afterbegin', popupHtml);
                injectScript('popup');
            }
        })
        .catch(console.error);
});
