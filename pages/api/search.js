export default async function handler(req, res) {
  const { query, page = 1 } = req.query
  const accessKey = process.env.UNSPLASH_ACCESS_KEY

  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&page=${page}&per_page=9&client_id=${accessKey}`
  )

  const data = await response.json()
  res.status(200).json(data)
}