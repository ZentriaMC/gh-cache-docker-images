import { promisify } from "node:util";
import { execFile } from "node:child_process";

export const execPromise = /*#__PURE__*/ promisify(execFile);
