"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
//app.use(cors({
//  origin: [
//    "http://localhost:5173",
//    "http://localhost:3000",
//    "https://votacao-minas.vercel.app"
//  ],
//  credentials: true
//}))
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.get("/", (req, res) => {
    res.json({
        status: "online",
        message: "API funcionando"
    });
});
const uploadsDir = path_1.default.join(__dirname, "..", "uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const downloadsDir = path_1.default.join(__dirname, "..", "public", "downloads");
if (!fs_1.default.existsSync(downloadsDir)) {
    fs_1.default.mkdirSync(downloadsDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cb(null, unique + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/"))
            cb(null, true);
        else
            cb(new Error("Apenas imagens são permitidas"));
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static(uploadsDir));
app.use("/downloads", express_1.default.static(downloadsDir));
app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
    return res.json({ url: `/uploads/${req.file.filename}` });
});
app.use("/api", routes_1.default);
exports.default = app;
