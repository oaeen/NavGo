import { ref, computed, onMounted } from 'vue'
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
    // 默认渐变背景
    return {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
      // 压缩壁纸
      const compressed = await compressWallpaper(file)
      wallpaper.value = compressed

      // 保存到存储
      const config = await getConfig()
      await setConfig({
        ...config,
        wallpaper: compressed
      })
    } catch (e) {
      console.error('Failed to set wallpaper:', e)
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

  onMounted(() => {
    loadWallpaper()
  })

  return {
    wallpaper,
    wallpaperStyle,
    isLoading,
    loadWallpaper,
    setWallpaper,
    clearWallpaper
  }
}
