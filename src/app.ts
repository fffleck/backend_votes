import express from "express"
import cors from "cors"
import path from "path"
import fs from "fs"
import multer from "multer"
import routes from "./routes"
import { prisma } from "./config/prisma"

const app = express()

//app.use(cors({
//  origin: [
//    "http://localhost:5173",
//    "http://localhost:3000",
//    "https://votacao-minas.vercel.app"
//  ],
//  credentials: true
//}))

app.use(cors({
  origin: true,
  credentials: true
}))


app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "API funcionando"
  })
})

const uploadsDir = path.join(__dirname, "..", "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const downloadsDir = path.join(__dirname, "..", "public", "downloads")
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true })
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true)
    else cb(new Error("Apenas imagens são permitidas"))
  }
})

app.use(cors())
app.use(express.json())
app.use("/uploads", express.static(uploadsDir))
app.use("/downloads", express.static(downloadsDir))

app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" })
  const image = await prisma.storedImage.create({
    data: { data: req.file.buffer, mimeType: req.file.mimetype }
  })
  return res.json({ url: `/api/images/${image.id}` })
})

app.get("/api/images/:id", async (req, res) => {
  const image = await prisma.storedImage.findUnique({ where: { id: req.params.id } })
  if (!image) return res.status(404).json({ error: "Imagem não encontrada" })
  res.setHeader("Content-Type", image.mimeType)
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
  return res.send(image.data)
})

app.use("/api", routes)

export default app
