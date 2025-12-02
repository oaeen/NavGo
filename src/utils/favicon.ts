/**
 * 获取网站的 Favicon URL
 * 优先使用 Google 的 Favicon 服务
 */
export function getFaviconUrl(url: string, size: number = 64): string {
  try {
    const domain = new URL(url).hostname
    // Google Favicon 服务 - 最可靠
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
  } catch {
    return ''
  }
}

/**
 * 备用 Favicon 服务
 */
export function getAlternativeFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`
  } catch {
    return ''
  }
}

/**
 * 尝试获取 Favicon 并转为 Base64
 */
export async function fetchFaviconAsBase64(url: string): Promise<string | null> {
  const faviconUrl = getFaviconUrl(url)
  if (!faviconUrl) return null

  try {
    const response = await fetch(faviconUrl)
    if (!response.ok) return null

    const blob = await response.blob()
    return await blobToBase64(blob)
  } catch {
    // 尝试备用服务
    try {
      const altUrl = getAlternativeFaviconUrl(url)
      const response = await fetch(altUrl)
      if (!response.ok) return null

      const blob = await response.blob()
      return await blobToBase64(blob)
    } catch {
      return null
    }
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
