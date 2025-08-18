import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import types, { arrowFunctionExpression, blockStatement, returnStatement } from "@babel/types";
import generate from "@babel/generator"


export function getOverrideScript(scriptText) {
    try {
        const ast = parse(scriptText, {
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
        return generate.default(ast, {}).code;
    } catch (exception) {
        console.error(exception);
    }
    return null;
}
