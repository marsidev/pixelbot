import { getOverrideScript } from "./dist/override.js";

chrome.webRequest.onBeforeRequest.addListener(
	async (details) => {
		const url = details.url;
		if (url.includes("__internal__")) {
			return;
		}

		if (url.includes('/_app/immutable/nodes/2.') && url.endsWith('.js')) {
			console.log("Intercepting script");

			const response = await fetch(details.url + "?__internal__");
			const scriptText = await response.text();
			const overrideScript = getOverrideScript(scriptText).replace(/\.\.\/chunks\//g, "https://wplace.live/_app/immutable/chunks/");

			const dataUrl = "data:text/javascript;charset=utf-8," + encodeURIComponent(overrideScript);
			return { redirectUrl: dataUrl };
		}
	},
	{ urls: ["*://wplace.live/*"] },
	["blocking"]
);

let overlayMessage = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	overlayMessage = message;
});


function drawOverlay({ tileX, tileY }, imageData) {
	if (!overlayMessage) {
		return imageData;
	}

	const {
		pixels,
		startPoint,
		width,
		height
	} = overlayMessage;

	if (!pixels || !startPoint || !width || !height) {
		return imageData;
	}

	if (tileX < startPoint.tile.x || tileY < startPoint.tile.y || tileX > startPoint.tile.x + 1 || tileY > startPoint.tile.y + 1) {
		return imageData;
	}

	const chunkSize = imageData.width;
	const offsetX = Math.min(chunkSize - startPoint.pixel.x, width);
	const offsetY = Math.min(chunkSize - startPoint.pixel.y, height);

	let startPointPixel = { x: startPoint.pixel.x, y: startPoint.pixel.y };

	let startX = 0;
	let startY = 0;
	let endX = width;
	let endY = height;

	if (tileX === startPoint.tile.x + 1) {
		startX = offsetX;
		startPointPixel.x -= chunkSize;
	} else {
		// tileX === startPoint.tile.x
		endX = offsetX;
	}

	if (tileY === startPoint.tile.y + 1) {
		startY = offsetY;
		startPointPixel.y -= chunkSize;
	} else {
		// tileY === startPoint.tile.y
		endY = offsetY
	}

	if (startX < 0 || startY < 0 || endX < 0 || endY < 0) {
		return imageData;
	}
	console.log({ endX, endY, startX, startY, x: JSON.stringify(startPointPixel) })

	for (let y = startY; y < endY; ++y) {
		for (let x = startX; x < endX; ++x) {
			const color = pixels[y][x];

			// Skip transparent.
			if (color.name === "Transparent") {
				continue;
			}
			const index = ((x + startPointPixel.x) + (y + startPointPixel.y) * chunkSize) * 4;
			const blend = 0.5;
			const existingAlpha = imageData.data[index + 3] / 255;
			const newAlpha = blend;
			const outAlpha = existingAlpha + newAlpha * (1 - existingAlpha);

			imageData.data[index] = Math.floor(
				(imageData.data[index] * existingAlpha * (1 - newAlpha) + color.r * newAlpha) / outAlpha
			);
			imageData.data[index + 1] = Math.floor(
				(imageData.data[index + 1] * existingAlpha * (1 - newAlpha) + color.g * newAlpha) / outAlpha
			);
			imageData.data[index + 2] = Math.floor(
				(imageData.data[index + 2] * existingAlpha * (1 - newAlpha) + color.b * newAlpha) / outAlpha
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
		let chunks = [];

		filter.ondata = (event) => {
			chunks.push(event.data);
		};

		filter.onstop = async () => {
			try {
				const split = details.url.split('/');
				const tileX = parseInt(split[6]);
				const tileY = parseInt(split[7].split('.')[0]);

				console.log(`Intercepted tile request: x: ${tileX} y: ${tileY}`);

				// Build original blob
				const blob = new Blob(chunks);

				// Decode image
				const imageBitmap = await createImageBitmap(blob);

				// Draw onto canvas
				const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
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
	["blocking"]
);
