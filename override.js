import fetch from 'node-fetch';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import esMain from 'es-main';
import { getOverrideScript } from './overrideScript.js';

const BASE_URL = 'https://wplace.live/';
const BASE_FOLDER = './wplace.live/';
const NODE_FOLDER = BASE_FOLDER + '/_app/immutable/nodes/';

// Ensure folders exist
if (!fs.existsSync(BASE_FOLDER)) fs.mkdirSync(BASE_FOLDER, { recursive: true });
if (!fs.existsSync(NODE_FOLDER)) fs.mkdirSync(NODE_FOLDER, { recursive: true });

const hooksScript = fs.readFileSync("hooks.js", 'utf-8');
const popupHtml = fs.readFileSync("popup.html", 'utf-8');
const popupScript = fs.readFileSync("popup.js", 'utf-8');

function runOverride() {
    fetch(BASE_URL)
        .then((res) => res.text())
        .then((body) => {
            // Parse HTML as DOM
            const dom = new JSDOM(body);
            const document = dom.window.document;

            const hooksScriptElement = document.createElement("script");
            hooksScriptElement.innerHTML = hooksScript;
            document.head.prepend(hooksScriptElement);

            const popup = document.createElement("div");
            popup.innerHTML = popupHtml;
            document.body.childNodes[1].prepend(popup);

            const popupScriptElement = document.createElement("script");
            popupScriptElement.innerHTML = popupScript;
            document.body.childNodes[1].appendChild(popupScriptElement);
            
            const links = Array.from(document.head.getElementsByTagName("link"));
            const overrideScriptSrc = links.filter(link => {
                const href = link.getAttribute('href');
                return href.startsWith('./_app/immutable/nodes/2.') && href.endsWith('.js');
            })[0].getAttribute('href');
            const overrideScriptName = overrideScriptSrc.split('/').pop();

            fetch(BASE_URL + overrideScriptSrc)
                .then((res) => res.text())
                .then((text) => {
                    try {
                        const overrideScript = getOverrideScript(text);

                        if (!overrideScript) {
                            return;
                        }

                        fs.writeFile(NODE_FOLDER + overrideScriptName, overrideScript, (err) => {
                            if (err) {
                                console.error('Error writing file:', err);
                            } else {
                                console.log(`Overriden script saved to ${NODE_FOLDER}${overrideScriptName}`);
                            }
                        });

                    } catch (exception) {
                        console.error(exception);
                    }
                });

            // Serialize the DOM back to HTML
            const newHtml = dom.serialize();

            // Save modified HTML
            fs.writeFile(BASE_FOLDER + 'index.html', newHtml, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`Modified HTML saved to ${BASE_FOLDER}index.html`);
                }
            });
        })
        .catch((err) => console.error('Error fetching the URL:', err));
}
 
if (esMain(import.meta)) {
    runOverride();
}