'use strict';

const threads = require("node:worker_threads");
const { once, EventEmitter } = require("node:events");
const { reject, STATUSES, modulePaths } = require("./utils.js");
const { resolve } = require("node:path");
const { fork } = require("node:child_process");

/**
 * @implements
 * use sharedArrayBuffer as queue, put data, read, clear buffer,
 * use queue or locks to ensure data correctness
 */

const THREAD_WORKER_FILE = resolve(__dirname, "./thread.js");
const PROCESS_WORKER_FILE = resolve(__dirname, "./process.js");

class ThreadAdapter extends EventEmitter {
  #worker = null;
  #options = null;
  #status = 0;

  constructor(options) {
    super();
    this.#options = options;
  }

  async start(config) {
    if (this.#status !== 0) return;
    const workerData = {
      options: {
        key: this.#options.key,
        interval: this.#options.interval,
        modules: modulePaths(this.#options.modules),
      },
      config,
    };
    const worker = this.#worker = new threads.Worker(
      THREAD_WORKER_FILE, { workerData },
    );
    worker.on("error", err => void this.emit("error", err));
    await once(worker, "online");
    worker.postMessage({ status: "start" });
    const message = await once(worker, "message");
    if (message[0].status !== "start") {
      throw new Error('Worker was not started', { cause: message.error });
    }
    this.#status = 1;
    this.emit("connect");
  }

  async stop(ms = 5000) {
    if (!this.isRunning) return;
    this.#status = 2;
    this.#worker.postMessage({ status: "stop", data: { ms } });
    await Promise.race([once(this.#worker, "exit"), reject(ms)]);
    this.#worker = null;
    this.#status = 3;
    this.emit("disconnect");
  }

  async add(value, score = Date.now()) {
    if (!this.isRunning) return;
    this.#worker.postMessage({
      status: "add",
      data: { value, score },
    });
  }

  static create(options) {
    return new ThreadAdapter(Object.assign({}, options));
  }

  get status() {
    return STATUSES[this.#status];
  }

  get isRunning() {
    return this.#status === 1;
  }
}

class ProcessAdapter extends EventEmitter {
  #channel = null;
  #options = null;
  #status = 0;

  constructor(options) {
    super();
    this.#options = options;
  }

  async start(config) {
    if (this.#status !== 0) return;
    const data = {
      options: {
        key: this.#options.key,
        interval: this.#options.interval,
        modules: modulePaths(this.#options.modules),
      },
      config,
    };
    const channel = this.#channel =
      fork(PROCESS_WORKER_FILE, [JSON.stringify(data)]);
    channel.on("error", err => void this.emit("error", err));
    await once(channel, "spawn");
    channel.send({ status: "start" });
    const message = await once(channel, "message");
    if (message[0].status !== "start") {
      throw new Error('Channel was not created', { cause: message.error });
    }
    this.#status = 1;
    this.emit("connect");
  }

  async stop(ms = 5000) {
    if (!this.isRunning) return;
    this.#status = 2;
    this.#channel.send({ status: "stop", data: { ms } });
    await Promise.race([once(this.#channel, "exit"), reject(ms)]);
    this.#channel = null;
    this.#status = 3;
    this.emit("disconnect");
  }

  async add(value, score = Date.now()) {
    if (!this.isRunning) return;
    this.#channel.send({
      status: "add",
      data: { value, score },
    });
  }

  static create(options) {
    return new ProcessAdapter(Object.assign({}, options));
  }

  get status() {
    return STATUSES[this.#status];
  }

  get isRunning() {
    return this.#status === 1;
  }
}

module.exports = { ThreadAdapter, ProcessAdapter };