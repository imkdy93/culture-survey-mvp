// ============================================================
// culture-survey-mvp
// 3단계: Supabase 연결 설문 화면
// ============================================================

// 1) 여기에 본인의 Supabase Project URL 입력
const SUPABASE_URL = "https://dzdpailvjbixupfnxmdh.supabase.co";

// 2) 여기에 본인의 anon public key 입력
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZHBhaWx2amJpeHVwZm54bWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTA4NDgsImV4cCI6MjA5NzYyNjg0OH0.XYGGFFDhkKtBko4T6_LNvxf6fe6SUxu3quZLJm6A02M";

// Supabase client 생성
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 현재 MVP에서는 demo 프로젝트 고정
const CLIENT_SLUG = "demo";
const PROJECT_CODE = "demo_2026_culture";

let currentCustomer = null;
let currentProject = null;
let currentRespondent = null;
let currentQuestions = [];

// 시작 시 고객사/프로젝트 기본 정보 로드
document.addEventListener("DOMContentLoaded", async () => {
  await loadProjectInfo();

  document
    .getElementById("loadSurveyBtn")
    .addEventListener("click", handleLoadSurvey);

  document
    .getElementById("surveyForm")
    .addEventListener("submit", handleSubmitSurvey);
});

// ------------------------------------------------------------
// 고객사/프로젝트 정보 로드
// ------------------------------------------------------------
async function loadProjectInfo() {
  try {
    const { data: customer, error: customerError } = await supabaseClient
      .from("customers")
      .select("*")
      .eq("client_slug", CLIENT_SLUG)
      .single();

    if (customerError) {
      throw customerError;
    }

    currentCustomer = customer;

    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("*")
      .eq("project_code", PROJECT_CODE)
      .single();

    if (projectError) {
      throw projectError;
    }

    currentProject = project;

    // 화면 반영
    document.getElementById("clientName").textContent = customer.client_name;
    document.getElementById("surveyTitle").textContent = project.survey_title;
    document.getElementById("surveyDescription").textContent =
      project.survey_description || "";

    const logoBox = document.getElementById("logoBox");
    logoBox.textContent = customer.client_slug.toUpperCase();
    logoBox.style.background = customer.primary_color || "#1F4E79";

    document.querySelectorAll("button").forEach((button) => {
      button.style.background = customer.primary_color || "#1F4E79";
    });
  } catch (error) {
    console.error(error);
    showMessage("tokenMessage", "프로젝트 정보를 불러오지 못했습니다.", true);
  }
}

// ------------------------------------------------------------
// 설문 시작 버튼
// ------------------------------------------------------------
async function handleLoadSurvey() {
  const token = document.getElementById("tokenInput").value.trim();

  if (!token) {
    showMessage("tokenMessage", "응답자 토큰을 입력하세요.", true);
    return;
  }

  try {
    if (!currentProject) {
      throw new Error("프로젝트 정보가 없습니다.");
    }

    // 응답자 확인
    const { data: respondent, error: respondentError } = await supabaseClient
      .from("respondents")
      .select("*")
      .eq("project_id", currentProject.id)
      .eq("respondent_token", token)
      .single();

    if (respondentError || !respondent) {
      throw new Error("유효하지 않은 토큰입니다.");
    }

    if (respondent.is_submitted) {
      showMessage("tokenMessage", "이미 제출이 완료된 응답자입니다.", true);
      return;
    }

    currentRespondent = respondent;

    // 문항 불러오기
    const { data: questions, error: questionsError } = await supabaseClient
      .from("questions")
      .select("*")
      .eq("project_id", currentProject.id)
      .eq("is_active", true)
      .order("question_order", { ascending: true });

    if (questionsError) {
      throw questionsError;
    }

    currentQuestions = questions;

    renderSurvey();

    document.getElementById("tokenSection").classList.add("hidden");
    document.getElementById("surveySection").classList.remove("hidden");
  } catch (error) {
    console.error(error);
    showMessage("tokenMessage", error.message || "설문을 불러오지 못했습니다.", true);
  }
}

// ------------------------------------------------------------
// 설문 문항 렌더링
// ------------------------------------------------------------
function renderSurvey() {
  document.getElementById("respondentKey").textContent =
    currentRespondent.respondent_key || "-";

  document.getElementById("respondentOrg").textContent =
    currentRespondent.org_name || "-";

  const container = document.getElementById("questionContainer");
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

      const labels = {
        1: "전혀 아니다",
        2: "아니다",
        3: "보통",
        4: "그렇다",
        5: "매우 그렇다",
      };

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
          <div>${value}</div>
          <small>${labels[value]}</small>
        `;

        scaleRow.appendChild(label);
      }

      card.appendChild(scaleRow);
    }

    container.appendChild(card);
  });
}

// ------------------------------------------------------------
// 설문 제출
// ------------------------------------------------------------
async function handleSubmitSurvey(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "제출 중...";

  try {
    const formData = new FormData(event.target);

    // 1) responses 테이블에 응답 제출 1건 생성
    const { data: response, error: responseError } = await supabaseClient
      .from("responses")
      .insert({
        project_id: currentProject.id,
        respondent_id: currentRespondent.id,
        respondent_token: currentRespondent.respondent_token,
        source_type: "PLATFORM",
        started_at: null,
        submitted_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_address: null,
        is_valid: true,
      })
      .select()
      .single();

    if (responseError) {
      throw responseError;
    }

    // 2) response_answers 테이블에 문항별 응답값 저장
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

    // 3) respondents 테이블 제출 완료 처리
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

    document.getElementById("surveySection").classList.add("hidden");
    document.getElementById("completeSection").classList.remove("hidden");
  } catch (error) {
    console.error(error);
    showMessage(
      "submitMessage",
      error.message || "응답 저장 중 오류가 발생했습니다.",
      true
    );

    submitBtn.disabled = false;
    submitBtn.textContent = "응답 제출";
  }
}

// ------------------------------------------------------------
// 메시지 표시
// ------------------------------------------------------------
function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = isError ? "message error" : "message success";
}