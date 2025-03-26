import { useState, useEffect } from 'react'
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'


export default function Home() {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem('searchHistory')) || [])
    setFavorites(JSON.parse(localStorage.getItem('favorites')) || [])
  }, [])

  useEffect(() => {
    if (query) {
      searchImages()
    }
  }, [page])

  const searchImages = async (e) => {
    if (e) e.preventDefault()
    if (!query) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/search?query=${query}&page=${page}`)
      const data = await res.json()
      setImages(data.results)
      const newHistory = [...new Set([query, ...history])].slice(0, 5)
      setHistory(newHistory)
      localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    } catch (err) {
      setError('Failed to fetch images. Try again.')
    }
    setLoading(false)
  }
  const removeFromHistory = (itemToRemove) => {
    const updated = history.filter((item) => item !== itemToRemove)
    setHistory(updated)
    localStorage.setItem('searchHistory', JSON.stringify(updated))
  }
  
  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('searchHistory')
  }
  

  const toggleFavorite = (image) => {
    const isFav = favorites.find((f) => f.id === image.id)
    let updated
    if (isFav) {
      updated = favorites.filter((f) => f.id !== image.id)
    } else {
      updated = [...favorites, image]
    }
    setFavorites(updated)
    localStorage.setItem('favorites', JSON.stringify(updated))
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Image Search</h1>

      <form onSubmit={searchImages} className="flex justify-center gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for images..."
          className="p-2 w-72 rounded border"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Search
        </button>
      </form>
      {history.length > 0 && (
        <div className="mb-6 text-center">
          <h2 className="font-semibold mb-2">Recent Searches:</h2>
          
          <div className="flex justify-center gap-2 flex-wrap mb-2">
            {history.map((item, i) => (
              <div
              key={i}
              className="border p-2 rounded-full relative w-fit hover:bg-pink-100"
            >
              <button
                onClick={() => {
                  setQuery(item)
                  setPage(1)
                }}
                className="pr-3"
              >
                {item}
              </button>
            
              <button
                onClick={() => removeFromHistory(item)}
                className="absolute top-0 right-0 bg-white border border-gray-400 rounded-full w-5 h-5 flex items-center justify-center text-xs text-black-600 shadow -translate-y-1 translate-x-1"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
            
            ))}
          </div>

          <button
            onClick={clearHistory}
            className="text-sm text-blue-600 hover:underline mt-1"
          >
            Clear All Search History
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 border-solid"></div>
        </div>
      )}
      {error && <p className="text-center text-red-500">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img) => (
          <div key={img.id} className="relative rounded overflow-hidden shadow-lg">
            <img
              src={img.urls.small}
              alt={img.alt_description}
              className="w-full object-cover h-60"
              loading="lazy"
            />
            <button
              onClick={() => toggleFavorite(img)}
              className="absolute top-2 right-2 bg-white p-1 rounded-full shadow"
            >
              {favorites.find((f) => f.id === img.id) ? (
                <HeartSolid className="h-6 w-6 text-red-500" />
              ) : (
                <HeartOutline className="h-6 w-6 text-gray-500" />
              )}
            </button>
          </div>
        ))}
      </div>

      {images.length > 0 && (
        <div className="mt-8 flex justify-center gap-4">
          <button
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            ⬅️ Prev
          </button>
          <span className="px-4 py-2">Page {page}</span>
          <button
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            onClick={() => setPage((prev) => prev + 1)}
          >
            ➡️ Next
          </button>
        </div>
      )}

      {favorites.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">❤️ Your Favorites</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {favorites.map((img) => (
              <div key={img.id} className="rounded overflow-hidden shadow-md">
                <img src={img.urls.small} alt={img.alt_description} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}