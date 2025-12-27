import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSnapScrollOptions {
    axis: 'x' | 'y'
    itemSize: number
    onIndexChange?: (index: number) => void
}

export function useSnapScroll({ axis, onIndexChange }: UseSnapScrollOptions) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)

    // Drag State
    const isDown = useRef(false)
    const startX = useRef(0)
    const startY = useRef(0)
    const scrollLeft = useRef(0)
    const scrollTop = useRef(0)
    const isDragging = useRef(false) // Tıklama ile sürüklemeyi ayırt etmek için

    const scrollTimeoutRef = useRef<number | null>(null)

    // --- Scroll Handler (Index Hesaplama) ---
    const handleScroll = useCallback(() => {
        const container = containerRef.current
        if (!container) return

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
        }

        // Scroll bittiğinde (debounce) index hesapla
        scrollTimeoutRef.current = globalThis.window.setTimeout(() => {
            const scrollPos = axis === 'x' ? container.scrollLeft : container.scrollTop
            const size = axis === 'x' ? container.clientWidth : container.clientHeight

            // Sıfıra bölünme hatasını önle
            if (size === 0) return

            const newIndex = Math.round(scrollPos / size)

            if (newIndex !== activeIndex) {
                setActiveIndex(newIndex)
                onIndexChange?.(newIndex)
            }
        }, 50)
    }, [activeIndex, axis, onIndexChange])

    // --- Programatik Scroll ---
    const scrollTo = useCallback((index: number, smooth = true) => {
        const container = containerRef.current
        if (!container) return

        const size = axis === 'x' ? container.clientWidth : container.clientHeight
        const target = index * size

        container.scrollTo({
            [axis === 'x' ? 'left' : 'top']: target,
            behavior: smooth ? 'smooth' : 'auto'
        })

        setActiveIndex(index)
    }, [axis])

    // --- Mouse Drag Events ---
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onMouseDown = (e: MouseEvent) => {
            isDown.current = true
            isDragging.current = false
            container.style.cursor = 'grabbing'

            // Snap özelliğini kapat ki rahat sürüklensin
            container.style.scrollSnapType = 'none'
            container.style.userSelect = 'none'

            startX.current = e.pageX - container.offsetLeft
            startY.current = e.pageY - container.offsetTop
            scrollLeft.current = container.scrollLeft
            scrollTop.current = container.scrollTop
        }

        const onMouseLeave = () => {
            if (!isDown.current) return
            isDown.current = false
            container.style.cursor = 'grab'
            container.style.scrollSnapType = axis === 'x' ? 'x mandatory' : 'y mandatory'
            container.style.removeProperty('user-select')
        }

        const onMouseUp = () => {
            if (!isDown.current) return
            isDown.current = false
            container.style.cursor = 'grab'

            // Snap'i geri aç, tarayıcı en yakın slayta kayar
            container.style.scrollSnapType = axis === 'x' ? 'x mandatory' : 'y mandatory'
            container.style.removeProperty('user-select')

            // Eğer hiç sürüklenmediyse click sayılır, sürüklendiyse eventleri durdurabiliriz
            setTimeout(() => { isDragging.current = false }, 0)
        }

        const onMouseMove = (e: MouseEvent) => {
            if (!isDown.current) return

            e.preventDefault()
            const x = e.pageX - container.offsetLeft
            const y = e.pageY - container.offsetTop

            // Hareket miktarını hesapla
            const walkX = (x - startX.current) * 1.5 // Hız çarpanı
            const walkY = (y - startY.current) * 1.5

            // Küçük titremeleri sürükleme sayma (Threshold: 5px)
            if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) {
                isDragging.current = true
            }

            if (axis === 'x') {
                container.scrollLeft = scrollLeft.current - walkX
            } else {
                container.scrollTop = scrollTop.current - walkY
            }
        }

        // Listener'ları ekle
        container.addEventListener('scroll', handleScroll, { passive: true })
        container.addEventListener('mousedown', onMouseDown)
        container.addEventListener('mouseleave', onMouseLeave)
        container.addEventListener('mouseup', onMouseUp)
        container.addEventListener('mousemove', onMouseMove)

        return () => {
            container.removeEventListener('scroll', handleScroll)
            container.removeEventListener('mousedown', onMouseDown)
            container.removeEventListener('mouseleave', onMouseLeave)
            container.removeEventListener('mouseup', onMouseUp)
            container.removeEventListener('mousemove', onMouseMove)
        }
    }, [handleScroll, axis])

    return {
        containerRef,
        activeIndex,
        scrollTo,
        isDragging // Tıklama olaylarında kontrol etmek için dışarı açıyoruz
    }
}