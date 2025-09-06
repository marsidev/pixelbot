const BASE_URL = "https://backend.wplace.live";
const SESSION = 0;

const CAPTCHA_CONTEXT_IDENT = "GLOBAL_CAPTCHA_CONTEXT_IDENT";
const CAPTCHA_CALLBACK_IDENT = "GLOBAL_CAPTCHA_CALLBACK_IDENT";
const CURRENT_TILE_IDENT = "CURRENT_TILE_IDENT";
const CURRENT_PIXEL_IDENT = "CURRENT_PIXEL_IDENT";
const _START_POINT_IDENT = "START_POINT_IDENT";
const CURRENT_DRAWING_CONFIG_IDENT = "CURRENT_DRAWING_CONFIG_IDENT";
window[CURRENT_DRAWING_CONFIG_IDENT] = JSON.parse(
  localStorage.getItem(CURRENT_DRAWING_CONFIG_IDENT),
);

const wplaceBotState = {
  running: false,
  paintedCount: 0,
  charges: { count: 0, max: 80, cooldownMs: 30000 },
  userInfo: null,
  lastPixel: null,
  progress: { correct: 0, total: 0, analyzing: false },
  capturedPawtectToken: null,
};

// Auto-detection: Intercept manual paint requests to capture x-pawtect-token
const PAWTECT_TOKEN_KEY = "pixelbot-pawtect-token";

// Load stored token on startup
const storedToken = localStorage.getItem(PAWTECT_TOKEN_KEY);
if (storedToken) {
  wplaceBotState.capturedPawtectToken = storedToken;
  console.log("✅ Loaded stored pawtect token");
}

// Intercept fetch requests to capture x-pawtect-token from manual painting
if (typeof window.fetch !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const [url, options] = args;

    // Check if this is a paint request with x-pawtect-token
    if (
      typeof url === "string" &&
      url.includes("/pixel/") &&
      options?.method === "POST" &&
      options?.headers?.["x-pawtect-token"]
    ) {
      const token = options.headers["x-pawtect-token"];
      if (token && token !== wplaceBotState.capturedPawtectToken) {
        wplaceBotState.capturedPawtectToken = token;
        localStorage.setItem(PAWTECT_TOKEN_KEY, token);
        console.log("🔍 Auto-captured pawtect token from manual paint!");
        console.log("Token length:", token.length);
      }
    }

    return originalFetch.apply(this, args);
  };
}

const getCurrentDrawingConfig = () => {
  const config = window[CURRENT_DRAWING_CONFIG_IDENT];
  return config ? config : {};
};
const setCurrentDrawingConfig = (config) => {
  window[CURRENT_DRAWING_CONFIG_IDENT] = config;
  localStorage.setItem(CURRENT_DRAWING_CONFIG_IDENT, JSON.stringify(config));
};

const fetchApi = async (path, params = {}) =>
  fetch(BASE_URL + path, { credentials: "include", ...params });
const getCaptchaContext = () => window[CAPTCHA_CONTEXT_IDENT];
const setWplaceBotHook = (context, callback) => {
  window[CAPTCHA_CONTEXT_IDENT] = context;
  window[CAPTCHA_CALLBACK_IDENT] = callback;
  console.log("Set captcha context.");

  const captchaWarningEl = document.getElementById("captchaWarningText");
  if (captchaWarningEl) {
    captchaWarningEl.style.display = "none";
  }
};

const setWplaceBotCurrentTileAndPixel = (tile, pixel) => {
  window[CURRENT_TILE_IDENT] = tile;
  window[CURRENT_PIXEL_IDENT] = pixel;
  console.log("Set current tile and pixel:", tile, pixel);

  const currentTileAndPixel = getCurrentTileAndPixel();
  console.log(
    "Dispatching wplace:currentTileAndPixel event with detail:",
    currentTileAndPixel,
  );

  window.dispatchEvent(
    new CustomEvent("wplace:currentTileAndPixel", {
      detail: currentTileAndPixel,
    }),
  );
};
const getCurrentTileAndPixel = () => {
  if (!window[CURRENT_PIXEL_IDENT] || !window[CURRENT_TILE_IDENT]) {
    return null;
  }

  return {
    tile: {
      x: window[CURRENT_TILE_IDENT][0],
      y: window[CURRENT_TILE_IDENT][1],
    },
    pixel: {
      x: window[CURRENT_PIXEL_IDENT][0],
      y: window[CURRENT_PIXEL_IDENT][1],
    },
  };
};

const fetchUserInfo = async () => {
  let response = await fetchApi("/me");
  if (response?.ok) {
    response = await response.json();
    wplaceBotState.userInfo = response;
    wplaceBotState.charges = {
      count: Math.floor(response.charges.count),
      max: Math.floor(response.charges.max),
      cooldownMs: response.charges.cooldownMs,
    };
    const leftChargesEl = document.getElementById("leftCharges");
    if (leftChargesEl) {
      leftChargesEl.innerText = `⚡ ${wplaceBotState.charges.count}/${wplaceBotState.charges.max}`;
      leftChargesEl.title = `Pixel Charges: ${wplaceBotState.charges.count} remaining out of ${wplaceBotState.charges.max} maximum`;
    }

    const dropletsEl = document.getElementById("dropletsCount");
    if (dropletsEl) {
      dropletsEl.innerText = `💧 ${response.droplets || 0}`;
      dropletsEl.title = `Droplets: ${response.droplets || 0} - Premium currency earned through gameplay`;
    }

    const usernameEl = document.getElementById("usernameStat");
    if (usernameEl && response.name) {
      usernameEl.innerText = `👤 ${response.name}`;
      usernameEl.title = `Username: ${response.name}`;
    }

    const levelProgressEl = document.getElementById("levelProgress");
    if (
      levelProgressEl &&
      response.level !== undefined &&
      response.pixelsPainted !== undefined
    ) {
      // Blue Marble's exact formula for calculating pixels needed for next level
      const nextLevelPixels = Math.ceil(
        (Math.floor(response.level) * 30 ** 0.65) ** (1 / 0.65) -
          response.pixelsPainted,
      );
      const pixelsNeeded = nextLevelPixels > 0 ? nextLevelPixels : 0;
      levelProgressEl.innerText = `🎯 ${pixelsNeeded}`;
      levelProgressEl.title = `Level Progress: ${pixelsNeeded} pixels needed to reach level ${Math.floor(response.level) + 1}`;
    }

    window.dispatchEvent(
      new CustomEvent("wplace:userInfoReady", { detail: wplaceBotState }),
    );

    return response;
  }

  console.error("Pixelbot: Failed to fetch user info.");
  return null;
};

fetchUserInfo().then((response) => {
  console.log("Fetched user info:", response);
  console.log("Available fields:", Object.keys(response || {}));
  console.log("Level data:", {
    level: response?.level,
    pixelsPainted: response?.pixelsPainted,
  });
});

const isContextReady = () => Boolean(getCaptchaContext());

const hookPaint = async (chunk, coords, colors) => {
  if (!isContextReady()) {
    console.warn("Context is not ready yet.");
    return null;
  }

  const captchaContext = getCaptchaContext();

  const payload = {
    colors,
    coords,
    t: captchaContext.token,
  };

  // Use captured token
  const pawtectToken = wplaceBotState.capturedPawtectToken;

  if (!pawtectToken) {
    throw new Error(
      "No pawtect token available - this should be checked before calling hookPaint",
    );
  }

  console.log("Sending paint request using auto-detected token...");

  const response = await fetchApi(`/s${SESSION}/pixel/${chunk.x}/${chunk.y}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Referer: "https://wplace.live/",
      Origin: "https://wplace.live",
      "x-pawtect-token": pawtectToken,
    },
    body: JSON.stringify(payload),
  });
  await window[CAPTCHA_CALLBACK_IDENT]();
  window[CAPTCHA_CONTEXT_IDENT] = null;
  const captchaWarningEl = document.getElementById("captchaWarningText");
  if (captchaWarningEl) {
    captchaWarningEl.style.display = "block";
  }

  return response;
};
window.setWplaceBotHook = setWplaceBotHook;
window.setWplaceBotCurrentTileAndPixel = setWplaceBotCurrentTileAndPixel;

console.log("🔧 Hooks exposed to window:", {
  setWplaceBotHook: typeof window.setWplaceBotHook,
  setWplaceBotCurrentTileAndPixel:
    typeof window.setWplaceBotCurrentTileAndPixel,
});

const getChunkPixels = async ({ x, y }) => {
  const response = await fetch(
    `${BASE_URL}/files/s${SESSION}/tiles/${x}/${y}.png?__internal__`,
  );
  if (!response.ok) {
    console.error("Could not fetch the chunk at:", x, y);
    return null;
  }

  // Convert stream to Blob
  const blob = await response.blob();

  // Decode the PNG
  const imageBitmap = await createImageBitmap(blob);

  // Draw on an offscreen canvas to read pixels
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0);

  // Extract pixel data (RGBA)
  const { data: pixels } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    pixels,
    width: canvas.width,
    height: canvas.height,
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
};

const sleepForMs = async (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const autoFetchCharges = async () => {
  // Fetch charges to get the most updated value.
  await fetchUserInfo();
  console.log("Current charges: ", wplaceBotState.charges.count);

  if (wplaceBotState.charges.count === 0) {
    const interval = setInterval(() => {
      if (!wplaceBotState.running || wplaceBotState.charges.count !== 0) {
        clearInterval(interval);
        return;
      }
      fetchUserInfo().then(() =>
        console.log("Fetched charges: ", wplaceBotState.charges.count),
      );
    }, 30 * 1000);
  }
};

const _startWplaceBot = async ({ width, height }, indicesArray) => {
  console.log("Starting Pixelbot...");

  // Check if we have a pawtect token
  if (!wplaceBotState.capturedPawtectToken) {
    console.error("Pixelbot: No authentication token found");
    wplaceBotState.running = false;
    alert(
      "🎯 Authentication Required!\n\n" +
        "To use the bot, you need to paint 1 pixel manually first:\n\n" +
        "1️⃣ Pick any color\n" +
        "2️⃣ Click somewhere on the canvas to paint 1 pixel\n" +
        "3️⃣ Wait for the pixel to be painted\n" +
        "4️⃣ Try starting the bot again\n\n" +
        "The bot will automatically capture your authentication token and work perfectly!",
    );
    return;
  }

  const config = getCurrentDrawingConfig();
  if (!config || !config.startPoint) {
    console.error("Pixelbot: Select a point on the map to start the bot");
    wplaceBotState.running = false;
    return;
  }
  const startPoint = config.startPoint;

  try {
    await autoFetchCharges();
  } catch (exception) {
    console.warn("Pixelbot: Could not fetch charges: ", exception);
  }

  while (wplaceBotState.running) {
    try {
      let reloadPageTimeout = null;
      if (!isContextReady()) {
        reloadPageTimeout = setTimeout(() => {
          if (!wplaceBotState.running || isContextReady()) {
            // Context is already ready.
            return;
          }

          console.log(
            "Pixelbot didn't receive a captcha for 60 seconds, reloading the page.",
          );
          const configRestart = getCurrentDrawingConfig();
          configRestart.shouldRunAtStart = true;
          setCurrentDrawingConfig(configRestart);

          window.location.reload();
        }, 60 * 1000);
      }

      // First wait for the captcha and charge to paint.
      while (
        (!isContextReady() || wplaceBotState.charges.count === 0) &&
        wplaceBotState.running
      ) {
        await sleepForMs(500);
      }

      if (reloadPageTimeout) {
        clearTimeout(reloadPageTimeout);
      }

      if (!wplaceBotState.running) {
        break;
      }

      // Then get the current chunk. We will place the pixels based on this information.
      const chunks = [null, null, null, null];
      let currentChunkIndex = 0;

      const coords = [[], [], [], []];
      const colors = [[], [], [], []];

      let charges = Math.floor(wplaceBotState.charges.count);

      // Apply energy limit if set
      if (config.energyLimit && config.energyLimit > 0) {
        charges = Math.min(charges, config.energyLimit);
        console.log(
          `Energy limit applied: using ${charges}/${wplaceBotState.charges.count} available charges (limit: ${config.energyLimit})`,
        );
      }

      const CHUNK_SIZE = 1000;

      // Reset progress tracking
      wplaceBotState.progress = { correct: 0, total: 0, analyzing: true };

      // Update progress UI
      const progressEl = document.getElementById("paintingProgress");
      if (progressEl) {
        progressEl.value = "🎨 Analyzing...";
        progressEl.title = "Analyzing template vs current canvas";
      }

      // First pass: Count total template pixels (only enabled colors)
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const imagePixelId = indicesArray[y][x];
          // Skip transparent pixels
          if (imagePixelId !== 0) {
            // Check if this color is enabled in the color filter
            if (config.colorFilter?.[imagePixelId.toString()]) {
              if (!config.colorFilter[imagePixelId.toString()].enabled) {
                // Skip disabled colors in count too
                continue;
              }
            }
            wplaceBotState.progress.total++;
          }
        }
      }

      // Second pass: Add the points we will paint (limited by charges)
      for (let y = 0; y < height && charges > 0; ++y) {
        for (let x = 0; x < width && charges > 0; ++x) {
          const imagePixelId = indicesArray[y][x];

          // Skip transparent.
          if (imagePixelId === 0) {
            continue;
          }

          // Check if this color is enabled in the color filter
          if (config.colorFilter?.[imagePixelId.toString()]) {
            if (!config.colorFilter[imagePixelId.toString()].enabled) {
              // Skip disabled colors
              continue;
            }
          }
          let chunkX = x + startPoint.pixel.x;
          let chunkY = y + startPoint.pixel.y;

          if (chunkX >= CHUNK_SIZE && chunkY >= CHUNK_SIZE) {
            // Fetch the right down chunk
            currentChunkIndex = 3;
            if (!chunks[currentChunkIndex]) {
              chunks[currentChunkIndex] = await getChunkPixels({
                x: startPoint.tile.x + 1,
                y: startPoint.tile.y + 1,
              });
            }
            chunkX -= CHUNK_SIZE;
            chunkY -= CHUNK_SIZE;
          } else if (chunkX >= CHUNK_SIZE) {
            // Fetch the right chunk
            currentChunkIndex = 1;
            if (!chunks[currentChunkIndex]) {
              chunks[currentChunkIndex] = await getChunkPixels({
                x: startPoint.tile.x + 1,
                y: startPoint.tile.y,
              });
            }
            chunkX -= CHUNK_SIZE;
          } else if (chunkY >= CHUNK_SIZE) {
            // Fetch the down chunk
            currentChunkIndex = 2;
            if (!chunks[currentChunkIndex]) {
              chunks[currentChunkIndex] = await getChunkPixels({
                x: startPoint.tile.x,
                y: startPoint.tile.y + 1,
              });
            }
            chunkY -= CHUNK_SIZE;
          } else {
            currentChunkIndex = 0;
            if (!chunks[currentChunkIndex]) {
              chunks[currentChunkIndex] = await getChunkPixels(startPoint.tile);
            }
          }

          const chunk = chunks[currentChunkIndex];

          if (!chunk) {
            // Could not fetch the chunk
            throw new Error();
          }

          let chunkPixelIndex = (chunkX + chunk.width * chunkY) * 4;
          if (chunk.width > CHUNK_SIZE) {
            // Chunk should always be 1000.
            // This means Blue Marble user script is open.
            // Multiply the chunk indices by 3.
            chunkPixelIndex *= 3;
          }

          // Fetch the chunk colors.
          const chunkR = chunk.pixels[chunkPixelIndex];
          const chunkG = chunk.pixels[chunkPixelIndex + 1];
          const chunkB = chunk.pixels[chunkPixelIndex + 2];
          const chunkA = chunk.pixels[chunkPixelIndex + 3];

          const newPixelColor = ALL_COLORS_BY_ID[imagePixelId];

          if (!newPixelColor) {
            console.error(
              "Pixelbot: input image had invalid color, imagePixelId: ",
              imagePixelId,
            );
            // Skip this pixel.
            continue;
          }

          const oldPixelId = findNearestColorId({
            r: chunkR,
            g: chunkG,
            b: chunkB,
            a: chunkA,
          });

          if (parseInt(oldPixelId, 10) === imagePixelId) {
            // We don't have to color this pixel.
            // Its already been colored.
            wplaceBotState.progress.correct++;
            continue;
          }

          coords[currentChunkIndex].push(chunkX, chunkY);
          colors[currentChunkIndex].push(imagePixelId);

          charges -= 1;
        }
      }

      // Update final progress
      wplaceBotState.progress.analyzing = false;
      // Reuse progressEl from above
      if (progressEl && wplaceBotState.progress.total > 0) {
        const percentage = Math.round(
          (wplaceBotState.progress.correct / wplaceBotState.progress.total) *
            100,
        );
        progressEl.value = `🎨 ${wplaceBotState.progress.correct}/${wplaceBotState.progress.total} (${percentage}%)`;
        progressEl.title = `Painting Progress: ${wplaceBotState.progress.correct} pixels already correct, ${wplaceBotState.progress.total - wplaceBotState.progress.correct} need painting (${percentage}% complete)`;
        console.log(
          `Template analysis: ${wplaceBotState.progress.correct}/${wplaceBotState.progress.total} pixels already correct (${percentage}%)`,
        );
      }

      if (coords.every((array) => array.length === 0) && charges > 0) {
        console.log("Pixelbot finished! Keep the bot open to avoid invasions.");
        await sleepForMs(30000);
        continue;
      }

      console.log("Sending paint request: ", coords, " ", colors);

      // Find the first chunk that has pixels to paint (one chunk per captcha token)
      let response = null;
      if (coords[0].length !== 0) {
        response = await hookPaint(startPoint.tile, coords[0], colors[0]);
      } else if (coords[1].length !== 0) {
        response = await hookPaint(
          { x: startPoint.tile.x + 1, y: startPoint.tile.y },
          coords[1],
          colors[1],
        );
      } else if (coords[2].length !== 0) {
        response = await hookPaint(
          { x: startPoint.tile.x, y: startPoint.tile.y + 1 },
          coords[2],
          colors[2],
        );
      } else if (coords[3].length !== 0) {
        response = await hookPaint(
          { x: startPoint.tile.x + 1, y: startPoint.tile.y + 1 },
          coords[3],
          colors[3],
        );
      }

      const responses = response ? [response] : [];

      let hasRefreshError = false;

      for (const paintResponse of responses) {
        if (!paintResponse.ok) {
          console.error(
            "Pixelbot: Error paint request rejected: ",
            paintResponse.status,
          );

          // Check if this is a "refresh" error and handle it
          const errorText = await paintResponse
            .text()
            .catch(() => "Could not read response body");

          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error === "refresh") {
              hasRefreshError = true;
            }
          } catch (_e) {
            // Not JSON, ignore
          }
        } else {
          paintResponse.json().then((result) => {
            console.log(`Successfuly painted ${result.painted} pixels.`);
          });
        }
      }

      // If we got a refresh error, wait for a new captcha token
      if (hasRefreshError) {
        const startTime = Date.now();
        const timeout = 30000; // 30 seconds timeout

        while (wplaceBotState.running && Date.now() - startTime < timeout) {
          await sleepForMs(1000);
          if (isContextReady()) {
            break;
          }
        }

        if (!isContextReady()) {
          console.warn("Timeout waiting for fresh captcha token");
        }
      }

      // Fetch charges to get the most updated value.
      await autoFetchCharges();

      // Wait a bit before sending a request again (randomized for human-like behavior)
      const randomDelay = Math.floor(Math.random() * 3000) + 4000; // 4-7 seconds
      await sleepForMs(randomDelay);
    } catch (exception) {
      console.error(exception);
      await sleepForMs(5000);
      await fetchUserInfo();
    }
  }

  // Reset progress display when bot stops
  const resetProgressEl = document.getElementById("paintingProgress");
  if (resetProgressEl) {
    resetProgressEl.value = "🎨 -/-";
    resetProgressEl.title =
      "Painting Progress: Shows when bot is analyzing template";
  }

  console.log("Pixelbot stopped.");
};

// Expose functions and state globally for popup.js
window.startWplaceBot = _startWplaceBot;
window.wplaceBotState = wplaceBotState;
window.getCurrentDrawingConfig = getCurrentDrawingConfig;
window.setCurrentDrawingConfig = setCurrentDrawingConfig;
window.getCurrentTileAndPixel = getCurrentTileAndPixel;

// Debug: Check if all functions are properly exposed
console.log("WPlace Bot functions exposed:", {
  startWplaceBot: typeof window.startWplaceBot,
  wplaceBotState: typeof window.wplaceBotState,
  getCurrentDrawingConfig: typeof window.getCurrentDrawingConfig,
  setCurrentDrawingConfig: typeof window.setCurrentDrawingConfig,
  getCurrentTileAndPixel: typeof window.getCurrentTileAndPixel,
  setWplaceBotCurrentTileAndPixel:
    typeof window.setWplaceBotCurrentTileAndPixel,
});
