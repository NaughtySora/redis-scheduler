"use strict";

const { EventEmitter, once } = require("node:events");
const { modulePath, reject } = require("./utils.js");

const STATUSES = [
  "init",
  "running",
  "stopping",
  "stopped",
];

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

  #criteria() {
    return [this.#key, 0, Date.now()];
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

  async #parallel(payload, search) {
    const promises = [];
    for (const data of payload) {
      promises.push(this.#callApi(data));
    }
    await Promise.all(promises);
    await client.zRemRangeByScore(...search);
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
      const search = this.#criteria();
      const jobs = await this.#client.zRangeByScore(...search);
      await this.#process(jobs, search);
      if (this.#status === 1) timer.refresh();
    }, this.#interval);
  }

  async stop(ms = 5000) {
    if (this.#status >= 2) return;
    this.#status = 2;
    if (this.#processing) await once(this, "stop");
    await Promise.race([this.#client.close(), reject(ms)]);
    this.#client = null;
    this.#modules = null;
    this.#status = 3;
    this.emit("disconnect");
  }

  async start(client) {
    this.#client = client;
    await client.connect();
    client.on("error", error => this.emit("error", error));
    await this.#schedule();
    this.#status = 1;
    this.emit("connect");
  }

  async add(value, score = Date.now()) {
    return await this.#client.zAdd(
      this.#key,
      { score, value },
    );
  }

  static create(options) {
    return new Scheduler(Object.assign({}, options));
  }
}

module.exports = Scheduler.create;
