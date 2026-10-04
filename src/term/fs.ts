/**
 * 迷你文件系统。
 *
 * `ls` 真的在读目录、`cat` 真的在读文件、`view` 真的在打开图片 ——
 * 所以 `cat` 会报"没有那个文件"，这些行为都不用特判。
 */
import { PROJECTS } from '../data/projects'
import { GAME_FILE, GAME_SOURCE } from './py-commands'

export interface FileNode {
  kind: 'file'
  name: string
  hidden?: boolean
  /** 文本内容；图片文件为空 */
  body?: string
  /** 图片文件：/brand/xxx.png 这类真实资源 */
  image?: string
  bytes?: number
}

export interface DirNode {
  kind: 'dir'
  name: string
  hidden?: boolean
  children: Entry[]
}

export type Entry = FileNode | DirNode

const file = (name: string, body: string, hidden = false): FileNode => ({
  kind: 'file', name, body, hidden,
})
const image = (name: string, src: string, bytes: number, hidden = false): FileNode => ({
  kind: 'file', name, image: src, bytes, hidden,
})
const dir = (name: string, children: Entry[], hidden = false): DirNode => ({
  kind: 'dir', name, children, hidden,
})

const ABOUT = `# 关于

XFY（xfy2412）—— 器不在大，适用则灵。

做工具，也管服务器。习惯是把反复出现的麻烦事做成一次性的东西，
然后让它一直跑下去。

- 桌面端：C# / .NET、C++
- 服务端：Node.js、Java（Velocity / Paper 插件）
- 网页：TypeScript、Vue / React
- 移动端：Kotlin + Compose（见 RandomDice）

`

const LINKS = `github    https://github.com/xfy2412
org       https://github.com/xfyweb
npm       https://www.npmjs.com/~xfy2412
mqe docs  https://mqe.xfyweb.cn/docs/
qq group  3593306159   （群名：小区）
site      https://xfyweb.cn
`

const BASHRC = `# ~/.bashrc
export PS1='\\u@\\h:\\w\\$ '
alias ll='ls -la'
alias dice='cd ~/projects/RandomDice && ./gradlew :app:assembleDebug'
alias mqe='cd ~/projects/MQ-Ecosystem && npm run dev'
`

/** 图片资源（view 命令用） */
const IMAGES: Entry[] = [
  image('avatar.jpg', './brand/avatar.jpg', 19_268),
  image('avatar.png', './brand/avatar.png', 65_536),
  image('mqe-poster.png', './brand/mqe-poster.png', 273_806),
  image('mqe.png', './brand/mqe.png', 189_000),
  image('randomdice.png', './brand/randomdice.png', 23_000),
  image('worktimer.png', './brand/worktimer.png', 31_000),
  image('qq.png', './brand/qq.png', 8_000),
  image('xfyweb.png', './brand/xfyweb.png', 61_000),
  image('spc-logo.svg', './brand/spc-logo.svg', 4_000),
]

export const ROOT: DirNode = dir('/', [
  file('about.md', ABOUT),
  file('links.txt', LINKS),
  file('.bashrc', BASHRC, true),
  file(GAME_FILE, GAME_SOURCE, true),
  dir('projects', PROJECTS.map(p =>
    file(`${p.slug}.md`, p.body ?? `# ${p.name}\n\n${p.desc}\n`)
  )),
  dir('brand', IMAGES),
])

export const HOME = '/'

/** 把 path 归一化成绝对路径（支持 . .. ~ 与前缀 ~/） */
export function normalize(cwd: string, path: string): string {
  let p = path.trim()
  if (p === '' ) return cwd
  if (p === '~') p = HOME
  else if (p.startsWith('~/')) p = HOME + '/' + p.slice(2)
  const base = p.startsWith('/') ? [] : cwd.split('/').filter(Boolean)
  const parts = p.startsWith('/') ? [] : base
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') { parts.pop(); continue }
    parts.push(seg)
  }
  return '/' + parts.join('/')
}

/** 解析一个路径；不存在返回 null */
export function resolve(cwd: string, path: string): Entry | null {
  const abs = normalize(cwd, path)
  if (abs === '/') return ROOT
  let node: Entry = ROOT
  for (const seg of abs.split('/').filter(Boolean)) {
    if (node.kind !== 'dir') return null
    const here: DirNode = node
    const next: Entry | undefined = here.children.find((c: Entry) => c.name === seg)
    if (!next) return null
    node = next
  }
  return node
}

/** 列出目录内容；all=true 时含点文件 */
export function list(node: DirNode, all: boolean): Entry[] {
  return node.children
    .filter(c => all || !c.hidden)
    .slice()
    .sort((a, b) => {
      // 目录在前，其余按名字
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

/** 列目录时逐项补全（Tab 补全用） */
export function complete(cwd: string, prefix: string): string[] {
  const slash = prefix.lastIndexOf('/')
  const dirPart = slash >= 0 ? prefix.slice(0, slash + 1) : ''
  const namePart = slash >= 0 ? prefix.slice(slash + 1) : prefix
  const node = resolve(cwd, dirPart || '.')
  if (!node || node.kind !== 'dir') return []
  return node.children
    .filter(c => c.name.startsWith(namePart))
    .map(c => dirPart + c.name + (c.kind === 'dir' ? '/' : ''))
}

/** 人类可读的字节数 */
export function human(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 文件大小：有真实字节用真实值，否则按内容长度估 */
export function sizeOf(node: Entry): number {
  if (node.kind === 'dir') return 4096
  if (node.bytes) return node.bytes
  return new TextEncoder().encode(node.body ?? '').length
}
