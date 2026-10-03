import { defineConfig } from 'vite'

// 产物是"一个 HTML + 一个 CSS + 一个 JS + 图片"，丢到服务器任意目录都能跑，
// 所以 base 用相对路径（不用管挂在 / 还是 /home）。
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
  },
})
