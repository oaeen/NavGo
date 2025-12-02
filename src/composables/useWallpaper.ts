import { ref, computed, onMounted } from 'vue'
import { useStorage } from './useStorage'

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
      // 直接读取原图，不压缩
      const base64 = await fileToBase64(file)
      wallpaper.value = base64

      // 保存到存储
      const config = await getConfig()
      await setConfig({
        ...config,
        wallpaper: base64
      })
    } catch (e) {
      console.error('Failed to set wallpaper:', e)
      throw e
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
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
