// import * as comlink from 'comlink'

interface Options {
  defaultDestroyTimer: number,
  threadCount: number,
  createDuringUse: boolean
}

interface WorkerMapItem {
  worker: any
  workerComlink: any
  timer: Number,
  uuid?: string | undefined
}

export default class WorkerQueueManager {
  workerFile: any
  threadCount: number
  workerMap: Map<any, any>
  freeWorkers: Set<unknown>
  defaultDestroyTimer: number
  countdownTimer: number
  comlink: any
  loading: boolean
  createDuringUse: boolean


  /**
   * 
   * @param workerFile worker方法
   * @param options threadCount 核心线程数 | defaultDestroyTimer 销毁时间 如果传入0，则不自动销毁 | createDuringUse 是否在使用时创建worker
   * @returns WorkerQueueManager
   */
  constructor(workerFile: any, options: Options) {
    const { defaultDestroyTimer = 0, threadCount = 0, createDuringUse = false } = options || {}
    const comlink = import('comlink')
    this.loading = false
    this.workerFile = workerFile
    this.threadCount = threadCount || Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4
    this.workerMap = new Map()
    this.freeWorkers = new Set()
    this.defaultDestroyTimer = (defaultDestroyTimer > 0 && defaultDestroyTimer < 1000) ? 60000 : defaultDestroyTimer
    this.countdownTimer = 0
    this.comlink = comlink
    this.createDuringUse = createDuringUse
    if (!createDuringUse) {
      this.initQueueManager()
    }
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
        obj.worker.terminate()
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
      // const worker = new this.workerFile()
      // const workerComlink = (await this.comlink).wrap(worker)
      this.workerMap.set(i, await this.createWorker())
      // 添加空闲worker id
      this.freeWorkers.add(i)
    }
    this.loading = false
  }


  /**
   * 添加一个任务
   * options: any = { callName: 'exec' }
   */
  async go(data: any, options: any = { callName: 'exec' }): Promise<any> {
    if (!this.workerMap.size) {
      await this.initQueueManager()
    }
    const callName = options.callName || 'exec'
    const uuid = options.uuid || undefined

    return new Promise((resolve, reject) => {
      const putWorker = () => {
        setTimeout(async () => {
          // 判断空闲worker，添加进管理
          if (this.freeWorkers.size && !this.loading) {
            const canUseWorkerId = this.freeWorkers.values().next().value
            if (canUseWorkerId) {
              this.freeWorkers.delete(canUseWorkerId)
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
  * 销毁worker
  */
  destroy(uuid?: string | undefined) {
    this.workerMap.forEach(item => {
      if (uuid && item.uuid !== uuid) {
        return
      }
      item.uuid = undefined
      item.timer && clearTimeout(item.timer)
      item.worker?.terminate()
      item.worker = null
      item.workerComlink = null
    })
    if (uuid) return
    this.workerMap.clear()
    this.freeWorkers.clear()
  }
}
