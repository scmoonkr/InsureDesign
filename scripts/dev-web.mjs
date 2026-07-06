import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv, resolveApiPort, resolveWebPort } from '../api-server/config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

loadEnv()

const apiPort = String(resolveApiPort())
const webPort = String(resolveWebPort())
const command = process.execPath
const nuxiPath = path.join(rootDir, 'node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs')

const child = spawn(command, [nuxiPath, 'dev', '--port', webPort], {
  env: {
    ...process.env,
    API_PORT: apiPort,
    PORT: webPort,
    NUXT_PORT: webPort,
  },
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
