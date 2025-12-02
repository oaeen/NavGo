<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Site, AppConfig } from '@/types'
import { DEFAULT_CONFIG } from '@/types'
import { useStorage } from '@/composables/useStorage'
import { useWallpaper } from '@/composables/useWallpaper'
import SearchBar from '@/components/SearchBar.vue'
import SiteGrid from '@/components/SiteGrid.vue'
import SiteEditor from '@/components/SiteEditor.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const { getSites, setSites, getConfig, setConfig } = useStorage()
const { wallpaperStyle, setWallpaper, clearWallpaper, loadWallpaper } = useWallpaper()

const sites = ref<Site[]>([])
const config = ref<AppConfig>({ ...DEFAULT_CONFIG })
const isLoading = ref(true)

// 编辑器状态
const showEditor = ref(false)
const editingSite = ref<Site | null>(null)

// 设置面板状态
const showSettings = ref(false)

// 确认删除状态
const showDeleteConfirm = ref(false)
const deletingSite = ref<Site | null>(null)

async function loadData() {
  isLoading.value = true
  try {
    sites.value = await getSites()
    config.value = await getConfig()
    await loadWallpaper()
  } finally {
    isLoading.value = false
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 网站管理
function handleAddSite() {
  editingSite.value = null
  showEditor.value = true
}

function handleEditSite(site: Site) {
  editingSite.value = site
  showEditor.value = true
}

function handleDeleteSite(site: Site) {
  deletingSite.value = site
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (deletingSite.value) {
    sites.value = sites.value.filter(s => s.id !== deletingSite.value!.id)
    // 重新排序
    sites.value.forEach((site, i) => {
      site.order = i
    })
    await setSites(sites.value)
  }
  deletingSite.value = null
  showDeleteConfirm.value = false
}

function cancelDelete() {
  deletingSite.value = null
  showDeleteConfirm.value = false
}

async function handleSaveSite(siteData: { id?: string; name: string; url: string; icon: string | null }) {
  if (siteData.id) {
    // 更新现有网站
    const index = sites.value.findIndex(s => s.id === siteData.id)
    const current = sites.value[index]
    if (index !== -1 && current) {
      sites.value[index] = {
        id: current.id,
        name: siteData.name,
        url: siteData.url,
        icon: siteData.icon,
        order: current.order
      }
    }
  } else {
    // 添加新网站
    const newSite: Site = {
      id: generateId(),
      name: siteData.name,
      url: siteData.url,
      icon: siteData.icon,
      order: sites.value.length
    }
    sites.value.push(newSite)
  }

  await setSites(sites.value)
  showEditor.value = false
  editingSite.value = null
}

// 设置相关
async function handleChangeEngine(engine: 'google' | 'baidu' | 'bing') {
  config.value.searchEngine = engine
  await setConfig(config.value)
}

async function handleChangeWallpaper(file: File) {
  await setWallpaper(file)
  config.value = await getConfig()
}

async function handleClearWallpaper() {
  await clearWallpaper()
  config.value = await getConfig()
}

async function handleImport(data: { sites: Site[]; config: AppConfig }) {
  sites.value = data.sites.map((site, index) => ({
    ...site,
    order: index
  }))
  config.value = data.config
  await setSites(sites.value)
  await setConfig(config.value)
  await loadWallpaper()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="app" :style="wallpaperStyle">
    <!-- 设置按钮 -->
    <button class="settings-btn" @click="showSettings = true" title="设置">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 搜索栏 -->
      <SearchBar
        :search-engine="config.searchEngine"
        @change-engine="handleChangeEngine"
      />

      <!-- 网站网格 -->
      <SiteGrid
        :sites="sites"
        @add="handleAddSite"
        @edit="handleEditSite"
        @delete="handleDeleteSite"
      />
    </div>

    <!-- 网站编辑器 -->
    <SiteEditor
      :visible="showEditor"
      :site="editingSite"
      @close="showEditor = false"
      @save="handleSaveSite"
    />

    <!-- 设置面板 -->
    <SettingsPanel
      :visible="showSettings"
      :sites="sites"
      :config="config"
      @close="showSettings = false"
      @change-engine="handleChangeEngine"
      @change-wallpaper="handleChangeWallpaper"
      @clear-wallpaper="handleClearWallpaper"
      @import="handleImport"
    />

    <!-- 删除确认对话框 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="confirm-overlay" @click="cancelDelete">
        <div class="confirm-dialog" @click.stop>
          <h4>确认删除</h4>
          <p>确定要删除 "{{ deletingSite?.name }}" 吗？</p>
          <div class="confirm-actions">
            <button class="btn cancel" @click="cancelDelete">取消</button>
            <button class="btn danger" @click="confirmDelete">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.settings-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 100;
}

.settings-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(30deg);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
}

/* 确认对话框 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  min-width: 300px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.confirm-dialog h4 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #333;
}

.confirm-dialog p {
  margin: 0 0 20px;
  color: #666;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.cancel {
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
}

.btn.cancel:hover {
  background: #f5f5f5;
}

.btn.danger {
  border: none;
  background: #e53935;
  color: #fff;
}

.btn.danger:hover {
  background: #c62828;
}
</style>
