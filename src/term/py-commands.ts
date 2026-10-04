/**
 * `python3` 与 `apt` 的命令层。
 *
 * 拟真的是 Ubuntu 的行为，不是自创的说法：
 *   - 没装 → Ubuntu 的 command-not-found 原文（"Command 'python3' not found, but can be installed with:"）
 *   - `sudo apt install python3` → apt 的输出格式 + 进度条，**进度是 wasm 的真实下载字节**
 *   - 装完 `python3 --version` → 真解释器自己报的 3.12.1
 *
 * 跑 .pychess.py 时用 Pyodide 的真 CPython，通过 globalThis.ask 把 input() 接到终端输入行。
 */
import type { Terminal } from './terminal'
import { esc } from './terminal'
import pychessSource from '../data/pychess.py?raw'
import { PYODIDE_VERSION, TOTAL_BYTES, ensurePyodide, isInstalled, markInstalled, mb } from './pyodide-runtime'

/** 虚拟文件系统的路径（cat 与 python3 用的是同一份文本） */
export const GAME_FILE = '.pychess.py'
export const GAME_SOURCE = pychessSource

/** Ubuntu command-not-found 的原话 */
function notFoundHint(cmd: string): string {
  return `<span class="err">Command '${esc(cmd)}' not found, but can be installed with:</span>\n` +
         `<span class="amber">sudo apt install python3</span>`
}

/** 等输入时可以敲这些退出（Esc 同理；手机上没有 Esc 键） */
const QUIT_WORDS = new Set(['quit', 'exit', ':q', ':wq', 'q'])

/** 等一行输入：把提示符换成 Python 那边给的 prompt，回车交出这一行；Esc 拒绝（Python 侧翻成 KeyboardInterrupt） */
function askLine(term: Terminal, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const prev = term.promptHTML()
    term.setPrompt(`<span class="dim">${esc(prompt)}</span>`)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      cleanup()
      // 提示符留在输出流里（不换行）—— 这样接着打出来的"棍母"会跟它连成一句
      term.printPartial(`<span class="dim">${esc(prompt)}</span>`)
      reject(new Error('SIGINT'))     // Python 侧翻译成 KeyboardInterrupt
    }
    const cleanup = (): void => {
      document.removeEventListener('keydown', onKey)
      term.interceptor = null
      term.setPrompt(prev)
    }
    term.interceptor = (line) => {
      const typed = line.trim()
      // 手机上按不了 Esc —— 敲 quit/exit/:q 走同一条中断路径（Esc 也能用）
      if (QUIT_WORDS.has(typed.toLowerCase())) {
        cleanup()
        term.print(`<span class="dim">${esc(prompt)}</span>${esc(typed)}`)
        reject(new Error('SIGINT'))
        return true
      }
      cleanup()
      term.print(`<span class="dim">${esc(prompt)}</span>${esc(line)}`)
      resolve(line)
      return true
    }
    document.addEventListener('keydown', onKey)
    term.focus()
  })
}

/** apt 的进度条：按 apt 的样式，用真实字节驱动 */
function progressBar(loaded: number, total: number, speed: number): string {
  const ratio = Math.min(1, loaded / total)
  const width = 22
  const filled = Math.round(ratio * width)
  const bar = '='.repeat(Math.max(0, filled - 1)) + (filled > 0 ? '>' : '') + ' '.repeat(width - filled)
  const left = speed > 0 ? `  剩余 ${Math.max(1, Math.round((total - loaded) / speed))}s` : ''
  const kb = Math.round(loaded / 1024).toLocaleString('en-US')
  const speedKb = Math.round(speed / 1024).toLocaleString('en-US')
  return `正在下载：${String(Math.floor(ratio * 100)).padStart(3)}% [${bar}] ` +
         `${kb} kB  ${speedKb} kB/s${left}`
}

/** 跑一次 apt install python3 */
async function aptInstall(term: Terminal): Promise<void> {
  const say = (html: string, delay = 0): Promise<void> =>
    new Promise(r => setTimeout(() => { term.print(html); r() }, delay))

  await say('正在读取软件包列表... 完成', 120)
  await say('正在分析软件包的依赖关系树... 完成', 160)

  // 已经装过了：apt 的原话是"已经是最新版"
  if (isInstalled()) {
    await say('正在读取状态信息... 完成', 120)
    await say('python3 已经是最新版 (3.12.1-1)。')
    await say('升级了 0 个软件包，新安装了 0 个软件包，要卸载 0 个软件包，有 0 个软件包未被升级。')
    return
  }

  await say('正在读取状态信息... 完成', 120)
  await say('下列【新】软件包将被安装：')
  await say('  libpython3.12-minimal libpython3.12-stdlib python3.12 python3.12-minimal', 80)
  await say(`需要下载 ${mb(TOTAL_BYTES)} MB 的归档。`, 140)

  const live = term.liveLine()
  const t0 = performance.now()
  try {
    await ensurePyodide((loaded) => {
      const secs = Math.max(0.2, (performance.now() - t0) / 1000)
      live.set(progressBar(loaded, TOTAL_BYTES, loaded / secs))
    })
  } catch (err) {
    live.done()
    await say(`<span class="err">E: 下载失败：${esc(String(err))}</span>`)
    return
  }
  live.done()

  await say('正在设置 libpython3.12-minimal (3.12.1-1) ...', 120)
  await say('正在设置 python3.12-minimal (3.12.1-1) ...', 160)
  await say('正在设置 libpython3.12-stdlib (3.12.1-1) ...', 160)
  await say('正在设置 python3.12 (3.12.1-1) ...', 200)
  await say('正在处理用于 man-db 的触发器 ...', 160)
  markInstalled()
  term.print('<span class="dim">python3 已安装（Pyodide ' + PYODIDE_VERSION + ' / CPython 3.12.1）</span>')
}

/** 真解释器自己报的版本号 */
async function pythonVersion(): Promise<string> {
  const py = await ensurePyodide(() => {})
  return String(py.runPython('import sys; sys.version.split()[0]'))
}

/** 跑 .pychess.py：真 CPython + 把 input() 接到终端 */
async function runGame(term: Terminal): Promise<void> {
  const py = await ensurePyodide(() => {})

  // 把游戏源码放进解释器的虚拟文件系统 —— Python 那边 open() 读到的就是这一份，
  // 和终端里 cat 出来的、和仓库里那份，逐字节相同。
  const home = '/home/xfy'
  try { py.FS.mkdirTree(home) } catch { /* 已存在 */ }
  py.FS.writeFile(`${home}/${GAME_FILE}`, new TextEncoder().encode(GAME_SOURCE))

  // 原文件每回合都会 print("\n"*29)：那是当年在控制台里"把上一局棋盘顶出屏幕"的手法。
  // 真终端里它是**滚动**而不是擦除，所以这里老老实实把空行打出来 —— 一行一行地滚。
  py.setStdout({ batched: (text) => {
    for (const line of text.split('\n')) term.print(esc(line))
  } })
  py.setStderr({ batched: (text) => {
    for (const line of text.split('\n')) term.print(`<span class="err">${esc(line)}</span>`)
  } })
  py.setStdin({ error: true })

  // JS 侧的读行（Esc 会拒绝这个 Promise），挂到 __askJs 上给 Python 调
  ;(globalThis as unknown as { __askJs: (p: string) => Promise<string> }).__askJs =
    (prompt: string) => askLine(term, prompt)

  // Python 侧包一层：把 JS 的拒绝翻译成 KeyboardInterrupt，
  // 这样 chess.py 里那句 `except KeyboardInterrupt: print("棍母")` 原样生效。
  await py.runPythonAsync(`
import js

async def _ask(prompt=""):
    try:
        return await js.__askJs(prompt)
    except Exception as e:                 # noqa: BLE001 —— 只认我们自己发的 SIGINT
        if "SIGINT" in str(e):
            raise KeyboardInterrupt
        raise
`)
  ;(globalThis as unknown as { ask: unknown }).ask = py.globals.get('_ask')

  // asyncio.run 在 Pyodide 的事件循环里不能直接调 → 这里换成"排进当前 loop"，
  // 再把它 await 掉。注意：改的是 runner 的行为，.pychess.py 一个字没动。
  const runner = `
import asyncio
_src = open('/home/xfy/${GAME_FILE}', encoding='utf-8').read()
_ns = {'__name__': '__main__'}
_tasks = []
_real_run = asyncio.run
asyncio.run = lambda coro: (_tasks.append(asyncio.ensure_future(coro)), None)[1]
try:
    exec(compile(_src, '${GAME_FILE}', 'exec'), _ns)
finally:
    asyncio.run = _real_run
if _tasks:
    await _tasks[0]
`
  term.print(`<span class="dim">python3 ${GAME_FILE}</span>`)
  try {
    await py.runPythonAsync(runner)
  } catch (err) {
    const msg = String(err)
    if (!msg.includes('SystemExit')) {
      const lines = msg.split('\n').filter(l => l.trim().length > 0)
      term.print(`<span class="err">${esc(lines.slice(-4).join(' / ').slice(0, 400))}</span>`)
    }
  }
  term.syncPrompt()
}

/** 注册 python3 / apt（都不进 help） */
export function registerPythonCommands(term: Terminal): void {
  const runPython = async (args: string[]): Promise<void> => {
    if (args.includes('--version') || args.includes('-V')) {
      if (!isInstalled()) { term.print(notFoundHint('python3')); return }
      term.print(`Python ${await pythonVersion()}`)
      return
    }
    const file = args.find(a => !a.startsWith('-'))
    if (!file) {
      if (!isInstalled()) { term.print(notFoundHint('python3')); return }
      term.print(`Python ${await pythonVersion()}`)
      term.print('<span class="dim">用法：python3 &lt;文件.py&gt;</span>')
      return
    }
    if (!isInstalled()) { term.print(notFoundHint('python3')); return }
    if (file !== GAME_FILE) {
      term.print(`<span class="err">python3: can't open file '${esc(file)}': [Errno 2] No such file or directory</span>`)
      return
    }
    await runGame(term)
  }

  term.commands.set('python3', { name: 'python3', desc: '', hidden: true, run: (_t, args) => runPython(args) })
  term.commands.set('python', { name: 'python', desc: '', hidden: true, run: (_t, args) => runPython(args) })

  term.commands.set('apt', {
    name: 'apt', desc: '', hidden: true,
    run: async (t, args) => {
      const sub = args[0] ?? ''
      const pkgs = args.slice(1)
      if (sub === 'install') {
        if (pkgs.includes('python3') || pkgs.includes('python')) { await aptInstall(t); return }
        t.print(`<span class="err">E: 无法定位软件包 ${esc(pkgs.join(' ') || '(空)')}</span>`)
        return
      }
      if (sub === 'update') { t.print('正在读取软件包列表... 完成'); return }
      t.print('<span class="dim">用法：apt install python3</span>')
    },
  })
}
