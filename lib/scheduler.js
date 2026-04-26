"use strict";

const { EventEmitter, once } = require("node:events");
const { modulePath, reject, STATUSES } = require("./utils.js");
const { createClient } = require("redis");

const validString = (value, length = 0) => typeof value === "string" &&
  value.length > length;

class Scheduler extends EventEmitter {
  #processing = false;
  #modules = null;
  #client = null;
  #status = 0;
  #batch = false;
  #interval;
  #process;
  #key;

  constructor(options) {
    if (!validString(options.key)) {
      throw new TypeError('Key has to be a non-empty string');
    }
    super();
    const batch = this.#batch = options.batch ?? this.#batch;
    this.#key = options.key;
    this.#interval = options.interval ?? 1000;
    this.#modules = options.modules ?? this.#modules;
    this.#process = (batch ? this.#parallel : this.#sequential)
      .bind(this);
  }

  async #callApi(data) {
    const job = JSON.parse(data);
    const api = this.#modules[job.name];
    if (api === undefined) {
      this.emit("error", new Error(`Module ${job.name} was not found`));
    }
    const fn = api[job.key];
    if (fn === undefined) {
      this.emit("error", new Error(`Api key ${job.key} was not found`));
    }
    return await fn.apply(api, job?.args);
  }

  async #parallel(payload, score) {
    const promises = [];
    for (const data of payload) {
      promises.push(this.#callApi(data));
    }
    await Promise.all(promises);
    await client.zRemRangeByScore(this.#key, 0, score);
  }

  async #sequential(payload) {
    for (const data of payload) {
      await this.#callApi(data);
      await this.#client.zRem(this.#key, data);
    }
  }

  async #schedule() {
    const timer = setTimeout(async () => {
      if (this.#status >= 2) {
        clearTimeout(timer);
        return void this.emit("stop");
      };
      const score = Date.now();
      const jobs = await this.#client.zRangeByScore(this.#key, 0, score);
      await this.#process(jobs, score);
      if (this.#status === 1) timer.refresh();
    }, this.#interval);
  }

  async stop(ms = 5000) {
    if (this.#status !== 1) return;
    this.#status = 2;
    if (this.#processing) await once(this, "stop");
    await Promise.race([this.#client.close(), reject(ms)]);
    this.#client = null;
    this.#modules = null;
    this.#status = 3;
    this.emit("disconnect");
  }

  async start(config) {
    if (this.#status !== 0) return;
    const client = this.#client = createClient(config);
    await client.connect();
    client.on("error", error => this.emit("error", error));
    await this.#schedule();
    this.#status = 1;
    this.emit("connect");
  }

  async add(value, score = Date.now()) {
    if (this.#status !== 1) return 0;
    return await this.#client.zAdd(
      this.#key,
      { score, value },
    );
  }

  static create(options) {
    return new Scheduler(Object.assign({}, options));
  }

  get status() {
    return STATUSES[this.#status];
  }
}

module.exports = Scheduler.create;
