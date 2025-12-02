<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Site } from '@/types'
import { getFaviconUrl, fetchFaviconAsBase64 } from '@/utils/favicon'
import { compressImage } from '@/utils/image'

const props = defineProps<{
  site?: Site | null
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [site: Omit<Site, 'id' | 'order'> & { id?: string }]
}>()

const name = ref('')
const url = ref('')
const icon = ref<string | null>(null)
const isFetchingIcon = ref(false)
const isFetchingInfo = ref(false)

const isEdit = computed(() => !!props.site)
const title = computed(() => isEdit.value ? '编辑网站' : '添加网站')

const previewIcon = computed(() => {
  if (icon.value) return icon.value
  if (url.value) {
    try {
      return getFaviconUrl(url.value)
    } catch {
      return null
    }
  }
  return null
})

const isValid = computed(() => {
  return name.value.trim() && url.value.trim()
})

watch(() => props.visible, (visible) => {
  if (visible && props.site) {
    name.value = props.site.name
    url.value = props.site.url
    icon.value = props.site.icon
  } else if (visible) {
    name.value = ''
    url.value = ''
    icon.value = null
  }
})

function normalizeUrl(input: string): string {
  let normalized = input.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  return normalized
}

async function fetchIcon() {
  if (!url.value) return

  isFetchingIcon.value = true
  try {
    const normalizedUrl = normalizeUrl(url.value)
    const base64 = await fetchFaviconAsBase64(normalizedUrl)
    if (base64) {
      icon.value = base64
    }
  } catch (e) {
    console.error('Failed to fetch favicon:', e)
  } finally {
    isFetchingIcon.value = false
  }
}

/**
 * 自动获取网站信息（标题和图标）
 * 当用户输入 URL 并失去焦点时触发
 */
async function fetchSiteInfo() {
  if (!url.value) return

  // 如果已经是编辑模式且有数据，不自动获取
  if (props.site && props.site.url === normalizeUrl(url.value)) return

  const normalizedUrl = normalizeUrl(url.value)
  isFetchingInfo.value = true

  console.log('[NavGo] Fetching site info for:', normalizedUrl)

  // 先获取图标（更可靠）
  if (!icon.value) {
    await fetchIcon()
  }

  // 尝试获取标题
  if (!name.value) {
    try {
      // 通过 CORS 代理获取网页内容
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`
      console.log('[NavGo] Fetching title via proxy:', proxyUrl)
      const response = await fetch(proxyUrl)
      const data = await response.json()

      if (data.contents) {
        // 解析标题
        const titleMatch = data.contents.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch && titleMatch[1]) {
          const fetchedTitle = titleMatch[1].trim()
          // 解码 HTML 实体
          const textarea = document.createElement('textarea')
          textarea.innerHTML = fetchedTitle
          name.value = textarea.value
          console.log('[NavGo] Title fetched:', name.value)
        }
      }
    } catch (e) {
      console.warn('[NavGo] Failed to fetch site title:', e)
      // 标题获取失败时，使用域名作为备用名称
      try {
        const hostname = new URL(normalizedUrl).hostname.replace('www.', '')
        name.value = hostname
        console.log('[NavGo] Using hostname as fallback name:', hostname)
      } catch {}
    }
  }

  isFetchingInfo.value = false
}

async function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const compressed = await compressImage(file, 64)
    icon.value = compressed
  } catch (err) {
    console.error('Failed to process image:', err)
  }

  input.value = ''
}

function clearIcon() {
  icon.value = null
}

function handleSave() {
  if (!isValid.value) return

  const normalizedUrl = normalizeUrl(url.value)

  emit('save', {
    id: props.site?.id,
    name: name.value.trim(),
    url: normalizedUrl,
    icon: icon.value
  })
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click="handleClose">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- 图标预览和编辑 -->
          <div class="icon-section">
            <div class="icon-preview">
              <img v-if="previewIcon" :src="previewIcon" alt="图标预览" />
              <div v-else class="icon-placeholder">?</div>
            </div>
            <div class="icon-actions">
              <button
                class="icon-btn"
                :disabled="!url || isFetchingIcon"
                @click="fetchIcon"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  :class="{ spinning: isFetchingIcon }"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                自动获取
              </button>
              <label class="icon-btn upload">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                上传图片
                <input type="file" accept="image/*" hidden @change="handleFileUpload" />
              </label>
              <button v-if="icon" class="icon-btn clear" @click="clearIcon">
                清除
              </button>
            </div>
          </div>

          <!-- 表单字段 -->
          <div class="form-field">
            <label>名称</label>
            <input
              v-model="name"
              type="text"
              placeholder="网站名称"
              maxlength="20"
            />
          </div>

          <div class="form-field">
            <label>网址</label>
            <input
              v-model="url"
              type="text"
              placeholder="https://example.com"
              @blur="fetchSiteInfo"
            />
            <span v-if="isFetchingInfo" class="fetching-hint">正在获取网站信息...</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn cancel" @click="handleClose">取消</button>
          <button class="btn primary" :disabled="!isValid" @click="handleSave">
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
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

.modal {
  background: #fff;
  border-radius: 12px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
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

.modal-body {
  padding: 20px;
}

.icon-section {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.icon-preview {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-placeholder {
  font-size: 24px;
  color: #999;
}

.icon-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover:not(:disabled) {
  border-color: #4a90d9;
  color: #4a90d9;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn.upload {
  cursor: pointer;
}

.icon-btn.clear {
  color: #e53935;
  border-color: #e53935;
}

.icon-btn.clear:hover {
  background: #ffebee;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
}

.form-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-field input:focus {
  outline: none;
  border-color: #4a90d9;
}

.fetching-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #4a90d9;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
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

.btn.primary {
  border: none;
  background: #4a90d9;
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: #3a7fc8;
}

.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
