import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), dir: __dirname })
})

app.all('/api/debug', (req, res) => {
  const distPath = join(__dirname, '..', 'dist')
  res.json({
    cwd: process.cwd(),
    dirname: __dirname,
    distPath,
    distExists: fs.existsSync(distPath),
    distContents: fs.existsSync(distPath) ? fs.readdirSync(distPath) : 'N/A',
    port: process.env.PORT,
    node: process.version,
  })
})

// Serve built frontend in production
const distPath = join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
    res.sendFile(join(distPath, 'index.html'))
  })
  console.log('Static files serving from', distPath)
} else {
  console.log('dist/ not found at', distPath, ', static serving disabled')
}

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
