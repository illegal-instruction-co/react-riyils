export function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) && !/MSStream/.test(ua)
}
