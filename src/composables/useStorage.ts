import { ref } from 'vue'
import type { Site, AppConfig, StorageData } from '@/types'
import { DEFAULT_CONFIG } from '@/types'

const STORAGE_KEY = 'navgo_data'
const CURRENT_VERSION = '1.0.0'

// 检测是否在 Chrome 扩展环境中
function isExtensionEnv(): boolean {
  return typeof chrome !== 'undefined'
    && typeof chrome.storage !== 'undefined'
    && typeof chrome.storage.local !== 'undefined'
}

export function useStorage() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function getData(): Promise<StorageData> {
    try {
      let rawData: unknown = null

      if (isExtensionEnv()) {
        const result = await chrome.storage.local.get(STORAGE_KEY)
        rawData = result[STORAGE_KEY]
      } else {
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) {
          rawData = JSON.parse(data)
        }
      }

      if (rawData && typeof rawData === 'object') {
        const data = rawData as Record<string, unknown>

        const sites = data.sites && typeof data.sites === 'object'
          ? Object.values(data.sites) as Site[]
          : []

        const config = { ...DEFAULT_CONFIG, ...data.config as AppConfig }

        return {
          sites,
          config,
          version: typeof data.version === 'string' ? data.version : CURRENT_VERSION
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

      if (isExtensionEnv()) {
        await chrome.storage.local.set({ [STORAGE_KEY]: updated })
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
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
