# xfy-home

xfyweb.cn 的主页 —— **一个终端风格的静态单页**。

## 技术

- **Vite + 原生 TypeScript**，没有框架、没有运行时依赖
- 产物：一个 HTML + 一个 CSS + 一个 JS（gzip 后约 12 KB）+ 图片
- 无后端、无统计、无外部 CDN —— 字体用系统等宽字体，图标是项目自己的 logo

```
pnpm install        # 或 npm install
pnpm dev            # 本地开发（默认 http://localhost:5173）
pnpm build          # 类型检查 + 构建到 dist/
pnpm preview        # 预览构建产物
```

部署就是把 `dist/` 整个丢到服务器目录（`base` 用的是相对路径，挂根目录或子目录都能跑）。

## 内容在哪

| 想改什么 | 改哪 |
|---|---|
| 项目清单（名字 / 一句话 / 标签 / 链接 / 详情页正文） | `src/data/projects.ts` |
| 迷你文件系统（about.md、links.txt、.bashrc、projects/、brand/） | `src/term/fs.ts` |
| 命令行为（ls / cat / cd / view / neofetch…） | `src/term/commands.ts` |
| 终端引擎（提示符、历史、补全、自动滚动） | `src/term/terminal.ts` |
| 开机横幅的顺序与内容 | `src/main.ts` |
| 配色、字号、响应式 | `src/style.css` 顶部的 CSS 变量 |
| 图片资源 | `public/brand/` |

`ls` / `cat` 不是"命令 → 固定回答"，它们真的在读 `fs.ts` 里那棵树：
所以 `ls -a` 会多出隐藏文件、`cat` 会报 `No such file or directory` —— 这些行为不用特判。

## 头像是怎么来的（可复现）

头像不是图片，是**字符画**（盲文点阵，40 行 × 79 字符 ≈ 1.4 KB 文本），
所以它跟着终端一起缩放、一起变色，也不需要额外请求。

管线两步：

1. 用 [img2unicode](https://pypi.org/project/img2unicode/) 把 `avatar.jpg` 渲染成 80×40 的盲文点阵：

   ```bash
   python -c "import img2unicode as i; from PIL import Image; \
   r=i.GammaRenderer(max_w=80, max_h=40, allow_upscale=True); \
   chars,_,_ = r.render_numpy(Image.open('avatar.jpg'), optimizer=i.BasicGammaOptimizer(use_color=False, charmask='braille')); \
   print('\n'.join(''.join(chr(c) for c in row) for row in chars))" > input.txt
   ```

2. 点阵取反（黑点 ↔ 空点），让背景留空、人物由亮点构成：

   ```bash
   python tools/invert_braille.py input.txt src/data/avatar.txt
   ```

⚠️ 注意第 2 步是**对渲染结果取反**（每个盲文字符 `0x28FF - offset`），
不是"先把图片像素取反再渲染" —— 后者会让渲染器重新优化点阵，出来的不是负片。

## 许可

代码随便看。项目 logo 与头像属于各自项目 / 作者本人。
