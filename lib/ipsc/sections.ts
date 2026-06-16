// Canonical section / field schema for the iPSC literature-review feature.
// Mirrors the `SECTIONS` definition in temp/IPSC.html so the API can return
// data in exactly the shape the frontend expects (section ids, field keys,
// types and radio options). Used by both the importer and the query API.

export type FieldType = "text" | "textarea" | "list" | "radio" | "score";

export interface FieldDef {
  key: string; // 中文字段键，组成 rid 的后半段，如 "元数据质量"
  label: string;
  type: FieldType;
  opts?: string[]; // radio 选项
  enKey?: string; // 对应英文 JSON 键；缺省表示由代码派生
}

export interface SectionDef {
  id: string; // rid 前缀，如 "ds"
  title: string; // 卡片标题
  enSrc: string; // 英文 JSON 分区键，如 "dataset_metadata"
  type: "object" | "array" | "evidence";
  itemLabel?: string; // array 类型的单项标签
  fields?: FieldDef[];
}

export const BOOL = ["是", "否", "未知"];

export const SECTIONS: SectionDef[] = [
  {
    id: "lit",
    title: "文献元数据",
    enSrc: "paper_metadata",
    type: "object",
    fields: [
      { key: "标题", label: "标题", type: "textarea", enKey: "title" },
      { key: "年份", label: "年份", type: "text", enKey: "year" },
      { key: "期刊", label: "期刊", type: "text", enKey: "journal" },
      { key: "DOI", label: "DOI", type: "text", enKey: "doi" },
      { key: "PMID", label: "PMID", type: "text", enKey: "pmid" },
      { key: "URL", label: "URL", type: "text", enKey: "url" },
      { key: "通讯作者", label: "通讯作者", type: "textarea", enKey: "corresponding_author" },
      { key: "证据类型", label: "证据类型", type: "text", enKey: "evidence_type" },
      { key: "文献ID", label: "文献 ID", type: "textarea", enKey: "paper_id" },
    ],
  },
  {
    id: "ds",
    title: "数据集元数据",
    enSrc: "dataset_metadata",
    type: "object",
    fields: [
      { key: "数据集ID", label: "数据集 ID", type: "text", enKey: "dataset_id" },
      { key: "accession", label: "Accession", type: "text", enKey: "accession" },
      { key: "仓库", label: "仓库", type: "text", enKey: "repository" },
      { key: "物种", label: "物种", type: "text", enKey: "species" },
      { key: "细胞来源", label: "细胞来源", type: "text", enKey: "cell_source" },
      { key: "iPSC细胞系", label: "iPSC 细胞系", type: "text", enKey: "ipsc_cell_source" },
      { key: "donor数量", label: "Donor 数量", type: "text", enKey: "donor_count" },
      { key: "数据格式", label: "数据格式", type: "text", enKey: "data_format" },
      { key: "是否有processed数据", label: "有 processed 数据", type: "radio", opts: BOOL, enKey: "has_processed_data" },
      { key: "是否有raw数据", label: "有 raw 数据", type: "radio", opts: BOOL, enKey: "has_raw_data" },
      { key: "元数据质量", label: "元数据质量", type: "radio", opts: ["高", "中", "低"], enKey: "metadata_quality" },
    ],
  },
  {
    id: "proto",
    title: "分化协议",
    enSrc: "differentiation_protocol",
    type: "object",
    fields: [
      { key: "目标谱系", label: "目标谱系", type: "text", enKey: "target_lineage" },
      { key: "协议名称", label: "协议名称", type: "text", enKey: "protocol_name" },
      { key: "协议阶段", label: "协议阶段", type: "list", enKey: "protocol_stages" },
      { key: "时间点标签", label: "时间点标签", type: "list", enKey: "timepoint_labels" },
      { key: "时间点天数", label: "时间点天数", type: "list", enKey: "timepoint_days" },
      { key: "终点天数", label: "终点天数", type: "text", enKey: "endpoint_day" },
      { key: "培养形式", label: "培养形式", type: "text", enKey: "culture_format" },
      { key: "基质", label: "基质", type: "text", enKey: "matrix_or_coating" },
      { key: "氧条件", label: "氧条件", type: "text", enKey: "oxygen_condition" },
      { key: "接种密度", label: "接种密度", type: "text", enKey: "seeding_density" },
      { key: "基础培养基", label: "基础培养基", type: "text" }, // 派生自 culture_conditions[0].medium_name
    ],
  },
  {
    id: "cond",
    title: "培养条件",
    enSrc: "culture_conditions",
    type: "array",
    itemLabel: "条件",
    fields: [
      { key: "条件ID", label: "条件 ID", type: "text" },
      { key: "培养基名称", label: "培养基名称", type: "text" },
      { key: "培养基组分", label: "培养基组分", type: "list" },
      { key: "组分类型", label: "组分类型", type: "text" },
      { key: "小分子名称", label: "小分子名称", type: "text" },
      { key: "小分子SMILES", label: "小分子 SMILES", type: "text" },
      { key: "生长因子名称", label: "生长因子", type: "text" },
      { key: "细胞因子名称", label: "细胞因子", type: "text" },
      { key: "抑制剂或激动剂", label: "抑制剂/激动剂", type: "text" },
      { key: "靶向通路", label: "靶向通路", type: "text" },
      { key: "剂量", label: "剂量", type: "text" },
      { key: "剂量单位", label: "剂量单位", type: "text" },
      { key: "暴露开始天数", label: "暴露开始(天)", type: "text" },
      { key: "暴露结束天数", label: "暴露结束(天)", type: "text" },
      { key: "暴露持续天数", label: "暴露持续(天)", type: "text" },
      { key: "换液频率", label: "换液频率", type: "text" },
    ],
  },
  {
    id: "sc",
    title: "单细胞数据",
    enSrc: "single_cell_data",
    type: "object",
    fields: [
      { key: "scRNA平台", label: "scRNA 平台", type: "textarea", enKey: "scrna_platform" },
      { key: "细胞数量", label: "细胞数量", type: "text", enKey: "cell_count" },
      { key: "检测时间点", label: "检测时间点", type: "list", enKey: "assayed_timepoints" },
      { key: "是否有processed矩阵", label: "有 processed 矩阵", type: "radio", opts: BOOL, enKey: "has_processed_matrix" },
      { key: "是否有元数据", label: "有元数据", type: "radio", opts: BOOL, enKey: "has_metadata" },
      { key: "是否有细胞类型注释", label: "有细胞类型注释", type: "radio", opts: BOOL, enKey: "has_cell_type_annotation" },
      { key: "是否有谱系注释", label: "有谱系注释", type: "radio", opts: BOOL, enKey: "has_lineage_annotation" },
      { key: "是否有轨迹注释", label: "有轨迹注释", type: "radio", opts: BOOL, enKey: "has_trajectory_annotation" },
    ],
  },
  {
    id: "res",
    title: "结果读出",
    enSrc: "outcome_readouts",
    type: "object",
    fields: [
      { key: "目标细胞比例", label: "目标细胞比例", type: "text", enKey: "target_cell_fraction" },
      { key: "marker基因表达", label: "marker 基因表达", type: "list", enKey: "marker_gene_expression" },
      { key: "marker蛋白实验", label: "marker 蛋白实验", type: "list", enKey: "marker_protein_assay" },
      { key: "流式marker", label: "流式 marker", type: "list", enKey: "flow_markers" },
      { key: "增殖评分", label: "增殖评分", type: "text", enKey: "proliferation_score" },
      { key: "凋亡评分", label: "凋亡评分", type: "text", enKey: "apoptosis_score" },
      { key: "多能性残留评分", label: "多能性残留评分", type: "text", enKey: "residual_pluripotency_score" },
      { key: "off_target细胞类型", label: "off-target 细胞类型", type: "list", enKey: "off_target_cell_types" },
      { key: "off_target比例", label: "off-target 比例", type: "text", enKey: "off_target_fraction" },
      { key: "成熟度评分", label: "成熟度评分", type: "text", enKey: "maturity_score" },
      { key: "功能实验", label: "功能实验", type: "list", enKey: "functional_assays" },
    ],
  },
  {
    id: "bench",
    title: "基准适用性",
    enSrc: "benchmark_suitability",
    type: "object",
    fields: [
      { key: "未处理轨迹评分", label: "未处理轨迹评分", type: "score", enKey: "untreated_trajectory_score" },
      { key: "条件编码评分", label: "条件编码评分", type: "score", enKey: "condition_encoding_score" },
      { key: "recipe优化评分", label: "recipe 优化评分", type: "score", enKey: "recipe_optimization_score" },
      { key: "数据可获取性评分", label: "数据可获取性评分", type: "score", enKey: "data_availability_score" },
      { key: "元数据完整度评分", label: "元数据完整度评分", type: "score", enKey: "metadata_completeness_score" },
      { key: "推荐阶段", label: "推荐阶段", type: "radio", opts: ["优先纳入", "纳入", "谨慎纳入", "不纳入"], enKey: "recommendation_stage" },
      { key: "局限性", label: "局限性", type: "list", enKey: "limitations" },
    ],
  },
  { id: "evidence", title: "证据追踪", enSrc: "evidence_tracking", type: "evidence" },
];

export const SECTION_BY_ID: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
);
