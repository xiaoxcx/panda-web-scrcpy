<script>
import { PackageManager } from '@yume-chan/android-bin'
import { createFileStream, WrapConsumableStream, ProgressStream } from '../Scrcpy/file'
import client from '../Scrcpy/adb-client'

export default {
  data () {
    return {
      Stage: {
        Uploading: '上传中',
        Installing: '安装中',
        Completed: '已完成',
        Error: '错误'
      },
      file: null,
      installing: false,
      progress: undefined,
      log: '',
      errorMessage: '',
      options: {
        allowTest: true,
        internalStorage: true,
        requestDowngrade: true,
        grantRuntimePermissions: true
      }
    }
  },
  computed: {
    isInstallDisabled () {
      return !client.device || this.installing || !this.file
    }
  },
  methods: {
    handleFileUpload (event) {
      const target = event.target
      if (target.files) {
        this.file = target.files[0]
      }
    },

    handleFileDrop (event) {
      event.preventDefault()
      if (event.dataTransfer?.files) {
        this.file = event.dataTransfer.files[0]
      }
    },

    async install () {
      if (!this.file || !client.device) {
        this.errorMessage = !this.file ? '请选择一个 APK 文件' : '请先连接设备'
        return
      }

      this.installing = true
      this.progress = {
        filename: this.file.name,
        stage: this.Stage.Uploading,
        uploadedSize: 0,
        totalSize: this.file.size,
        value: 0
      }
      this.log = ''
      this.errorMessage = ''

      try {
        const pm = new PackageManager(client.device)
        const fileStream = createFileStream(this.file)
          .pipeThrough(new WrapConsumableStream())
          .pipeThrough(
            new ProgressStream((uploaded) => {
              if (this.progress) {
                this.progress.uploadedSize = uploaded
                this.progress.value =
                                    (uploaded / this.file.size) *
                                    (uploaded === this.file.size ? 1 : 0.8)
                this.progress.stage =
                                    uploaded === this.file.size ? this.Stage.Installing : this.Stage.Uploading
              }
            })
          )

        const start = Date.now()
        const installResult = await pm.installStream(this.file.size, fileStream, this.options)

        const elapsed = Date.now() - start
        const transferRate = (this.file.size / (elapsed / 1000) / 1024 / 1024).toFixed(2)
        this.log = `安装完成\n耗时: ${elapsed}毫秒\n传输速率: ${transferRate}MB/秒\n${installResult || ''}`

        this.progress = {
          filename: this.file.name,
          stage: this.Stage.Completed,
          uploadedSize: this.file.size,
          totalSize: this.file.size,
          value: 1
        }
      } catch (error) {
        this.errorMessage = `错误: ${error.message}`
        if (this.progress) {
          this.progress.stage = this.Stage.Error
        }
      } finally {
        this.installing = false
      }
    },

    formatFileSize (size) {
      if (size < 1024) return size + ' B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
      if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB'
      return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
    }
  }
}
</script>

<template>
  <v-container class="pa-4 d-flex flex-column device-install-container" :class="{ 'px-16': $vuetify.display.lgAndUp }" style="height: 100%;">
    <v-row class="flex-grow-1 overflow-auto">
      <v-col cols="12" class="d-flex flex-column">
        <v-hover v-slot="{ isHovering, props }">
          <div
            v-bind="props"
            class="drop-zone mb-6"
            :class="{ 'drop-zone-hover': isHovering }"
            @dragover.prevent
            @drop="handleFileDrop"
            @click="fileInput?.click()">
            <input
              type="file"
              ref="fileInput"
              accept=".apk"
              style="display: none"
              @change="handleFileUpload"/>
            <v-icon size="64" color="primary">mdi-android</v-icon>
            <p class="text-body-1 mt-4">点击或拖拽 APK 文件到此处</p>
            <p v-if="file" class="text-caption mt-2">已选择: {{ file.name }}</p>
          </div>
        </v-hover>

        <v-card-text v-if="file" class="text-body-2 mb-4">
          文件大小: {{ formatFileSize(file.size) }}
        </v-card-text>

        <v-row class="mb-4">
          <v-col cols="12" sm="6">
            <v-checkbox v-model="options.allowTest" label="允许测试包" density="compact" hide-details />
            <v-checkbox v-model="options.internalStorage" label="强制安装到内部存储" density="compact" hide-details />
          </v-col>
          <v-col cols="12" sm="6">
            <v-checkbox v-model="options.requestDowngrade" label="允许降级安装" density="compact" hide-details />
            <v-checkbox v-model="options.grantRuntimePermissions" label="授予所有运行时权限" density="compact" hide-details />
          </v-col>
        </v-row>

        <v-btn
          color="primary"
          @click="install"
          :loading="installing"
          :disabled="isInstallDisabled"
          class="mb-6"
          block
          :elevation="2">
          安装应用
        </v-btn>

        <v-fade-transition>
          <v-progress-linear
            v-if="progress"
            :model-value="progress.value * 100"
            height="25"
            color="primary"
            class="mb-4">
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
        </v-fade-transition>

        <v-fade-transition>
          <v-card-text v-if="progress" class="text-center mb-4">
            <div class="text-subtitle-2">{{ progress.filename }}</div>
            <div class="text-caption">{{ progress.stage }}</div>
            <div class="text-caption">
              {{ formatFileSize(progress.uploadedSize) }} /
              {{ formatFileSize(progress.totalSize) }}
            </div>
          </v-card-text>
        </v-fade-transition>

        <v-fade-transition>
          <v-alert v-if="errorMessage" type="error" class="mb-4" variant="tonal" closable>
            {{ errorMessage }}
          </v-alert>
        </v-fade-transition>

        <v-expand-transition>
          <v-card v-if="log" class="mb-4" variant="outlined">
            <v-card-text>
              <pre class="text-caption">{{ log }}</pre>
            </v-card-text>
          </v-card>
        </v-expand-transition>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.device-install-container {
    width: 600px;
    min-width: 300px;
    max-width: 100%;
    margin: 0 auto;
}

.v-container {
    max-height: 100vh;
    overflow-y: auto;
}

.flex-grow-1 {
    flex-grow: 1;
}

.overflow-auto {
    overflow: auto;
}

.drop-zone {
    border: 2px dashed var(--v-border-color);
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    transition: all 0.3s ease;
    background-color: var(--v-background);
    cursor: pointer;
    min-height: 150px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.drop-zone-hover {
    border-color: var(--v-primary-base);
    background-color: var(--v-primary-lighten5);
}

pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: monospace;
    background-color: var(--v-background);
    padding: 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    line-height: 1.5;
    max-width: 100%;
    overflow-x: auto;
}

@media (max-width: 600px) {
    .device-install-container {
        width: 100%;
    }

    .drop-zone {
        padding: 16px;
        min-height: 120px;
    }

    .drop-zone .v-icon {
        font-size: 48px !important;
    }

    .drop-zone p {
        font-size: 0.9rem;
    }
}
</style>
