// import * as comlink from 'comlink'

interface Options {
  defaultDestroyTimer: number,
  threadCount: number,
  createDuringUse: boolean
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
    if (!createDuringUse) {
      this.initQueueManager()
    }
    return this
  }

  /**
   * 自动销毁
   */
  countdown() {
    // 如果传入0，则不自动销毁
    if (!this.defaultDestroyTimer) return

    if (this.countdownTimer) clearTimeout(this.countdownTimer)
    this.countdownTimer = setTimeout(() => {
      this.destroy()
    }, this.defaultDestroyTimer)
  }

  async initQueueManager() {
    this.countdown()
    if (this.loading) return
    this.loading = true
    for (let i = 1; i <= this.threadCount; i++) {
      const worker = new this.workerFile()
      const workerComlink = (await this.comlink).wrap(worker)
      this.workerMap.set(i, {
        worker,
        workerComlink: new workerComlink()
      })
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

    let timer: number
    return new Promise((resolve, reject) => {
      const putWorker = () => {
        this.countdown()
        timer = setTimeout(async () => {
          // 判断空闲worker，添加进管理
          if (this.freeWorkers.size && !this.loading) {
            const canUseWorkerId = this.freeWorkers.values().next().value
            if (canUseWorkerId) {
              this.freeWorkers.delete(canUseWorkerId)
              const worker = this.workerMap.get(canUseWorkerId)
              const instance = await worker.workerComlink
              instance[callName](data, options).then((res: any) => {
                resolve(res)
              }).catch(reject).finally(() => {
                clearTimeout(timer)
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
  destroy() {
    this.workerMap.forEach(item => {
      item.worker.terminate()
      item.worker = null
      item.workerComlink = null
    })
    this.workerMap.clear()
    this.freeWorkers.clear()
  }
}
