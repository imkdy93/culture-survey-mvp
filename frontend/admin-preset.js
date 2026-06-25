console.log("admin-preset integrated loaded v20260626-02");
const state = {
  branding: {},
  scaleLabels: [],
  factors: [],
  selectedFactorId: null,
  loaLevels: [
    {
      loa_code: "L1_O",
      loa_name: "조직 수준",
      loa_key: "L1_O_조직수준",
      loa_order: 1,
      description: "조직 전체의 구조, 제도, 전략, 문화, 변화 대응 수준",
    },
    {
      loa_code: "L2_T",
      loa_name: "팀·집단 수준",
      loa_key: "L2_T_팀집단수준",
      loa_order: 2,
      description: "팀 내 상호작용, 리더십, 의사소통, 협업, 문제해결",
    },
    {
      loa_code: "L3_I",
      loa_name: "개인 수준",
      loa_key: "L3_I_개인수준",
      loa_order: 3,
      description: "개인의 동기, 몰입, 직무태도, 자기효능감, 직무만족",
    },
  ],
  reports: [
    {
      report_code: "OC",
      report_name: "조직문화 진단 보고서",
      report_role: "MAIN",
      report_order: 1,
      description: "기본 조직문화 진단 보고서",
    },
  ],
  indices: [],
  orgLevels: [
    {
      org_level_code: "R1_COMPANY",
      org_level_name: "전사",
      org_level_key: "R1_COMPANY_전사",
      org_level_order: 1,
      source_column_name: "전사",
    },
    {
      org_level_code: "R2_GROUP",
      org_level_name: "그룹",
      org_level_key: "R2_GROUP_그룹",
      org_level_order: 2,
      source_column_name: "그룹 구분",
    },
    {
      org_level_code: "R3_DIV",
      org_level_name: "사업부",
      org_level_key: "R3_DIV_사업부",
      org_level_order: 3,
      source_column_name: "사업부 구분",
    },
    {
      org_level_code: "R4_TEAM",
      org_level_name: "팀",
      org_level_key: "R4_TEAM_팀",
      org_level_order: 4,
      source_column_name: "팀 구분",
    },
  ],
};
document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindBrandingActions();
  bindScaleActions();
  bindScorePreview();
  bindFactorActions();
  bindTableActions();
  bindValidationActions();
  seedSampleFactors();
  initScaleLabels();
  renderAll();
});
function bindTabs() {
  document.querySelectorAll(".step-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document
        .querySelectorAll(".step-btn")
        .forEach((b) => b.classList.toggle("active", b === btn));
      document
        .querySelectorAll(".tab-panel")
        .forEach((p) => p.classList.toggle("active", p.id === `tab-${tab}`));
    }),
  );
}
function bindBrandingActions() {
  [
    "brandingLogoUrl",
    "brandingLogoAlt",
    "brandingLogoPosition",
    "brandingLogoSize",
    "primaryColor",
    "pageBackgroundColor",
    "cardBackgroundColor",
    "questionTextColor",
    "descriptionTextColor",
    "buttonBackgroundColor",
    "buttonTextColor",
    "progressBarColor",
    "introTitle",
    "privacyNoticeText",
    "completeTitle",
    "completeMessage",
    "projectName",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updateBrandingPreview);
      el.addEventListener("change", updateBrandingPreview);
    }
  });
  document
    .getElementById("brandingLogoFile")
    ?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      document.getElementById("brandingLogoUrl").value = URL.createObjectURL(f);
      updateBrandingPreview();
    });
  document.getElementById("btnResetBranding")?.addEventListener("click", () => {
    const d = {
      primaryColor: "#1F4E79",
      pageBackgroundColor: "#F5F7FA",
      cardBackgroundColor: "#FFFFFF",
      questionTextColor: "#111827",
      descriptionTextColor: "#6B7280",
      buttonBackgroundColor: "#1F4E79",
      buttonTextColor: "#FFFFFF",
      progressBarColor: "#1F4E79",
    };
    Object.entries(d).forEach(([id, v]) => {
      const el = document.getElementById(id);
      if (el) el.value = v;
    });
    updateBrandingPreview();
  });
}
function collectBrandingForm() {
  return {
    logo_file_url: val("brandingLogoUrl"),
    logo_alt_text: val("brandingLogoAlt"),
    logo_position: val("brandingLogoPosition", "LEFT"),
    logo_size: val("brandingLogoSize", "MEDIUM"),
    primary_color: val("primaryColor", "#1F4E79"),
    page_background_color: val("pageBackgroundColor", "#F5F7FA"),
    card_background_color: val("cardBackgroundColor", "#FFFFFF"),
    button_background_color: val("buttonBackgroundColor", "#1F4E79"),
    button_text_color: val("buttonTextColor", "#FFFFFF"),
    progress_bar_color: val("progressBarColor", "#1F4E79"),
    question_text_color: val("questionTextColor", "#111827"),
    description_text_color: val("descriptionTextColor", "#6B7280"),
    intro_title: val("introTitle"),
    privacy_notice_text: val("privacyNoticeText"),
    complete_title: val("completeTitle"),
    complete_message: val("completeMessage"),
  };
}
function updateBrandingPreview() {
  const b = collectBrandingForm();
  state.branding = b;
  const shell = $("surveyPreviewShell"),
    card = $("previewCard"),
    bar = $("previewProgressBar"),
    next = $("previewNextButton"),
    qt = $("previewQuestionText"),
    dt = $("previewDescriptionText"),
    logo = $("previewLogoBox"),
    title = $("previewProjectTitle"),
    intro = $("previewIntroText");
  if (shell) shell.style.background = b.page_background_color;
  if (card) {
    card.style.background = b.card_background_color;
  }
  if (bar) bar.style.background = b.progress_bar_color;
  if (next) {
    next.style.background = b.button_background_color;
    next.style.color = b.button_text_color;
  }
  if (qt) qt.style.color = b.question_text_color;
  if (dt) dt.style.color = b.description_text_color;
  if (title) title.textContent = val("projectName") || "고객사 조직문화 진단";
  if (intro) intro.textContent = b.intro_title || "응답 안내";
  if (logo) {
    logo.innerHTML = "";
    if (b.logo_file_url && b.logo_position !== "HIDDEN") {
      const img = document.createElement("img");
      img.src = b.logo_file_url;
      img.alt = b.logo_alt_text || "client logo";
      logo.appendChild(img);
    } else {
      logo.innerHTML = "<span>LOGO</span>";
    }
    logo.style.width =
      b.logo_size === "LARGE"
        ? "96px"
        : b.logo_size === "SMALL"
          ? "58px"
          : "72px";
    logo.style.height =
      b.logo_size === "LARGE"
        ? "48px"
        : b.logo_size === "SMALL"
          ? "32px"
          : "38px";
  }
  renderScalePreview();
}
function bindScaleActions() {
  document.getElementById("scalePointCount")?.addEventListener("change", () => {
    initScaleLabels();
    renderScaleLabelsTable();
    renderScalePreview();
  });
  ["scaleDisplayMode", "questionScaleMode", "mobileDisplayMode"].forEach((id) =>
    document.getElementById(id)?.addEventListener("change", renderScalePreview),
  );
  document
    .getElementById("btnRecommendScaleLabels")
    ?.addEventListener("click", () => {
      applyRecommendedScaleLabels();
      renderScaleLabelsTable();
      renderScalePreview();
    });
}
function initScaleLabels() {
  const n = Number(val("scalePointCount", 5));
  state.scaleLabels = Array.from({ length: n }, (_, i) => ({
    scale_value: i + 1,
    scale_label: "",
    display_order: i + 1,
  }));
  applyRecommendedScaleLabels();
}
function applyRecommendedScaleLabels() {
  const n = Number(val("scalePointCount", 5));
  const labels =
    {
      4: {
        1: "전혀 그렇지 않다",
        2: "그렇지 않다",
        3: "그렇다",
        4: "매우 그렇다",
      },
      5: { 1: "매우 그렇지 않다", 3: "보통이다", 5: "매우 그렇다" },
      6: {
        1: "매우 그렇지 않다",
        3: "다소 그렇지 않다",
        4: "다소 그렇다",
        6: "매우 그렇다",
      },
      7: { 1: "매우 그렇지 않다", 4: "보통이다", 7: "매우 그렇다" },
      8: {
        1: "매우 그렇지 않다",
        4: "그렇지 않은 편이다",
        5: "그런 편이다",
        8: "매우 그렇다",
      },
      9: { 1: "매우 그렇지 않다", 5: "보통이다", 9: "매우 그렇다" },
      10: {
        1: "전혀 그렇지 않다",
        5: "보통 이하",
        6: "보통 이상",
        10: "매우 그렇다",
      },
    }[n] || {};
  state.scaleLabels.forEach(
    (r) => (r.scale_label = labels[r.scale_value] || ""),
  );
}
function renderScaleLabelsTable() {
  const tb = document.querySelector("#scaleLabelsTable tbody");
  if (!tb) return;
  tb.innerHTML = state.scaleLabels
    .map(
      (r, i) =>
        `<tr><td>${r.scale_value}</td><td><input value="${escapeHtml(r.scale_label)}" oninput="updateScaleLabel(${i},this.value)" placeholder="공백이면 미표시" /></td><td>${r.scale_label ? "표시" : "미표시"}</td></tr>`,
    )
    .join("");
}
window.updateScaleLabel = (i, v) => {
  state.scaleLabels[i].scale_label = v;
  renderScalePreview();
};
function buildScaleGuideText() {
  return state.scaleLabels
    .filter((r) => r.scale_label.trim())
    .map((r) => `${r.scale_value}점 ${r.scale_label.trim()}`)
    .join(" / ");
}
function renderScalePreview() {
  const n = Number(val("scalePointCount", 5));
  const guide = buildScaleGuideText();
  ["scaleGuideText"].forEach((id) => {
    const el = $(id);
    if (el) el.value = guide;
  });
  ["previewScaleGuide", "scaleDesktopGuide", "scaleMobileGuide"].forEach(
    (id) => {
      const el = $(id);
      if (el) el.textContent = guide;
    },
  );
  const buttons = Array.from(
    { length: n },
    (_, i) => `<div class="scale-button">${i + 1}</div>`,
  ).join("");
  ["previewScaleButtons", "scaleDesktopButtons", "scaleMobileButtons"].forEach(
    (id) => {
      const el = $(id);
      if (el) {
        el.innerHTML = buttons;
        el.style.gridTemplateColumns = `repeat(${n}, minmax(32px,1fr))`;
      }
    },
  );
}
function bindScorePreview() {
  document
    .getElementById("scoreDisplayType")
    ?.addEventListener("change", () => {
      const t = val("scoreDisplayType");
      if (t === "POINT_100") {
        setVal("displayScoreMin", "0");
        setVal("displayScoreMax", "100");
        setVal("scoreTransformMethod", "LINEAR_0_100");
      } else {
        setVal("displayScoreMin", "1");
        setVal("displayScoreMax", "5");
        setVal("scoreTransformMethod", "NONE");
      }
      updateScoreFormulaPreview();
    });
  document
    .getElementById("scoreTransformMethod")
    ?.addEventListener("change", updateScoreFormulaPreview);
  updateScoreFormulaPreview();
}
function updateScoreFormulaPreview() {
  const p = $("scoreFormulaPreview");
  if (!p) return;
  p.textContent =
    val("scoreTransformMethod") === "LINEAR_0_100"
      ? "display_value = (scored_value - 1) × 25"
      : "display_value = scored_value";
}
function bindFactorActions() {
  document
    .getElementById("btnAddRootFactor")
    ?.addEventListener("click", () => addFactor(null, "A"));
  document
    .getElementById("btnSaveFactor")
    ?.addEventListener("click", saveEditingFactor);
  document
    .getElementById("btnDeleteFactor")
    ?.addEventListener("click", deleteEditingFactor);
}
function seedSampleFactors() {
  if (state.factors.length) return;
  const a1 = createFactor({
    level: "A",
    code: "A1",
    name: "조직역량",
    order: 1,
    parentId: null,
  });
  const a2 = createFactor({
    level: "A",
    code: "A2",
    name: "조직효과성",
    order: 2,
    parentId: null,
  });
  const b1 = createFactor({
    level: "B",
    code: "B1",
    name: "조직방향성",
    order: 1,
    parentId: a1.id,
  });
  const b2 = createFactor({
    level: "B",
    code: "B2",
    name: "조직시스템",
    order: 2,
    parentId: a1.id,
  });
  createFactor({
    level: "C",
    code: "C1",
    name: "비전/전략",
    order: 1,
    parentId: b1.id,
  });
  createFactor({
    level: "C",
    code: "C2",
    name: "핵심가치",
    order: 2,
    parentId: b1.id,
  });
  createFactor({
    level: "C",
    code: "C3",
    name: "HR System",
    order: 3,
    parentId: b2.id,
  });
  createFactor({
    level: "B",
    code: "B3",
    name: "조직효과성",
    order: 1,
    parentId: a2.id,
  });
}
function createFactor({ level, code, name, order, parentId }) {
  const f = {
    id: crypto.randomUUID(),
    factor_level: level,
    factor_code: code,
    factor_name: name,
    factor_report_name: name,
    factor_order: order,
    parent_id: parentId,
    path_code: "",
    path_name: "",
    path_key: "",
    is_active: true,
  };
  state.factors.push(f);
  rebuildFactorPaths();
  return f;
}
function getNextLevelByParent(parentId) {
  if (!parentId) return "A";
  const p = state.factors.find((f) => f.id === parentId);
  const levels = ["A", "B", "C", "D", "E", "F"];
  const idx = levels.indexOf(p?.factor_level);
  const max = Number(val("factorDepthMax", 4));
  return idx >= 0 && idx + 1 < max ? levels[idx + 1] : null;
}
function generateNextFactorCode(level) {
  return `${level}${state.factors.filter((f) => f.factor_level === level).length + 1}`;
}
function siblings(parentId) {
  return state.factors
    .filter((f) => f.parent_id === parentId)
    .sort((a, b) => a.factor_order - b.factor_order);
}
function addFactor(parentId, level) {
  const lv = level || getNextLevelByParent(parentId);
  if (!lv) {
    alert("더 이상 하위 단계를 추가할 수 없습니다.");
    return;
  }
  const f = createFactor({
    level: lv,
    code: generateNextFactorCode(lv),
    name: `${lv}단계 새 요인`,
    order: siblings(parentId).length + 1,
    parentId,
  });
  selectFactor(f.id);
  renderFactorTree();
}
function rebuildFactorPaths() {
  const by = new Map(state.factors.map((f) => [f.id, f]));
  state.factors.forEach((f) => {
    const chain = [];
    let cur = f;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent_id ? by.get(cur.parent_id) : null;
    }
    f.path_code = chain.map((x) => x.factor_code).join("_");
    f.path_name = chain.map((x) => x.factor_name).join(" > ");
    f.path_key = `${f.path_code}_${safeKeyName(f.factor_name)}`;
  });
}
function renderFactorTree() {
  rebuildFactorPaths();
  const root = $("factorTree");
  if (!root) return;
  root.innerHTML = siblings(null).map(renderFactorNode).join("");
}
function renderFactorNode(f) {
  const ch = siblings(f.id);
  const active = state.selectedFactorId === f.id ? "active" : "";
  const next = getNextLevelByParent(f.id);
  const add = next
    ? `<button class="node-add" onclick="addFactor('${f.id}','${next}')">+ ${next}</button>`
    : "";
  return `<div class="tree-node"><div class="tree-node-row ${active}" onclick="selectFactor('${f.id}')"><span class="node-code">${escapeHtml(f.factor_code)}</span><span class="node-name">${escapeHtml(f.factor_name)}</span>${add}</div>${ch.length ? `<div class="tree-node-children">${ch.map(renderFactorNode).join("")}</div>` : ""}</div>`;
}
window.selectFactor = (id) => {
  state.selectedFactorId = id;
  const f = state.factors.find((x) => x.id === id);
  if (!f) return;
  setVal("editingFactorId", f.id);
  setVal("editingFactorLevel", f.factor_level);
  setVal("editingFactorCode", f.factor_code);
  setVal("editingFactorName", f.factor_name);
  setVal("editingFactorReportName", f.factor_report_name);
  setVal("editingFactorOrder", f.factor_order);
  $("editingPathCode").textContent = f.path_code;
  $("editingPathName").textContent = f.path_name;
  renderFactorTree();
};
function saveEditingFactor() {
  const id = val("editingFactorId");
  const f = state.factors.find((x) => x.id === id);
  if (!f) {
    alert("저장할 요인을 선택하세요.");
    return;
  }
  f.factor_name = val("editingFactorName");
  f.factor_report_name = val("editingFactorReportName");
  f.factor_order = Number(val("editingFactorOrder", 1));
  rebuildFactorPaths();
  selectFactor(id);
}
function deleteEditingFactor() {
  const id = val("editingFactorId");
  if (state.factors.some((f) => f.parent_id === id)) {
    alert("하위 요인을 먼저 삭제하세요.");
    return;
  }
  state.factors = state.factors.filter((f) => f.id !== id);
  state.selectedFactorId = null;
  [
    "editingFactorId",
    "editingFactorLevel",
    "editingFactorCode",
    "editingFactorName",
    "editingFactorReportName",
    "editingFactorOrder",
  ].forEach((id) => setVal(id, ""));
  $("editingPathCode").textContent = "-";
  $("editingPathName").textContent = "-";
  renderFactorTree();
}
function bindTableActions() {
  document.getElementById("btnAddReport")?.addEventListener("click", () => {
    state.reports.push({
      report_code: `REPORT_${state.reports.length + 1}`,
      report_name: "새 보고서",
      report_role: "SUB",
      report_order: state.reports.length + 1,
      description: "",
    });
    renderReportsTable();
  });
  document.getElementById("btnAddIndex")?.addEventListener("click", () => {
    state.indices.push({
      report_code: state.reports[0]?.report_code || "OC",
      index_code: `I${state.indices.length + 1}`,
      index_name: "새 지수",
      index_type: "DERIVED_INDEX",
      calculation_method: "MEAN_SELECTED_ITEMS",
      index_order: state.indices.length + 1,
    });
    renderIndicesTable();
  });
  document.getElementById("btnAddOrgLevel")?.addEventListener("click", () => {
    state.orgLevels.push({
      org_level_code: `R${state.orgLevels.length + 1}`,
      org_level_name: "새 조직레벨",
      org_level_key: "",
      org_level_order: state.orgLevels.length + 1,
      source_column_name: "",
    });
    renderOrgLevelsTable();
  });
}
function renderAll() {
  updateBrandingPreview();
  renderScaleLabelsTable();
  renderScalePreview();
  renderFactorTree();
  renderLoaTable();
  renderReportsTable();
  renderIndicesTable();
  renderOrgLevelsTable();
  renderValidationSummary();
}
function renderLoaTable() {
  const tb = document.querySelector("#loaTable tbody");
  if (!tb) return;
  tb.innerHTML = state.loaLevels
    .map(
      (r, i) =>
        `<tr><td><input value="${escapeHtml(r.loa_code)}" onchange="state.loaLevels[${i}].loa_code=this.value"></td><td><input value="${escapeHtml(r.loa_name)}" onchange="state.loaLevels[${i}].loa_name=this.value"></td><td><input value="${escapeHtml(r.loa_key)}" onchange="state.loaLevels[${i}].loa_key=this.value"></td><td><input type="number" value="${r.loa_order}" onchange="state.loaLevels[${i}].loa_order=Number(this.value)"></td><td><input value="${escapeHtml(r.description)}" onchange="state.loaLevels[${i}].description=this.value"></td></tr>`,
    )
    .join("");
}
function renderReportsTable() {
  const tb = document.querySelector("#reportsTable tbody");
  if (!tb) return;
  tb.innerHTML = state.reports
    .map(
      (r, i) =>
        `<tr><td><input value="${escapeHtml(r.report_code)}" onchange="state.reports[${i}].report_code=this.value"></td><td><input value="${escapeHtml(r.report_name)}" onchange="state.reports[${i}].report_name=this.value"></td><td><select onchange="state.reports[${i}].report_role=this.value">${option("MAIN", r.report_role)}${option("SUB", r.report_role)}${option("AUX", r.report_role)}</select></td><td><input type="number" value="${r.report_order}" onchange="state.reports[${i}].report_order=Number(this.value)"></td><td><input value="${escapeHtml(r.description || "")}" onchange="state.reports[${i}].description=this.value"></td><td><button class="btn small danger ghost" onclick="state.reports.splice(${i},1);renderReportsTable();">삭제</button></td></tr>`,
    )
    .join("");
}
function renderIndicesTable() {
  const tb = document.querySelector("#indicesTable tbody");
  if (!tb) return;
  const ro = state.reports.map((r) => r.report_code);
  tb.innerHTML = state.indices
    .map(
      (r, i) =>
        `<tr><td><select onchange="state.indices[${i}].report_code=this.value">${ro.map((c) => option(c, r.report_code)).join("")}</select></td><td><input value="${escapeHtml(r.index_code)}" onchange="state.indices[${i}].index_code=this.value"></td><td><input value="${escapeHtml(r.index_name)}" onchange="state.indices[${i}].index_name=this.value"></td><td><select onchange="state.indices[${i}].index_type=this.value">${["TOTAL_INDEX", "BASE_FACTOR_INDEX", "DERIVED_INDEX", "CAPABILITY_INDEX", "SUB_REPORT_INDEX", "CUSTOM_INDEX"].map((c) => option(c, r.index_type)).join("")}</select></td><td><select onchange="state.indices[${i}].calculation_method=this.value">${["MEAN_SELECTED_ITEMS", "MEAN_SELECTED_FACTORS", "CUSTOM_FORMULA"].map((c) => option(c, r.calculation_method)).join("")}</select></td><td><input type="number" value="${r.index_order}" onchange="state.indices[${i}].index_order=Number(this.value)"></td><td><button class="btn small danger ghost" onclick="state.indices.splice(${i},1);renderIndicesTable();">삭제</button></td></tr>`,
    )
    .join("");
}
function renderOrgLevelsTable() {
  const tb = document.querySelector("#orgLevelsTable tbody");
  if (!tb) return;
  tb.innerHTML = state.orgLevels
    .map(
      (r, i) =>
        `<tr><td><input value="${escapeHtml(r.org_level_code)}" onchange="state.orgLevels[${i}].org_level_code=this.value"></td><td><input value="${escapeHtml(r.org_level_name)}" onchange="state.orgLevels[${i}].org_level_name=this.value"></td><td><input value="${escapeHtml(r.org_level_key)}" onchange="state.orgLevels[${i}].org_level_key=this.value"></td><td><input type="number" value="${r.org_level_order}" onchange="state.orgLevels[${i}].org_level_order=Number(this.value)"></td><td><input value="${escapeHtml(r.source_column_name)}" onchange="state.orgLevels[${i}].source_column_name=this.value"></td><td><button class="btn small danger ghost" onclick="state.orgLevels.splice(${i},1);renderOrgLevelsTable();">삭제</button></td></tr>`,
    )
    .join("");
}
function bindValidationActions() {
  document.getElementById("btnRunValidation")?.addEventListener("click", () => {
    renderValidationSummary();
    alert("검증 완료: 프론트 상태 기준 1차 검증입니다.");
  });
  document
    .getElementById("btnDownloadJson")
    ?.addEventListener("click", downloadPresetJson);
  document
    .getElementById("btnApplyToDb")
    ?.addEventListener("click", () =>
      alert("다음 단계에서 Supabase upsert 함수와 연결합니다."),
    );
  document.getElementById("btnSaveDraft")?.addEventListener("click", () => {
    localStorage.setItem(
      "diagnosis_preset_integrated_draft",
      JSON.stringify(buildExportPayload()),
    );
    alert("임시저장했습니다.");
  });
  document
    .getElementById("btnLoadDraft")
    ?.addEventListener("click", () =>
      alert("불러오기 병합 기능은 다음 단계에서 연결합니다."),
    );
}
function renderValidationSummary() {
  const target = $("validationSummary");
  if (!target) return;
  const counts = {};
  state.factors.forEach(
    (f) => (counts[f.factor_level] = (counts[f.factor_level] || 0) + 1),
  );
  const cards = [
    ["A단계", counts.A || 0],
    ["B단계", counts.B || 0],
    ["C단계", counts.C || 0],
    ["D단계", counts.D || 0],
    ["척도 라벨", state.scaleLabels.filter((r) => r.scale_label).length],
    ["LOA", state.loaLevels.length],
    ["보고서", state.reports.length],
    ["지수", state.indices.length],
    ["조직 R", state.orgLevels.length],
  ];
  target.innerHTML = cards
    .map(
      ([l, v]) =>
        `<div class="validation-card"><strong>${v}</strong><span>${l}</span></div>`,
    )
    .join("");
}
function buildExportPayload() {
  return {
    version: "standard_diagnosis_map_template_v3_integrated_ui",
    exported_at: new Date().toISOString(),
    project: collectProjectForm(),
    branding_settings: collectBrandingForm(),
    scale_preset: collectScalePreset(),
    scale_labels: state.scaleLabels,
    score_settings: collectScoreForm(),
    factor_nodes: state.factors,
    loa_levels: state.loaLevels,
    reports: state.reports,
    indices: state.indices,
    org_reporting_levels: state.orgLevels,
  };
}
function collectProjectForm() {
  return {
    client_code: val("clientCode"),
    client_name: val("clientName"),
    project_code: val("projectCode"),
    project_name: val("projectName"),
    diagnosis_name: val("diagnosisName"),
    diagnosis_year: val("diagnosisYear"),
  };
}
function collectScalePreset() {
  return {
    scale_point_count: Number(val("scalePointCount", 5)),
    display_mode: val("scaleDisplayMode"),
    question_scale_mode: val("questionScaleMode"),
    mobile_display_mode: val("mobileDisplayMode"),
    guide_text: buildScaleGuideText(),
  };
}
function collectScoreForm() {
  return {
    raw_scale_min: Number(val("rawScaleMin", 1)),
    raw_scale_max: Number(val("rawScaleMax", 5)),
    display_score_min: Number(val("displayScoreMin", 1)),
    display_score_max: Number(val("displayScoreMax", 5)),
    score_display_type: val("scoreDisplayType"),
    score_transform_method: val("scoreTransformMethod"),
    positive_raw_values: val("positiveRawValues"),
    negative_raw_values: val("negativeRawValues"),
    neutral_raw_values: val("neutralRawValues"),
  };
}
function downloadPresetJson() {
  const blob = new Blob([JSON.stringify(buildExportPayload(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diagnosis_preset_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function $(id) {
  return document.getElementById(id);
}
function val(id, d = "") {
  return $(id)?.value ?? d;
}
function setVal(id, v) {
  const el = $(id);
  if (el) el.value = v;
}
function option(v, s) {
  return `<option value="${escapeHtml(v)}" ${v === s ? "selected" : ""}>${escapeHtml(v)}</option>`;
}
function safeKeyName(v) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[>\\|,]/g, "")
    .replace(/[^\w가-힣()·_-]/g, "");
}
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
window.addFactor = addFactor;
window.state = state;
