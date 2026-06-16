"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./strain-review.css";
import {
  ALL_FIELDS,
  AVATAR_COLORS,
  COLORS,
  DB_STRAINS,
  emptyVals,
  FILES,
  initialStrains,
  REVIEW_SOURCES,
  SECTIONS,
  ST_DOT,
  type DbStrain,
  type Field,
  type PageMode,
  type ReviewSource,
  type Strain,
} from "./data";

type ToastType = "tok" | "twrn" | "tinf";
interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}
interface ActiveField {
  key: string;
  idx: number;
}
type AddMode = "idle" | "results" | "noresults" | "blank";

const FIELD_BY_KEY = new Map<string, Field>(ALL_FIELDS.map((f) => [f.key, f]));

// PDF 上预置的可定位文本片段（与原型一致）
const PDF_LOC_TEXT: Record<string, string> = {
  species: "Methylobacterium fujisawaense",
  strain: "F5.4",
  tmin: "0",
  tmax: "37",
  phmin: "5",
  phmax: "12",
  naclmax: "0.513",
  substrates: "methane, methanol, MSA, formate…",
  growth: "Strain F5.4 can grow at temperatures between 8 °C and 37 °C…",
};

export default function StrainReview() {
  const [strains, setStrains] = useState<Strain[]>(() => initialStrains());
  const [curStrain, setCurStrain] = useState(0);
  const [pageMode, setPageMode] = useState<PageMode>("rev-pending");
  const [revExpanded, setRevExpanded] = useState<Record<string, boolean>>({});
  const [leftOpen, setLeftOpen] = useState(false);
  const [stFilter, setStFilter] = useState<"all" | "pending" | "active" | "done">("all");
  const [fileSearch, setFileSearch] = useState("");
  const [strainListOpen, setStrainListOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flashKey, setFlashKey] = useState<string | null>(null);

  // 弹窗
  const [startReviewOpen, setStartReviewOpen] = useState(false);
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);
  const [delIdx, setDelIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ idx: number; x: number; y: number } | null>(null);

  // 定位高亮
  const [showIds, setShowIds] = useState<string[]>([]);
  const [currentLocId, setCurrentLocId] = useState<string | null>(null);
  const [actLocId, setActLocId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [rightWidth, setRightWidth] = useState<number | null>(null);
  const [resizing, setResizing] = useState(false);

  // 新增主体弹窗内部状态
  const [addMode, setAddMode] = useState<AddMode>("idle");
  const [addQuery, setAddQuery] = useState("");
  const [addSelectedId, setAddSelectedId] = useState<string | null>(null);
  const [blankName, setBlankName] = useState("");

  const pdfPageRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeq = useRef(0);
  const locSeq = useRef(0);
  const dragState = useRef<{ startX: number; startY: number } | null>(null);

  const strain = strains[curStrain];
  const isReadOnly = pageMode === "rev-pending" || pageMode === "submitted" || pageMode === "locked";
  const sources = useMemo(() => (strain ? REVIEW_SOURCES[strain.id] ?? {} : {}), [strain]);

  // ── Toast ──────────────────────────────────────────────────
  const showT = useCallback((msg: string, type: ToastType = "tok") => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  // ── 定位辅助 ────────────────────────────────────────────────
  const getLocsFor = useCallback(
    (key: string): string[] => {
      if (!strain) return [];
      const stored = strain.locs[key];
      if (Array.isArray(stored)) return stored;
      const def = FIELD_BY_KEY.get(key);
      return def?.loc ? [def.loc] : [];
    },
    [strain],
  );

  const mutateStrain = useCallback(
    (fn: (s: Strain) => Strain) => {
      setStrains((prev) => prev.map((s, i) => (i === curStrain ? fn(s) : s)));
    },
    [curStrain],
  );

  const clearHighlights = useCallback(() => {
    setShowIds([]);
    setCurrentLocId(null);
    setActLocId(null);
    setSelectedLoc(null);
  }, []);

  // 字段定位按钮：在多个定位间循环
  const onLocCycle = useCallback(
    (key: string) => {
      if (picking) return;
      setActLocId(null);
      const locs = getLocsFor(key);
      if (!locs.length) return;
      setActiveField((prev) => {
        const idx = prev && prev.key === key ? (prev.idx + 1) % locs.length : 0;
        setShowIds(locs);
        setCurrentLocId(locs[idx]);
        return { key, idx };
      });
      setSelectedLoc(null);
    },
    [picking, getLocsFor],
  );

  // 开始框选新增定位
  const startPick = useCallback(
    (key: string) => {
      if (isReadOnly) return;
      if (picking) {
        setPicking(null);
        return;
      }
      setPicking(key);
      setActLocId(null);
      setSelectedLoc(null);
      const locs = getLocsFor(key);
      if (locs.length) {
        setActiveField({ key, idx: 0 });
        setShowIds(locs);
        setCurrentLocId(locs[0]);
      } else {
        setActiveField(null);
        setShowIds([]);
        setCurrentLocId(null);
      }
    },
    [isReadOnly, picking, getLocsFor],
  );

  const cancelPick = useCallback(() => {
    setPicking(null);
    setDragRect(null);
    dragState.current = null;
  }, []);

  // 来源面板「定位」按钮：单点高亮
  const locateSource = useCallback(
    (loc: string) => {
      setActiveField(null);
      setShowIds([]);
      setCurrentLocId(null);
      setSelectedLoc(null);
      setActLocId((prev) => (prev === loc ? null : loc));
    },
    [],
  );

  const removeLoc = useCallback(
    (key: string, id: string) => {
      mutateStrain((s) => {
        const cur = Array.isArray(s.locs[key]) ? s.locs[key] : (FIELD_BY_KEY.get(key)?.loc ? [FIELD_BY_KEY.get(key)!.loc!] : []);
        return {
          ...s,
          locs: { ...s.locs, [key]: cur.filter((x) => x !== id) },
          customLocs: id.startsWith("auto-") ? s.customLocs.filter((c) => c.id !== id) : s.customLocs,
        };
      });
      setSelectedLoc(null);
      setShowIds((ids) => ids.filter((x) => x !== id));
      setCurrentLocId((c) => (c === id ? null : c));
      showT("定位已删除", "tinf");
    },
    [mutateStrain, showT],
  );

  // ── PDF 框选拖拽 ────────────────────────────────────────────
  const onPdfMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!picking || !pdfPageRef.current) return;
      e.preventDefault();
      const pr = pdfPageRef.current.getBoundingClientRect();
      const sx = e.clientX - pr.left;
      const sy = e.clientY - pr.top;
      dragState.current = { startX: sx, startY: sy };
      setDragRect({ x: sx, y: sy, w: 0, h: 0 });
    },
    [picking],
  );

  useEffect(() => {
    if (!dragState.current) return;
    const onMove = (e: MouseEvent) => {
      if (!dragState.current || !pdfPageRef.current) return;
      const pr = pdfPageRef.current.getBoundingClientRect();
      const cx = e.clientX - pr.left;
      const cy = e.clientY - pr.top;
      const { startX, startY } = dragState.current;
      setDragRect({ x: Math.min(startX, cx), y: Math.min(startY, cy), w: Math.abs(cx - startX), h: Math.abs(cy - startY) });
    };
    const onUp = () => {
      const r = dragState.current;
      dragState.current = null;
      setDragRect((rect) => {
        if (r && rect && rect.w >= 8 && rect.h >= 8 && picking) {
          const id = `auto-${Date.now()}-${++locSeq.current}`;
          const key = picking;
          mutateStrain((s) => {
            const cur = Array.isArray(s.locs[key]) ? s.locs[key] : (FIELD_BY_KEY.get(key)?.loc ? [FIELD_BY_KEY.get(key)!.loc!] : []);
            return {
              ...s,
              locs: { ...s.locs, [key]: [...cur, id] },
              customLocs: [...s.customLocs, { id, x: rect.x, y: rect.y, w: rect.w, h: rect.h }],
            };
          });
          const locs = [...getLocsFor(key), id];
          setActiveField({ key, idx: locs.length - 1 });
          setShowIds(locs);
          setCurrentLocId(id);
          setPicking(null);
          showT("定位已添加", "tok");
        }
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragRect, picking, mutateStrain, getLocsFor, showT]);

  // 滚动到当前定位
  useEffect(() => {
    const id = currentLocId ?? actLocId;
    if (!id) return;
    const el = document.getElementById(`loc-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentLocId, actLocId]);

  // 点击定位元素 → 选中以删除
  const onLocElClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (picking || isReadOnly) return;
      if (!activeField) return; // 仅在当前字段定位高亮时可删
      e.stopPropagation();
      const page = pdfPageRef.current;
      const target = e.currentTarget as HTMLElement;
      if (!page) return;
      const pr = page.getBoundingClientRect();
      const er = target.getBoundingClientRect();
      setSelectedLoc({ id, x: er.right - pr.left, y: er.top - pr.top });
    },
    [picking, isReadOnly, activeField],
  );

  // ── 键盘事件 ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") {
        if (picking) return cancelPick();
        if (selectedLoc) return setSelectedLoc(null);
        if (activeField) {
          setActiveField(null);
          clearHighlights();
          return;
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLoc && activeField) {
          e.preventDefault();
          removeLoc(activeField.key, selectedLoc.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking, selectedLoc, activeField, cancelPick, clearHighlights, removeLoc]);

  // 右侧面板拖拽调宽
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setResizing(true);
      const startX = e.clientX;
      const startW = rightWidth ?? (e.currentTarget.nextElementSibling as HTMLElement)?.offsetWidth ?? 600;
      const onMove = (ev: MouseEvent) => {
        const w = Math.max(400, Math.min(800, startW + (startX - ev.clientX)));
        setRightWidth(w);
      };
      const onUp = () => {
        setResizing(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [rightWidth],
  );

  // 外部点击关闭下拉/菜单
  useEffect(() => {
    const onDoc = () => {
      setStrainListOpen(false);
      setCtxMenu(null);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // ── 字段编辑 ────────────────────────────────────────────────
  const editField = useCallback(
    (key: string) => {
      if (pageMode !== "review") return;
      mutateStrain((s) => ({ ...s, editing: { ...s.editing, [key]: true }, confirmed: { ...s.confirmed, [key]: false } }));
      setTimeout(() => {
        const row = document.getElementById(`row-${key}`);
        const inp = row?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input,textarea");
        if (inp) {
          inp.focus();
          if ("select" in inp) inp.select();
        }
      }, 30);
    },
    [pageMode, mutateStrain],
  );

  const updateField = useCallback(
    (key: string, val: string) => {
      mutateStrain((s) => {
        const next: Strain = { ...s, vals: { ...s.vals, [key]: val }, confirmed: { ...s.confirmed, [key]: false } };
        if (key === "strain" && val) next.name = val;
        return next;
      });
    },
    [mutateStrain],
  );

  const scheduleBlur = useCallback(
    (key: string) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => {
        mutateStrain((s) => {
          if (!s.editing[key]) return s;
          const editing = { ...s.editing };
          delete editing[key];
          return { ...s, editing };
        });
      }, 150);
    },
    [mutateStrain],
  );

  const confirmField = useCallback(
    (key: string) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      mutateStrain((s) => {
        const editing = { ...s.editing };
        delete editing[key];
        const next: Strain = { ...s, editing, confirmed: { ...s.confirmed, [key]: true } };
        if (key === "strain" && s.vals[key]) next.name = s.vals[key];
        return next;
      });
      setRevExpanded((r) => ({ ...r, [key]: false }));
      setFlashKey(key);
      setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 950);
    },
    [mutateStrain],
  );

  const adoptVal = useCallback(
    (key: string, val: string) => {
      mutateStrain((s) => {
        const next: Strain = { ...s, vals: { ...s.vals, [key]: val }, confirmed: { ...s.confirmed, [key]: false } };
        if (key === "strain" && val) next.name = val;
        return next;
      });
      showT("已采纳", "tok");
    },
    [mutateStrain, showT],
  );

  const toggleRevSrc = useCallback((key: string) => {
    setRevExpanded((r) => ({ ...r, [key]: !r[key] }));
  }, []);

  // ── 模式切换 ────────────────────────────────────────────────
  const confirmStartReview = () => {
    setStartReviewOpen(false);
    setPageMode("review");
    setRevExpanded({});
    showT("审核已开始，计时中…", "tinf");
  };
  const confirmSubmitReview = () => {
    setSubmitReviewOpen(false);
    setPageMode("submitted");
    setRevExpanded({});
    showT("审核结果已提交，等待验收", "tok");
  };
  const withdrawReview = () => {
    setPageMode("review");
    setRevExpanded({});
    showT("已撤回，可继续修改", "tinf");
  };

  // ── 菌株标签 ────────────────────────────────────────────────
  const isTabDone = (s: Strain) => ALL_FIELDS.length > 0 && ALL_FIELDS.every((f) => s.confirmed[f.key]);

  const selectStrain = (i: number) => {
    if (i < 0 || i >= strains.length) return;
    setCurStrain(i);
    setStrainListOpen(false);
    setRevExpanded({});
    setActiveField(null);
    clearHighlights();
  };

  const confirmDel = () => {
    if (delIdx == null) return;
    setStrains((prev) => prev.filter((_, i) => i !== delIdx));
    setCurStrain((c) => (delIdx <= c ? Math.max(0, c - 1) : c));
    setDelIdx(null);
    showT("主体已删除", "tok");
  };

  // ── 新增主体 ────────────────────────────────────────────────
  const addResults = useMemo(() => {
    const q = addQuery.toLowerCase();
    if (!q) return [];
    return DB_STRAINS.filter((s) => s.name.toLowerCase().includes(q) || s.species.toLowerCase().includes(q));
  }, [addQuery]);

  const openAddStrain = () => {
    setAddMode("idle");
    setAddQuery("");
    setAddSelectedId(null);
    setBlankName("");
    setAddOpen(true);
  };
  const onAddSearch = (q: string) => {
    setAddQuery(q);
    setAddSelectedId(null);
    if (!q) setAddMode("idle");
    else {
      const has = DB_STRAINS.some((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.species.toLowerCase().includes(q.toLowerCase()));
      setAddMode(has ? "results" : "noresults");
    }
  };
  const confirmAddStrain = () => {
    let newStrain: Strain | null = null;
    if (addMode === "results" && addSelectedId) {
      const d = DB_STRAINS.find((s) => s.id === addSelectedId);
      if (!d) return showT("请先选中一条主体", "twrn");
      newStrain = {
        id: `s${Date.now()}`,
        name: d.name,
        confirmed: {},
        editing: {},
        locs: {},
        customLocs: [],
        vals: { ...emptyVals(), ...d.previewVals, strain: d.name, species: d.species },
      };
    } else if (addMode === "blank") {
      const name = blankName.trim();
      if (!name) return showT("请填写主体名称", "twrn");
      newStrain = { id: `s${Date.now()}`, name, confirmed: {}, editing: {}, locs: {}, customLocs: [], vals: emptyVals() };
    } else {
      return showT("请先选中或创建主体", "twrn");
    }
    setStrains((prev) => [...prev, newStrain!]);
    setCurStrain(strains.length);
    setAddOpen(false);
    showT("主体已添加", "tok");
  };

  // ── 侧栏文件 ────────────────────────────────────────────────
  const filteredFiles = useMemo(() => {
    const q = fileSearch.toLowerCase();
    return FILES.filter(
      (f) => (stFilter === "all" || f.st === stFilter) && (!q || f.name.toLowerCase().includes(q) || f.pid.toLowerCase().includes(q)),
    );
  }, [fileSearch, stFilter]);

  if (!strain) {
    return <div className="mc-root" />;
  }

  // 计算某 loc id 的样式类
  const locClass = (id: string) => {
    const cls: string[] = [];
    if (showIds.includes(id)) {
      cls.push("loc-show");
      if (id === currentLocId) cls.push("loc-show-current");
    }
    if (id === actLocId) cls.push("hi-act");
    if (selectedLoc?.id === id) cls.push("loc-selected");
    return cls.join(" ");
  };

  return (
    <div className={`mc-root${picking ? " picking-loc" : ""}`}>
      {/* ── Topbar ── */}
      <header className="topbar">
        <button className="tb-back" onClick={() => showT("返回首页", "tinf")}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 4L6 8l4 4" /></svg>
        </button>
        <span className="tb-title">{strain.vals.species || "Methylobacterium fujisawaense"} — 菌株审核</span>
        <div className="tb-sp" />
        <div className="tb-links">
          <button className="tb-link-btn pdf" onClick={() => showT("打开原文 PDF", "tinf")}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="1" width="10" height="12" rx="1.5" /><path d="M4 5h6M4 7.5h6M4 10h4" strokeLinecap="round" /></svg>原文 PDF
          </button>
          <button className="tb-link-btn url" onClick={() => showT("打开原文链接", "tinf")}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5.5 8.5l3-3M8 5l1.5-1.5a2.12 2.12 0 013 3L11 8M6 9l-1.5 1.5a2.12 2.12 0 01-3-3L3 6" strokeLinecap="round" /></svg>原文链接
          </button>
        </div>
        <button className="tb-notif">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 5h-15S4 11.5 4 8a6 6 0 016-6zM8.5 16a1.5 1.5 0 003 0" /></svg>
          <span className="tb-badge">5</span>
        </button>
        <div className="tb-av">李</div>
      </header>

      <div className="shell">
        {/* ── Left sidebar ── */}
        <aside className={`left${leftOpen ? " open" : ""}`}>
          <div className="left-hd">
            <button className="left-toggle" onClick={() => setLeftOpen((v) => !v)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M2 4h12M2 8h9M2 12h6" /></svg>
            </button>
          </div>
          <div className="left-icons">
            <div className="left-icons-scroll">
              {FILES.slice(0, 30).map((f, i) => (
                <div
                  key={f.id}
                  className={`left-icon${f.id === 1 ? " on" : ""}`}
                  onClick={() => showT("切换至文件 #" + f.id, "tinf")}
                  title={f.name}
                >
                  <div className="left-icon-av" style={{ background: COLORS[i % COLORS.length] }}>
                    {f.name.replace(/[^A-Z0-9]/g, "").slice(0, 2) || f.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="sdot" style={{ background: ST_DOT[f.st] }} />
                </div>
              ))}
            </div>
          </div>
          <div className="left-filters">
            <div className="left-search">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4" /><path d="M10 10l2 2" strokeLinecap="round" /></svg>
              <input placeholder="搜索文件名/PaperIndex" value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} />
            </div>
            <div className="status-chips">
              {([
                ["all", "全部", "all"],
                ["pending", "待进行", "pending-chip"],
                ["active", "进行中", "active-chip"],
                ["done", "已完成", "done-chip"],
              ] as const).map(([val, label, cls]) => (
                <span key={val} className={`st-chip ${cls}${stFilter === val ? " on" : ""}`} onClick={() => setStFilter(val)}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="file-list">
            {!filteredFiles.length ? (
              <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 12.5, color: "var(--t4)" }}>无匹配结果</div>
            ) : (
              filteredFiles.map((f) => (
                <div key={f.id} className={`file-item${f.id === 1 ? " on" : ""}`} onClick={() => showT("切换至文件 #" + f.id, "tinf")}>
                  <span className="file-dot" style={{ background: ST_DOT[f.st] }} />
                  <span className="file-name">{f.name}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Middle: PDF ── */}
        <main className="mid">
          <div className="mid-toolbar">
            <div className="mid-sp" />
            <div className="page-nav">
              <button className="page-btn"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M9 3L5 7l4 4" /></svg></button>
              <input className="page-inp" defaultValue="1" /> <span className="page-total">/ 8</span>
              <button className="page-btn"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M5 3l4 4-4 4" /></svg></button>
            </div>
            <div className="mid-sp" />
          </div>
          <div className="pdf-area" onClick={() => setSelectedLoc(null)}>
            <div className="pdf-page" ref={pdfPageRef} onMouseDown={onPdfMouseDown}>
              <h3>Methylobacterium fujisawaense F5.4</h3>
              <table className="pdf-kv">
                <tbody>
                  <tr><td>Domain</td><td>Bacteria</td></tr>
                  <tr><td>Phylum</td><td>Pseudomonadota</td></tr>
                  <tr><td>Class</td><td>Alphaproteobacteria</td></tr>
                  <tr><td>Species</td><td><LocSpan id="species" className={locClass("species")} onClick={onLocElClick}>{PDF_LOC_TEXT.species}</LocSpan></td></tr>
                  <tr><td>Strain</td><td><LocSpan id="strain" className={locClass("strain")} onClick={onLocElClick}>{PDF_LOC_TEXT.strain}</LocSpan></td></tr>
                  <tr><td>Type Strain</td><td>No</td></tr>
                  <tr><td>Tmin</td><td><LocSpan id="tmin" className={locClass("tmin")} onClick={onLocElClick}>{PDF_LOC_TEXT.tmin}</LocSpan></td></tr>
                  <tr><td>Tmax</td><td><LocSpan id="tmax" className={locClass("tmax")} onClick={onLocElClick}>{PDF_LOC_TEXT.tmax}</LocSpan></td></tr>
                  <tr><td>pHMin</td><td><LocSpan id="phmin" className={locClass("phmin")} onClick={onLocElClick}>{PDF_LOC_TEXT.phmin}</LocSpan></td></tr>
                  <tr><td>pHMax</td><td><LocSpan id="phmax" className={locClass("phmax")} onClick={onLocElClick}>{PDF_LOC_TEXT.phmax}</LocSpan></td></tr>
                  <tr><td>NaCl Max (mol/L)</td><td><LocSpan id="naclmax" className={locClass("naclmax")} onClick={onLocElClick}>{PDF_LOC_TEXT.naclmax}</LocSpan></td></tr>
                  <tr><td>Growth Supporting Substrates</td><td><LocSpan id="substrates" className={locClass("substrates")} onClick={onLocElClick}>{PDF_LOC_TEXT.substrates}</LocSpan></td></tr>
                  <tr><td>Growth Description</td><td><LocSpan id="growth" className={locClass("growth")} onClick={onLocElClick}>{PDF_LOC_TEXT.growth}</LocSpan></td></tr>
                  <tr><td>Environment</td><td>Soil</td></tr>
                  <tr><td>Gram Reaction</td><td>not provided</td></tr>
                  <tr><td>Growth Inhibitors</td><td>arsenate (-), cadmium (-), chromate (-), mercury (-), lead (-) (up to 20 ppm)</td></tr>
                </tbody>
              </table>

              {/* 自定义框选定位 */}
              {strain.customLocs.map((c) => (
                <div
                  key={c.id}
                  id={`loc-${c.id}`}
                  className={`loc-overlay ${locClass(c.id)}`}
                  style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
                  onClick={(e) => onLocElClick(e, c.id)}
                />
              ))}

              {/* 拖拽预览框 */}
              {dragRect && (
                <div className="pdf-drag-rect" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }} />
              )}

              {/* 删除定位按钮 */}
              {selectedLoc && activeField && (
                <button
                  className="loc-del-btn"
                  style={{ left: selectedLoc.x - 9, top: selectedLoc.y - 12 }}
                  title="删除定位 (Delete)"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLoc(activeField.key, selectedLoc.id);
                  }}
                >
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10" /></svg>
                </button>
              )}
            </div>
          </div>
        </main>

        <div className={`drag-handle${resizing ? " dragging" : ""}`} onMouseDown={startResize} />

        {/* ── Right panel ── */}
        <aside className="right" style={rightWidth ? { width: rightWidth, flex: "none" } : undefined}>
          {pageMode === "locked" && (
            <div className="locked-notice">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="6" width="10" height="7" rx="1.5" /><path d="M5 6V4a2 2 0 014 0v2" /></svg>
              <span>验收已开始，数据已锁定，不可修改</span>
            </div>
          )}
          <div className="prog-strip">
            <div style={{ flex: 1 }} />
            {pageMode === "rev-pending" && (
              <button className="btn-start-review" onClick={() => setStartReviewOpen(true)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 3l8 5-8 5V3z" /></svg>
                开始审核
              </button>
            )}
            {pageMode === "review" && (
              <button className="rev-submit-btn" onClick={() => setSubmitReviewOpen(true)}>提交验收</button>
            )}
            {pageMode === "submitted" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="status-pill pending" title="验收人尚未开始，可撤回重新修改">待验收</span>
                <button className="withdraw-btn" onClick={withdrawReview}>撤回</button>
              </div>
            )}
            {pageMode === "locked" && <span className="status-pill locked">验收中</span>}
          </div>

          {/* Strain tabs */}
          <div className="strain-tabs">
            <div className="strain-tab-strip">
              {strains.map((s, i) => {
                const on = i === curStrain;
                const done = isTabDone(s);
                return (
                  <button key={s.id} className={`strain-tab${on ? " on" : ""}`} onClick={() => selectStrain(i)} title={s.name}>
                    {done && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--gnlit)", flexShrink: 0, display: "inline-block", marginRight: 3 }} />}
                    <span>{s.name}</span>
                    {on && (
                      <span
                        className="tab-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setCtxMenu({ idx: i, x: r.left, y: r.bottom + 4 });
                        }}
                      >
                        <svg viewBox="0 0 14 4" fill="currentColor"><circle cx="2" cy="2" r="1.4" /><circle cx="7" cy="2" r="1.4" /><circle cx="12" cy="2" r="1.4" /></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                className="strain-list-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setStrainListOpen((v) => !v);
                }}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M2 4h10M2 7h7M2 10h5" /></svg>全部
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 10, height: 10 }}><path d="M2 3.5l3 3 3-3" /></svg>
              </button>
              {strainListOpen && (
                <div className="strain-list-drop" style={{ position: "absolute", top: "100%", right: 0, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                  {strains.map((s, i) => (
                    <div key={s.id} className={`strain-list-item${i === curStrain ? " on" : ""}`} onClick={() => selectStrain(i)}>
                      <span className="strain-list-idx">{i + 1}</span>
                      <span className="strain-list-name">{s.name}</span>
                      {i === curStrain && (
                        <svg className="strain-list-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l2.5 2.5 5.5-5" /></svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {pageMode === "review" && (
              <button className="strain-tab-add" onClick={openAddStrain} title="新增主体">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
              </button>
            )}
          </div>

          {/* Ann body */}
          <div className={`ann-body${isReadOnly ? " is-readonly" : ""}`}>
            <div className="ann-sec">
              <div className="ann-sec-hd">
                <span className="ann-sec-title">{strain.name}</span>
                {isReadOnly && (
                  <span className="ro-badge">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ width: 10, height: 10 }}><rect x="2" y="5" width="8" height="6" rx="1" /><path d="M4 5V3.5a2 2 0 014 0V5" /></svg>
                    只读
                  </span>
                )}
              </div>
              {ALL_FIELDS.map((f) => (
                <Row
                  key={f.key}
                  field={f}
                  strain={strain}
                  sources={sources[f.key] ?? []}
                  isReadOnly={isReadOnly}
                  expanded={!!revExpanded[f.key]}
                  flash={flashKey === f.key}
                  canAdopt={pageMode === "review"}
                  activeKey={activeField?.key ?? null}
                  picking={picking}
                  locs={getLocsFor(f.key)}
                  onEdit={editField}
                  onUpdate={updateField}
                  onBlur={scheduleBlur}
                  onConfirm={confirmField}
                  onToggleSrc={toggleRevSrc}
                  onAdopt={adoptVal}
                  onLocCycle={onLocCycle}
                  onLocAdd={startPick}
                  onLocateSource={locateSource}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Modals ── */}
      {startReviewOpen && (
        <Modal onClose={() => setStartReviewOpen(false)} maxWidth={460}>
          <div className="m-hd">
            <div><div className="m-title">确认开始审核？</div></div>
            <CloseBtn onClick={() => setStartReviewOpen(false)} />
          </div>
          <div className="m-body" style={{ paddingTop: 0, paddingBottom: 4 }}>
            <div className="warn-box">
              <svg viewBox="0 0 20 20" fill="none" stroke="var(--or)" strokeWidth="1.6" style={{ width: 20, height: 20 }}><circle cx="10" cy="10" r="8" /><path d="M10 6v5M10 13.5h.01" strokeLinecap="round" /></svg>
              <div style={{ fontSize: 13.5, color: "#92400E", lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>开始后请注意</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>系统将开始<strong>计时</strong>，截止时间以任务详情为准</li>
                  <li>审核完成后点击「提交验收」结束任务</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="m-ft">
            <button className="mbtn mbtn-cancel" onClick={() => setStartReviewOpen(false)}>再想想</button>
            <div className="m-ft-right">
              <button className="mbtn mbtn-purple" onClick={confirmStartReview}>确认开始审核</button>
            </div>
          </div>
        </Modal>
      )}

      {submitReviewOpen && (
        <Modal onClose={() => setSubmitReviewOpen(false)} maxWidth={500}>
          <div className="m-hd" style={{ paddingBottom: 16 }}>
            <div><div className="m-title">确认提交验收?</div></div>
            <CloseBtn onClick={() => setSubmitReviewOpen(false)} />
          </div>
          <div className="m-body" style={{ paddingTop: 0, paddingBottom: 8 }}>
            <div className="warn-box">
              <svg viewBox="0 0 20 20" fill="none" stroke="var(--or)" strokeWidth="1.6" style={{ width: 20, height: 20 }}><circle cx="10" cy="10" r="8" /><path d="M10 6v5M10 13.5h.01" strokeLinecap="round" /></svg>
              <span style={{ fontSize: 13.5, color: "#92400E", lineHeight: 1.75 }}>提交后任务进入<strong>待验收</strong>状态。验收人开始前，你可以撤回并继续修改；验收人开始后数据将<strong>锁定不可更改</strong>，请确认已完成所有字段标注。</span>
            </div>
          </div>
          <div className="m-ft">
            <button className="mbtn mbtn-cancel" onClick={() => setSubmitReviewOpen(false)}>再检查一下</button>
            <div className="m-ft-right">
              <button className="mbtn mbtn-primary" onClick={confirmSubmitReview}>确认提交</button>
            </div>
          </div>
        </Modal>
      )}

      {delIdx != null && (
        <Modal onClose={() => setDelIdx(null)} maxWidth={460}>
          <div className="m-hd">
            <div className="m-title">确认删除</div>
            <CloseBtn onClick={() => setDelIdx(null)} />
          </div>
          <div className="m-body" style={{ paddingTop: 14 }}>
            <div className="del-notice">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="8" /><path d="M10 7v4M10 13.5h.01" strokeLinecap="round" /></svg>
              <span>确认删除主体「{strains[delIdx]?.name}」？删除后不可恢复。</span>
            </div>
          </div>
          <div className="m-ft">
            <div className="m-ft-right">
              <button className="mbtn mbtn-cancel" onClick={() => setDelIdx(null)}>取消</button>
              <button className="mbtn mbtn-danger" onClick={confirmDel}>确认删除</button>
            </div>
          </div>
        </Modal>
      )}

      {addOpen && (
        <AddStrainModal
          mode={addMode}
          query={addQuery}
          results={addResults}
          selectedId={addSelectedId}
          blankName={blankName}
          canConfirm={(addMode === "results" && !!addSelectedId) || addMode === "blank"}
          onClose={() => setAddOpen(false)}
          onSearch={onAddSearch}
          onClear={() => {
            setAddQuery("");
            setAddMode("idle");
            setAddSelectedId(null);
          }}
          onSelect={(id) => setAddSelectedId((cur) => (cur === id ? null : id))}
          onSwitchBlank={() => {
            setAddMode("blank");
            setAddSelectedId(null);
            setBlankName(addQuery);
          }}
          onBack={() => {
            setAddMode("idle");
            setAddSelectedId(null);
          }}
          onBlankNameChange={setBlankName}
          onConfirm={confirmAddStrain}
        />
      )}

      {/* Tab context menu */}
      {ctxMenu && (
        <div className="mc-ctx-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div
            className="tab-ctx-item danger"
            style={pageMode !== "review" ? { opacity: 0.35, pointerEvents: "none" } : undefined}
            data-tip={pageMode !== "review" ? "开始审核后才可删除" : undefined}
            onClick={() => {
              setDelIdx(ctxMenu.idx);
              setCtxMenu(null);
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4h10M5 4V2.5h4V4M5.5 7v4M8.5 7v4M3 4l.8 8h6.4L11 4" /></svg>
            删除主体
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="mc-tw">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

// ── 可定位文本片段 ──────────────────────────────────────────────
function LocSpan({
  id,
  className,
  onClick,
  children,
}: {
  id: string;
  className: string;
  onClick: (e: React.MouseEvent, id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span id={`loc-${id}`} className={`hi ${className}`.trim()} onClick={(e) => onClick(e, id)}>
      {children}
    </span>
  );
}

// ── 字段行 ──────────────────────────────────────────────────────
interface RowProps {
  field: Field;
  strain: Strain;
  sources: ReviewSource[];
  isReadOnly: boolean;
  expanded: boolean;
  flash: boolean;
  canAdopt: boolean;
  activeKey: string | null;
  picking: string | null;
  locs: string[];
  onEdit: (key: string) => void;
  onUpdate: (key: string, val: string) => void;
  onBlur: (key: string) => void;
  onConfirm: (key: string) => void;
  onToggleSrc: (key: string) => void;
  onAdopt: (key: string, val: string) => void;
  onLocCycle: (key: string) => void;
  onLocAdd: (key: string) => void;
  onLocateSource: (loc: string) => void;
}

function Row(props: RowProps) {
  const { field: f, strain: s, sources, isReadOnly, expanded, flash, canAdopt, activeKey, picking, locs } = props;
  const conf = !!s.confirmed[f.key];
  const val = s.vals[f.key] || "";
  const isEditing = !isReadOnly && !!s.editing[f.key];

  const hasDiff = sources.length > 0 && sources.some((x) => x.val !== sources[0].val);

  return (
    <>
      <div className={`ann-row${conf ? " ok" : ""}${isEditing ? " ing-editing" : ""}${flash ? " row-flash" : ""}`} id={`row-${f.key}`}>
        <div className="ann-loc">
          {locs.length > 0 && (
            <button
              className={`loc-btn loc-has${activeKey === f.key ? " on" : ""}`}
              onClick={() => props.onLocCycle(f.key)}
              title={locs.length > 1 ? "点击切换定位" : "定位到原文"}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="5.5" r="2.2" /><path d="M7 8c0 0-4 2.5-4 4.5h8c0-2-4-4.5-4-4.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          {!isReadOnly && (
            <button
              className={`loc-btn loc-add${picking === f.key ? " loc-active-pick" : ""}`}
              onClick={() => props.onLocAdd(f.key)}
              title={picking === f.key ? "框选中 (Esc 取消)" : "新增定位"}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
            </button>
          )}
          {locs.length === 0 && isReadOnly && <div className="loc-empty" />}
        </div>
        <div className="ann-lbl" title={f.lbl}>{f.lbl}</div>
        <div className="ann-val-wrap">
          {isEditing ? (
            f.type === "radio" ? (
              <div className="radio-group">
                {f.opts!.map((o) => (
                  <label key={o} className="radio-opt">
                    <input type="radio" name={`r-${s.id}-${f.key}`} value={o} checked={val === o} onChange={() => props.onUpdate(f.key, o)} />
                    {o}
                  </label>
                ))}
              </div>
            ) : f.type === "textarea" ? (
              <textarea
                className="ann-inp"
                rows={3}
                defaultValue={val}
                onChange={(e) => props.onUpdate(f.key, e.target.value)}
                onBlur={() => props.onBlur(f.key)}
              />
            ) : (
              <input
                className="ann-inp"
                defaultValue={val}
                onChange={(e) => props.onUpdate(f.key, e.target.value)}
                onBlur={() => props.onBlur(f.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    props.onConfirm(f.key);
                  }
                }}
              />
            )
          ) : (
            <div
              className={`ann-val-text${val ? "" : " empty-val"}`}
              style={{
                ...(f.type === "textarea" ? { alignItems: "flex-start", paddingTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 } : {}),
                cursor: isReadOnly ? "default" : "text",
              }}
              onClick={isReadOnly ? undefined : () => props.onEdit(f.key)}
            >
              {val || "—"}
            </div>
          )}
        </div>
        <div className="ann-src">
          {sources.length > 0 && (
            <button
              className={`src-badge ${hasDiff ? "diff" : "ok"}`}
              onClick={(e) => {
                e.stopPropagation();
                props.onToggleSrc(f.key);
              }}
              data-tip={hasDiff ? "有分歧，点击查看" : "来源一致，点击查看"}
            >
              {sources.length}
            </button>
          )}
        </div>
        <div className="ann-act">
          {!isReadOnly &&
            (conf ? (
              <div className="ok-check" title="已确认">
                <svg viewBox="0 0 16 16" fill="none" stroke="var(--gn)" strokeWidth="2.2" strokeLinecap="round"><path d="M3 8l3.5 3.5 6.5-6" /></svg>
              </div>
            ) : (
              <button className="btn-ok" onClick={() => props.onConfirm(f.key)}>确认</button>
            ))}
        </div>
      </div>

      {expanded && sources.length > 0 && (
        <div className="rev-panel">
          {sources.map((src, i) => {
            const isCurrent = src.val === val;
            return (
              <div
                key={i}
                className={`rev-panel-row${isCurrent ? " adopted" : canAdopt ? " clickable" : ""}`}
                onClick={canAdopt && !isCurrent ? () => props.onAdopt(f.key, src.val) : undefined}
              >
                <div style={{ width: 40, flexShrink: 0 }} />
                <div className="rev-col-from">
                  <div className="rev-avatar" style={{ background: AVATAR_COLORS[src.from] || "#6B7280" }}>
                    {src.from === "AI" ? "AI" : src.from.charAt(0)}
                  </div>
                </div>
                <div className="rev-col-loc">
                  {src.loc ? (
                    <button
                      className="rev-loc-btn"
                      title="定位到PDF"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onLocateSource(src.loc!);
                      }}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="7" r="3.5" /><path d="M8 1.5C5 1.5 2.5 4 2.5 7c0 4.5 5.5 8 5.5 8s5.5-3.5 5.5-8c0-3-2.5-5.5-5.5-5.5z" /></svg>
                    </button>
                  ) : (
                    <div style={{ width: 24 }} />
                  )}
                </div>
                <span className={`rev-col-val${!isCurrent && hasDiff ? " diff" : ""}`}>
                  {src.val || <span style={{ color: "var(--t4)", fontWeight: 400 }}>—</span>}
                </span>
                <div className="rev-col-act">
                  {isCurrent ? (
                    <span className="rev-cur-tag">当前</span>
                  ) : canAdopt ? (
                    <button
                      className="rev-adopt-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onAdopt(f.key, src.val);
                      }}
                    >
                      采纳
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── 通用弹窗外壳 ────────────────────────────────────────────────
function Modal({ children, onClose, maxWidth, wide }: { children: React.ReactNode; onClose: () => void; maxWidth?: number; wide?: boolean }) {
  return (
    <div className="mc-bd" onClick={onClose}>
      <div className={wide ? "modal-wide" : "modal-sm"} style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="m-cls" onClick={onClick}>
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 2l10 10M12 2L2 12" /></svg>
    </button>
  );
}

// ── 新增主体弹窗 ────────────────────────────────────────────────
interface AddStrainModalProps {
  mode: AddMode;
  query: string;
  results: DbStrain[];
  selectedId: string | null;
  blankName: string;
  canConfirm: boolean;
  onClose: () => void;
  onSearch: (q: string) => void;
  onClear: () => void;
  onSelect: (id: string) => void;
  onSwitchBlank: () => void;
  onBack: () => void;
  onBlankNameChange: (v: string) => void;
  onConfirm: () => void;
}

function AddStrainModal(props: AddStrainModalProps) {
  const { mode, query, results, selectedId, blankName, canConfirm } = props;
  const sel = selectedId ? results.find((r) => r.id === selectedId) ?? DB_STRAINS.find((r) => r.id === selectedId) : null;
  const maxWidth = sel ? 920 : 680;

  const searchBox = (
    <div className="add-search-box">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="5" /><path d="M12 12l2.5 2.5" strokeLinecap="round" /></svg>
      <input
        autoFocus
        placeholder="搜索主体名…"
        value={query}
        onChange={(e) => props.onSearch(e.target.value)}
      />
      {query && (
        <button className="add-search-clear" onClick={props.onClear}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10" /></svg>
        </button>
      )}
    </div>
  );

  const resultList = (
    <>
      {results.map((r) => (
        <div key={r.id} className={`add-result-item${selectedId === r.id ? " selected" : ""}`} onClick={() => props.onSelect(r.id)}>
          <div className="add-result-ico"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg></div>
          <div className="add-result-info">
            <div className="add-result-name">{r.name}</div>
            <div className="add-result-meta">来源：{r.src}</div>
          </div>
          <div className="add-result-check"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l2.5 2.5 5.5-5" /></svg></div>
        </div>
      ))}
    </>
  );

  return (
    <Modal onClose={props.onClose} wide maxWidth={maxWidth}>
      <div className="m-hd">
        <div>
          <div className="m-title">新增主体</div>
          <div className="m-sub">搜索数据库导入，或直接创建空白</div>
        </div>
        <CloseBtn onClick={props.onClose} />
      </div>

      {mode === "blank" ? (
        <div className="m-body" style={{ padding: "16px 24px" }}>
          <button className="add-step-back" style={{ marginBottom: 14 }} onClick={props.onBack}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 14, height: 14 }}><path d="M9 3L5 7l4 4" /></svg> 返回搜索
          </button>
          <div className="add-hint">创建后可在右侧标注面板逐行填写并确认</div>
          <div className="form-group">
            <label className="form-label">主体名称<span style={{ color: "var(--red)", marginLeft: 2 }}>*</span></label>
            <input className="form-input" value={blankName} onChange={(e) => props.onBlankNameChange(e.target.value)} placeholder="如 F5.4 或 DSM 1538" />
          </div>
        </div>
      ) : (
        <div className="m-body" style={{ padding: 0, flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {!sel ? (
            <>
              <div className="add-search-area">{searchBox}</div>
              {mode === "idle" && (
                <>
                  <div className="add-empty">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
                    <div style={{ fontSize: 12.5, color: "var(--t3)" }}>输入名称搜索数据库</div>
                  </div>
                  <div style={{ padding: "0 20px 16px", marginTop: "auto" }}>
                    <div style={{ borderTop: "1px solid var(--bdr)", paddingTop: 14 }}>
                      <BlankCard onClick={props.onSwitchBlank} />
                    </div>
                  </div>
                </>
              )}
              {mode === "noresults" && (
                <>
                  <div style={{ padding: "24px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)", marginBottom: 4 }}>未找到匹配结果</div>
                    <div style={{ fontSize: 12.5, color: "var(--t3)" }}>「{query}」在数据库中暂无记录</div>
                  </div>
                  <div style={{ padding: "0 20px 16px" }}><BlankCard onClick={props.onSwitchBlank} /></div>
                </>
              )}
              {mode === "results" && (
                <>
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }}>{resultList}</div>
                  <div style={{ padding: "10px 16px", borderTop: "1px solid var(--bdr)", background: "var(--s2)" }}>
                    <button className="mbtn mbtn-cancel" style={{ fontSize: 12, padding: "5px 10px" }} onClick={props.onSwitchBlank}>创建空白</button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="add-split">
              <div className="add-split-left">
                <div className="add-split-search">{searchBox}</div>
                <div className="add-split-list">{resultList}</div>
                <div className="add-split-actions">
                  <button className="mbtn mbtn-cancel" style={{ fontSize: 12, padding: "5px 10px", flex: 1 }} onClick={props.onSwitchBlank}>创建空白</button>
                </div>
              </div>
              <div className="add-split-right">
                <StrainPreview d={sel} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="m-ft">
        <button className="mbtn mbtn-cancel" onClick={props.onClose}>取消</button>
        {canConfirm && <button className="mbtn mbtn-primary" onClick={props.onConfirm}>确认</button>}
      </div>
    </Modal>
  );
}

function BlankCard({ onClick }: { onClick: () => void }) {
  return (
    <button className="add-create-card" onClick={onClick}>
      <div className="add-create-card-ico" style={{ background: "var(--gnbg)" }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="var(--gn)" strokeWidth="1.7" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
      </div>
      <div>
        <div className="add-create-card-title">创建空白主体</div>
        <div className="add-create-card-desc">从零开始填写各字段</div>
      </div>
    </button>
  );
}

function StrainPreview({ d }: { d: DbStrain }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", flexShrink: 0, background: "var(--sur)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 2 }}>{d.name}</div>
        <div style={{ fontSize: 12, color: "var(--t3)" }}>来源：{d.src}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, background: "var(--sur)" }}>
        {SECTIONS.map((sec) => (
          <div key={sec.id} style={{ marginBottom: 6 }}>
            <div className="preview-sec-hd">{sec.title}</div>
            {sec.fields.map((f) => {
              const v = d.previewVals[f.key] || "";
              return (
                <div key={f.key} className="preview-row">
                  <span className="preview-lbl">{f.lbl}</span>
                  <span className="preview-val" style={{ color: v ? "var(--t1)" : "var(--t4)", fontWeight: v ? 500 : 400 }}>{v || "—"}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
