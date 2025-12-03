import { ref, computed } from 'vue'
import { useStorage } from './useStorage'
import { compressWallpaper } from '@/utils/image'

export function useWallpaper() {
  const wallpaper = ref<string | null>(null)
  const isLoading = ref(true)
  const { getConfig, setConfig } = useStorage()

  const wallpaperStyle = computed(() => {
    if (wallpaper.value) {
      return {
        backgroundImage: `url(${wallpaper.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    }
    // 纯黑背景
    return {
      background: '#000000'
    }
  })

  async function loadWallpaper() {
    isLoading.value = true
    try {
      const config = await getConfig()
      wallpaper.value = config.wallpaper
    } finally {
      isLoading.value = false
    }
  }

  async function setWallpaper(file: File): Promise<void> {
    try {
      // 压缩壁纸以节省存储空间
      const base64 = await compressWallpaper(file)
      wallpaper.value = base64

      // 保存到存储
      const config = await getConfig()
      await setConfig({
        ...config,
        wallpaper: base64
      })
    } catch (e) {
      console.error('[NavGo] Failed to set wallpaper:', e)
      throw e
    }
  }

  async function clearWallpaper(): Promise<void> {
    wallpaper.value = null
    const config = await getConfig()
    await setConfig({
      ...config,
      wallpaper: null
    })
  }

  return {
    wallpaper,
    wallpaperStyle,
    isLoading,
    loadWallpaper,
    setWallpaper,
    clearWallpaper
  }
}
