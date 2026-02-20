import { writeFile } from "node:fs/promises";

const appId = "6748068771";
const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}&country=us`;

const lookupRes = await fetch(lookupUrl);
const lookupJson = await lookupRes.json();
const app = lookupJson?.results?.[0];
const iconUrl = app?.artworkUrl512 ?? app?.artworkUrl100;

if (!iconUrl) {
	throw new Error("App icon URL not found in lookup response.");
}

const iconRes = await fetch(iconUrl);
if (!iconRes.ok) {
	throw new Error(`Failed to fetch icon: ${iconRes.status} ${iconRes.statusText}`);
}

const buffer = Buffer.from(await iconRes.arrayBuffer());
const appIconPath = new URL("../public/app-icon.png", import.meta.url);
const appleTouchPath = new URL("../public/apple-touch-icon.png", import.meta.url);

await writeFile(appIconPath, buffer);
await writeFile(appleTouchPath, buffer);

console.log("Saved app icon to public/app-icon.png and public/apple-touch-icon.png");
