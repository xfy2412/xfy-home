/**
 * Pyodide 运行时：懒加载 + 完整性校验。
 *
 * 13 MB 的 wasm/stdlib 全部从公共 CDN 取，**不占站点流量**；
 * 每个文件下完先算 SHA-256 比对（哈希在下面钉死），不匹配就换下一个源。
 * 三个源按顺序回退：npmmirror（国内最快）→ jsDelivr → unpkg。
 *
 * 下载进度通过 onProgress 回调出去 —— apt 的进度条就是它驱动的。
 */

/** Pyodide 版本：0.26.x 自带的 CPython 是 3.12（再往上就是 3.13/3.14 了）。 */
export const PYODIDE_VERSION = '0.26.4'

interface Artifact {
  name: string
  bytes: number
  sha256: string
  mime: string
}

/** 哈希取自 pyodide@0.26.4 的发布物，并已抽验 CDN 给的字节一致。 */
const ARTIFACTS: Artifact[] = [
  { name: 'pyodide.mjs', bytes: 13_779, mime: 'text/javascript',
    sha256: '7f24c6655a79eacf0061d3d4e6a60dc0b1938812d15c52d7ff8b37d9e0689e51' },
  { name: 'pyodide.asm.js', bytes: 1_229_099, mime: 'text/javascript',
    sha256: '919560652ed3dad3707cb3a394785da1e046fb13dc0defa162058ff230cb7eed' },
  { name: 'pyodide.asm.wasm', bytes: 10_088_051, mime: 'application/wasm',
    sha256: 'b7e66a19427a55010ac3367c1b6c64b893f9826f783412945fdf0c3337f3bc94' },
  { name: 'python_stdlib.zip', bytes: 2_341_872, mime: 'application/zip',
    sha256: '72894522b791858b9d613ac786b951d8b5094035dcf376313ea24a466810f336' },
  { name: 'pyodide-lock.json', bytes: 106_335, mime: 'application/json',
    sha256: 'cd50b49de944c579045e122fe8628b31f9ce446379f032f36c05e273d38766e0' },
]

const SOURCES = [
  // jsDelivr：Pyodide 官方文档推荐的源，五个文件齐全且都带 Access-Control-Allow-Origin: *
  `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE_VERSION}/`,
  // unpkg：同样齐全且带 CORS，作兜底
  `https://unpkg.com/pyodide@${PYODIDE_VERSION}/`,
  // 试过但不可用（留个记录，别再踩）：
  //   registry.npmmirror.com/…/files/  —— 字节与 npm 包一致、国内快，但**不发 CORS 头**，浏览器取不了；
  //   cdn.bootcdn.net/ajax/libs/pyodide/… —— 带 CORS，但没有 pyodide-lock.json，且速度不稳。
  // 两个 CDN 都取不到时，可以再加一条自托管兜底（./pyodide/，由构建时从 node_modules 拷）。
]

export const TOTAL_BYTES = ARTIFACTS.reduce((n, a) => n + a.bytes, 0)

/** 下载进度：已下字节 / 总字节 / 当前文件 */
export type Progress = (loaded: number, total: number, file: string) => void

type Pyodide = {
  runPythonAsync: (code: string) => Promise<unknown>
  runPython: (code: string) => unknown
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
  setStdin: (opts: { error: true }) => void
  setInterruptBuffer: (buf: Int32Array) => void
  globals: { set: (k: string, v: unknown) => void; get: (k: string) => unknown }
  FS: {
    mkdirTree: (path: string) => void
    writeFile: (path: string, data: Uint8Array) => void
  }
}

let pending: Promise<Pyodide> | null = null

/** 幂等：同一个页面里只会真正加载一次 */
export function ensurePyodide(onProgress: Progress): Promise<Pyodide> {
  if (!pending) pending = boot(onProgress)
  return pending
}

/** 已经装好了吗（apt 的"已安装 / 已经是最新版"判断用）—— 记在本地，刷新页面也算装着 */
const INSTALL_KEY = 'xfy.python.installed'

export function isInstalled(): boolean {
  try { return localStorage.getItem(INSTALL_KEY) === '1' } catch { return false }
}

export function markInstalled(): void {
  try { localStorage.setItem(INSTALL_KEY, '1') } catch { /* 隐私模式等，忽略 */ }
}

async function boot(onProgress: Progress): Promise<Pyodide> {
  let lastError: unknown = null
  for (const base of SOURCES) {
    try {
      const store = new Map<string, ArrayBuffer>()
      let done = 0
      for (const art of ARTIFACTS) {
        const buf = await download(base + art.name, art, (loaded) =>
          onProgress(done + loaded, TOTAL_BYTES, art.name))
        store.set(art.name, buf)
        done += art.bytes
      }

      // 校验全过 —— 接下来让 Pyodide 从内存取件，别再去网上拉第二遍
      const fetchBackup = globalThis.fetch
      globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const name = url.split('/').pop() ?? ''
        const hit = ARTIFACTS.find(a => a.name === name)
        const buf = hit && store.get(hit.name)
        if (buf && hit) {
          return Promise.resolve(new Response(buf, {
            status: 200,
            headers: { 'Content-Type': hit.mime },
          }))
        }
        return fetchBackup(input, init)
      }) as typeof fetch

      try {
        const blob = new Blob([store.get('pyodide.mjs')!], { type: 'text/javascript' })
        const mod = await import(/* @vite-ignore */ URL.createObjectURL(blob)) as {
          loadPyodide: (o: { indexURL: string }) => Promise<Pyodide>
        }
        const py = await mod.loadPyodide({ indexURL: base })
        return py
      } finally {
        globalThis.fetch = fetchBackup
      }
    } catch (err) {
      lastError = err
    }
  }
  pending = null
  throw new Error(`Pyodide 加载失败：${String(lastError)}`)
}

async function download(url: string, art: Artifact, onChunk: (loaded: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`${art.name}: HTTP ${res.status}`)

  const reader = res.body?.getReader()
  if (!reader) return verify(await res.arrayBuffer(), art, onChunk)

  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onChunk(loaded)
  }
  const all = new Uint8Array(loaded)
  let at = 0
  for (const c of chunks) { all.set(c, at); at += c.byteLength }
  return verify(all.buffer, art, onChunk)
}

async function verify(buf: ArrayBuffer, art: Artifact, onChunk: (loaded: number) => void): Promise<ArrayBuffer> {
  const digest = await crypto.subtle.digest('SHA-256', buf)
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
  if (hex !== art.sha256) {
    throw new Error(`${art.name} 校验失败（期望 ${art.sha256.slice(0, 12)}…，实得 ${hex.slice(0, 12)}…）`)
  }
  onChunk(art.bytes)
  return buf
}

/** 人类可读的字节数（apt 那份输出用） */
export function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1)
}
