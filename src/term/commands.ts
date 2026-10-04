/**
 * 命令实现。
 */
import { Terminal, esc, linkify, type Command } from './terminal'
import { HOME, ROOT, list, resolve, sizeOf, human, normalize, type Entry } from './fs'
import { PROJECTS } from '../data/projects'

/** QQ 群（腾讯官方加群链接，原样保留；样式改造成终端风） */
export const QQ_GROUP = {
  name: '小区',
  number: '3593306159',
  url: 'https://qm.qq.com/cgi-bin/qm/qr?k=an1LCnLvbwDlNJnq0kMMGrWVLSFN-Q6N&jump_from=webapi' +
       '&authKey=0Z2lNJ2QY6RUrBKdME11NayIzn+09mHTLRFU7J48G4RPfkSjwfuBQZNuCCDcjJEw',
}

const GITHUB = 'https://github.com/xfy2412'
const ORG = 'https://github.com/xfyweb'
const NPM = 'https://www.npmjs.com/~xfy2412'
const MQE_DOCS = 'https://mqe.xfyweb.cn/docs/'

// ── 可复用的区块（开机横幅与命令共用）──────────────────────────────

export function renderWhoami(t: Terminal, art: string): void {
  const wrap = document.createElement('div')
  wrap.className = 'who'
  wrap.innerHTML = `
    <div class="artwrap"><pre class="art"></pre></div>
    <div class="info">
      <div class="name">XFY</div>
      <div class="tag">器不在大，适用则灵</div>
      <div class="sub">独立开发 · 桌面端 / 服务端 / 网页 / Android</div>
      <div class="org">
        <img src="./brand/xfyweb.png" alt="xfyweb" width="30" height="30">
        <span>组织 <b>xfyweb</b> · <a href="${ORG}" target="_blank" rel="noopener">github.com/xfyweb</a></span>
      </div>
    </div>`
  const pre = wrap.querySelector('pre')!
  pre.textContent = art
  t.node(wrap)
}

/** 项目长列表：图标 + 名字 + 一句话 + 标签 */
export function renderProjects(t: Terminal): void {
  const box = document.createElement('div')
  box.className = 'box'
  for (const p of PROJECTS) {
    const row = document.createElement('div')
    row.className = 'prow'
    const icon = p.logo
      ? `<img src="${p.logo}" alt="" width="20" height="20">`
      : p.lang
        ? `<span class="lang" style="background:${p.lang.color};color:${p.lang.fg}">${esc(p.lang.text)}</span>`
        : '<b>▣</b>'
    const name = p.link
      ? `<a href="${p.link}" target="_blank" rel="noopener">${esc(p.dir)}</a>`
      : esc(p.dir)
    row.innerHTML =
      `<span class="ico">${icon}</span>` +
      `<span class="nm">${name}</span>` +
      `<span class="ds">${esc(p.desc)}</span>` +
      `<span class="tg">${esc(p.tag)}</span>`
    box.appendChild(row)
  }
  t.node(box)
}

/** 联系方式 + 加群按钮（腾讯官方组件的终端风改造） */
export function renderLinks(t: Terminal): void {
  t.print(`<span class="dim">github&nbsp;&nbsp;&nbsp;</span> <a href="${GITHUB}" target="_blank" rel="noopener">${GITHUB}</a>`)
  t.print(`<span class="dim">org&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> <a href="${ORG}" target="_blank" rel="noopener">${ORG}</a>`)
  t.print(`<span class="dim">npm&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> <a href="${NPM}" target="_blank" rel="noopener">npmjs.com/~xfy2412</a>`)
  t.print(`<span class="dim">mqe docs&nbsp;</span> <a href="${MQE_DOCS}" target="_blank" rel="noopener">${MQE_DOCS}</a>`)

  const qq = document.createElement('div')
  qq.className = 'box'
  qq.style.maxWidth = '460px'
  qq.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <img src="./brand/qq.png" alt="" width="34" height="34" style="border-radius:50%">
      <span>QQ 群 <b>${esc(QQ_GROUP.name)}</b> <span class="dim">(${QQ_GROUP.number})</span></span>
      <a href="${QQ_GROUP.url}" target="_blank" rel="noopener"
         style="margin-left:auto;border:1px solid var(--line);border-radius:6px;padding:3px 12px;
                border-bottom:1px solid var(--line);color:var(--green)">＋ 加群</a>
    </div>`
  t.node(qq)
}

/** 页脚：logo 墙 */
export function renderWall(t: Terminal): void {
  const wall = document.createElement('div')
  wall.className = 'wall'
  wall.innerHTML = `
    <img src="./brand/xfyweb.png" alt="xfyweb">
    <img src="./brand/randomdice.png" alt="RandomDice">
    <img src="./brand/mqe.png" alt="MQE">
    <img class="dark" src="./brand/worktimer.png" alt="WorkTimer">
    <img class="round" src="./brand/qq.png" alt="QQ">
    <img class="round" src="./brand/avatar.png" alt="XFY">
    <span class="cap">xfyweb 组织 · 各项目 · QQ · 本人</span>`
  t.node(wall)
}

// ── cat 的极简 markdown 渲染 ────────────────────────────────────────

function renderMarkdown(t: Terminal, body: string): void {
  let inFence = false
  for (const raw of body.replace(/\n+$/, '').split('\n')) {
    if (raw.startsWith('```')) { inFence = !inFence; continue }
    if (inFence) { t.text('  ' + raw); continue }
    if (raw.startsWith('# ')) { t.print(`<b class="h">${esc(raw.slice(2))}</b>`); continue }
    if (raw.startsWith('## ')) { t.print(`<b>${esc(raw.slice(3))}</b>`); continue }
    if (raw.startsWith('|')) {
      const cells = raw.split('|').slice(1, -1).map(c => c.trim())
      if (cells.every(c => /^-+$/.test(c) || c === '')) continue
      t.print('<span class="dim">│</span> ' + cells.map(c => linkify(c).replace(/\*\*/g, '')).join(' <span class="dim">│</span> '))
      continue
    }
    if (raw.startsWith('- ')) { t.print('  <span class="dim">•</span> ' + linkify(raw.slice(2)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')); continue }
    t.print(linkify(raw).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'))
  }
}

// ── ls ─────────────────────────────────────────────────────────────

function modeOf(e: Entry): string {
  return e.kind === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'
}

function lsLong(t: Terminal, entries: Entry[]): void {
  for (const e of entries) {
    const size = human(sizeOf(e))
    const name = e.kind === 'dir'
      ? `<span class="h">${esc(e.name)}/</span>`
      : esc(e.name)
    t.print(`<span class="dim">${modeOf(e)}&nbsp; xfy&nbsp; staff&nbsp; ${size.padStart(8)}&nbsp;</span> ${name}`)
  }
}

function isProjectsDir(path: string): boolean {
  return normalize('/', path) === '/projects'
}

// ── 注册命令 ───────────────────────────────────────────────────────

export function registerCommands(t: Terminal, boot: { art: string }): void {
  const add = (c: Command): void => { t.commands.set(c.name, c) }

  add({
    name: 'help', desc: '这份说明',
    run: (term) => {
      term.print('<b>能用的命令</b>')
      const cmds = [...term.commands.values()].filter(c => !c.hidden).sort((a, b) => a.name.localeCompare(b.name))
      for (const c of cmds) {
        term.print(`  <span class="amber">${c.name.padEnd(9)}</span><span class="dim">${esc(c.desc)}</span>`)
      }
    },
  })

  add({
    name: 'whoami', desc: '我是谁',
    run: (term) => renderWhoami(term, boot.art),
  })

  add({
    name: 'ls', desc: '列目录', usage: 'ls [-l] [-a] [路径]',
    run: (term, args) => {
      const flags = args.filter(a => a.startsWith('-')).join('')
      const long = flags.includes('l')
      const all = flags.includes('a')
      const path = args.find(a => !a.startsWith('-')) ?? '.'
      const node = resolve(term.cwd, path)
      if (!node) { term.print(`<span class="err">ls: ${esc(path)}: No such file or directory</span>`); return }
      if (node.kind === 'file') { term.text(node.name); return }

      if (long && isProjectsDir(path)) { renderProjects(term); return }

      const entries = list(node, all)
      if (entries.length === 0) return
      if (long) { lsLong(term, entries); return }
      const names = entries.map(e =>
        e.kind === 'dir'
          ? `<span class="h">${esc(e.name)}/</span>`
          : e.hidden ? `<span class="dim">${esc(e.name)}</span>` : esc(e.name))
      term.print(names.join('&nbsp;&nbsp;&nbsp;'))
    },
  })

  add({
    name: 'cat', desc: '看文件内容', usage: 'cat <文件>',
    run: (term, args) => {
      if (!args[0]) { term.print('<span class="err">cat: 缺少文件名</span>'); return }
      const node = resolve(term.cwd, args[0])
      if (!node) { term.print(`<span class="err">cat: ${esc(args[0])}: No such file or directory</span>`); return }
      if (node.kind === 'dir') { term.print(`<span class="err">cat: ${esc(args[0])}: Is a directory</span>`); return }
      if (node.image) { term.print(`<span class="dim">${esc(node.name)} 是图片，用</span> <span class="amber">view ${esc(node.name)}</span> <span class="dim">看。</span>`); return }
      renderMarkdown(term, node.body ?? '')
    },
  })

  add({
    name: 'cd', desc: '换目录', usage: 'cd [目录]',
    run: (term, args) => {
      const target = args[0] ?? HOME
      const node = resolve(term.cwd, target)
      if (!node) { term.print(`<span class="err">cd: ${esc(target)}: No such file or directory</span>`); return }
      if (node.kind !== 'dir') { term.print(`<span class="err">cd: ${esc(target)}: Not a directory</span>`); return }
      term.cwd = normalize(term.cwd, target)
      term.syncPrompt()
    },
  })

  add({
    name: 'pwd', desc: '当前目录',
    run: (term) => term.text(term.cwd === '/' ? '/home/xfy' : term.cwd),
  })

  add({
    name: 'view', desc: '打开图片', usage: 'view <图片>',
    run: (term, args) => {
      const brand = resolve('/', '/brand')
      const images = brand && brand.kind === 'dir'
        ? brand.children.filter((c): c is Entry & { image: string } => 'image' in c && !!c.image)
        : []
      if (!args[0]) {
        term.print('<span class="dim">可看的图：</span>' + images.map(i => `<span class="amber">${esc(i.name)}</span>`).join('&nbsp; '))
        return
      }
      const node = resolve(term.cwd, args[0]) ?? resolve('/', '/brand/' + args[0])
      if (!node || node.kind !== 'file' || !node.image) {
        term.print(`<span class="err">view: ${esc(args[0])}: 没有这张图</span>`)
        return
      }
      const el = document.createElement('div')
      el.className = 'viewer'
      el.innerHTML = `
        <img src="${node.image}" alt="${esc(node.name)}">
        <div class="meta"><span>${esc(node.name)}</span><span>${human(sizeOf(node))}</span></div>`
      term.node(el)
      const img = el.querySelector('img')!
      img.addEventListener('load', () => {
        const m = el.querySelector('.meta')!
        m.firstElementChild!.textContent =
          `${node.name}  ${img.naturalWidth}×${img.naturalHeight}`
      }, { once: true })
    },
  })

  add({
    name: 'projects', desc: '项目列表',
    run: (term) => renderProjects(term),
  })

  add({
    name: 'links', desc: '联系方式',
    run: (term) => renderLinks(term),
  })

  add({
    name: 'neofetch', desc: '系统信息',
    run: (term) => {
      const art = [
        '   ▄▄▄▄▄▄   ',
        '  █ ▄▄▄▄ █  ',
        '  █ ████ █  ',
        '  █▄▄▄▄▄▄█  ',
        '   ▀▀▀▀▀▀   ',
      ]
      const info = [
        `<span class="u">xfy</span><span class="p">@</span><span class="h">web</span>`,
        `<span class="dim">-----------</span>`,
        `OS: XFY Linux`,
        `Kernel: 6.x-自定义`,
        `Shell: xfy-sh 1.0`,
        `Uptime: 一直在跑`,
        `Packages: 9 个项目，1 个组织`,
        `Memory: 够用`,
      ]
      const rows = Math.max(art.length, info.length)
      for (let i = 0; i < rows; i++) {
        term.print(`<span class="u">${esc((art[i] ?? '').padEnd(12))}</span>${info[i] ?? ''}`)
      }
    },
  })

  add({
    name: 'clear', desc: '清屏',
    run: (term) => term.clear(),
  })

  add({
    name: 'date', desc: '当前时间',
    run: (term) => term.text(new Date().toString()),
  })

  add({
    name: 'echo', desc: '原样打印', usage: 'echo <文字>',
    run: (term, args) => term.text(args.join(' ')),
  })

  // ── 彩蛋（help 里不出现）──────────────────────────────────────────
  add({
    name: 'sudo', desc: '', hidden: true,
    run: (term) => term.print('<span class="err">sudo: no tty present and no askpass program specified</span>'),
  })
  add({
    name: 'rm', desc: '', hidden: true,
    run: (term) => term.print('<span class="err">rm: read-only file system</span>'),
  })
  add({
    name: 'exit', desc: '', hidden: true,
    run: (term) => term.print('<span class="dim">exit: 这台机器上只有这一个 shell</span>'),
  })
  add({
    name: 'vim', desc: '', hidden: true,
    run: (term) => term.print('<span class="dim">vim: 没有安装，你不会困里面的（笑）</span>'),
  })
}

export { ROOT }
