import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation, Link } from "react-router-dom";

// ─── API CONFIG ────────────────────────────────────────────────────────────────
const GATEWAY = import.meta.env.VITE_API_URL || "http://localhost:8765";

const AUTH_API = {

  login:    () => `${GATEWAY}/auth/login`,
  register: () => `${GATEWAY}/auth/register`,
};
const QUESTION_API = {
  getByDifficulty: (level) => `${GATEWAY}/question/category/${level}`,
  add:             ()      => `${GATEWAY}/question/add/`,
  delete:          (id)    => `${GATEWAY}/question/deleat/${id}`,
};
const QUIZ_API = {
  create:  ()        => `${GATEWAY}/quiz/create`,
  getQ:    (id)       => `${GATEWAY}/quiz/getq/${id}`,
  // Now goes through quiz-service (which records history), not straight to question-service.
  submit:  (quizId)   => `${GATEWAY}/quiz/submit/${quizId}`,
  history: ()         => `${GATEWAY}/quiz/history`,
};
const SCHEDULED_API = {
  create:    ()     => `${GATEWAY}/quiz/scheduled/create`,
  available: ()     => `${GATEWAY}/quiz/scheduled/available`,
  questions: (id)   => `${GATEWAY}/quiz/scheduled/${id}/questions`,
  submit:    (id)   => `${GATEWAY}/quiz/scheduled/${id}/submit`,
};

// ─── TOKEN HELPERS ─────────────────────────────────────────────────────────────
// Token is kept in a JS variable for fast access, and mirrored to sessionStorage
// so a page refresh doesn't silently log the user out mid-quiz. sessionStorage
// is still cleared when the tab closes (unlike localStorage), so it's a
// reasonable middle ground — just be aware it's still readable by any JS
// running on the page (XSS risk), same caveat as localStorage.
let _token = sessionStorage.getItem("qz_token") || null;
const setToken = (t) => { _token = t; sessionStorage.setItem("qz_token", t); };
const getToken = () => _token;
const clearToken = () => { _token = null; sessionStorage.removeItem("qz_token"); sessionStorage.removeItem("qz_user"); };

// All authenticated requests go through this — auto-attaches Bearer token
async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (res.status === 403) throw new Error("FORBIDDEN");
  return res;
}

// ─── AUTH API ──────────────────────────────────────────────────────────────────
async function apiLogin(username, password) {
  const res = await fetch(AUTH_API.login(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json(); // { token, username, role }
  setToken(data.token);
  return data;
}

async function apiRegister(username, email, password) {
  const res = await fetch(AUTH_API.register(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json(); // { token, username, role }
  setToken(data.token);
  return data;
}

// ─── QUIZ API ──────────────────────────────────────────────────────────────────
async function apiCreateQuiz(title, difficultyLevel, numQuestions) {
  const res = await authFetch(QUIZ_API.create(), {
    method: "POST",
    body: JSON.stringify({ title, difficultyLevel, numQuestions }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`);
  return await res.json(); // Integer quizId
}

async function apiGetQuizQuestions(quizId) {
  const res = await authFetch(QUIZ_API.getQ(quizId));
  if (!res.ok) throw new Error("Failed to fetch quiz questions");
  return await res.json();
}

async function apiSubmitQuiz(quizId, responses) {
  const res = await authFetch(QUIZ_API.submit(quizId), {
    method: "POST",
    body: JSON.stringify(responses),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Unable to submit quiz (HTTP ${res.status})`);
  }
  return await res.json(); // Integer score
}

async function apiGetHistory() {
  const res = await authFetch(QUIZ_API.history());
  if (!res.ok) throw new Error("Failed to fetch history");
  return await res.json();
}

// ─── SCHEDULED QUIZ API ────────────────────────────────────────────────────────
async function apiGetAvailableScheduled() {
  const res = await authFetch(SCHEDULED_API.available());
  if (!res.ok) throw new Error("Failed to fetch scheduled quizzes");
  return await res.json();
}

async function apiCreateScheduledQuiz(dto) {
  const res = await authFetch(SCHEDULED_API.create(), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to create scheduled quiz");
  return await res.json(); // Integer scheduled quiz id
}

async function apiGetScheduledQuestions(id) {
  const res = await authFetch(SCHEDULED_API.questions(id));
  if (!res.ok) throw new Error(res.status === 403 ? "This quiz isn't open right now" : "Failed to fetch quiz questions");
  return await res.json();
}

async function apiSubmitScheduledQuiz(id, responses) {
  const res = await authFetch(SCHEDULED_API.submit(id), {
    method: "POST",
    body: JSON.stringify(responses),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Unable to submit quiz (HTTP ${res.status})`);
  }
  return await res.json();
}

// ─── QUESTION API ──────────────────────────────────────────────────────────────
async function apiGetQuestionsByDifficulty(level) {
  const res = await authFetch(QUESTION_API.getByDifficulty(level));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiAddQuestion(question) {
  const res = await authFetch(QUESTION_API.add(), {
    method: "POST",
    body: JSON.stringify(question),
  });
  if (!res.ok) throw new Error("Failed to add question");
  return await res.text();
}

async function apiDeleteQuestion(id) {
  const res = await authFetch(QUESTION_API.delete(id), { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete question");
  return await res.text();
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0e0f13; --surface: #14161d; --surface2: #1c1f28; --border: #2a2d38;
    --accent: #3b82f6; --accent2: #ff8552; --text: #eef0f6; --muted: #757a8c;
    --correct: #22c55e; --wrong: #ef4444;
    --font-display: 'Syne', sans-serif; --font-mono: 'DM Mono', monospace;
  }
  html, body, #root { height: 100%; width: 100%;  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-display); min-height: 100vh; overflow-x: hidden; }
  .app { min-height: 100vh; position: relative; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .app::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; z-index: 0; }
  .app::after { content: ''; position: fixed; top: -40%; left: -20%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%); pointer-events: none; z-index: 0; animation: drift 12s ease-in-out infinite alternate; }
  @keyframes drift { from { transform: translate(0,0); } to { transform: translate(120px,60px); } }
  .card { position: relative; z-index: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 48px; width: 100%; max-width: 660px; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); }
  @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .home-tag { font-family: var(--font-mono); font-size: 11px; color: var(--accent); letter-spacing: 0.2em; text-transform: uppercase; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); padding: 6px 14px; border-radius: 100px; display: inline-block; margin-bottom: 24px; }
  .home-title { font-size: clamp(32px,5vw,48px); font-weight: 800; line-height: 1.1; margin-bottom: 10px; letter-spacing: -1px; }
  .home-title span { color: var(--accent); }
  .home-sub { font-family: var(--font-mono); color: var(--muted); font-size: 13px; margin-bottom: 36px; }
  .tabs { display: flex; gap: 0; margin-bottom: 32px; background: var(--surface2); border-radius: 12px; padding: 4px; }
  .tab { flex: 1; padding: 10px; background: transparent; border: none; border-radius: 10px; font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .tab.active { background: var(--accent); color: #ffffff; }
  .section-label { font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 10px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 7px; }
  .field input, .field select { width: 100%; padding: 13px 15px; background: var(--surface2); border: 1px solid var(--border); border-radius: 11px; font-family: var(--font-display); font-size: 14px; color: var(--text); outline: none; transition: border-color 0.2s; }
  .field input:focus, .field select:focus { border-color: var(--accent); }
  .field select option { background: var(--surface2); }
  .diff-row { display: flex; gap: 10px; margin-bottom: 28px; }
  .diff-chip { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); font-family: var(--font-mono); font-size: 12px; cursor: pointer; transition: all 0.2s; text-align: center; color: var(--muted); }
  .diff-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(59,130,246,0.08); }
  .diff-chip[data-d="Hard"].active { border-color: var(--accent2); color: var(--accent2); background: rgba(255,133,82,0.08); }
  .num-row { display: flex; gap: 8px; margin-bottom: 28px; }
  .num-chip { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); font-family: var(--font-mono); font-size: 13px; cursor: pointer; transition: all 0.2s; text-align: center; color: var(--muted); font-weight: 600; }
  .num-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(59,130,246,0.08); }
  .primary-btn { width: 100%; padding: 16px; background: var(--accent); color: #ffffff; border: none; border-radius: 13px; font-family: var(--font-display); font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em; }
  .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(59,130,246,0.3); }
  .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .ghost-btn { width: 100%; padding: 14px; background: transparent; border: 1px solid var(--accent); color: var(--accent); border-radius: 13px; font-family: var(--font-display); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
  .ghost-btn:hover { background: rgba(59,130,246,0.06); }
  .nav-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .nav-link { flex: 1; min-width: 120px; text-align: center; padding: 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 11px; font-family: var(--font-mono); font-size: 12px; color: var(--muted); text-decoration: none; cursor: pointer; transition: all 0.2s; }
  .nav-link:hover { border-color: var(--accent); color: var(--accent); }
  .back-link { background: none; border: none; color: var(--muted); font-family: var(--font-mono); font-size: 12px; cursor: pointer; margin-bottom: 16px; text-decoration: none; display: inline-block; }
  .back-link:hover { color: var(--accent); }
  .history-card, .schedule-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 13px; padding: 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .schedule-card-info { flex: 1; }
  .schedule-window { font-family: var(--font-mono); font-size: 11px; color: var(--muted); margin-top: 4px; }
  .err-msg { font-family: var(--font-mono); font-size: 12px; color: var(--wrong); margin-bottom: 14px; padding: 10px 14px; background: rgba(239,68,68,0.08); border-radius: 10px; border: 1px solid rgba(239,68,68,0.2); }
  .ok-msg { font-family: var(--font-mono); font-size: 12px; color: var(--correct); margin-bottom: 14px; padding: 10px 14px; background: rgba(34,197,94,0.08); border-radius: 10px; border: 1px solid rgba(34,197,94,0.2); }
  .user-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 10px 14px; background: var(--surface2); border-radius: 12px; border: 1px solid var(--border); }
  .user-bar-info { display: flex; flex-direction: column; gap: 2px; }
  .user-bar-name { font-family: var(--font-mono); font-size: 12px; color: var(--accent); }
  .user-bar-role { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
  .logout-btn { background: none; border: 1px solid var(--border); padding: 6px 12px; border-radius: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .logout-btn:hover { border-color: var(--wrong); color: var(--wrong); }
  .token-badge { font-family: var(--font-mono); font-size: 10px; color: var(--correct); background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15); padding: 4px 10px; border-radius: 100px; margin-bottom: 20px; display: inline-block; }
  .quiz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
  .q-meta { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
  .q-meta span { color: var(--accent); }
  .quiz-tools { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; }
  .quiz-timer { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--accent); background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.24); padding: 8px 11px; border-radius: 9px; }
  .quiz-timer.low { color: var(--accent2); border-color: rgba(255,133,82,0.4); background: rgba(255,133,82,0.08); }
  .question-nav { display: flex; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
  .question-nav button { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); color: var(--muted); background: var(--surface2); cursor: pointer; font-family: var(--font-mono); font-size: 11px; }
  .question-nav button.answered { color: var(--correct); border-color: rgba(34,197,94,0.45); background: rgba(34,197,94,0.10); }
  .question-nav button.current { color: #fff; border-color: var(--accent); background: var(--accent); }
  .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0 28px; }
  .analytics-row { margin: 14px 0; }
  .analytics-label { display: flex; justify-content: space-between; font-family: var(--font-mono); color: var(--muted); font-size: 11px; margin-bottom: 7px; }
  .analytics-track { height: 8px; overflow: hidden; border-radius: 99px; background: var(--surface2); }
  .analytics-fill { height: 100%; background: var(--accent); border-radius: inherit; }
  .progress-bar { width: 100%; height: 4px; background: var(--surface2); border-radius: 2px; margin-bottom: 32px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s cubic-bezier(0.16,1,0.3,1); }
  .question-text { font-size: clamp(17px,2.8vw,22px); font-weight: 700; line-height: 1.45; margin-bottom: 28px; }
  .options-list { display: flex; flex-direction: column; gap: 9px; }
  .option-btn { width: 100%; padding: 15px 18px; background: var(--surface2); border: 1px solid var(--border); border-radius: 13px; font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 12px; transition: all 0.18s; }
  .option-btn:hover:not(:disabled) { border-color: rgba(59,130,246,0.35); background: rgba(59,130,246,0.04); }
  .option-btn.selected { border-color: var(--accent); background: rgba(59,130,246,0.07); color: var(--accent); }
  .option-btn:disabled { cursor: default; }
  .opt-letter { width: 26px; height: 26px; border-radius: 7px; background: var(--border); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; flex-shrink: 0; }
  .option-btn.selected .opt-letter { background: rgba(59,130,246,0.2); color: var(--accent); }
  .feedback-bar { margin-top: 18px; padding: 13px 16px; border-radius: 11px; font-family: var(--font-mono); font-size: 13px; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .feedback-bar.correct { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); color: var(--correct); }
  .feedback-bar.wrong { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: var(--wrong); }
  .next-btn { margin-top: 20px; width: 100%; padding: 15px; background: transparent; border: 1px solid var(--accent); color: var(--accent); border-radius: 13px; font-family: var(--font-display); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .next-btn:hover { background: rgba(59,130,246,0.07); }
  .result-center { text-align: center; margin-bottom: 36px; }
  .score-ring { width: 130px; height: 130px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto 20px; position: relative; background: conic-gradient(var(--accent) var(--pct,0%), var(--surface2) 0%); }
  .score-ring::before { content: ''; position: absolute; inset: 8px; background: var(--surface); border-radius: 50%; }
  .score-num { position: relative; font-size: 34px; font-weight: 800; color: var(--accent); line-height: 1; }
  .score-den { position: relative; font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
  .result-title { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
  .result-sub { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
  .stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 28px; }
  .stat-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 13px; padding: 14px; text-align: center; }
  .stat-val { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .stat-lbl { font-family: var(--font-mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
  .question-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 13px; padding: 16px; margin-bottom: 10px; }
  .q-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
  .q-badges { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge { font-family: var(--font-mono); font-size: 10px; padding: 3px 9px; border-radius: 100px; border: 1px solid var(--border); color: var(--muted); }
  .badge.diff { border-color: rgba(59,130,246,0.3); color: var(--accent); }
  .del-btn { float: right; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; transition: color 0.2s; }
  .del-btn:hover { color: var(--wrong); }
  .loading { text-align: center; padding: 40px; }
  .dot { display: inline-block; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; margin: 0 3px; animation: bounce 0.8s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay: 0.15s; } .dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce { 0%,80%,100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
  .load-label { font-family: var(--font-mono); font-size: 12px; color: var(--muted); margin-top: 14px; }
  /* Study-app visual system */
  :root { --bg: #07111f; --surface: rgba(13, 27, 47, 0.94); --surface2: #10213a; --border: #233b5e; --accent: #5b8cff; --accent2: #f3a34d; --text: #f5f8ff; --muted: #9badc7; --correct: #3dd6a2; }
  body { background: radial-gradient(circle at 12% 12%, #193b72 0%, transparent 30%), radial-gradient(circle at 92% 85%, #153d4c 0%, transparent 33%), var(--bg); }
  .app { align-items: flex-start; padding: 42px 24px; }
  .app::before { background-image: linear-gradient(rgba(143, 177, 255, .04) 1px, transparent 1px), linear-gradient(90deg, rgba(143, 177, 255, .04) 1px, transparent 1px); }
  .card { box-shadow: 0 24px 80px rgba(0, 0, 0, .28); border-color: rgba(132, 165, 215, .18); }
  .dashboard-card { max-width: 900px; padding: 32px; }
  .dashboard-hero { display: grid; grid-template-columns: 1.45fr .9fr; gap: 22px; padding: 30px; margin: 6px 0 28px; border-radius: 20px; overflow: hidden; background: linear-gradient(125deg, #1e4da6, #296b8d); position: relative; }
  .dashboard-hero::after { content: ''; position: absolute; width: 270px; height: 270px; border: 34px solid rgba(255,255,255,.10); border-radius: 50%; right: -90px; top: -110px; }
  .hero-copy, .hero-metrics { position: relative; z-index: 1; }
  .hero-kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #cfe0ff; margin-bottom: 11px; }
  .hero-title { font-size: clamp(30px, 4vw, 46px); line-height: 1.05; letter-spacing: -1.5px; margin-bottom: 12px; }
  .hero-text { color: #d7e7ff; font-size: 14px; max-width: 410px; line-height: 1.5; }
  .hero-metrics { display: grid; grid-template-columns: 1fr 1fr; align-content: center; gap: 10px; }
  .hero-metric { background: rgba(4, 20, 52, .28); border: 1px solid rgba(255,255,255,.16); border-radius: 14px; padding: 14px; backdrop-filter: blur(6px); }
  .hero-metric strong { display: block; font-size: 23px; } .hero-metric span { font-family: var(--font-mono); font-size: 10px; color: #d2e2ff; text-transform: uppercase; }
  .setup-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; }
  .setup-panel { background: rgba(8, 23, 44, .56); border: 1px solid var(--border); border-radius: 18px; padding: 20px; }
  .setup-panel .section-label { margin-top: 18px; }
  .setup-panel .section-label:first-child { margin-top: 0; }
  .difficulty-cards { display: grid; gap: 9px; }
  .difficulty-card { text-align: left; padding: 12px; border-radius: 11px; background: var(--surface2); color: var(--muted); border: 1px solid var(--border); cursor: pointer; font-family: var(--font-display); }
  .difficulty-card span { display: block; font-family: var(--font-mono); font-size: 10px; margin-top: 3px; opacity: .75; }
  .difficulty-card.active { color: #fff; background: rgba(91, 140, 255, .20); border-color: var(--accent); }
  .difficulty-card[data-d="Hard"].active { border-color: var(--accent2); background: rgba(243,163,77,.15); }
  .dashboard-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 18px; }
  .dashboard-links .nav-link { min-width: 0; padding: 14px 9px; }
  .quiz-card { max-width: 1020px; padding: 20px; }
  .quiz-layout { display: grid; grid-template-columns: minmax(0, 1fr) 245px; gap: 20px; }
  .quiz-main { padding: 20px; border: 1px solid var(--border); border-radius: 18px; background: rgba(6, 18, 34, .36); }
  .quiz-sidebar { padding: 20px; border-radius: 18px; background: linear-gradient(160deg, #112b4b, #0d1d34); border: 1px solid var(--border); align-self: start; position: sticky; top: 22px; }
  .timer-orbit { width: 86px; height: 86px; margin: 0 auto 18px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--accent) var(--timer, 100%), rgba(255,255,255,.10) 0); position: relative; }
  .timer-orbit::before { content: ''; position: absolute; inset: 7px; border-radius: inherit; background: #112b4b; }
  .timer-orbit span { position: relative; font-family: var(--font-mono); font-size: 13px; font-weight: 700; }
  .timer-orbit.low { background: conic-gradient(var(--accent2) var(--timer, 100%), rgba(255,255,255,.10) 0); }
  .sidebar-title { font-family: var(--font-mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .14em; margin-bottom: 11px; }
  .question-nav { justify-content: flex-start; }
  .question-nav button { width: 34px; height: 34px; transition: transform .15s, background .15s, border-color .15s; }
  .question-nav button:hover { transform: translateY(-2px); border-color: var(--accent); }
  .quiz-legend { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
  .quiz-legend i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; background: var(--accent); } .quiz-legend i.done { background: var(--correct); }
  .quiz-tools { margin-bottom: 12px; } .quiz-timer { display: none; }
  .question-text { font-size: clamp(20px, 3vw, 27px); margin: 20px 0 28px; letter-spacing: -.4px; }
  .option-btn { padding: 17px 18px; } .option-btn:hover:not(:disabled) { transform: translateX(3px); }
  .score-ring { width: 155px; height: 155px; box-shadow: 0 0 0 12px rgba(91,140,255,.07); }
  .result-card { max-width: 600px; } .result-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .analytics-fill { background: linear-gradient(90deg, #5b8cff, #62d4d2); }
  @media (max-width: 760px) { .app { padding: 22px 12px; } .dashboard-card { padding: 18px; } .dashboard-hero, .setup-grid, .quiz-layout { grid-template-columns: 1fr; } .hero-metrics { grid-template-columns: repeat(3, 1fr); } .quiz-sidebar { position: static; order: -1; display: grid; grid-template-columns: 90px 1fr; gap: 12px; align-items: center; } .timer-orbit { margin: 0; } .quiz-legend { display: none; } .quiz-main { padding: 16px; } }
  @media (max-width: 480px) { .card { padding: 24px 18px; } .dashboard-links { grid-template-columns: 1fr; } .hero-metrics { grid-template-columns: 1fr 1fr; } .quiz-sidebar { grid-template-columns: 1fr; } .timer-orbit { margin: 0 auto; } .question-nav { justify-content: center; } .result-actions { grid-template-columns: 1fr; } }
`;

// ─── LOADER ───────────────────────────────────────────────────────────────────
function Loader({ label }) {
  return (
    <div className="loading">
      <div className="dot" /><div className="dot" /><div className="dot" />
      <p className="load-label">{label || "Loading..."}</p>
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
// Mirrors the backend rule in AuthService: 8+ chars, at least one uppercase, one lowercase, one digit.
const isValidPassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const emailInvalid = tab === "register" && form.email.length > 0 && !isValidEmail(form.email);
  const passwordInvalid = tab === "register" && form.password.length > 0 && !isValidPassword(form.password);

  async function handleSubmit() {
    setError("");
    if (tab === "register" && !isValidEmail(form.email)) {
      setEmailTouched(true);
      setError("Please enter a valid email address.");
      return;
    }
    if (tab === "register" && !isValidPassword(form.password)) {
      setPasswordTouched(true);
      setError("Password must be 8+ characters with an uppercase letter, a lowercase letter, and a number.");
      return;
    }
    setLoading(true);
    try {
      const data = tab === "login"
        ? await apiLogin(form.username, form.password)
        : await apiRegister(form.username, form.email, form.password);
      onLogin(data); // { token, username, role }
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <div className="home-tag">⚡ Quiz Engine</div>
      <h1 className="home-title" style={{ marginBottom: 32 }}>
        {tab === "login" ? <>Welcome<br /><span>Back.</span></> : <>Create<br /><span>Account.</span></>}
      </h1>
      <div className="tabs">
        <button className={`tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Login</button>
        <button className={`tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Register</button>
      </div>
      {error && <div className="err-msg">⚠ {error}</div>}
      <div className="field"><label>Username</label><input type="text" placeholder="your_username" value={form.username} onChange={upd("username")} /></div>
      {tab === "register" && (
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            value={form.email}
            onChange={upd("email")}
            onBlur={() => setEmailTouched(true)}
            style={emailTouched && emailInvalid ? { borderColor: "var(--wrong)" } : undefined}
          />
          {emailTouched && emailInvalid && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--wrong)", marginTop: 6 }}>
              Enter a valid email, e.g. you@email.com
            </div>
          )}
        </div>
      )}
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={upd("password")}
          onBlur={() => tab === "register" && setPasswordTouched(true)}
          style={tab === "register" && passwordTouched && passwordInvalid ? { borderColor: "var(--wrong)" } : undefined}
        />
        {tab === "register" && passwordTouched && passwordInvalid && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--wrong)", marginTop: 6 }}>
            8+ characters, with uppercase, lowercase &amp; a number
          </div>
        )}
      </div>
      <button
        className="primary-btn"
        onClick={handleSubmit}
        disabled={
          loading || !form.username || !form.password ||
          (tab === "register" && (!isValidEmail(form.email) || !isValidPassword(form.password)))
        }
      >
        {loading ? "Please wait..." : tab === "login" ? "Login →" : "Create Account →"}
      </button>
    </div>
  );
}

// ─── USER BAR ─────────────────────────────────────────────────────────────────
function UserBar({ user, onLogout }) {
  return (
    <div className="user-bar">
      <div className="user-bar-info">
        <span className="user-bar-name">// {user.username}</span>
        <span className="user-bar-role">{user.role} · JWT ✓</span>
      </div>
      <button className="logout-btn" onClick={onLogout}>logout</button>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ user, onLogout }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(null);
  const [numQ, setNumQ] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ quizzes: 0, accuracy: 0, recentTitle: "Your first challenge awaits" });

  useEffect(() => {
    apiGetHistory().then(attempts => {
      const total = attempts.reduce((sum, attempt) => sum + (attempt.total || 0), 0);
      const correct = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
      setSummary({ quizzes: attempts.length, accuracy: total ? Math.round((correct / total) * 100) : 0, recentTitle: attempts[0]?.title || "Your first challenge awaits" });
    }).catch(() => {});
  }, []);

  async function handleStart() {
    if (!title.trim() || !difficulty) return;
    setLoading(true); setError("");
    try {
      const quizId = await apiCreateQuiz(title.trim(), difficulty, numQ);
      navigate(`/quiz/${quizId}`, { state: { title: title.trim(), difficulty, durationSeconds: durationMinutes * 60 } });
    } catch (e) {
      if (e.message === "UNAUTHORIZED") { setError("Session expired. Please login again."); }
      else setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="card dashboard-card">
      <UserBar user={user} onLogout={onLogout} />
      <div className="home-tag">⚡ Quiz Engine</div>
      <h1 className="home-title">Start a<br /><span>Quiz.</span></h1>
      <p className="home-sub"></p>
      <div className="field"><label>Quiz Title</label>
        <input type="text" placeholder="e.g. Science Challenge" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="section-label">Difficulty Level</div>
      <div className="diff-row">
        {["Easy", "Medium", "Hard"].map(d => (
          <button key={d} data-d={d} className={`diff-chip ${difficulty === d ? "active" : ""}`} onClick={() => setDifficulty(d)}>{d}</button>
        ))}
      </div>
      <div className="section-label">Number of Questions</div>
      <div className="num-row">
        {[3, 5, 7, 10].map(n => (
          <button key={n} className={`num-chip ${numQ === n ? "active" : ""}`} onClick={() => setNumQ(n)}>{n}</button>
        ))}
      </div>
      <div className="section-label">Time Limit</div>
      <div className="num-row">
        {[5, 10, 15].map(minutes => (
          <button key={minutes} className={`num-chip ${durationMinutes === minutes ? "active" : ""}`} onClick={() => setDurationMinutes(minutes)}>{minutes} min</button>
        ))}
      </div>
      {error && <div className="err-msg">⚠ {error}</div>}
      <button className="primary-btn" disabled={!title.trim() || !difficulty || loading} onClick={handleStart}>
        {loading ? "Creating Quiz..." : "Create & Start Quiz →"}
      </button>
      <div className="nav-row">
        <Link className="nav-link" to="/history">📊 History</Link>
        <Link className="nav-link" to="/analytics">📈 Analytics</Link>
        <Link className="nav-link" to="/schedule">🗓 Scheduled Quizzes</Link>
      </div>
      {user.role === "ROLE_ADMIN" && (
        <div className="nav-row">
          <Link className="nav-link" to="/admin">🛠 Manage Questions</Link>
          <Link className="nav-link" to="/admin/schedule">📅 Create Scheduled Quiz</Link>
        </div>
      )}
    </div>
  );
}

// ─── QUIZ SCREEN ──────────────────────────────────────────────────────────────
const LETTERS = ["A", "B", "C", "D"];

// mode: "regular" (reads :quizId) or "scheduled" (reads :id)
function QuizScreen({ mode, onUnauthorized }) {
  const params = useParams();
  const quizId = mode === "scheduled" ? params.id : params.quizId;
  const navigate = useNavigate();
  const location = useLocation();
  const { title, difficulty } = location.state || {};
  const initialSeconds = location.state?.durationSeconds || 10 * 60;

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  // Keyed by question index, not appended progressively — lets the user revisit
  // and change any answer without losing their place.
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const fetcher = mode === "scheduled" ? apiGetScheduledQuestions(quizId) : apiGetQuizQuestions(quizId);
    fetcher
      .then(qs => { setQuestions(qs); setLoading(false); })
      .catch(e => {
        if (e.message === "UNAUTHORIZED") onUnauthorized();
        else { setLoadError(e.message); setLoading(false); }
      });
  }, [quizId, mode]);

  useEffect(() => {
    if (loading || submitting || loadError || questions.length === 0) return;
    if (secondsLeft <= 0) {
      submitQuiz(true);
      return;
    }
    const timer = window.setInterval(() => setSecondsLeft(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, loading, submitting, loadError, questions.length]);

  if (loading) return <div className="card"><Loader label="Fetching questions..." /></div>;
  if (submitting) return <div className="card"><Loader label="Calculating score..." /></div>;
  if (loadError) {
    return (
      <div className="card">
        <Link className="back-link" to="/">← Back</Link>
        <div className="err-msg">⚠ {loadError}</div>
      </div>
    );
  }
  if (!questions || questions.length === 0) {
    return (
      <div className="card">
        <Link className="back-link" to="/">← Back</Link>
        <div className="err-msg">⚠ No questions are available for this difficulty yet. Try a different difficulty, or ask an admin to add more questions.</div>
      </div>
    );
  }

  const q = questions[current];
  const opts = [q.option1, q.option2, q.option3, q.option4];
  const picked = answers[current] ?? null;
  const isLast = current + 1 >= questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  function selectOption(opt) {
    setAnswers(a => ({ ...a, [current]: opt })); // always overwrites — free to change your mind
  }

  function handlePrevious() {
    if (current > 0) setCurrent(c => c - 1);
  }

  async function submitQuiz(isTimedOut = false) {
    const finalResponses = questions
      .map((qq, i) => ({ id: qq.id, response: answers[i] }))
      .filter(({ response }) => response);

    if (!isTimedOut && finalResponses.length !== questions.length) {
      setSubmitError("Please answer every question before submitting.");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const score = mode === "scheduled"
        ? await apiSubmitScheduledQuiz(quizId, finalResponses)
        : await apiSubmitQuiz(quizId, finalResponses);
      navigate("/results", { state: { score, total: questions.length, title, difficulty, timedOut: isTimedOut }, replace: true });
    } catch (e) {
      console.error("Submit failed:", e);
      if (e.message === "UNAUTHORIZED") onUnauthorized();
      else setSubmitError(e.message || "Unable to submit quiz. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (picked === null) return; // must answer before moving on

    if (!isLast) {
      setCurrent(c => c + 1);
      return;
    }

    submitQuiz();
  }

  const clock = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="card">
      <div className="quiz-header">
        <span className="q-meta">Q <span>{current + 1}</span> / {questions.length}</span>
        <span className="q-meta">{title || "Quiz"} · <span>{difficulty}</span></span>
      </div>
      <div className="quiz-tools">
        <div className={`quiz-timer ${secondsLeft <= 60 ? "low" : ""}`}>⏱ {clock}</div>
        <div className="question-nav" aria-label="Question navigation">
          {questions.map((_, index) => (
            <button key={index} onClick={() => setCurrent(index)} className={`${answers[index] ? "answered" : ""} ${current === index ? "current" : ""}`} aria-label={`Question ${index + 1}${answers[index] ? ", answered" : ""}`}>{index + 1}</button>
          ))}
        </div>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      <p className="question-text">{q.question}</p>
      <div className="options-list">
        {opts.map((opt, i) => (
          <button key={i} className={`option-btn ${picked === opt ? "selected" : ""}`}
            onClick={() => selectOption(opt)}>
            <span className="opt-letter">{LETTERS[i]}</span>{opt}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {current > 0 && (
          <button className="ghost-btn" style={{ marginTop: 0 }} onClick={handlePrevious}>← Previous</button>
        )}
        {picked !== null && (
          <button className="next-btn" style={{ marginTop: 0 }} onClick={handleNext}>
            {isLast ? "Submit Quiz →" : "Next Question →"}
          </button>
        )}
      </div>
      {submitError && <div className="err-msg" style={{ marginTop: 16 }}>⚠ {submitError}</div>}
    </div>
  );
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────
function ResultsScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state;

  if (!result) return <Navigate to="/" replace />;

  const { score, total, title, difficulty } = result;
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 80 ? "Excellent!" : pct >= 60 ? "Good Work!" : pct >= 40 ? "Keep Practicing" : "Try Again!";
  return (
    <div className="card">
      <div className="result-center">
        <div className="score-ring" style={{ "--pct": `${pct}%` }}>
          <div className="score-num">{score}</div>
          <div className="score-den">/ {total}</div>
        </div>
        <div className="result-title">{grade}</div>
        <div className="result-sub">// {title || "Quiz"} · {difficulty} · {pct}%</div>
      </div>
      <div className="stats-row">
        <div className="stat-box"><div className="stat-val" style={{ color: "var(--correct)" }}>{score}</div><div className="stat-lbl">Correct</div></div>
        <div className="stat-box"><div className="stat-val" style={{ color: "var(--wrong)" }}>{total - score}</div><div className="stat-lbl">Wrong</div></div>
        <div className="stat-box"><div className="stat-val" style={{ color: "var(--accent)" }}>{pct}%</div><div className="stat-lbl">Score</div></div>
      </div>
      <button className="primary-btn" onClick={() => navigate("/")}>Play Again →</button>
    </div>
  );
}

function AnalyticsPage({ onUnauthorized }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiGetHistory()
      .then(items => { setAttempts(items); setLoading(false); })
      .catch(e => {
        if (e.message === "UNAUTHORIZED") onUnauthorized();
        else { setErr(e.message); setLoading(false); }
      });
  }, []);

  const completed = attempts.length;
  const totalQuestions = attempts.reduce((sum, attempt) => sum + (attempt.total || 0), 0);
  const correct = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
  const accuracy = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
  const byDifficulty = ["Easy", "Medium", "Hard"].map(level => {
    const items = attempts.filter(attempt => attempt.difficultyLevel === level);
    const qs = items.reduce((sum, attempt) => sum + (attempt.total || 0), 0);
    const hits = items.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    return { level, quizzes: items.length, accuracy: qs ? Math.round((hits / qs) * 100) : 0 };
  });
  const weakest = byDifficulty.filter(item => item.quizzes > 0).sort((a, b) => a.accuracy - b.accuracy)[0];

  return (
    <div className="card">
      <Link className="back-link" to="/">← Back</Link>
      <div className="home-tag">📈 Performance</div>
      <h2 style={{ fontSize: 24, fontWeight: 800 }}>Quiz <span style={{ color: "var(--accent)" }}>Analytics</span></h2>
      {err && <div className="err-msg">⚠ {err}</div>}
      {loading && <Loader label="Calculating your performance..." />}
      {!loading && completed === 0 && <p style={{ fontFamily: "var(--font-mono)", color: "var(--muted)", textAlign: "center", padding: 28 }}>Complete a quiz to unlock your analytics.</p>}
      {!loading && completed > 0 && <>
        <div className="analytics-grid">
          <div className="stat-box"><div className="stat-val">{completed}</div><div className="stat-lbl">Quizzes</div></div>
          <div className="stat-box"><div className="stat-val">{accuracy}%</div><div className="stat-lbl">Accuracy</div></div>
          <div className="stat-box"><div className="stat-val">{correct}</div><div className="stat-lbl">Correct</div></div>
        </div>
        <div className="section-label">Accuracy by difficulty</div>
        {byDifficulty.map(item => (
          <div className="analytics-row" key={item.level}>
            <div className="analytics-label"><span>{item.level} · {item.quizzes} quiz{item.quizzes === 1 ? "" : "zes"}</span><span>{item.accuracy}%</span></div>
            <div className="analytics-track"><div className="analytics-fill" style={{ width: `${item.accuracy}%` }} /></div>
          </div>
        ))}
        {weakest && <div className="ok-msg" style={{ marginTop: 24 }}>Focus area: {weakest.level} quizzes ({weakest.accuracy}% accuracy).</div>}
      </>}
    </div>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage({ onUnauthorized }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;

  useEffect(() => {
    apiGetHistory()
      .then(a => { setAttempts(a); setLoading(false); })
      .catch(e => {
        if (e.message === "UNAUTHORIZED") onUnauthorized();
        else { setErr(e.message); setLoading(false); }
      });
  }, []);

  const totalPages = Math.max(1, Math.ceil(attempts.length / PER_PAGE));
  const pageItems = attempts.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="card">
      <Link className="back-link" to="/">← Back</Link>
      <div className="home-tag">📊 History</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Your <span style={{ color: "var(--accent)" }}>Attempts</span></h2>
      {err && <div className="err-msg">⚠ {err}</div>}
      {loading && <Loader label="Loading your history..." />}
      {!loading && attempts.length === 0 && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 20 }}>
          No quizzes taken yet.
        </p>
      )}
      {pageItems.map(a => (
        <div className="history-card" key={a.id}>
          <div>
            <div className="q-title">{a.title}</div>
            <div className="schedule-window">{a.difficultyLevel} · {new Date(a.takenAt).toLocaleString()}</div>
          </div>
          <div className="stat-val" style={{ color: "var(--accent)", fontSize: 18 }}>{a.score}/{a.total}</div>
        </div>
      ))}
      {!loading && attempts.length > PER_PAGE && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <button
            className="ghost-btn"
            style={{ marginTop: 0, width: "auto", padding: "10px 18px" }}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Prev
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="ghost-btn"
            style={{ marginTop: 0, width: "auto", padding: "10px 18px" }}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SCHEDULE BROWSE PAGE ─────────────────────────────────────────────────────
function ScheduleBrowsePage({ onUnauthorized }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiGetAvailableScheduled()
      .then(qs => { setQuizzes(qs); setLoading(false); })
      .catch(e => {
        if (e.message === "UNAUTHORIZED") onUnauthorized();
        else { setErr(e.message); setLoading(false); }
      });
  }, []);

  return (
    <div className="card">
      <Link className="back-link" to="/">← Back</Link>
      <div className="home-tag">🗓 Scheduled Quizzes</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Available <span style={{ color: "var(--accent)" }}>Now</span></h2>
      {err && <div className="err-msg">⚠ {err}</div>}
      {loading && <Loader label="Checking for available quizzes..." />}
      {!loading && quizzes.length === 0 && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 20 }}>
          No scheduled quizzes are open right now.
        </p>
      )}
      {quizzes.map(sq => (
        <div className="schedule-card" key={sq.id}>
          <div className="schedule-card-info">
            <div className="q-title">{sq.title}</div>
            <div className="schedule-window">
              {sq.difficultyLevel} · closes {new Date(sq.endTime).toLocaleString()}
            </div>
          </div>
          <button
            className="ghost-btn"
            style={{ marginTop: 0, width: "auto", padding: "10px 18px" }}
            onClick={() => navigate(`/scheduled/${sq.id}`, { state: { title: sq.title, difficulty: sq.difficultyLevel } })}
          >
            Start →
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN: CREATE SCHEDULED QUIZ ─────────────────────────────────────────────
function toDatetimeLocalValue(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminScheduleCreatePage({ onUnauthorized }) {
  const navigate = useNavigate();
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const [form, setForm] = useState({
    title: "", difficultyLevel: "Easy", numQuestions: 5,
    startTime: toDatetimeLocalValue(now), endTime: toDatetimeLocalValue(inOneHour),
  });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleCreate() {
    setMsg(""); setErr("");
    if (!form.title.trim()) { setErr("Title is required."); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) { setErr("End time must be after start time."); return; }
    try {
      await apiCreateScheduledQuiz({
        title: form.title.trim(),
        difficultyLevel: form.difficultyLevel,
        numQuestions: Number(form.numQuestions),
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setMsg("Scheduled quiz created!");
    } catch (e) {
      if (e.message === "UNAUTHORIZED") onUnauthorized();
      else if (e.message === "FORBIDDEN") setErr("You don't have permission to do that.");
      else setErr(e.message);
    }
  }

  return (
    <div className="card">
      <Link className="back-link" to="/">← Back</Link>
      <div className="home-tag">📅 Admin</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Schedule a <span style={{ color: "var(--accent)" }}>Quiz</span></h2>
      {err && <div className="err-msg">⚠ {err}</div>}
      {msg && <div className="ok-msg">✓ {msg}</div>}
      <div className="field"><label>Title</label><input placeholder="e.g. Weekly Science Quiz" value={form.title} onChange={upd("title")} /></div>
      <div className="field"><label>Difficulty</label><select value={form.difficultyLevel} onChange={upd("difficultyLevel")}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
      <div className="field"><label>Number of Questions</label><input type="number" min="1" value={form.numQuestions} onChange={upd("numQuestions")} /></div>
      <div className="field"><label>Opens</label><input type="datetime-local" value={form.startTime} onChange={upd("startTime")} /></div>
      <div className="field"><label>Closes</label><input type="datetime-local" value={form.endTime} onChange={upd("endTime")} /></div>
      <button className="primary-btn" onClick={handleCreate}>Create Scheduled Quiz →</button>
    </div>
  );
}

// ─── ADMIN SCREEN ─────────────────────────────────────────────────────────────
function AdminScreen({ user, onLogout, onUnauthorized }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("view");
  const [questions, setQuestions] = useState([]);
  const [filterDiff, setFilterDiff] = useState("Easy");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [form, setForm] = useState({ difficultyLevel: "Easy", question: "", option1: "", option2: "", option3: "", option4: "", answer: "" });
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Second line of defense: even if a non-admin somehow lands on this screen
  // (not just via the hidden button), don't render admin tooling for them.
  if (user.role !== "ROLE_ADMIN") {
    return (
      <div className="card">
        <Link className="back-link" to="/">← Back</Link>
        <div className="err-msg">⚠ You don't have permission to view this page.</div>
      </div>
    );
  }

  async function loadQuestions() {
    setLoading(true); setErr("");
    try {
      const qs = await apiGetQuestionsByDifficulty(filterDiff);
      setQuestions(qs);
    } catch (e) {
      if (e.message === "UNAUTHORIZED") onUnauthorized();
      else if (e.message === "FORBIDDEN") setErr("You don't have permission to do that.");
      else setErr(e.message);
    }
    setLoading(false);
  }

  async function handleAdd() {
    setMsg(""); setErr("");
    try { const res = await apiAddQuestion(form); setMsg(res || "Question added!"); setForm({ difficultyLevel: "Easy", question: "", option1: "", option2: "", option3: "", option4: "", answer: "" }); }
    catch (e) {
      if (e.message === "UNAUTHORIZED") onUnauthorized();
      else if (e.message === "FORBIDDEN") setErr("You don't have permission to do that.");
      else setErr(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this question?")) return;
    try { await apiDeleteQuestion(id); setQuestions(qs => qs.filter(q => q.id !== id)); }
    catch (e) {
      if (e.message === "UNAUTHORIZED") onUnauthorized();
      else if (e.message === "FORBIDDEN") setErr("You don't have permission to do that.");
      else setErr(e.message);
    }
  }

  return (
    <div className="card">
      <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Back</button>
      <UserBar user={user} onLogout={onLogout} />
      <div className="home-tag">🛠 Admin Panel</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Question <span style={{ color: "var(--accent)" }}>Manager</span></h2>
      <div className="nav-row" style={{ marginBottom: 20 }}>
        <Link className="nav-link" to="/admin/schedule">📅 Create Scheduled Quiz</Link>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === "view" ? "active" : ""}`} onClick={() => setTab("view")}>View Questions</button>
        <button className={`tab ${tab === "add" ? "active" : ""}`} onClick={() => setTab("add")}>Add Question</button>
      </div>
      {err && <div className="err-msg">⚠ {err}</div>}
      {msg && <div className="ok-msg">✓ {msg}</div>}
      {tab === "view" && (
        <>
          <div className="section-label">Filter by Difficulty</div>
          <div className="diff-row" style={{ marginBottom: 16 }}>
            {["Easy", "Medium", "Hard"].map(d => <button key={d} className={`diff-chip ${filterDiff === d ? "active" : ""}`} onClick={() => setFilterDiff(d)}>{d}</button>)}
          </div>
          <button className="primary-btn" style={{ marginBottom: 20 }} onClick={loadQuestions} disabled={loading}>
            {loading ? "Loading..." : `Load ${filterDiff} Questions`}
          </button>
          {loading && <Loader label="Fetching from question-service..." />}
          {questions.map(q => (
            <div className="question-card" key={q.id}>
              <button className="del-btn" onClick={() => handleDelete(q.id)}>🗑</button>
              <div className="q-title">{q.question}</div>
              <div className="q-badges">
                <span className="badge diff">{q.difficultyLevel}</span>
                <span className="badge">✓ {q.answer}</span>
              </div>
            </div>
          ))}
          {!loading && questions.length === 0 && <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 20 }}>No questions loaded yet.</p>}
        </>
      )}
      {tab === "add" && (
        <>
          <div className="field"><label>Difficulty Level</label><select value={form.difficultyLevel} onChange={upd("difficultyLevel")}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
          <div className="field"><label>Question Title</label><input placeholder="Enter the question..." value={form.question} onChange={upd("question")} /></div>
          <div className="field"><label>Option 1</label><input placeholder="Option A" value={form.option1} onChange={upd("option1")} /></div>
          <div className="field"><label>Option 2</label><input placeholder="Option B" value={form.option2} onChange={upd("option2")} /></div>
          <div className="field"><label>Option 3</label><input placeholder="Option C" value={form.option3} onChange={upd("option3")} /></div>
          <div className="field"><label>Option 4</label><input placeholder="Option D" value={form.option4} onChange={upd("option4")} /></div>
          <div className="field"><label>Right Answer (must match one option exactly)</label><input placeholder="e.g. Option A text" value={form.answer} onChange={upd("answer")} /></div>
          <button className="primary-btn" onClick={handleAdd} disabled={!form.question || !form.option1 || !form.answer}>Add Question →</button>
        </>
      )}
    </div>
  );
}

// ─── ROUTE GUARDS ─────────────────────────────────────────────────────────────
function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/" replace />;
  return children;
}
function RequireAdmin({ user, children }) {
  if (!user || user.role !== "ROLE_ADMIN") return <Navigate to="/" replace />;
  return children;
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const storedUser = (() => {
    try { return JSON.parse(sessionStorage.getItem("qz_user")); } catch { return null; }
  })();
  const hasSession = !!(getToken() && storedUser);
  const [user, setUser] = useState(hasSession ? storedUser : null);
  const navigate = useNavigate();

  function handleLogin(data) {
    setUser(data);
    sessionStorage.setItem("qz_user", JSON.stringify(data));
    navigate("/");
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    navigate("/");
  }

  // Called whenever a 401 is received — token expired or invalid
  function handleUnauthorized() {
    clearToken();
    setUser(null);
    navigate("/");
    alert("Session expired. Please login again.");
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <Routes>
          <Route path="/" element={user ? <HomeScreen user={user} onLogout={handleLogout} /> : <AuthScreen onLogin={handleLogin} />} />
          <Route path="/quiz/:quizId" element={
            <RequireAuth user={user}><QuizScreen mode="regular" onUnauthorized={handleUnauthorized} /></RequireAuth>
          } />
          <Route path="/scheduled/:id" element={
            <RequireAuth user={user}><QuizScreen mode="scheduled" onUnauthorized={handleUnauthorized} /></RequireAuth>
          } />
          <Route path="/results" element={
            <RequireAuth user={user}><ResultsScreen /></RequireAuth>
          } />
          <Route path="/history" element={
            <RequireAuth user={user}><HistoryPage onUnauthorized={handleUnauthorized} /></RequireAuth>
          } />
          <Route path="/analytics" element={
            <RequireAuth user={user}><AnalyticsPage onUnauthorized={handleUnauthorized} /></RequireAuth>
          } />
          <Route path="/schedule" element={
            <RequireAuth user={user}><ScheduleBrowsePage onUnauthorized={handleUnauthorized} /></RequireAuth>
          } />
          <Route path="/admin" element={
            <RequireAdmin user={user}><AdminScreen user={user} onLogout={handleLogout} onUnauthorized={handleUnauthorized} /></RequireAdmin>
          } />
          <Route path="/admin/schedule" element={
            <RequireAdmin user={user}><AdminScheduleCreatePage onUnauthorized={handleUnauthorized} /></RequireAdmin>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
