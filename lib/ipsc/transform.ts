// Transforms an English `extraction` object (from condition_response/*.json)
// into Chinese-keyed, localized field records keyed by rid, and derives the
// simulated 杨/王 source variants.

import { SECTIONS, type FieldType } from "./sections";

export interface FieldRecord {
  section: string;
  fieldPath: string; // rid, e.g. "ds.元数据质量" / "cond.0.剂量" / "ev.0"
  type: FieldType | "evidence";
  opts?: string[];
  value: unknown; // string | number | string[] | object | null
}

export interface PaperMeta {
  fileKey: string;
  title: string | null;
  journal: string | null;
  year: number | null;
  doi: string | null;
  pmid: string | null;
  url: string | null;
}

/* ── enum / value localization ─────────────────────────────────── */
const BOOL_MAP: Record<string, string> = { yes: "是", no: "否", uncertain: "未知" };
const QUALITY_MAP: Record<string, string> = { high: "高", medium: "中", low: "低", uncertain: "" };
const REC_MAP: Record<string, string> = {
  priority_include: "优先纳入",
  candidate_include: "纳入",
  include: "纳入",
  cautious_include: "谨慎纳入",
  exclude: "不纳入",
};
const EVTYPE_MAP: Record<string, string> = {
  primary_experimental_paper: "研究论文",
  dataset_paper: "数据集论文",
  review: "综述",
  other: "其他",
};
const CONF_MAP: Record<string, string> = { high: "高", medium: "中", low: "低" };
const SPECIES_MAP: Record<string, string> = { human: "人类", mouse: "小鼠", pig: "猪", rat: "大鼠", monkey: "猴" };

const localizeBy = (map: Record<string, string>) => (v: unknown) =>
  v == null ? v : map[String(v).trim()] ?? v;
const localizeTokens = (map: Record<string, string>) => (v: unknown) =>
  v == null ? v : String(v).replace(/[a-z]+/gi, (w) => map[w.toLowerCase()] ?? w);
const localizeCultureFormat = (v: unknown) =>
  v == null ? v : String(v).replace(/\b2D\b/g, "二维").replace(/\b3D\b/g, "三维");

// Per-field localizer keyed by english JSON key.
const LOCALIZERS: Record<string, (v: unknown) => unknown> = {
  has_processed_data: localizeBy(BOOL_MAP),
  has_raw_data: localizeBy(BOOL_MAP),
  has_processed_matrix: localizeBy(BOOL_MAP),
  has_metadata: localizeBy(BOOL_MAP),
  has_cell_type_annotation: localizeBy(BOOL_MAP),
  has_lineage_annotation: localizeBy(BOOL_MAP),
  has_trajectory_annotation: localizeBy(BOOL_MAP),
  metadata_quality: localizeBy(QUALITY_MAP),
  recommendation_stage: localizeBy(REC_MAP),
  evidence_type: localizeBy(EVTYPE_MAP),
  species: localizeTokens(SPECIES_MAP),
  culture_format: localizeCultureFormat,
};

/* ── value normalization by field type ─────────────────────────── */
export const LIST_SEP = "; ";

function norm(v: unknown, type: FieldType): unknown {
  if (type === "list") {
    // list 字段直接拼接成字符串（不存数组）
    if (Array.isArray(v)) return v.map((x) => String(x)).join(LIST_SEP);
    return v == null ? "" : String(v);
  }
  if (type === "score") {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return v == null ? "" : String(v);
}

/* ── build the AI (original) records from one extraction ───────── */
type Rec = Record<string, unknown>;
const asRec = (v: unknown): Rec =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asStr = (v: unknown): string | null => (v == null ? null : String(v));

export function buildAiRecords(extraction: Record<string, unknown>): {
  paper: PaperMeta;
  records: FieldRecord[];
} {
  const records: FieldRecord[] = [];
  const pm = asRec(extraction.paper_metadata);

  for (const sec of SECTIONS) {
    const src = extraction[sec.enSrc];

    if (sec.type === "object" && sec.fields) {
      for (const f of sec.fields) {
        let raw: unknown;
        if (f.enKey) raw = asRec(src)[f.enKey];
        else if (sec.id === "proto" && f.key === "基础培养基")
          raw = asRec(asArr(extraction.culture_conditions)[0]).medium_name;
        const localized = f.enKey && LOCALIZERS[f.enKey] ? LOCALIZERS[f.enKey](raw) : raw;
        records.push({
          section: sec.id,
          fieldPath: `${sec.id}.${f.key}`,
          type: f.type,
          opts: f.opts,
          value: norm(localized, f.type),
        });
      }
    } else if (sec.type === "array" && sec.fields) {
      // Flatten culture_conditions: one row per small molecule (or the
      // condition itself when it has none).
      let idx = 0;
      for (const condRaw of asArr(src)) {
        const cond = asRec(condRaw);
        const smList = asArr(cond.small_molecules);
        const sms: unknown[] = smList.length ? smList : [null];
        for (const smRaw of sms) {
          const sm = asRec(smRaw);
          const get = (k: string) => sm[k] ?? cond[k] ?? null;
          const ct = cond.component_type;
          const row: Record<string, unknown> = {
            条件ID: cond.condition_id,
            培养基名称: cond.medium_name,
            培养基组分: cond.medium_components,
            组分类型: Array.isArray(ct) ? ct.join("; ") : ct,
            小分子名称: sm.small_molecule_name ?? null,
            小分子SMILES: sm.small_molecule_smiles ?? null,
            生长因子名称: get("growth_factor_name"),
            细胞因子名称: get("cytokine_name"),
            抑制剂或激动剂: sm.inhibitor_or_agonist ?? null,
            靶向通路: sm.targeted_pathway ?? null,
            剂量: sm.dose ?? null,
            剂量单位: sm.dose_unit ?? null,
            暴露开始天数: sm.exposure_start_day ?? null,
            暴露结束天数: sm.exposure_end_day ?? null,
            暴露持续天数: sm.exposure_duration_days ?? null,
            换液频率: sm.media_change_frequency ?? null,
          };
          for (const f of sec.fields) {
            records.push({
              section: sec.id,
              fieldPath: `cond.${idx}.${f.key}`,
              type: f.type,
              value: norm(row[f.key], f.type),
            });
          }
          idx++;
        }
      }
    } else if (sec.type === "evidence") {
      asArr(src).forEach((eRaw, i) => {
        const e = asRec(eRaw);
        records.push({
          section: sec.id,
          fieldPath: `ev.${i}`,
          type: "evidence",
          value: {
            claim: e.claim ?? "",
            sentence: e.evidence_sentence ?? "",
            section: e.source_section ?? "",
            confidence: CONF_MAP[String(e.confidence)] ?? e.confidence ?? "",
            figure: e.figure_or_table ?? "",
            note: e.extraction_note ?? "",
          },
        });
      });
    }
  }

  const year = Number(pm.year);
  return {
    paper: {
      fileKey: String(pm.paper_id ?? ""),
      title: asStr(pm.title),
      journal: asStr(pm.journal),
      year: Number.isFinite(year) ? year : null,
      doi: asStr(pm.doi),
      pmid: asStr(pm.pmid),
      url: asStr(pm.url),
    },
    records,
  };
}

/* ── deterministic perturbation for the 杨 / 王 sources ─────────── */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const isEmpty = (v: unknown) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

const SUFFIX: Record<string, string> = { YANG: "（杨校对）", WANG: "（王复核）" };

// Mutate a populated value into a plausibly different one.
function mutate(rec: FieldRecord, source: string): unknown {
  const v = rec.value;
  if (rec.type === "radio" && rec.opts?.length) {
    const cur = rec.opts.indexOf(String(v));
    return rec.opts[(Math.max(0, cur) + 1) % rec.opts.length];
  }
  if (rec.type === "score") {
    const n = Number(v) || 0;
    return n >= 3 ? n - 1 : n + 1;
  }
  if (rec.type === "evidence" && v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const conf = ["高", "中", "低"];
    const cur = conf.indexOf(String(o.confidence));
    return { ...o, confidence: conf[(Math.max(0, cur) + 1) % conf.length] };
  }
  return `${v}${SUFFIX[source] ?? ""}`;
}

// Returns a copy of `records` with ~`rate` of populated fields changed,
// deterministically per (fileKey, source, fieldPath).
export function perturb(
  records: FieldRecord[],
  source: "YANG" | "WANG",
  fileKey: string,
  rate = 0.15,
): FieldRecord[] {
  return records.map((rec) => {
    if (isEmpty(rec.value)) return rec;
    const roll = hash(`${fileKey}|${source}|${rec.fieldPath}`);
    return roll < rate ? { ...rec, value: mutate(rec, source) } : rec;
  });
}
