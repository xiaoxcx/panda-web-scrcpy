<script>
import { AndroidKeyCode, AndroidKeyEventAction, AndroidScreenPowerMode } from '@yume-chan/scrcpy'
import state from '../Scrcpy/scrcpy-state'
import client from '../Scrcpy/adb-client'
import recorder from '../Scrcpy/recorder'

export default {
  props: {
    direction: {
      type: String,
      default: 'vertical',
      validator: (value) => ['vertical', 'horizontal'].includes(value)
    }
  },

  methods: {
    formatDateTime (date) {
      const pad = (num) => String(num).padStart(2, '0')
      const year = date.getFullYear()
      const month = pad(date.getMonth() + 1)
      const day = pad(date.getDate())
      const hour = pad(date.getHours())
      const minute = pad(date.getMinutes())
      const second = pad(date.getSeconds())
      return `${year}${month}${day}_${hour}${minute}${second}`
    },

    computed: {
      className () {
        return this.direction === 'horizontal' ? 'flex-row' : 'flex-column'
      },
      computedButtons () {
        return this.buttons.map(button => {
          const computedButton = { ...button }

          // 处理录制按钮
          if (button.onClick === 'recording') {
            computedButton.label = this.isRecording ? `Recording ${this.recordingTime}` : '录制'
            computedButton.isActive = this.isRecording
          }

          // 处理全屏按钮
          if (button.onClick === 'toggleFullScreen') {
            computedButton.icon = this.isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'
          }

          // 处理隐私模式按钮
          if (button.onClick === 'toggleScreen') {
            computedButton.icon = this.isScreenOn ? 'mdi-eye-outline' : 'mdi-eye-closed'
          }

          return computedButton
        })
      }
    },

    methods: {
      handleButtonClick (methodName) {
        if (this[methodName]) {
          this[methodName]()
        }
      },
      powerButton () {
        if (client.device && client.device.power) {
          client.device.power.powerButton()
        }
      }
    },

    data () {
      return {
        isFullscreen: false,
        isScreenOn: true,
        isExpandNotificationPanel: false,
        isRecording: false,
        recordingTime: '00:00:00',
        unsubscribe: null,
        buttons: [
          { icon: 'mdi-camera', label: 'Camera', onClick: 'takeScreenshot' },
          {
            icon: 'mdi-radiobox-marked',
            label: '录制',
            onClick: 'recording',
            isActive: false
          },
          {
            icon: 'mdi-fullscreen',
            label: '全屏',
            onClick: 'toggleFullScreen'
          },
          {
            icon: 'mdi-eye-outline',
            label: '隐私模式',
            onClick: 'toggleScreen'
          },
          { icon: 'mdi-screen-rotation', label: '旋转', size: '18', onClick: 'rotateDevice' },
          {
            icon: 'mdi-bell-cog-outline',
            label: '通知栏',
            onClick: 'notificationPanel'
          },
          { icon: 'mdi-volume-plus', label: '音量 + ', onClick: 'volumeUp' },
          { icon: 'mdi-volume-minus', label: '音量 -', onClick: 'volumeDown' },
          {
            icon: 'mdi-power-standby',
            label: '电源',
            onClick: 'powerButton'
          }
        ]
      }
    },

    mounted () {
      this.unsubscribe = recorder.onStateChange((state) => {
        this.isRecording = state.isRecording
        this.recordingTime = state.currentTime
      })

      document.addEventListener('fullscreenchange', () => {
        this.isFullscreen = !!document.fullscreenElement
      })
    },

    beforeUnmount () {
      if (this.unsubscribe) {
        this.unsubscribe()
      }
    },

    async takeScreenshot () {
      const canvas = state.getCanvas()
      if (!canvas) return

      try {
        const timestamp = this.formatDateTime(new Date())
        const deviceName = client.deviceName?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'device'
        const fileName = `screenshot_${deviceName}_${timestamp}.png`

        const anchor = document.createElement('a')
        anchor.href = canvas.toDataURL('image/png')
        anchor.download = fileName
        anchor.click()
        anchor.remove()
      } catch (error) {
        console.error('截图保存失败:', error)
      }
    },

    recording () {
      state.fullScreenContainer.focus()
      try {
        if (this.isRecording) {
          recorder.stopRecording()
        } else {
          if (!recorder.canRecord) {
            console.error('Cannot start recording: video metadata is not set')
            return
          }
          recorder.startRecording()
        }
      } catch (error) {
        console.error('录制操作失败:', error)
      }
    },

    toggleFullScreen () {
      if (!document.fullscreenElement) {
        state.fullScreenContainer.requestFullscreen().catch((err) => {
          console.error(`无法进入全屏模式: ${err.message}`)
        })
        const canvas = state.getCanvas()
        canvas.style.height = '100%'
        canvas.style.width = 'auto'
      } else {
        document.exitFullscreen()
      }
      this.isFullscreen = !this.isFullscreen
    },

    async toggleScreen () {
      state.fullScreenContainer.focus()
      try {
        if (this.isScreenOn) {
          await state.scrcpy.controller.setScreenPowerMode(AndroidScreenPowerMode.Off)
        } else {
          await state.scrcpy.controller.setScreenPowerMode(AndroidScreenPowerMode.Normal)
        }
        this.isScreenOn = !this.isScreenOn
      } catch (err) {
        console.error(`切换屏幕状态时出错: ${err.message}`)
      }
    },

    async volumeUp () {
      state.fullScreenContainer.focus()
      await state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Down,
        keyCode: AndroidKeyCode.VolumeUp,
        repeat: 0,
        metaState: 0
      })
      await state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode: AndroidKeyCode.VolumeUp,
        repeat: 0,
        metaState: 0
      })
    },

    async volumeDown () {
      state.fullScreenContainer.focus()
      await state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Down,
        keyCode: AndroidKeyCode.VolumeDown,
        repeat: 0,
        metaState: 0
      })
      await state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode: AndroidKeyCode.VolumeDown,
        repeat: 0,
        metaState: 0
      })
    },

    rotateDevice () {
      state.fullScreenContainer.focus()
      state.scrcpy.controller.rotateDevice()
    },

    async notificationPanel () {
      state.fullScreenContainer.focus()
      try {
        if (!this.isExpandNotificationPanel) {
          await state.scrcpy.controller.expandNotificationPanel()
        } else {
          await state.scrcpy.controller.collapseNotificationPanel()
        }
        this.isExpandNotificationPanel = !this.isExpandNotificationPanel
      } catch (err) {
        console.error(`展开/收起通知面板时出错: ${err.message}`)
      }
    },

    handlePointerDown (e) {
      if (!state.scrcpy) {
        return false
      }

      if (e.button !== 0) {
        return false
      }

      state?.fullScreenContainer.focus()
      e.preventDefault()
      e.stopPropagation()

      return true
    },

    handlePointerUp (e) {
      if (!state.scrcpy) {
        return false
      }
      return e.button === 0
    },

    handleBackPointerDown (e) {
      if (!this.handlePointerDown(e)) {
        return
      }

      state.scrcpy.controller.backOrScreenOn(AndroidKeyEventAction.Down)
    },

    handleBackPointerUp (e) {
      if (!this.handlePointerUp(e)) {
        return
      }

      state.scrcpy.controller.backOrScreenOn(AndroidKeyEventAction.Up)
    },

    handleHomePointerDown (e) {
      if (!this.handlePointerDown(e)) {
        return
      }

      state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Down,
        keyCode: AndroidKeyCode.AndroidHome,
        repeat: 0,
        metaState: 0
      })
    },

    handleHomePointerUp (e) {
      if (!this.handlePointerUp(e)) {
        return
      }

      state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode: AndroidKeyCode.AndroidHome,
        repeat: 0,
        metaState: 0
      })
    },

    handleAppSwitchPointerDown (e) {
      if (!this.handlePointerDown(e)) {
        return
      }

      state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Down,
        keyCode: AndroidKeyCode.AndroidAppSwitch,
        repeat: 0,
        metaState: 0
      })
    },

    handleAppSwitchPointerUp (e) {
      if (!this.handlePointerUp(e)) {
        return
      }

      state.scrcpy?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode: AndroidKeyCode.AndroidAppSwitch,
        repeat: 0,
        metaState: 0
      })
    }
  }
}
</script>

<template>
  <div>
    <div>
      <slot />
    </div>

    <v-container fluid>
      <div class="d-flex align-center justify-center">
        <v-card class="control-panel px-2 py-2" elevation="3" rounded="pill">
          <div class="d-flex align-center" tabindex="1" :class="className">
            <v-btn
              v-for="(button, index) in computedButtons"
              :key="index"
              :color="button.isActive ? 'error' : undefined"
              icon
              variant="text"
              size="x-small"
              class="control-btn"
              density="compact"
              :aria-label="button.label"
              @click="handleButtonClick(button.onClick)">
              <v-tooltip
                :text="button.label"
                location="top">
                <template #activator="{ props }">
                  <v-icon
                    v-bind="props"
                    :icon="button.icon"
                    :color="button.isActive ? 'error' : 'black'"
                    :size="button.size || '20px'"/>
                </template>
              </v-tooltip>
            </v-btn>
            <v-divider :thickness="2" color="info" aria-orientation="horizontal" />
            <v-btn
              variant="text"
              size="small"
              class="control-btn mx-1"
              @mousedown="handleBackPointerDown"
              @mouseup="handleBackPointerUp">
              <v-tooltip text="返回" location="top">
                <template #activator="{ props }">
                  <v-icon v-bind="props" size="20px">mdi-arrow-left</v-icon>
                </template>
              </v-tooltip>
            </v-btn>

            <v-btn
              variant="text"
              size="20"
              class="control-btn mx-1"
              @mousedown="handleHomePointerDown"
              @mouseup="handleHomePointerUp">
              <v-tooltip text="桌面" location="top">
                <template #activator="{ props }">
                  <v-icon v-bind="props">mdi-circle-outline</v-icon>
                </template>
              </v-tooltip>
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              class="control-btn mx-1"
              @mousedown="handleAppSwitchPointerDown"
              @mouseup="handleAppSwitchPointerUp">
              <v-tooltip text="菜单" location="top">
                <template #activator="{ props }">
                  <v-icon v-bind="props">mdi-square-outline</v-icon>
                </template>
              </v-tooltip>
            </v-btn>
          </div>
        </v-card>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.control-panel {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.control-btn {
    width:35px !important;
    min-width: 35px !important;
    height: 35px !important;
    margin: 0 2px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

.control-btn:hover {
    background-color: rgba(0, 0, 0, 0.04) !important;
}

.control-btn :deep(.v-icon) {
    margin: 0 !important;
    padding: 0 !important;
}

.control-btn::before {
    display: none !important;
}
</style>
