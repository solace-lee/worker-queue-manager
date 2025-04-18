// esbuild.config.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'src/index.cjs.js',
  format: 'cjs', // 或者 'esm' 如果你构建 ESM
  platform: 'browser', // 或者 'browser'
  external: ['comlink'],  // 重要：防止 comlink 被打包进去，允许运行时解析
}).catch(() => process.exit(1));