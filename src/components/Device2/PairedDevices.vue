<script>
import client from '../Scrcpy/adb-client'
import { AdbDaemonWebUsbDeviceWatcher, AdbDaemonWebUsbDevice } from '@yume-chan/adb-daemon-webusb'
import DeviceGuide from './DeviceGuide.vue'

export default {
  name: 'PairedDevices',
  components: {
    DeviceGuide
  },
  data () {
    return {
      showDevices: false,
      selected: undefined,
      usbDeviceList: [],
      watcher: null,
      errorMessage: '',
      errorDetails: '',
      isLoading: false,
      deviceInfo: null,
      connectionStatus: 'disconnected',
      autoReconnectAttempts: 0,
      maxAutoReconnectAttempts: 3,
      disconnectionMessage: ''
    }
  },
  computed: {
    deviceOptions () {
      console.log('deviceOptions computed called, usbDeviceList:', this.usbDeviceList);
      // 安全处理Proxy对象，确保返回普通数组
      if (Array.isArray(this.usbDeviceList) && this.usbDeviceList.length > 0) {
        return this.usbDeviceList.map(device => {
          console.log('Processing device:', device);
          // 安全访问Proxy对象的属性
          const deviceTarget = device.__v_raw || device;
          console.log('Device serial:', deviceTarget.serial);
          console.log('Device name:', deviceTarget.name);
          return {
            serial: deviceTarget.serial || '',
            name: deviceTarget.name || '',
            // 添加其他需要的属性
            ...deviceTarget
          };
        });
      }
      console.log('No devices available, returning empty array');
      return [];
    }
  },
  methods: {
    async selectDevice (device) {
      if (this.selected && this.selected.serial === (device && device.serial) && this.connectionStatus === 'connected') {
        console.log('Device already connected:', device && device.serial)
        this.$emit('update-connection-status', true)
        this.$emit('pair-device', device)
        return
      }

      this.connectionStatus = 'connecting'
      this.isLoading = true
      this.errorMessage = ''
      this.errorDetails = ''
      this.deviceInfo = null
      this.$emit('update-connection-status', false)
      try {
        await client.connect(device)
        this.selected = device
        this.connectionStatus = 'connected'
        this.showDevices = false
        console.log('this.selected :', this.selected);
        this.$emit('pair-device', device)
        this.$emit('update-connection-status', true)
        this.deviceInfo = {
          model: device.name || 'Unknown',
          androidVersion: 'Unknown'
        }
        this.autoReconnectAttempts = 0
      } catch (error) {
        this.handleConnectionError(error)
      } finally {
        this.isLoading = false
      }
    },

    handleConnectionError (error) {
      if (error.message.includes('Unknown command: 48545541')) {
        this.errorMessage = '设备连接失败：未知命令'
        this.errorDetails = '请确保设备支持 ADB 调试，并且已在开发者选项中启用 USB 调试。'
      } else if (
        error.name === 'DOMException' &&
        error.message.includes('The transfer was cancelled')
      ) {
        this.errorMessage = '设备连接失败：USB 传输被取消'
        this.errorDetails = '请重新插拔设备并重试。如果问题持续，请尝试重启设备。'
      } else if (error.message.includes('No authenticator can handle the request')) {
        this.errorMessage = '设备认证失败：无法处理认证请求'
        this.errorDetails =
          '请检查设备上的 ADB 授权设置。在设备上点击"允许 USB 调试"对话框，然后重试连接。'
      } else {
        this.errorMessage = `设备连接失败`
        this.errorDetails +=
          '这通常是已经运行了其他 ADB 客户端导致的。通过运行 `adb kill-server` 命令来终止其他 ADB 进程，然后再重新连接当前设备。'
      }
      this.$emit('update-connection-status', false)
      this.connectionStatus = 'disconnected'
    },

    async retryConnection () {
      if (this.selected) {
        await this.selectDevice(this.selected)
      }
    },

    async autoReconnect () {
      if (this.autoReconnectAttempts < this.maxAutoReconnectAttempts) {
        console.log(
          `Attempting auto-reconnect (${
            this.autoReconnectAttempts + 1
          }/${this.maxAutoReconnectAttempts})`
        )
        await this.retryConnection()
        this.autoReconnectAttempts++
      } else {
        console.log('Max auto-reconnect attempts reached')
        this.errorMessage = '自动重连失败'
        this.errorDetails = '请手动重试连接或检查设备状态。'
      }
    },

    toggleDevices () {
      this.showDevices = !this.showDevices
      console.log('Device list toggled:', this.showDevices)
      console.log('deviceOptions length:', this.deviceOptions.length)
      console.log('deviceOptions data:', this.deviceOptions)
    },

    async removeDevice (serial) {
      this.isLoading = true
      console.log('Attempting to remove device:', serial)
      if (this.selected && this.selected.serial === serial) {
        this.selected = undefined
        await client.disconnect()
        this.deviceInfo = null
        this.$emit('update-connection-status', false)
        this.connectionStatus = 'disconnected'
        console.log('Disconnected from device:', serial)
      }
      this.usbDeviceList = this.usbDeviceList.filter((device) => device.serial !== serial)
      this.$emit('remove-device', serial)
      console.log('Device removed from list:', serial)
      this.isLoading = false
    },

    async updateUsbDeviceList () {
      this.isLoading = true
      try {
        this.usbDeviceList = await client.getUsbDeviceList()
        console.log('Updated USB device list:', this.usbDeviceList)
      } catch (error) {
        console.error('Failed to update USB device list:', error)
        this.errorMessage = '获取设备列表失败'
        this.errorDetails = `${error.message}。请检查设备连接并重试。`
      } finally {
        this.isLoading = false
      }
      return this.usbDeviceList
    },

    async handleAddDevice () {
      this.errorMessage = ''
      this.errorDetails = ''
      try {
        console.log('Attempting to add new USB device')
        const newDevice = await client.addUsbDevice()
        if (newDevice) {
          console.log('New device added:', newDevice)
          await this.updateUsbDeviceList()
        }
      } catch (error) {
        console.error('Failed to add USB device:', error)
        this.errorMessage = '添加设备失败'
        this.errorDetails = `${error.message}。请确保设备已正确连接并启用了 USB 调试。`
      }
    },

    initializeDeviceWatcher () {
      const supported = client.isSupportedWebUsb
      console.log('WebUSB support:', supported)
      if (!supported) {
        console.log('WebUSB is not supported')
        this.errorMessage = '浏览器不支持 WebUSB'
        this.errorDetails = '请使用支持 WebUSB 的现代浏览器，如 Chrome 或 Edge 的最新版本。'
        return
      }

      this.updateUsbDeviceList()
      this.watcher = new AdbDaemonWebUsbDeviceWatcher(async () => {
        console.log('Device list change detected')
        await this.updateUsbDeviceList()
      }, navigator.usb)
    }
  },
  mounted () {
    this.initializeDeviceWatcher()
  },
  beforeDestroy () {
    if (this.watcher) {
      this.watcher.dispose()
      console.log('Device watcher disposed')
    }
  },
  watch: {
    usbDeviceList: {
      handler: async function (newList) {
        console.log('Device list changed:', newList)
        if (this.selected) {
          const current = newList.find((device) => device.serial === (this.selected && this.selected.serial))
          if (!current) {
            console.log('Selected device not found in new list, disconnecting')
            await client.disconnect()
            const disconnectedDeviceName = this.selected.name || this.selected.serial
            this.selected = undefined
            this.deviceInfo = null
            this.errorMessage = '设备已断开连接'
            this.errorDetails = '选中的设备已从列表中移除。请检查设备连接状态。'
            this.disconnectionMessage = `设备 ${disconnectedDeviceName} 已断开连接。请检查设备连接状态。`
            this.$emit('update-connection-status', false)
            this.connectionStatus = 'disconnected'
            await this.autoReconnect()
          } else {
            this.disconnectionMessage = ''
          }
        }
      },
      deep: true
    }
  }
}
</script>

<template>
  <div class="paired-devices-component">
    <!-- 设备列表 -->
    <div class="device-list-container">
      <div v-if="deviceOptions.length === 0" class="empty-state">
        <button class="add-device-btn" @click="handleAddDevice">
          <span class="add-icon">+</span>
          添加 USB 设备
        </button>
      </div>
      <div v-else class="device-list">
        <div 
          v-for="device in deviceOptions" 
          :key="device.serial || device.name || Math.random()"
          class="device-item"
          @click="selectDevice(device)">
          <div class="device-avatar">
            <span class="phone-icon">📱</span>
          </div>
          <div class="device-info">
            <div class="device-name">{{ device.name || device.serial }}</div>
            <div class="device-serial">{{ device.serial }}</div>
          </div>
          <div class="device-actions">
            <span 
              v-if="selected && selected.serial === device.serial" 
              class="selected-indicator">✓</span>
            <button 
              class="remove-btn" 
              @click.stop="removeDevice(device.serial)"
              title="移除设备">
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paired-devices-component {
    display: inline-block;
    position: relative;
}

/* 主按钮样式 */
.device-selector-btn {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s;
    gap: 8px;
}

.device-selector-btn:hover {
    background: #1565c0;
}

.device-icon {
    font-size: 16px;
}

.device-name {
    font-weight: 500;
}

.status-indicator {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.status-indicator.connected {
    background: #4caf50;
    color: white;
}

.status-indicator.connecting,
.status-indicator.disconnected {
    background: #ff9800;
    color: white;
}

.dropdown-arrow {
    font-size: 12px;
    transition: transform 0.3s;
}

/* 下拉菜单样式 */
.device-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    width: 400px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    margin-top: 8px;
}

.dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
}

.dropdown-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.add-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #1976d2;
    background: white;
    color: #1976d2;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
}

.add-btn:hover {
    background: #f5f5f5;
}

/* 错误消息样式 */
.error-container {
    padding: 16px;
}

.error-alert {
    background: #ffebee;
    border: 1px solid #f44336;
    border-radius: 4px;
    padding: 12px;
}

.error-alert h4 {
    margin: 0 0 8px 0;
    color: #d32f2f;
    font-size: 14px;
    font-weight: 600;
}

.error-alert p {
    margin: 0 0 12px 0;
    color: #666;
    font-size: 13px;
    line-height: 1.4;
}

.error-actions {
    display: flex;
    gap: 8px;
}

.retry-btn, .help-btn {
    padding: 6px 12px;
    border: 1px solid #1976d2;
    background: white;
    color: #1976d2;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.retry-btn:hover, .help-btn:hover {
    background: #1976d2;
    color: white;
}

/* 断开连接消息 */
.disconnection-message {
    padding: 16px;
}

.warning-alert {
    background: #fff3e0;
    border: 1px solid #ff9800;
    border-radius: 4px;
    padding: 12px;
    color: #e65100;
    font-size: 13px;
}

/* 设备列表样式 */
.device-list-container {
    max-height: 300px;
    overflow-y: auto;
}

.empty-state {
    padding: 32px 16px;
    text-align: center;
}

.add-device-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    border: 1px solid #1976d2;
    background: white;
    color: #1976d2;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    gap: 8px;
    width: 100%;
}

.add-device-btn:hover {
    background: #f5f5f5;
}

.add-icon {
    font-size: 16px;
    font-weight: bold;
}

/* 设备列表 */
.device-list {
    padding: 8px 0;
}

.device-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    transition: background 0.3s;
    gap: 12px;
}

.device-item:hover {
    background: #f5f5f5;
}

.device-avatar {
    width: 40px;
    height: 40px;
    background: #333;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
}

.device-info {
    flex: 1;
}

.device-name {
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 2px;
}

.device-serial {
    color: #666;
    font-size: 12px;
}

.device-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.selected-indicator {
    color: #4caf50;
    font-weight: bold;
    font-size: 16px;
}

.remove-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #f44336;
    background: white;
    color: #f44336;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
}

.remove-btn:hover {
    background: #f44336;
    color: white;
}

/* 无设备状态 */
.no-devices {
    padding: 32px 16px;
    text-align: center;
}

.no-devices-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
}

.no-devices p {
    margin: 0 0 16px 0;
    color: #666;
}

/* 底部关闭按钮 */
.dropdown-footer {
    padding: 16px;
    border-top: 1px solid #e0e0e0;
}

.close-btn {
    width: 100%;
    padding: 8px 16px;
    border: 1px solid #e0e0e0;
    background: white;
    color: #333;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.close-btn:hover {
    background: #f5f5f5;
}
</style>
