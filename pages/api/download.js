export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Use POST to download an image.' })
  }

  const { photoId, downloadLocation, imageUrl } = req.body || {}
  if (typeof photoId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(photoId)) {
    return res.status(400).json({ error: 'That photo could not be identified.' })
  }

  let trackingUrl
  let sourceUrl
  try {
    trackingUrl = new URL(downloadLocation)
    sourceUrl = new URL(imageUrl)
  } catch {
    return res.status(400).json({ error: 'This image does not have a valid download link.' })
  }

  if (trackingUrl.protocol !== 'https:' || trackingUrl.hostname !== 'api.unsplash.com' || trackingUrl.pathname !== `/photos/${photoId}/download`) {
    return res.status(400).json({ error: 'This image does not have a valid Unsplash download link.' })
  }
  if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'images.unsplash.com') {
    return res.status(400).json({ error: 'This image source is not supported.' })
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return res.status(500).json({ error: 'Image downloads are not configured yet.' })

  try {
    const trackingResponse = await fetch(trackingUrl, {
      headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
    })
    if (!trackingResponse.ok) {
      return res.status(502).json({ error: 'Unsplash could not prepare this image. Please try again.' })
    }

    const imageResponse = await fetch(sourceUrl)
    if (!imageResponse.ok) {
      return res.status(502).json({ error: 'The full-resolution image could not be downloaded.' })
    }

    const contentType = (imageResponse.headers.get('content-type') || 'image/jpeg').split(';')[0]
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const extension = extensions[contentType]
    if (!extension) return res.status(415).json({ error: 'This image format is not supported for download.' })

    const bytes = Buffer.from(await imageResponse.arrayBuffer())
    if (bytes.length > 30 * 1024 * 1024) return res.status(413).json({ error: 'This image is too large to download here.' })

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', String(bytes.length))
    res.setHeader('Content-Disposition', `attachment; filename="frame-${photoId}.${extension}"`)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(bytes)
  } catch {
    return res.status(502).json({ error: 'Could not reach the image service. Check your connection and try again.' })
  }
}