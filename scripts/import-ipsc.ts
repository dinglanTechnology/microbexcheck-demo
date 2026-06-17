/**
 * Import the 20 iPSC literature extractions into the database and upload each
 * paper's PDF to Aliyun OSS.
 *
 * Run from the project root:  npx tsx scripts/import-ipsc.ts
 *
 * Idempotent: re-running upserts each Paper (by fileKey) and rewrites its
 * FieldValue rows. OSS upload is skipped (with a warning) when credentials
 * are missing — the DB import still completes.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Prisma } from "../app/generated/prisma/client";
// Reuse the runtime's client factory so a database switch is a one-spot change
// (lib/prisma.ts) instead of being duplicated here. This script only uses
// portable Prisma ORM ops (upsert / deleteMany / createMany, no raw SQL), so
// it works unchanged against MySQL / Postgres / SQLite once the adapter and
// schema `provider` are swapped.
import { createPrismaClient } from "../lib/prisma";
import { buildAiRecords, perturb, type FieldRecord } from "../lib/ipsc/transform";
import { ossConfigured, uploadFile } from "../lib/oss";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "temp", "condition_response(前20篇)");
const PDF_DIR = path.join(ROOT, "temp", "pdf", "文档一");

// Normalize a filename stem so JSON ↔ PDF names match despite encoding diffs
// (e.g. "(19)" vs "_19_", trailing "_", extra fbclid "_aem_..." suffix).
const normStem = (s: string) =>
  s.toLowerCase().replace(/[()]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");

function buildPdfIndex(): { stem: string; norm: string; file: string }[] {
  if (!fs.existsSync(PDF_DIR)) return [];
  return fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => {
      const stem = f.replace(/\.pdf$/i, "");
      return { stem, norm: normStem(stem), file: f };
    });
}

function matchPdf(fileKey: string, idx: ReturnType<typeof buildPdfIndex>): string | null {
  const target = normStem(fileKey);
  const exact = idx.find((p) => p.norm === target);
  if (exact) return exact.file;
  // prefix match handles truncated/extended names
  const pre = idx.find((p) => p.norm.startsWith(target) || target.startsWith(p.norm));
  return pre ? pre.file : null;
}

const toJson = (v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue);

function rowsFor(paperId: number, records: FieldRecord[], source: "AI" | "YANG" | "WANG") {
  return records.map((r) => ({
    paperId,
    section: r.section,
    fieldPath: r.fieldPath,
    source,
    value: toJson(r.value),
  }));
}

async function main() {
  if (!fs.existsSync(JSON_DIR)) throw new Error(`JSON dir not found: ${JSON_DIR}`);
  const files = fs.readdirSync(JSON_DIR).filter((f) => f.toLowerCase().endsWith(".json")).sort();
  const pdfIndex = buildPdfIndex();
  const ossOn = ossConfigured();
  console.log(`Found ${files.length} JSON files, ${pdfIndex.length} PDFs. OSS=${ossOn ? "on" : "OFF (skip upload)"}`);

  const prisma = createPrismaClient();
  let totalFields = 0;
  let uploaded = 0;
  let pdfMissing = 0;

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileKey = file.replace(/\.json$/i, "");
      const raw = JSON.parse(fs.readFileSync(path.join(JSON_DIR, file), "utf8"));
      const extraction = raw.extraction ?? raw;
      const { paper, records } = buildAiRecords(extraction);

      const pdfFile = matchPdf(fileKey, pdfIndex);
      if (!pdfFile) pdfMissing++;

      let pdfUrl: string | null = null;
      if (ossOn && pdfFile) {
        try {
          pdfUrl = await uploadFile(path.join(PDF_DIR, pdfFile), `papers/${fileKey}.pdf`);
          uploaded++;
        } catch (e) {
          console.warn(`  ! OSS upload failed for ${fileKey}: ${(e as Error).message}`);
        }
      }

      const meta = {
        title: paper.title,
        journal: paper.journal,
        year: paper.year,
        doi: paper.doi,
        pmid: paper.pmid,
        url: paper.url,
        pdfFileName: pdfFile,
        // 新导入文献一律「待进行」(pending)，由验收人逐篇推进状态机。
        status: "pending",
        ...(pdfUrl ? { pdfUrl } : {}),
      };

      const p = await prisma.paper.upsert({
        where: { fileKey },
        create: { fileKey, ...meta },
        update: meta,
      });

      // Rewrite this paper's field values (AI + simulated 杨/王).
      await prisma.fieldValue.deleteMany({ where: { paperId: p.id } });
      const rows = [
        ...rowsFor(p.id, records, "AI"),
        ...rowsFor(p.id, perturb(records, "YANG", fileKey), "YANG"),
        ...rowsFor(p.id, perturb(records, "WANG", fileKey), "WANG"),
      ];
      await prisma.fieldValue.createMany({ data: rows });
      totalFields += rows.length;

      console.log(
        `[${i + 1}/${files.length}] ${fileKey.slice(0, 48)}… → paper#${p.id}, ${rows.length} values${pdfUrl ? ", pdf↑" : pdfFile ? "" : ", NO-PDF"}`,
      );
    }

    console.log(
      `\nDone. ${files.length} papers, ${totalFields} field values, ${uploaded} PDFs uploaded, ${pdfMissing} without PDF.`,
    );
    if (!ossOn) console.log("Note: set OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET and re-run to upload PDFs.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
