// Background Service Worker - 绕过 CORS 限制直接获取网站信息

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_SITE_INFO') {
    fetchSiteInfo(request.url).then(sendResponse)
    return true
  }
  if (request.type === 'FETCH_HIGH_RES_ICON') {
    fetchHighResIcon(request.domain, request.url).then(sendResponse)
    return true
  }
})

/**
 * 获取网站标题和图标信息
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

    // 解析图标链接
    const icons = parseIconsFromHtml(html, url)

    return { title, icons }
  } catch (e) {
    return { title: null, icons: [], error: e.message }
  }
}

/**
 * 从 HTML 中解析所有可能的图标链接
 * 返回按优先级排序的图标 URL 列表
 */
function parseIconsFromHtml(html, baseUrl) {
  const icons = []

  try {
    const base = new URL(baseUrl)
    const origin = base.origin

    // 1. Apple Touch Icon (通常是 180x180 高清图标)
    const appleTouchIconPatterns = [
      /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
      /<link[^>]*href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*>/gi
    ]

    for (const pattern of appleTouchIconPatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const href = match[1]
        const size = extractSizeFromTag(match[0]) || 180
        icons.push({ url: resolveUrl(href, origin, base.pathname), size, type: 'apple-touch-icon' })
      }
    }

    // 2. 带 sizes 属性的 icon (优先大尺寸)
    const iconWithSizePatterns = [
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+sizes=["'](\d+)x\d+["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
      /<link[^>]*href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["'][^>]+sizes=["'](\d+)x\d+["'][^>]*>/gi,
      /<link[^>]+sizes=["'](\d+)x\d+["'][^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi
    ]

    for (const pattern of iconWithSizePatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        // 根据匹配模式确定 size 和 href 的位置
        let size, href
        if (match[0].indexOf('sizes') < match[0].indexOf('href')) {
          size = parseInt(match[1])
          href = match[2]
        } else {
          href = match[1]
          size = parseInt(match[2])
        }
        if (size >= 32) {
          icons.push({ url: resolveUrl(href, origin, base.pathname), size, type: 'icon' })
        }
      }
    }

    // 3. 普通 icon 标签
    const iconPatterns = [
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
      /<link[^>]*href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["'][^>]*>/gi
    ]

    for (const pattern of iconPatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const href = match[1]
        // 检查是否已经添加过（带 sizes 的可能重复）
        const resolvedUrl = resolveUrl(href, origin, base.pathname)
        if (!icons.some(i => i.url === resolvedUrl)) {
          const size = extractSizeFromUrl(href) || 32
          icons.push({ url: resolvedUrl, size, type: 'icon' })
        }
      }
    }

    // 4. manifest.json 中的图标
    const manifestMatch = html.match(/<link[^>]+rel=["']manifest["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                          html.match(/<link[^>]*href=["']([^"']+)["'][^>]+rel=["']manifest["'][^>]*>/i)
    if (manifestMatch) {
      icons.push({ url: resolveUrl(manifestMatch[1], origin, base.pathname), size: 0, type: 'manifest' })
    }

    // 5. Open Graph 图片 (社交分享图，通常是高清的)
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i)
    if (ogImageMatch) {
      icons.push({ url: resolveUrl(ogImageMatch[1], origin, base.pathname), size: 200, type: 'og:image' })
    }

  } catch (e) {
    console.error('Error parsing icons from HTML:', e)
  }

  // 按尺寸降序排序，优先返回大图标
  return icons.sort((a, b) => b.size - a.size)
}

/**
 * 从 link 标签中提取 sizes 属性
 */
function extractSizeFromTag(tag) {
  const match = tag.match(/sizes=["'](\d+)x\d+["']/i)
  return match ? parseInt(match[1]) : null
}

/**
 * 从 URL 中提取尺寸信息
 */
function extractSizeFromUrl(url) {
  const match = url.match(/(\d{2,3})x\d{2,3}|[-_](\d{2,3})\./i)
  return match ? parseInt(match[1] || match[2]) : null
}

/**
 * 解析相对 URL 为绝对 URL
 */
function resolveUrl(href, origin, pathname) {
  if (!href) return null
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href
  }
  if (href.startsWith('//')) {
    return 'https:' + href
  }
  if (href.startsWith('/')) {
    return origin + href
  }
  // 相对路径
  const basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1)
  return origin + basePath + href
}

/**
 * 获取高清图标 - 多源尝试
 * 优先级：网站自有图标 > 常见路径 > 第三方服务
 */
async function fetchHighResIcon(domain, url) {
  // 清理 domain
  const cleanDomain = domain.replace(/^www\./, '')
  const origin = url ? new URL(url).origin : `https://${domain}`

  // 阶段1：尝试常见的高清图标路径
  const commonPaths = [
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/apple-touch-icon-180x180.png',
    '/apple-touch-icon-152x152.png',
    '/favicon-192x192.png',
    '/favicon-128x128.png',
    '/favicon-96x96.png',
    '/icon-192x192.png',
    '/icons/icon-192x192.png',
    '/images/favicon.png',
    '/assets/favicon.png'
  ]

  for (const path of commonPaths) {
    const iconUrl = origin + path
    const result = await tryFetchIcon(iconUrl, 64)
    if (result) return result
  }

  // 阶段2：尝试第三方图标服务
  const iconServices = [
    // Clearbit Logo - 高清公司 logo (200px)
    `https://logo.clearbit.com/${cleanDomain}`,
    // icon.horse - 专业 favicon 服务
    `https://icon.horse/icon/${cleanDomain}`,
    // DuckDuckGo Icons - 备选服务
    `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`,
    // Favicon.im
    `https://favicon.im/${cleanDomain}?larger=true`,
    // Google Favicon - 最后备选 (最高 128px)
    `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`
  ]

  for (const iconUrl of iconServices) {
    const result = await tryFetchIcon(iconUrl, 32)
    if (result) return result
  }

  // 阶段3：尝试网站根目录的 favicon.ico
  const faviconResult = await tryFetchIcon(`${origin}/favicon.ico`, 16)
  if (faviconResult) return faviconResult

  return null
}

/**
 * 尝试获取并验证图标
 * @param {string} iconUrl - 图标 URL
 * @param {number} minSize - 最小可接受的大小（字节），用于快速过滤
 * @returns {Promise<string|null>} Base64 图标或 null
 */
async function tryFetchIcon(iconUrl, minSizeKb = 0) {
  try {
    const response = await fetch(iconUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) return null

    // 检查 Content-Type
    const contentType = response.headers.get('content-type') || ''
    if (!isValidImageType(contentType)) return null

    const blob = await response.blob()

    // 检查文件大小
    const minBytes = minSizeKb * 100 // 转换为大约的字节数
    if (blob.size < minBytes) return null

    // 验证是否是有效图片
    const isValid = await validateImage(blob)
    if (!isValid) return null

    return await blobToBase64(blob)
  } catch {
    return null
  }
}

/**
 * 检查是否是有效的图片类型
 */
function isValidImageType(contentType) {
  const validTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/ico'
  ]
  return validTypes.some(type => contentType.toLowerCase().includes(type))
}

/**
 * 验证图片是否有效且尺寸足够
 */
async function validateImage(blob) {
  return new Promise((resolve) => {
    // 对于 SVG，直接返回 true
    if (blob.type === 'image/svg+xml') {
      resolve(true)
      return
    }

    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      // 要求图片至少 16x16
      resolve(img.width >= 16 && img.height >= 16)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }

    img.src = url
  })
}

/**
 * 从 manifest.json 获取图标
 */
async function fetchIconFromManifest(manifestUrl) {
  try {
    const response = await fetch(manifestUrl, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) return null

    const manifest = await response.json()
    const icons = manifest.icons || []

    // 按尺寸降序排序，优先获取大图标
    const sortedIcons = icons
      .map(icon => ({
        src: icon.src,
        size: parseInt(icon.sizes?.split('x')[0]) || 0
      }))
      .filter(icon => icon.size >= 48)
      .sort((a, b) => b.size - a.size)

    if (sortedIcons.length > 0) {
      const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1)
      let iconSrc = sortedIcons[0].src

      // 处理相对路径
      if (!iconSrc.startsWith('http')) {
        if (iconSrc.startsWith('/')) {
          const origin = new URL(manifestUrl).origin
          iconSrc = origin + iconSrc
        } else {
          iconSrc = baseUrl + iconSrc
        }
      }

      return await tryFetchIcon(iconSrc, 32)
    }
  } catch {
    // manifest 获取失败
  }

  return null
}

/**
 * 按优先级获取网站图标（新的入口函数）
 * 使用从 HTML 解析的图标信息
 */
async function fetchIconWithParsedInfo(icons, domain, url) {
  // 1. 首先尝试 HTML 中解析的图标（已按尺寸排序）
  for (const icon of icons) {
    if (icon.type === 'manifest') {
      // 特殊处理 manifest
      const result = await fetchIconFromManifest(icon.url)
      if (result) return result
    } else if (icon.type === 'og:image') {
      // og:image 可能太大，降低优先级
      continue
    } else {
      const result = await tryFetchIcon(icon.url, icon.size >= 64 ? 32 : 16)
      if (result) return result
    }
  }

  // 2. 尝试 og:image（作为后备）
  const ogImage = icons.find(i => i.type === 'og:image')
  if (ogImage) {
    const result = await tryFetchIcon(ogImage.url, 32)
    if (result) return result
  }

  // 3. 使用常规的 fetchHighResIcon 流程
  return await fetchHighResIcon(domain, url)
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

// 导出给消息监听器使用
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_ICON_WITH_INFO') {
    fetchIconWithParsedInfo(request.icons || [], request.domain, request.url).then(sendResponse)
    return true
  }
})
