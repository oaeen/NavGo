/**
 * 获取网站的 Favicon URL
 * 优先使用 Google 的 Favicon 服务
 */
export function getFaviconUrl(url: string, size: number = 128): string {
  try {
    const domain = new URL(url).hostname
    // Google Favicon 服务 - 最可靠，默认 128px 高清
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
 * 尝试获取高清 Favicon 并转为 Base64
 * 从大到小尝试多个尺寸，返回最高清的有效图标
 */
export async function fetchFaviconAsBase64(url: string): Promise<string | null> {
  // 从大到小尝试多个尺寸
  const sizes = [256, 128, 64, 32]

  for (const size of sizes) {
    const faviconUrl = getFaviconUrl(url, size)
    if (!faviconUrl) continue

    try {
      console.log(`[NavGo] Fetching favicon: ${faviconUrl}`)
      const response = await fetch(faviconUrl, { mode: 'cors' })
      if (!response.ok) {
        console.log(`[NavGo] Favicon fetch failed with status: ${response.status}`)
        continue
      }

      const blob = await response.blob()
      console.log(`[NavGo] Favicon blob size: ${blob.size}`)
      // 检查图片是否足够大（大于 100 字节通常是有效图片）
      if (blob.size > 100) {
        const base64 = await blobToBase64(blob)
        console.log(`[NavGo] Favicon converted to base64, length: ${base64.length}`)
        return base64
      }
    } catch (e) {
      console.warn(`[NavGo] Failed to fetch favicon at size ${size}:`, e)
      continue
    }
  }

  // 尝试备用服务
  try {
    const altUrl = getAlternativeFaviconUrl(url)
    console.log(`[NavGo] Trying alternative favicon: ${altUrl}`)
    const response = await fetch(altUrl, { mode: 'cors' })
    if (!response.ok) return null

    const blob = await response.blob()
    if (blob.size > 100) {
      return await blobToBase64(blob)
    }
  } catch (e) {
    console.warn('[NavGo] Alternative favicon also failed:', e)
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
