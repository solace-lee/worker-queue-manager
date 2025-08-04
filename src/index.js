// src/index.ts
function createWorkerQueueManager() {
  const globalVmCount = /* @__PURE__ */ new Map();
  const opts = {
    maxVmCount: Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4,
    getPass: () => {
      let count = 0;
      globalVmCount.forEach((value) => {
        count += value;
      });
      return count < opts.maxVmCount;
    }
  };
  return class WorkerQueueManager {
    workerFile;
    // worker方法
    threadCount;
    // 核心线程数
    workerMap;
    // worker实例map
    freeWorkers;
    // 空闲worker id集合
    defaultDestroyTimer;
    // 销毁时间 如果传入0，则不自动销毁
    countdownTimer;
    // 定时器
    comlink;
    // comlink实例
    loading;
    // 加载状态
    priority;
    // 任务是否优先,true则不受全局最大任务数量的限制
    vmKey;
    // 实例key
    /**
     * 
     * @param workerFile worker方法
     * @param options.threadCount 核心线程数
     * @param options.defaultDestroyTimer 销毁时间 如果传入0，则不自动销毁
     * @param options.priority 任务是否优先,true则不受全局最大任务数量的限制
     * @returns WorkerQueueManager
     */
    constructor(workerFile, options) {
      const { defaultDestroyTimer = 1e3, threadCount = 0, priority = false } = options || {};
      const comlink = import("comlink");
      this.loading = false;
      this.workerFile = workerFile;
      this.threadCount = threadCount || Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4;
      this.workerMap = /* @__PURE__ */ new Map();
      this.freeWorkers = /* @__PURE__ */ new Set();
      this.vmKey = Math.random().toString(36);
      this.defaultDestroyTimer = defaultDestroyTimer > 0 && defaultDestroyTimer < 1e3 ? 1e4 : defaultDestroyTimer;
      this.countdownTimer = 0;
      this.comlink = comlink;
      this.priority = priority;
      this.initQueueManager();
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
          obj.worker?.terminate();
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
        this.workerMap.set(i, {
          worker: null,
          workerComlink: null,
          uuid: void 0,
          timer: 0
        });
        this.freeWorkers.add(i);
        this.undateVmCount();
      }
      this.loading = false;
    }
    /**
     * 添加一个任务
     * options: any = { callName: 'exec' }
     */
    async go(data, options = { callName: "exec" }) {
      const callName = options.callName || "exec";
      const uuid = options.uuid || void 0;
      return new Promise((resolve, reject) => {
        const putWorker = () => {
          setTimeout(async () => {
            if (this.freeWorkers.size && !this.loading && (this.priority || opts.getPass())) {
              const canUseWorkerId = this.freeWorkers.values().next().value;
              if (canUseWorkerId) {
                this.freeWorkers.delete(canUseWorkerId);
                this.undateVmCount();
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
                  this.undateVmCount();
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
     * 更新当前实例负载情况
     */
    undateVmCount() {
      globalVmCount.set(this.vmKey, this.workerMap.size - this.freeWorkers.size);
    }
    /**
    * 销毁worker
    */
    destroy(uuid) {
      this.workerMap.forEach((item, canUseWorkerId) => {
        if (uuid && item.uuid !== uuid) {
          return;
        }
        item.uuid = void 0;
        item.timer && clearTimeout(item.timer);
        item.worker?.terminate();
        item.worker = null;
        item.workerComlink = null;
        this.freeWorkers.add(canUseWorkerId);
      });
      this.undateVmCount();
    }
    /**
     * 修改全局最大实例数量
     * @param number number 最大实例数量 默认：Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4
     */
    setMaxVmCount(number) {
      opts.maxVmCount = number || Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4;
    }
  };
}
var index_default = createWorkerQueueManager();
export {
  index_default as default
};
