import { awaitExit, execCommand } from "./common";
import { execPromise } from "./promisified";
import { open } from "fs/promises";

export async function loadDockerImage(
    path: string,
    signal?: AbortSignal,
): Promise<number | NodeJS.Signals> {
    const inputFile = await open(path, "r");
    const input = inputFile.createReadStream();

    try {
        const process = execCommand(
            "docker",
            ["image", "load"],
            input,
            undefined,
            signal,
        );
        return awaitExit(process);
    } finally {
        input.close();
        inputFile.close();
    }
}

export async function saveDockerImage(
    image: string,
    path: string,
    signal?: AbortSignal,
): Promise<number | NodeJS.Signals> {
    const outputFile = await open(path, "w");
    const output = outputFile.createWriteStream();

    try {
        const process = execCommand(
            "docker",
            ["image", "save", image],
            undefined,
            output,
            signal,
        );
        const exitCode = await awaitExit(process);

        await outputFile.sync();
        await outputFile.close();

        return exitCode;
    } finally {
        output.close();
        outputFile.close();
    }
}

export async function resolveDockerImageID(imageRef: string): Promise<string> {
    const { stdout } = await execPromise("docker", [
        "image",
        "inspect",
        "--format={{ .ID }}",
        imageRef,
    ]);
    const imageId = stdout.trim();
    if (!imageId) {
        throw new Error(`Failed to resolve image id from ref "${imageRef}"`);
    }

    return imageId;
}

export async function listDockerImages(): Promise<string[]> {
    const { stdout } = await execPromise("docker", [
        "image",
        "list",
        "--format={{ .Repository }}:{{ .Tag }}",
    ]);
    const imagesRaw = stdout.trim();
    if (!imagesRaw) {
        return [];
    }

    return imagesRaw.split("\n").map((elem) => elem.trim());
}

export async function tagDockerImage(
    imageRef: string,
    tag: string,
): Promise<void> {
    await execPromise("docker", ["image", "tag", imageRef, tag]);
}
