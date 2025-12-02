import { ref } from 'vue'
import type { Site, AppConfig, StorageData } from '@/types'
import { DEFAULT_CONFIG } from '@/types'

const STORAGE_KEY = 'navgo_data'
const CURRENT_VERSION = '1.0.0'

// 检测是否在 Chrome 扩展环境中
const isExtension = typeof chrome !== 'undefined' && chrome.storage

export function useStorage() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function getData(): Promise<StorageData> {
    try {
      if (isExtension) {
        const result = await chrome.storage.local.get(STORAGE_KEY)
        if (result[STORAGE_KEY]) {
          return result[STORAGE_KEY] as StorageData
        }
      } else {
        // 开发环境使用 localStorage
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) {
          return JSON.parse(data) as StorageData
        }
      }
    } catch (e) {
      console.error('Failed to get storage data:', e)
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

      if (isExtension) {
        await chrome.storage.local.set({ [STORAGE_KEY]: updated })
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      error.value = null
    } catch (e) {
      console.error('Failed to set storage data:', e)
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
      if (isExtension) {
        await chrome.storage.local.remove(STORAGE_KEY)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.error('Failed to clear storage:', e)
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
