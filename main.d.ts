
import { createClient } from "redis";
import { EventEmitter } from "node:events";

interface Options {
  isolate?: "process" | "thread";
  interval?: number;
  batch?: boolean;
  key?: string;
}

declare class Scheduler extends EventEmitter {
  constructor(options: Options);
  start(config: Parameters<typeof createClient>[0]): Promise<void>;
  stop(ms?: number): Promise<void>;
  add(value: string | Buffer<ArrayBuffer>, score?: number): Promise<number>;
  status: number;
  static create(options: Options): Scheduler;
}

export function scheduler(param: Options): Scheduler;
