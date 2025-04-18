# WorkerQueueManager
 WorkerQueueManager是一个worker资源管理工具

## 开发初衷是想要一个可以管理worker资源的工具，可以让开发者更加专注于业务逻辑的开发，而不用过多关注于woker的通信、资源分配、资源管理。
### [npm地址](https://github.com/solace-lee/worker-queue-manager)

### 特点：
1. 针对的使用场景：某个任务需要大量的worker协同，比如大数据处理、机器学习等；
2. 使用comlink封装了worker的通信，可以直接使用fetch方法发送请求，不需要自己处理worker的通信；
3. 支持worker的状态管理，可以获取worker的状态，包括是否可用、是否正在工作、worker的通信地址等；
4. 支持worker的生命周期管理，可以设置worker的最大空闲存活时间，当队列的空闲时间达到最大值时，会自动释放资源；
5. 支持worker的自动释放，释放后如还有需要会自动重启worker；
6. 支持设置worker的并发数量，保障资源尽可能地被利用；
7. 支持worker资源的自动分配，一旦woker空闲，立即分配给下一个任务；
8. 你可能需要在webpack中正确配置worker-loader才能正常使用这个库；
9. 你的woker中需要包装一个exec方法，或在go的opthion.callName中指定某个方法为worker的入口方法；


### 使用

#### 安装
`npm i worker-queue-manager`

#### 引入依赖 创建变量
```
  import { WorkerQueueManager } from 'worker-queue-manager'
  import RtrWorker from '../workers/mask2rt.worker.js'

  const workerQueueManager = new WorkerQueueManager(RtrWorker, 30000);

  export default async function rtReconstrction(structure, options) {
    const result = await workerQueueManager.go(structure, options)
    return result
  }
```

```
// 引入声明的HooksProxyStore
import { testState } from '../testStore'

function anyFunc() {
  // 通过State获取数据, 提供getValue方法显示获取值
  const test = testState.state.value // 不建议该方法
  const test = testState.getValue()

  // 直接修改state也能让依赖了该Store的组件同步更新（不建议），提供setValue方法显式地修改值
  testState.state.value = { any: '我是新的值' } // 不建议该方法
  testState.setValue({ any: '我是新的值' })

  // 可为store添加依赖set(依赖名称，依赖的方法名), 注意手动添加的依赖需要手动清除
  testState.dependency.set('one', oneDependency)

  // 手动清除依赖，
  testState.clean('one')
}

function oneDependency () {
  // any
}

```