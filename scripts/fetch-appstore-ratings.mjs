import { readFile, writeFile } from "node:fs/promises";

const appId = "6748068771";

const getStorefronts = async () => {
	try {
		const listUrl = new URL("../src/data/iso-countries.json", import.meta.url);
		const raw = await readFile(listUrl, "utf-8");
		const data = JSON.parse(raw);
		const codes = Array.isArray(data) ? data : data?.codes;

		if (Array.isArray(codes) && codes.length > 0) {
			return codes
				.filter((code) => typeof code === "string" && /^[a-z]{2}$/.test(code))
				.map((code) => code.toLowerCase());
		}
	} catch (error) {
		console.warn("Failed to read ISO storefront list", error);
	}

	return [];
};

const storefronts = await getStorefronts();

const lookupForCountry = async (code) => {
	try {
		const res = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=${code}`);
		const json = await res.json();
		const result = json?.results?.[0];
		return {
			code,
			rating: result?.averageUserRating ?? null,
			ratingCount: result?.userRatingCount ?? 0,
		};
	} catch (error) {
		console.warn(`Failed to fetch ${code}`, error);
		return {
			code,
			rating: null,
			ratingCount: 0,
		};
	}
};

const runInBatches = async (items, batchSize) => {
	const results = [];
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchResults = await Promise.all(batch.map(lookupForCountry));
		results.push(...batchResults);
	}
	return results;
};

const storefrontResults = await runInBatches(storefronts, 10);
const storefrontsWithRatings = storefrontResults
	.filter((item) => item.ratingCount > 0)
	.sort((a, b) => b.ratingCount - a.ratingCount);
const storefrontsWithoutResults = storefrontResults
	.filter((item) => item.ratingCount === 0 && item.rating === null)
	.map((item) => item.code);

const totals = storefrontResults.reduce(
	(acc, item) => {
		if (item.rating && item.ratingCount) {
			acc.weightedSum += item.rating * item.ratingCount;
			acc.count += item.ratingCount;
		}
		return acc;
	},
	{ weightedSum: 0, count: 0 }
);

const output = {
	appId,
	generatedAt: new Date().toISOString(),
	storefrontCount: storefronts.length,
	count: totals.count,
	average: totals.count ? Number((totals.weightedSum / totals.count).toFixed(4)) : null,
	storefrontsWithRatings,
	storefrontsWithoutResults,
};

const outputUrl = new URL("../src/data/global-ratings.json", import.meta.url);
await writeFile(outputUrl, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Saved ratings to ${outputUrl.pathname}`);
