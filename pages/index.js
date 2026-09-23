import { useEffect, useState } from 'react'
import Head from 'next/head'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const categories = ['Nature', 'Architecture', 'Interiors', 'Travel', 'Minimal', 'Portraits']
const orientations = [
  { label: 'Any shape', value: '' },
  { label: 'Landscape', value: 'landscape' },
  { label: 'Portrait', value: 'portrait' },
  { label: 'Square', value: 'squarish' },
]

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

function ImageCard({ image, saved, onToggleSave, onPreview, onDownload, downloading = false, featured = false }) {
  const photographer = image.user?.name || 'Unsplash contributor'
  const description = image.alt_description || image.description || 'Untitled photograph'

  return (
    <article className={`image-card${featured ? ' image-card-featured' : ''}`}>
      <button className="image-card-photo" onClick={() => onPreview(image)} aria-label={`Preview ${description}`}>
        <img src={image.urls?.regular || image.urls?.small} alt={description} loading="lazy" />
        <span className="image-card-expand" aria-hidden="true"><ArrowTopRightOnSquareIcon /></span>
      </button>
      <div className="image-card-info">
        <div className="image-card-caption">
          <p className="image-card-title">{description}</p>
          <p className="image-card-credit">Photo by {photographer}</p>
        </div>
        <div className="image-card-actions">
          <button className="download-button" onClick={() => onDownload(image)} disabled={downloading} aria-label={downloading ? 'Preparing image download' : 'Download full-resolution image'} title="Download full-resolution image">
            <ArrowDownTrayIcon /> <span>{downloading ? 'Saving…' : 'Download'}</span>
          </button>
          <button
            className={`save-button${saved ? ' is-saved' : ''}`}
            onClick={() => onToggleSave(image)}
            aria-label={saved ? 'Remove from saved images' : 'Save image'}
            title={saved ? 'Remove from saved' : 'Save image'}
          >
            {saved ? <CheckIcon /> : <BookmarkIcon />}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])
  const [orientation, setOrientation] = useState('')
  const [activeView, setActiveView] = useState('discover')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [ready, setReady] = useState(false)
  const [downloadingId, setDownloadingId] = useState('')
  const [downloadFeedback, setDownloadFeedback] = useState('')

  useEffect(() => {
    setHistory(readStorage('searchHistory', []))
    setFavorites(readStorage('favorites', []))
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem('favorites', JSON.stringify(favorites))
  }, [favorites, ready])

  useEffect(() => {
    if (ready) localStorage.setItem('searchHistory', JSON.stringify(history))
  }, [history, ready])

  useEffect(() => {
    if (!selectedImage) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedImage(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedImage])

  const runSearch = async (term = query, nextPage = 1, nextOrientation = orientation) => {
    const cleanTerm = term.trim()
    if (!cleanTerm) return
    setQuery(cleanTerm)
    setSearchedQuery(cleanTerm)
    setActiveView('discover')
    setPage(nextPage)
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ query: cleanTerm, page: String(nextPage) })
      if (nextOrientation) params.set('orientation', nextOrientation)
      const response = await fetch(`/api/search?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Image search is unavailable right now.')
      setImages(Array.isArray(data.results) ? data.results : [])
      setTotalPages(Math.max(1, Number(data.total_pages) || 1))
      setHistory((current) => [cleanTerm, ...current.filter((item) => item.toLowerCase() !== cleanTerm.toLowerCase())].slice(0, 6))
    } catch (err) {
      setImages([])
      setError(err.message || 'Could not load images. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (image) => {
    setFavorites((current) => current.some((item) => item.id === image.id)
      ? current.filter((item) => item.id !== image.id)
      : [image, ...current])
  }

  const downloadImage = async (image) => {
    if (!image?.links?.download_location || !image?.urls?.full || downloadingId) return
    setDownloadingId(image.id)
    setDownloadFeedback('')
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: image.id, downloadLocation: image.links.download_location, imageUrl: image.urls.full }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Could not download this image.')
      }
      const blob = await response.blob()
      const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `frame-${image.id}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setDownloadFeedback('Your image download has started.')
    } catch (err) {
      setDownloadFeedback(err.message || 'Could not download this image.')
    } finally {
      setDownloadingId('')
      window.setTimeout(() => setDownloadFeedback(''), 4500)
    }
  }

  const removeHistoryItem = (item) => setHistory((current) => current.filter((entry) => entry !== item))
  const saved = (image) => favorites.some((item) => item.id === image.id)
  const visibleImages = activeView === 'saved' ? favorites : images

  return (
    <>
      <Head>
        <title>Frame — Visual Discovery</title>
        <meta name="description" content="Discover and save beautiful photography." />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Frame home">
          <span className="brand-mark"><PhotoIcon /></span>
          <span>frame<span className="brand-period">.</span></span>
        </a>

        <p className="sidebar-label">Workspace</p>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-item${activeView === 'discover' ? ' active' : ''}`} onClick={() => setActiveView('discover')}>
            <MagnifyingGlassIcon /> <span>Discover</span>
          </button>
          <button className={`nav-item${activeView === 'saved' ? ' active' : ''}`} onClick={() => setActiveView('saved')}>
            <HeartIcon /> <span>Saved images</span><span className="nav-count">{favorites.length}</span>
          </button>
        </nav>

        {history.length > 0 && (
          <section className="sidebar-history" aria-label="Recent searches">
            <div className="sidebar-section-title"><span>Recent searches</span><ClockIcon /></div>
            {history.map((item) => (
              <div className="history-item" key={item}>
                <button onClick={() => runSearch(item)} title={`Search ${item}`}>{item}</button>
                <button className="history-remove" onClick={() => removeHistoryItem(item)} aria-label={`Remove ${item} from history`}><XMarkIcon /></button>
              </div>
            ))}
            <button className="clear-history" onClick={() => setHistory([])}>Clear history</button>
          </section>
        )}

        <div className="sidebar-bottom">
          <div className="sidebar-tip"><SparklesIcon /><p><strong>A little inspiration</strong><br />Try a mood, a place, or a color.</p></div>
          <span className="sidebar-footnote">A thoughtful place for visual discovery</span>
        </div>
      </aside>

      <main id="top" className="main-content">
        {downloadFeedback && <div className="download-feedback" role="status">{downloadFeedback}</div>}
        <header className="topbar">
          <span className="breadcrumb">Your visual library <span>/</span> {activeView === 'saved' ? 'Saved images' : 'Discover'}</span>
          <button className="topbar-saved" onClick={() => setActiveView(activeView === 'saved' ? 'discover' : 'saved')}>
            <HeartIcon /> <span>{favorites.length} saved</span>
          </button>
        </header>

        <section className={`hero${searchedQuery ? ' hero-compact' : ''}`}>
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT IDEA STARTS HERE</span>
            <h1>{activeView === 'saved' ? <>Your little<br /><em>collection.</em></> : searchedQuery ? <>Find your<br /><em>perspective.</em></> : <>Find the feeling<br />you’re <em>looking for.</em></>}</h1>
            <p>Search a world of photography. Save what speaks to you.</p>
          </div>
          <form className="search-form" onSubmit={(event) => { event.preventDefault(); runSearch(query) }}>
            <MagnifyingGlassIcon className="search-icon" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “quiet mornings” or “coastal light”" aria-label="Search photos" />
            {query && <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search"><XMarkIcon /></button>}
            <button className="search-submit" type="submit" disabled={loading || !query.trim()}>{loading ? 'Searching…' : 'Explore'}<ArrowRightIcon /></button>
          </form>
          {activeView !== 'saved' && !searchedQuery && (
            <div className="suggestions"><span>Popular paths</span>{categories.map((category) => <button key={category} onClick={() => runSearch(category)}>{category}<ArrowTopRightOnSquareIcon /></button>)}</div>
          )}
        </section>

        <section className="results-section">
          <div className="results-heading">
            <div>
              <p className="section-kicker">{activeView === 'saved' ? 'KEPT CLOSE' : searchedQuery ? 'CURATED FOR YOU' : 'A GOOD PLACE TO BEGIN'}</p>
              <h2>{activeView === 'saved' ? 'Saved images' : searchedQuery ? <>Results for <span>“{searchedQuery}”</span></> : 'Start with a subject'}</h2>
            </div>
            {activeView === 'discover' && searchedQuery && (
              <label className="orientation-select">{orientations.find((item) => item.value === orientation)?.label}<ChevronDownIcon />
                <select value={orientation} onChange={(event) => { setOrientation(event.target.value); runSearch(query, 1, event.target.value) }} aria-label="Filter image orientation">
                  {orientations.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </label>
            )}
          </div>

          {error && <div className="notice error-notice" role="alert"><span>{error}</span><button onClick={() => runSearch(query, page)}>Try again</button></div>}

          {loading ? (
            <div className="loading-state" role="status"><span className="loader" /><span>Finding something good…</span></div>
          ) : visibleImages.length > 0 ? (
            <>
              <div className="image-grid">
                {visibleImages.map((image, index) => <ImageCard key={image.id} image={image} saved={saved(image)} onToggleSave={toggleFavorite} onPreview={setSelectedImage} onDownload={downloadImage} downloading={downloadingId === image.id} featured={activeView === 'discover' && page === 1 && index === 0} />)}
              </div>
              {activeView === 'discover' && searchedQuery && totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => runSearch(query, page - 1)} disabled={page <= 1 || loading}><ArrowLeftIcon /> Previous</button>
                  <span><strong>{page}</strong><i />{totalPages}</span>
                  <button onClick={() => runSearch(query, page + 1)} disabled={page >= totalPages || loading}>Next <ArrowRightIcon /></button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">{activeView === 'saved' ? <BookmarkIcon /> : error ? <MagnifyingGlassIcon /> : <PhotoIcon />}</span>
              <h3>{activeView === 'saved' ? 'Your collection starts here' : error ? 'Let’s try that again' : searchedQuery ? 'No photos found this time' : 'What are you drawn to?'}</h3>
              <p>{activeView === 'saved' ? 'Save images as you explore and they’ll be waiting here.' : error ? 'Check your connection or try another search.' : searchedQuery ? 'Try a broader phrase or explore one of the popular paths above.' : 'Pick a popular path above, or search for a place, color, or feeling.'}</p>
              {activeView === 'saved' && <button className="text-action" onClick={() => setActiveView('discover')}>Explore photos <ArrowRightIcon /></button>}
            </div>
          )}
        </section>
        <footer className="page-footer"><span>Made for the curious eye.</span><span>Photography via Unsplash</span></footer>
      </main>

      {selectedImage && (
        <div className="preview-backdrop" role="presentation" onClick={() => setSelectedImage(null)}>
          <section className="preview-dialog" role="dialog" aria-modal="true" aria-label="Photo preview" onClick={(event) => event.stopPropagation()}>
            <button className="preview-close" onClick={() => setSelectedImage(null)} aria-label="Close preview"><XMarkIcon /></button>
            <img className="preview-image" src={selectedImage.urls?.regular || selectedImage.urls?.small} alt={selectedImage.alt_description || 'Photo preview'} />
            <div className="preview-details">
              <div><p className="image-card-title">{selectedImage.alt_description || selectedImage.description || 'Untitled photograph'}</p><p className="image-card-credit">Photo by {selectedImage.user?.name || 'Unsplash contributor'}</p></div>
              <div className="preview-actions">
                <button className="download-button preview-download" onClick={() => downloadImage(selectedImage)} disabled={downloadingId === selectedImage.id}><ArrowDownTrayIcon /><span>{downloadingId === selectedImage.id ? 'Saving…' : 'Download'}</span></button>
                <button className={`save-button${saved(selectedImage) ? ' is-saved' : ''}`} onClick={() => toggleFavorite(selectedImage)} aria-label={saved(selectedImage) ? 'Remove from saved images' : 'Save image'}>{saved(selectedImage) ? <CheckIcon /> : <BookmarkIcon />}</button>
                {selectedImage.links?.html && <a className="unsplash-link" href={selectedImage.links.html} target="_blank" rel="noreferrer">View on Unsplash <ArrowTopRightOnSquareIcon /></a>}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
    </>
  )
}