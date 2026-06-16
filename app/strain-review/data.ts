// 菌株审核页面 —— 字段定义与假数据

export type FieldType = "text" | "textarea" | "radio";

export interface Field {
  key: string;
  lbl: string;
  type: FieldType;
  opts?: string[];
  loc?: string;
}

export interface Section {
  id: string;
  title: string;
  fields: Field[];
}

export interface ReviewSource {
  from: string;
  val: string;
  loc?: string;
}

export interface CustomLoc {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Strain {
  id: string;
  name: string;
  vals: Record<string, string>;
  confirmed: Record<string, boolean>;
  editing: Record<string, boolean>;
  locs: Record<string, string[]>;
  customLocs: CustomLoc[];
}

export interface FileEntry {
  id: number;
  name: string;
  pid: string;
  st: "active" | "done" | "pending";
}

export interface DbStrain {
  id: string;
  name: string;
  species: string;
  src: string;
  previewVals: Record<string, string>;
}

export type PageMode = "rev-pending" | "review" | "submitted" | "locked";

// ── 字段分区定义 ──────────────────────────────────────────────
export const SECTIONS: Section[] = [
  {
    id: "taxonomy",
    title: "分类信息",
    fields: [
      { key: "domain", lbl: "Domain", type: "text" },
      { key: "phylum", lbl: "Phylum", type: "text" },
      { key: "class", lbl: "Class", type: "text" },
      { key: "order", lbl: "Order", type: "text" },
      { key: "family", lbl: "Family", type: "text" },
      { key: "genus", lbl: "Genus", type: "text" },
      { key: "species", lbl: "Species", type: "text", loc: "species" },
      { key: "strain", lbl: "Strain", type: "text", loc: "strain" },
      { key: "prevNames", lbl: "Previous Names", type: "text" },
      { key: "strainDesig", lbl: "Strain Designation", type: "text" },
      { key: "typeStrain", lbl: "Type Strain", type: "radio", opts: ["Yes", "No", "not provided"] },
    ],
  },
  {
    id: "physiology",
    title: "生理特性",
    fields: [
      { key: "tmin", lbl: "Tmin (°C)", type: "text", loc: "tmin" },
      { key: "tmax", lbl: "Tmax (°C)", type: "text", loc: "tmax" },
      { key: "toptMin", lbl: "ToptMin (°C)", type: "text" },
      { key: "toptMax", lbl: "ToptMax (°C)", type: "text" },
      { key: "topt", lbl: "Topt (°C)", type: "text" },
      { key: "phMin", lbl: "pHMin", type: "text", loc: "phmin" },
      { key: "phMax", lbl: "pHMax", type: "text", loc: "phmax" },
      { key: "phOptMin", lbl: "pHOptMin", type: "text" },
      { key: "phOptMax", lbl: "pHOptMax", type: "text" },
      { key: "phOpt", lbl: "pHOpt", type: "text" },
      { key: "naclMin", lbl: "NaCl Min (mol/L)", type: "text" },
      { key: "naclMax", lbl: "NaCl Max (mol/L)", type: "text", loc: "naclmax" },
      { key: "naclOptMin", lbl: "NaCl OptMin (mol/L)", type: "text" },
      { key: "naclOptMax", lbl: "NaCl OptMax (mol/L)", type: "text" },
      { key: "naclOpt", lbl: "NaCl Opt (mol/L)", type: "text" },
      { key: "optRate", lbl: "OptimalRate (h⁻¹)", type: "text" },
      { key: "rate", lbl: "Rate (h⁻¹)", type: "text" },
      { key: "doubleTime", lbl: "DoubleTime (h)", type: "text" },
      { key: "optDoubleTime", lbl: "OptDoublingTime (h)", type: "text" },
      { key: "maxCellYieldV", lbl: "MaxCellYield (cells/ml)", type: "text" },
      { key: "maxCellYieldW", lbl: "MaxCellYield (g dry wt)", type: "text" },
    ],
  },
  {
    id: "substrates",
    title: "底物 & 生长",
    fields: [
      { key: "substrates", lbl: "Growth Substrates", type: "textarea", loc: "substrates" },
      { key: "nonSubstrates", lbl: "Non-Supporting", type: "textarea" },
      { key: "growthDesc", lbl: "Growth Description", type: "textarea", loc: "growth" },
      { key: "environment", lbl: "Environment", type: "text" },
      { key: "envCategory", lbl: "Env. Category", type: "text" },
      { key: "source", lbl: "Source", type: "textarea" },
      { key: "location", lbl: "Location", type: "text" },
      { key: "gcContent", lbl: "G+C Content (mol%)", type: "text" },
      {
        key: "oxygenTol",
        lbl: "Oxygen Tolerance",
        type: "radio",
        opts: ["aerobic", "anaerobic", "facultative", "microaerophilic", "not provided"],
      },
    ],
  },
  {
    id: "morphology",
    title: "形态学",
    fields: [
      { key: "shape", lbl: "Shape", type: "text" },
      { key: "gramRxn", lbl: "Gram Reaction", type: "radio", opts: ["positive", "negative", "not provided"] },
      { key: "motility", lbl: "Motility", type: "radio", opts: ["Yes", "No", "not provided"] },
      { key: "cellSurface", lbl: "Cell Surface", type: "text" },
      { key: "wMin", lbl: "WMin (µm)", type: "text" },
      { key: "wMax", lbl: "WMax (µm)", type: "text" },
      { key: "lMin", lbl: "LMin (µm)", type: "text" },
      { key: "lMax", lbl: "LMax (µm)", type: "text" },
      { key: "morphDesc", lbl: "Morphology Desc.", type: "textarea" },
    ],
  },
  {
    id: "culture",
    title: "培养物编号",
    fields: [
      { key: "dsmz", lbl: "DSMZ", type: "text" },
      { key: "atcc", lbl: "ATCC", type: "text" },
      { key: "jcm", lbl: "JCM", type: "text" },
      { key: "ocm", lbl: "OCM", type: "text" },
      { key: "cgmcc", lbl: "CGMCC", type: "text" },
      { key: "mcm", lbl: "MCM", type: "text" },
      { key: "nbrc", lbl: "NBRC", type: "text" },
      { key: "vkm", lbl: "VKM", type: "text" },
      { key: "smcc", lbl: "SMCC", type: "text" },
      { key: "ncbiTaxId", lbl: "NCBI tax ID", type: "text" },
      { key: "bacdiveId", lbl: "BacDive ID", type: "text" },
    ],
  },
  {
    id: "genomics",
    title: "基因组 & 序列",
    fields: [
      { key: "rRNA16s", lbl: "16S rRNA Accession", type: "text" },
      { key: "mcrA", lbl: "mcrA Gene Accession", type: "text" },
      { key: "genomeAcc", lbl: "Genome Accession", type: "text" },
      { key: "genbankAssembly", lbl: "GenBank Assembly", type: "text" },
    ],
  },
  {
    id: "nutrition",
    title: "营养 & 抑制",
    fields: [
      { key: "nitrogenSrc", lbl: "Nitrogen Source", type: "text" },
      { key: "sulfurSrc", lbl: "Sulfur Source", type: "text" },
      { key: "essentialGrowth", lbl: "Essential Growth", type: "textarea" },
      { key: "growthInhibitors", lbl: "Growth Inhibitors", type: "textarea" },
      { key: "growthStim", lbl: "Growth Stimulators", type: "text" },
      { key: "antibioticRes", lbl: "Antibiotic Resist.", type: "text" },
    ],
  },
  {
    id: "other",
    title: "其他信息",
    fields: [
      { key: "collectionNum", lbl: "Collection Number", type: "text" },
      { key: "strainHistory", lbl: "Strain History", type: "textarea" },
      { key: "lysisSusc", lbl: "Lysis Susceptibility", type: "text" },
      { key: "includedStrains", lbl: "Included Strains", type: "textarea" },
    ],
  },
];

export const ALL_FIELDS: Field[] = SECTIONS.flatMap((s) => s.fields);

export function emptyVals(): Record<string, string> {
  const v: Record<string, string> = {};
  ALL_FIELDS.forEach((f) => {
    v[f.key] = "";
  });
  return v;
}

// ── 多标注来源（每字段 3 个标注者）──────────────────────────────
type SourceMap = Record<string, ReviewSource[]>;

const s1Sources: SourceMap = {
  domain: [{ from: "AI", val: "Bacteria" }, { from: "杨一", val: "Bacteria" }, { from: "王二", val: "Bacteria" }],
  phylum: [{ from: "AI", val: "Pseudomonadota" }, { from: "杨一", val: "Pseudomonadota" }, { from: "王二", val: "Proteobacteria" }],
  class: [{ from: "AI", val: "Alphaproteobacteria" }, { from: "杨一", val: "Alphaproteobacteria" }, { from: "王二", val: "Alphaproteobacteria" }],
  order: [{ from: "AI", val: "Hyphomicrobiales" }, { from: "杨一", val: "Hyphomicrobiales" }, { from: "王二", val: "Rhizobiales" }],
  family: [{ from: "AI", val: "Methylobacteriaceae" }, { from: "杨一", val: "Methylobacteriaceae" }, { from: "王二", val: "Methylobacteriaceae" }],
  genus: [{ from: "AI", val: "Methylobacterium" }, { from: "杨一", val: "Methylobacterium" }, { from: "王二", val: "Methylobacterium" }],
  species: [{ from: "AI", val: "Methylobacterium fujisawaense", loc: "species" }, { from: "杨一", val: "Methylobacterium fujisawaense", loc: "species" }, { from: "王二", val: "Methylobacterium fujisawaense", loc: "species" }],
  strain: [{ from: "AI", val: "F5.4", loc: "strain" }, { from: "杨一", val: "F5.4", loc: "strain" }, { from: "王二", val: "F5.4", loc: "strain" }],
  prevNames: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  strainDesig: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  typeStrain: [{ from: "AI", val: "No" }, { from: "杨一", val: "No" }, { from: "王二", val: "not provided" }],
  tmin: [{ from: "AI", val: "0", loc: "tmin" }, { from: "杨一", val: "0", loc: "tmin" }, { from: "王二", val: "8", loc: "tmin" }],
  tmax: [{ from: "AI", val: "37", loc: "tmax" }, { from: "杨一", val: "37", loc: "tmax" }, { from: "王二", val: "37", loc: "tmax" }],
  toptMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  toptMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  topt: [{ from: "AI", val: "" }, { from: "杨一", val: "25" }, { from: "王二", val: "" }],
  phMin: [{ from: "AI", val: "5", loc: "phmin" }, { from: "杨一", val: "5", loc: "phmin" }, { from: "王二", val: "5", loc: "phmin" }],
  phMax: [{ from: "AI", val: "12", loc: "phmax" }, { from: "杨一", val: "12", loc: "phmax" }, { from: "王二", val: "9", loc: "phmax" }],
  phOptMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  phOptMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  phOpt: [{ from: "AI", val: "" }, { from: "杨一", val: "7.0" }, { from: "王二", val: "" }],
  naclMin: [{ from: "AI", val: "0.000" }, { from: "杨一", val: "0.000" }, { from: "王二", val: "0" }],
  naclMax: [{ from: "AI", val: "0.513", loc: "naclmax" }, { from: "杨一", val: "0.513", loc: "naclmax" }, { from: "王二", val: "0.5", loc: "naclmax" }],
  naclOptMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  naclOptMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  naclOpt: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  optRate: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  rate: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  doubleTime: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  optDoubleTime: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  maxCellYieldV: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  maxCellYieldW: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  substrates: [
    { from: "AI", val: "methane, methanol, MSA, formate, mono- di- and tri-methylamines", loc: "substrates" },
    { from: "杨一", val: "methane, methanol, MSA, formate, mono- di- and tri-methylamines, methylsulphate, acetate, lactate, citrate", loc: "substrates" },
    { from: "王二", val: "methane, methanol, formate", loc: "substrates" },
  ],
  nonSubstrates: [
    { from: "AI", val: "benzene, xylenes, styrene, naphthalene, TCE, MTBE" },
    { from: "杨一", val: "benzene, xylenes, styrene, naphthalene, TCE, MTBE" },
    { from: "王二", val: "benzene, xylenes, TCE" },
  ],
  growthDesc: [
    { from: "AI", val: "Strain F5.4 can grow at temperatures between 8 °C and 37 °C, tolerates pH from 5 to 12.", loc: "growth" },
    { from: "杨一", val: "Strain F5.4 can grow at temperatures between 8 °C and 37 °C, tolerates pH from 5 to 12, and can withstand the presence of various organic pollutants and heavy metals.", loc: "growth" },
    { from: "王二", val: "Grows between 8–37 °C, pH 5–12.", loc: "growth" },
  ],
  environment: [{ from: "AI", val: "Soil" }, { from: "杨一", val: "Soil" }, { from: "王二", val: "Soil" }],
  envCategory: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  source: [
    { from: "AI", val: "Sediment sample from a brackish marsh in the estuary of the River Douro, Oporto, Portugal" },
    { from: "杨一", val: "Sediment sample from a brackish marsh in the estuary of the River Douro, Oporto, Portugal; soil samples from an area contaminated with chemical industrial waste in Estarreja, Portugal" },
    { from: "王二", val: "River Douro estuary, Oporto, Portugal" },
  ],
  location: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  gcContent: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  oxygenTol: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "aerobic" }],
  shape: [{ from: "AI", val: "" }, { from: "杨一", val: "rod" }, { from: "王二", val: "" }],
  gramRxn: [{ from: "AI", val: "not provided" }, { from: "杨一", val: "not provided" }, { from: "王二", val: "negative" }],
  motility: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  cellSurface: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  wMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  wMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  lMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  lMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  morphDesc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  dsmz: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  atcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  jcm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  ocm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  cgmcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  mcm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  nbrc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  vkm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  smcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  ncbiTaxId: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  bacdiveId: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  rRNA16s: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  mcrA: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  genomeAcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  genbankAssembly: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  nitrogenSrc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  sulfurSrc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  essentialGrowth: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  growthInhibitors: [
    { from: "AI", val: "arsenate (-), cadmium (-), chromate (-), mercury (-), lead (-) (up to 20 ppm)" },
    { from: "杨一", val: "arsenate (-), cadmium (-), chromate (-), mercury (-), lead (-) (up to 20 ppm)" },
    { from: "王二", val: "arsenate, cadmium, chromate, mercury, lead (up to 20 ppm)" },
  ],
  growthStim: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  antibioticRes: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  collectionNum: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  strainHistory: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  lysisSusc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  includedStrains: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
};

const s2Sources: SourceMap = {
  domain: [{ from: "AI", val: "Bacteria" }, { from: "杨一", val: "Bacteria" }, { from: "王二", val: "Bacteria" }],
  phylum: [{ from: "AI", val: "Pseudomonadota" }, { from: "杨一", val: "Pseudomonadota" }, { from: "王二", val: "Pseudomonadota" }],
  class: [{ from: "AI", val: "Alphaproteobacteria" }, { from: "杨一", val: "Alphaproteobacteria" }, { from: "王二", val: "Alphaproteobacteria" }],
  order: [{ from: "AI", val: "Hyphomicrobiales" }, { from: "杨一", val: "Hyphomicrobiales" }, { from: "王二", val: "Hyphomicrobiales" }],
  family: [{ from: "AI", val: "Methylobacteriaceae" }, { from: "杨一", val: "Methylobacteriaceae" }, { from: "王二", val: "Methylobacteriaceae" }],
  genus: [{ from: "AI", val: "Methylobacterium" }, { from: "杨一", val: "Methylobacterium" }, { from: "王二", val: "Methylobacterium" }],
  species: [{ from: "AI", val: "Methylobacterium fujisawaense" }, { from: "杨一", val: "Methylobacterium fujisawaense" }, { from: "王二", val: "Methylobacterium fujisawaense" }],
  strain: [{ from: "AI", val: "DSM 1538" }, { from: "杨一", val: "DSM 1538" }, { from: "王二", val: "DSM 1538" }],
  prevNames: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  strainDesig: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  typeStrain: [{ from: "AI", val: "No" }, { from: "杨一", val: "No" }, { from: "王二", val: "not provided" }],
  tmin: [{ from: "AI", val: "" }, { from: "杨一", val: "8" }, { from: "王二", val: "0" }],
  tmax: [{ from: "AI", val: "37" }, { from: "杨一", val: "37" }, { from: "王二", val: "37" }],
  toptMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  toptMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  topt: [{ from: "AI", val: "" }, { from: "杨一", val: "28" }, { from: "王二", val: "" }],
  phMin: [{ from: "AI", val: "5" }, { from: "杨一", val: "5" }, { from: "王二", val: "5" }],
  phMax: [{ from: "AI", val: "12" }, { from: "杨一", val: "9" }, { from: "王二", val: "12" }],
  phOptMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  phOptMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  phOpt: [{ from: "AI", val: "" }, { from: "杨一", val: "7.0" }, { from: "王二", val: "" }],
  naclMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  naclMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  naclOptMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  naclOptMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  naclOpt: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  optRate: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  rate: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  doubleTime: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  optDoubleTime: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  maxCellYieldV: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  maxCellYieldW: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  substrates: [{ from: "AI", val: "" }, { from: "杨一", val: "methane, methanol, formate" }, { from: "王二", val: "methane, methanol" }],
  nonSubstrates: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  growthDesc: [{ from: "AI", val: "" }, { from: "杨一", val: "Strain DSM 1538 grows at temperatures between 8–37 °C." }, { from: "王二", val: "" }],
  environment: [{ from: "AI", val: "" }, { from: "杨一", val: "Soil" }, { from: "王二", val: "" }],
  envCategory: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  source: [{ from: "AI", val: "" }, { from: "杨一", val: "DSMZ culture collection" }, { from: "王二", val: "" }],
  location: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  gcContent: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  oxygenTol: [{ from: "AI", val: "" }, { from: "杨一", val: "aerobic" }, { from: "王二", val: "" }],
  shape: [{ from: "AI", val: "" }, { from: "杨一", val: "rod" }, { from: "王二", val: "" }],
  gramRxn: [{ from: "AI", val: "" }, { from: "杨一", val: "negative" }, { from: "王二", val: "" }],
  motility: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  cellSurface: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  wMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  wMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  lMin: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  lMax: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  morphDesc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  dsmz: [{ from: "AI", val: "DSM 1538" }, { from: "杨一", val: "DSM 1538" }, { from: "王二", val: "DSM 1538" }],
  atcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  jcm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  ocm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  cgmcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  mcm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  nbrc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  vkm: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  smcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  ncbiTaxId: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  bacdiveId: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  rRNA16s: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  mcrA: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  genomeAcc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  genbankAssembly: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  nitrogenSrc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  sulfurSrc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  essentialGrowth: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  growthInhibitors: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  growthStim: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  antibioticRes: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  collectionNum: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  strainHistory: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  lysisSusc: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
  includedStrains: [{ from: "AI", val: "" }, { from: "杨一", val: "" }, { from: "王二", val: "" }],
};

export const REVIEW_SOURCES: Record<string, SourceMap> = { s1: s1Sources, s2: s2Sources };

// ── 初始菌株（当前合并值）──────────────────────────────────────
export function initialStrains(): Strain[] {
  return [
    {
      id: "s1",
      name: "F5.4",
      confirmed: {},
      editing: {},
      locs: {},
      customLocs: [],
      vals: {
        ...emptyVals(),
        domain: "Bacteria",
        phylum: "Pseudomonadota",
        class: "Alphaproteobacteria",
        order: "Hyphomicrobiales",
        family: "Methylobacteriaceae",
        genus: "Methylobacterium",
        species: "Methylobacterium fujisawaense",
        strain: "F5.4",
        typeStrain: "No",
        tmin: "0",
        tmax: "37",
        phMin: "5",
        phMax: "12",
        naclMin: "0.000",
        naclMax: "0.513",
        substrates:
          "methane, methanol, MSA, formate, mono- di- and tri-methylamines, methylsulphate, acetate, lactate, citrate, succinate, benzoate, ethanol, 2-propanol, 1-butanol, 2-butanol, glycerol, mannitol, sorbitol, glucose, mannose, galactose, fructose, maltose, lactose, sucrose, benzene, xylene, styrene, naphthalene, phenol, MTBE, TCE, SDS, MarlonA, CdCl2, K2Cr2O7, HgCl2, PbCl2, KH2AsO4",
        nonSubstrates: "benzene, xylenes, styrene, naphthalene, TCE, MTBE",
        growthDesc:
          "Strain F5.4 can grow at temperatures between 8 °C and 37 °C, tolerates pH from 5 to 12, and can withstand the presence of various organic pollutants and heavy metals. It does not utilize multicarbon compounds as a carbon source.",
        environment: "Soil",
        source:
          "Sediment sample from a brackish marsh in the estuary of the River Douro, Oporto, Portugal; sediment samples from the Siberian soda lakes Suduntuiskii Torom, Khuzhirta and Gorbunka; common orchard soil; soil samples from an area contaminated with chemical industrial waste in Estarreja, Portugal",
        gramRxn: "not provided",
        growthInhibitors: "arsenate (-), cadmium (-), chromate (-), mercury (-), lead (-) (up to 20 ppm)",
      },
    },
    {
      id: "s2",
      name: "DSM 1538",
      confirmed: {},
      editing: {},
      locs: {},
      customLocs: [],
      vals: {
        ...emptyVals(),
        domain: "Bacteria",
        phylum: "Pseudomonadota",
        class: "Alphaproteobacteria",
        order: "Hyphomicrobiales",
        family: "Methylobacteriaceae",
        genus: "Methylobacterium",
        species: "Methylobacterium fujisawaense",
        strain: "DSM 1538",
        typeStrain: "No",
        dsmz: "DSM 1538",
      },
    },
  ];
}

export const FILES: FileEntry[] = [
  { id: 1, name: "Methylobacterium fujisawaense", pid: "Mob1001", st: "active" },
  { id: 2, name: "Methanosarcina mazei", pid: "Mob1002", st: "active" },
  { id: 3, name: "Desulfovibrio vulgaris", pid: "Mob1003", st: "pending" },
  { id: 4, name: "Chlorobium tepidum", pid: "Mob1004", st: "pending" },
  { id: 5, name: "Thermus thermophilus", pid: "Mob1005", st: "done" },
  { id: 6, name: "Bacillus subtilis", pid: "Mob1006", st: "done" },
  { id: 7, name: "Pseudomonas aeruginosa", pid: "Mob1007", st: "done" },
];

export const DB_STRAINS: DbStrain[] = [
  {
    id: "db1",
    name: "F5.4",
    species: "Methylobacterium fujisawaense",
    src: "Vergne et al. (2002) Int J Syst Evol Microbiol",
    previewVals: {
      domain: "Bacteria", phylum: "Pseudomonadota", class: "Alphaproteobacteria",
      order: "Hyphomicrobiales", family: "Methylobacteriaceae", genus: "Methylobacterium",
      species: "Methylobacterium fujisawaense", strain: "F5.4", typeStrain: "No",
      tmin: "0", tmax: "37", phMin: "5", phMax: "12", naclMin: "0.000", naclMax: "0.513",
      environment: "Soil", gramRxn: "not provided",
      substrates: "methane, methanol, MSA, formate, mono- di- and tri-methylamines",
      growthInhibitors: "arsenate (-), cadmium (-), chromate (-), mercury (-), lead (-) (up to 20 ppm)",
      source: "Sediment sample from a brackish marsh in the estuary of the River Douro, Oporto, Portugal",
    },
  },
  {
    id: "db2",
    name: "ATCC 27946",
    species: "Methylobacterium organophilum",
    src: "Patt et al. (1976) Int J Syst Bacteriol",
    previewVals: {
      domain: "Bacteria", phylum: "Pseudomonadota", class: "Alphaproteobacteria",
      order: "Hyphomicrobiales", family: "Methylobacteriaceae", genus: "Methylobacterium",
      species: "Methylobacterium organophilum", strain: "ATCC 27946", typeStrain: "Yes",
      tmin: "15", tmax: "35", phMin: "6", phMax: "8", phOpt: "7.0",
      environment: "Soil", gramRxn: "negative", motility: "Yes",
      substrates: "methane, methanol, formate", atcc: "ATCC 27946",
    },
  },
  {
    id: "db3",
    name: "CM4",
    species: "Methylobacterium extorquens",
    src: "Marx & Lidstrom (2004) Microbiology",
    previewVals: {
      domain: "Bacteria", phylum: "Pseudomonadota", genus: "Methylobacterium",
      species: "Methylobacterium extorquens", strain: "CM4", typeStrain: "No",
      tmin: "10", tmax: "37", topt: "28", phMin: "5.5", phMax: "9", phOpt: "7.2",
      gramRxn: "negative", motility: "Yes", shape: "rod",
      substrates: "methanol, methylamine, chloromethane", source: "Forest soil, Germany",
    },
  },
  {
    id: "db4",
    name: "DSM 5689",
    species: "Methylobacterium mesophilicum",
    src: "Green & Bousfield (1983) Int J Syst Bacteriol",
    previewVals: {
      domain: "Bacteria", phylum: "Pseudomonadota", genus: "Methylobacterium",
      species: "Methylobacterium mesophilicum", strain: "DSM 5689",
      typeStrain: "Yes", tmin: "10", tmax: "40", topt: "25", phMin: "5", phMax: "9",
      gramRxn: "negative", motility: "No", dsmz: "DSM 5689",
    },
  },
  {
    id: "db5",
    name: "BJ001",
    species: "Methylobacterium populi",
    src: "Van Aken et al. (2004) Int J Syst Evol Microbiol",
    previewVals: {
      domain: "Bacteria", phylum: "Pseudomonadota", genus: "Methylobacterium",
      species: "Methylobacterium populi", strain: "BJ001",
      typeStrain: "Yes", tmin: "15", tmax: "37", phMin: "5.5", phMax: "8.5",
      environment: "Plant tissue", gramRxn: "negative",
      source: "Populus deltoides × nigra DN34 tissue culture",
    },
  },
];

export const ST_DOT: Record<string, string> = { active: "var(--or)", done: "var(--gn)", pending: "var(--t4)" };
export const ST_LBL: Record<string, string> = { active: "进行中", done: "已完成", pending: "待进行" };
export const COLORS = ["#2557E8", "#7C3AED", "#0369A1", "#B45309", "#15803D", "#9D174D", "#0891B2"];
export const AVATAR_COLORS: Record<string, string> = { AI: "#1E40AF", 杨一: "#7C3AED", 王二: "#B45309", 李四: "#15803D" };
