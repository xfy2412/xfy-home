/**
 * 项目清单 —— 顺序是作者定的，别随意重排。
 * 文案取自各仓库 README / 仓库描述；DevEnvSetup 仓库没有描述，用作者原话。
 */

export interface Project {
  /** 文件名（projects/<slug>.md） */
  slug: string
  /** 列表里显示的目录名 */
  dir: string
  name: string
  /** 一句话 */
  desc: string
  /** 右列标签：语言 / star / 状态 */
  tag: string
  /** 列表小图标：有 logo 用 logo；没有 logo 的用语言色块（GitHub 那套语言色） */
  logo?: string
  lang?: { text: string; color: string; fg: string }
  link?: string
  linkText?: string
  /** cat projects/<slug>.md 的内容 */
  body: string
}

export const PROJECTS: Project[] = [
  {
    slug: 'spc',
    dir: 'ServerPluginCore/',
    name: 'ServerPluginCore',
    desc: '插件驱动的服务器管理平台——极简核心、沙盒化插件',
    tag: 'ts · 私有',
    logo: './brand/spc-logo.svg',
    body: `# ServerPluginCore

插件驱动的服务器管理平台——极简核心、沙盒化插件，万物皆插件。

- 核心只做"装载 / 隔离 / 通信"，能力全部由插件提供
- 插件跑在沙盒里（QuickJS WASM），宿主层只管句柄与生命周期
- 压测与对齐的契约宗主是 Node.js：仿真行为以它为准

当前为私有仓库（组织 xfyweb），开源计划在做。
`,
  },
  {
    slug: 'randomdice',
    dir: 'RandomDice/',
    name: 'RandomDice',
    desc: '离线掷骰子：不只给点数，直接给一句结论',
    tag: 'kotlin',
    logo: './brand/randomdice.png',
    link: 'https://github.com/xfy2412/RandomDice',
    body: `# RandomDice

给生活里那些"不重要、但懒得决定"的事情做判决的小工具。

摇完不只给点数，而是直接给一句结论（执行 / 不执行 / A / B / 大吉…），
再让你把"这次决定了什么"记下来回头翻。

- Kotlin + Jetpack Compose + Material 3，零第三方依赖
- 不联网、不要账号、没有广告、没有统计
- 3D 骰子翻滚，震动与音效跟动画真同步（同一张撞击时刻表）
- 91 个单元测试守着几何、判决、波形、PCM 合成与编解码
`,
  },
  {
    slug: 'mqe',
    dir: 'MQE-Ecosystem/',
    name: 'MQ-Ecosystem',
    desc: 'QQ 驱动的 Minecraft 登录 / 账户 / 互通体系',
    tag: '半收费',
    logo: './brand/mqe.png',
    link: 'https://mqe.xfyweb.cn/docs/',
    linkText: 'mqe.xfyweb.cn/docs',
    body: `# MQ-Ecosystem

QQ 驱动的 Minecraft 登录、账户管理与互通体系。目前完成度最高的一个项目。

| 子项目 | 说明 | 环境 |
|---|---|---|
| QQAuth | Limbo 认证、QQ 绑定/验证码、正版/基岩、防御体系、群聊互通 | Velocity |
| QQHub | 远程命令、性能监控、playerdata 查询 | Paper |
| AuthClient-N | 模组认证握手、设备凭证、凭证连接 UI | NeoForge |
| license-server | 下载/授权服务器：双通道、一言水印、挑战鉴权 | Node + SQLite |
| mqe-panel | 许可证管理面板 | React |
| mqe-download | 下载中心与文档站 | Vue + VitePress |

付费为实例付费与超前点播月卡并行：基础实例 10 元，扩展实例 3 元；
正式发布的功能永久免费，月卡只用于尚未公测的预览功能。

文档：https://mqe.xfyweb.cn/docs/
`,
  },
  {
    slug: 'node-status',
    dir: 'node_status_server/',
    name: 'node_status_server',
    desc: '轻量级服务器状态实时监控',
    tag: 'js ★2',
    lang: { text: 'JS', color: '#f7df1e', fg: '#1b1b1b' },
    link: 'https://github.com/xfy2412/node_status_server_open_source',
    body: `# node_status_server

一个轻量级的服务器状态实时监控系统（Node.js + Express）。

- 实时显示 CPU、内存等资源占用
- 保存最近 10 分钟历史（每 10 秒记一次）
- Chart.js 动态图表，响应式，手机也能看
- 显示系统信息与访问 IP 统计

git clone 之后 npm install && npm start 就完了，监听 3000。
`,
  },
  {
    slug: 'aul',
    dir: 'AUL/',
    name: 'AmongUsLauncher',
    desc: '管理 AmongUs 的版本、服务器与模组',
    tag: 'c# / rust ★2',
    lang: { text: 'R', color: '#dea584', fg: '#2a1a10' },
    link: 'https://github.com/xfy2412/AmongUsLauncher-Rust',
    body: `# AmongUsLauncher（AUL）

我的第一个项目。从 C#/WPF 写到 Rust，一路用来管理 AmongUs 的
游戏版本、服务器和模组。

- 版本管理：多个游戏版本共存、一键切换
- 服务器管理：快速配置与启动
- 模组管理：BepInEx 模组的一键安装与开关
`,
  },
  {
    slug: 'xfyusbkey',
    dir: 'XFYUsbKey/',
    name: 'XFYUsbKey',
    desc: 'U 盘当钥匙解锁 Windows',
    tag: 'c++ / c#',
    lang: { text: 'C++', color: '#f34b7d', fg: '#ffffff' },
    link: 'https://github.com/xfy2412/XFYUsbKey',
    body: `# XFYUsbKey

用 USB 代替密码登录 Windows（思路仿 rohos logon key）。

- XFYUsbKey.CredentialProvider：C++ COM DLL，锁屏界面的认证磁贴
- XFYUsbKey.Manager：C# WPF 的密钥管理配置工具
- tools/deploy.ps1：VM 内一键部署
`,
  },
  {
    slug: 'worktimer',
    dir: 'WorkTimer/',
    name: 'WorkTimer',
    desc: '.NET 8 WPF 半透明悬浮计时器',
    tag: 'c#',
    logo: './brand/worktimer.png',
    link: 'https://github.com/xfy2412/WorkTimer',
    body: `# WorkTimer

开机自启动的半透明桌面悬浮窗计时器，记录每日工作时长。

- 默认 15% 透明度，鼠标穿透不打扰；悬停 2 秒亮起可交互
- 左键单击暂停/继续，暂停时琥珀色闪烁提醒
- 关机续接：下次开机弹出续接提示（10 秒倒计时）
- 每 30 秒心跳，脏关机也能精确算暂停时长
- SQLite 存数据，托盘常驻，位置记忆

技术栈：.NET 8 WPF + Microsoft.Data.Sqlite + Hardcodet.NotifyIcon.Wpf
`,
  },
  {
    slug: 'devenvsetup',
    dir: 'DevEnvSetup/',
    name: 'DevEnvSetup',
    desc: '一键把需要的窗口打开并移到记录的位置',
    tag: 'ps1',
    lang: { text: 'PS', color: '#012456', fg: '#cfe3ff' },
    link: 'https://github.com/xfy2412/DevEnvSetup',
    body: `# DevEnvSetup

在学校编程时写的：一键把需要的窗口打开，并移动到记录的位置。

- 记住每个窗口的位置与尺寸
- 一条命令把整套开发环境摆回来
- PowerShell 实现，不装任何东西
`,
  },
]
