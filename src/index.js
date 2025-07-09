// src/index.ts
var WorkerQueueManager = class {
  workerFile;
  threadCount;
  workerMap;
  freeWorkers;
  defaultDestroyTimer;
  countdownTimer;
  comlink;
  loading;
  createDuringUse;
  /**
   * 
   * @param workerFile worker方法
   * @param options threadCount 核心线程数 | defaultDestroyTimer 销毁时间 如果传入0，则不自动销毁 | createDuringUse 是否在使用时创建worker
   * @returns WorkerQueueManager
   */
  constructor(workerFile, options) {
    const { defaultDestroyTimer = 0, threadCount = 0, createDuringUse = false } = options || {};
    const comlink = import("comlink");
    this.loading = false;
    this.workerFile = workerFile;
    this.threadCount = threadCount || Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4;
    this.workerMap = /* @__PURE__ */ new Map();
    this.freeWorkers = /* @__PURE__ */ new Set();
    this.defaultDestroyTimer = defaultDestroyTimer > 0 && defaultDestroyTimer < 1e3 ? 6e4 : defaultDestroyTimer;
    this.countdownTimer = 0;
    this.comlink = comlink;
    this.createDuringUse = createDuringUse;
    if (!createDuringUse) {
      this.initQueueManager();
    }
    return this;
  }
  // 创建worker实例
  async createWorker(obj) {
    const worker = new this.workerFile();
    const workerComlink = (await this.comlink).wrap(worker);
    const newObj = Object.assign(obj || {}, {
      worker,
      workerComlink: new workerComlink(),
      timer: 0,
      uuid: void 0
    });
    this.autoDestroy(newObj);
    return newObj;
  }
  // 自动销毁worker实例
  autoDestroy(obj) {
    if (this.defaultDestroyTimer) {
      obj.timer = setTimeout(() => {
        obj.worker.terminate();
        obj.worker = null;
        obj.workerComlink = null;
        obj.uuid = void 0;
      }, this.defaultDestroyTimer + 1e3);
    }
  }
  // 初始化worker队列
  async initQueueManager() {
    if (this.loading) return;
    this.loading = true;
    for (let i = 1; i <= this.threadCount; i++) {
      this.workerMap.set(i, await this.createWorker());
      this.freeWorkers.add(i);
    }
    this.loading = false;
  }
  /**
   * 添加一个任务
   * options: any = { callName: 'exec' }
   */
  async go(data, options = { callName: "exec" }) {
    if (!this.workerMap.size) {
      await this.initQueueManager();
    }
    const callName = options.callName || "exec";
    const uuid = options.uuid || void 0;
    return new Promise((resolve, reject) => {
      const putWorker = () => {
        setTimeout(async () => {
          if (this.freeWorkers.size && !this.loading) {
            const canUseWorkerId = this.freeWorkers.values().next().value;
            if (canUseWorkerId) {
              this.freeWorkers.delete(canUseWorkerId);
              const obj = this.workerMap.get(canUseWorkerId);
              if (!obj.worker) {
                await this.createWorker(obj);
              }
              obj.uuid = uuid;
              obj.timer && clearTimeout(obj.timer);
              const instance = await obj.workerComlink;
              instance[callName](data, options).then((res) => {
                resolve(res);
              }).catch(reject).finally(() => {
                obj.uuid = void 0;
                this.autoDestroy(obj);
                this.freeWorkers.add(canUseWorkerId);
              });
            }
          } else {
            putWorker();
          }
        }, 100);
      };
      putWorker();
    });
  }
  /**
  * 销毁worker
  */
  destroy(uuid) {
    this.workerMap.forEach((item) => {
      if (uuid && item.uuid !== uuid) {
        return;
      }
      item.uuid = void 0;
      item.timer && clearTimeout(item.timer);
      item.worker?.terminate();
      item.worker = null;
      item.workerComlink = null;
    });
    if (uuid) return;
    this.workerMap.clear();
    this.freeWorkers.clear();
  }
};
export {
  WorkerQueueManager as default
};
