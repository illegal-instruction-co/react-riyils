const { useState, useEffect, useRef } = React
const { createRoot } = ReactDOM
const { RiyilsCarousel, RiyilsViewer, RiyilsExplore, PlaybackControllerProvider } = globalThis.window.ReactRiyils || {}

const TEXT = {
    brand: 'React Riyils',
    tagline: 'Predictable Videos For The Web',
    heroTitleA: 'Riyils for the',
    heroTitleB: 'Modern Web',
    heroSubtitle: 'Deterministic playback for vertical video feeds.',
    github: 'https://github.com/illegal-instruction-co/react-riyils',
    stats: [
        { v: '2KB', l: 'Gzipped' },
        { v: '100%', l: 'TypeScript' },
        { v: 'MIT', l: 'License' }
    ]
}

const BASE_VIDEOS = [
    { id: '1', videoUrl: 'assets/1.mp4', caption: 'Exploring the beauty of the sea 🌊. This is a very beautiful video that captures the essence of nature and its wonders. I hope you enjoy it as much as I did filming it! #nature #sea #beauty #riyils' },
    { id: '2', videoUrl: 'assets/2.mp4' },
    { id: '3', videoUrl: 'assets/3.mp4' },
    { id: '4', videoUrl: 'assets/4.mp4' },
    { id: '5', videoUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' },
    { id: '6', videoUrl: 'https://canal.mediaserver.com.co/live/buenisimatv.m3u8' },
    { id: '7', videoUrl: 'https://live.143b.ch/cam/flux/ts:abr.m3u8' },
    { id: '8', videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
]

function getMockVideos() {
    return BASE_VIDEOS.map(x => ({
        ...x,
        id: Math.random().toString(36).slice(2)
    }))
}

function getNetworkStatus() {
    if (!navigator.onLine) return "Offline";
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        if (conn.effectiveType) {
            const et = conn.effectiveType;
            if (et === '4g') return '4G (High Speed)';
            if (et === '3g') return '3G (Medium)';
            if (et === '2g') return '2G (Slow)';
            if (et === 'slow-2g') return 'Slow 2G';
            return et.toUpperCase();
        }
        if (conn.type) {
            return conn.type.charAt(0).toUpperCase() + conn.type.slice(1);
        }
    }
    return 'Connected';
}


function App() {
    const [videos, setVideos] = useState(BASE_VIDEOS)
    const [index, setIndex] = useState(0)
    const [viewer, setViewer] = useState(false)
    const loading = useRef(false)
    const [liked, setLiked] = useState(false)
    const [pkg, setPkg] = useState(null)
    const [copied, setCopied] = useState(false)
    const [selectedFeature, setSelectedFeature] = useState('carousel')
    const [network, setNetwork] = useState(() => getNetworkStatus())

    useEffect(() => {
        const update = () => setNetwork(getNetworkStatus())
        globalThis.addEventListener('online', update)
        globalThis.addEventListener('offline', update)
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            conn.addEventListener('change', update)
        }
        return () => {
            globalThis.removeEventListener('online', update)
            globalThis.removeEventListener('offline', update)
            if (conn) {
                conn.removeEventListener('change', update)
            }
        }
    }, [])

    useEffect(() => {
        fetch('package.json')
            .then(res => res.json())
            .then(setPkg)
            .catch(e => console.error('Error loading package.json:', e))
    }, [])

    const copyInstall = () => {
        navigator.clipboard.writeText('npm install react-riyils')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const FEATURES = {
        carousel: {
            title: 'Carousel',
            description: 'Snap-scrolling vertical feed with seamless autoplay management.',
            code: `<RiyilsCarousel\n  videos={videos}\n  currentIndex={index}\n  onVideoChange={setIndex}\n  enableAutoAdvance\n/>`
        },
        viewer: {
            title: 'Viewer',
            description: 'Fullscreen immersive experience with gestures and custom controls.',
            code: `<RiyilsViewer\n  videos={videos}\n  initialIndex={index}\n  onClose={() => setViewer(false)}\n  controls={viewerControls}\n/>`
        },
        explore: {
            title: 'Explore',
            description: 'Grid-based discovery with hover previews and contextual grouping.',
            code: `<RiyilsExplore\n  items={exploreItems}\n/>`
        }
    }

    const exploreItems = React.useMemo(() => {
        return Array.from({ length: 12 }).map((_, i) => ({
            id: `explore-${i}`,
            videoUrl: BASE_VIDEOS[i % BASE_VIDEOS.length].videoUrl,
            videos: getMockVideos().sort(() => Math.random() - 0.5)
        }))
    }, [])

    useEffect(() => {
        if (loading.current) return
        if (index >= videos.length - 2) {
            loading.current = true
            setTimeout(() => {
                setVideos(v => v.concat(getMockVideos()))
                loading.current = false
            }, 700)
        }
    }, [index, videos.length])

    const viewerControls = [
        {
            id: 'like',
            icon: (
                <i
                    className={`fa-${liked ? 'solid' : 'regular'} fa-heart`}
                    style={{
                        fontSize: 20,
                        color: liked ? '#ef4444' : 'white'
                    }}
                />
            ),
            ariaLabel: liked ? 'Unlike' : 'Like',
            onClick: () => {
                setLiked(v => !v)
                alert(liked ? 'You unliked this video.' : 'You liked this video!')
            },
            active: () => liked,
            className: 'react-riyils-viewer__btn-like'
        }
    ]

    return (
        <PlaybackControllerProvider>
            <div className="app">
                <header className="container">
                    <nav className="nav" aria-label="Primary">
                        <div className="brand" aria-label={TEXT.brand}>
                            <div className="brandMark" aria-hidden="true">
                                <i className="fa-solid fa-play"></i>
                            </div>
                            <span className="brandName">{TEXT.brand}</span>
                        </div>

                        <div className="navRight">
                            <a className="iconBtn" href="./docs/setup.md" aria-label="Documentation" title="View Docs">
                                <i className="fa-solid fa-book"></i>
                            </a>
                            <a className="iconBtn" href={TEXT.github} aria-label="GitHub" target="_blank" rel="noreferrer" title="GitHub">
                                <i className="fa-brands fa-github"></i>
                            </a>
                        </div>
                    </nav>
                </header>

                <main className="main">
                    <section className="container hero">
                        <div className="heroInner fadeUp">
                            <div>
                                <div className="badge" role="note" aria-label={TEXT.tagline}>
                                    <span className="badgeDot" aria-hidden="true"></span>
                                    <span className="badgeText">{TEXT.tagline}</span>
                                </div>

                                <h1 className="h1">
                                    {TEXT.heroTitleA}
                                    <br />
                                    <span className="gradientText">{TEXT.heroTitleB}</span>
                                </h1>

                                <p className="sub">{TEXT.heroSubtitle}</p>

                                <div className="installWrap">
                                    <button className="installBtn" onClick={copyInstall} aria-label="Copy install command">
                                        <code className="mono">npm install react-riyils</code>
                                        <div className="installIcon">
                                            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                                        </div>
                                    </button>
                                    <div className={`installFeedback ${copied ? 'show' : ''}`}>Copied to clipboard!</div>
                                </div>
                            </div>

                            <aside className="heroSide" aria-label="Status">
                                <div className="panelRow">
                                    <div className="panelKey">Network</div>
                                    <div className="panelVal">{network}</div>
                                </div>
                                <div className="panelRow">
                                    <div className="panelKey">Autoplay</div>
                                    <div className="panelVal">{globalThis.window !== undefined && globalThis.window.HTMLMediaElement && typeof globalThis.window.HTMLMediaElement.prototype.play === 'function' ? "Allowed" : "Blocked"}</div>
                                </div>
                                <div className="panelRow">
                                    <div className="panelKey">Buffered</div>
                                    <div className="panelVal">{videos.length - index - 1} ahead</div>
                                </div>
                            </aside>
                        </div>
                    </section>

                    <div className="container stage" aria-label="Demo">
                        <div className="stageGlow" aria-hidden="true"></div>
                        <div className="viewerWrap">
                            <div className="hud" aria-hidden="true">
                                <span className="hudDot"></span>
                                <span className="hudText">
                                    {(() => {
                                        const autoplay = (globalThis.window?.HTMLMediaElement?.prototype?.play) ? "Allowed" : "Blocked";
                                        return `Network: ${network} · Autoplay: ${autoplay}`;
                                    })()}
                                </span>
                            </div>

                            <div className="hudRight" aria-hidden="true">
                                {`Buffered: ${videos.length - index - 1} ahead`}
                            </div>

                            <div className="frameInner">
                                <RiyilsCarousel
                                    videos={videos}
                                    currentIndex={index}
                                    onVideoChange={setIndex}
                                    onVideoClick={() => setViewer(true)}
                                    enableAutoAdvance
                                />
                            </div>

                        </div>

                        <div className="stats" aria-label="Stats">
                            {TEXT.stats.map(s => (
                                <div className="stat" key={s.l}>
                                    <div className="statV">{s.v}</div>
                                    <div className="statL">{s.l}</div>
                                </div>
                            ))}
                        </div>

                        {viewer && (
                            <dialog className="viewerOverlay" aria-modal="true">
                                <RiyilsViewer
                                    key={`viewer-${videos[index].id}`}
                                    videos={videos}
                                    initialIndex={index}
                                    onVideoChange={setIndex}
                                    onClose={() => setViewer(false)}
                                    enableAutoAdvance
                                    controls={viewerControls}
                                />
                            </dialog>
                        )}
                    </div>

                    <section className="container featuresSection">
                        <div className="featuresGrid">
                            <div className="featuresText">
                                <h2 className="h2">Build faster with <span className="gradientText">ready-made</span> components</h2>
                                <p className="p">React Riyils provides a high-level API to build complex video experiences without worrying about the underlying media logic.</p>

                                <div className="featureList">
                                    {Object.entries(FEATURES).map(([key, f]) => (
                                        <button
                                            key={key}
                                            className={`featureItem ${selectedFeature === key ? 'active' : ''}`}
                                            onClick={() => setSelectedFeature(key)}
                                        >
                                            <div className="featureDot"></div>
                                            <div className="featureContent">
                                                <div className="featureTitle">{f.title}</div>
                                                <div className="featureDesc">{f.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="codePreview">
                                <div className="codeHeader">
                                    <div className="codeDots">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <div className="codeTab">{FEATURES[selectedFeature].title}.jsx</div>
                                </div>
                                <div className="codeBody">
                                    <pre className="mono">
                                        {FEATURES[selectedFeature].code}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="stateInspector">
                        <div className="inspectorLabel">Runtime State</div>
                        <div className="inspectorRow">
                            <span className="inspectorKey">Active Index</span>
                            <span className="inspectorVal">{index}</span>
                        </div>
                        <div className="inspectorRow">
                            <span className="inspectorKey">Viewer Active</span>
                            <span className="inspectorVal">{viewer ? 'YES' : 'NO'}</span>
                        </div>
                    </div>
                </main>

                <section className="container" style={{ marginBottom: 60 }}>
                    <h2 className="h1" style={{ fontSize: '32px', marginBottom: '24px' }}>Explore</h2>
                    <RiyilsExplore items={exploreItems} />
                </section>

                <footer className="footer">
                    {pkg ? (
                        `${pkg.license} Licensed · React ${pkg.peerDependencies.react.match(/\d+/)} · Swiper ${pkg.dependencies.swiper.match(/\d+/)} · Built in public`
                    ) : (
                        'MIT Licensed · React · Swiper · Built in public'
                    )}
                </footer>
            </div>
        </PlaybackControllerProvider>
    )
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)
