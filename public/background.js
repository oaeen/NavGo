// Background Service Worker - 绕过 CORS 限制直接获取网站信息

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_SITE_INFO') {
    fetchSiteInfo(request.url).then(sendResponse)
    return true
  }
  if (request.type === 'FETCH_HIGH_RES_ICON') {
    fetchHighResIcon(request.domain).then(sendResponse)
    return true
  }
})

/**
 * 获取网站标题
 */
async function fetchSiteInfo(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const html = await response.text()

    // 解析标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || null

    return { title }
  } catch (e) {
    return { title: null, error: e.message }
  }
}

/**
 * 获取高清图标 - 多源尝试
 * 优先级：Clearbit > icon.horse > Google Favicon
 */
async function fetchHighResIcon(domain) {
  // 清理 domain（移除 www. 前缀）
  const cleanDomain = domain.replace(/^www\./, '')

  // 按优先级尝试多个图标服务
  const iconSources = [
    // Clearbit Logo - 高清公司 logo
    `https://logo.clearbit.com/${cleanDomain}`,
    // icon.horse - 专业 favicon 服务，自动获取最高清版本
    `https://icon.horse/icon/${cleanDomain}`,
    // Google Favicon - 作为最后备选
    `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`
  ]

  for (const iconUrl of iconSources) {
    try {
      const response = await fetch(iconUrl, {
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) continue

      const blob = await response.blob()
      // 检查图片质量：大于 1KB 通常是高清图标
      if (blob.size > 1000) {
        return await blobToBase64(blob)
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Blob 转 Base64
 */
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}
