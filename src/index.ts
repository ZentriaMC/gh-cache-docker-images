import * as core from "@actions/core";
import * as cache from "@actions/cache";

import { computeCacheKey, setupUncaughtHook } from "./common.js";
import { listDockerImages } from "./docker.js";
import { loadImages } from "./image.js";
import { CACHE_DIRECTORY, EXISTING_IMAGES, OUTPUT_CACHE_HIT } from "./state.js";

export async function entrypoint() {
    setupUncaughtHook();

    const existingImages = await listDockerImages();
    core.saveState(EXISTING_IMAGES, JSON.stringify(existingImages));
    core.debug(`aware of ${existingImages.length} existing image(s)`);

    // Setup cache
    const cacheDir = "docker-images";
    const cacheKey = computeCacheKey();
    const restoredCacheKey = await cache.restoreCache([cacheDir], cacheKey);

    if (restoredCacheKey) {
        core.debug(`restored image cache from cache key "${restoredCacheKey}"`);

        // Load all images
        const loadedImages = await loadImages(cacheDir);
        core.info(`loaded ${loadedImages.length} image(s) from cache`);
    }

    core.saveState(CACHE_DIRECTORY, cacheDir);
    core.setOutput(OUTPUT_CACHE_HIT, restoredCacheKey !== undefined);
}

entrypoint().catch((error) => {
    core.setFailed(error);
});
