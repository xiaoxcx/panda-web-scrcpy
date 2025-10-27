<template>
  <v-card class="device-logcat">
    <v-card-text class="pa-0">
      <div class="header d-flex align-center justify-space-between">
        <div class="d-flex align-center flex-grow-1">
          <v-select
            v-model="selectedPriority"
            :items="priorityOptions"
            item-title="text"
            item-value="value"
            label="日志级别"
            dense
            hide-details
            variant="outlined"
            density="compact"
            class="mr-2"
            style="max-width: 150px"></v-select>
          <v-text-field
            v-model="tagFilter"
            label="标签过滤"
            placeholder="输入标签进行过滤"
            dense
            hide-details
            variant="outlined"
            density="compact"
            class="mr-2"
            style="max-width: 150px"></v-text-field>
          <v-text-field
            v-model="searchQuery"
            label="搜索日志"
            placeholder="输入关键词搜索"
            dense
            hide-details
            variant="outlined"
            density="compact"
            class="flex-grow-1"
            style="max-width: 450px"></v-text-field>
        </div>
        <div class="d-flex align-center">
          <v-btn
            :color="isRunning ? 'error' : 'primary'"
            class="mr-2"
            variant="text"
            @click="toggleLogcat">
            <v-icon>{{ isRunning ? 'mdi-stop' : 'mdi-play' }}</v-icon>
          </v-btn>
          <v-btn color="secondary" class="mr-2" variant="text" @click="clearLogs">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <v-btn
            :disabled="filteredLogs.length === 0"
            color="secondary"
            variant="text"
            @click="exportLogs">
            <v-icon>mdi-export</v-icon>
          </v-btn>
        </div>
      </div>

      <div class="log-container">
        <div class="log-header">
          <div class="log-cell time">时间</div>
          <div class="log-cell priority">级别</div>
          <div class="log-cell tag">标签</div>
          <div class="log-cell message">消息</div>
        </div>
        <div ref="logContainer" style="height: calc(100vh - 300px)">
          <v-virtual-scroll
            :items="filteredLogs"
            :item-size="28"
            height="100%"
            item-height="28">
            <template #default="{ item }">
              <div
                v-memo="[
                  item.seconds,
                  item.nanoseconds,
                  item.priority,
                  item.tag,
                  item.message,
                ]"
                :class="[
                  'log-entry',
                  `priority-${AndroidLogPriorityToCharacter[item.priority].toLowerCase()}`,
                ]">
                <div class="log-cell time">{{ formatTime(item) }}</div>
                <div class="log-cell priority">
                  <v-chip
                    :color="getPriorityColor(item.priority)"
                    text-color="white"
                    size="x-small"
                    label
                    class="priority-chip">
                    {{ AndroidLogPriorityToCharacter[item.priority] }}
                  </v-chip>
                </div>
                <div class="log-cell tag">{{ item.tag }}</div>
                <div class="log-cell message">{{ item.message }}</div>
              </div>
            </template>
          </v-virtual-scroll>
        </div>

        <div v-if="filteredLogs.length === 0" class="no-logs-message">
          {{ isRunning ? '正在等待日志...' : '没有日志可显示' }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import client from '../Scrcpy/adb-client'
import {
  Logcat,
  AndroidLogPriority,
  AndroidLogPriorityToCharacter
} from '@yume-chan/android-bin'

export default {
  data () {
    return {
      // 状态变量
      isRunning: false,
      logs: [],
      selectedPriority: AndroidLogPriority.Verbose,
      tagFilter: '',
      searchQuery: '',
      logContainer: null,
      isNearBottom: true,

      // 日志队列和处理相关变量
      logQueue: [],
      isProcessingQueue: false,
      lastUpdateTime: 0,
      UPDATE_INTERVAL: 100,
      MAX_LOGS: 5000,

      // Logcat 实例
      logcat: null,
      logStream: null,
      abortController: null,
      reader: null,
      shouldStopLogcat: false,

      // 优先级选项
      priorityOptions: [
        { text: '详细 (V)', value: AndroidLogPriority.Verbose },
        { text: '调试 (D)', value: AndroidLogPriority.Debug },
        { text: '信息 (I)', value: AndroidLogPriority.Info },
        { text: '警告 (W)', value: AndroidLogPriority.Warn },
        { text: '错误 (E)', value: AndroidLogPriority.Error },
        { text: '致命 (F)', value: AndroidLogPriority.Fatal }
      ],

      // 优先级颜色映射
      priorityColors: {
        [AndroidLogPriority.Verbose]: 'grey darken-2',
        [AndroidLogPriority.Debug]: 'blue darken-3',
        [AndroidLogPriority.Info]: 'green darken-3',
        [AndroidLogPriority.Warn]: 'orange darken-3',
        [AndroidLogPriority.Error]: 'red darken-3',
        [AndroidLogPriority.Fatal]: 'purple darken-3'
      }
    }
  },

  computed: {
    // 使用计算属性来过滤日志
    filteredLogs () {
      const priority = this.selectedPriority
      const tag = this.tagFilter.toLowerCase()
      const query = this.searchQuery.toLowerCase()

      return this.logs.filter((log) => {
        if (log.priority < priority) return false
        if (tag && !log.tag.toLowerCase().includes(tag)) return false
        if (query && !log.message.toLowerCase().includes(query)) return false
        return true
      })
    }
  },

  watch: {
    // 监听过滤条件变化，当条件变化时重置滚动位置
    selectedPriority () {
      this.$nextTick(() => {
        if (this.logContainer) {
          this.logContainer.scrollTop = 0
        }
      })
    },
    tagFilter () {
      this.$nextTick(() => {
        if (this.logContainer) {
          this.logContainer.scrollTop = 0
        }
      })
    },
    searchQuery () {
      this.$nextTick(() => {
        if (this.logContainer) {
          this.logContainer.scrollTop = 0
        }
      })
    }
  },

  methods: {
    // 切换 Logcat 状态
    async toggleLogcat () {
      if (this.isRunning) {
        await this.stopLogcat()
      } else {
        await this.startLogcat()
      }
    },

    // 启动 Logcat
    async startLogcat () {
      try {
        this.logcat = new Logcat(client.device)
        this.abortController = new AbortController()
        this.logStream = this.logcat.binary()

        this.isRunning = true
        this.shouldStopLogcat = false
        this.logs = []

        this.reader = this.logStream.getReader()
        while (!this.shouldStopLogcat) {
          const { done, value } = await this.reader.read()
          if (done) break
          this.logQueue.push(value)
          if (!this.isProcessingQueue) {
            this.processLogQueue()
          }
        }
      } catch (error) {
        console.error('启动 Logcat 失败，请检查设备连接状态', error)
      } finally {
        await this.cleanupLogcat()
      }
    },

    // 异步处理日志队列
    async processLogQueue () {
      this.isProcessingQueue = true
      while (this.logQueue.length > 0 && !this.shouldStopLogcat) {
        const now = Date.now()
        if (now - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
          await new Promise((resolve) => requestAnimationFrame(resolve))
          const batch = this.logQueue.splice(0, Math.min(100, this.logQueue.length))
          this.logs = [...this.logs, ...batch].slice(-this.MAX_LOGS)
          this.lastUpdateTime = now
          if (this.isNearBottom) {
            this.scrollToBottom()
            await this.$nextTick()
          }
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, this.UPDATE_INTERVAL - (now - this.lastUpdateTime))
          )
        }
      }
      this.isProcessingQueue = false
    },

    // 停止 Logcat
    async stopLogcat () {
      this.shouldStopLogcat = true
      this.isRunning = false

      // 等待当前的读取操作完成
      if (this.reader) {
        try {
          await this.reader.cancel()
        } catch (error) {
          console.error('取消 reader 时出错:', error)
        }
      }

      await this.cleanupLogcat()
    },

    // 清理 Logcat 资源
    async cleanupLogcat () {
      if (this.reader) {
        try {
          this.reader.releaseLock()
        } catch (error) {
          console.error('释放 reader 锁时出错:', error)
        }
        this.reader = null
      }

      if (this.logStream) {
        try {
          await this.logStream.cancel()
        } catch (error) {
          console.error('取消 logStream 时出错:', error)
        }
        this.logStream = null
      }

      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }

      this.logcat = null
      this.logQueue.length = 0
    },

    // 清除日志
    async clearLogs () {
      try {
        if (this.logcat) {
          await this.logcat.clear()
        }
        this.logs = []
        this.logQueue.length = 0
      } catch (error) {
        console.error('清除日志失败，请重试', error)
      }
    },

    // 导出日志
    exportLogs () {
      const logText = this.filteredLogs
        .map((log) => `${this.formatTime(log)} ${log.tag} ${log.message}`)
        .join('\n')
      const blob = new Blob([logText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logcat_export_${new Date().toISOString()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },

    // 格式化时间
    formatTime (log) {
      const date = new Date(log.seconds * 1000 + log.nanoseconds / 1000000)
      return date.toISOString().replace('T', ' ').slice(0, -1)
    },

    // 获取优先级对应的颜色
    getPriorityColor (priority) {
      return this.priorityColors[priority] || 'grey darken-2'
    },

    // 滚动到底部
    scrollToBottom () {
      if (this.logContainer) {
        this.logContainer.scrollTop = this.logContainer.scrollHeight
      }
    }
  },

  mounted () {
    // 组件挂载时的初始化逻辑
    this.logContainer = this.$refs.logContainer
  },

  beforeDestroy () {
    // 组件销毁前清理资源
    if (this.isRunning) {
      this.stopLogcat()
    }
  }
}
</script>

<style scoped>
.device-logcat {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.header {
    padding: 8px;
    border-bottom: 1px solid #e0e0e0;
}

.log-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.log-header {
    display: flex;
    font-weight: bold;
    padding: 6px 6px;
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: #fff;
}

.log-entry {
    display: flex;
    padding: 6px 5px;
    font-size: 0.9rem;
    border-bottom: 1px solid #f0f0f0;
    min-width: max-content;
}

.log-cell {
    padding: 0 10px;
}

.log-cell.time {
    flex: 0 0 210px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.log-cell.priority {
    flex: 0 0 50px;
    text-align: center;
}

.log-cell.tag {
    flex: 0 0 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.log-cell.message {
    flex: 1;
    min-width: 200px;
    white-space: nowrap;
    word-break: break-word;
}

.priority-chip {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.no-logs-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #757575;
}

@media (max-width: 600px) {
    .log-cell.time {
        flex: 0 0 120px;
    }

    .log-cell.tag {
        flex: 0 0 100px;
    }
}
</style>
