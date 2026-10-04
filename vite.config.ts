import { defineConfig } from 'vite'

// 产物是"HTML + CSS + JS + 图片"，丢到服务器任意目录都能跑，
// 所以 base 用相对路径（不用管挂在 / 还是 /home）。
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
    rollupOptions: {
      // 两个页面：主页，和服务器 404 时用的那个（同一台终端）
      input: {
        main: 'index.html',
        notfound: '404.html',
      },
    },
  },
})
