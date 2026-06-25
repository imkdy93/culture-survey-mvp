console.log("admin-preset.js loaded: diagnosis preset ui v20260626-01");

const state = {
  project: {},
  score: {},
  factors: [],
  selectedFactorId: null,
  loaLevels: [
    {
      loa_code: "L1_O",
      loa_name: "조직 수준",
      loa_key: "L1_O_조직수준",
      loa_order: 1,
      description: "조직 전체의 구조, 제도, 전략, 문화, 변화 대응 수준"
    },
    {
      loa_code: "L2_T",
      loa_name: "팀·집단 수준",
      loa_key: "L2_T_팀집단수준",
      loa_order: 2,
      description: "팀 내 상호작용, 리더십, 의사소통, 협업, 문제해결"
    },
    {
      loa_code: "L3_I",
      loa_name: "개인 수준",
      loa_key: "L3_I_개인수준",
      loa_order: 3,
      description: "개인의 동기, 몰입, 직무태도, 자기효능감, 직무만족"
    }
  ],
  reports: [
    {
      report_code: "OC",
      report_name: "조직문화 진단 보고서",
      report_role: "MAIN",
      report_order: 1,
      description: "기본 조직문화 진단 보고서"
    }
  ],
  indices: [],
  orgLevels: [
    {
      org_level_code: "R1_COMPANY",
      org_level_name: "전사",
      org_level_key: "R1_COMPANY_전사",
      org_level_order: 1,
      source_column_name: "전사"
    },
    {
      org_level_code: "R2_GROUP",
      org_level_name: "그룹",
      org_level_key: "R2_GROUP_그룹",
      org_level_order: 2,
      source_column_name: "그룹 구분"
    },
    {
      org_level_code: "R3_DIV",
      org_level_name: "사업부",
      org_level_key: "R3_DIV_사업부",
      org_level_order: 3,
      source_column_name: "사업부 구분"
    },
    {
      org_level_code: "R4_TEAM",
      org_level_name: "팀",
      org_level_key: "R4_TEAM_팀",
      org_level_order: 4,
      source_column_name: "팀 구분"
    }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindScorePreview();
  bindFactorActions();
  bindTableActions();
  bindValidationActions();

  seedSampleFactors();
  renderAll();
});

function bindTabs() {
  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      document.querySelectorAll(".step-btn").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });

      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `tab-${tab}`);
      });
    });
  });
}

function bindScorePreview() {
  const scoreDisplayType = document.getElementById("scoreDisplayType");
  const scoreTransformMethod = document.getElementById("scoreTransformMethod");

  if (scoreDisplayType) {
    scoreDisplayType.addEventListener("change", syncScoreMethodFromDisplay);
  }

  if (scoreTransformMethod) {
    scoreTransformMethod.addEventListener("change", updateScoreFormulaPreview);
  }

  updateScoreFormulaPreview();
}

function syncScoreMethodFromDisplay() {
  const displayType = document.getElementById("scoreDisplayType").value;
  const methodEl = document.getElementById("scoreTransformMethod");
  const minEl = document.getElementById("displayScoreMin");
  const maxEl = document.getElementById("displayScoreMax");

  if (displayType === "POINT_100") {
    methodEl.value = "LINEAR_0_100";
    minEl.value = "0";
    maxEl.value = "100";
  } else {
    methodEl.value = "NONE";
    minEl.value = "1";
    maxEl.value = "5";
  }

  updateScoreFormulaPreview();
}

function updateScoreFormulaPreview() {
  const method = document.getElementById("scoreTransformMethod").value;
  const preview = document.getElementById("scoreFormulaPreview");

  if (!preview) return;

  if (method === "LINEAR_0_100") {
    preview.textContent = "100점 환산: display_value = (scored_value - 1) × 25";
  } else {
    preview.textContent = "5점 평균 그대로 사용: display_value = scored_value";
  }
}

function bindFactorActions() {
  const btnAddRoot = document.getElementById("btnAddRootFactor");
  const btnSave = document.getElementById("btnSaveFactor");
  const btnDelete = document.getElementById("btnDeleteFactor");

  if (btnAddRoot) {
    btnAddRoot.addEventListener("click", () => addFactor(null, "A"));
  }

  if (btnSave) {
    btnSave.addEventListener("click", saveEditingFactor);
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", deleteEditingFactor);
  }
}

function seedSampleFactors() {
  if (state.factors.length > 0) return;

  const a1 = createFactor({
    level: "A",
    code: "A1",
    name: "조직역량",
    order: 1,
    parentId: null
  });

  const a2 = createFactor({
    level: "A",
    code: "A2",
    name: "조직효과성",
    order: 2,
    parentId: null
  });

  const b1 = createFactor({
    level: "B",
    code: "B1",
    name: "조직방향성",
    order: 1,
    parentId: a1.id
  });

  const b2 = createFactor({
    level: "B",
    code: "B2",
    name: "조직시스템",
    order: 2,
    parentId: a1.id
  });

  createFactor({
    level: "C",
    code: "C1",
    name: "비전/전략",
    order: 1,
    parentId: b1.id
  });

  createFactor({
    level: "C",
    code: "C2",
    name: "핵심가치",
    order: 2,
    parentId: b1.id
  });

  createFactor({
    level: "C",
    code: "C3",
    name: "HR System",
    order: 3,
    parentId: b2.id
  });

  createFactor({
    level: "B",
    code: "B3",
    name: "조직효과성",
    order: 1,
    parentId: a2.id
  });
}

function createFactor({ level, code, name, order, parentId }) {
  const factor = {
    id: crypto.randomUUID(),
    factor_level: level,
    factor_code: code,
    factor_name: name,
    factor_report_name: name,
    factor_key: `${code}_${safeKeyName(name)}`,
    factor_order: order,
    parent_id: parentId,
    path_code: "",
    path_name: "",
    path_key: "",
    is_active: true
  };

  state.factors.push(factor);
  rebuildFactorPaths();

  return factor;
}

function addFactor(parentId, level) {
  const actualLevel = level || getNextLevelByParent(parentId);
  if (!actualLevel) {
    alert("더 이상 하위 단계를 추가할 수 없습니다.");
    return;
  }

  const code = generateNextFactorCode(actualLevel);
  const order = getSiblingFactors(parentId).length + 1;

  const factor = createFactor({
    level: actualLevel,
    code,
    name: `${actualLevel}단계 새 요인`,
    order,
    parentId
  });

  selectFactor(factor.id);
  renderFactorTree();
}

function getNextLevelByParent(parentId) {
  if (!parentId) return "A";

  const parent = state.factors.find((f) => f.id === parentId);
  if (!parent) return null;

  const levels = ["A", "B", "C", "D", "E", "F"];
  const currentIndex = levels.indexOf(parent.factor_level);
  const maxDepth = Number(document.getElementById("factorDepthMax").value || 4);

  if (currentIndex < 0 || currentIndex + 1 >= maxDepth) return null;

  return levels[currentIndex + 1];
}

function generateNextFactorCode(level) {
  const existing = state.factors.filter((f) => f.factor_level === level);
  return `${level}${existing.length + 1}`;
}

function getSiblingFactors(parentId) {
  return state.factors
    .filter((f) => f.parent_id === parentId)
    .sort((a, b) => Number(a.factor_order) - Number(b.factor_order));
}

function rebuildFactorPaths() {
  const byId = new Map(state.factors.map((f) => [f.id, f]));

  state.factors.forEach((factor) => {
    const chain = [];
    let current = factor;

    while (current) {
      chain.unshift(current);
      current = current.parent_id ? byId.get(current.parent_id) : null;
    }

    factor.path_code = chain.map((f) => f.factor_code).join("_");
    factor.path_name = chain.map((f) => f.factor_name).join(" > ");
    factor.path_key = `${factor.path_code}_${safeKeyName(factor.factor_name)}`;
    factor.factor_key = `${factor.factor_code}_${safeKeyName(factor.factor_name)}`;
  });
}

function renderFactorTree() {
  rebuildFactorPaths();

  const root = document.getElementById("factorTree");
  if (!root) return;

  const roots = getSiblingFactors(null);
  root.innerHTML = roots.map(renderFactorNode).join("");
}

function renderFactorNode(factor) {
  const children = getSiblingFactors(factor.id);
  const activeClass = state.selectedFactorId === factor.id ? "active" : "";
  const nextLevel = getNextLevelByParent(factor.id);
  const addButton = nextLevel
    ? `<button class="node-add" onclick="addFactor('${factor.id}', '${nextLevel}')">+ ${nextLevel}</button>`
    : "";

  return `
    <div class="tree-node">
      <div class="tree-node-row ${activeClass}" onclick="selectFactor('${factor.id}')">
        <span class="node-code">${escapeHtml(factor.factor_code)}</span>
        <span class="node-name">${escapeHtml(factor.factor_name)}</span>
        ${addButton}
      </div>
      ${
        children.length
          ? `<div class="tree-node-children">${children.map(renderFactorNode).join("")}</div>`
          : ""
      }
    </div>
  `;
}

window.selectFactor = function selectFactor(id) {
  state.selectedFactorId = id;

  const factor = state.factors.find((f) => f.id === id);
  if (!factor) return;

  document.getElementById("editingFactorId").value = factor.id;
  document.getElementById("editingFactorLevel").value = factor.factor_level;
  document.getElementById("editingFactorCode").value = factor.factor_code;
  document.getElementById("editingFactorName").value = factor.factor_name;
  document.getElementById("editingFactorReportName").value = factor.factor_report_name;
  document.getElementById("editingFactorOrder").value = factor.factor_order;
  document.getElementById("editingPathCode").textContent = factor.path_code || "-";
  document.getElementById("editingPathName").textContent = factor.path_name || "-";

  renderFactorTree();
};

function saveEditingFactor() {
  const id = document.getElementById("editingFactorId").value;
  if (!id) {
    alert("저장할 요인을 선택하세요.");
    return;
  }

  const factor = state.factors.find((f) => f.id === id);
  if (!factor) return;

  factor.factor_name = document.getElementById("editingFactorName").value.trim();
  factor.factor_report_name = document.getElementById("editingFactorReportName").value.trim();
  factor.factor_order = Number(document.getElementById("editingFactorOrder").value || 1);

  rebuildFactorPaths();
  selectFactor(id);
  renderFactorTree();
}

function deleteEditingFactor() {
  const id = document.getElementById("editingFactorId").value;
  if (!id) return;

  const hasChildren = state.factors.some((f) => f.parent_id === id);
  if (hasChildren) {
    alert("하위 요인이 있는 경우 먼저 하위 요인을 삭제해야 합니다.");
    return;
  }

  state.factors = state.factors.filter((f) => f.id !== id);
  state.selectedFactorId = null;

  document.getElementById("editingFactorId").value = "";
  document.getElementById("editingFactorLevel").value = "";
  document.getElementById("editingFactorCode").value = "";
  document.getElementById("editingFactorName").value = "";
  document.getElementById("editingFactorReportName").value = "";
  document.getElementById("editingFactorOrder").value = "";
  document.getElementById("editingPathCode").textContent = "-";
  document.getElementById("editingPathName").textContent = "-";

  renderFactorTree();
}

function bindTableActions() {
  document.getElementById("btnAddReport")?.addEventListener("click", () => {
    state.reports.push({
      report_code: `REPORT_${state.reports.length + 1}`,
      report_name: "새 보고서",
      report_role: "SUB",
      report_order: state.reports.length + 1,
      description: ""
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
      index_order: state.indices.length + 1
    });
    renderIndicesTable();
  });

  document.getElementById("btnAddOrgLevel")?.addEventListener("click", () => {
    state.orgLevels.push({
      org_level_code: `R${state.orgLevels.length + 1}`,
      org_level_name: "새 조직레벨",
      org_level_key: "",
      org_level_order: state.orgLevels.length + 1,
      source_column_name: ""
    });
    renderOrgLevelsTable();
  });
}

function renderAll() {
  renderFactorTree();
  renderLoaTable();
  renderReportsTable();
  renderIndicesTable();
  renderOrgLevelsTable();
  renderValidationSummary();
}

function renderLoaTable() {
  const tbody = document.querySelector("#loaTable tbody");
  if (!tbody) return;

  tbody.innerHTML = state.loaLevels.map((row, index) => `
    <tr>
      <td><input value="${escapeHtml(row.loa_code)}" onchange="updateLoa(${index}, 'loa_code', this.value)" /></td>
      <td><input value="${escapeHtml(row.loa_name)}" onchange="updateLoa(${index}, 'loa_name', this.value)" /></td>
      <td><input value="${escapeHtml(row.loa_key)}" onchange="updateLoa(${index}, 'loa_key', this.value)" /></td>
      <td><input type="number" value="${row.loa_order}" onchange="updateLoa(${index}, 'loa_order', this.value)" /></td>
      <td><input value="${escapeHtml(row.description)}" onchange="updateLoa(${index}, 'description', this.value)" /></td>
    </tr>
  `).join("");
}

window.updateLoa = function updateLoa(index, key, value) {
  state.loaLevels[index][key] = key.endsWith("_order") ? Number(value) : value;
};

function renderReportsTable() {
  const tbody = document.querySelector("#reportsTable tbody");
  if (!tbody) return;

  tbody.innerHTML = state.reports.map((row, index) => `
    <tr>
      <td><input value="${escapeHtml(row.report_code)}" onchange="updateReport(${index}, 'report_code', this.value)" /></td>
      <td><input value="${escapeHtml(row.report_name)}" onchange="updateReport(${index}, 'report_name', this.value)" /></td>
      <td>
        <select onchange="updateReport(${index}, 'report_role', this.value)">
          ${option("MAIN", row.report_role)}
          ${option("SUB", row.report_role)}
          ${option("AUX", row.report_role)}
        </select>
      </td>
      <td><input type="number" value="${row.report_order}" onchange="updateReport(${index}, 'report_order', this.value)" /></td>
      <td><input value="${escapeHtml(row.description || "")}" onchange="updateReport(${index}, 'description', this.value)" /></td>
      <td><button class="btn small danger ghost" onclick="deleteReport(${index})">삭제</button></td>
    </tr>
  `).join("");
}

window.updateReport = function updateReport(index, key, value) {
  state.reports[index][key] = key === "report_order" ? Number(value) : value;
};

window.deleteReport = function deleteReport(index) {
  state.reports.splice(index, 1);
  renderReportsTable();
};

function renderIndicesTable() {
  const tbody = document.querySelector("#indicesTable tbody");
  if (!tbody) return;

  const reportOptions = state.reports.map((r) => r.report_code);

  tbody.innerHTML = state.indices.map((row, index) => `
    <tr>
      <td>
        <select onchange="updateIndex(${index}, 'report_code', this.value)">
          ${reportOptions.map((code) => option(code, row.report_code)).join("")}
        </select>
      </td>
      <td><input value="${escapeHtml(row.index_code)}" onchange="updateIndex(${index}, 'index_code', this.value)" /></td>
      <td><input value="${escapeHtml(row.index_name)}" onchange="updateIndex(${index}, 'index_name', this.value)" /></td>
      <td>
        <select onchange="updateIndex(${index}, 'index_type', this.value)">
          ${option("TOTAL_INDEX", row.index_type)}
          ${option("BASE_FACTOR_INDEX", row.index_type)}
          ${option("DERIVED_INDEX", row.index_type)}
          ${option("CAPABILITY_INDEX", row.index_type)}
          ${option("SUB_REPORT_INDEX", row.index_type)}
          ${option("CUSTOM_INDEX", row.index_type)}
        </select>
      </td>
      <td>
        <select onchange="updateIndex(${index}, 'calculation_method', this.value)">
          ${option("MEAN_SELECTED_ITEMS", row.calculation_method)}
          ${option("MEAN_SELECTED_FACTORS", row.calculation_method)}
          ${option("CUSTOM_FORMULA", row.calculation_method)}
        </select>
      </td>
      <td><input type="number" value="${row.index_order}" onchange="updateIndex(${index}, 'index_order', this.value)" /></td>
      <td><button class="btn small danger ghost" onclick="deleteIndex(${index})">삭제</button></td>
    </tr>
  `).join("");
}

window.updateIndex = function updateIndex(index, key, value) {
  state.indices[index][key] = key === "index_order" ? Number(value) : value;
};

window.deleteIndex = function deleteIndex(index) {
  state.indices.splice(index, 1);
  renderIndicesTable();
};

function renderOrgLevelsTable() {
  const tbody = document.querySelector("#orgLevelsTable tbody");
  if (!tbody) return;

  tbody.innerHTML = state.orgLevels.map((row, index) => `
    <tr>
      <td><input value="${escapeHtml(row.org_level_code)}" onchange="updateOrgLevel(${index}, 'org_level_code', this.value)" /></td>
      <td><input value="${escapeHtml(row.org_level_name)}" onchange="updateOrgLevel(${index}, 'org_level_name', this.value)" /></td>
      <td><input value="${escapeHtml(row.org_level_key)}" onchange="updateOrgLevel(${index}, 'org_level_key', this.value)" /></td>
      <td><input type="number" value="${row.org_level_order}" onchange="updateOrgLevel(${index}, 'org_level_order', this.value)" /></td>
      <td><input value="${escapeHtml(row.source_column_name)}" onchange="updateOrgLevel(${index}, 'source_column_name', this.value)" /></td>
      <td><button class="btn small danger ghost" onclick="deleteOrgLevel(${index})">삭제</button></td>
    </tr>
  `).join("");
}

window.updateOrgLevel = function updateOrgLevel(index, key, value) {
  const row = state.orgLevels[index];
  row[key] = key === "org_level_order" ? Number(value) : value;

  if (key === "org_level_code" || key === "org_level_name") {
    row.org_level_key = `${row.org_level_code}_${safeKeyName(row.org_level_name)}`;
  }

  renderOrgLevelsTable();
};

window.deleteOrgLevel = function deleteOrgLevel(index) {
  state.orgLevels.splice(index, 1);
  renderOrgLevelsTable();
};

function bindValidationActions() {
  document.getElementById("btnRunValidation")?.addEventListener("click", () => {
    renderValidationSummary();
    alert("검증이 완료되었습니다. 현재는 프론트 상태 기준의 1차 검증입니다.");
  });

  document.getElementById("btnDownloadJson")?.addEventListener("click", downloadPresetJson);

  document.getElementById("btnApplyToDb")?.addEventListener("click", () => {
    alert("DB 반영은 다음 단계에서 Supabase upsert 함수와 연결합니다.");
  });

  document.getElementById("btnSaveDraft")?.addEventListener("click", () => {
    localStorage.setItem("diagnosis_preset_draft", JSON.stringify(buildExportPayload()));
    alert("브라우저 localStorage에 임시저장했습니다.");
  });

  document.getElementById("btnLoadTemplate")?.addEventListener("click", () => {
    const raw = localStorage.getItem("diagnosis_preset_draft");
    if (!raw) {
      alert("저장된 임시 프리셋이 없습니다.");
      return;
    }

    alert("임시 프리셋 불러오기 기능은 다음 단계에서 state merge 방식으로 연결하겠습니다.");
  });
}

function renderValidationSummary() {
  const target = document.getElementById("validationSummary");
  if (!target) return;

  const factorCounts = {};
  state.factors.forEach((f) => {
    factorCounts[f.factor_level] = (factorCounts[f.factor_level] || 0) + 1;
  });

  const cards = [
    ["A단계", factorCounts.A || 0],
    ["B단계", factorCounts.B || 0],
    ["C단계", factorCounts.C || 0],
    ["D단계", factorCounts.D || 0],
    ["보고서", state.reports.length],
    ["지수", state.indices.length],
    ["LOA", state.loaLevels.length],
    ["조직 리포팅 레벨", state.orgLevels.length],
    ["오류", 0]
  ];

  target.innerHTML = cards.map(([label, value]) => `
    <div class="validation-card">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `).join("");
}

function buildExportPayload() {
  return {
    version: "standard_diagnosis_map_template_v3_ui",
    exported_at: new Date().toISOString(),
    project: collectProjectForm(),
    score_settings: collectScoreForm(),
    factor_nodes: state.factors,
    loa_levels: state.loaLevels,
    reports: state.reports,
    indices: state.indices,
    org_reporting_levels: state.orgLevels
  };
}

function collectProjectForm() {
  return {
    client_code: document.getElementById("clientCode")?.value || "",
    client_name: document.getElementById("clientName")?.value || "",
    project_code: document.getElementById("projectCode")?.value || "",
    project_name: document.getElementById("projectName")?.value || "",
    diagnosis_name: document.getElementById("diagnosisName")?.value || "",
    diagnosis_year: document.getElementById("diagnosisYear")?.value || ""
  };
}

function collectScoreForm() {
  return {
    raw_scale_min: Number(document.getElementById("rawScaleMin")?.value || 1),
    raw_scale_max: Number(document.getElementById("rawScaleMax")?.value || 5),
    default_scale_points: Number(document.getElementById("defaultScalePoints")?.value || 5),
    display_score_min: Number(document.getElementById("displayScoreMin")?.value || 1),
    display_score_max: Number(document.getElementById("displayScoreMax")?.value || 5),
    score_display_type: document.getElementById("scoreDisplayType")?.value || "RAW_5_POINT",
    score_transform_method: document.getElementById("scoreTransformMethod")?.value || "NONE",
    positive_raw_values: document.getElementById("positiveRawValues")?.value || "4,5",
    negative_raw_values: document.getElementById("negativeRawValues")?.value || "1,2",
    neutral_raw_values: document.getElementById("neutralRawValues")?.value || "3",
    round_digits: Number(document.getElementById("roundDigits")?.value || 2)
  };
}

function downloadPresetJson() {
  const payload = buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diagnosis_preset_${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function option(value, selectedValue) {
  const selected = value === selectedValue ? "selected" : "";
  return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(value)}</option>`;
}

function safeKeyName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[>/\\|,]/g, "")
    .replace(/[^\w가-힣()·_-]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}