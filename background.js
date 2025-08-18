import { getOverrideScript } from "./dist/override.js";


chrome.webRequest.onBeforeRequest.addListener(
	(details) => {
		if (details.type === "main_frame") {
			const filter = chrome.webRequest.filterResponseData(details.requestId);
			const decoder = new TextDecoder("utf-8");
			const encoder = new TextEncoder();
			let data = "";

			filter.ondata = (event) => {
				data += decoder.decode(event.data, { stream: true });
			};

			filter.onstop = () => {
				// Remove integrity attributes from all <script> tags
				data = data.replace(/<script\b([^>]*)\bintegrity\s*=\s*["'][^"']*["']([^>]*)>/gi, '<script$1$2>');
				console.log("Removed integrity attributes");

				// Write modified HTML back
				filter.write(encoder.encode(data));
				filter.disconnect();
			};
			filter.onerror = (error) => {
				console.error(error);
			}
		}
	},
	{ urls: ["*://wplace.live/*"] },
	["blocking"]
);

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