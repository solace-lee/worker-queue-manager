export default class WorkerQueueManager {
    workerFile: any;
    threadCount: number;
    workerMap: Map<any, any>;
    freeWorkers: Set<unknown>;
    defaultDestroyTimer: number;
    countdownTimer: number;
    comlink: any;
    /**
     * 参数
     * @param {*} workerFile worker方法
     * @param {*} threadCount 核心线程数
     * @param {*} defaultDestroyTimer 销毁时间 如果传入0，则不自动销毁
     */
    constructor(workerFile: any, defaultDestroyTimer: number, threadCount: number);
    /**
     * 自动销毁
     */
    countdown(): void;
    initQueueManager(): Promise<void>;
    /**
     * 添加一个任务
     */
    go(data: any, options: any): Promise<any>;
    /**
    * 销毁worker
    */
    destroy(): void;
}
