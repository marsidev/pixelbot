
const BASE_URL = "https://backend.wplace.live";
const SESSION = 0;

const CAPTCHA_CONTEXT_IDENT = "GLOBAL_CAPTCHA_CONTEXT_IDENT";
const CAPTCHA_CALLBACK_IDENT = "GLOBAL_CAPTCHA_CALLBACK_IDENT";
const CURRENT_TILE_IDENT = "CURRENT_TILE_IDENT";
const CURRENT_PIXEL_IDENT = "CURRENT_PIXEL_IDENT";
const START_POINT_IDENT = "START_POINT_IDENT";
const CURRENT_DRAWING_CONFIG_IDENT = "CURRENT_DRAWING_CONFIG_IDENT";
window[CURRENT_DRAWING_CONFIG_IDENT] = JSON.parse(localStorage.getItem(CURRENT_DRAWING_CONFIG_IDENT));

const wplaceBotState = {
    running: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
};

const getCurrentDrawingConfig = () => {
    const config = window[CURRENT_DRAWING_CONFIG_IDENT];
    return config ? config : {};
}
const setCurrentDrawingConfig = (config) => {
    window[CURRENT_DRAWING_CONFIG_IDENT] = config;
    localStorage.setItem(CURRENT_DRAWING_CONFIG_IDENT, JSON.stringify(config));
}

const fetchApi = async (path, params = {}) => fetch(BASE_URL + path, { credentials: 'include', ...params });
const getCaptchaContext = () => window[CAPTCHA_CONTEXT_IDENT];
const setWplaceBotHook = (context, callback) => {
    window[CAPTCHA_CONTEXT_IDENT] = context;
    window[CAPTCHA_CALLBACK_IDENT] = callback;
    console.log("Set captcha context.");

    document.getElementById("captchaWarningText").style.display = "none";
};

const setWplaceBotCurrentTileAndPixel = (tile, pixel) => {
    const startingPointInput = document.getElementById('startingPointInput');
    if (!wplaceBotState.running) {
        startingPointInput.value = `Chunk: { x: ${tile[0]}, y: ${tile[1]} }, Pixel: { x: ${pixel[0]}, y: ${pixel[1]} }`;
    }

    window[CURRENT_TILE_IDENT] = tile;
    window[CURRENT_PIXEL_IDENT] = pixel;
    console.log("Set current tile and pixel:", tile, pixel);
};
const getCurrentTileAndPixel = () => {
    if (!window[CURRENT_PIXEL_IDENT] || !window[CURRENT_TILE_IDENT]) {
        return null;
    }

    return {
        tile: { x: window[CURRENT_TILE_IDENT][0], y: window[CURRENT_TILE_IDENT][1] },
        pixel: { x: window[CURRENT_PIXEL_IDENT][0], y: window[CURRENT_PIXEL_IDENT][1] }
    };
};

const fetchCharges = async () => {
    let response = await fetchApi('/me');
    if (response && response.ok) {
        response = await response.json();
        wplaceBotState.userInfo = response;
        wplaceBotState.charges = {
            count: Math.floor(response.charges.count),
            max: Math.floor(response.charges.max),
            cooldownMs: response.charges.cooldownMs
        };
        return response;
    }
        
    console.error("WplaceBot: Failed to fetch user info.");
    return null;
};

fetchCharges().then((response) => console.log("Fetched user info:", response));

const isContextReady = () => Boolean(getCaptchaContext());

const WPLACE_API_CLIENT_IDENT = "WPLACE_API_CLIENT_IDENT";
const getWplaceApiClient = () => window[WPLACE_API_CLIENT_IDENT];
const setWplaceApiClient = client => {
    window[WPLACE_API_CLIENT_IDENT] = client;
}

const hookPaint = async (chunk, coords, colors) => {
    if (!isContextReady()) {
        console.warn("Context is not ready yet.");
        return null;
    }

    const payload = {
        colors,
        coords,
        t: getCaptchaContext().token,
    }

    console.log("Sending paint request...")

    const response = await fetchApi(`/s${SESSION}/pixel/${chunk.x}/${chunk.y}`, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    await window[CAPTCHA_CALLBACK_IDENT]();
    window[CAPTCHA_CONTEXT_IDENT] = null;
    document.getElementById("captchaWarningText").style.display = "block";

    return response;
}
window.setWplaceBotHook = setWplaceBotHook;
window.setWplaceBotCurrentTileAndPixel = setWplaceBotCurrentTileAndPixel;

const getChunkPixels = async ({ x, y }) => {
    const response = await fetch(BASE_URL + `/files/s${SESSION}/tiles/${x}/${y}.png`);
    if (!response.ok) {
        console.error("Could not fetch the chunk at:", x, y);
        return null;
    }
    console.log(`Fetched the chunk png at x: ${x} y: ${y}`);

    // Convert stream to Blob
    const blob = await response.blob();

    // Decode the PNG
    const imageBitmap = await createImageBitmap(blob);

    // Draw on an offscreen canvas to read pixels
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);

    // Extract pixel data (RGBA)
    const { data: pixels } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
        pixels,
        width: canvas.width,
        height: canvas.height
    };
};

const findNearestColorId = (c) => {
    if (c.r === 0 && c.g === 0 && c.b === 0) {
        if (c.a === 0) {
            return "0"; // Transparent
        } else {
            return "1"; // Black
        }
    }

    for (const [id, color] of Object.entries(ALL_COLORS_BY_ID)) {
        if (c.r === color.r && c.g === color.g && c.b === color.b) {
            return id;
        }
    }

    return null;
}

const startWplaceBot = async ({ width, height }, indicesArray) => {
    console.log("Starting Wplace Bot...");

    let config = getCurrentDrawingConfig();
    const startPoint = config && config.startPoint ? config.startPoint : getCurrentTileAndPixel();

    if (!startPoint) {
        console.error("Wplacebot: Select a point on the map to start the bot");
        wplaceBotState.running = false;
        return;
    }

    config.startPoint = startPoint;
    setCurrentDrawingConfig(config);

    try {
        while (wplaceBotState.running) {

            let reloadPageTimeout = null;
            if (!isContextReady()) {
                reloadPageTimeout = setTimeout(() => { 
                    if (!wplaceBotState.running || isContextReady()) {
                        // Context is already ready.
                        return;
                    }

                    console.log("Wplace bot didn't recieve a captcha for 60 seconds, reloading the page.");
                    config = getCurrentDrawingConfig();
                    config.shouldRunAtStart = true;
                    setCurrentDrawingConfig(config);

                    window.location.reload();
                }, 60 * 1000);
            }

            // First wait for the captcha and charge to paint.
            while ((!isContextReady() || wplaceBotState.charges.count === 0) && wplaceBotState.running) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (reloadPageTimeout) {
                clearTimeout(reloadPageTimeout);
            }

            if (!wplaceBotState.running) {
                break;
            }

            // Then get the current chunk. We will place the pixels based on this information.
            const chunk = await getChunkPixels(startPoint.tile);
            if (!chunk) {
                // Wait some time before requesting again
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            let coords = [];
            let colors = [];

            let charges = Math.floor(wplaceBotState.charges.count);

            // Add the points we will paint.
            for (let y = 0; y < height && charges > 0; ++y) {
                for (let x = 0; x < width && charges > 0; ++x) {
                    const imagePixelId = indicesArray[y][x];

                    // Skip transparent.
                    if (imagePixelId === 0) {
                        continue;
                    }

                    // Fetch the chunk colors.
                    const chunkR = chunk.pixels[(x + startPoint.pixel.x + (chunk.width * (y + startPoint.pixel.y))) * 4];
                    const chunkG = chunk.pixels[(x + startPoint.pixel.x + (chunk.width * (y + startPoint.pixel.y))) * 4 + 1];
                    const chunkB = chunk.pixels[(x + startPoint.pixel.x + (chunk.width * (y + startPoint.pixel.y))) * 4 + 2];
                    const chunkA = chunk.pixels[(x + startPoint.pixel.x + (chunk.width * (y + startPoint.pixel.y))) * 4 + 3];

                    const newPixelColor = ALL_COLORS_BY_ID[imagePixelId];

                    if (!newPixelColor) {
                        console.error("Wplace bot: input image had invalid color, imagePixelId: ", imagePixelId);
                        // Skip this pixel.
                        continue;
                    }

                    const oldPixelId = findNearestColorId({ r: chunkR, g: chunkG, b: chunkB, a: chunkA });
                    if (parseInt(oldPixelId) === imagePixelId) {
                        // We don't have to color this pixel.
                        // Its already been colored.
                        continue;
                    }

                    coords.push(x + startPoint.pixel.x, y + startPoint.pixel.y);
                    colors.push(imagePixelId);

                    charges -= 1;

                    if (coords.length > 100) {
                        break;
                    }
                }
                if (coords.length > 100) {
                    break;
                }
            }

            if (coords.length === 0 && colors.length === 0 && charges > 0) {
                console.log("Wplace Bot finished! Keep the bot open to avoid invasions.");
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
            
            console.log("Sending paint request: ", coords, " ", colors);
            // Finally paint.
            const response = await hookPaint(startPoint.tile, coords, colors);

            if (!response.ok) {
                console.error("WplaceBot: Error paint request rejected: ", response.status);
            } else if (response.ok) {
                let result = await response.json();
                console.log(`Successfuly painted ${result.painted} pixels.`);
            }

            // Fetch charges to get the most updated value.
            await fetchCharges();
            console.log("Current charges: ", wplaceBotState.charges.count);

            if (wplaceBotState.charges.count === 0) {
                const interval = setInterval(() => {
                    if (!wplaceBotState.running) {
                        clearInterval(interval);
                        return;
                    }
                    fetchCharges().then();
                    console.log("Fetching charges");
                    if (wplaceBotState.charges.count !== 0) {
                        clearInterval(interval);
                    }
                }, 30 * 1000);
            }

            // Wait a bit before sending a request again
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (exception) {
        console.error(exception);
    }

    console.log("Wplace Bot stopped.");
}
