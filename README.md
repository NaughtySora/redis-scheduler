# Redis Scheduler

## Description
- Scheduler on redis base.
- Can run in main process, child process, separated thread.

## Types
`interface MonitorOptions {`\
`  interval?: number;`\
`  batch?: boolean;`\
`  key?: string;`\
`}`

`interface SchedulerOptions {`\
`  path: string;`\
`  clientOptions?: Parameters<typeof createClient>[0];`\
`  isolate?: "process" | "thread";`\
`  options?: MonitorOptions;`\
`}`

`interface SchedulerApi {`\
`  start(): Promise<void>;`\
`  stop(ms?: number): Promise<void>;`\
`}`

`type Scheduler = (options: SchedulerOptions) => SchedulerApi;`

### Usage


```js
  // jobs api
  module.exports = {
    async log(text) {
      console.log("---start---");
      console.log(text);
      console.log("---end---\n");
    },
  };

  // create the scheduler
  const { start, stop } = scheduler({
    path: path.resolve(__dirname, "./api.js"),
    options: { key: "key where u store jobs parameters", interval: 1000 },
    isolate: "process", // process | thread | undefined
  });
  await start();

  // generate jobs
  const timer = setTimeout(async () => {
  const score = Date.now();
  await client.zAdd(KEY, {
    score,
    value: JSON.stringify({ name: "log", params: [`log-${score}`] }),
  });
  timer.refresh();
  }, 1000);

  // optional parameters ms decides how long to wait for stopping
  await stop().catch(console.error) // can throw error if stopping process frozen/jammed
```