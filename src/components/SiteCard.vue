<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Site } from '@/types'
import { getFaviconUrl } from '@/utils/favicon'

const props = defineProps<{
  site: Site
}>()

const emit = defineEmits<{
  edit: [site: Site]
  delete: [site: Site]
}>()

const iconError = ref(false)
const showMenu = ref(false)

const iconUrl = computed(() => {
  if (props.site.icon) {
    return props.site.icon
  }
  if (iconError.value) {
    return null
  }
  return getFaviconUrl(props.site.url)
})

const initial = computed(() => {
  return props.site.name.charAt(0).toUpperCase()
})

function handleIconError() {
  iconError.value = true
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  showMenu.value = true
}

function handleEdit() {
  showMenu.value = false
  emit('edit', props.site)
}

function handleDelete() {
  showMenu.value = false
  emit('delete', props.site)
}

function closeMenu() {
  showMenu.value = false
}
</script>

<template>
  <a
    :href="site.url"
    class="site-card"
    @contextmenu="handleContextMenu"
    @click.middle.prevent="handleContextMenu"
  >
    <div class="icon-wrapper">
      <img
        v-if="iconUrl"
        :src="iconUrl"
        :alt="site.name"
        class="site-icon"
        @error="handleIconError"
      />
      <div v-else class="icon-placeholder">
        {{ initial }}
      </div>
    </div>
    <span class="site-name">{{ site.name }}</span>

    <!-- 编辑按钮 -->
    <button class="edit-btn" @click.prevent.stop="handleEdit" title="编辑">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div v-if="showMenu" class="menu-overlay" @click="closeMenu">
        <div class="context-menu" @click.stop>
          <button class="menu-item" @click="handleEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            编辑
          </button>
          <button class="menu-item delete" @click="handleDelete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </Teleport>
  </a>
</template>

<style scoped>
.site-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
}

.site-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.site-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-placeholder {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.site-name {
  margin-top: 8px;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.edit-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.site-card:hover .edit-btn {
  opacity: 1;
}

.edit-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.context-menu {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  min-width: 120px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background 0.2s ease;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item.delete {
  color: #e53935;
}

.menu-item.delete:hover {
  background: #ffebee;
}
</style>
