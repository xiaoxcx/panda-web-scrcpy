<template>
  <div class="device-view2">
    <!-- 顶部工具栏 -->
    <div class="app-bar">
      <div class="app-bar-content">
        <div class="logo-section">
          <img src="../assets/android-chrome-192x192.png" alt="Logo" class="logo" />
          <PairedDevices
            @pair-device="onPairDevice"
            @update-connection-status="handleConnectionStatus"
          />
        </div>
        
        <div class="spacer"></div>
        
        <div class="actions-section">
          <a href="https://pandatestgrid.github.io/panda-web-scrcpy/" target="_blank" class="action-btn" title="GitHub">
            <span class="icon">📱</span>
          </a>
          <a href="https://discord.gg/yourdiscord" target="_blank" class="action-btn" title="Discord">
            <span class="icon">💬</span>
          </a>
          <a href="https://maxwellos.github.io/" target="_blank" class="community-btn">
            社区
          </a>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <div
        ref="containerRef"
        class="resizable-container"
        :class="{ 'horizontal-layout': isHorizontalLayout }"
      >
        <!-- 左侧面板 -->
        <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
          <div class="panel-content">
            <div v-if="connected" class="device-container">
              <div
                ref="videoWrapperRef"
                class="video-wrapper"
                :style="{
                  width: `${containerDimensions.width}px`,
                  height: `${containerDimensions.height}px`
                }"
              >
                <VideoContainer />
              </div>
              <div class="navigation-wrapper">
                <NavigationBar />
              </div>
            </div>
            <div v-else class="connection-status-container">
              <div
                class="loading-indicator"
                :style="{
                  width: leftPanelWidth / 1.2 + 'px',
                  height: containerSize.height / 1.2 + 'px',
                }"
              >
                <div class="connection-status">
                  <div v-if="scrcpyState.connecting" class="spinner"></div>
                  <button
                    v-else
                    class="power-button"
                    @click="showDeviceDrawer = true"
                  >
                    🔌
                  </button>
                </div>
                <div class="status-text">
                  {{ scrcpyState.connecting ? '正在连接设备...' : '连接设备' }}
                </div>
                <div class="hint-text">
                  {{ scrcpyState.connecting ? '请稍候...' : '请确保设备已开启USB调试模式' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧面板 -->
        <div
          v-if="showRightPanel"
          class="resizer"
          @mousedown="startResize"
          @touchstart="startResize"
        />
        <div
          v-if="showRightPanel"
          class="right-panel"
          :style="{ width: rightPanelWidth + 'px' }"
        >
          <div class="panel-content">
            <div v-if="connected" class="tab-container">
              <div class="tabs">
                <button
                  v-for="(item, index) in tabs"
                  :key="index"
                  :class="{ active: tab === index }"
                  @click="tab = index"
                >
                  {{ item.title }}
                </button>
              </div>
              <div class="tab-content">
                <component :is="item.component" :device-meta="deviceMeta" />
              </div>
            </div>
            <div v-else>
              <AbstractList />
            </div>
          </div>
        </div>
      </div>
    </div>

    <DeviceSelectDrawer v-model="showDeviceDrawer" />
  </div>
</template>

<script>
import PairedDevices from "../components/Device2/PairedDevices.vue";
import logo from "../assets/android-chrome-192x192.png";
import DeviceShell from "../components/Device2/DeviceShell.vue";
import DeviceLogcat from "../components/Device2/DeviceLogcat.vue";
import DeviceInfo from "../components/Device2/DeviceInfo.vue";
import AbstractList from "./AbstractList.vue";
import VideoContainer from "../components/Device2/VideoContainer.vue";
import NavigationBar from "../components/Device2/NavigationBar.vue";
import state from "../components/Scrcpy/scrcpy-state";
import AppManager from "../components/Device2/AppManager.vue";
import DeviceSelectDrawer from '../components/Device2/DeviceSelectDrawer.vue'
import GitHubStats from '../components/Common/GitHubStats.vue'

export default {
  name: 'DeviceView2',
  components: {
    PairedDevices,
    DeviceShell,
    DeviceLogcat,
    DeviceInfo,
    AbstractList,
    VideoContainer,
    NavigationBar,
    AppManager,
    DeviceSelectDrawer,
    GitHubStats
  },
  data() {
    return {
      logo,
      roomName: 'default-room',
      currentUser: {
        id: 'default-user',
        name: 'Default User',
      },
      containerSize: { width: 0, height: 0 },
      userSetLeftPanelWidth: 560,
      isResizing: false,
      width: 200,
      startX: 0,
      startWidth: 0,
      deviceMeta: undefined,
      connected: false,
      tab: 0,
      containerRef: null,
      DeviceContainerRef: null,
      videoWrapperRef: null,
      showDeviceDrawer: false,
      scrcpyState: state,
      tabs: [
        { title: "基础信息", icon: "mdi-android", component: DeviceInfo },
        { title: "应用管理", icon: "mdi-android", component: AppManager },
        { title: "终端", icon: "mdi-console", component: DeviceShell },
        { title: "Logcat", icon: "mdi-android", component: DeviceLogcat },
      ]
    };
  },
  computed: {
    showRightPanel() {
      return this.width >= 960;
    },
    leftPanelWidth() {
      if (!this.showRightPanel) {
        return this.width;
      }
      return this.userSetLeftPanelWidth;
    },
    rightPanelWidth() {
      return Math.max(300, this.containerSize.width - this.leftPanelWidth - 16);
    },
    isHorizontalLayout() {
      return this.containerSize.width > this.leftPanelWidth + 200;
    },
    containerDimensions() {
      const horizontalPadding = 20;
      const verticalPadding = 30;
      const navBarWidth = 80;
      const borderWidth = 6; // 考虑边框宽度

      return {
        width: this.leftPanelWidth - (navBarWidth + horizontalPadding + borderWidth),
        height: this.containerSize.height - (verticalPadding * 2 + borderWidth),
      };
    }
  },
  watch: {
    containerDimensions: {
      handler(newDimensions) {
        if (this.videoWrapperRef) {
          // 更新视频包装器的尺寸
          this.videoWrapperRef.style.width = `${newDimensions.width}px`;
          this.videoWrapperRef.style.height = `${newDimensions.height}px`;
          // 通知 state 更新视频容器
          state.updateVideoContainer();
        }
      },
      deep: true,
      immediate: true
    },
    width(newWidth, oldWidth) {
      if (newWidth < 960 && oldWidth >= 960) {
        this.userSetLeftPanelWidth = newWidth;
      } else if (newWidth >= 960 && oldWidth < 960) {
        this.userSetLeftPanelWidth = 450;
      }
    }
  },
  mounted() {
    // 确保容器尺寸已准备好
    this.ensureContainerSize();
    window.addEventListener('resize', this.updateContainerSize);
    
    // 监听全屏状态变化
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        setTimeout(this.updateContainerSize, 100);
      }
    });
  },
  beforeDestroy() {
    this.stopResize();
    window.removeEventListener("resize", this.updateContainerSize);
    document.removeEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        setTimeout(this.updateContainerSize, 100);
      }
    });
  },
  methods: {
    handleDisconnected() {
      this.connected = false;
      this.deviceMeta = undefined;
    },
    async onPairDevice(device) {
      console.log('device :', device);
      this.deviceMeta = device;

    },
    async handleConnectionStatus(status) {
      console.log('status :', status);
      if (status) {
        await this.ensureContainerSize();
      }
      console.log('status :', status);
      this.connected = status;
      if (!status) {
        this.handleDisconnected();
      }
    },
    startResize(e) {
      if (!this.showRightPanel) return;
      this.isResizing = true;
      this.startX = e.clientX || e.touches[0].clientX;
      this.startWidth = this.userSetLeftPanelWidth;
      document.addEventListener("mousemove", this.resize);
      document.addEventListener("touchmove", this.resize);
      document.addEventListener("mouseup", this.stopResize);
      document.addEventListener("touchend", this.stopResize);
    },
    resize(e) {
      if (!this.isResizing) return;
      const clientX = e.clientX || e.touches[0]?.clientX;
      const diff = clientX - this.startX;
      this.userSetLeftPanelWidth = Math.max(
        300,
        Math.min(this.startWidth + diff, this.containerSize.width - 300)
      );
    },
    stopResize() {
      this.isResizing = false;
      document.removeEventListener("mousemove", this.resize);
      document.removeEventListener("touchmove", this.resize);
      document.removeEventListener("mouseup", this.stopResize);
      document.removeEventListener("touchend", this.stopResize);
    },
    // 修改 updateContainerSize 方法
    updateContainerSize() {
      if (this.containerRef) {
        const rect = this.containerRef.getBoundingClientRect();
        this.containerSize = {
          width: rect.width,
          height: rect.height,
        };
        // 强制设置视频包装器的初始尺寸
        if (this.videoWrapperRef) {
          this.videoWrapperRef.style.width = `${this.containerDimensions.width}px`;
          this.videoWrapperRef.style.height = `${this.containerDimensions.height}px`;
          // 通知 state 更新视频容器
          if (this.scrcpyState.running) {
            state.updateVideoContainer();
          }
        }
      }
    },
    // 添加一个方法来确保容器尺寸已准备好
    ensureContainerSize() {
      return new Promise(resolve => {
        const checkSize = () => {
          this.updateContainerSize();
          if (this.containerSize.width > 0 && this.containerSize.height > 0) {
            resolve();
          } else {
            requestAnimationFrame(checkSize);
          }
        };
        checkSize();
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.device-view2 {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-bar {
  height: 64px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.app-bar-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  width: 24px;
  height: 24px;
}

.spacer {
  flex: 1;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn, .community-btn {
  padding: 8px 12px;
  text-decoration: none;
  color: #1976d2;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  transition: all 0.3s;
}

.action-btn:hover, .community-btn:hover {
  background: #f5f5f5;
}

.icon {
  font-size: 16px;
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.resizable-container {
  display: flex;
  height: calc(100vh - 64px);
  overflow: hidden;

  &.horizontal-layout {
    flex-direction: row;
  }
}

.left-panel {
  min-width: 200px;
  max-width: 100%;
  overflow: hidden;
  margin: 16px;
  background: #f5f5f5;
}

.panel-content {
  background: white;
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.device-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  padding: 30px 10px;
  gap: 16px;
  box-sizing: border-box;
  background: transparent;
}

.video-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: black;
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
}

.navigation-wrapper {
  width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  background: transparent;
}

.connection-status-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(#e9ecf1, #deeefa);
  border-radius: 16px;
  border: 3px solid black;
  padding: 16px;
  text-align: center;
  font-size: 16px;
  font-weight: 500;
}

.connection-status {
  margin-bottom: 16px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #1976d2;
  border-top: 4px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.power-button {
  width: 60px;
  height: 60px;
  border: none;
  background: black;
  color: white;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.power-button:hover {
  background: #333;
}

.status-text {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.hint-text {
  font-size: 14px;
  color: #666;
}

.resizer {
  width: 8px;
  background: #e0e0e0;
  cursor: col-resize;
  transition: background 0.3s;

  &:hover {
    background: #1976d2;
  }
}

.right-panel {
  flex-grow: 1;
  min-width: 300px;
  margin: 16px 16px 16px 8px;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.tab-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.tabs button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tabs button.active {
  border-bottom-color: #1976d2;
  color: #1976d2;
  font-weight: 600;
}

.tabs button:hover {
  background: #f5f5f5;
}

.tab-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

@media (max-width: 960px) {
  .resizable-container {
    flex-direction: column;

    .left-panel {
      max-width: 100%;
      margin: 16px;
    }

    .resizer {
      display: none;
    }
  }
}
</style>