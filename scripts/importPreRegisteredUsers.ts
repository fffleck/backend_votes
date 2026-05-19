import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { spawnSync } from "child_process"
import { randomUUID } from "crypto"
import path from "path"

type ImportRow = {
  name: string
  cpf: string
  email: string
  source: string
}

const prisma = new PrismaClient()

const PDF_FILE = path.join(
  __dirname,
  "..",
  "tmp",
  "Relatório de aptos a votar na eleição - 12.05.2026 - Gestão 2026-2029.pdf"
)

const XLSX_FILE = path.join(
  __dirname,
  "..",
  "tmp",
  "ATUALIZAÇÃO CADASTRO - PLATAFORMA ELEIÇÕES.xlsx"
)

const dryRun = process.argv.includes("--dry-run")
const statuses = ["APOSENTADO", "ASSOCIADO", "PG_2025", "PG_2026"]

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  })

  if (result.stdout) return result.stdout

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} falhou: ${result.stderr || `status ${result.status}`}`)
  }

  return ""
}

function normalizeCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "")
}

function normalizeEmail(email: string) {
  return String(email || "").trim().replace(/[;,]+$/g, "").toLowerCase()
}

function cleanName(name: string) {
  return String(name || "").replace(/\s+/g, " ").trim()
}

function xmlDecode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
}

function parseSharedStrings(xml: string) {
  const strings: string[] = []
  const matches = xml.matchAll(/<si>([\s\S]*?)<\/si>/g)

  for (const match of matches) {
    const textParts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    strings.push(xmlDecode(textParts.map(part => part[1]).join("")))
  }

  return strings
}

function parseXlsxRows() {
  const sharedStringsXml = runCommand("unzip", ["-p", XLSX_FILE, "xl/sharedStrings.xml"])
  const sheetXml = runCommand("unzip", ["-p", XLSX_FILE, "xl/worksheets/sheet1.xml"])
  const sharedStrings = parseSharedStrings(sharedStringsXml)
  const rows: ImportRow[] = []

  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Record<string, string> = {}

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1]
      const cellBody = cellMatch[2]
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1]
      if (!ref) continue

      const rawValue = cellBody.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      if (!rawValue) continue

      row[ref] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] || "" : rawValue
    }

    const name = cleanName(row.B)
    const cpf = normalizeCpf(row.C)
    const email = normalizeEmail(row.D)

    if (name && cpf.length === 11 && email.includes("@")) {
      rows.push({ name, cpf, email, source: "xlsx" })
    }
  }

  return rows
}

function isNoiseLine(line: string) {
  const normalized = line.trim()
  if (!normalized) return true

  return [
    /^SINDICATO DOS JORNALISTAS/i,
    /^17\.444\.951/,
    /^RELATÓRIO DE APTOS/i,
    /^Emissor:/i,
    /^SEM VINCULO/i,
    /^NOME CPF E-MAIL SITUAÇÃO/i,
    /^AVENIDA ALVARES CABRAL/i,
    /^Pagina \d+ de \d+/i,
    /^Total de aptos:/i,
    /^SITUAÇÃO TOTAL/i,
    /^TOTAL GERAL/i,
    /^APOSENTADO\s+\d+$/i,
    /^ASSOCIADO\s+\d+$/i,
    /^PG_2025\s+\d+$/i,
    /^PG_2026\s+\d+$/i
  ].some(pattern => pattern.test(normalized))
}

function parsePdfRecord(chunk: string): ImportRow | null {
  const normalizedChunk = chunk.replace(/\s+/g, " ").trim()
  const statusPattern = new RegExp(`\\b(${statuses.join("|")})\\b`, "i")
  const withoutStatus = normalizedChunk.replace(statusPattern, " ").replace(/\s+/g, " ").trim()

  const cpfMatch =
    withoutStatus.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/) ||
    withoutStatus.match(/\d{3}\.\d{3}\.\d{3}-\s*\d{2}/)

  if (!cpfMatch || cpfMatch.index === undefined) return null

  const cpf = normalizeCpf(cpfMatch[0])
  if (cpf.length !== 11 || cpf === "00000000000") return null

  const afterCpf = withoutStatus.slice(cpfMatch.index + cpfMatch[0].length)
  const emailMatch = afterCpf.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/i)
  if (!emailMatch) return null

  const name = cleanName(withoutStatus.slice(0, cpfMatch.index))
  const email = normalizeEmail(emailMatch[0])
  if (!name || !email.includes("@")) return null

  return { name, cpf, email, source: "pdf" }
}

function parsePdfRows() {
  const rawText = runCommand("pdftotext", ["-raw", PDF_FILE, "-"])
  const rows: ImportRow[] = []
  let chunk = ""

  for (const line of rawText.split(/\r?\n/)) {
    if (isNoiseLine(line)) continue

    chunk = `${chunk}\n${line.trim()}`.trim()

    if (statuses.some(status => new RegExp(`\\b${status}\\b`, "i").test(line))) {
      const row = parsePdfRecord(chunk)
      if (row) rows.push(row)
      chunk = ""
    }
  }

  return rows
}

function mergeRows(rows: ImportRow[]) {
  const merged = new Map<string, ImportRow>()

  for (const row of rows) {
    const current = merged.get(row.cpf)

    if (!current) {
      merged.set(row.cpf, row)
      continue
    }

    const next = {
      ...current,
      name: row.name.length > current.name.length ? row.name : current.name,
      email: row.email || current.email,
      source: current.source.includes(row.source) ? current.source : `${current.source},${row.source}`
    }

    merged.set(row.cpf, next)
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

async function importRows(rows: ImportRow[]) {
  let created = 0
  let updated = 0

  for (const row of rows) {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "PreRegisteredUser" WHERE cpf = ${row.cpf} LIMIT 1
    `

    if (existing.length > 0) {
      await prisma.$executeRaw`
        UPDATE "PreRegisteredUser"
        SET name = ${row.name},
            email = ${row.email},
            status = 'apto',
            "updatedAt" = NOW()
        WHERE cpf = ${row.cpf}
      `
      updated++
      continue
    }

    await prisma.$executeRaw`
      INSERT INTO "PreRegisteredUser" (id, name, email, cpf, status, "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${row.name}, ${row.email}, ${row.cpf}, 'apto', NOW(), NOW())
    `
    created++
  }

  return { created, updated }
}

async function main() {
  const pdfRows = parsePdfRows()
  const xlsxRows = parseXlsxRows()
  const rows = mergeRows([...pdfRows, ...xlsxRows])

  console.log(`PDF: ${pdfRows.length} registros válidos extraídos`)
  console.log(`XLSX: ${xlsxRows.length} registros válidos extraídos`)
  console.log(`Total sem duplicar CPF: ${rows.length}`)

  if (dryRun) {
    console.log("Modo dry-run: nenhum dado foi inserido ou atualizado.")
    console.table(rows.slice(0, 10).map(row => ({
      name: row.name,
      cpf: row.cpf,
      email: row.email,
      source: row.source
    })))
    return
  }

  const result = await importRows(rows)
  console.log(`Importação concluída: ${result.created} criados, ${result.updated} atualizados.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
