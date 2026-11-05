const { fork } = require("node:child_process");
const path = require("node:path");

const children = new Set();
const env = { ...process.env, NODE_ENV: "production", RENDER: "true" };
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
  }, 8_000).unref();
}

function start(file) {
  const child = fork(path.resolve(__dirname, "../dist", file), [], { env });
  children.add(child);
  child.once("exit", () => {
    children.delete(child);
    if (!stopping) {
      process.stderr.write(`Render process exited: ${file}\n`);
      stop(1);
    }
  });
  child.once("error", () => {
    process.stderr.write(`Could not start Render process: ${file}\n`);
    stop(1);
  });
  return child;
}

process.once("SIGTERM", () => stop(0));
process.once("SIGINT", () => stop(0));
const api = start("server.js");
api.on("message", (message) => {
  if (message !== "api-ready" || stopping) return;
  api.removeAllListeners("message");
  start("workers/worker.js");
});
