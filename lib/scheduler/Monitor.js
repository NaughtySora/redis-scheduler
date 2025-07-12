"use strict";

const { EventEmitter, once } = require("node:events");

const criteria = key => [key, 0, Date.now()];

class Monitor extends EventEmitter {
  stopping = false;
  processing = false;
  timer = null;
  interval;

  constructor(context, { interval = 1000, batch = false, key = "jobs" } = {}) {
    super();
    this.context = context;
    this.interval = interval;
    this.key = key;
    this.exec = batch ? this.#parallel : this.#sequence;
  }

  async #monitoring() {
    const { key, context, interval } = this;
    const client = context.client;
    let timer = null;
    const listener = async () => {
      if (this.stopping) {
        clearTimeout(timer);
        return void this.emit("stop");
      }
      const poll = criteria(key);
      const jobs = await client.zRangeByScore(...poll);
      if (jobs.length !== 0) {
        this.processing = true;
        await this.exec(jobs);
        await client.zRemRangeByScore(...poll);
        this.processing = false;
      }
      if(timer) timer.refresh();
    };
    await listener();
    timer = setTimeout(listener, interval);
    this.timer = timer;
  }

  async #parallel(jobs) {
    const api = this.context.api;
    const promises = jobs.map(json => {
      const { name, params } = JSON.parse(json);
      const fn = api[name];
      return fn(...params)
    });
    await Promise.all(promises);
  }

  async #sequence(jobs) {
    const api = this.context.api;
    for (const job of jobs) {
      const { name, params } = JSON.parse(job);
      const fn = api[name];
      if (!fn) continue;
      await fn(...params);
    }
  }

  async start() {
    await this.context.start();
    await this.#monitoring();
  }

  async stop() {
    this.stopping = true;
    const timer = this.timer;
    if (this.processing) await once(this, "stop");
    await this.context.stop();
    if (timer) clearTimeout(timer);
  }
}

module.exports = Monitor;