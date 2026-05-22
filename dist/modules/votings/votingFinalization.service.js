"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingFinalizationService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = require("../../config/prisma");
const crypto_1 = require("../../providers/crypto");
const CHART_COLORS = [
    "0.15 0.39 0.92",
    "0.09 0.64 0.29",
    "0.86 0.15 0.15",
    "0.58 0.20 0.91",
    "0.92 0.35 0.05",
    "0.03 0.57 0.70",
    "0.79 0.45 0.04",
    "0.86 0.13 0.47"
];
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const DOWNLOADS_DIR = path_1.default.join(__dirname, "..", "..", "..", "public", "downloads");
const LOGO_PATH = path_1.default.join(__dirname, "..", "..", "..", "public", "assets", "logo.jpeg");
const LOGO_WIDTH = 900;
const LOGO_HEIGHT = 492;
const FOOTER_TOP = 112;
const AUDIT_TEXT = "Todo o processo de votação foi auditado pela Empresa FCM Desenvolvimento Ltda, criadora e mantenedora do sistema de votação on-line.";
let cachedLogo;
function getLogoBuffer() {
    if (cachedLogo !== undefined)
        return cachedLogo;
    cachedLogo = fs_1.default.existsSync(LOGO_PATH) ? fs_1.default.readFileSync(LOGO_PATH) : null;
    return cachedLogo;
}
function formatDate(date) {
    return date.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}
function sanitizeFilePart(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 60) || "votacao";
}
function getPublicDownloadUrl(relativeUrl) {
    const baseUrl = process.env.PUBLIC_BACKEND_URL ||
        process.env.BACKEND_PUBLIC_URL ||
        process.env.API_PUBLIC_URL ||
        process.env.VOTING_API_URL ||
        "https://backend-votes.onrender.com";
    return `${baseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "")}${relativeUrl}`;
}
function toPdfHex(text) {
    const sanitized = String(text).replace(/[^\u0000-\u00ff]/g, "");
    return `<${Buffer.from(sanitized, "latin1").toString("hex").toUpperCase()}>`;
}
function wrapText(text, maxChars) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach(word => {
        const next = line ? `${line} ${word}` : word;
        if (next.length > maxChars && line) {
            lines.push(line);
            line = word;
        }
        else {
            line = next;
        }
    });
    if (line)
        lines.push(line);
    return lines.length ? lines : [""];
}
class PdfBuilder {
    constructor(title, options = {}) {
        this.title = title;
        this.options = options;
        this.pages = [];
        this.content = "";
        this.y = PAGE_HEIGHT - MARGIN;
        this.hasLogo = Boolean(getLogoBuffer());
        this.newPage();
    }
    newPage() {
        if (this.content)
            this.pages.push(this.content);
        this.content = "";
        if (this.options.branded) {
            this.drawHeader();
            this.drawFooter();
            this.y = PAGE_HEIGHT - 150;
            return;
        }
        this.y = PAGE_HEIGHT - MARGIN;
        this.text(this.title, MARGIN, this.y, 9, false, "0.35 0.35 0.35");
        this.y -= 28;
    }
    drawHeader() {
        if (this.hasLogo) {
            const logoWidth = 120;
            const logoHeight = logoWidth * (LOGO_HEIGHT / LOGO_WIDTH);
            this.content += `q ${logoWidth} 0 0 ${logoHeight} ${MARGIN} ${PAGE_HEIGHT - 34 - logoHeight} cm /Im1 Do Q\n`;
        }
        else {
            this.text("Jornalistas de Minas", MARGIN, PAGE_HEIGHT - 72, 18, true);
        }
        this.text("Relatório final de votação", PAGE_WIDTH - MARGIN - 190, PAGE_HEIGHT - 64, 14, true);
        this.text(this.title, PAGE_WIDTH - MARGIN - 190, PAGE_HEIGHT - 82, 9, false, "0.36 0.36 0.36");
        this.content += `0.86 0.86 0.86 RG 1 w ${MARGIN} ${PAGE_HEIGHT - 124} m ${PAGE_WIDTH - MARGIN} ${PAGE_HEIGHT - 124} l S\n`;
    }
    drawFooter() {
        this.content += `0.86 0.86 0.86 RG 1 w ${MARGIN} ${FOOTER_TOP} m ${PAGE_WIDTH - MARGIN} ${FOOTER_TOP} l S\n`;
        const textLines = wrapText(AUDIT_TEXT, 76);
        textLines.forEach((line, index) => {
            this.text(line, MARGIN, FOOTER_TOP - 20 - index * 12, 8.5, false, "0.25 0.25 0.25");
        });
        if (this.options.downloadUrl) {
            this.text("Acesse o PDF:", PAGE_WIDTH - MARGIN - 78, FOOTER_TOP - 12, 7.5, true, "0.25 0.25 0.25");
            this.drawQrCode(this.options.downloadUrl, PAGE_WIDTH - MARGIN - 62, 34, 62);
        }
    }
    drawQrCode(value, x, y, size) {
        const qr = qrcode_1.default.create(value, { errorCorrectionLevel: "M" });
        const moduleCount = qr.modules.size;
        const cell = size / moduleCount;
        this.content += `1 1 1 rg ${x - 3} ${y - 3} ${size + 6} ${size + 6} re f\n`;
        this.content += `0 0 0 rg\n`;
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qr.modules.data[row * moduleCount + col]) {
                    const rectX = x + col * cell;
                    const rectY = y + size - (row + 1) * cell;
                    this.content += `${rectX.toFixed(3)} ${rectY.toFixed(3)} ${cell.toFixed(3)} ${cell.toFixed(3)} re f\n`;
                }
            }
        }
    }
    ensureSpace(height) {
        const bottomLimit = this.options.branded ? FOOTER_TOP + 22 : MARGIN;
        if (this.y - height < bottomLimit)
            this.newPage();
    }
    ensureSectionSpace(height) {
        this.ensureSpace(height);
    }
    text(value, x = MARGIN, y = this.y, size = 11, bold = false, color = "0.08 0.08 0.08") {
        const font = bold ? "F2" : "F1";
        this.content += `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td ${toPdfHex(value)} Tj ET\n`;
    }
    line(value, size = 11, bold = false, gap = 17) {
        this.ensureSpace(gap + 4);
        this.text(value, MARGIN, this.y, size, bold);
        this.y -= gap;
    }
    paragraph(value, size = 10, maxChars = 86) {
        wrapText(value, maxChars).forEach(line => this.line(line, size, false, size + 5));
    }
    heading(value) {
        this.ensureSpace(34);
        this.y -= 5;
        this.line(value, 15, true, 22);
    }
    rule() {
        this.ensureSpace(12);
        this.content += `0.82 0.82 0.82 RG 1 w ${MARGIN} ${this.y} m ${PAGE_WIDTH - MARGIN} ${this.y} l S\n`;
        this.y -= 16;
    }
    bar(label, count, total, color) {
        this.ensureSpace(42);
        const pct = total > 0 ? count / total : 0;
        const width = 330;
        const filled = Math.max(width * pct, count > 0 ? 3 : 0);
        this.text(`${label}: ${count} (${(pct * 100).toFixed(1)}%)`, MARGIN, this.y, 10, true);
        this.y -= 15;
        this.content += `0.90 0.90 0.90 rg ${MARGIN} ${this.y} ${width} 12 re f\n`;
        this.content += `${color} rg ${MARGIN} ${this.y} ${filled} 12 re f\n`;
        this.y -= 24;
    }
    optionBar(label, count, total, color) {
        this.ensureSpace(48);
        const pct = total > 0 ? count / total : 0;
        const width = 305;
        const filled = Math.max(width * pct, count > 0 ? 3 : 0);
        const value = `${count} voto(s) - ${(pct * 100).toFixed(1)}%`;
        this.text(label, MARGIN + 12, this.y, 9.5, true);
        this.text(value, PAGE_WIDTH - MARGIN - 120, this.y, 9.5, true, "0.22 0.22 0.22");
        this.y -= 14;
        this.content += `0.94 0.94 0.94 rg ${MARGIN + 12} ${this.y} ${width} 10 re f\n`;
        this.content += `${color} rg ${MARGIN + 12} ${this.y} ${filled} 10 re f\n`;
        this.y -= 21;
    }
    tableRow(values, widths, bold = false, backgroundColor, textColor = "0.08 0.08 0.08") {
        const lines = values.map((value, index) => wrapText(value, Math.floor(widths[index] / 5.4)));
        const rowLines = Math.max(...lines.map(line => line.length));
        const rowHeight = rowLines * 13 + 10;
        this.ensureSpace(rowHeight);
        let x = MARGIN;
        const startY = this.y;
        if (backgroundColor) {
            const tableWidth = widths.reduce((sum, width) => sum + width, 0);
            this.content += `${backgroundColor} rg ${MARGIN - 6} ${this.y - rowHeight + 7} ${tableWidth + 12} ${rowHeight} re f\n`;
        }
        values.forEach((_value, index) => {
            for (let i = 0; i < rowLines; i++) {
                if (lines[index][i])
                    this.text(lines[index][i], x, startY - 13 * i, 9, bold, textColor);
            }
            x += widths[index];
        });
        this.y -= rowHeight;
        this.content += `0.88 0.88 0.88 RG 0.5 w ${MARGIN} ${this.y + 5} m ${PAGE_WIDTH - MARGIN} ${this.y + 5} l S\n`;
    }
    build() {
        if (this.content)
            this.pages.push(this.content);
        return createPdf(this.pages, this.options.branded && this.hasLogo ? getLogoBuffer() : null);
    }
}
function createPdf(pageContents, logoBuffer = null) {
    const objects = [];
    const add = (content) => {
        objects.push(content);
        return objects.length;
    };
    const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const logoId = logoBuffer
        ? add(Buffer.concat([
            Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${LOGO_WIDTH} /Height ${LOGO_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBuffer.length} >>\nstream\n`, "utf8"),
            logoBuffer,
            Buffer.from("\nendstream", "utf8")
        ]))
        : null;
    const pagesId = objects.length + 1;
    objects.push("");
    const pageIds = [];
    pageContents.forEach(content => {
        const stream = Buffer.from(content, "utf8");
        const contentId = add(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);
        const xObject = logoId ? ` /XObject << /Im1 ${logoId} 0 R >>` : "";
        const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >>${xObject} >> /Contents ${contentId} 0 R >>`);
        pageIds.push(pageId);
    });
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    const chunks = [Buffer.from("%PDF-1.4\n", "utf8")];
    const offsets = [0];
    let currentLength = chunks[0].length;
    objects.forEach((object, index) => {
        offsets.push(currentLength);
        const prefix = Buffer.from(`${index + 1} 0 obj\n`, "utf8");
        const body = Buffer.isBuffer(object) ? object : Buffer.from(object, "utf8");
        const suffix = Buffer.from("\nendobj\n", "utf8");
        chunks.push(prefix, body, suffix);
        currentLength += prefix.length + body.length + suffix.length;
    });
    const xrefOffset = currentLength;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => {
        xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(Buffer.from(xref, "utf8"));
    return Buffer.concat(chunks);
}
class VotingFinalizationService {
    async finalize(votingId) {
        const voting = await prisma_1.prisma.voting.findUnique({
            where: { id: votingId },
            include: {
                steps: { include: { options: true } },
                votes: true
            }
        });
        if (!voting)
            throw new Error("Voting not found");
        const eligibleUsers = await prisma_1.prisma.user.findMany({
            where: {
                active: true,
                role: { not: "ADMIN" }
            },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" }
        });
        const votedUserIds = new Set(voting.votes.map(vote => vote.userId));
        const nonVoters = eligibleUsers.filter(user => !votedUserIds.has(user.id));
        const answers = this.parseVotes(voting.votes);
        const aggregated = this.aggregateResults(voting.steps, answers);
        await promises_1.default.mkdir(DOWNLOADS_DIR, { recursive: true });
        const baseName = `${sanitizeFilePart(voting.title)}-${voting.id.slice(0, 8)}`;
        const resultFilename = `${baseName}-resultado-final.pdf`;
        const nonVotersFilename = `${baseName}-nao-votantes.pdf`;
        const resultPdfUrl = `/downloads/${resultFilename}`;
        const nonVotersPdfUrl = `/downloads/${nonVotersFilename}`;
        const resultPdfDownloadUrl = getPublicDownloadUrl(resultPdfUrl);
        const nonVotersPdfDownloadUrl = getPublicDownloadUrl(nonVotersPdfUrl);
        const finalizedAt = new Date();
        await promises_1.default.writeFile(path_1.default.join(DOWNLOADS_DIR, resultFilename), this.buildResultPdf(voting.title, finalizedAt, aggregated, voting.votes.length, eligibleUsers.length, resultPdfDownloadUrl));
        await promises_1.default.writeFile(path_1.default.join(DOWNLOADS_DIR, nonVotersFilename), this.buildNonVotersPdf(voting.title, finalizedAt, nonVoters, nonVotersPdfDownloadUrl));
        return prisma_1.prisma.voting.update({
            where: { id: voting.id },
            data: {
                status: "closed",
                finalizedAt,
                resultPdfUrl,
                nonVotersPdfUrl
            }
        });
    }
    parseVotes(votes) {
        return votes.map(vote => {
            try {
                const decrypted = JSON.parse((0, crypto_1.decrypt)(vote.encryptedVote));
                return decrypted.answers;
            }
            catch {
                return null;
            }
        }).filter(Boolean);
    }
    aggregateResults(steps, answers) {
        return steps.map(step => {
            const counts = new Map(step.options.map(option => [option.id, 0]));
            answers.forEach(answerSet => {
                const selected = answerSet[step.id];
                if (!selected)
                    return;
                if (Array.isArray(selected)) {
                    selected.forEach(optionId => {
                        if (counts.has(optionId))
                            counts.set(optionId, (counts.get(optionId) || 0) + 1);
                    });
                }
                else if (counts.has(selected)) {
                    counts.set(selected, (counts.get(selected) || 0) + 1);
                }
            });
            return {
                title: step.title,
                type: step.type,
                options: step.options
                    .map(option => ({ label: option.label, count: counts.get(option.id) || 0 }))
                    .sort((a, b) => b.count - a.count)
            };
        });
    }
    buildResultPdf(votingTitle, finalizedAt, steps, totalVotes, eligibleUsersTotal, downloadUrl) {
        const pdf = new PdfBuilder("Resultado final da votação", {
            branded: true,
            downloadUrl
        });
        const missingVotes = Math.max(eligibleUsersTotal - totalVotes, 0);
        pdf.line("Resultado final da votação", 21, true, 28);
        pdf.paragraph(votingTitle, 12, 78);
        pdf.line(`Finalizada em: ${formatDate(finalizedAt)}`, 10);
        pdf.line(`Total de votos: ${totalVotes}`, 10);
        pdf.line(`Usuários aptos: ${eligibleUsersTotal}`, 10);
        pdf.rule();
        pdf.heading("Opções mais votadas por etapa");
        steps.forEach((step, index) => {
            const stepTotal = step.options.reduce((sum, option) => sum + option.count, 0);
            const maxVotes = Math.max(...step.options.map(option => option.count), 0);
            const winners = step.options.filter(option => option.count === maxVotes && option.count > 0);
            pdf.line(`${index + 1}. ${step.title}`, 12, true);
            if (winners.length === 0) {
                pdf.line("Sem votos registrados nesta etapa.", 10);
            }
            else {
                winners.forEach(winner => {
                    const pct = stepTotal > 0 ? (winner.count / stepTotal) * 100 : 0;
                    pdf.line(`${winner.label}: ${winner.count} voto(s) (${pct.toFixed(1)}%)`, 10);
                });
            }
            pdf.line("", 5, false, 5);
        });
        pdf.heading("Participação na votação");
        pdf.bar("Já votaram", totalVotes, eligibleUsersTotal, "0.58 0.20 0.91");
        pdf.bar("Não votaram", missingVotes, eligibleUsersTotal, "0.86 0.15 0.15");
        pdf.heading("Gráficos por etapa");
        steps.forEach((step, index) => {
            const stepTotal = step.options.reduce((sum, option) => sum + option.count, 0);
            pdf.ensureSectionSpace(38 + Math.min(step.options.length, 4) * 35);
            pdf.line(`${index + 1}. ${step.title}`, 12, true, 18);
            pdf.line(`Total nesta etapa: ${stepTotal} ${stepTotal === 1 ? "voto" : "votos"}${step.type === "multiple" ? " em opções selecionadas" : ""}`, 9, false, 15);
            step.options.forEach((option, optionIndex) => {
                pdf.optionBar(option.label, option.count, stepTotal, CHART_COLORS[optionIndex % CHART_COLORS.length]);
            });
            pdf.line("", 5, false, 5);
        });
        return pdf.build();
    }
    buildNonVotersPdf(votingTitle, finalizedAt, nonVoters, downloadUrl) {
        const pdf = new PdfBuilder("Relatório nominal dos não votantes", {
            branded: true,
            downloadUrl
        });
        pdf.line("Relatório nominal dos não votantes", 20, true, 26);
        pdf.paragraph(votingTitle, 12, 78);
        pdf.line("Usuários aptos que não registraram voto até o encerramento oficial da votação.", 10, false, 16);
        pdf.line(`Finalizada em: ${formatDate(finalizedAt)}`, 10);
        pdf.rule();
        pdf.line(`Total de não votantes: ${nonVoters.length}`, 15, true, 24);
        if (nonVoters.length === 0) {
            pdf.line("Todos os usuários aptos registraram voto.", 11);
            return pdf.build();
        }
        pdf.tableRow(["Nome", "Email"], [235, 260], true, "0.13 0.13 0.15", "1 1 1");
        nonVoters.forEach((user, index) => {
            pdf.tableRow([user.name, user.email], [235, 260], false, index % 2 === 0 ? "0.96 0.96 0.97" : "1 1 1");
        });
        return pdf.build();
    }
}
exports.VotingFinalizationService = VotingFinalizationService;
