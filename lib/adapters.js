'use strict';

const threads = require("node:worker_threads");
const { once, EventEmitter } = require("node:events");
const { reject, STATUSES } = require("./utils.js");

/**
 * @implements
 * use sharedArrayBuffer as queue, put data, read, clear buffer,
 * use queue or locks to ensure data correctness
 */

class ThreadAdapter extends EventEmitter {
  #worker = null;
  #status = 0;
  #options = null;

  constructor(options) {
    super();
    this.#options = options;
  }

  async start(config) {
    if (this.#status !== 0) return;
    // get path to modules, pass to worker, require inside of the worker
    worker = new threads.Worker(__filename,
      { workerData: { options: this.#options, config, }, },
    );
    worker.on("error", err => void this.emit("error", err));
    await once(worker, "online");
    worker.postMessage({ status: "start" });
    const message = await once(worker, "message");
    if (message.status !== "start") {
      throw new Error('Worker was not started');
    }
    this.#status = 1;
    this.emit("connect");
  }

  async stop(ms = 5000) {
    if (this.#status !== 1) return;
    this.#status = 2;
    worker.postMessage({ status: "stop" });
    await Promise.race([once(worker, "exit"), reject(ms)]);
    this.#status = 3;
    this.emit("disconnect");
  }


  async add(value, score = Date.now()) {
    if (this.#status !== 1) return;
    worker.postMessage({ status: "add", data: { value, score } });
  }

  static create(options) {
    return new ThreadAdapter(Object.assign({}, options));
  }

  get status() {
    return STATUSES[this.#status];
  }
}

module.exports = { ThreadAdapter };