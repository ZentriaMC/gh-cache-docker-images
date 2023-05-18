import * as core from "@actions/core";
import * as glob from "@actions/glob";

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";

import {
    getDockerImageInfo,
    loadDockerImage,
    resolveDockerImageID,
    saveDockerImage,
    tagDockerImage,
} from "./docker.js";

import type { ImageMetadata } from "./meta.js";

export async function saveDockerImageMetadata(
    imageRef: string,
    path: string,
): Promise<void> {
    const inspect: {
        Id: string;
        RepoTags: string[];
    } = await getDockerImageInfo(imageRef);

    const metadata: ImageMetadata = {
        Id: inspect.Id,
        RepoTags: inspect.RepoTags,
    };

    await writeFile(path, JSON.stringify(metadata), { encoding: "utf-8" });
}

export async function loadImage(metadataFile: string): Promise<string> {
    const archiveFile = metadataFile.replace(/\.meta$/, "");
    const metadata: ImageMetadata = JSON.parse(
        await readFile(metadataFile, { encoding: "utf-8" }),
    );

    let doLoadImage = true;
    try {
        await resolveDockerImageID(metadata.Id);
        core.debug(`image "${metadata.Id}" already present, skipping loading`);
        doLoadImage = false;
    } catch (err) {
        if (
            !(err instanceof Error) || !err.message.includes("No such image:")
        ) {
            throw err;
        }
    }

    if (doLoadImage) {
        core.debug(`loading image from "${archiveFile}"`);
        await loadDockerImage(archiveFile);
    }

    // Ensure that image has necessary tags
    for (const repoTag of metadata.RepoTags) {
        await tagDockerImage(metadata.Id, repoTag);
    }

    core.debug(`loaded image "${metadata.Id}" with tags ${metadata.RepoTags}`);

    return metadata.Id;
}

export async function loadImages(cacheDir: string): Promise<string[]> {
    const loadedImageIds: string[] = [];

    const globber = await glob.create(`${cacheDir}/*.tar.meta`);

    for await (const metadataFile of globber.globGenerator()) {
        const loadedId = await loadImage(metadataFile);
        loadedImageIds.push(loadedId);
    }

    return loadedImageIds;
}

export async function* saveImages(cacheDir: string, imageIds: string[]) {
    await mkdir(cacheDir, { recursive: true });

    for (const imageId of imageIds) {
        const imagePath = path.join(cacheDir, `${imageId}.tar`);
        const metadataPath = path.join(cacheDir, `${imageId}.tar.meta`);

        try {
            await access(metadataPath, fs.constants.R_OK);
            core.debug(
                `image metadata "${metadataPath}" exists, skipping saving`,
            );
            continue;
        } catch (err) {
            if (!("code" in err) || err.code !== "ENOENT") {
                throw err;
            }

            // no-op
        }

        core.debug(`saving image "${imageId}" to "${imagePath}"`);

        yield saveDockerImageMetadata(imageId, metadataPath)
            .then(() => saveDockerImage(imageId, imagePath))
            .then((exitCode) => ({ imageId, exitCode }));
    }
}
