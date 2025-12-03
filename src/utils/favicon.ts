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

// 检测是否在扩展环境
function isExtensionEnv(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage
}

/**
 * 通过 background script 获取网站标题和图标信息
 */
export async function fetchSiteInfoViaBackground(url: string): Promise<SiteInfo> {
  if (!isExtensionEnv()) {
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
  if (!isExtensionEnv()) return null

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
  if (!isExtensionEnv()) return null

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
  } catch {
    // 获取失败
  }

  return null
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
