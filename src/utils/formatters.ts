export function formatSize(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(2)} ${units[i]}`;
}

export function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

export function formatSpeed(bytesPerSecond: number): string {
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    let i = 0;
    while (bytesPerSecond >= 1024 && i < units.length - 1) {
        bytesPerSecond /= 1024;
        i++;
    }
    return `${bytesPerSecond.toFixed(2)} ${units[i]}`;
}
