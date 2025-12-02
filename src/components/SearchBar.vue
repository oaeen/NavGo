<script setup lang="ts">
import { ref, computed } from 'vue'
import { SEARCH_ENGINES } from '@/types'

const props = defineProps<{
  searchEngine: 'google' | 'baidu' | 'bing'
}>()

const emit = defineEmits<{
  search: [query: string]
  changeEngine: [engine: 'google' | 'baidu' | 'bing']
}>()

const query = ref('')
const showEngineDropdown = ref(false)

const currentEngine = computed(() => SEARCH_ENGINES[props.searchEngine])
const engines = computed(() => Object.entries(SEARCH_ENGINES))

function handleSearch() {
  const trimmed = query.value.trim()
  if (trimmed) {
    const url = currentEngine.value.url + encodeURIComponent(trimmed)
    window.location.href = url
    emit('search', trimmed)
  }
}

function selectEngine(key: string) {
  emit('changeEngine', key as 'google' | 'baidu' | 'bing')
  showEngineDropdown.value = false
}

function toggleDropdown() {
  showEngineDropdown.value = !showEngineDropdown.value
}

function closeDropdown() {
  showEngineDropdown.value = false
}
</script>

<template>
  <div class="search-container">
    <div class="search-box">
      <!-- 搜索引擎选择 -->
      <div class="engine-selector" @click="toggleDropdown">
        <img :src="currentEngine.icon" :alt="currentEngine.name" class="engine-icon" />
        <svg
          class="dropdown-arrow"
          :class="{ open: showEngineDropdown }"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>

        <!-- 下拉菜单 -->
        <Transition name="dropdown">
          <div v-if="showEngineDropdown" class="engine-dropdown">
            <div
              v-for="[key, engine] in engines"
              :key="key"
              class="engine-option"
              :class="{ active: key === searchEngine }"
              @click.stop="selectEngine(key)"
            >
              <img :src="engine.icon" :alt="engine.name" />
              <span>{{ engine.name }}</span>
            </div>
          </div>
        </Transition>
      </div>

      <!-- 搜索输入框 -->
      <input
        v-model="query"
        type="text"
        class="search-input"
        placeholder="搜索..."
        @keydown.enter="handleSearch"
      />

      <!-- 搜索按钮 -->
      <button class="search-btn" @click="handleSearch">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </div>

    <!-- 点击外部关闭下拉 -->
    <div v-if="showEngineDropdown" class="overlay" @click="closeDropdown" />
  </div>
</template>

<style scoped>
.search-container {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  overflow: visible;
  position: relative;
}

.engine-selector {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 12px 12px 16px;
  cursor: pointer;
  border-right: 1px solid #eee;
  position: relative;
}

.engine-icon {
  width: 20px;
  height: 20px;
}

.dropdown-arrow {
  color: #999;
  transition: transform 0.2s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.engine-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100;
  min-width: 120px;
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.engine-option:hover {
  background: #f5f5f5;
}

.engine-option.active {
  background: #e3f2fd;
}

.engine-option img {
  width: 16px;
  height: 16px;
}

.engine-option span {
  font-size: 14px;
  color: #333;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 16px;
  font-size: 16px;
  background: transparent;
}

.search-input::placeholder {
  color: #999;
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 4px;
  border: none;
  border-radius: 50%;
  background: #4a90d9;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-btn:hover {
  background: #3a7fc8;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
