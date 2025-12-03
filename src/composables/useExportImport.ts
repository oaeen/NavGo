import JSZip from 'jszip'
import type { Site, AppConfig, ExportData, ExportSite, ExportConfig } from '@/types'
import { base64ToBlob, getImageExtension } from '@/utils/image'
import { generateId, blobToBase64 } from '@/utils/common'

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
  const iconsFolder = zip.folder('icons')

  // 正确初始化 exportSites，包含 icon 字段
  const exportSites: ExportSite[] = sites.map(site => ({
    id: site.id,
    name: site.name,
    url: site.url,
    icon: null,  // 初始化为 null，后面更新为路径
    order: site.order
  }))

  // 导出网站图标
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i]
    const exportSite = exportSites[i]
    if (site && exportSite && site.icon && site.icon.startsWith('data:')) {
      const ext = getImageExtension(site.icon)
      const blob = base64ToBlob(site.icon)
      const iconPath = `icons/${site.id}.${ext}`
      iconsFolder?.file(`${site.id}.${ext}`, blob)
      exportSite.icon = iconPath  // 更新为路径
    }
  }

  // 导出壁纸
  let wallpaperPath: string | null = null
  if (config.wallpaper && config.wallpaper.startsWith('data:')) {
    const ext = getImageExtension(config.wallpaper)
    const blob = base64ToBlob(config.wallpaper)
    wallpaperPath = `wallpaper.${ext}`
    zip.file(wallpaperPath, blob)
  }

  // 创建导出配置
  const exportConfig: ExportConfig = {
    wallpaper: wallpaperPath,
    searchEngine: config.searchEngine,
    showAddButton: config.showAddButton,
    iconSize: config.iconSize
  }

  // 创建配置文件
  const exportData: ExportData = {
    version: EXPORT_VERSION,
    config: exportConfig,
    sites: exportSites
  }

  zip.file('config.json', JSON.stringify(exportData, null, 2))

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
      id: site.id,
      name: site.name,
      url: site.url,
      order: site.order,
      icon: null
    }

    // 检查是否有图标文件（ExportSite.icon 现在是路径）
    if (site.icon && typeof site.icon === 'string') {
      try {
        const iconFile = zip.file(site.icon)
        if (iconFile) {
          const iconBlob = await iconFile.async('blob')
          siteWithIcon.icon = await blobToBase64(iconBlob)
        }
      } catch (e) {
        console.warn('[NavGo] Failed to load icon from zip:', site.icon, e)
      }
    }

    sites.push(siteWithIcon)
  }

  // 还原壁纸
  let wallpaper: string | null = null
  if (exportData.config.wallpaper && typeof exportData.config.wallpaper === 'string') {
    try {
      const wallpaperFile = zip.file(exportData.config.wallpaper)
      if (wallpaperFile) {
        const wallpaperBlob = await wallpaperFile.async('blob')
        wallpaper = await blobToBase64(wallpaperBlob)
      }
    } catch (e) {
      console.warn('[NavGo] Failed to load wallpaper from zip:', e)
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
 * 解析 GitHub 输入（用户名或完整 URL）
 */
function parseGitHubInput(input: string): { owner: string; repo: string } {
  input = input.trim()

  // 完整 URL (https://github.com/user/repo)
  if (input.includes('github.com')) {
    const match = input.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/)
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
    }
    throw new Error('无效的 GitHub URL')
  }

  // 只有用户名，使用默认仓库名 NavGoConf
  return { owner: input, repo: 'NavGoConf' }
}

/**
 * 构建 GitHub Raw URL
 */
function buildRawUrl(owner: string, repo: string, branch: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
}

/**
 * 从 GitHub 仓库导入配置
 * 支持输入用户名（使用默认仓库 NavGoConf）或完整 URL
 */
export async function importFromGitHub(input: string): Promise<FullExportData> {
  const { owner, repo } = parseGitHubInput(input)

  // 尝试 main 分支，失败则尝试 master
  let branch = 'main'
  let configUrl = buildRawUrl(owner, repo, branch, 'config.json')
  let response = await fetch(configUrl)

  if (!response.ok) {
    branch = 'master'
    configUrl = buildRawUrl(owner, repo, branch, 'config.json')
    response = await fetch(configUrl)

    if (!response.ok) {
      throw new Error('无法找到配置文件，请确认仓库存在且包含 config.json')
    }
  }

  const exportData = await response.json() as ExportData

  // 并行获取所有图标
  const sites: Site[] = []
  const iconPromises: Promise<void>[] = []

  for (const site of exportData.sites) {
    const siteWithIcon: Site = {
      id: site.id,
      name: site.name,
      url: site.url,
      order: site.order,
      icon: null
    }
    sites.push(siteWithIcon)

    if (site.icon && typeof site.icon === 'string') {
      const iconUrl = buildRawUrl(owner, repo, branch, site.icon)
      iconPromises.push(
        fetch(iconUrl)
          .then(res => res.ok ? res.blob() : null)
          .then(blob => blob ? blobToBase64(blob) : null)
          .then(base64 => { siteWithIcon.icon = base64 })
          .catch((e) => {
            console.warn('[NavGo] Failed to fetch icon from GitHub:', site.icon, e)
          })
      )
    }
  }

  // 获取壁纸
  let wallpaper: string | null = null
  if (exportData.config.wallpaper && typeof exportData.config.wallpaper === 'string') {
    const wallpaperUrl = buildRawUrl(owner, repo, branch, exportData.config.wallpaper)
    try {
      const wallpaperResponse = await fetch(wallpaperUrl)
      if (wallpaperResponse.ok) {
        const blob = await wallpaperResponse.blob()
        wallpaper = await blobToBase64(blob)
      }
    } catch (e) {
      console.warn('[NavGo] Failed to fetch wallpaper from GitHub:', e)
    }
  }

  // 等待所有图标加载完成
  await Promise.all(iconPromises)

  return {
    version: exportData.version,
    config: {
      searchEngine: exportData.config.searchEngine,
      showAddButton: exportData.config.showAddButton ?? true,
      iconSize: exportData.config.iconSize ?? 'medium',
      wallpaper
    },
    sites
  }
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
