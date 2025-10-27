<script>
import {
  AndroidMotionEventAction,
  AndroidMotionEventButton,
  ScrcpyPointerId
} from '@yume-chan/scrcpy'
import client from '../Scrcpy/adb-client'
import state from '../Scrcpy/scrcpy-state'

export default {
  data () {
    return {
      videoContainer: null,
      videoWrapper: null,
      isVideoContainerFocused: false,
      isCanvasReady: false,
      isFullyRendered: false,
      renderingCheckInterval: null
    }
  },
  computed: {
    MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON () {
      return [
        AndroidMotionEventButton.Primary,
        AndroidMotionEventButton.Tertiary,
        AndroidMotionEventButton.Secondary,
        AndroidMotionEventButton.Back,
        AndroidMotionEventButton.Forward
      ]
    },
    isReady () {
      return state.scrcpy &&
        state.canvas &&
        this.isVideoContainerFocused &&
        this.isCanvasReady &&
        this.isFullyRendered
    }
  },

  methods: {
    isPointInCanvas (clientX, clientY) {
      if (!state.canvas) return false
      const rect = state.canvas.getBoundingClientRect()
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      )
    },

    handleWheel (e) {
      if (!this.isReady || !this.isPointInCanvas(e.clientX, e.clientY)) {
        return
      }
      this.videoContainer?.focus()
      e.preventDefault()
      e.stopPropagation()

      const { x, y } = state.clientPositionToDevicePosition(e.clientX, e.clientY)
      state.scrcpy?.controller.injectScroll({
        screenWidth: state.width,
        screenHeight: state.height,
        pointerX: x,
        pointerY: y,
        scrollX: -e.deltaX / 100,
        scrollY: -e.deltaY / 100,
        buttons: 0
      })
    },

    injectTouch (action, e) {
      if (!this.isReady || !state.hoverHelper || !this.isPointInCanvas(e.clientX, e.clientY)) {
        return
      }

      const { pointerType } = e
      const pointerId = pointerType === 'mouse' ? ScrcpyPointerId.Finger : BigInt(e.pointerId)

      const { x, y } = state.clientPositionToDevicePosition(e.clientX, e.clientY)

      const messages = state.hoverHelper.process({
        action,
        pointerId,
        screenWidth: state.width,
        screenHeight: state.height,
        pointerX: x,
        pointerY: y,
        pressure: e.pressure,
        actionButton: this.MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON[e.button],
        buttons: e.buttons
      })
      messages.forEach((message) => state.scrcpy?.controller?.injectTouch(message))
    },

    handlePointerDown (e) {
      if (!this.isReady || !this.isPointInCanvas(e.clientX, e.clientY)) return

      state.fullScreenContainer?.focus()
      e.preventDefault()
      e.stopPropagation()

      e.currentTarget?.setPointerCapture(e.pointerId)
      this.injectTouch(AndroidMotionEventAction.Down, e)
    },

    handlePointerMove (e) {
      if (!this.isReady || !this.isPointInCanvas(e.clientX, e.clientY)) return

      e.preventDefault()
      e.stopPropagation()
      this.injectTouch(
        e.buttons === 0 ? AndroidMotionEventAction.HoverMove : AndroidMotionEventAction.Move,
        e
      )
    },

    handlePointerUp (e) {
      if (!this.isReady || !this.isPointInCanvas(e.clientX, e.clientY)) return

      e.preventDefault()
      e.stopPropagation()
      this.injectTouch(AndroidMotionEventAction.Up, e)
    },

    handlePointerLeave (e) {
      if (!this.isReady || !this.isPointInCanvas(e.clientX, e.clientY)) return

      e.preventDefault()
      e.stopPropagation()
      this.injectTouch(AndroidMotionEventAction.HoverExit, e)
      this.injectTouch(AndroidMotionEventAction.Up, e)
    },

    handleContextMenu (e) {
      if (!this.isReady || !this.isPointInCanvas(e.clientX, e.clientY)) return
      e.preventDefault()
    },

    // 辅助函数：处理可能的 BigInt 转换问题
    sanitizeText (text) {
      // 移除可能导致 BigInt 转换问题的内容
      return text.replace(/[nN]$/g, '')
    },

    async handlePaste () {
      if (!this.isReady || !state.scrcpy || !state.scrcpy.controller) return
      try {
        const clipboardText = await navigator.clipboard.readText()
        const sanitizedText = this.sanitizeText(clipboardText)

        const clipboardMessage = {
          sequence: BigInt(0), // 使用 BigInt(0) 作为序列号
          paste: true, // 设置为 true，因为这是粘贴操作
          content: sanitizedText // 使用 content 替代 text
        }

        await state.scrcpy.controller.setClipboard(clipboardMessage)
        console.log('已粘贴到设备:', sanitizedText)
      } catch (error) {
        console.error('粘贴到设备失败:', error)
      }
    },

    handleKeyEvent (e) {
      if (!this.isReady || !state.keyboard) return
      e.preventDefault()
      e.stopPropagation()

      const { type, code, ctrlKey, metaKey } = e

      if (type === 'keydown' && (ctrlKey || metaKey)) {
        if (code === 'KeyV') {
          this.handlePaste()
          return
        }
      }

      state.keyboard[type === 'keydown' ? 'down' : 'up'](code)
    },

    handleFocus () {
      this.isVideoContainerFocused = true
    },

    handleBlur () {
      this.isVideoContainerFocused = false
    },

    checkRendering () {
      if (state.running) {
        this.isFullyRendered = true
        clearInterval(this.renderingCheckInterval)
      }
    },

    // 添加鼠标进入事件处理
    handleMouseEnter () {
      if (this.videoContainer) {
        this.videoContainer.focus()
        this.isVideoContainerFocused = true
      }
    },

    // 添加鼠标离开事件处理
    handleMouseLeave () {
      this.isVideoContainerFocused = false
    }
  },

  mounted () {
    if (this.videoContainer) {
      this.videoContainer.addEventListener('wheel', this.handleWheel, { passive: false })
      this.videoContainer.addEventListener('focus', this.handleFocus)
      this.videoContainer.addEventListener('blur', this.handleBlur)
      // 添加鼠标进入离开事件监听
      this.videoContainer.addEventListener('mouseenter', this.handleMouseEnter)
      this.videoContainer.addEventListener('mouseleave', this.handleMouseLeave)
    }
    if (client.device && this.videoContainer) {
      state.setRendererContainer(this.videoContainer)
      state.start(client.device).then(() => {
        this.isCanvasReady = true
        // 开始检查渲染状态
        this.renderingCheckInterval = setInterval(this.checkRendering, 100)
      })
    }
    if ('keyboard' in navigator) {
      // navigator.keyboard.lock();
    }

    window.addEventListener('keydown', this.handleKeyEvent)
    window.addEventListener('keyup', this.handleKeyEvent)
  },

  beforeDestroy () {
    if (this.videoContainer) {
      this.videoContainer.removeEventListener('wheel', this.handleWheel)
      this.videoContainer.removeEventListener('focus', this.handleFocus)
      this.videoContainer.removeEventListener('blur', this.handleBlur)
      // 移除鼠标进入离开事件监听
      this.videoContainer.removeEventListener('mouseenter', this.handleMouseEnter)
      this.videoContainer.removeEventListener('mouseleave', this.handleMouseLeave)
    }
    if ('keyboard' in navigator) {
      // navigator.keyboard.unlock();
    }
    window.removeEventListener('keydown', this.handleKeyEvent)
    window.removeEventListener('keyup', this.handleKeyEvent)
    clearInterval(this.renderingCheckInterval)
  }
}
</script>

<template>
  <div ref="videoWrapper" class="video-wrapper">
    <div
      ref="videoContainer"
      class="video-container"
      tabindex="0"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @pointerleave="handlePointerLeave"
      @contextmenu="handleContextMenu"
      @wheel="handleWheel"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"></div>
  </div>
</template>

<style scoped>
.video-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: transparent;
}

.loading-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 18px;
    color: #303133;
}

.video-container {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: transparent;
    cursor: crosshair;
    overflow: hidden;
    outline: none;
}

/* 确保 canvas 元素正确显示并添加边框 */
.video-container :deep(canvas) {
    display: block;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: auto !important;
    height: auto !important;
    max-width: calc(100% - 6px);
    max-height: calc(100% - 6px);
    background-color: transparent;
    border: 3px solid #303133;
    border-radius: 16px;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
}
</style>
