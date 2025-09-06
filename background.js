// Background script for wplace bot
console.log("🚀 Background script starting...");

// Debug: Check what globals are available
console.log("🔍 Available globals:", {
  window: typeof window,
  self: typeof self,
  globalThis: typeof globalThis,
  PixelbotOverride_window: typeof window?.PixelbotOverride,
  PixelbotOverride_self: typeof self?.PixelbotOverride,
  PixelbotOverride_global: typeof globalThis?.PixelbotOverride,
});

// Try different global contexts
let getOverrideScript;
if (typeof globalThis?.PixelbotOverride?.getOverrideScript === "function") {
  getOverrideScript = globalThis.PixelbotOverride.getOverrideScript;
  console.log("✅ Found getOverrideScript in globalThis");
} else if (typeof self?.PixelbotOverride?.getOverrideScript === "function") {
  getOverrideScript = self.PixelbotOverride.getOverrideScript;
  console.log("✅ Found getOverrideScript in self");
} else if (typeof window?.PixelbotOverride?.getOverrideScript === "function") {
  getOverrideScript = window.PixelbotOverride.getOverrideScript;
  console.log("✅ Found getOverrideScript in window");
}

if (!getOverrideScript) {
  console.error(
    "❌ getOverrideScript not available, script interception will fail",
  );
} else {
  console.log("✅ getOverrideScript loaded successfully");
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    if (url.includes("__internal__")) {
      return;
    }

    if (
      url.includes("/_app/immutable/nodes/") &&
      url.includes("4.") &&
      url.endsWith(".js")
    ) {
      console.log("🔧 Intercepting main application script:", url);

      const filter = chrome.webRequest.filterResponseData(details.requestId);
      const chunks = [];

      filter.ondata = (event) => {
        chunks.push(event.data);
      };

      filter.onstop = async () => {
        try {
          // Convert chunks to text
          const decoder = new TextDecoder();
          const scriptText = chunks
            .map((chunk) => decoder.decode(chunk, { stream: true }))
            .join("");
          console.log("📝 Original script length:", scriptText.length);

          const overrideScript = getOverrideScript(scriptText);
          if (overrideScript) {
            const modifiedScript = overrideScript.replace(
              /\.\.\/chunks\//g,
              "https://wplace.live/_app/immutable/chunks/",
            );
            console.log(
              "✅ Override script created, length:",
              modifiedScript.length,
            );

            // Convert modified script back to ArrayBuffer and write
            const encoder = new TextEncoder();
            const modifiedBuffer = encoder.encode(modifiedScript);
            filter.write(modifiedBuffer);
          } else {
            console.warn(
              "❌ getOverrideScript returned null, passing through original",
            );
            // Write original data if modification failed
            for (const chunk of chunks) {
              filter.write(chunk);
            }
          }
        } catch (error) {
          console.error("❌ Error in script modification:", error);
          // Write original data on error
          for (const chunk of chunks) {
            filter.write(chunk);
          }
        }
        filter.disconnect();
      };
    }
  },
  { urls: ["*://wplace.live/*"] },
  ["blocking"],
);

let overlayMessage = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    console.log("📨 Received message in background:", message);
    overlayMessage = message;
    // Send acknowledgment to prevent connection error
    sendResponse({ success: true });
    return true; // Keep message channel open for async responses
  } catch (error) {
    console.error("❌ Error handling message in background:", error);
    sendResponse({ success: false, error: error.message });
    return true;
  }
});

/**
 * Draw Blue Marble-style overlay using their exact method
 * Scale by 3x and only show center pixels (x%3===1 && y%3===1)
 * @param {Object} tile - Tile coordinates
 * @param {ImageData} imageData - Canvas image data to modify
 * @returns {ImageData} Modified image data with overlay
 */
function drawOverlay({ tileX, tileY }, imageData) {
  if (!overlayMessage) {
    return imageData;
  }

  const { pixels, startPoint, width, height } = overlayMessage;

  if (!pixels || !startPoint || !width || !height) {
    return imageData;
  }

  // Check if this tile intersects with the template
  if (
    tileX < startPoint.tile.x ||
    tileY < startPoint.tile.y ||
    tileX > startPoint.tile.x + 1 ||
    tileY > startPoint.tile.y + 1
  ) {
    return imageData;
  }

  // Always use classic alpha blending overlay
  return drawClassicBlendStyle({ tileX, tileY }, imageData);
}

/**
 * Classic alpha blending overlay style
 */
function drawClassicBlendStyle({ tileX, tileY }, imageData) {
  const { pixels, startPoint, width, height } = overlayMessage;
  const chunkSize = imageData.width;
  const offsetX = Math.min(chunkSize - startPoint.pixel.x, width);
  const offsetY = Math.min(chunkSize - startPoint.pixel.y, height);

  const startPointPixel = { x: startPoint.pixel.x, y: startPoint.pixel.y };

  let startX = 0;
  let startY = 0;
  let endX = width;
  let endY = height;

  if (tileX === startPoint.tile.x + 1) {
    startX = offsetX;
    startPointPixel.x -= chunkSize;
  } else {
    endX = offsetX;
  }

  if (tileY === startPoint.tile.y + 1) {
    startY = offsetY;
    startPointPixel.y -= chunkSize;
  } else {
    endY = offsetY;
  }

  if (startX < 0 || startY < 0 || endX < 0 || endY < 0) {
    return imageData;
  }

  // Apply alpha blending
  for (let y = startY; y < endY; ++y) {
    for (let x = startX; x < endX; ++x) {
      const color = pixels[y][x];

      if (!color || color.name === "Transparent") {
        continue;
      }

      const index =
        (x + startPointPixel.x + (y + startPointPixel.y) * chunkSize) * 4;
      const blend = 0.5;
      const existingAlpha = imageData.data[index + 3] / 255;
      const newAlpha = blend;
      const outAlpha = existingAlpha + newAlpha * (1 - existingAlpha);

      imageData.data[index] = Math.floor(
        (imageData.data[index] * existingAlpha * (1 - newAlpha) +
          (color.r || 0) * newAlpha) /
          outAlpha,
      );
      imageData.data[index + 1] = Math.floor(
        (imageData.data[index + 1] * existingAlpha * (1 - newAlpha) +
          (color.g || 0) * newAlpha) /
          outAlpha,
      );
      imageData.data[index + 2] = Math.floor(
        (imageData.data[index + 2] * existingAlpha * (1 - newAlpha) +
          (color.b || 0) * newAlpha) /
          outAlpha,
      );
      imageData.data[index + 3] = Math.floor(outAlpha * 255);
    }
  }

  return imageData;
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes("__internal__")) {
      return;
    }
    const filter = chrome.webRequest.filterResponseData(details.requestId);
    const chunks = [];

    filter.ondata = (event) => {
      chunks.push(event.data);
    };

    filter.onstop = async () => {
      try {
        const split = details.url.split("/");
        const tileX = parseInt(split[6], 10);
        const tileY = parseInt(split[7].split(".")[0], 10);

        console.log(`Intercepted tile request: x: ${tileX} y: ${tileY}`);

        // Build original blob
        const blob = new Blob(chunks);

        // Decode image
        const imageBitmap = await createImageBitmap(blob);

        // Draw onto canvas
        const canvas = new OffscreenCanvas(
          imageBitmap.width,
          imageBitmap.height,
        );
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imageBitmap, 0, 0);

        // Manipulate pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const newTile = drawOverlay({ tileX, tileY }, imageData);

        ctx.putImageData(newTile, 0, 0);

        // Encode back to PNG
        const modifiedBlob = await canvas.convertToBlob({ type: "image/png" });
        const buf = new Uint8Array(await modifiedBlob.arrayBuffer());

        // Write modified image back
        filter.write(buf);
      } catch (err) {
        console.error("Error decoding intercepted image:", err);
      }

      filter.disconnect();
    };
  },
  { urls: ["*://backend.wplace.live/files/*"] },
  ["blocking"],
);
