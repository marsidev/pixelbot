import fetch from 'node-fetch';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import types, { arrowFunctionExpression, blockStatement, returnStatement } from "@babel/types";
import generate from "@babel/generator"

const BASE_URL = 'https://wplace.live/';
const BASE_FOLDER = './wplace.live/';
const NODE_FOLDER = BASE_FOLDER + '/_app/immutable/nodes/';

// Ensure folders exist
if (!fs.existsSync(BASE_FOLDER)) fs.mkdirSync(BASE_FOLDER, { recursive: true });
if (!fs.existsSync(NODE_FOLDER)) fs.mkdirSync(NODE_FOLDER, { recursive: true });

const hooksScript = fs.readFileSync("hooks.js", 'utf-8');
const popupHtml = fs.readFileSync("popup.html", 'utf-8');

fetch(BASE_URL)
    .then((res) => res.text())
    .then((body) => {
        // Parse HTML as DOM
        const dom = new JSDOM(body);
        const document = dom.window.document;

        const script = document.createElement("script");
        script.innerHTML = hooksScript;
        document.head.prepend(script);

        const popup = document.createElement("div");
        popup.innerHTML = popupHtml;
        document.body.childNodes[1].prepend(popup);

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
                    const ast = parser.parse(text, {
                        sourceType: 'module',
                        plugins: ['jsx', 'classProperties'],
                    });
                    
                    // Find the captcha block and inject the hook.
                    traverse.default(ast, {
                        CallExpression(path) {
                            const { node } = path;

                            if (node.arguments.length === 2 && node.arguments[1].type === "ObjectExpression") {
                                const object = node.arguments[1];

                                const captchaObjectProps = [
                                    ["ObjectMethod", "siteKey"],
                                    ["ObjectProperty", "refreshExpired"],
                                    ["ObjectProperty", "appearance"],
                                    ["ObjectProperty", "callback"],
                                ];
                                if (object.properties.length === captchaObjectProps.length &&
                                    object.properties.every((prop, index) => prop.type === captchaObjectProps[index][0] && prop.key.name === captchaObjectProps[index][1])) {
                                    const captchaCallback = object.properties[3].value;

                                    /*
                                    window.setWplaceBotHook(aa.captcha, async () => {
                                        //w(T).latLonToTileAndPixel(at, ht, l.pixelArtZoom);
                                        console.log("Reset the captcha");
                                        aa.captcha = void 0;
                                    });
                                    */
                                    const captchaBlockStatement = captchaCallback.body.body;
                                    const captchaAssignment = captchaBlockStatement[0];
                                    const captcha = captchaAssignment.expression.left;
                                    console.log(`Found captcha expression: ${captcha.object.name}.${captcha.property.name}`);

                                    if (captcha.type === "MemberExpression" && captchaCallback.body.type === "BlockStatement") {
                                        const arrowFunction = types.arrowFunctionExpression([],
                                            types.blockStatement([
                                                types.expressionStatement(types.callExpression(
                                                    types.memberExpression(types.identifier("console"), types.identifier("log")), [types.stringLiteral("Reset the captcha")])
                                                ),
                                                types.expressionStatement(
                                                    types.assignmentExpression("=", captcha, types.nullLiteral()))
                                            ])
                                        );
                                        arrowFunction.async = true;

                                        const injection = types.expressionStatement(
                                            types.callExpression(
                                                types.memberExpression(types.identifier("window"), types.identifier("setWplaceBotHook")),
                                                [captcha, arrowFunction]
                                            )
                                        );
                                        captchaBlockStatement.push(injection);
                                    }
                                }
                            }
                        }
                    });

                    // Inject the tile and pixel hook
                    traverse.default(ast, {
                        CallExpression(path) {
                            const { node } = path;
                            if (node.arguments.length === 1 && node.arguments[0].type === "ArrowFunctionExpression") {
                                const arrowFunctionExpression = node.arguments[0];
                                if (arrowFunctionExpression.body.type === "BlockStatement") {
                                    const expressions = arrowFunctionExpression.body.body;
                                    if (expressions.length === 2 && expressions[0].type === "VariableDeclaration" && expressions[1].type === "ReturnStatement") {
                                        if (expressions[0].declarations.length === 5) {
                                            const declaration = expressions[0].declarations[3];
                                            let tile = declaration.id.properties[0].value.name;
                                            let pixel = declaration.id.properties[1].value.name;
                                            console.log("Found tile and pixel: ", tile, pixel);
                                            /*
                                            window.setWplaceBotCurrentTileAndPixel(lr, Et);
                                            */
                                            expressions.splice(1, 0, types.expressionStatement(
                                                types.callExpression(
                                                    types.memberExpression(types.identifier("window"), types.identifier("setWplaceBotCurrentTileAndPixel")), 
                                                    [types.identifier(tile), types.identifier(pixel)]
                                                )
                                            ));
                                        }
                                    }
                                }
                            }
                        }
                    });

                    console.log("Finished script injection. Converting to js back.")

                    const overridenScript = generate.default(ast, {
                    });
                    fs.writeFile(NODE_FOLDER + overrideScriptName, overridenScript.code, (err) => {
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


