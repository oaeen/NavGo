import { ref, onMounted } from 'vue'
import type { Site } from '@/types'
import { useStorage } from './useStorage'

export function useSites() {
  const sites = ref<Site[]>([])
  const isLoading = ref(true)
  const { getSites, setSites } = useStorage()

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  async function loadSites() {
    isLoading.value = true
    try {
      sites.value = await getSites()
    } finally {
      isLoading.value = false
    }
  }

  async function addSite(site: Omit<Site, 'id' | 'order'>): Promise<Site> {
    const newSite: Site = {
      ...site,
      id: generateId(),
      order: sites.value.length
    }
    sites.value.push(newSite)
    await setSites(sites.value)
    return newSite
  }

  async function updateSite(id: string, updates: Partial<Omit<Site, 'id'>>): Promise<void> {
    const index = sites.value.findIndex(s => s.id === id)
    const current = sites.value[index]
    if (index !== -1 && current) {
      sites.value[index] = {
        id: current.id,
        name: updates.name ?? current.name,
        url: updates.url ?? current.url,
        icon: updates.icon !== undefined ? updates.icon : current.icon,
        order: updates.order ?? current.order
      }
      await setSites(sites.value)
    }
  }

  async function deleteSite(id: string): Promise<void> {
    const index = sites.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sites.value.splice(index, 1)
      // 重新排序
      sites.value.forEach((site, i) => {
        site.order = i
      })
      await setSites(sites.value)
    }
  }

  async function reorderSites(fromIndex: number, toIndex: number): Promise<void> {
    const removed = sites.value.splice(fromIndex, 1)[0]
    if (!removed) return
    sites.value.splice(toIndex, 0, removed)
    // 更新所有 order
    sites.value.forEach((site, i) => {
      site.order = i
    })
    await setSites(sites.value)
  }

  async function importSites(newSites: Site[]): Promise<void> {
    sites.value = newSites.map((site, index) => ({
      ...site,
      order: index
    }))
    await setSites(sites.value)
  }

  onMounted(() => {
    loadSites()
  })

  return {
    sites,
    isLoading,
    loadSites,
    addSite,
    updateSite,
    deleteSite,
    reorderSites,
    importSites
  }
}
