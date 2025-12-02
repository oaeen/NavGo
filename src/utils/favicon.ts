// 检测是否在扩展环境
function isExtensionEnv(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage
}

/**
 * 通过 background script 获取网站标题
 */
export async function fetchSiteTitleViaBackground(url: string): Promise<string | null> {
  if (!isExtensionEnv()) return null

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_SITE_INFO', url }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null)
          return
        }
        resolve(response?.title || null)
      })
    } catch {
      resolve(null)
    }
  })
}

/**
 * 通过 background script 获取高清图标
 * 使用 Clearbit/icon.horse 等专业图标服务
 */
export async function fetchHighResIconViaBackground(domain: string): Promise<string | null> {
  if (!isExtensionEnv()) return null

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_HIGH_RES_ICON', domain }, (response) => {
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
