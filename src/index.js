"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var comlink = require("comlink");
var WorkerQueueManager = /** @class */ (function () {
    /**
     * 参数
     * @param {*} workerFile worker方法
     * @param {*} threadCount 核心线程数
     * @param {*} defaultDestroyTimer 销毁时间 如果传入0，则不自动销毁
     */
    function WorkerQueueManager(workerFile, defaultDestroyTimer, threadCount) {
        if (defaultDestroyTimer === void 0) { defaultDestroyTimer = 0; }
        if (defaultDestroyTimer > 0 && defaultDestroyTimer < 60000)
            defaultDestroyTimer = 60000;
        this.workerFile = workerFile;
        this.threadCount = threadCount || Math.floor(Math.max(navigator.hardwareConcurrency || 2, 2) / 2) || 4;
        this.workerMap = new Map();
        this.freeWorkers = new Set();
        this.defaultDestroyTimer = defaultDestroyTimer;
        this.countdownTimer = 0;
        this.initQueueManager();
        return this;
    }
    /**
     * 自动销毁
     */
    WorkerQueueManager.prototype.countdown = function () {
        var _this = this;
        // 如果传入0，则不自动销毁
        if (!this.defaultDestroyTimer)
            return;
        if (this.countdownTimer)
            clearTimeout(this.countdownTimer);
        this.countdownTimer = setTimeout(function () {
            _this.destroy();
        }, this.defaultDestroyTimer);
    };
    WorkerQueueManager.prototype.initQueueManager = function () {
        this.countdown();
        for (var i = 1; i <= this.threadCount; i++) {
            var worker = new this.workerFile();
            var workerComlink = comlink.wrap(worker);
            this.workerMap.set(i, {
                worker: worker,
                workerComlink: workerComlink
            });
            // 添加空闲worker id
            this.freeWorkers.add(i);
        }
    };
    /**
     * 添加一个任务
     */
    WorkerQueueManager.prototype.go = function (data, options) {
        var _this = this;
        if (!this.workerMap.size) {
            this.initQueueManager();
        }
        var callName = options.callName || 'exec';
        var timer;
        return new Promise(function (resolve, reject) {
            var putWorker = function () {
                _this.countdown();
                timer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                    var canUseWorkerId_1, worker, instance;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!this.freeWorkers.size) return [3 /*break*/, 3];
                                canUseWorkerId_1 = this.freeWorkers.values().next().value;
                                if (!canUseWorkerId_1) return [3 /*break*/, 2];
                                this.freeWorkers.delete(canUseWorkerId_1);
                                worker = this.workerMap.get(canUseWorkerId_1);
                                return [4 /*yield*/, worker.workerComlink];
                            case 1:
                                instance = _a.sent();
                                instance[callName](data, options).then(function (res) {
                                    resolve(res);
                                }).catch(reject).finally(function () {
                                    clearTimeout(timer);
                                    _this.freeWorkers.add(canUseWorkerId_1);
                                });
                                _a.label = 2;
                            case 2: return [3 /*break*/, 4];
                            case 3:
                                putWorker();
                                _a.label = 4;
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, 100);
            };
            putWorker();
        });
    };
    /**
    * 销毁worker
    */
    WorkerQueueManager.prototype.destroy = function () {
        this.workerMap.forEach(function (item) {
            item.worker.terminate();
            item.worker = null;
            item.workerComlink = null;
        });
        this.workerMap.clear();
        this.freeWorkers.clear();
    };
    return WorkerQueueManager;
}());
exports.default = WorkerQueueManager;
