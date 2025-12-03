/**
 * 通用工具函数
 */

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * Blob 转 Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 检测是否在 Chrome 扩展环境中
 */
export function isExtensionEnv(): boolean {
  return typeof chrome !== 'undefined'
    && typeof chrome.storage !== 'undefined'
    && typeof chrome.storage.local !== 'undefined'
}

/**
 * 检测是否支持 Chrome runtime messaging
 */
export function isRuntimeEnv(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage
}
