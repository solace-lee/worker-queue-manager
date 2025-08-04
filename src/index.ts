interface Options {
  defaultDestroyTimer: number, // 销毁时间 如果传入0，则不自动销毁
  threadCount: number, // 核心线程数
  priority: boolean // 任务是否优先,true则不受全局最大任务数量的限制
}

interface WorkerMapItem {
  worker: any // worker实例
  workerComlink: any // worker实例comlink实例
  timer: Number, // 定时销毁timer
  uuid?: string | undefined // 任务uuid
}

function createWorkerQueueManager() {
  const globalVmCount = new Map()
  const opts = {
    maxVmCount: Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4,
    getPass: () => {
      let count = 0
      globalVmCount.forEach((value) => {
        count += value
      })
      return count < opts.maxVmCount
    }
  }

  return class WorkerQueueManager {
    workerFile: any // worker方法
    threadCount: number // 核心线程数
    workerMap: Map<any, any> // worker实例map
    freeWorkers: Set<unknown> // 空闲worker id集合
    defaultDestroyTimer: number // 销毁时间 如果传入0，则不自动销毁
    countdownTimer: number // 定时器
    comlink: any // comlink实例
    loading: boolean // 加载状态
    priority: boolean // 任务是否优先,true则不受全局最大任务数量的限制
    vmKey: string // 实例key


    /**
     * 
     * @param workerFile worker方法
     * @param options.threadCount 核心线程数
     * @param options.defaultDestroyTimer 销毁时间 如果传入0，则不自动销毁
     * @param options.priority 任务是否优先,true则不受全局最大任务数量的限制
     * @returns WorkerQueueManager
     */
    constructor(workerFile: any, options: Options) {
      const { defaultDestroyTimer = 1000, threadCount = 0, priority = false } = options || {}
      const comlink = import('comlink')
      this.loading = false
      this.workerFile = workerFile
      this.threadCount = threadCount || Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4
      this.workerMap = new Map()
      this.freeWorkers = new Set()
      this.vmKey = Math.random().toString(36)
      this.defaultDestroyTimer = (defaultDestroyTimer > 0 && defaultDestroyTimer < 1000) ? 10000 : defaultDestroyTimer
      this.countdownTimer = 0
      this.comlink = comlink
      this.priority = priority
      this.initQueueManager()
      return this
    }

    // 创建worker实例
    async createWorker(obj?: WorkerMapItem) {
      const worker = new this.workerFile()
      const workerComlink = (await this.comlink).wrap(worker)
      const newObj: WorkerMapItem = Object.assign(obj || {}, {
        worker,
        workerComlink: new workerComlink(),
        timer: 0,
        uuid: undefined
      })
      // 如果当前是使用时创建，并且有销毁时间，则设置定时销毁
      this.autoDestroy(newObj)
      return newObj
    }

    // 自动销毁worker实例
    autoDestroy(obj: WorkerMapItem) {
      if (this.defaultDestroyTimer) {
        obj.timer = setTimeout(() => {
          obj.worker?.terminate()
          obj.worker = null
          obj.workerComlink = null
          obj.uuid = undefined
        }, (this.defaultDestroyTimer + 1000))
      }
    }

    // 初始化worker队列
    async initQueueManager() {
      if (this.loading) return
      this.loading = true
      for (let i = 1; i <= this.threadCount; i++) {
        this.workerMap.set(i, {
          worker: null,
          workerComlink: null,
          uuid: undefined,
          timer: 0
        })
        // 添加空闲worker id
        this.freeWorkers.add(i)
        this.undateVmCount()
      }
      this.loading = false
    }


    /**
     * 添加一个任务
     * options: any = { callName: 'exec' }
     */
    async go(data: any, options: any = { callName: 'exec' }): Promise<any> {
      const callName = options.callName || 'exec'
      const uuid = options.uuid || undefined

      return new Promise((resolve, reject) => {
        const putWorker = () => {
          setTimeout(async () => {
            // 判断空闲worker，添加进管理
            if (this.freeWorkers.size && !this.loading && (this.priority || opts.getPass())) {
              const canUseWorkerId = this.freeWorkers.values().next().value
              if (canUseWorkerId) {
                this.freeWorkers.delete(canUseWorkerId)
                this.undateVmCount()
                const obj = this.workerMap.get(canUseWorkerId)
                // 判断当前实例是否存在
                if (!obj.worker) {
                  await this.createWorker(obj)
                }
                obj.uuid = uuid
                // 暂停自动销毁
                obj.timer && clearTimeout(obj.timer)
                const instance = await obj.workerComlink
                instance[callName](data, options)
                  .then((res: any) => {
                    resolve(res)
                  })
                  .catch(reject)
                  .finally(() => {
                    obj.uuid = undefined
                    // 定时自动销毁
                    this.autoDestroy(obj)
                    this.freeWorkers.add(canUseWorkerId)
                    this.undateVmCount()
                  })
              }
            } else {
              putWorker()
            }
          }, 100)
        }
        putWorker()
      })
    }

    /**
     * 更新当前实例负载情况
     */
    undateVmCount() {
      globalVmCount.set(this.vmKey, this.workerMap.size - this.freeWorkers.size)
    }

    /**
    * 销毁worker
    */
    destroy(uuid?: string | undefined) {
      this.workerMap.forEach((item, canUseWorkerId) => {
        if (uuid && item.uuid !== uuid) {
          return
        }
        item.uuid = undefined
        item.timer && clearTimeout(item.timer)
        item.worker?.terminate()
        item.worker = null
        item.workerComlink = null
        this.freeWorkers.add(canUseWorkerId)
      })
      this.undateVmCount()
    }

    /**
     * 修改全局最大实例数量
     * @param number number 最大实例数量 默认：Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4
     */
    setMaxVmCount(number: number) {
      opts.maxVmCount = number || Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4
    }
  }
}

export default createWorkerQueueManager()
