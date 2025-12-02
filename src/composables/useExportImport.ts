import JSZip from 'jszip'
import type { Site, AppConfig, ExportData } from '@/types'
import { base64ToBlob, getImageExtension } from '@/utils/image'

const EXPORT_VERSION = '1.0.0'

interface FullExportData {
  version: string
  config: AppConfig
  sites: Site[]
}

/**
 * 导出为 ZIP 压缩包
 */
export async function exportToZip(
  sites: Site[],
  config: AppConfig
): Promise<Blob> {
  const zip = new JSZip()

  // 准备配置数据（不含 Base64 图标）
  const exportConfig: ExportData = {
    version: EXPORT_VERSION,
    config: {
      ...config,
      wallpaper: config.wallpaper ? 'wallpaper.jpg' : null
    },
    sites: sites.map(site => ({
      id: site.id,
      name: site.name,
      url: site.url,
      order: site.order
    }))
  }

  // 添加配置文件
  zip.file('config.json', JSON.stringify(exportConfig, null, 2))

  // 创建图标文件夹
  const iconsFolder = zip.folder('icons')

  // 导出网站图标
  for (const site of sites) {
    if (site.icon && site.icon.startsWith('data:')) {
      const ext = getImageExtension(site.icon)
      const blob = base64ToBlob(site.icon)
      iconsFolder?.file(`${site.id}.${ext}`, blob)

      // 更新配置中的图标路径
      const siteInConfig = exportConfig.sites.find(s => s.id === site.id)
      if (siteInConfig) {
        (siteInConfig as Site).icon = `icons/${site.id}.${ext}`
      }
    }
  }

  // 导出壁纸
  if (config.wallpaper && config.wallpaper.startsWith('data:')) {
    const ext = getImageExtension(config.wallpaper)
    const blob = base64ToBlob(config.wallpaper)
    zip.file(`wallpaper.${ext}`, blob)
    exportConfig.config.wallpaper = `wallpaper.${ext}`
  }

  // 更新配置文件（包含正确的路径）
  zip.file('config.json', JSON.stringify(exportConfig, null, 2))

  return await zip.generateAsync({ type: 'blob' })
}

/**
 * 从 ZIP 压缩包导入
 */
export async function importFromZip(file: File): Promise<FullExportData> {
  const zip = await JSZip.loadAsync(file)

  // 读取配置文件
  const configFile = zip.file('config.json')
  if (!configFile) {
    throw new Error('无效的备份文件：缺少 config.json')
  }

  const configText = await configFile.async('text')
  const exportData = JSON.parse(configText) as ExportData

  // 还原网站图标
  const sites: Site[] = []
  for (const site of exportData.sites) {
    const siteWithIcon: Site = {
      ...site,
      icon: null
    }

    // 检查是否有图标文件
    const iconPath = (site as Site).icon
    if (iconPath && typeof iconPath === 'string') {
      const iconFile = zip.file(iconPath)
      if (iconFile) {
        const iconBlob = await iconFile.async('blob')
        siteWithIcon.icon = await blobToBase64(iconBlob)
      }
    }

    sites.push(siteWithIcon)
  }

  // 还原壁纸
  let wallpaper: string | null = null
  if (exportData.config.wallpaper && typeof exportData.config.wallpaper === 'string') {
    const wallpaperFile = zip.file(exportData.config.wallpaper)
    if (wallpaperFile) {
      const wallpaperBlob = await wallpaperFile.async('blob')
      wallpaper = await blobToBase64(wallpaperBlob)
    }
  }

  return {
    version: exportData.version,
    config: {
      ...exportData.config,
      wallpaper
    },
    sites
  }
}

/**
 * 从 JSON 文件导入（简单格式）
 */
export async function importFromJson(file: File): Promise<FullExportData> {
  const text = await file.text()
  const data = JSON.parse(text)

  // 验证数据格式
  if (!data.sites || !Array.isArray(data.sites)) {
    throw new Error('无效的配置格式：缺少 sites 数组')
  }

  return {
    version: data.version || '1.0.0',
    config: data.config || {
      wallpaper: null,
      searchEngine: 'google'
    },
    sites: data.sites.map((site: Partial<Site>, index: number) => ({
      id: site.id || generateId(),
      name: site.name || '未命名',
      url: site.url || '',
      icon: site.icon || null,
      order: site.order ?? index
    }))
  }
}

/**
 * 从 GitHub 链接导入
 */
export async function importFromGitHub(url: string): Promise<FullExportData> {
  // 转换为 raw 链接
  let rawUrl = url
  if (url.includes('github.com') && url.includes('/blob/')) {
    rawUrl = url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/')
  }

  const response = await fetch(rawUrl)
  if (!response.ok) {
    throw new Error('无法获取配置文件')
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/zip') || rawUrl.endsWith('.zip')) {
    const blob = await response.blob()
    const file = new File([blob], 'config.zip', { type: 'application/zip' })
    return importFromZip(file)
  }

  const text = await response.text()

  return importFromJson(new File([text], 'config.json', { type: 'application/json' }))
}

/**
 * 导出下载
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
