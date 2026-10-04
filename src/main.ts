import './style.css'
import avatarArt from './data/avatar.txt?raw'
import { Terminal, setPathCompleter } from './term/terminal'
import { registerCommands, renderLinks, renderProjects, renderWall, renderWhoami } from './term/commands'
import { registerPythonCommands } from './term/py-commands'
import { complete } from './term/fs'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el as T
}

const term = new Terminal({
  out: $('out'),
  input: $<HTMLInputElement>('cmd'),
  ps1: $('ps1'),
  promptline: $('promptline'),
  scrollHost: $('term'),
  cursor: $('cursor'),
  mirror: $('mirror'),
})

setPathCompleter(complete)
registerCommands(term, { art: avatarArt })
registerPythonCommands(term)

/** 顶栏右侧的时钟 */
function tickClock(): void {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  $('clock').textContent = `${p(d.getHours())}:${p(d.getMinutes())}`
}
tickClock()
setInterval(tickClock, 20_000)

/** 开机横幅：把三条命令逐字打出来，再渲染内容 */
async function boot(): Promise<void> {
  term.autoScroll = false          // 横幅期间钉在顶部
  term.setBooting(false)
  const cmd = async (line: string): Promise<void> => {
    await term.typeLine(term.promptHTML() + ' ' + line, 42)
  }

  await cmd('whoami')
  renderWhoami(term, avatarArt)

  await cmd('ls -l projects/')
  renderProjects(term)

  await cmd('cat links.txt')
  renderLinks(term)

  await cmd('tree ~/brand')
  renderWall(term)

  term.setBooting(true)
  term.print('')
  term.print('<span class="dim">输入</span> <span class="amber">help</span> <span class="dim">看命令 —— Tab 补全，↑↓ 翻历史。</span>')

  const foot = document.createElement('footer')
  foot.className = 'foot'
  foot.innerHTML =
    `<span>© ${new Date().getFullYear()} XFY · xfyweb.cn</span>` +
    `<span><a href="https://github.com/xfy2412/xfy-home" target="_blank" rel="noopener">本站源码</a></span>`
  term.node(foot)

  term.syncPrompt()
  term.focus()
  term.scrollToTop()               // 停在顶部：先看见头像和 tagline
}

void boot()
