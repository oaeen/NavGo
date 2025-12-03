<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Site } from '@/types'
import { ICON_SIZE_MIN } from '@/types'
import { getFaviconUrl } from '@/utils/favicon'

const props = defineProps<{
  site: Site
  iconSize: number // 无级调节，范围 56-132
  draggable?: boolean
  isDragging?: boolean
}>()

// 根据 iconSize 计算各个尺寸
// 基准：56px -> font 24px, name 12px | 88px -> font 36px, name 14px
// 扩展到 132px（88 * 1.5）时：font 54px, name 21px
function calculateSizes(iconSize: number) {
  // icon 直接使用传入值
  const icon = iconSize
  // font 按比例计算：24 + (size - 56) * 0.375（从24到54）
  const font = Math.round(24 + (iconSize - ICON_SIZE_MIN) * 0.375)
  // name 按比例计算：12 + (size - 56) * 0.0625（从12到约17）
  const name = Math.round(12 + (iconSize - ICON_SIZE_MIN) * 0.0625 * 1.5)
  return { icon, font, name }
}

const iconStyle = computed(() => {
  const size = calculateSizes(props.iconSize)
  return {
    width: `${size.icon}px`,
    height: `${size.icon}px`
  }
})

const placeholderStyle = computed(() => {
  const size = calculateSizes(props.iconSize)
  return {
    fontSize: `${size.font}px`
  }
})

const nameStyle = computed(() => {
  const size = calculateSizes(props.iconSize)
  return {
    fontSize: `${size.name}px`
  }
})

const emit = defineEmits<{
  edit: [site: Site]
  delete: [site: Site]
  dragstart: [event: DragEvent]
  dragend: [event: DragEvent]
}>()

const iconError = ref(false)
const showMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })

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
  menuPosition.value = { x: e.clientX, y: e.clientY }
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

// 拖拽事件处理
function handleDragStart(event: DragEvent) {
  // 阻止链接的默认拖拽行为
  if (event.dataTransfer) {
    // 创建自定义拖拽图像
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    event.dataTransfer.setDragImage(target, rect.width / 2, rect.height / 2)
  }
  emit('dragstart', event)
}

function handleDragEnd(event: DragEvent) {
  emit('dragend', event)
}

// 点击处理（拖拽时阻止链接跳转）
function handleClick(event: MouseEvent) {
  if (props.isDragging) {
    event.preventDefault()
  }
}
</script>

<template>
  <a
    :href="site.url"
    class="site-card"
    :class="{ 'is-dragging': isDragging }"
    :draggable="draggable"
    @contextmenu="handleContextMenu"
    @click.middle.prevent="handleContextMenu"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <div class="icon-container" :style="iconStyle">
      <div class="icon-wrapper">
        <img
          v-if="iconUrl"
          :src="iconUrl"
          :alt="site.name"
          class="site-icon"
          @error="handleIconError"
        />
        <div v-else class="icon-placeholder" :style="placeholderStyle">
          {{ initial }}
        </div>
      </div>
    </div>
    <span class="site-name" :style="nameStyle">{{ site.name }}</span>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div v-if="showMenu" class="menu-overlay" @click="closeMenu">
        <div class="context-menu" :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }" @click.stop>
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
  user-select: none;
}

.site-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.site-card[draggable="true"] {
  cursor: grab;
}

.site-card[draggable="true"]:active {
  cursor: grabbing;
}

.site-card.is-dragging {
  cursor: grabbing;
}

.icon-container {
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  overflow: hidden;
}

.icon-wrapper {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-mask-image: radial-gradient(circle, #fff 100%, transparent 100%);
  mask-image: radial-gradient(circle, #fff 100%, transparent 100%);
}

.site-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.icon-placeholder {
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.site-name {
  margin-top: 8px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  pointer-events: none;
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.context-menu {
  position: fixed;
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
