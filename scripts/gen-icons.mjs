import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const donut = (bg) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#e0432a"/>
      <stop offset="0.5" stop-color="#f2731d"/>
      <stop offset="1" stop-color="#ffb45a"/>
    </linearGradient>
    <radialGradient id="bg" cx="0.5" cy="0.4" r="0.8">
      <stop offset="0" stop-color="#2c160b"/>
      <stop offset="1" stop-color="#0c0a09"/>
    </radialGradient>
  </defs>
  ${bg}
  <g transform="translate(256 256)">
    <circle r="118" fill="none" stroke="#3a2c22" stroke-width="52"/>
    <circle r="118" fill="none" stroke="url(#g)" stroke-width="52" stroke-linecap="round" stroke-dasharray="520 741" transform="rotate(-90)"/>
    <circle r="118" fill="none" stroke="#f5a623" stroke-width="52" stroke-linecap="round" stroke-dasharray="150 741" transform="rotate(112)"/>
  </g>
</svg>`

const rounded = donut('<rect width="512" height="512" rx="112" fill="url(#bg)"/>')
const full = donut('<rect width="512" height="512" fill="url(#bg)"/>')

async function png(svg, size, name) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(pub, name))
  console.log('✓', name)
}

await png(rounded, 192, 'icon-192.png')
await png(rounded, 512, 'icon-512.png')
await png(full, 512, 'icon-maskable-512.png')
await png(rounded, 180, 'apple-touch-icon.png')
console.log('Iconos (dona) generados en /public')
