import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

const background = '#1f4d3a'

export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background } },
    apple: { ...preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
})
