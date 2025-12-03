<script setup lang="ts">
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
}>()

const MAX_SITES = 24 // 3行 x 8列
</script>

<template>
  <div class="site-grid-container">
    <div class="site-grid">
      <SiteCard
        v-for="site in sites"
        :key="site.id"
        :site="site"
        :icon-size="props.iconSize"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />

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
