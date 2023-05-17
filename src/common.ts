import * as core from "@actions/core";

import { ChildProcess, IOType, spawn } from "node:child_process";

import { Stream } from "node:stream";

export function setupUncaughtHook() {
    process.on("uncaughtException", (error) => {
        core.info(`[warning] Uncaught exception: ${error.message}`);
    });
}

export function computeCacheKey(): string {
    const customCacheSuffix = core.getInput("cache-suffix");
    return "docker-image-cache" +
        (customCacheSuffix ? `-${customCacheSuffix}` : "");
}

export function awaitExit(
    child: ChildProcess,
): Promise<number | NodeJS.Signals> {
    return new Promise((resolve, _reject) => {
        child.addListener("exit", (exitCode, signal) => {
            // Either of them is always present
            resolve(exitCode !== null ? exitCode : signal!);
        });
    });
}

export function execCommand(
    cmd: string,
    args: string[],
    stdin: IOType | Stream = "ignore",
    stdout: IOType | Stream = "pipe",
    signal?: AbortSignal,
): ChildProcess {
    const child = spawn(cmd, args, {
        signal,
        stdio: [stdin, stdout, "inherit"],
        detached: false,
    });
    return child;
}

export function listDiff<T>(a: T[], b: T[]): Set<T> {
    const setA = new Set(a);
    const setB = new Set(b);

    const aMinusB = a.filter((elem) => !setB.has(elem));
    const bMinusA = b.filter((elem) => !setA.has(elem));

    return new Set([...aMinusB, ...bMinusA]);
}
