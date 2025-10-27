<template>
  <div class="app-manager">
    <div class="info-container">
      <v-fade-transition mode="out-in">
        <div class="app-grid">
          <!-- 应用列表部分 -->
          <div class="app-list">
            <v-card class="d-flex flex-column h-100">
              <v-card-title class="py-3 px-4 bg-primary-lighten-5 d-flex justify-space-between align-center">
                <div class="d-flex align-center">
                  <v-icon start color="primary" class="mr-2">mdi-format-list-bulleted</v-icon>
                  <span class="text-h6">应用列表</span>
                </div>
                <div class="d-flex gap-2">
                  <v-btn
                    color="primary"
                    variant="tonal"
                    @click="refreshAppList"
                    :loading="loading"
                    prepend-icon="mdi-refresh">
                    刷新
                  </v-btn>
                </div>
              </v-card-title>

              <div class="px-4 py-2">
                <v-text-field
                  v-model="search"
                  label="搜索应用"
                  prepend-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details></v-text-field>
              </div>

              <v-card-text class="flex-grow-1 pa-0 overflow-auto">
                <v-data-table
                  :headers="headers"
                  :items="apps"
                  :loading="loading"
                  :search="search"
                  :items-per-page="10"
                  hover
                  fixed-header
                  class="app-table">
                  <!-- 应用信息列 -->
                  <template v-slot:item.appInfo="{ item }">
                    <div class="d-flex align-center">
                      <v-icon size="32" color="grey" class="mr-3">mdi-android</v-icon>
                      <div>
                        <div class="font-weight-medium">{{ item.appName }}</div>
                        <div class="text-caption text-grey">{{ item.packageName }}</div>
                      </div>
                    </div>
                  </template>

                  <!-- 版本号列 -->
                  <template v-slot:item.versionInfo="{ item }">
                    <div>
                      <div class="font-weight-medium">版本号: {{ item.versionCode || '未知' }}</div>
                    </div>
                  </template>

                  <!-- 安装信息列 -->
                  <template v-slot:item.installInfo="{ item }">
                    <div>
                      <div class="text-caption">来源: {{ item.installer }}</div>
                      <div class="text-caption text-grey text-truncate" :title="item.sourceDir">
                        路径: {{ item.sourceDir }}
                      </div>
                    </div>
                  </template>

                  <!-- 操作列 -->
                  <template v-slot:item.actions="{ item }">
                    <div class="d-flex gap-2 actions-container">
                      <v-btn
                        color="primary"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-play"
                        @click="launchApp(item)">
                        启动
                      </v-btn>
                      <v-btn
                        color="info"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-export"
                        @click="exportApk(item)"
                        :loading="item.exporting">
                        导出
                      </v-btn>
                      <v-btn
                        color="error"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-delete"
                        @click="uninstallApp(item)"
                        :loading="item.uninstalling">
                        卸载
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </div>

          <!-- 安装应用部分 -->
          <div class="app-install">
            <v-card class="h-100">
              <v-card-title class="py-3 px-4 bg-primary-lighten-5">
                <v-icon start color="primary" class="mr-2">mdi-package-variant</v-icon>
                安装应用
              </v-card-title>
              <v-card-text class="overflow-auto">
                <DeviceInstall @install-complete="handleInstallComplete" />
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-fade-transition>
    </div>

    <!-- 导出进度对话框 -->
    <v-dialog v-model="showExportDialog" persistent max-width="400">
      <v-card>
        <v-card-title>导出APK</v-card-title>
        <v-card-text>
          <div class="text-subtitle-2 mb-2">{{ exportingApp?.appName }}</div>
          <v-progress-linear
            v-if="exportProgress"
            :model-value="exportProgress"
            height="25"
            color="info">
            <template v-slot:default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 错误提示 -->
    <v-snackbar v-model="showError" :color="errorType" timeout="3000" location="top">
      {{ errorMessage }}
    </v-snackbar>

    <!-- 确认对话框 -->
    <v-dialog v-model="showConfirmDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">
          确认卸载
        </v-card-title>
        <v-card-text>
          确定要卸载 <strong>{{ selectedApp?.appName }}</strong> 吗？
          <div class="text-caption mt-2">
            包名: {{ selectedApp?.packageName }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showConfirmDialog = false">
            取消
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            @click="confirmUninstall"
            :loading="selectedApp?.uninstalling">
            卸载
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import DeviceInstall from './DeviceInstall.vue'
import { PackageManager } from '@yume-chan/android-bin'
import client from '../Scrcpy/adb-client'
import { saveAs } from 'file-saver'

export default {
  name: 'AppManager',
  components: {
    DeviceInstall
  },
  data () {
    return {
      search: '',
      loading: false,
      showExportDialog: false,
      showError: false,
      errorMessage: '',
      errorType: 'error',
      showConfirmDialog: false,
      selectedApp: null,
      exportProgress: 0,
      exportingApp: null,
      apps: [],
      headers: [
        { title: '应用信息', key: 'appInfo', sortable: false },
        { title: '版本信息', key: 'versionInfo', sortable: false },
        { title: '安装信息', key: 'installInfo', sortable: false },
        { title: '操作', key: 'actions', sortable: false, align: 'center' }
      ]
    }
  },
  mounted () {
    this.refreshAppList()
  },
  methods: {
    async refreshAppList () {
      this.loading = true
      try {
        if (!client.device) {
          throw new Error('设备未连接')
        }

        const packageManager = new PackageManager(client.device)
        const packages = await packageManager.listPackages()

        this.apps = packages.map(pkg => ({
          ...pkg,
          appName: pkg.appName || pkg.packageName,
          uninstalling: false,
          exporting: false
        }))
      } catch (error) {
        console.error('获取应用列表失败:', error)
        this.showError = true
        this.errorMessage = '获取应用列表失败'
        this.errorType = 'error'
      } finally {
        this.loading = false
      }
    },

    async launchApp (app) {
      try {
        if (!client.device) {
          throw new Error('设备未连接')
        }

        const packageManager = new PackageManager(client.device)
        await packageManager.launch(app.packageName)

        this.showError = true
        this.errorMessage = '应用启动成功'
        this.errorType = 'success'
      } catch (error) {
        console.error('启动应用失败:', error)
        this.showError = true
        this.errorMessage = '启动应用失败'
        this.errorType = 'error'
      }
    },

    async exportApk (app) {
      try {
        if (!client.device) {
          throw new Error('设备未连接')
        }

        app.exporting = true
        this.exportingApp = app
        this.showExportDialog = true
        this.exportProgress = 0

        const packageManager = new PackageManager(client.device)
        const stream = await packageManager.export(app.packageName)

        const chunks = []
        const reader = stream.getReader()
        let totalSize = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          chunks.push(value)
          totalSize += value.length

          // 模拟进度更新
          this.exportProgress = Math.min(95, (totalSize / (1024 * 1024)) * 10)
        }

        const blob = new Blob(chunks)
        saveAs(blob, `${app.packageName}.apk`)

        this.exportProgress = 100
        setTimeout(() => {
          this.showExportDialog = false
          this.exportingApp = null
        }, 1000)

        this.showError = true
        this.errorMessage = 'APK导出成功'
        this.errorType = 'success'
      } catch (error) {
        console.error('导出APK失败:', error)
        this.showError = true
        this.errorMessage = '导出APK失败'
        this.errorType = 'error'
        this.showExportDialog = false
        this.exportingApp = null
      } finally {
        app.exporting = false
      }
    },

    uninstallApp (app) {
      this.selectedApp = app
      this.showConfirmDialog = true
    },

    async confirmUninstall () {
      if (!this.selectedApp) return

      try {
        this.selectedApp.uninstalling = true

        if (!client.device) {
          throw new Error('设备未连接')
        }

        const packageManager = new PackageManager(client.device)
        await packageManager.uninstall(this.selectedApp.packageName)

        // 从列表中移除
        this.apps = this.apps.filter(app => app.packageName !== this.selectedApp.packageName)

        this.showConfirmDialog = false
        this.selectedApp = null

        this.showError = true
        this.errorMessage = '应用卸载成功'
        this.errorType = 'success'
      } catch (error) {
        console.error('卸载应用失败:', error)
        this.showError = true
        this.errorMessage = '卸载应用失败'
        this.errorType = 'error'
      } finally {
        if (this.selectedApp) {
          this.selectedApp.uninstalling = false
        }
      }
    },

    handleInstallComplete () {
      this.refreshAppList()
      this.showError = true
      this.errorMessage = '应用安装成功'
      this.errorType = 'success'
    }
  }
}
</script>

<style scoped>
.app-manager {
  height: 100%;
  padding: 16px;
  overflow: hidden;
  max-height: calc(100vh - 64px); /* 减去顶部导航栏的高度 */
}

.info-container {
  height: 100%;
  max-height: 100%;
}

.app-grid {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 24px;
  max-height: 100%;
}

.app-list, .app-install {
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

/* 表格容器样式 */
.v-card-text {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px); /* 调整最大高度 */
}

/* 表格样式 */
.app-table {
  flex: 1;
  overflow: auto;
}

:deep(.v-data-table) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.v-data-table__wrapper) {
  flex: 1;
  overflow-y: auto !important;
}

/* 固定操作列样式 */
.actions-container {
  min-width: 240px;
  justify-content: flex-start;
}

:deep(.v-data-table__wrapper table) {
  table-layout: fixed;
}

/* 确保水平滚动条正常工作 */
:deep(.v-data-table__wrapper) {
  overflow-x: auto !important;
}

/* 其他样式保持不变 */
</style>
