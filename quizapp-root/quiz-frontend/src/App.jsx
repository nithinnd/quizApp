import { useState, useEffect } from "react";

// ─── API CONFIG ────────────────────────────────────────────────────────────────
const GATEWAY = "http://localhost:8765";

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
  create: ()    => `${GATEWAY}/quiz/create`,
  getQ:   (id)  => `${GATEWAY}/quiz/getq/${id}`,
  submit: ()  => `${GATEWAY}/question/getScore`,
};

// ─── TOKEN HELPERS ─────────────────────────────────────────────────────────────
// Store JWT in memory (most secure for SPAs — not localStorage)
let _token = null;
const setToken = (t) => { _token = t; };
const getToken = () => _token;
const clearToken = () => { _token = null; };

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

async function apiSubmitQuiz( responses) {
  const res = await authFetch(QUIZ_API.submit(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(responses),
  });
  if (!res.ok) throw new Error("Failed to submit quiz");
  return await res.json(); // Integer score
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
    --bg: #0a0a0f; --surface: #111118; --surface2: #1a1a24; --border: #2a2a3a;
    --accent: #e8ff47; --accent2: #ff6b47; --text: #f0f0f8; --muted: #6b6b88;
    --correct: #47ffb4; --wrong: #ff4747;
    --font-display: 'Syne', sans-serif; --font-mono: 'DM Mono', monospace;
  }
  html, body, #root { height: 100%; width: 100%;  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-display); min-height: 100vh; overflow-x: hidden; }
  .app { min-height: 100vh; position: relative; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .app::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(232,255,71,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,255,71,0.03) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; z-index: 0; }
  .app::after { content: ''; position: fixed; top: -40%; left: -20%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(232,255,71,0.06) 0%, transparent 70%); pointer-events: none; z-index: 0; animation: drift 12s ease-in-out infinite alternate; }
  @keyframes drift { from { transform: translate(0,0); } to { transform: translate(120px,60px); } }
  .card { position: relative; z-index: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 48px; width: 100%; max-width: 660px; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); }
  @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .home-tag { font-family: var(--font-mono); font-size: 11px; color: var(--accent); letter-spacing: 0.2em; text-transform: uppercase; background: rgba(232,255,71,0.08); border: 1px solid rgba(232,255,71,0.2); padding: 6px 14px; border-radius: 100px; display: inline-block; margin-bottom: 24px; }
  .home-title { font-size: clamp(32px,5vw,48px); font-weight: 800; line-height: 1.1; margin-bottom: 10px; letter-spacing: -1px; }
  .home-title span { color: var(--accent); }
  .home-sub { font-family: var(--font-mono); color: var(--muted); font-size: 13px; margin-bottom: 36px; }
  .tabs { display: flex; gap: 0; margin-bottom: 32px; background: var(--surface2); border-radius: 12px; padding: 4px; }
  .tab { flex: 1; padding: 10px; background: transparent; border: none; border-radius: 10px; font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .tab.active { background: var(--accent); color: #0a0a0f; }
  .section-label { font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 10px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 7px; }
  .field input, .field select { width: 100%; padding: 13px 15px; background: var(--surface2); border: 1px solid var(--border); border-radius: 11px; font-family: var(--font-display); font-size: 14px; color: var(--text); outline: none; transition: border-color 0.2s; }
  .field input:focus, .field select:focus { border-color: var(--accent); }
  .field select option { background: var(--surface2); }
  .diff-row { display: flex; gap: 10px; margin-bottom: 28px; }
  .diff-chip { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); font-family: var(--font-mono); font-size: 12px; cursor: pointer; transition: all 0.2s; text-align: center; color: var(--muted); }
  .diff-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(232,255,71,0.08); }
  .diff-chip[data-d="Hard"].active { border-color: var(--accent2); color: var(--accent2); background: rgba(255,107,71,0.08); }
  .num-row { display: flex; gap: 8px; margin-bottom: 28px; }
  .num-chip { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); font-family: var(--font-mono); font-size: 13px; cursor: pointer; transition: all 0.2s; text-align: center; color: var(--muted); font-weight: 600; }
  .num-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(232,255,71,0.08); }
  .primary-btn { width: 100%; padding: 16px; background: var(--accent); color: #0a0a0f; border: none; border-radius: 13px; font-family: var(--font-display); font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em; }
  .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(232,255,71,0.3); }
  .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .ghost-btn { width: 100%; padding: 14px; background: transparent; border: 1px solid var(--accent); color: var(--accent); border-radius: 13px; font-family: var(--font-display); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
  .ghost-btn:hover { background: rgba(232,255,71,0.06); }
  .err-msg { font-family: var(--font-mono); font-size: 12px; color: var(--wrong); margin-bottom: 14px; padding: 10px 14px; background: rgba(255,71,71,0.08); border-radius: 10px; border: 1px solid rgba(255,71,71,0.2); }
  .ok-msg { font-family: var(--font-mono); font-size: 12px; color: var(--correct); margin-bottom: 14px; padding: 10px 14px; background: rgba(71,255,180,0.08); border-radius: 10px; border: 1px solid rgba(71,255,180,0.2); }
  .user-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 10px 14px; background: var(--surface2); border-radius: 12px; border: 1px solid var(--border); }
  .user-bar-info { display: flex; flex-direction: column; gap: 2px; }
  .user-bar-name { font-family: var(--font-mono); font-size: 12px; color: var(--accent); }
  .user-bar-role { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
  .logout-btn { background: none; border: 1px solid var(--border); padding: 6px 12px; border-radius: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .logout-btn:hover { border-color: var(--wrong); color: var(--wrong); }
  .token-badge { font-family: var(--font-mono); font-size: 10px; color: var(--correct); background: rgba(71,255,180,0.08); border: 1px solid rgba(71,255,180,0.15); padding: 4px 10px; border-radius: 100px; margin-bottom: 20px; display: inline-block; }
  .quiz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
  .q-meta { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
  .q-meta span { color: var(--accent); }
  .progress-bar { width: 100%; height: 4px; background: var(--surface2); border-radius: 2px; margin-bottom: 32px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s cubic-bezier(0.16,1,0.3,1); }
  .question-text { font-size: clamp(17px,2.8vw,22px); font-weight: 700; line-height: 1.45; margin-bottom: 28px; }
  .options-list { display: flex; flex-direction: column; gap: 9px; }
  .option-btn { width: 100%; padding: 15px 18px; background: var(--surface2); border: 1px solid var(--border); border-radius: 13px; font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 12px; transition: all 0.18s; }
  .option-btn:hover:not(:disabled) { border-color: rgba(232,255,71,0.35); background: rgba(232,255,71,0.04); }
  .option-btn.selected { border-color: var(--accent); background: rgba(232,255,71,0.07); color: var(--accent); }
  .option-btn:disabled { cursor: default; }
  .opt-letter { width: 26px; height: 26px; border-radius: 7px; background: var(--border); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; flex-shrink: 0; }
  .option-btn.selected .opt-letter { background: rgba(232,255,71,0.2); color: var(--accent); }
  .feedback-bar { margin-top: 18px; padding: 13px 16px; border-radius: 11px; font-family: var(--font-mono); font-size: 13px; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .feedback-bar.correct { background: rgba(71,255,180,0.1); border: 1px solid rgba(71,255,180,0.2); color: var(--correct); }
  .feedback-bar.wrong { background: rgba(255,71,71,0.1); border: 1px solid rgba(255,71,71,0.2); color: var(--wrong); }
  .next-btn { margin-top: 20px; width: 100%; padding: 15px; background: transparent; border: 1px solid var(--accent); color: var(--accent); border-radius: 13px; font-family: var(--font-display); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .next-btn:hover { background: rgba(232,255,71,0.07); }
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
  .badge.diff { border-color: rgba(232,255,71,0.3); color: var(--accent); }
  .del-btn { float: right; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; transition: color 0.2s; }
  .del-btn:hover { color: var(--wrong); }
  .loading { text-align: center; padding: 40px; }
  .dot { display: inline-block; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; margin: 0 3px; animation: bounce 0.8s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay: 0.15s; } .dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce { 0%,80%,100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
  .load-label { font-family: var(--font-mono); font-size: 12px; color: var(--muted); margin-top: 14px; }
  @media (max-width: 480px) { .card { padding: 24px 18px; } }
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
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit() {
    setError(""); setLoading(true);
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
      {tab === "register" && <div className="field"><label>Email</label><input type="email" placeholder="you@email.com" value={form.email} onChange={upd("email")} /></div>}
      <div className="field"><label>Password</label><input type="password" placeholder="••••••••" value={form.password} onChange={upd("password")} /></div>
      <button className="primary-btn" onClick={handleSubmit} disabled={loading || !form.username || !form.password}>
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
function HomeScreen({ user, onStartQuiz, onAdmin, onLogout }) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(null);
  const [numQ, setNumQ] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    if (!title.trim() || !difficulty) return;
    setLoading(true); setError("");
    try {
      const quizId = await apiCreateQuiz(title.trim(), difficulty, numQ);
      onStartQuiz({ quizId, title, difficulty, numQ });
    } catch (e) {
      if (e.message === "UNAUTHORIZED") { setError("Session expired. Please login again."); }
      else setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <UserBar user={user} onLogout={onLogout} />
      <div className="home-tag">⚡ Quiz Engine</div>
      <h1 className="home-title">Start a<br /><span>Quiz.</span></h1>
      <p className="home-sub"></p>
      <div className="field"><label>Quiz Title</label>
        <input type="text" placeholder="e.g. Science Challenge" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="section-label">Difficulty Level</div>
      <div className="diff-row">
        {["EASY", "Medium", "Hard"].map(d => (
          <button key={d} data-d={d} className={`diff-chip ${difficulty === d ? "active" : ""}`} onClick={() => setDifficulty(d)}>{d}</button>
        ))}
      </div>
      <div className="section-label">Number of Questions</div>
      <div className="num-row">
        {[3, 5, 7, 10].map(n => (
          <button key={n} className={`num-chip ${numQ === n ? "active" : ""}`} onClick={() => setNumQ(n)}>{n}</button>
        ))}
      </div>
      {error && <div className="err-msg">⚠ {error}</div>}
      <button className="primary-btn" disabled={!title.trim() || !difficulty || loading} onClick={handleStart}>
        {loading ? "Creating Quiz..." : "Create & Start Quiz →"}
      </button>
      <button className="ghost-btn" onClick={onAdmin}>Manage Questions (Admin) →</button>
    </div>
  );
}

// ─── QUIZ SCREEN ──────────────────────────────────────────────────────────────
const LETTERS = ["A", "B", "C", "D"];

function QuizScreen({ quizId, title, difficulty, onFinish, onUnauthorized }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState([]);
  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGetQuizQuestions(quizId)
      .then(qs => { setQuestions(qs); setLoading(false); })
      .catch(e => { if (e.message === "UNAUTHORIZED") onUnauthorized(); });
  }, [quizId]);

  if (loading) return <div className="card"><Loader label="Fetching questions from quiz-service..." /></div>;
  if (submitting) return <div className="card"><Loader label="Calculating score..." /></div>;

  const q = questions[current];
  const opts = [q.option1, q.option2, q.option3, q.option4];
  const isLast = current + 1 >= questions.length;
  const progress = ((current + (picked !== null ? 1 : 0)) / questions.length) * 100;

async function handleNext() {
  if (!picked) {
    console.error("No option selected");
    return;
  }

  const updatedResponses = [...responses, { id: q.id, response: picked }];

  console.log("SUBMITTING:", updatedResponses);

  setResponses(updatedResponses);

  if (isLast) {
    setSubmitting(true);
    try {
      const score = await apiSubmitQuiz(updatedResponses);
      onFinish({ score, total: questions.length, title, difficulty });
    } catch (e) {
      console.error("Submit failed:", e);
      setSubmitting(false);
    }
  } else {
    setCurrent(c => c + 1);
    setPicked(null);
  }
}

  return (
    <div className="card">
      <div className="quiz-header">
        <span className="q-meta">Q <span>{current + 1}</span> / {questions.length}</span>
        <span className="q-meta">{title} · <span>{difficulty}</span></span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      <p className="question-text">{q.question}</p>
      <div className="options-list">
        {opts.map((opt, i) => (
          <button key={i} className={`option-btn ${picked === opt ? "selected" : ""}`}
            onClick={() => picked === null && setPicked(opt)} disabled={picked !== null}>
            <span className="opt-letter">{LETTERS[i]}</span>{opt}
          </button>
        ))}
      </div>
      {picked !== null && (
        <button className="next-btn" onClick={handleNext}>
          {isLast ? "Submit Quiz →" : "Next Question →"}
        </button>
      )}
    </div>
  );
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────
function ResultsScreen({ score, total, title, difficulty, onRetry }) {
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
        <div className="result-sub">// {title} · {difficulty} · {pct}%</div>
      </div>
      <div className="stats-row">
        <div className="stat-box"><div className="stat-val" style={{ color: "var(--correct)" }}>{score}</div><div className="stat-lbl">Correct</div></div>
        <div className="stat-box"><div className="stat-val" style={{ color: "var(--wrong)" }}>{total - score}</div><div className="stat-lbl">Wrong</div></div>
        <div className="stat-box"><div className="stat-val" style={{ color: "var(--accent)" }}>{pct}%</div><div className="stat-lbl">Score</div></div>
      </div>
      <button className="primary-btn" onClick={onRetry}>Play Again →</button>
    </div>
  );
}

// ─── ADMIN SCREEN ─────────────────────────────────────────────────────────────
function AdminScreen({ user, onBack, onUnauthorized }) {
  const [tab, setTab] = useState("view");
  const [questions, setQuestions] = useState([]);
  const [filterDiff, setFilterDiff] = useState("Easy");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [form, setForm] = useState({ category: "", difficultyLevel: "Easy", question: "", option1: "", option2: "", option3: "", option4: "", rightAnswer: "" });
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function loadQuestions() {
    setLoading(true); setErr("");
    try {
      const qs = await apiGetQuestionsByDifficulty(filterDiff);
      setQuestions(qs);
    } catch (e) {
      if (e.message === "UNAUTHORIZED") onUnauthorized();
      else setErr(e.message);
    }
    setLoading(false);
  }

  async function handleAdd() {
    setMsg(""); setErr("");
    try { const res = await apiAddQuestion(form); setMsg(res || "Question added!"); setForm({ category: "", difficultyLevel: "Easy", question: "", option1: "", option2: "", option3: "", option4: "", rightAnswer: "" }); }
    catch (e) { if (e.message === "UNAUTHORIZED") onUnauthorized(); else setErr(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this question?")) return;
    try { await apiDeleteQuestion(id); setQuestions(qs => qs.filter(q => q.id !== id)); }
    catch (e) { if (e.message === "UNAUTHORIZED") onUnauthorized(); else setErr(e.message); }
  }

  return (
    <div className="card">
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer", marginBottom: 16 }}>← Back</button>
      <UserBar user={user} onLogout={onBack} />
      <div className="home-tag">🛠 Admin Panel</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Question <span style={{ color: "var(--accent)" }}>Manager</span></h2>
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
            {["EASY", "Medium", "Hard"].map(d => <button key={d} className={`diff-chip ${filterDiff === d ? "active" : ""}`} onClick={() => setFilterDiff(d)}>{d}</button>)}
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
                <span className="badge">{q.category}</span>
                <span className="badge">✓ {q.rightAnswer}</span>
              </div>
            </div>
          ))}
          {!loading && questions.length === 0 && <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 20 }}>No questions loaded yet.</p>}
        </>
      )}
      {tab === "add" && (
        <>
          <div className="field"><label>Category</label><input placeholder="e.g. Science" value={form.category} onChange={upd("category")} /></div>
          <div className="field"><label>Difficulty Level</label><select value={form.difficultyLevel} onChange={upd("difficultyLevel")}><option>EASY</option><option>Medium</option><option>Hard</option></select></div>
          <div className="field"><label>Question Title</label><input placeholder="Enter the question..." value={form.question} onChange={upd("questionTitle")} /></div>
          <div className="field"><label>Option 1</label><input placeholder="Option A" value={form.option1} onChange={upd("option1")} /></div>
          <div className="field"><label>Option 2</label><input placeholder="Option B" value={form.option2} onChange={upd("option2")} /></div>
          <div className="field"><label>Option 3</label><input placeholder="Option C" value={form.option3} onChange={upd("option3")} /></div>
          <div className="field"><label>Option 4</label><input placeholder="Option D" value={form.option4} onChange={upd("option4")} /></div>
          <div className="field"><label>Right Answer (must match one option exactly)</label><input placeholder="e.g. Option A text" value={form.rightAnswer} onChange={upd("rightAnswer")} /></div>
          <button className="primary-btn" onClick={handleAdd} disabled={!form.question || !form.option1 || !form.rightAnswer}>Add Question →</button>
        </>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("auth");
  const [user, setUser] = useState(null);
  const [quizConfig, setQuizConfig] = useState(null);
  const [result, setResult] = useState(null);

  function handleLogin(data) { setUser(data); setScreen("home"); }

  function handleLogout() {
    clearToken();
    setUser(null);
    setScreen("auth");
  }

  // Called whenever a 401 is received — token expired or invalid
  function handleUnauthorized() {
    clearToken();
    setUser(null);
    setScreen("auth");
    alert("Session expired. Please login again.");
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {screen === "auth"    && <AuthScreen onLogin={handleLogin} />}
        {screen === "home"    && <HomeScreen user={user} onStartQuiz={cfg => { setQuizConfig(cfg); setScreen("quiz"); }} onAdmin={() => setScreen("admin")} onLogout={handleLogout} />}
        {screen === "quiz"    && quizConfig && <QuizScreen key={quizConfig.quizId} quizId={quizConfig.quizId} title={quizConfig.title} difficulty={quizConfig.difficulty} onFinish={res => { setResult(res); setScreen("results"); }} onUnauthorized={handleUnauthorized} />}
        {screen === "results" && result && <ResultsScreen score={result.score} total={result.total} title={result.title} difficulty={result.difficulty} onRetry={() => setScreen("home")} />}
        {screen === "admin"   && <AdminScreen user={user} onBack={() => setScreen("home")} onUnauthorized={handleUnauthorized} />}
      </div>
    </>
  );
}
