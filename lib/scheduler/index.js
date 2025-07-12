"use strict";

const { abstract } = require("naughty-util");
const { fork } = require("node:child_process");
const { createClient } = require("redis");
const { EventEmitter, once } = require("node:events");

const KEY = "jobs";

const criteria = () => [KEY, 0, Date.now()];

class Monitor extends EventEmitter {
  stopping = false;
  timer = null;
  interval;

  constructor(context, { interval = 1000, batch = false } = {}) {
    super();
    this.context = context;
    this.interval = interval;
    this.exec = batch ? this.#parallel : this.#sequence;
  }

  #monitoring() {
    const client = this.context.client;
    const timer = setTimeout(async () => {
      if (this.stopping) {
        clearTimeout(timer);
        return void this.emit("stop");
      }
      const poll = criteria();
      const jobs = await client.zRangeByScore(...poll);
      if (jobs.length === 0) return;
      await this.exec(jobs);
      await client.zRemRangeByScore(...poll);
      timer.refresh();
    }, this.interval);
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
    this.#monitoring();
  }

  async stop() {
    this.stopping = true;
    await once(this, "stop");
    await this.context.stop();
  }
}

class Context {
  client = null;
  api = null;

  constructor(options, { path } = {}) {
    this.options = options;
    this.path = path;
  }

  async #connectClient() {
    const client = createClient(this.options);
    this.client = client;
    client.on('error', err => console.log('Redis Client Error', err));
    await client.connect();
  }

  async start() {
    this.api = require(this.path);
    await this.#connectClient();
    return this;
  }

  async stop() {
    await client.quit();
    this.client = null;
    this.api = null;
  }
}

class ProcessContext {

}

class ThreadContext {

}

const contexts = abstract.factorify({
  process: ProcessContext,
  thread: ThreadContext,
}, Context);


/**
 * path (string)
 * 1. leads to object with methods
 * 2. preferably pure functions.
 * 3. preferably concurrent independent
 * 
 * context ("thread" | "process" | undefined)
 * 1. thread - will run separated thread for scheduling
 * 2. process - will run separated process for scheduling
 * 3. undefined(default) - will run scheduler in main process
 * 
 * clientOptions 
 * 1. redis options.
 * 2. no cache options (no need)
 * 3. options should be transferable/serializable, i will be transfer to process/thread
 * 
 * options
 * 1. interval (number) default 1000;
 * 2. batch: true | false;
 */

module.exports = ({ path, clientOptions, isolate, options } = {}) => {
  const Context = contexts(isolate);
  const env = new Context(clientOptions, { path });
  const monitor = new Monitor(env, options);
  return {
    start: monitor.start.bind(monitor),
    stop: monitor.stop.bind(monitor),
  };
};
