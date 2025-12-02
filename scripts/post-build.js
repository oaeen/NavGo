import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')

// Copy manifest.json
copyFileSync(
  join(rootDir, 'manifest.json'),
  join(distDir, 'manifest.json')
)

// Ensure icons directory exists
const iconsDir = join(distDir, 'icons')
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true })
}

// Copy icons if they exist
const iconSizes = ['16', '48', '128']
for (const size of iconSizes) {
  const srcPath = join(rootDir, 'public', 'icons', `icon${size}.png`)
  const destPath = join(iconsDir, `icon${size}.png`)
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath)
  }
}

console.log('Post-build: Copied manifest.json and icons to dist/')
