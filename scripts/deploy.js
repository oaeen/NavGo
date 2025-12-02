#!/usr/bin/env node

/**
 * NavGO 部署脚本
 *
 * 功能：
 * 1. 构建生产版本
 * 2. 打包为 ZIP 文件（可直接上传到 Chrome Web Store）
 *
 * 使用方法：
 *   node scripts/deploy.js
 */

import { execSync } from 'child_process'
import { createWriteStream, readdirSync, statSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')
const releaseDir = join(rootDir, 'release')

// 获取版本号
function getVersion() {
  const manifestPath = join(rootDir, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  return manifest.version
}

// 执行构建
function build() {
  console.log('正在构建...')
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })
  console.log('构建完成！')
}

// 收集目录中的所有文件
function collectFiles(dir, baseDir = dir) {
  const files = []
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir))
    } else {
      files.push({
        path: fullPath,
        relativePath: relative(baseDir, fullPath)
      })
    }
  }

  return files
}

// 创建 ZIP 文件（使用简单的方式，不依赖额外包）
async function createZip() {
  const version = getVersion()
  const zipName = `navgo-v${version}.zip`

  // 确保 release 目录存在
  if (!existsSync(releaseDir)) {
    mkdirSync(releaseDir, { recursive: true })
  }

  const zipPath = join(releaseDir, zipName)

  console.log(`正在打包: ${zipName}`)

  // 使用系统命令打包（Windows 使用 PowerShell，其他系统使用 zip）
  const isWindows = process.platform === 'win32'

  if (isWindows) {
    // Windows: 使用 PowerShell 的 Compress-Archive
    const cmd = `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`
    execSync(cmd, { stdio: 'inherit' })
  } else {
    // Linux/Mac: 使用 zip 命令
    execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' })
  }

  console.log(`打包完成: ${zipPath}`)
  return zipPath
}

// 主函数
async function main() {
  console.log('====== NavGO 部署脚本 ======\n')

  try {
    // 1. 构建
    build()
    console.log('')

    // 2. 打包
    const zipPath = await createZip()
    console.log('')

    console.log('====== 部署完成 ======')
    console.log(`\nZIP 文件位置: ${zipPath}`)
    console.log('\n下一步:')
    console.log('1. 前往 https://chrome.google.com/webstore/devconsole')
    console.log('2. 上传 ZIP 文件')
    console.log('3. 填写扩展信息并发布')

  } catch (error) {
    console.error('部署失败:', error.message)
    process.exit(1)
  }
}

main()
