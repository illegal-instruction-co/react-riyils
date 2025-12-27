const videoPool = new Map<string, HTMLVideoElement>()

export const VideoElementPool = {
    get(id: string): HTMLVideoElement {
        if (!videoPool.has(id)) {
            const video = document.createElement('video')
            video.setAttribute('playsinline', '')
            video.setAttribute('webkit-playsinline', '')
            video.muted = true
            video.loop = true
            videoPool.set(id, video)
        }
        return videoPool.get(id)!
    },

    move(id: string, container: HTMLElement, className: string) {
        const video = this.get(id)

        if (container.contains(video) && video.className === className) return video

        video.className = className

        container.appendChild(video)

        return video
    },
}