'use strict';

const threads = require("node:worker_threads");
const { once, EventEmitter } = require("node:events");
const { reject, STATUSES, modulePath } = require("./utils.js");
const { resolve } = require("node:path");

/**
 * @implements
 * use sharedArrayBuffer as queue, put data, read, clear buffer,
 * use queue or locks to ensure data correctness
 */

const THREAD_WORKER_FILE = resolve(__dirname, "./thread.js");

class ThreadAdapter extends EventEmitter {
  #worker = null;
  #status = 0;
  #options = null;

  constructor(options) {
    super();
    this.#options = options;
  }

  #modulePaths() {
    const modules = this.#options.modules;
    const paths = [];
    for (const entry of Object.entries(modules)) {
      paths.push({ name: entry[0], path: modulePath(entry[1]) });
    }
    return paths;
  }

  async start(config) {
    if (this.#status !== 0) return;
    const workerData = {
      options: {
        key: this.#options.key,
        interval: this.#options.interval,
        modules: this.#modulePaths(),
      },
      config,
    }
    const worker = this.#worker = new threads.Worker(
      THREAD_WORKER_FILE, { workerData },
    );
    worker.on("error", err => void this.emit("error", err));
    await once(worker, "online");
    worker.postMessage({ status: "start" });
    const message = await once(worker, "message");
    if (message[0].status !== "start") {
      throw new Error('Worker was not started');
    }
    this.#status = 1;
    this.emit("connect");
  }

  async stop(ms = 5000) {
    if (this.#status !== 1) return;
    this.#status = 2;
    this.#worker.postMessage({ status: "stop", data: { ms } });
    await Promise.race([once(worker, "exit"), reject(ms)]);
    this.#status = 3;
    this.emit("disconnect");
  }

  async add(value, score = Date.now()) {
    if (this.#status !== 1) return;
    this.#worker.postMessage({
      status: "add",
      data: { value, score }
    });
  }

  static create(options) {
    return new ThreadAdapter(Object.assign({}, options));
  }

  get status() {
    return STATUSES[this.#status];
  }
}

module.exports = { ThreadAdapter };