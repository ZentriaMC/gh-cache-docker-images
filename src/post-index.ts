import * as core from "@actions/core";
import * as cache from "@actions/cache";

import { computeCacheKey, listDiff, setupUncaughtHook } from "./common.js";
import { listDockerImages, resolveDockerImageID } from "./docker.js";
import { saveImages } from "./image.js";
import { CACHE_DIRECTORY, EXISTING_IMAGES } from "./state.js";

export async function postEntrypoint() {
    setupUncaughtHook();

    let existingImages: string[];
    try {
        existingImages = JSON.parse(core.getState(EXISTING_IMAGES));
    } catch (err) {
        core.error(`failed to load existing images state: ${err.message}`);
        existingImages = [];
    }

    core.debug(`main step told me about ${existingImages.length} image(s)`);

    const currentImages = await listDockerImages();
    const newImages = listDiff(existingImages, currentImages);
    if (newImages.size < 1) {
        core.debug(`no difference between images`);
        return;
    }

    core.debug(`${newImages.size} new image(s) to cache`);

    const newImageIds = await Promise.all(
        Array.from(newImages).map((image) => resolveDockerImageID(image)),
    );

    const cacheDir = core.getState(CACHE_DIRECTORY) || "docker-images";
    if (!cacheDir) {
        throw new Error("Cache directory not set via state");
    }

    // TODO: parallel
    for await (
        const { imageId, exitCode } of saveImages(cacheDir, newImageIds)
    ) {
        if (exitCode !== 0) {
            core.warning(
                `failed to save image "${imageId}" - process exited with ${exitCode}`,
            );
            continue;
        }

        core.debug(`saved image "${imageId}"`);
    }

    const cacheKey = computeCacheKey();
    const cacheId = await cache.saveCache([cacheDir], cacheKey);
    if (cacheId) {
        core.debug(`all images cached (cache id is "${cacheId}")`);
    }
}

postEntrypoint().catch((error) => {
    core.setFailed(error);
});
