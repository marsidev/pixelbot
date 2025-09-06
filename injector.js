function injectScripts() {
  const injectScript = (name) => {
    fetch(browser.runtime.getURL(`./src/${name}.js`))
      .then((r) => r.text())
      .then((hooksScript) => {
        const id = `wplaceBotScript__${name}`;
        if (!document.getElementById(id)) {
          const script = document.createElement("script");
          script.id = id;
          script.textContent = hooksScript;
          document.head.prepend(script);
        }
      })
      .catch(console.error);
  };

  injectScript("hooks");

  // Small delay to ensure hooks.js is fully loaded
  setTimeout(() => {
    fetch(browser.runtime.getURL("./src/popup.html"))
      .then((r) => r.text())
      .then((popupHtml) => {
        if (!document.getElementById("wplaceBot")) {
          const popup = document.createElement("div");
          popup.innerHTML = popupHtml;
          document.body.appendChild(popup);
          injectScript("popup");
        }
      })
      .catch(console.error);
  }, 100);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectScripts);
} else {
  injectScripts();
}

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }
  if (event.data && event.data.source === "pixelbot") {
    try {
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(event.data, (_response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Message passing failed:",
              chrome.runtime.lastError.message,
            );
          }
        });
      } else {
        console.warn("Chrome runtime not available, skipping message");
      }
    } catch (error) {
      console.warn("Failed to send message to background:", error);
    }
  }
});
