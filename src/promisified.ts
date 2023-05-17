import { promisify } from "util";
import { execFile } from "child_process";

export const execPromise = /*#__PURE__*/ promisify(execFile);
