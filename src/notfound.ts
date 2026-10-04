/**
 * 404 页：同一台终端，只是这次敲的命令找不到东西。
 *
 * 它不注册任何命令 —— 这里只需要"像终端"，不需要一个能用的 shell。
 * 想回主页就点那条链接，或者在输入框里敲 `cd ~` / `home`。
 */
import './style.css'
import { Terminal, esc } from './term/terminal'

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

/** 访客原本想去的路径（nginx 会把原始 URI 放在这里） */
const wanted = location.pathname + location.search

const HOME = '<a href="/">cd ~</a>'

async function boot(): Promise<void> {
  term.autoScroll = false
  await term.typeLine(term.promptHTML() + ' cd ' + esc(wanted), 38)
  term.print(`<span class="err">bash: cd: ${esc(wanted)}: No such file or directory</span>`)
  term.print('')
  term.print('<span class="dim">这个地址没有对应的东西。可能它挪走了，也可能从来就没有过。</span>')
  term.print('')
  term.print(`<span class="dim">回主页：</span>${HOME} <span class="dim">（或者直接点这里）</span>`)
  term.print(`<span class="dim">找项目：</span><a href="/#">xfyweb.cn</a> <span class="dim">·</span> ` +
             `<a href="https://github.com/xfy2412" target="_blank" rel="noopener">github.com/xfy2412</a>`)
  term.autoScroll = true
  term.focus()
}

// 敲什么都只回一句 —— 这是个 404，不是一个真的 shell
term.commands.set('home', { name: 'home', desc: '', hidden: true, run: () => { location.href = '/' } })
term.commands.set('cd', {
  name: 'cd', desc: '', hidden: true,
  run: (t, args) => {
    if (!args[0] || args[0] === '~' || args[0] === '/') { location.href = '/'; return }
    t.print(`<span class="err">bash: cd: ${esc(args[0])}: No such file or directory</span>`)
  },
})

void boot()
