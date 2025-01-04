<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import client from '../Scrcpy/adb-client';
import { Adb } from '@yume-chan/adb';

const device = computed(() => client.device || undefined);
const isLoading = ref(true);

const deviceInfo = ref({
    deviceModel: '',
    manufacturer: '',
    androidVersion: '',
    sdkVersionCode: '',
    resolution: '',
    screenDensity: '',
    ipAddress: '',
    totalMemory: '',
    totalStorage: '',
    serialNumber: '',
    cpuInfo: '',
    cpuMin: '',
    cpuMax: '',
    cpuCur: '',
    brand: '',
    product: '',
    board: '',
    display: '',
    id: '',
    fingerPrint: '',
    host: '',
    hardware: '',
    device: '',
    user: '',
    radioVersion: '',
    tags: '',
    type: '',
    basebandVer: '',
    cpuAbi: '',
    abis: '',
});

async function executeShellCommand(device: Adb, command: string): Promise<string> {
    const subprocess = await device.subprocess.shell(command);
    const reader = subprocess.stdout.getReader();
    let result = '';
    let done = false;

    try {
        while (!done) {
            const { value, done: isDone } = await reader.read();
            done = isDone;
            if (value) {
                result += new TextDecoder().decode(value);
            }
        }
    } finally {
        reader.releaseLock();
    }

    await subprocess.exit;
    return result.trim();
}

async function getDeviceInfo() {
    if (!device.value) return;

    const adbDevice = device.value;

    deviceInfo.value = {
        deviceModel: await adbDevice.getProp('ro.product.model'),
        manufacturer: await adbDevice.getProp('ro.product.manufacturer'),
        androidVersion: await adbDevice.getProp('ro.build.version.release'),
        sdkVersionCode: await adbDevice.getProp('ro.build.version.sdk'),
        resolution: await executeShellCommand(adbDevice, "wm size | awk '{print $3}'"),
        screenDensity: await adbDevice.getProp('ro.sf.lcd_density'),
        ipAddress: await executeShellCommand(
            adbDevice,
            "ip addr show wlan0 | grep 'inet ' | cut -d' ' -f6 | cut -d/ -f1"
        ),
        totalMemory: `${await executeShellCommand(
            adbDevice,
            "free -m | awk '/Mem:/ {print $2}'"
        )} MB`,
        totalStorage: await executeShellCommand(
            adbDevice,
            "df -h /data | awk '/\\/data/ {print $2}'"
        ),
        serialNumber: await adbDevice.getProp('ro.serialno'),
        cpuInfo: await adbDevice.getProp('ro.hardware'),
        cpuMin: await executeShellCommand(
            adbDevice,
            'cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_min_freq'
        ),
        cpuMax: await executeShellCommand(
            adbDevice,
            'cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq'
        ),
        cpuCur: await executeShellCommand(
            adbDevice,
            'cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq'
        ),
        brand: await adbDevice.getProp('ro.product.brand'),
        product: await adbDevice.getProp('ro.product.name'),
        board: await adbDevice.getProp('ro.product.board'),
        display: await adbDevice.getProp('ro.build.display.id'),
        id: await adbDevice.getProp('ro.build.id'),
        fingerPrint: await adbDevice.getProp('ro.build.fingerprint'),
        host: await adbDevice.getProp('ro.build.host'),
        hardware: await adbDevice.getProp('ro.hardware'),
        device: await adbDevice.getProp('ro.product.device'),
        user: await adbDevice.getProp('ro.build.user'),
        radioVersion: await adbDevice.getProp('gsm.version.baseband'),
        tags: await adbDevice.getProp('ro.build.tags'),
        type: await adbDevice.getProp('ro.build.type'),
        basebandVer: await adbDevice.getProp('gsm.version.baseband'),
        cpuAbi: await adbDevice.getProp('ro.product.cpu.abi'),
        abis: await adbDevice.getProp('ro.product.cpu.abilist'),
    };
}

onMounted(async () => {
    if (client.isConnected) {
        await getDeviceInfo();
        isLoading.value = false;
    } else {
        console.error('Device not connected');
        isLoading.value = false;
    }
});

function getIconForKey(key: string): string {
    const iconMap: { [key: string]: string } = {
        androidVersion: 'mdi-android',
        deviceModel: 'mdi-cellphone',
        resolution: 'mdi-monitor',
        manufacturer: 'mdi-factory',
        ipAddress: 'mdi-ip-network',
        totalMemory: 'mdi-memory',
        totalStorage: 'mdi-harddisk',
        serialNumber: 'mdi-barcode',
        cpuInfo: 'mdi-cpu-64-bit',
        screenDensity: 'mdi-monitor',
        brand: 'mdi-factory',
        product: 'mdi-package-variant',
        sdkVersionCode: 'mdi-code-tags',
        cpuMin: 'mdi-speedometer-slow',
        cpuMax: 'mdi-speedometer',
        cpuCur: 'mdi-speedometer-medium',
        board: 'mdi-artboard',
        display: 'mdi-monitor',
        id: 'mdi-identifier',
        fingerPrint: 'mdi-fingerprint',
        host: 'mdi-server',
        hardware: 'mdi-chip',
        device: 'mdi-cellphone',
        user: 'mdi-account',
        radioVersion: 'mdi-radio-tower',
        tags: 'mdi-tag',
        type: 'mdi-format-list-bulleted-type',
        basebandVer: 'mdi-radio-tower',
        cpuAbi: 'mdi-cpu-64-bit',
        abis: 'mdi-cpu-64-bit',
    };
    return iconMap[key] || 'mdi-information';
}

function getDisplayName(key: string): string {
    const displayNames: { [key: string]: string } = {
        androidVersion: 'Android 版本',
        deviceModel: '设备型号',
        resolution: '设备分辨率',
        manufacturer: '制造商',
        ipAddress: 'IP 地址',
        totalMemory: '总内存',
        totalStorage: '总存储',
        serialNumber: '序列号',
        cpuInfo: 'CPU 信息',
        screenDensity: '屏幕密度',
        brand: '设备品牌',
        product: '产品名称',
        sdkVersionCode: 'SDK 版本号',
        cpuMin: 'CPU 最小频率',
        cpuMax: 'CPU 最大频率',
        cpuCur: 'CPU 当前频率',
        board: '主板名称',
        display: '显示屏参数',
        id: '修订版本列表',
        fingerPrint: '设备指纹',
        host: '执行代码编译的 Host 值',
        hardware: '硬件名',
        device: '设备参数',
        user: '执行代码编译的 User 值',
        radioVersion: '无线电固件版本',
        tags: '描述 Build 的标签',
        type: 'Builder 类型',
        basebandVer: '基带版本',
        cpuAbi: '主要指令集',
        abis: '支持的指令集',
    };
    return displayNames[key] || key;
}
</script>

<template>
    <div class="device-info">
        <v-progress-circular v-if="isLoading" indeterminate color="primary"></v-progress-circular>
        <div v-else class="info-grid">
            <v-card v-for="(value, key) in deviceInfo" :key="key" class="info-item">
                <v-card-title>
                    <v-icon class="info-icon">{{ getIconForKey(key) }}</v-icon>
                    <span class="info-label">{{ getDisplayName(key) }}</span>
                </v-card-title>
                <v-card-text>
                    <div class="info-value">{{ value }}</div>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>

<style scoped>
.device-info {
    padding: 16px;
    height: calc(100vh - 160px);
    overflow-y: auto;
}

.loading-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    align-items: stretch;
}

.info-icon {
    margin-right: 12px;
    font-size: 24px;
}

.info-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--v-text-primary);
    margin-bottom: 4px;
}

.info-value {
    font-size: 1rem;
    color: var(--v-text-secondary);
    word-break: break-word;
    line-height: 1.4;
}

/* 适配暗色主题 */
:deep(.v-theme--dark) .v-card {
    background-color: var(--v-surface-variant-dark);
}

/* 响应式调整 */
@media (max-width: 600px) {
    .info-grid {
        grid-template-columns: 1fr;
    }

    .device-info {
        padding: 12px;
    }

    .v-card {
        margin-bottom: 8px;
    }
}
</style>
