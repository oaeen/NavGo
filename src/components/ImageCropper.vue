<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const props = defineProps<{
  visible: boolean
  imageSource: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [base64: string]
}>()

const imageRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null

watch(() => props.visible, async (visible) => {
  if (visible) {
    // 等待 DOM 更新和图片加载
    await nextTick()
    initCropper()
  } else {
    destroyCropper()
  }
})

function initCropper() {
  const img = imageRef.value
  if (!img) return

  destroyCropper()

  // 确保图片加载完成后再初始化
  if (img.complete) {
    createCropperInstance(img)
  } else {
    img.onload = () => createCropperInstance(img)
  }
}

function createCropperInstance(img: HTMLImageElement) {
  cropper = new Cropper(img, {
    viewMode: 1, // 限制裁剪框在画布内
    dragMode: 'move', // 允许拖动图片
    aspectRatio: 1, // 1:1 比例
    autoCropArea: 0.8, // 初始裁剪区域大小
    restore: false,
    guides: false,
    center: false, // 不显示中心指示器
    highlight: false,
    cropBoxMovable: false, // 固定裁剪框位置
    cropBoxResizable: false, // 固定裁剪框大小
    toggleDragModeOnDblclick: false,
    background: false, // 不显示默认的透明网格背景
    minContainerWidth: 460,
    minContainerHeight: 400,
    modal: true, // 显示黑色遮罩
  })
}

function destroyCropper() {
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
}

// 组件销毁时清理
onUnmounted(() => {
  destroyCropper()
})

function handleConfirm() {
  if (!cropper) return

  // 获取裁剪后的 canvas
  const canvas = cropper.getCroppedCanvas({
    width: 256,
    height: 256,
    minWidth: 128,
    minHeight: 128,
    maxWidth: 512,
    maxHeight: 512,
    fillColor: '#fff', 
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  })

  if (canvas) {
    const base64 = canvas.toDataURL('image/png')
    emit('confirm', base64)
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="cropper-overlay">
      <div class="cropper-dialog">
        <div class="cropper-header">
          <h3>裁剪图片</h3>
          <button class="close-btn" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="cropper-body">
          <div class="cropper-wrap">
            <img ref="imageRef" :src="imageSource" alt="Source Image" />
          </div>
          <div class="cropper-hint">滚轮缩放，拖拽移动</div>
        </div>
        <div class="cropper-footer">
          <button class="btn cancel" @click="handleClose">取消</button>
          <button class="btn primary" @click="handleConfirm">确认</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cropper-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000; /* 提高层级，确保在其他弹窗之上 */
}

.cropper-dialog {
  background: #fff;
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative; /* 确保定位上下文 */
}

.cropper-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  background: #fff;
}

.cropper-header h3 {
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

.cropper-body {
  position: relative;
  background: #1a1a1a;
  height: 400px;
  width: 100%;
}

.cropper-wrap {
  width: 100%;
  height: 100%;
}

.cropper-wrap img {
  display: block;
  max-width: 100%;
}

.cropper-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 10px;
  border-radius: 12px;
}

.cropper-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background: #fff;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
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

.btn.primary:hover {
  background: #3a7fc8;
}
</style>

<style>
/* 覆盖 cropperjs 样式 */

/* 圆形裁剪框 */
.cropper-view-box,
.cropper-face {
  border-radius: 50%;
}

/* 裁剪框外轮廓：使用 box-shadow 模拟 */
.cropper-view-box {
  outline: 0;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
}

/* 隐藏不必要的控制点 */
.cropper-point {
  display: none;
}

/* 隐藏网格线 */
.cropper-dashed {
  display: none;
}

.cropper-modal {
  opacity: 0.6;
}
</style>
