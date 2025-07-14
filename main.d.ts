
import { createClient } from "redis";

type Isolate = "process" | "thread";

interface MonitorOptions {
  interval?: number;
  batch?: boolean;
  key?: string;
}

interface SchedulerOptions {
  path: string;
  clientOptions?: Parameters<typeof createClient>[0],
  isolate?: Isolate;
  options?: MonitorOptions;
}

interface SchedulerApi {
  start(): Promise<void>;
  stop(): Promise<void>;
}

type Scheduler = (options: SchedulerOptions) => SchedulerApi;

export const scheduler: Scheduler;