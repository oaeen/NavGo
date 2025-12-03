/**
 * 压缩图片并转换为 Base64
 * 智能选择输出尺寸，保留更多细节
 */
export async function compressImage(
  file: File,
  maxSize: number = 128
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法获取 Canvas 上下文'))
      return
    }

    const img = new Image()

    img.onload = () => {
      // 计算裁剪为正方形
      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2

      // 智能选择输出尺寸：如果原图较小，保持原尺寸；否则使用 maxSize
      const outputSize = Math.min(size, maxSize)

      canvas.width = outputSize
      canvas.height = outputSize

      // 启用高质量图像平滑
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 绘制图片
      ctx.drawImage(img, x, y, size, size, 0, 0, outputSize, outputSize)

      resolve(canvas.toDataURL('image/png'))
      URL.revokeObjectURL(img.src)
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('图片加载失败'))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * 压缩壁纸图片
 */
export async function compressWallpaper(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法获取 Canvas 上下文'))
      return
    }

    const img = new Image()

    img.onload = () => {
      let { width, height } = img

      // 计算缩放比例
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', quality))
      URL.revokeObjectURL(img.src)
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('图片加载失败'))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * 从 Base64 提取图片数据
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',')
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(parts[1] || '')
  const n = bstr.length
  const u8arr = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }

  return new Blob([u8arr], { type: mime })
}

/**
 * 获取图片文件扩展名
 */
export function getImageExtension(base64: string): string {
  if (base64.includes('image/png')) return 'png'
  if (base64.includes('image/jpeg') || base64.includes('image/jpg')) return 'jpg'
  if (base64.includes('image/gif')) return 'gif'
  if (base64.includes('image/webp')) return 'webp'
  return 'png'
}
