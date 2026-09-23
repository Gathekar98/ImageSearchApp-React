export default async function handler(req, res) {
  const { query, page = '1', orientation = '' } = req.query
  const cleanQuery = typeof query === 'string' ? query.trim() : ''
  const parsedPage = Number.parseInt(page, 10)
  const allowedOrientations = new Set(['', 'landscape', 'portrait', 'squarish'])

  if (!cleanQuery) return res.status(400).json({ error: 'Enter a subject to search for.' })
  if (cleanQuery.length > 120) return res.status(400).json({ error: 'Search terms must be 120 characters or fewer.' })
  if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > 50) {
    return res.status(400).json({ error: 'That results page is not available.' })
  }
  if (typeof orientation !== 'string' || !allowedOrientations.has(orientation)) {
    return res.status(400).json({ error: 'Choose a valid image orientation.' })
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return res.status(500).json({ error: 'Image search is not configured yet.' })

  const params = new URLSearchParams({ query: cleanQuery, page: String(parsedPage), per_page: '12', client_id: accessKey })
  if (orientation) params.set('orientation', orientation)

  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`)
    const data = await response.json()
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502
      return res.status(status).json({ error: response.status === 429 ? 'Image search is busy. Please try again in a moment.' : 'Image search could not complete. Please try again.' })
    }
    return res.status(200).json({ results: data.results || [], total: data.total || 0, total_pages: data.total_pages || 1 })
  } catch {
    return res.status(502).json({ error: 'Could not reach image search. Check your connection and try again.' })
  }
}
