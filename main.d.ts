
import { createClient } from "redis";

type Isolate = "process" | "thread";

interface MonitorOptions {
  interval?: number;
  batch?: boolean;
  key?: string;
}

interface Scheduler {
  path: string;
  clientOptions?: Parameters<typeof createClient>[0],
  isolate?: Isolate;
  options?: MonitorOptions;
}