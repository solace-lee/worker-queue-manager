interface Options {
    defaultDestroyTimer: number;
    threadCount: number;
    priority: boolean;
}
interface WorkerMapItem {
    worker: any;
    workerComlink: any;
    timer: Number;
    uuid?: string | undefined;
}
declare const _default: {
    new (workerFile: any, options: Options): {
        workerFile: any;
        threadCount: number;
        workerMap: Map<any, any>;
        freeWorkers: Set<unknown>;
        defaultDestroyTimer: number;
        countdownTimer: number;
        comlink: any;
        loading: boolean;
        priority: boolean;
        vmKey: string;
        timeoutPool: Set<number>;
        createWorker(obj?: WorkerMapItem): Promise<WorkerMapItem>;
        autoDestroy(obj: WorkerMapItem): void;
        initQueueManager(): Promise<void>;
        /**
         * 添加一个任务
         * options: any = { callName: 'exec' }
         */
        go(data: any, options?: any): Promise<any>;
        /**
         * 更新当前实例负载情况
         */
        undateVmCount(): void;
        /**
        * 销毁worker
        */
        destroy(uuid?: string | undefined): void;
        /**
         * 修改全局最大实例数量
         * @param number number 最大实例数量 默认：Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4
         */
        setMaxVmCount(number: number): void;
    };
};
export default _default;
