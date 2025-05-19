interface Options {
    defaultDestroyTimer: number;
    threadCount: number;
    createDuringUse: boolean;
}
export default class WorkerQueueManager {
    workerFile: any;
    threadCount: number;
    workerMap: Map<any, any>;
    freeWorkers: Set<unknown>;
    defaultDestroyTimer: number;
    countdownTimer: number;
    comlink: any;
    loading: boolean;
    /**
     *
     * @param workerFile worker方法
     * @param options threadCount 核心线程数 | defaultDestroyTimer 销毁时间 如果传入0，则不自动销毁 | createDuringUse 是否在使用时创建worker
     * @returns WorkerQueueManager
     */
    constructor(workerFile: any, options: Options);
    /**
     * 自动销毁
     */
    countdown(): void;
    initQueueManager(): Promise<void>;
    /**
     * 添加一个任务
     * options: any = { callName: 'exec' }
     */
    go(data: any, options?: any): Promise<any>;
    /**
    * 销毁worker
    */
    destroy(): void;
}
export {};
