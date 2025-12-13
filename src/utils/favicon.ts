import { isRuntimeEnv, blobToBase64 } from './common'

// 图标信息接口
export interface IconInfo {
  url: string
  size: number
  type: 'apple-touch-icon' | 'icon' | 'manifest' | 'og:image'
}

// 网站信息接口
export interface SiteInfo {
  title: string | null
  icons: IconInfo[]
}

/**
 * 通过 background script 获取网站标题和图标信息
 */
export async function fetchSiteInfoViaBackground(url: string): Promise<SiteInfo> {
  if (!isRuntimeEnv()) {
    return { title: null, icons: [] }
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_SITE_INFO', url }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ title: null, icons: [] })
          return
        }
        resolve({
          title: response?.title || null,
          icons: response?.icons || []
        })
      })
    } catch {
      resolve({ title: null, icons: [] })
    }
  })
}

/**
 * 通过 background script 获取网站标题（保持向后兼容）
 */
export async function fetchSiteTitleViaBackground(url: string): Promise<string | null> {
  const info = await fetchSiteInfoViaBackground(url)
  return info.title
}

/**
 * 通过 background script 使用解析的图标信息获取高清图标
 */
export async function fetchIconWithParsedInfoViaBackground(
  icons: IconInfo[],
  domain: string,
  url: string
): Promise<string | null> {
  if (!isRuntimeEnv()) return null

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'FETCH_ICON_WITH_INFO', icons, domain, url },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(null)
            return
          }
          resolve(response)
        }
      )
    } catch {
      resolve(null)
    }
  })
}

/**
 * 通过 background script 获取高清图标（保持向后兼容）
 * 使用 Clearbit/icon.horse 等专业图标服务
 */
export async function fetchHighResIconViaBackground(
  domain: string,
  url?: string
): Promise<string | null> {
  if (!isRuntimeEnv()) return null

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_HIGH_RES_ICON', domain, url }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null)
          return
        }
        resolve(response)
      })
    } catch {
      resolve(null)
    }
  })
}

/**
 * 获取网站 Favicon URL（用于预览）
 */
export function getFaviconUrl(url: string, size: number = 128): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
  } catch {
    return ''
  }
}

/**
 * 备选方案：通过 Google Favicon 服务获取图标
 */
export async function fetchFaviconAsBase64(url: string): Promise<string | null> {
  const faviconUrl = getFaviconUrl(url, 128)
  if (!faviconUrl) return null

  try {
    const response = await fetch(faviconUrl, { mode: 'cors' })
    if (!response.ok) return null

    const blob = await response.blob()
    if (blob.size > 100) {
      return await blobToBase64(blob)
    }
  } catch (e) {
    console.warn('[NavGo] Failed to fetch favicon:', e)
  }

  return null
}

/**
 * 综合获取最佳图标
 * 按优先级尝试：
 * 1. 网站 HTML 中声明的高清图标
 * 2. manifest.json 中的图标
 * 3. 常见路径探测
 * 4. Google Favicon 服务 (转 Base64)
 * 5. 文字图标兜底 (可选，由调用方处理)
 */
export async function fetchBestIcon(url: string, normalize = true): Promise<string | null> {
  if (!url) return null

  try {
    const targetUrl = normalize ? (url.startsWith('http') ? url : `https://${url}`) : url
    const domain = new URL(targetUrl).hostname

    // 第一步：获取网站信息以解析图标链接
    const siteInfo = await fetchSiteInfoViaBackground(targetUrl)

    // 优先使用从 HTML 解析的图标信息
    if (siteInfo.icons && siteInfo.icons.length > 0) {
      const iconBase64 = await fetchIconWithParsedInfoViaBackground(
        siteInfo.icons,
        domain,
        targetUrl
      )
      if (iconBase64) return iconBase64
    }

    // 备选：直接获取高清图标
    const highResIcon = await fetchHighResIconViaBackground(domain, targetUrl)
    if (highResIcon) return highResIcon

    // 最后备选：Google Favicon
    return await fetchFaviconAsBase64(targetUrl)
  } catch (e) {
    console.warn('[NavGo] Failed to fetch best icon:', e)
    return null
  }
}
