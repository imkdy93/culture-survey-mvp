// ============================================================
// culture-survey-mvp
// Supabase 연결 조직문화 설문 화면
// project_settings + draft_responses 임시저장/이어하기 연동 버전
// ============================================================

console.log("app.js loaded: page survey + draft version 2026-06-24-07");

// ============================================================
// 1. Supabase 연결 설정
// ============================================================

const SUPABASE_URL = "https://dzdpailvjbixupfnxmdh.supabase.co";

// 실제 운영 중인 anon key를 여기에 넣으세요.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZHBhaWx2amJpeHVwZm54bWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTA4NDgsImV4cCI6MjA5NzYyNjg0OH0.XYGGFFDhkKtBko4T6_LNvxf6fe6SUxu3quZLJm6A02M";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================================
// 2. 전역 상태값
// ============================================================

let currentCustomer = null;
let currentProject = null;
let currentRespondent = null;
let currentQuestions = [];

let runtimeSettings = null;
let entryMode = null;

let clientSlug = null;
let urlToken = null;
let projectCode = null;

let currentDraftResponse = null;
let currentDraftAnswers = {};

let autoSaveTimer = null;

let surveyPreset = null;
let currentPages = [];
let surveyFlowPages = [];
let currentPageIndex = 0;
let currentPage = null;
let currentPageQuestions = [];
let questionPageMap = [];
let questionPageMapByPageCode = {};

let scaleLabels = {
  1: "전혀 아니다",
  2: "아니다",
  3: "보통이다",
  4: "그렇다",
  5: "매우 그렇다",
};


// ============================================================
// 3. URL 정보 추출
// ============================================================

function getUrlContext() {
  const pathParts = window.location.pathname
    .split("/")
    .filter(Boolean);

  const detectedClientSlug = pathParts[0] || "demo";

  const params = new URLSearchParams(window.location.search);
  const detectedToken = params.get("token");

  return {
    clientSlug: detectedClientSlug,
    token: detectedToken,
  };
}


// ============================================================
// 4. project_runtime_settings 조회
// ============================================================

async function loadProjectRuntimeSettings(targetClientSlug) {
  if (!targetClientSlug) {
    throw new Error("고객사 주소를 확인할 수 없습니다.");
  }

  const { data, error } = await supabaseClient
    .from("project_runtime_settings")
    .select("*")
    .eq("client_slug", targetClientSlug)
    .limit(1)
    .single();

  if (error) {
    console.error("project_runtime_settings 조회 실패:", error);
    throw new Error("프로젝트 설정을 불러오지 못했습니다.");
  }

  if (!data) {
    throw new Error("활성화된 프로젝트 설정이 없습니다.");
  }

  console.log("[runtimeSettings]", data);

  return data;
}


// ============================================================
// 5. 접속 방식 결정
// ============================================================

function decideEntryMode(settings, token) {
  const tokenMode = settings.token_mode;

  if (tokenMode === "PERSONAL_TOKEN") {
    if (!token) {
      return {
        ok: false,
        mode: "ERROR",
        message: "개별 설문 링크가 올바르지 않습니다. 안내받은 링크로 다시 접속해 주세요.",
      };
    }

    return {
      ok: true,
      mode: "PERSONAL_TOKEN",
      message: null,
    };
  }

  if (tokenMode === "GROUP_TOKEN") {
    return {
      ok: true,
      mode: "GROUP_TOKEN",
      message: null,
    };
  }

  if (tokenMode === "ANONYMOUS_SESSION") {
    return {
      ok: true,
      mode: "ANONYMOUS_SESSION",
      message: null,
    };
  }

  if (tokenMode === "EMAIL_RECOVERY") {
    return {
      ok: true,
      mode: "EMAIL_RECOVERY",
      message: null,
    };
  }

  if (tokenMode === "PASSWORD_RECOVERY") {
    return {
      ok: true,
      mode: "PASSWORD_RECOVERY",
      message: null,
    };
  }

  return {
    ok: false,
    mode: "ERROR",
    message: "지원하지 않는 설문 접속 방식입니다.",
  };
}


// ============================================================
// 6. DOMContentLoaded 초기화
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initApp();

    const loadSurveyBtn = document.getElementById("loadSurveyBtn");
    const surveyForm = document.getElementById("surveyForm");
    const saveAndExitBtn = document.getElementById("saveAndExitBtn");

    if (loadSurveyBtn) {
      loadSurveyBtn.addEventListener("click", handleLoadSurvey);
    }

    if (surveyForm) {
      surveyForm.addEventListener("submit", handleSubmitSurvey);
    }

    if (saveAndExitBtn) {
      saveAndExitBtn.addEventListener("click", handleSaveAndExit);
    }

    ensureSaveAndExitButton();

    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");

    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", handlePrevPage);
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", handleNextPage);
    }

  } catch (error) {
    console.error(error);
    showMessage(
      "tokenMessage",
      error.message || "설문 초기화 중 오류가 발생했습니다.",
      true
    );
  }
});


// ============================================================
// 7. 앱 초기화
// ============================================================

async function initApp() {
  const urlContext = getUrlContext();

  clientSlug = urlContext.clientSlug;
  urlToken = urlContext.token;

  console.log("[clientSlug]", clientSlug);
  console.log("[urlToken]", urlToken);

  runtimeSettings = await loadProjectRuntimeSettings(clientSlug);

  projectCode = runtimeSettings.project_code;

  currentCustomer = {
    id: runtimeSettings.customer_id,
    client_slug: runtimeSettings.client_slug,
    client_name: runtimeSettings.client_name,
    logo_url: runtimeSettings.logo_url,
    primary_color: runtimeSettings.primary_color,
  };

  currentProject = {
    id: runtimeSettings.project_id,
    project_code: runtimeSettings.project_code,
    project_name: runtimeSettings.project_name,
    survey_title: runtimeSettings.survey_title,
    survey_description: runtimeSettings.survey_description,
    start_at: runtimeSettings.start_at,
    end_at: runtimeSettings.end_at,
    status: runtimeSettings.status,
    scale_type: runtimeSettings.scale_type,
  };

  entryMode = decideEntryMode(runtimeSettings, urlToken);

  console.log("[entryMode]", entryMode);

  applyBranding(runtimeSettings);

  if (!entryMode.ok) {
    showMessage("tokenMessage", entryMode.message, true);
    return;
  }

  prepareEntryScreen();

  if (entryMode.mode === "PERSONAL_TOKEN" && urlToken) {
    await initPersonalTokenSurvey(urlToken);
    return;
  }

  if (entryMode.mode === "ANONYMOUS_SESSION") {
    await initAnonymousSurvey();
    return;
  }

  if (
    entryMode.mode === "GROUP_TOKEN" ||
    entryMode.mode === "EMAIL_RECOVERY" ||
    entryMode.mode === "PASSWORD_RECOVERY"
  ) {
    showMessage(
      "tokenMessage",
      "현재 준비 중인 설문 접속 방식입니다.",
      true
    );
  }
}


// ============================================================
// 8. 화면 브랜딩 반영
// ============================================================

function applyBranding(settings) {
  const primaryColor = settings.primary_color || "#1F4E79";

  document.documentElement.style.setProperty("--primary-color", primaryColor);

  const clientNameEl = document.getElementById("clientName");
  if (clientNameEl) {
    clientNameEl.textContent = settings.client_name || settings.client_slug || "고객사";
  }

  const surveyTitleEl = document.getElementById("surveyTitle");
  if (surveyTitleEl) {
    surveyTitleEl.textContent = settings.survey_title || "조직문화 진단";
  }

  const surveyDescriptionEl = document.getElementById("surveyDescription");
  if (surveyDescriptionEl) {
    surveyDescriptionEl.textContent = settings.survey_description || "";
  }

  const logoBox = document.getElementById("logoBox");
  if (logoBox) {
    logoBox.textContent = (settings.client_slug || "ORG").toUpperCase();
    logoBox.style.background = primaryColor;
  }

  const logoImg = document.getElementById("clientLogo");
  if (logoImg && settings.logo_url) {
    logoImg.src = settings.logo_url;
    logoImg.style.display = "block";
  }

  document.querySelectorAll("button").forEach((button) => {
    button.style.background = primaryColor;
  });
}


// ============================================================
// 9. 접속 방식별 초기 화면 준비
// ============================================================

function prepareEntryScreen() {
  const tokenSection = document.getElementById("tokenSection");
  const tokenInput = document.getElementById("tokenInput");
  const loadSurveyBtn = document.getElementById("loadSurveyBtn");

  if (!tokenSection) {
    return;
  }

  if (entryMode.mode === "PERSONAL_TOKEN") {
    tokenSection.classList.remove("hidden");

    if (tokenInput && urlToken) {
      tokenInput.value = urlToken;
    }

    if (loadSurveyBtn) {
      loadSurveyBtn.textContent = "설문 시작";
    }

    return;
  }

  if (entryMode.mode === "ANONYMOUS_SESSION") {
    tokenSection.classList.add("hidden");
    return;
  }

  tokenSection.classList.remove("hidden");
}


// ============================================================
// 10. 설문 시작 버튼 처리
// ============================================================

async function handleLoadSurvey() {
  try {
    if (!currentProject) {
      throw new Error("프로젝트 정보가 없습니다.");
    }

    if (!entryMode || entryMode.mode !== "PERSONAL_TOKEN") {
      throw new Error("현재 접속 방식에서는 토큰 입력이 필요하지 않습니다.");
    }

    const tokenInput = document.getElementById("tokenInput");
    const token = tokenInput ? tokenInput.value.trim() : "";

    if (!token) {
      showMessage("tokenMessage", "응답자 토큰을 입력하세요.", true);
      return;
    }

    await initPersonalTokenSurvey(token);
  } catch (error) {
    console.error(error);
    showMessage(
      "tokenMessage",
      error.message || "설문을 불러오지 못했습니다.",
      true
    );
  }
}


// ============================================================
// 11. PERSONAL_TOKEN 방식 설문 로드
// ============================================================

async function initPersonalTokenSurvey(token) {
  console.log("PERSONAL_TOKEN 방식으로 설문 시작:", token);

  if (!currentProject) {
    throw new Error("프로젝트 정보가 없습니다.");
  }

  const { data: respondent, error: respondentError } = await supabaseClient
    .from("respondents")
    .select("*")
    .eq("project_id", currentProject.id)
    .eq("respondent_token", token)
    .single();

  if (respondentError || !respondent) {
    console.error("응답자 조회 실패:", respondentError);
    throw new Error("유효하지 않은 토큰입니다.");
  }

  if (respondent.is_submitted) {
    showMessage("tokenMessage", "이미 제출이 완료된 응답자입니다.", true);
    return;
  }

  currentRespondent = respondent;

  await loadQuestionsAndRender();
  await prepareDraftAfterSurveyLoad();

  showSurveySection();
}


// ============================================================
// 12. ANONYMOUS_SESSION 방식 설문 로드
// ============================================================

async function initAnonymousSurvey() {
  console.log("ANONYMOUS_SESSION 방식으로 설문 시작");

  if (!currentProject) {
    throw new Error("프로젝트 정보가 없습니다.");
  }

  const anonymousSessionId = getOrCreateAnonymousSessionId(currentProject.id);

  const { data: existingRespondent, error: existingError } = await supabaseClient
    .from("respondents")
    .select("*")
    .eq("project_id", currentProject.id)
    .eq("respondent_token", anonymousSessionId)
    .maybeSingle();

  if (existingError) {
    console.error("익명 응답자 조회 실패:", existingError);
    throw new Error("익명 응답자 정보를 확인하지 못했습니다.");
  }

  if (existingRespondent) {
    if (existingRespondent.is_submitted) {
      showMessage("tokenMessage", "이미 제출이 완료된 응답입니다.", true);
      return;
    }

    currentRespondent = existingRespondent;
  } else {
    const { data: newRespondent, error: insertError } = await supabaseClient
      .from("respondents")
      .insert({
        project_id: currentProject.id,
        respondent_key: "ANONYMOUS",
        respondent_token: anonymousSessionId,
        org_name: "익명 응답",
        is_submitted: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("익명 응답자 생성 실패:", insertError);
      throw new Error("익명 응답자 정보를 생성하지 못했습니다.");
    }

    currentRespondent = newRespondent;
  }

  currentRespondent.is_anonymous_session = true;
  currentRespondent.anonymous_session_id = anonymousSessionId;

  await loadQuestionsAndRender();
  await prepareDraftAfterSurveyLoad();

  showSurveySection();
}


// ============================================================
// 13. anonymous session id 생성
// ============================================================

function getOrCreateAnonymousSessionId(projectId) {
  const storageKey = `survey_anonymous_session_${projectId}`;

  let sessionId = localStorage.getItem(storageKey);

  if (!sessionId) {
    if (crypto && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      sessionId = `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    localStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}


// ============================================================
// 14. 문항 불러오기 + 렌더링
// ============================================================

async function loadQuestionsAndRender() {
  if (!currentProject) {
    throw new Error("프로젝트 정보가 없습니다.");
  }

  await loadSurveyPreset();
  await loadSurveyPages();
  await loadQuestions();
  await loadQuestionPageMap();

  applyPresetScaleLabels();

  currentPageIndex = 0;
  renderCurrentPage();
}

async function loadSurveyPreset() {
  const { data, error } = await supabaseClient
    .from("project_survey_presets")
    .select("*")
    .eq("project_id", currentProject.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("preset 조회 실패:", error);
    throw new Error("설문 사전 설정을 불러오지 못했습니다.");
  }

  if (!data) {
    throw new Error("활성화된 설문 preset이 없습니다. 관리자 설정을 확인해 주세요.");
  }

  surveyPreset = data;
  console.log("[surveyPreset]", surveyPreset);
}


async function loadSurveyPages() {
  const { data, error } = await supabaseClient
    .from("survey_pages")
    .select("*")
    .eq("project_id", currentProject.id)
    .eq("is_active", true)
    .order("page_order", { ascending: true });

  if (error) {
    console.error("survey_pages 조회 실패:", error);
    throw new Error("설문 페이지 구성을 불러오지 못했습니다.");
  }

  if (!data || data.length === 0) {
    throw new Error("설문 페이지 구성이 없습니다.");
  }

  currentPages = data;

  // OUTRO는 제출 완료 후 화면이므로 응답 진행 flow에서는 제외
  surveyFlowPages = currentPages.filter((page) => page.page_type !== "OUTRO");

  console.log("[surveyFlowPages]", surveyFlowPages);
}


async function loadQuestions() {
  const { data, error } = await supabaseClient
    .from("questions")
    .select("*")
    .eq("project_id", currentProject.id)
    .eq("is_active", true)
    .order("question_order", { ascending: true });

  if (error) {
    console.error("문항 조회 실패:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("등록된 설문 문항이 없습니다.");
  }

  currentQuestions = data;
  console.log("[currentQuestions]", currentQuestions);
}


async function loadQuestionPageMap() {
  const { data, error } = await supabaseClient
    .from("question_page_map")
    .select(`
      *,
      survey_pages (
        page_code,
        page_type,
        page_order
      )
    `)
    .eq("project_id", currentProject.id)
    .eq("is_active", true)
    .order("page_question_order", { ascending: true });

  if (error) {
    console.error("question_page_map 조회 실패:", error);
    throw new Error("문항 페이지 매핑을 불러오지 못했습니다.");
  }

  questionPageMap = data || [];
  questionPageMapByPageCode = {};

  questionPageMap.forEach((row) => {
    const pageCode = row.survey_pages ? row.survey_pages.page_code : null;

    if (!pageCode) {
      return;
    }

    if (!questionPageMapByPageCode[pageCode]) {
      questionPageMapByPageCode[pageCode] = [];
    }

    questionPageMapByPageCode[pageCode].push(row);
  });

  console.log("[questionPageMapByPageCode]", questionPageMapByPageCode);
}


function applyPresetScaleLabels() {
  try {
    const labels = surveyPreset &&
      surveyPreset.scale_config &&
      surveyPreset.scale_config.labels;

    if (!labels) {
      return;
    }

    scaleLabels = {};

    Object.keys(labels).forEach((key) => {
      scaleLabels[Number(key)] = labels[key];
    });

    console.log("[scaleLabels]", scaleLabels);
  } catch (error) {
    console.warn("척도 라벨 적용 실패, 기본값 사용:", error);
  }
}


// ============================================================
// 15. 설문 문항 렌더링
// ============================================================

function renderCurrentPage() {
  currentPage = surveyFlowPages[currentPageIndex];

  if (!currentPage) {
    console.error("현재 페이지를 찾을 수 없습니다.", currentPageIndex);
    return;
  }

  const respondentKeyEl = document.getElementById("respondentKey");
  const respondentOrgEl = document.getElementById("respondentOrg");

  if (respondentKeyEl) {
    respondentKeyEl.textContent = currentRespondent.respondent_key || "-";
  }

  if (respondentOrgEl) {
    respondentOrgEl.textContent = currentRespondent.org_name || "-";
  }

  clearSubmitMessage();

  if (currentPage.page_type === "INTRO") {
    renderIntroPage();
  } else if (currentPage.page_type === "ITEMS") {
    renderItemsPage();
  } else if (currentPage.page_type === "BIO") {
    renderSimpleInfoPage("인구통계 정보", currentPage.page_description || "");
  } else if (currentPage.page_type === "DEPART") {
    renderSimpleInfoPage("소속 부서 정보", currentPage.page_description || "");
  } else if (currentPage.page_type === "REVIEW") {
    renderSimpleInfoPage("제출 전 확인", currentPage.page_description || "");
  } else {
    renderSimpleInfoPage(currentPage.page_title || "설문", currentPage.page_description || "");
  }

  applyDraftAnswersToForm();
  bindDraftAutoSaveEvents();
  updatePageNavButtons();
}


function renderIntroPage() {
  const container = document.getElementById("questionContainer");

  if (!container) {
    return;
  }

  const title =
    surveyPreset?.page_texts?.intro_title ||
    currentPage.page_title ||
    "조직문화 진단 안내";

  const body =
    surveyPreset?.page_texts?.intro_body ||
    currentPage.page_description ||
    "";

  const privacyNotice =
    surveyPreset?.page_texts?.privacy_notice ||
    "";

  const draftNotice =
    surveyPreset?.page_texts?.draft_notice ||
    "";

  container.innerHTML = `
    <div class="question-card intro-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      ${privacyNotice ? `<p class="help-text">${escapeHtml(privacyNotice)}</p>` : ""}
      ${draftNotice ? `<p class="help-text">${escapeHtml(draftNotice)}</p>` : ""}
    </div>
  `;
}


function renderItemsPage() {
  const container = document.getElementById("questionContainer");

  if (!container) {
    console.error("questionContainer 요소를 찾을 수 없습니다.");
    return;
  }

  const pageMappings = questionPageMapByPageCode[currentPage.page_code] || [];

  currentPageQuestions = pageMappings
    .map((mapping) => currentQuestions.find((q) => q.id === mapping.question_id))
    .filter(Boolean)
    .sort((a, b) => a.question_order - b.question_order);

  const instruction =
    currentPage.page_description ||
    surveyPreset?.page_texts?.items_instruction ||
    "각 문항을 읽고 현재 조직에 가장 가까운 응답을 선택해 주세요.";

  container.innerHTML = `
    <div class="page-header-box">
      <h3>${escapeHtml(currentPage.page_title || "조직문화 진단 문항")}</h3>
      <p>${escapeHtml(instruction)}</p>
    </div>
  `;

  currentPageQuestions.forEach((question) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.dataset.questionCode = question.question_code;

    const title = document.createElement("div");
    title.className = "question-title";
    title.textContent = `${question.question_code}. ${question.question_text}`;
    card.appendChild(title);

    const error = document.createElement("div");
    error.className = "question-error hidden";
    error.textContent =
      surveyPreset?.validation_messages?.required_question ||
      "이 문항에 응답해 주세요.";
    card.appendChild(error);

    if (question.question_type === "SCALE") {
      const scaleRow = document.createElement("div");
      scaleRow.className = "scale-row";

      const scaleMax = Number(question.scale_type || surveyPreset?.scale_points || 5);

      for (let value = 1; value <= scaleMax; value++) {
        const label = document.createElement("label");
        label.className = "scale-option";

        label.innerHTML = `
          <input
            type="radio"
            name="${question.question_code}"
            value="${value}"
            data-question-id="${question.id}"
            data-question-code="${question.question_code}"
            data-question-type="${question.question_type}"
          />
          <div class="scale-score">${value}</div>
          <small class="scale-label">${escapeHtml(scaleLabels[value] || "")}</small>
        `;

        scaleRow.appendChild(label);
      }

      card.appendChild(scaleRow);
    } else if (question.question_type === "TEXT") {
      const textarea = document.createElement("textarea");
      textarea.name = question.question_code;
      textarea.rows = 4;
      textarea.placeholder = "의견을 입력해 주세요.";
      textarea.dataset.questionId = question.id;
      textarea.dataset.questionCode = question.question_code;
      textarea.dataset.questionType = question.question_type;

      card.appendChild(textarea);
    }

    container.appendChild(card);
  });
}


function renderSimpleInfoPage(title, description) {
  const container = document.getElementById("questionContainer");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="question-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}


function clearSubmitMessage() {
  showMessage("submitMessage", "", false);
}


function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function ensureSaveAndExitButton() {
  const submitArea = document.querySelector(".submit-area");
  const submitBtn = document.getElementById("submitBtn");

  if (!submitArea || !submitBtn) {
    return;
  }

  let saveAndExitBtn = document.getElementById("saveAndExitBtn");

  if (!saveAndExitBtn) {
    saveAndExitBtn = document.createElement("button");
    saveAndExitBtn.type = "button";
    saveAndExitBtn.id = "saveAndExitBtn";
    saveAndExitBtn.className = "secondary-btn";
    saveAndExitBtn.textContent = "임시저장 후 종료";

    submitArea.insertBefore(saveAndExitBtn, submitBtn);
  }

  saveAndExitBtn.removeEventListener("click", handleSaveAndExit);
  saveAndExitBtn.addEventListener("click", handleSaveAndExit);
}

function ensurePageNavButtons() {
  const submitArea = document.querySelector(".submit-area");
  const submitBtn = document.getElementById("submitBtn");

  if (!submitArea || !submitBtn) {
    return;
  }

  let prevPageBtn = document.getElementById("prevPageBtn");
  let nextPageBtn = document.getElementById("nextPageBtn");

  if (!prevPageBtn) {
    prevPageBtn = document.createElement("button");
    prevPageBtn.type = "button";
    prevPageBtn.id = "prevPageBtn";
    prevPageBtn.className = "secondary-btn";
    prevPageBtn.textContent = "이전";
    submitArea.insertBefore(prevPageBtn, submitArea.firstChild);
  }

  if (!nextPageBtn) {
    nextPageBtn = document.createElement("button");
    nextPageBtn.type = "button";
    nextPageBtn.id = "nextPageBtn";
    nextPageBtn.textContent = "다음";
    submitArea.insertBefore(nextPageBtn, submitBtn);
  }
}


function updatePageNavButtons() {
  ensurePageNavButtons();

  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const saveAndExitBtn = document.getElementById("saveAndExitBtn");
  const submitBtn = document.getElementById("submitBtn");

  const buttonLabels = surveyPreset?.button_labels || {};

  const isFirstPage = currentPageIndex === 0;
  const isLastFlowPage = currentPageIndex === surveyFlowPages.length - 1;
  const isIntroPage = currentPage && currentPage.page_type === "INTRO";

  if (prevPageBtn) {
    prevPageBtn.textContent = buttonLabels.prev || "이전";
    prevPageBtn.classList.toggle("hidden", isFirstPage);
  }

  if (nextPageBtn) {
    nextPageBtn.textContent = isIntroPage
      ? (buttonLabels.start || "설문 시작")
      : (buttonLabels.next || "다음");

    nextPageBtn.classList.toggle("hidden", isLastFlowPage);
  }

  if (saveAndExitBtn) {
    saveAndExitBtn.textContent = buttonLabels.save_exit || "임시저장 후 종료";
    saveAndExitBtn.classList.toggle("hidden", isIntroPage);
  }

  if (submitBtn) {
    submitBtn.textContent = buttonLabels.submit || "응답 제출";
    submitBtn.classList.toggle("hidden", !isLastFlowPage);
  }
}

async function handleNextPage() {
  try {
    if (!currentPage) {
      return;
    }

    if (currentPage.page_type === "ITEMS") {
      const valid = validateCurrentItemsPage();

      if (!valid) {
        return;
      }

      await saveCurrentPageVisibleAnswers();
      await updateDraftPageState({
        currentPageCode: currentPage.page_code,
        currentPageOrder: currentPage.page_order,
        lastCompletedPageOrder: currentPage.page_order,
      });
    }

    if (currentPageIndex < surveyFlowPages.length - 1) {
      currentPageIndex++;
      currentPage = surveyFlowPages[currentPageIndex];

      await updateDraftPageState({
        currentPageCode: currentPage.page_code,
        currentPageOrder: currentPage.page_order,
      });

      renderCurrentPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (error) {
    console.error(error);
    showMessage(
      "submitMessage",
      error.message || "다음 페이지로 이동하지 못했습니다.",
      true
    );
  }
}


async function handlePrevPage() {
  try {
    if (currentPage && currentPage.page_type === "ITEMS") {
      await saveCurrentPageVisibleAnswers();
    }

    if (currentPageIndex > 0) {
      currentPageIndex--;
      currentPage = surveyFlowPages[currentPageIndex];

      await updateDraftPageState({
        currentPageCode: currentPage.page_code,
        currentPageOrder: currentPage.page_order,
      });

      renderCurrentPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (error) {
    console.error(error);
    showMessage(
      "submitMessage",
      error.message || "이전 페이지로 이동하지 못했습니다.",
      true
    );
  }
}


// ============================================================
// 16. 설문 섹션 표시
// ============================================================

function showSurveySection() {
  const tokenSection = document.getElementById("tokenSection");
  const surveySection = document.getElementById("surveySection");

  ensureSaveAndExitButton();

  if (tokenSection) {
    tokenSection.classList.add("hidden");
  }

  if (surveySection) {
    surveySection.classList.remove("hidden");
  }

  showMessage("tokenMessage", "", false);
}

function validateCurrentItemsPage() {
  if (!currentPage || currentPage.page_type !== "ITEMS") {
    return true;
  }

  clearQuestionValidationErrors();

  const missingQuestions = [];

  currentPageQuestions.forEach((question) => {
    if (!question.required_yn) {
      return;
    }

    if (question.question_type === "SCALE") {
      const checked = document.querySelector(
        `input[name="${question.question_code}"]:checked`
      );

      if (!checked) {
        missingQuestions.push(question);
      }
    }

    if (question.question_type === "TEXT") {
      const textarea = document.querySelector(
        `textarea[name="${question.question_code}"]`
      );

      if (!textarea || !textarea.value.trim()) {
        missingQuestions.push(question);
      }
    }
  });

  if (missingQuestions.length > 0) {
    const firstMissing = missingQuestions[0];

    markQuestionAsMissing(firstMissing.question_code);

    showMessage(
      "submitMessage",
      surveyPreset?.validation_messages?.required_page ||
        "응답하지 않은 문항이 있습니다.",
      true
    );

    scrollToQuestion(firstMissing.question_code);

    return false;
  }

  return true;
}


function clearQuestionValidationErrors() {
  document.querySelectorAll(".question-card").forEach((card) => {
    card.classList.remove("question-missing");
  });

  document.querySelectorAll(".question-error").forEach((el) => {
    el.classList.add("hidden");
  });
}


function markQuestionAsMissing(questionCode) {
  const card = document.querySelector(
    `.question-card[data-question-code="${questionCode}"]`
  );

  if (!card) {
    return;
  }

  card.classList.add("question-missing");

  const error = card.querySelector(".question-error");

  if (error) {
    error.classList.remove("hidden");
  }
}


function scrollToQuestion(questionCode) {
  const card = document.querySelector(
    `.question-card[data-question-code="${questionCode}"]`
  );

  if (!card) {
    return;
  }

  card.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}


async function saveCurrentPageVisibleAnswers() {
  const inputs = Array.from(
    document.querySelectorAll(
      "#questionContainer input[type='radio']:checked, #questionContainer textarea"
    )
  );

  for (const input of inputs) {
    await saveSingleDraftAnswerFromElement(input);
  }

  await updateDraftResponseSummary();
}


async function updateDraftPageState({
  currentPageCode = null,
  currentPageOrder = null,
  lastCompletedPageOrder = null,
} = {}) {
  if (!currentDraftResponse) {
    return;
  }

  const payload = {
    last_saved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (currentPageCode !== null) {
    payload.current_page_code = currentPageCode;
    payload.last_saved_page_code = currentPageCode;
  }

  if (currentPageOrder !== null) {
    payload.current_page_order = currentPageOrder;
  }

  if (lastCompletedPageOrder !== null) {
    payload.last_completed_page_order = lastCompletedPageOrder;
  }

  const { data, error } = await supabaseClient
    .from("draft_responses")
    .update(payload)
    .eq("id", currentDraftResponse.id)
    .select()
    .single();

  if (error) {
    console.error("draft page state 업데이트 실패:", error);
    return;
  }

  currentDraftResponse = data;
}


// ============================================================
// 17. draft 준비
// ============================================================

async function prepareDraftAfterSurveyLoad() {
  if (!runtimeSettings || !runtimeSettings.allow_draft_save) {
    renderCurrentPage();
    return;
  }

  const existingDraft = await findActiveDraft();

  if (existingDraft) {
    const continueDraft = confirm(
      `이전에 작성 중인 응답이 있습니다.\n\n` +
      `저장된 응답 수: ${existingDraft.answered_count || 0}개\n` +
      `마지막 저장 시각: ${formatDateTime(existingDraft.last_saved_at)}\n\n` +
      `이어서 작성하시겠습니까?\n\n` +
      `확인: 이어서 작성\n취소: 처음부터 다시 작성`
    );

    if (continueDraft) {
      currentDraftResponse = existingDraft;
      await loadDraftAnswers(existingDraft.id);

      setCurrentPageIndexFromDraft(existingDraft);

      renderCurrentPage();
      applyDraftAnswersToForm();

      showDraftStatus("이전에 저장된 응답을 불러왔습니다.");
      return;
    }

    await resetDraft(existingDraft.id);
  }

  currentPageIndex = 0;
  currentPage = surveyFlowPages[currentPageIndex];

  currentDraftResponse = await createDraftResponse();
  currentDraftAnswers = {};

  renderCurrentPage();

  showDraftStatus("임시저장이 시작되었습니다.");
}


function setCurrentPageIndexFromDraft(draft) {
  if (!draft || !draft.current_page_code) {
    currentPageIndex = 0;
    return;
  }

  const foundIndex = surveyFlowPages.findIndex(
    (page) => page.page_code === draft.current_page_code
  );

  currentPageIndex = foundIndex >= 0 ? foundIndex : 0;
}


// ============================================================
// 18. 기존 draft 조회
// ============================================================

async function findActiveDraft() {
  let query = supabaseClient
    .from("draft_responses")
    .select("*")
    .eq("project_id", currentProject.id)
    .eq("draft_status", "IN_PROGRESS")
    .order("last_saved_at", { ascending: false })
    .limit(1);

  if (currentRespondent && currentRespondent.id) {
    query = query.eq("respondent_id", currentRespondent.id);
  } else if (currentRespondent && currentRespondent.respondent_token) {
    query = query.eq("respondent_token", currentRespondent.respondent_token);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("draft 조회 실패:", error);
    throw new Error("임시저장 정보를 확인하지 못했습니다.");
  }

  return data || null;
}


// ============================================================
// 19. draft 생성
// ============================================================

async function createDraftResponse() {
  const { data, error } = await supabaseClient
    .from("draft_responses")
    .insert({
      project_id: currentProject.id,
      respondent_id: currentRespondent.id,
      respondent_token: currentRespondent.respondent_token,
      anonymous_session_id: currentRespondent.anonymous_session_id || null,
      draft_status: "IN_PROGRESS",
      answered_count: 0,
      total_question_count: currentQuestions.length,
      current_page_code: currentPage ? currentPage.page_code : null,
      current_page_order: currentPage ? currentPage.page_order : null,
      last_completed_page_order: null,
      last_saved_page_code: currentPage ? currentPage.page_code : null,
      started_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      ip_address: null,
    })
    .select()
    .single();

  if (error) {
    console.error("draft 생성 실패:", error);
    throw new Error("임시저장을 시작하지 못했습니다.");
  }

  console.log("[currentDraftResponse]", data);

  return data;
}


// ============================================================
// 20. draft reset 처리
// ============================================================

async function resetDraft(draftResponseId) {
  const { error } = await supabaseClient
    .from("draft_responses")
    .update({
      draft_status: "RESET",
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftResponseId);

  if (error) {
    console.error("draft RESET 실패:", error);
    throw new Error("기존 임시응답을 초기화하지 못했습니다.");
  }
}


// ============================================================
// 21. draft answers 불러오기
// ============================================================

async function loadDraftAnswers(draftResponseId) {
  const { data, error } = await supabaseClient
    .from("draft_response_answers")
    .select("*")
    .eq("draft_response_id", draftResponseId);

  if (error) {
    console.error("draft answers 조회 실패:", error);
    throw new Error("임시저장 응답을 불러오지 못했습니다.");
  }

  currentDraftAnswers = {};

  (data || []).forEach((row) => {
    currentDraftAnswers[row.question_code] = row;
  });

  console.log("[currentDraftAnswers]", currentDraftAnswers);
}


// ============================================================
// 22. draft answers를 화면에 반영
// ============================================================

function applyDraftAnswersToForm() {
  Object.values(currentDraftAnswers).forEach((answer) => {
    const question = currentQuestions.find(
      (q) => q.question_code === answer.question_code
    );

    if (!question) {
      return;
    }

    if (question.question_type === "SCALE" && answer.answer_value !== null) {
      const radio = document.querySelector(
        `input[name="${question.question_code}"][value="${answer.answer_value}"]`
      );

      if (radio) {
        radio.checked = true;
      }
    }

    if (question.question_type === "TEXT") {
      const textarea = document.querySelector(
        `textarea[name="${question.question_code}"]`
      );

      if (textarea) {
        textarea.value = answer.answer_text || "";
      }
    }
  });
}


// ============================================================
// 23. 자동저장 이벤트 연결
// ============================================================

function bindDraftAutoSaveEvents() {
  const surveyForm = document.getElementById("surveyForm");

  if (!surveyForm) {
    return;
  }

  surveyForm.querySelectorAll("input[type='radio'], textarea").forEach((el) => {
    el.addEventListener("change", handleDraftInputChange);
    el.addEventListener("input", handleDraftInputChangeDebounced);
  });
}


function handleDraftInputChange(event) {
  saveSingleDraftAnswerFromElement(event.target);
}


function handleDraftInputChangeDebounced(event) {
  const target = event.target;

  if (target.tagName !== "TEXTAREA") {
    return;
  }

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    saveSingleDraftAnswerFromElement(target);
  }, 700);
}


// ============================================================
// 24. 단일 문항 임시저장
// ============================================================

async function saveSingleDraftAnswerFromElement(element) {
  try {
    if (!runtimeSettings || !runtimeSettings.allow_draft_save) {
      return;
    }

    if (!currentDraftResponse) {
      return;
    }

    const questionCode = element.dataset.questionCode || element.name;
    const questionId = element.dataset.questionId;
    const questionType = element.dataset.questionType;

    if (!questionCode || !questionId || !questionType) {
      return;
    }

    let answerValue = null;
    let answerText = null;

    if (questionType === "SCALE") {
      if (!element.checked) {
        return;
      }

      answerValue = Number(element.value);
    }

    if (questionType === "TEXT") {
      answerText = element.value || "";
    }

    const payload = {
      draft_response_id: currentDraftResponse.id,
      project_id: currentProject.id,
      respondent_id: currentRespondent.id,
      question_id: questionId,
      question_code: questionCode,
      answer_value: answerValue,
      answer_text: answerText,
      saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("draft_response_answers")
      .upsert(payload, {
        onConflict: "draft_response_id,question_id",
      });

    if (error) {
      console.error("문항 임시저장 실패:", error);
      showDraftStatus("임시저장 실패", true);
      return;
    }

    currentDraftAnswers[questionCode] = {
      draft_response_id: currentDraftResponse.id,
      project_id: currentProject.id,
      respondent_id: currentRespondent.id,
      question_id: questionId,
      question_code: questionCode,
      answer_value: answerValue,
      answer_text: answerText,
      saved_at: new Date().toISOString(),
    };

    await updateDraftResponseSummary();

    showDraftStatus("임시저장됨");
  } catch (error) {
    console.error(error);
    showDraftStatus("임시저장 중 오류가 발생했습니다.", true);
  }
}


// ============================================================
// 25. draft 요약 업데이트
// ============================================================

async function updateDraftResponseSummary() {
  if (!currentDraftResponse) {
    return;
  }

  const { count, error: countError } = await supabaseClient
    .from("draft_response_answers")
    .select("*", { count: "exact", head: true })
    .eq("draft_response_id", currentDraftResponse.id);

  if (countError) {
    console.error("draft count 조회 실패:", countError);
    return;
  }

  const answeredCount = count || 0;

  const { data, error } = await supabaseClient
    .from("draft_responses")
    .update({
      answered_count: answeredCount,
      total_question_count: currentQuestions.length,
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", currentDraftResponse.id)
    .select()
    .single();

  if (error) {
    console.error("draft summary 업데이트 실패:", error);
    return;
  }

  currentDraftResponse = data;
}


// ============================================================
// 26. draft 제출완료 처리
// ============================================================

async function markDraftAsSubmitted() {
  if (!currentDraftResponse) {
    return;
  }

  const { error } = await supabaseClient
    .from("draft_responses")
    .update({
      draft_status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", currentDraftResponse.id);

  if (error) {
    console.error("draft SUBMITTED 처리 실패:", error);
  }
}


// ============================================================
// 27. 설문 제출
// ============================================================

async function handleSubmitSurvey(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("submitBtn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "제출 중...";
  }

  try {
    if (!currentProject) {
      throw new Error("프로젝트 정보가 없습니다.");
    }

    if (!currentRespondent) {
      throw new Error("응답자 정보가 없습니다.");
    }

  if (currentPage && currentPage.page_type === "ITEMS") {
    const valid = validateCurrentItemsPage();

    if (!valid) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = surveyPreset?.button_labels?.submit || "응답 제출";
      }
      return;
    }

    await saveCurrentPageVisibleAnswers();

    await updateDraftPageState({
      currentPageCode: currentPage.page_code,
      currentPageOrder: currentPage.page_order,
      lastCompletedPageOrder: currentPage.page_order,
    });
  }

    if (currentDraftResponse) {
      await loadDraftAnswers(currentDraftResponse.id);
    }

    const missingRequired = [];

    currentQuestions.forEach((question) => {
      if (!question.required_yn) {
        return;
      }

      const answer = currentDraftAnswers[question.question_code];

      if (!answer) {
        missingRequired.push(question);
        return;
      }

      if (question.question_type === "SCALE") {
        if (answer.answer_value === null || answer.answer_value === undefined) {
          missingRequired.push(question);
        }
      }

      if (question.question_type === "TEXT") {
        if (!answer.answer_text || !String(answer.answer_text).trim()) {
          missingRequired.push(question);
        }
      }
    });

    if (missingRequired.length > 0) {
      const firstMissing = missingRequired[0];
      moveToQuestionPage(firstMissing.question_code);

      showMessage(
        "submitMessage",
        `${firstMissing.question_code} 문항에 응답해 주세요.`,
        true
      );

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = surveyPreset?.button_labels?.submit || "응답 제출";
      }

      return;
    }

    const confirmed = confirm(
      surveyPreset?.validation_messages?.submit_confirm ||
        "응답을 최종 제출하시겠습니까?"
    );

    if (!confirmed) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = surveyPreset?.button_labels?.submit || "응답 제출";
      }
      return;
    }

    const responseInsertPayload = {
      project_id: currentProject.id,
      respondent_id: currentRespondent.id,
      respondent_token: currentRespondent.respondent_token,
      source_type: "PLATFORM",
      started_at: currentDraftResponse ? currentDraftResponse.started_at : null,
      submitted_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      ip_address: null,
      is_valid: true,
    };

    const { data: response, error: responseError } = await supabaseClient
      .from("responses")
      .insert(responseInsertPayload)
      .select()
      .single();

    if (responseError) {
      throw responseError;
    }

    const answerRows = currentQuestions.map((question) => {
      const answer = currentDraftAnswers[question.question_code] || {};

      return {
        response_id: response.id,
        project_id: currentProject.id,
        question_id: question.id,
        question_code: question.question_code,
        answer_value:
          question.question_type === "SCALE"
            ? Number(answer.answer_value)
            : null,
        answer_text:
          question.question_type === "TEXT"
            ? String(answer.answer_text || "")
            : null,
      };
    });

    const { error: answersError } = await supabaseClient
      .from("response_answers")
      .insert(answerRows);

    if (answersError) {
      throw answersError;
    }

    if (currentRespondent.id) {
      const submittedAt = new Date().toISOString();

      const { error: respondentUpdateError } = await supabaseClient
        .from("respondents")
        .update({
          is_submitted: true,
          submitted_at: submittedAt,
        })
        .eq("id", currentRespondent.id);

      if (respondentUpdateError) {
        throw respondentUpdateError;
      }

      currentRespondent.is_submitted = true;
      currentRespondent.submitted_at = submittedAt;
    }

    await markDraftAsSubmitted();

    const surveySection = document.getElementById("surveySection");
    const completeSection = document.getElementById("completeSection");

    if (surveySection) {
      surveySection.classList.add("hidden");
    }

    if (completeSection) {
      completeSection.classList.remove("hidden");
    }
  } catch (error) {
    console.error(error);

    showMessage(
      "submitMessage",
      error.message || "응답 저장 중 오류가 발생했습니다.",
      true
    );

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = surveyPreset?.button_labels?.submit || "응답 제출";
    }
  }
}


function moveToQuestionPage(questionCode) {
  const mapping = questionPageMap.find(
    (row) => row.question_code === questionCode
  );

  if (!mapping || !mapping.survey_pages) {
    return;
  }

  const pageCode = mapping.survey_pages.page_code;

  const targetIndex = surveyFlowPages.findIndex(
    (page) => page.page_code === pageCode
  );

  if (targetIndex < 0) {
    return;
  }

  currentPageIndex = targetIndex;
  renderCurrentPage();

  setTimeout(() => {
    markQuestionAsMissing(questionCode);
    scrollToQuestion(questionCode);
  }, 100);
}


async function handleSaveAndExit() {
  try {
    if (!currentDraftResponse) {
      showDraftStatus("아직 임시저장할 응답이 없습니다.", true);
      return;
    }

    await updateDraftResponseSummary();

    showDraftStatus("임시저장되었습니다. 나중에 동일 링크로 이어서 작성할 수 있습니다.");

    alert(
      "현재까지의 응답이 임시저장되었습니다.\n\n" +
      "나중에 동일한 설문 링크로 다시 접속하면 이어서 작성할 수 있습니다."
    );
  } catch (error) {
    console.error(error);
    showDraftStatus("임시저장 중 오류가 발생했습니다.", true);
  }
}

// ============================================================
// 28. draft 상태 메시지 표시
// ============================================================

function showDraftStatus(message, isError = false) {
  const element = document.getElementById("draftMessage");

  if (!element) {
    return;
  }

  element.textContent = message || "";

  if (!message) {
    element.className = "message";
    return;
  }

  element.className = isError ? "message error" : "message success";
}


// ============================================================
// 29. 일반 메시지 표시
// ============================================================

function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = message || "";

  if (!message) {
    element.className = "message";
    return;
  }

  element.className = isError ? "message error" : "message success";
}


// ============================================================
// 30. 날짜 표시
// ============================================================

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  try {
    const date = new Date(value);

    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return String(value);
  }
}