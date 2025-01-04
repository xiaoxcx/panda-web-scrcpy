<script setup>
import { ref, computed, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import { useDisplay } from 'vuetify';
import PairedDevices from '../components/Device/PairedDevices.vue';
import DeviceShell from '../components/Device/DeviceShell.vue';
import DeviceLogcat from '../components/Device/DeviceLogcat.vue';
import DeviceInstall from '../components/Device/DeviceInstall.vue';
import DeviceInfo from '../components/Device/DeviceInfo.vue';
import AbstractList from './AbstractList.vue';
import VideoContainer from '../components/Device/VideoContainer.vue';
import NavigationBar from '../components/Device/NavigationBar.vue';
import state from '../components/Scrcpy/scrcpy-state';

const props = defineProps({
    roomName: {
        type: String,
        required: true,
        default: 'default-room',
    },
    currentUser: {
        type: Object,
        required: true,
        default: () => ({
            id: 'default-user',
            name: 'Default User',
        }),
    },
});

const { width } = useDisplay();
const showRightPanel = computed(() => width.value >= 960);

const containerSize = ref({ width: 0, height: 0 });
const userSetLeftPanelWidth = ref(560);
const leftPanelWidth = computed(() => {
    if (!showRightPanel.value) {
        return width.value;
    }
    return userSetLeftPanelWidth.value;
});

const rightPanelWidth = computed(() =>
    Math.max(300, containerSize.value.width - leftPanelWidth.value - 16)
);
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);

const deviceMeta = shallowRef(undefined);
const connected = ref(false);
const tab = ref(0);

const isHorizontalLayout = computed(() => {
    return containerSize.value.width > leftPanelWidth.value + 200;
});

const handleDisconnected = () => {
    connected.value = false;
    deviceMeta.value = undefined;
};

const onPairDevice = (device) => {
    deviceMeta.value = device;
};

const handleConnectionStatus = (status) => {
    connected.value = status;
    if (!status) {
        handleDisconnected();
    }
};

const startResize = (e) => {
    if (!showRightPanel.value) return;
    isResizing.value = true;
    startX.value = e.clientX || e.touches[0].clientX;
    startWidth.value = userSetLeftPanelWidth.value;
    document.addEventListener('mousemove', resize);
    document.addEventListener('touchmove', resize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchend', stopResize);
};

const resize = (e) => {
    if (!isResizing.value) return;
    const clientX = e.clientX || e.touches[0]?.clientX;
    const diff = clientX - startX.value;
    userSetLeftPanelWidth.value = Math.max(
        300,
        Math.min(startWidth.value + diff, containerSize.value.width - 300)
    );
};

const stopResize = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('touchmove', resize);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchend', stopResize);
};

const updateContainerSize = () => {
    if (containerRef.value) {
        containerSize.value = {
            width: containerRef.value.offsetWidth,
            height: containerRef.value.offsetHeight,
        };
    }
};

const containerRef = ref(null);
const DeviceContainerRef = ref(null);
const videoWrapperRef = ref(null);

// 计算容器的实际可用空间
const containerDimensions = computed(() => {
    const horizontalPadding = 20;
    const verticalPadding = 30;
    const navBarWidth = 80;
    const borderWidth = 6; // 考虑边框宽度

    return {
        width: leftPanelWidth.value - (navBarWidth + horizontalPadding + borderWidth),
        height: containerSize.value.height - (verticalPadding * 2 + borderWidth),
    };
});

// 监听容器尺寸变化
watch(
    () => containerDimensions.value,
    (newDimensions) => {
        if (videoWrapperRef.value) {
            // 更新视频包装器的尺寸
            videoWrapperRef.value.style.width = `${newDimensions.width}px`;
            videoWrapperRef.value.style.height = `${newDimensions.height}px`;
            // 通知 state 更新视频容器
            state.updateVideoContainer();
        }
    },
    { immediate: true }
);

onMounted(() => {
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    if (videoWrapperRef.value) {
        // 设置初始尺寸
        const dimensions = containerDimensions.value;
        videoWrapperRef.value.style.width = `${dimensions.width}px`;
        videoWrapperRef.value.style.height = `${dimensions.height}px`;
    }
});

onUnmounted(() => {
    stopResize();
    window.removeEventListener('resize', updateContainerSize);
});

watch(
    () => document.fullscreenElement,
    (newValue) => {
        if (!newValue) {
            setTimeout(updateContainerSize, 100);
        }
    }
);

watch(width, (newWidth, oldWidth) => {
    if (newWidth < 960 && oldWidth >= 960) {
        userSetLeftPanelWidth.value = newWidth;
    } else if (newWidth >= 960 && oldWidth < 960) {
        userSetLeftPanelWidth.value = 450;
    }
});

const tabs = [
    { title: '基础信息', icon: 'mdi-android', component: DeviceInfo },
    { title: '应用安装', icon: 'mdi-android', component: DeviceInstall },
    { title: '终端', icon: 'mdi-console', component: DeviceShell },
    { title: 'Logcat', icon: 'mdi-android', component: DeviceLogcat },
];
</script>

<template>
    <v-app>
        <v-app-bar height="64" color="white" app>
            <v-container class="d-flex align-center justify-center pa-0" fluid>
                <v-img :src="highQA" max-width="110" max-height="24" class="mr-6 ml-10" />
                <PairedDevices
                    @pair-device="onPairDevice"
                    @update-connection-status="handleConnectionStatus"
                />
                <v-spacer />
                <v-btn
                    variant="text"
                    class="text-none"
                    style="height: 64px"
                    href="https://maxwellos.github.io/"
                    target="_blank"
                    >使用说明
                </v-btn>
            </v-container>
        </v-app-bar>

        <v-main>
            <div
                ref="containerRef"
                class="resizable-container"
                :class="{ 'horizontal-layout': isHorizontalLayout }"
            >
                <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
                    <v-card class="panel-content">
                        <v-card-text class="d-flex align-center justify-center">
                            <div v-if="connected" ref="DeviceContainerRef" class="device-container">
                                <div ref="videoWrapperRef" class="video-wrapper">
                                    <VideoContainer />
                                </div>
                                <div class="navigation-wrapper">
                                    <NavigationBar />
                                </div>
                            </div>
                            <div v-else class="d-flex align-center justify-center">
                                <div
                                    class="loading-indicator"
                                    :style="{
                                        width: leftPanelWidth / 1.2 + 'px',
                                        height: containerSize.height / 1.2 + 'px',
                                    }"
                                >
                                    <v-btn
                                        icon
                                        x-large
                                        size="60"
                                        color="primary"
                                        class="power-button mb-2"
                                    >
                                        <v-icon x-large>mdi-power</v-icon>
                                    </v-btn>
                                    <div class="text-h6">连接设备</div>
                                    <div class="text-body-2">请确保设备已开启USB调试模式</div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </div>
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
                    <v-card height="100%">
                        <template v-if="connected">
                            <v-tabs v-model="tab" color="primary" align-tabs="center" grow>
                                <v-tab v-for="(item, index) in tabs" :key="index" :value="index">
                                    <v-icon start>{{ item.icon }}</v-icon>
                                    {{ item.title }}
                                </v-tab>
                            </v-tabs>
                            <v-window v-model="tab" class="right-panel-content">
                                <v-window-item
                                    v-for="(item, index) in tabs"
                                    :key="index"
                                    :value="index"
                                >
                                    <v-card flat>
                                        <component :is="item.component" :device-meta="deviceMeta" />
                                    </v-card>
                                </v-window-item>
                            </v-window>
                        </template>
                        <template v-else>
                            <AbstractList />
                        </template>
                    </v-card>
                </div>
            </div>
        </v-main>
    </v-app>
</template>

<style lang="scss" scoped>
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

.resizable-container {
    display: flex;
    height: calc(100vh - 64px);
    overflow: hidden;

    &.horizontal-layout {
        flex-direction: row;
    }

    .left-panel {
        min-width: 200px;
        max-width: 100%;
        overflow: hidden;
        margin: 16px;

        .panel-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 16px;
        }
    }

    .right-panel {
        flex-grow: 1;
        min-width: 300px;
        margin: 16px 16px 16px 8px;
        display: flex;
        flex-direction: column;
    }

    .right-panel-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 16px;
    }

    .resizer {
        width: 8px;
        background-color: #e0e0e0;
        cursor: col-resize;
        transition: background-color 0.3s ease;

        &:hover {
            background-color: #bdbdbd;
        }
    }
}

.v-window-item {
    height: 100%;
    overflow-y: auto;
}

@media (max-width: 959px) {
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
    min-width: 0;
    min-height: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: transparent;
    border-radius: 16px;
    overflow: visible;
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
</style>
