import { ref } from 'vue'
import type { Site, AppConfig, StorageData } from '@/types'
import { DEFAULT_CONFIG } from '@/types'

const STORAGE_KEY = 'navgo_data'
const CURRENT_VERSION = '1.0.0'

// 检测是否在 Chrome 扩展环境中（函数形式，每次调用时检测）
function isExtensionEnv(): boolean {
  const result = typeof chrome !== 'undefined'
    && typeof chrome.storage !== 'undefined'
    && typeof chrome.storage.local !== 'undefined'
  console.log('[NavGo] isExtensionEnv check:', result, {
    chromeExists: typeof chrome !== 'undefined',
    storageExists: typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined',
    localExists: typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined' && typeof chrome.storage.local !== 'undefined'
  })
  return result
}

export function useStorage() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function getData(): Promise<StorageData> {
    try {
      if (isExtensionEnv()) {
        const result = await chrome.storage.local.get(STORAGE_KEY)
        console.log('[NavGo] Reading from chrome.storage.local')
        if (result[STORAGE_KEY]) {
          return result[STORAGE_KEY] as StorageData
        }
      } else {
        // 开发环境使用 localStorage
        const data = localStorage.getItem(STORAGE_KEY)
        console.log('[NavGo] Reading from localStorage')
        if (data) {
          return JSON.parse(data) as StorageData
        }
      }
    } catch (e) {
      console.error('[NavGo] Failed to get storage data:', e)
      error.value = '读取数据失败'
    }

    return {
      sites: [],
      config: { ...DEFAULT_CONFIG },
      version: CURRENT_VERSION
    }
  }

  async function setData(data: Partial<StorageData>): Promise<void> {
    try {
      const current = await getData()
      const updated: StorageData = {
        ...current,
        ...data,
        version: CURRENT_VERSION
      }

      console.log('[NavGo] Saving data:', JSON.stringify(updated).slice(0, 500))

      if (isExtensionEnv()) {
        await chrome.storage.local.set({ [STORAGE_KEY]: updated })
        console.log('[NavGo] Data saved to chrome.storage.local')
        // 验证保存是否成功
        const verify = await chrome.storage.local.get(STORAGE_KEY)
        const verifyData = verify[STORAGE_KEY] as StorageData | undefined
        console.log('[NavGo] Verification - saved sites count:', verifyData?.sites?.length)
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        console.log('[NavGo] Data saved to localStorage')
        // 验证保存是否成功
        const verify = localStorage.getItem(STORAGE_KEY)
        if (verify) {
          const parsed = JSON.parse(verify)
          console.log('[NavGo] Verification - saved sites count:', parsed.sites?.length)
        }
      }
      error.value = null
    } catch (e) {
      console.error('[NavGo] Failed to set storage data:', e)
      error.value = '保存数据失败'
      throw e
    }
  }

  async function getSites(): Promise<Site[]> {
    const data = await getData()
    return data.sites.sort((a, b) => a.order - b.order)
  }

  async function setSites(sites: Site[]): Promise<void> {
    await setData({ sites })
  }

  async function getConfig(): Promise<AppConfig> {
    const data = await getData()
    return data.config
  }

  async function setConfig(config: AppConfig): Promise<void> {
    await setData({ config })
  }

  async function clearAll(): Promise<void> {
    try {
      if (isExtensionEnv()) {
        await chrome.storage.local.remove(STORAGE_KEY)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.error('[NavGo] Failed to clear storage:', e)
      error.value = '清除数据失败'
      throw e
    }
  }

  return {
    isLoading,
    error,
    getData,
    setData,
    getSites,
    setSites,
    getConfig,
    setConfig,
    clearAll
  }
}
