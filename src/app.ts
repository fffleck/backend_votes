import express from "express"
import cors from "cors"
import path from "path"
import fs from "fs"
import multer from "multer"
import routes from "./routes"

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

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    cb(null, unique + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true)
    else cb(new Error("Apenas imagens são permitidas"))
  }
})

app.use(cors())
app.use(express.json())
app.use("/uploads", express.static(uploadsDir))

app.post("/api/upload", upload.single("file"), (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" })
  return res.json({ url: `/uploads/${req.file.filename}` })
})

app.use("/api", routes)

export default app
