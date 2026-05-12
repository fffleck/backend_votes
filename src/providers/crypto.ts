import crypto from "crypto"

const ALGORITHM = "aes-256-cbc"
const SECRET = crypto
  .createHash("sha256")
  .update(String(process.env.JWT_SECRET))
  .digest("base64")
  .substring(0, 32)

export function encrypt(text: string) {

  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(ALGORITHM, SECRET, iv)

  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])

  return iv.toString("hex") + ":" + encrypted.toString("hex")
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const encryptedBuffer = Buffer.from(encryptedHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET, iv)
  let decrypted = decipher.update(encryptedBuffer)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

export function hash(data: string) {
  return crypto.createHash("sha256").update(data).digest("hex")
}