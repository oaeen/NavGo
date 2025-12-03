<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Site } from '@/types'
import SiteCard from './SiteCard.vue'

const props = defineProps<{
  sites: Site[]
  showAddButton: boolean
  iconSize: number // 无级调节，范围 56-132
}>()

const emit = defineEmits<{
  add: []
  edit: [site: Site]
  delete: [site: Site]
  reorder: [fromIndex: number, toIndex: number]
}>()

const MAX_SITES = 24 // 3行 x 8列

// 拖拽状态管理
const dragState = ref<{
  isDragging: boolean
  draggedId: string | null
  draggedIndex: number | null
  dropTargetIndex: number | null
}>({
  isDragging: false,
  draggedId: null,
  draggedIndex: null,
  dropTargetIndex: null
})

// 计算预览排序后的 sites 列表
const displaySites = computed(() => {
  if (!dragState.value.isDragging ||
      dragState.value.draggedIndex === null ||
      dragState.value.dropTargetIndex === null ||
      dragState.value.draggedIndex === dragState.value.dropTargetIndex) {
    return props.sites
  }

  // 创建预览数组
  const result = [...props.sites]
  const fromIndex = dragState.value.draggedIndex
  const toIndex = dragState.value.dropTargetIndex

  // 模拟移动
  const [removed] = result.splice(fromIndex, 1)
  if (removed) {
    result.splice(toIndex, 0, removed)
  }

  return result
})

// 拖拽开始
function handleDragStart(site: Site, index: number, event: DragEvent) {
  if (!event.dataTransfer) return

  dragState.value = {
    isDragging: true,
    draggedId: site.id,
    draggedIndex: index,
    dropTargetIndex: index
  }

  // 设置拖拽数据
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', site.id)

  // 延迟设置拖拽样式，避免影响拖拽图像
  requestAnimationFrame(() => {
    document.body.classList.add('is-dragging')
  })
}

// 拖拽经过（计算目标位置）
function handleDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (!event.dataTransfer) return

  event.dataTransfer.dropEffect = 'move'

  if (dragState.value.isDragging && dragState.value.dropTargetIndex !== index) {
    dragState.value.dropTargetIndex = index
  }
}

// 拖拽进入
function handleDragEnter(index: number, event: DragEvent) {
  event.preventDefault()
  if (dragState.value.isDragging) {
    dragState.value.dropTargetIndex = index
  }
}

// 拖拽放下
function handleDrop(event: DragEvent) {
  event.preventDefault()

  const { draggedIndex, dropTargetIndex } = dragState.value

  if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
    emit('reorder', draggedIndex, dropTargetIndex)
  }

  resetDragState()
}

// 拖拽结束
function handleDragEnd() {
  resetDragState()
}

// 重置拖拽状态
function resetDragState() {
  dragState.value = {
    isDragging: false,
    draggedId: null,
    draggedIndex: null,
    dropTargetIndex: null
  }
  document.body.classList.remove('is-dragging')
}

// 判断卡片是否正在被拖拽
function isDragged(site: Site): boolean {
  return dragState.value.isDragging && dragState.value.draggedId === site.id
}

// 获取当前显示的索引（用于计算目标位置）
function getDisplayIndex(site: Site): number {
  return displaySites.value.findIndex(s => s.id === site.id)
}
</script>

<template>
  <div class="site-grid-container">
    <div
      class="site-grid"
      :class="{ 'is-dragging': dragState.isDragging }"
      @drop="handleDrop"
      @dragover.prevent
    >
      <div
        v-for="(site, index) in displaySites"
        :key="site.id"
        class="site-card-wrapper"
        :class="{
          'is-dragged': isDragged(site),
          'is-drop-target': dragState.isDragging && !isDragged(site)
        }"
        @dragover="handleDragOver(index, $event)"
        @dragenter="handleDragEnter(index, $event)"
      >
        <SiteCard
          :site="site"
          :icon-size="props.iconSize"
          :draggable="true"
          :is-dragging="isDragged(site)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @dragstart="handleDragStart(site, getDisplayIndex(site), $event)"
          @dragend="handleDragEnd"
        />
      </div>

      <!-- 添加按钮 -->
      <button
        v-if="props.showAddButton && sites.length < MAX_SITES"
        class="add-site-btn"
        @click="emit('add')"
      >
        <div class="add-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span class="add-text">添加网站</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.site-grid-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.site-grid {
  display: grid;
  grid-template-columns: repeat(8, 100px);
  gap: 16px;
  max-width: 960px;
}

.site-card-wrapper {
  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.site-card-wrapper.is-dragged {
  opacity: 0.4;
  transform: scale(0.95);
}

.site-card-wrapper.is-drop-target {
  /* 当有元素被拖拽时，其他元素的过渡效果 */
}

.site-grid.is-dragging .site-card-wrapper:not(.is-dragged) {
  /* 拖拽时其他卡片的样式 */
}

.add-site-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 100px;
}

.add-site-btn:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.add-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
}

.add-text {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 响应式布局 */
@media (max-width: 900px) {
  .site-grid {
    grid-template-columns: repeat(6, 100px);
  }
}

@media (max-width: 700px) {
  .site-grid {
    grid-template-columns: repeat(4, 100px);
  }
}

@media (max-width: 500px) {
  .site-grid {
    grid-template-columns: repeat(3, 90px);
    gap: 12px;
  }
}
</style>
