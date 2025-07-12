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
 * 3. key: string