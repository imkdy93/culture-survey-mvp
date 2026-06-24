// ============================================================
// culture-survey-mvp
// Supabase 연결 조직문화 설문 화면
// project_settings / project_runtime_settings 연동 버전
// ============================================================


// ============================================================
// 1. Supabase 연결 설정
// ============================================================

// Supabase Project URL
const SUPABASE_URL = "https://dzdpailvjbixupfnxmdh.supabase.co";

// Supabase anon public key
// 실제 운영 중인 anon key를 여기에 넣으세요.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZHBhaWx2amJpeHVwZm54bWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTA4NDgsImV4cCI6MjA5NzYyNjg0OH0.XYGGFFDhkKtBko4T6_LNvxf6fe6SUxu3quZLJm6A02M";

// Supabase client 생성
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

const scaleLabels = {
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

  // 예:
  // /acme/survey/?token=acme-token-001
  // pathParts = ["acme", "survey"]
  //
  // /demo/
  // pathParts = ["demo"]

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

    if (loadSurveyBtn) {
      loadSurveyBtn.addEventListener("click", handleLoadSurvey);
    }

    if (surveyForm) {
      surveyForm.addEventListener("submit", handleSubmitSurvey);
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

  // PERSONAL_TOKEN인데 URL에 token이 있으면 자동으로 설문 로드
  if (entryMode.mode === "PERSONAL_TOKEN" && urlToken) {
    await initPersonalTokenSurvey(urlToken);
    return;
  }

  // ANONYMOUS_SESSION이면 token 입력 없이 바로 설문 로드
  if (entryMode.mode === "ANONYMOUS_SESSION") {
    await initAnonymousSurvey();
    return;
  }

  // 그 외 방식은 아직 MVP에서 준비만 해둠
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
// PERSONAL_TOKEN 수동 입력 방식
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

  const tokenSection = document.getElementById("tokenSection");
  const surveySection = document.getElementById("surveySection");

  if (tokenSection) {
    tokenSection.classList.add("hidden");
  }

  if (surveySection) {
    surveySection.classList.remove("hidden");
  }

  showMessage("tokenMessage", "", false);
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

  // 1) 기존 anonymous respondent가 있는지 확인
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
    // 2) 없으면 anonymous respondent 생성
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

  const tokenSection = document.getElementById("tokenSection");
  const surveySection = document.getElementById("surveySection");

  if (tokenSection) {
    tokenSection.classList.add("hidden");
  }

  if (surveySection) {
    surveySection.classList.remove("hidden");
  }

  showMessage("tokenMessage", "", false);
}


// ============================================================
// 13. anonymous session id 생성
// MVP용: 브라우저 localStorage 사용
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

  const { data: questions, error: questionsError } = await supabaseClient
    .from("questions")
    .select("*")
    .eq("project_id", currentProject.id)
    .eq("is_active", true)
    .order("question_order", { ascending: true });

  if (questionsError) {
    console.error("문항 조회 실패:", questionsError);
    throw questionsError;
  }

  if (!questions || questions.length === 0) {
    throw new Error("등록된 설문 문항이 없습니다.");
  }

  currentQuestions = questions;

  renderSurvey();
}


// ============================================================
// 15. 설문 문항 렌더링
// ============================================================

function renderSurvey() {
  const respondentKeyEl = document.getElementById("respondentKey");
  const respondentOrgEl = document.getElementById("respondentOrg");

  if (respondentKeyEl) {
    respondentKeyEl.textContent =
      currentRespondent.respondent_key || "-";
  }

  if (respondentOrgEl) {
    respondentOrgEl.textContent =
      currentRespondent.org_name || "-";
  }

  const container = document.getElementById("questionContainer");

  if (!container) {
    console.error("questionContainer 요소를 찾을 수 없습니다.");
    return;
  }

  container.innerHTML = "";

  currentQuestions.forEach((question) => {
    const card = document.createElement("div");
    card.className = "question-card";

    const title = document.createElement("div");
    title.className = "question-title";
    title.textContent = `${question.question_code}. ${question.question_text}`;
    card.appendChild(title);

    if (question.question_type === "SCALE") {
      const scaleRow = document.createElement("div");
      scaleRow.className = "scale-row";

      for (let value = 1; value <= 5; value++) {
        const label = document.createElement("label");
        label.className = "scale-option";

        label.innerHTML = `
          <input
            type="radio"
            name="${question.question_code}"
            value="${value}"
            required
          />
          <div class="scale-score">${value}</div>
          <small class="scale-label">${scaleLabels[value]}</small>
        `;

        scaleRow.appendChild(label);
      }

      card.appendChild(scaleRow);
    } else if (question.question_type === "TEXT") {
      const textarea = document.createElement("textarea");
      textarea.name = question.question_code;
      textarea.rows = 4;
      textarea.placeholder = "의견을 입력해 주세요.";

      if (question.required_yn) {
        textarea.required = true;
      }

      card.appendChild(textarea);
    }

    container.appendChild(card);
  });
}


// ============================================================
// 16. 설문 제출
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

    const formData = new FormData(event.target);

    // 1) 필수 응답 확인
    for (const question of currentQuestions) {
      if (question.required_yn) {
        const value = formData.get(question.question_code);

        if (value === null || value === "") {
          throw new Error(`${question.question_code} 문항에 응답해 주세요.`);
        }
      }
    }

    // 2) responses 테이블에 응답 제출 1건 생성
    const responseInsertPayload = {
      project_id: currentProject.id,
      respondent_id: currentRespondent.id,
      respondent_token: currentRespondent.respondent_token,
      source_type: "PLATFORM",
      started_at: null,
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

    // 3) response_answers 테이블에 문항별 응답값 저장
    const answerRows = currentQuestions.map((question) => {
      const rawValue = formData.get(question.question_code);

      return {
        response_id: response.id,
        project_id: currentProject.id,
        question_id: question.id,
        question_code: question.question_code,
        answer_value:
          question.question_type === "SCALE" ? Number(rawValue) : null,
        answer_text:
          question.question_type === "TEXT" ? String(rawValue || "") : null,
      };
    });

    const { error: answersError } = await supabaseClient
      .from("response_answers")
      .insert(answerRows);

    if (answersError) {
      throw answersError;
    }

    // 4) respondents 테이블 제출 완료 처리
    // anonymous session은 respondents.id가 없으므로 update 생략
    if (!currentRespondent.is_anonymous_session && currentRespondent.id) {
      const { error: respondentUpdateError } = await supabaseClient
        .from("respondents")
        .update({
          is_submitted: true,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", currentRespondent.id);

      if (respondentUpdateError) {
        throw respondentUpdateError;
      }
    }

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
      submitBtn.textContent = "응답 제출";
    }
  }
}


// ============================================================
// 17. 메시지 표시
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