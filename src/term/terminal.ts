/**
 * 终端引擎：提示符、回显、历史、Tab 补全、命令分发。
 *
 * 只负责"像终端"，不认识任何具体命令 —— 命令都在 commands.ts 里注册。
 */

export interface Command {
  name: string
  /** help 里的一行说明；hidden 的命令不会出现在 help 里 */
  desc: string
  usage?: string
  hidden?: boolean
  /** 返回值一律忽略 —— 允许写成 `run: (t) => t.print(...)` 这种一行箭头函数 */
  run: (t: Terminal, args: string[], raw: string) => unknown
}

export type Interceptor = (line: string, t: Terminal) => boolean

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 把文本里的裸链接变成可点的 <a> */
export const linkify = (s: string): string =>
  esc(s).replace(/(https?:\/\/[^\s<>"'）)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')

export class Terminal {
  readonly out: HTMLElement
  readonly input: HTMLInputElement
  readonly ps1: HTMLElement
  private readonly scrollHost: HTMLElement
  private readonly cursor: HTMLElement
  private readonly mirror: HTMLElement

  cwd = '/'
  commands = new Map<string, Command>()
  interceptor: Interceptor | null = null
  /** 开机横幅期间关掉自动滚动：让人先看见顶上的头像，而不是被拽到底部 */
  autoScroll = true

  private history: string[] = []
  private historyIndex = 0
  private draft = ''
  private booting = false

  constructor(els: {
    out: HTMLElement
    input: HTMLInputElement
    ps1: HTMLElement
    scrollHost: HTMLElement
    cursor: HTMLElement
    mirror: HTMLElement
  }) {
    this.out = els.out
    this.input = els.input
    this.ps1 = els.ps1
    this.scrollHost = els.scrollHost
    this.cursor = els.cursor
    this.mirror = els.mirror
    this.bind()
  }

  // ── 输出 ──────────────────────────────────────────────────────────

  /** 打印一行（接受 HTML，调用方自己保证安全） */
  print(html = ''): HTMLElement {
    const div = document.createElement('div')
    div.className = 'line'
    div.innerHTML = html
    this.out.appendChild(div)
    this.scrollToEnd()
    return div
  }

  /** 打印纯文本（自动转义 + 链接化） */
  text(s = ''): HTMLElement {
    return this.print(linkify(s))
  }

  /** 打印多行文本 */
  lines(s: string): void {
    for (const l of s.replace(/\n+$/, '').split('\n')) this.text(l)
  }

  /** 打印一段原样保留空白的块（字符画、棋盘） */
  pre(s: string, cls = 'board'): HTMLElement {
    const el = document.createElement('pre')
    el.className = cls
    el.textContent = s
    this.out.appendChild(el)
    this.scrollToEnd()
    return el
  }

  /** 打印一个现成的 DOM 块 */
  node(el: HTMLElement): HTMLElement {
    this.out.appendChild(el)
    this.scrollToEnd()
    return el
  }

  /** 回显一行"提示符 + 命令" */
  echo(cmd: string): void {
    this.print(this.promptHTML() + ' ' + esc(cmd))
  }

  clear(): void {
    this.out.replaceChildren()
  }

  promptHTML(): string {
    const shown = this.cwd === '/' ? '~' : '~' + this.cwd
    return `<span class="u">xfy</span><span class="p">@</span><span class="h">web</span>` +
           `<span class="p">:${esc(shown)}$</span>`
  }

  syncPrompt(): void {
    if (!this.interceptor) this.ps1.innerHTML = this.promptHTML()
  }

  /** 游戏等接管时用：换掉提示符 */
  setPrompt(html: string): void {
    this.ps1.innerHTML = html
  }

  /** 排空输入焦点前的短暂"打字机"效果（跳过：reduced-motion 或 booting 中） */
  get typingDisabled(): boolean {
    return this.booting || matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  async typeLine(html: string, cps = 90): Promise<void> {
    if (this.typingDisabled) { this.print(html); return }
    const el = this.print('')
    const plain = html.replace(/<[^>]+>/g, '')
    for (let i = 1; i <= plain.length; i++) {
      el.innerHTML = html.slice(0, 0) + esc(plain.slice(0, i))
      await sleep(1000 / cps)
    }
    el.innerHTML = html
    this.scrollToEnd()
  }

  setBooting(v: boolean): void { this.booting = v }

  // ── 输入 ──────────────────────────────────────────────────────────

  private bind(): void {
    this.input.addEventListener('keydown', (e) => this.onKey(e))
    for (const ev of ['input', 'keyup', 'click', 'select', 'focus', 'blur'] as const) {
      this.input.addEventListener(ev, () => this.updateCursor())
    }
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a) return
      this.focus()
    })
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.input) this.updateCursor()
    })
  }

  /** 把焦点给输入框，但别让浏览器把输入行滚进视野
   *  （输入行在内容最底部，默认行为会让整块终端"瞬移到底部"） */
  focus(): void { this.input.focus({ preventScroll: true }) }

  /** 把假光标挪到插入符的位置：量出"插入符之前的文字"有多宽即可 */
  private updateCursor(): void {
    const value = this.input.value
    const caret = this.input.selectionStart ?? value.length
    this.mirror.textContent = value.slice(0, caret)
    const offset = this.mirror.getBoundingClientRect().width - this.input.scrollLeft
    const limit = this.input.clientWidth - this.cursor.offsetWidth
    if (offset < 0 || offset > limit) {
      this.cursor.style.visibility = 'hidden'   // 滚出可视区就不画
    } else {
      this.cursor.style.visibility = 'visible'
      this.cursor.style.left = `${offset}px`
    }
  }

  /** 程序化改输入内容时也要跟着挪光标（历史、补全、回车清空） */
  private setInput(value: string): void {
    this.input.value = value
    this.input.setSelectionRange(value.length, value.length)
    this.updateCursor()
  }

  private async onKey(e: KeyboardEvent): Promise<void> {
    // 一旦开始敲键盘，就回到"跟着最新输出走"的正常行为
    if (!this.autoScroll) {
      this.autoScroll = true
      this.scrollToEnd()
    }
    if (e.key === 'Enter') {
      const line = this.input.value
      this.setInput('')
      this.historyIndex = this.history.length
      this.draft = ''
      if (this.interceptor) {
        if (line.trim()) this.interceptor(line.trim(), this)
        return
      }
      if (line.trim()) {
        this.history.push(line)
        this.historyIndex = this.history.length
      }
      this.echo(line)
      await this.dispatch(line.trim())
      return
    }

    if (e.key === 'ArrowUp' && !this.interceptor) {
      e.preventDefault()
      if (this.historyIndex === this.history.length) this.draft = this.input.value
      if (this.historyIndex > 0) this.historyIndex--
      this.setInput(this.history[this.historyIndex] ?? '')
      return
    }
    if (e.key === 'ArrowDown' && !this.interceptor) {
      e.preventDefault()
      if (this.historyIndex < this.history.length) {
        this.historyIndex++
        this.setInput(this.historyIndex === this.history.length
          ? this.draft
          : this.history[this.historyIndex])
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const done = this.complete(this.input.value)
      if (done && done !== this.input.value) this.setInput(done)
      return
    }
    if (e.key === 'l' && e.ctrlKey) {   // Ctrl+L：清屏（真终端的习惯）
      e.preventDefault()
      this.clear()
    }
  }

  /** Tab 补全：第一个词补命令，其余补路径 */
  private complete(value: string): string {
    const parts = value.split(' ')
    if (parts.length === 1) {
      const hits = [...this.commands.values()]
        .filter(c => !c.hidden && c.name.startsWith(parts[0]))
        .map(c => c.name)
      if (hits.length === 1) return hits[0] + ' '
      if (hits.length > 1) { this.echo(value); this.text(hits.join('  ')); return value }
      return value
    }
    const last = parts[parts.length - 1]
    const hits = completePath(this.cwd, last)
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0]
      return parts.join(' ')
    }
    if (hits.length > 1) { this.echo(value); this.text(hits.join('  ')); return value }
    return value
  }

  async dispatch(line: string): Promise<void> {
    if (!line) return
    const [head, ...args] = line.split(/\s+/)
    const cmd = this.commands.get(head)
    if (!cmd) {
      this.print(`<span class="err">xfy-sh: ${esc(head)}: command not found</span>`)
      return
    }
    try {
      await cmd.run(this, args, line)
    } catch (err) {
      this.print(`<span class="err">${esc(String(err))}</span>`)
    }
  }

  scrollToEnd(): void {
    if (!this.autoScroll) return
    this.scrollHost.scrollTop = this.scrollHost.scrollHeight
  }

  scrollToTop(): void {
    this.scrollHost.scrollTop = 0
  }
}

// 延迟注入 fs 的补全（避免循环依赖）
let completePath: (cwd: string, prefix: string) => string[] = () => []
export function setPathCompleter(fn: (cwd: string, prefix: string) => string[]): void {
  completePath = fn
}

export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))
