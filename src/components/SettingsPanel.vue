<script setup lang="ts">
import { ref } from 'vue'
import type { Site, AppConfig } from '@/types'
import { SEARCH_ENGINES } from '@/types'
import {
  exportToZip,
  importFromZip,
  importFromJson,
  importFromGitHub,
  downloadBlob
} from '@/composables/useExportImport'

const props = defineProps<{
  visible: boolean
  sites: Site[]
  config: AppConfig
}>()

const emit = defineEmits<{
  close: []
  changeEngine: [engine: 'google' | 'baidu' | 'bing']
  changeWallpaper: [file: File]
  clearWallpaper: []
  import: [data: { sites: Site[]; config: AppConfig }]
  'update:showAddButton': [value: boolean]
  'update:iconSize': [value: 'small' | 'medium' | 'large']
}>()

const activeTab = ref<'general' | 'data'>('general')
const githubUrl = ref('')
const isImporting = ref(false)
const importError = ref<string | null>(null)

const engines = Object.entries(SEARCH_ENGINES) as [keyof typeof SEARCH_ENGINES, typeof SEARCH_ENGINES[keyof typeof SEARCH_ENGINES]][]

async function handleExport() {
  try {
    const blob = await exportToZip(props.sites, props.config)
    const date = new Date().toISOString().split('T')[0]
    downloadBlob(blob, `navgo-backup-${date}.zip`)
  } catch (e) {
    console.error('Export failed:', e)
    alert('导出失败，请重试')
  }
}

async function handleFileImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isImporting.value = true
  importError.value = null

  try {
    let data
    if (file.name.endsWith('.zip')) {
      data = await importFromZip(file)
    } else {
      data = await importFromJson(file)
    }

    emit('import', {
      sites: data.sites,
      config: data.config
    })
    emit('close')
  } catch (e) {
    console.error('Import failed:', e)
    importError.value = e instanceof Error ? e.message : '导入失败'
  } finally {
    isImporting.value = false
    input.value = ''
  }
}

async function handleGitHubImport() {
  if (!githubUrl.value.trim()) return

  isImporting.value = true
  importError.value = null

  try {
    const data = await importFromGitHub(githubUrl.value.trim())
    emit('import', {
      sites: data.sites,
      config: data.config
    })
    githubUrl.value = ''
    emit('close')
  } catch (e) {
    console.error('GitHub import failed:', e)
    importError.value = e instanceof Error ? e.message : '从 GitHub 导入失败'
  } finally {
    isImporting.value = false
  }
}

function handleWallpaperUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('changeWallpaper', file)
  }
  input.value = ''
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="settings-overlay" @click="handleClose">
      <div class="settings-panel" @click.stop>
        <div class="panel-header">
          <h3>设置</h3>
          <button class="close-btn" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- 标签页切换 -->
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: activeTab === 'general' }"
            @click="activeTab = 'general'"
          >
            常规设置
          </button>
          <button
            class="tab"
            :class="{ active: activeTab === 'data' }"
            @click="activeTab = 'data'"
          >
            数据管理
          </button>
        </div>

        <div class="panel-body">
          <!-- 常规设置 -->
          <div v-if="activeTab === 'general'" class="tab-content">
            <!-- 搜索引擎 -->
            <div class="setting-item">
              <label>默认搜索引擎</label>
              <div class="engine-options">
                <button
                  v-for="[key, engine] in engines"
                  :key="key"
                  class="engine-option"
                  :class="{ active: config.searchEngine === key }"
                  @click="emit('changeEngine', key)"
                >
                  <img :src="engine.icon" :alt="engine.name" />
                  <span>{{ engine.name }}</span>
                </button>
              </div>
            </div>

            <!-- 显示添加按钮 -->
            <div class="setting-item">
              <label>显示添加网站按钮</label>
              <div class="toggle-wrapper">
                <button
                  class="toggle-btn"
                  :class="{ active: config.showAddButton }"
                  @click="emit('update:showAddButton', !config.showAddButton)"
                >
                  <span class="toggle-slider"></span>
                </button>
                <span class="toggle-label">{{ config.showAddButton ? '显示' : '隐藏' }}</span>
              </div>
            </div>

            <!-- 图标大小 -->
            <div class="setting-item">
              <label>图标大小</label>
              <div class="size-options">
                <button
                  class="size-option"
                  :class="{ active: config.iconSize === 'small' }"
                  @click="emit('update:iconSize', 'small')"
                >
                  小
                </button>
                <button
                  class="size-option"
                  :class="{ active: config.iconSize === 'medium' }"
                  @click="emit('update:iconSize', 'medium')"
                >
                  中
                </button>
                <button
                  class="size-option"
                  :class="{ active: config.iconSize === 'large' }"
                  @click="emit('update:iconSize', 'large')"
                >
                  大
                </button>
              </div>
            </div>

            <!-- 壁纸设置 -->
            <div class="setting-item">
              <label>背景壁纸</label>
              <div class="wallpaper-options">
                <label class="upload-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  上传壁纸
                  <input type="file" accept="image/*" hidden @change="handleWallpaperUpload" />
                </label>
                <button
                  v-if="config.wallpaper"
                  class="clear-btn"
                  @click="emit('clearWallpaper')"
                >
                  恢复默认
                </button>
              </div>
              <p v-if="config.wallpaper" class="hint">当前已设置自定义壁纸</p>
            </div>
          </div>

          <!-- 数据管理 -->
          <div v-if="activeTab === 'data'" class="tab-content">
            <!-- 导出 -->
            <div class="setting-item">
              <label>导出数据</label>
              <p class="description">将所有网站、图标和壁纸导出为 ZIP 压缩包</p>
              <button class="action-btn" @click="handleExport">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出备份
              </button>
            </div>

            <!-- 文件导入 -->
            <div class="setting-item">
              <label>从文件导入</label>
              <p class="description">支持 ZIP 压缩包或 JSON 配置文件</p>
              <label class="action-btn" :class="{ disabled: isImporting }">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {{ isImporting ? '导入中...' : '选择文件' }}
                <input
                  type="file"
                  accept=".zip,.json"
                  hidden
                  :disabled="isImporting"
                  @change="handleFileImport"
                />
              </label>
            </div>

            <!-- GitHub 导入 -->
            <div class="setting-item">
              <label>从 GitHub 导入</label>
              <p class="description">输入 GitHub 用户名（默认仓库 NavGoConf）或仓库 URL</p>
              <div class="github-input">
                <input
                  v-model="githubUrl"
                  type="text"
                  placeholder="https://github.com/user/repo"
                  :disabled="isImporting"
                />
                <button
                  class="import-btn"
                  :disabled="!githubUrl.trim() || isImporting"
                  @click="handleGitHubImport"
                >
                  导入
                </button>
              </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="importError" class="error-message">
              {{ importError }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-overlay {
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

.settings-panel {
  background: #fff;
  border-radius: 12px;
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f5f5f5;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

.tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #4a90d9;
  border-bottom-color: #4a90d9;
}

.panel-body {
  padding: 20px;
  overflow-y: auto;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.setting-item .description {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.setting-item .hint {
  font-size: 12px;
  color: #4caf50;
  margin: 0;
}

.engine-options {
  display: flex;
  gap: 12px;
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.engine-option:hover {
  border-color: #4a90d9;
}

.engine-option.active {
  border-color: #4a90d9;
  background: #e3f2fd;
}

.engine-option img {
  width: 20px;
  height: 20px;
}

.engine-option span {
  font-size: 14px;
  color: #333;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-btn {
  position: relative;
  width: 48px;
  height: 26px;
  border: none;
  border-radius: 13px;
  background: #ddd;
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle-btn.active {
  background: #4a90d9;
}

.toggle-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.toggle-btn.active .toggle-slider {
  transform: translateX(22px);
}

.toggle-label {
  font-size: 14px;
  color: #666;
}

.size-options {
  display: flex;
  gap: 12px;
}

.size-option {
  padding: 10px 24px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.size-option:hover {
  border-color: #4a90d9;
}

.size-option.active {
  border-color: #4a90d9;
  background: #e3f2fd;
  color: #4a90d9;
}

.wallpaper-options {
  display: flex;
  gap: 12px;
}

.upload-btn,
.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn:hover,
.action-btn:hover {
  border-color: #4a90d9;
  color: #4a90d9;
}

.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  padding: 10px 16px;
  border: 1px solid #e53935;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #e53935;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #ffebee;
}

.github-input {
  display: flex;
  gap: 8px;
}

.github-input input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.github-input input:focus {
  outline: none;
  border-color: #4a90d9;
}

.import-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #4a90d9;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.import-btn:hover:not(:disabled) {
  background: #3a7fc8;
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: #ffebee;
  border-radius: 8px;
  color: #e53935;
  font-size: 14px;
}
</style>
