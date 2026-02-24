import { useState, useEffect, useMemo } from "react";

// ─── Supabase config from environment variables ───
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Supabase REST API Helper ───
const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};
const base = `${SUPABASE_URL}/rest/v1`;

const db = {
  from: (table) => ({
    select: async (columns = "*", query = "") => {
      const res = await fetch(`${base}/${table}?select=${columns}${query}`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    insert: async (data) => {
      const res = await fetch(`${base}/${table}`, {
        method: "POST", headers, body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    update: async (data, match) => {
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${base}/${table}?${params}`, {
        method: "PATCH", headers, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    delete: async (match) => {
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${base}/${table}?${params}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(await res.text());
      return true;
    },
  }),
};

// ─── Utilities ───
const getMonthDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAYS_KR = ["일","월","화","수","목","금","토"];
const DEFAULT_ADMIN_PIN = "1234";

// ─── Theme ───
const T = {
  bg:"#F7F8FC", primary:"#2C5AFF", primaryLight:"#EEF2FF",
  accent:"#FF6B35", accentLight:"#FFF3ED",
  text:"#1A1D2E", textSec:"#6B7094", textLight:"#9DA3C0", border:"#E8EAF2",
  success:"#10B981", danger:"#EF4444", dangerLight:"#FEF2F2",
  warning:"#F59E0B", warningLight:"#FFFBEB",
  shadow:"0 2px 12px rgba(44,90,255,0.08)", shadowLg:"0 8px 32px rgba(44,90,255,0.12)",
  radius:"14px", radiusSm:"10px",
};

const inputStyle = { padding:"12px 14px", borderRadius:10, border:"2px solid #E8EAF2", fontSize:14, fontFamily:"'Pretendard',sans-serif", outline:"none", width:"100%", boxSizing:"border-box" };
const labelStyle = { fontSize:12, fontWeight:700, color:"#6B7094", marginBottom:6, display:"block" };
const thStyle = { padding:"10px 12px", textAlign:"left", fontSize:12, fontWeight:700, color:"#6B7094", borderBottom:"1px solid #E8EAF2" };
const tdStyle = { padding:"10px 12px", borderBottom:"1px solid #E8EAF2", color:"#1A1D2E", fontSize:14 };
const navBtnStyle = { width:36, height:36, borderRadius:10, border:"1px solid #E8EAF2", background:"white", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit", color:"#1A1D2E" };

// ─── App ───
export default function App() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError("환경 변수가 설정되지 않았습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인하세요.");
      setLoading(false);
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([db.from("students").select(), db.from("tests").select()]);
      setStudents(s); setTests(t); setError("");
    } catch (e) { setError("DB 연결 실패: " + e.message); }
    setLoading(false);
  };

  const refreshData = async () => {
    try {
      const [s, t] = await Promise.all([db.from("students").select(), db.from("tests").select()]);
      setStudents(s); setTests(t);
    } catch {}
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={loadData} />;
  if (!user) return <LoginScreen students={students} onLogin={setUser} />;
  if (user.role === "admin") return <AdminDashboard students={students} tests={tests} refreshData={refreshData} onLogout={() => setUser(null)} />;
  return <StudentView student={user} tests={tests.filter(t => t.student_id === user.id)} onLogout={() => setUser(null)} />;
}

// ─── Loading ───
function LoadingScreen() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:T.bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, border:`3px solid ${T.border}`, borderTopColor:T.primary, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
        <p style={{ color:T.textSec, fontSize:15 }}>로딩 중...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Error ───
function ErrorScreen({ error, onRetry }) {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"white", borderRadius:20, padding:36, maxWidth:420, width:"100%", textAlign:"center", boxShadow:T.shadow }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <h2 style={{ fontSize:18, fontWeight:700, color:T.text, margin:"0 0 8px" }}>연결 오류</h2>
        <p style={{ fontSize:13, color:T.textSec, marginBottom:20, wordBreak:"break-all" }}>{error}</p>
        <button onClick={onRetry} style={{ padding:"12px 32px", borderRadius:10, border:"none", background:T.primary, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>다시 시도</button>
      </div>
    </div>
  );
}

// ─── Login ───
function LoginScreen({ students, onLogin }) {
  const [mode, setMode] = useState(null);
  const [pin, setPin] = useState("");
  const [loginId, setLoginId] = useState("");
  const [error, setError] = useState("");

  const handleAdminLogin = () => {
    if (pin === DEFAULT_ADMIN_PIN) onLogin({ role:"admin" });
    else { setError("비밀번호가 올바르지 않습니다."); setPin(""); }
  };
  const handleStudentLogin = () => {
    const s = students.find(s => s.login_id === loginId.trim());
    if (s && pin === s.pin) onLogin({ role:"student", id:s.id, name:s.name });
    else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); setPin(""); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(145deg,#1a1d2e 0%,#2C5AFF 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"white", borderRadius:24, padding:"48px 36px", width:"100%", maxWidth:420, boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:T.primaryLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>📝</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:T.text, margin:"0 0 6px" }}>Test Manager</h1>
          <p style={{ fontSize:14, color:T.textSec, margin:0 }}>영어학원 테스트 관리 시스템</p>
        </div>

        {!mode && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <button onClick={() => { setMode("admin"); setError(""); }} style={{ padding:"16px 24px", borderRadius:14, border:`2px solid ${T.primary}`, background:T.primary, color:"white", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🔑 원장 로그인</button>
            <button onClick={() => { setMode("student"); setError(""); }} style={{ padding:"16px 24px", borderRadius:14, border:`2px solid ${T.border}`, background:"white", color:T.text, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🎓 학생 로그인</button>
          </div>
        )}

        {mode === "admin" && (
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:T.textSec, marginBottom:6, display:"block" }}>관리자 비밀번호</label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key==="Enter" && handleAdminLogin()} placeholder="비밀번호 입력" style={{ ...inputStyle, border:`2px solid ${T.border}` }} autoFocus />
            {error && <p style={{ color:T.danger, fontSize:13, margin:"8px 0 0" }}>{error}</p>}
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={() => { setMode(null); setPin(""); setError(""); }} style={{ flex:1, padding:"14px", borderRadius:12, border:`2px solid ${T.border}`, background:"white", color:T.textSec, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>뒤로</button>
              <button onClick={handleAdminLogin} style={{ flex:2, padding:"14px", borderRadius:12, border:"none", background:T.primary, color:"white", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>로그인</button>
            </div>
            <p style={{ fontSize:12, color:T.textLight, textAlign:"center", marginTop:12 }}>기본 비밀번호: 1234</p>
          </div>
        )}

        {mode === "student" && (
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:T.textSec, marginBottom:6, display:"block" }}>아이디</label>
            <input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="아이디 입력" style={{ ...inputStyle, border:`2px solid ${T.border}` }} autoFocus />
            <label style={{ fontSize:13, fontWeight:600, color:T.textSec, marginBottom:6, display:"block", marginTop:14 }}>비밀번호</label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key==="Enter" && handleStudentLogin()} placeholder="비밀번호 입력" style={{ ...inputStyle, border:`2px solid ${T.border}` }} />
            {error && <p style={{ color:T.danger, fontSize:13, margin:"8px 0 0" }}>{error}</p>}
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={() => { setMode(null); setPin(""); setLoginId(""); setError(""); }} style={{ flex:1, padding:"14px", borderRadius:12, border:`2px solid ${T.border}`, background:"white", color:T.textSec, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>뒤로</button>
              <button onClick={handleStudentLogin} style={{ flex:2, padding:"14px", borderRadius:12, border:"none", background:T.primary, color:"white", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>로그인</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Dashboard ───
function AdminDashboard({ students, tests, refreshData, onLogout }) {
  const [tab, setTab] = useState("tests");
  const [showTestForm, setShowTestForm] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState("all");
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [studentLoginId, setStudentLoginId] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [studentGrade, setStudentGrade] = useState("고1");

  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testStudents, setTestStudents] = useState([]);
  const [testScores, setTestScores] = useState({});
  const [testTotal, setTestTotal] = useState("100");
  const [retestDates, setRetestDates] = useState({});
  const [retestReasons, setRetestReasons] = useState({});

  const addStudent = async () => {
    if (!studentName.trim() || !studentLoginId.trim()) return;
    if (students.some(s => s.login_id === studentLoginId.trim())) { alert("이미 사용 중인 아이디입니다."); return; }
    setSaving(true);
    try {
      await db.from("students").insert({ name:studentName.trim(), login_id:studentLoginId.trim(), pin:studentPin||"0000", grade:studentGrade });
      setStudentName(""); setStudentLoginId(""); setStudentPin("");
      await refreshData();
    } catch (e) { alert("등록 실패: " + e.message); }
    setSaving(false);
  };

  const deleteStudent = async (id) => {
    if (!confirm("이 학생을 삭제하시겠습니까?")) return;
    setSaving(true);
    try { await db.from("students").delete({ id }); await refreshData(); }
    catch (e) { alert("삭제 실패: " + e.message); }
    setSaving(false);
  };

  const updateStudentField = async (studentId, field, value) => {
    const dbField = field === "loginId" ? "login_id" : field;
    if (field === "loginId" && value.trim() && students.some(s => s.id !== studentId && s.login_id === value.trim())) {
      alert("이미 사용 중인 아이디입니다."); setEditingStudent(null); return;
    }
    setSaving(true);
    try { await db.from("students").update({ [dbField]:value.trim() }, { id:studentId }); await refreshData(); }
    catch (e) { alert("수정 실패: " + e.message); }
    setEditingStudent(null); setSaving(false);
  };

  const openTestForm = (test = null) => {
    if (test) {
      setEditingTest(test); setTestName(test.testName); setTestDate(test.testDate); setTestTotal(String(test.totalScore||100));
      const related = tests.filter(t => t.test_name === test.testName && t.test_date === test.testDate);
      setTestStudents(related.map(t => t.student_id));
      const sc={}, dt={}, rs={};
      related.forEach(t => { sc[t.student_id]=String(t.score??""); if(t.retest_date)dt[t.student_id]=t.retest_date; if(t.retest_reason)rs[t.student_id]=t.retest_reason; });
      setTestScores(sc); setRetestDates(dt); setRetestReasons(rs);
    } else {
      setEditingTest(null); setTestName(""); setTestDate(new Date().toISOString().split("T")[0]);
      setTestTotal("100"); setTestStudents([]); setTestScores({}); setRetestDates({}); setRetestReasons({});
    }
    setShowTestForm(true);
  };

  const saveTestResults = async () => {
    if (!testName.trim() || !testDate || testStudents.length===0) return;
    setSaving(true);
    try {
      if (editingTest) { const del=tests.filter(t=>t.test_name===editingTest.testName&&t.test_date===editingTest.testDate); for(const t of del) await db.from("tests").delete({id:t.id}); }
      const rows = testStudents.map(sId => ({
        student_id:sId, test_name:testName.trim(), test_date:testDate,
        score: testScores[sId]!==""&&testScores[sId]!==undefined ? Number(testScores[sId]) : null,
        total_score:Number(testTotal)||100, retest_date:retestDates[sId]||null, retest_reason:retestReasons[sId]||null,
      }));
      await db.from("tests").insert(rows);
      await refreshData(); setShowTestForm(false); setEditingTest(null);
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const deleteTest = async (name, date) => {
    if (!confirm(`"${name}" 테스트를 삭제하시겠습니까?`)) return;
    setSaving(true);
    try { const del=tests.filter(t=>t.test_name===name&&t.test_date===date); for(const t of del) await db.from("tests").delete({id:t.id}); await refreshData(); }
    catch (e) { alert("삭제 실패: " + e.message); }
    setSaving(false);
  };

  const toggleStudent = (id) => setTestStudents(p => p.includes(id) ? p.filter(s=>s!==id) : [...p,id]);
  const selectAllStudents = () => setTestStudents(p => p.length===students.length ? [] : students.map(s=>s.id));

  const testGroups = useMemo(() => {
    const g={};
    tests.forEach(t => { const k=`${t.test_name}__${t.test_date}`; if(!g[k])g[k]={testName:t.test_name,testDate:t.test_date,totalScore:t.total_score,tests:[]}; g[k].tests.push(t); });
    return Object.values(g).sort((a,b)=>b.testDate.localeCompare(a.testDate));
  }, [tests]);

  const filteredGroups = selectedStudentFilter==="all" ? testGroups : testGroups.filter(g=>g.tests.some(t=>t.student_id===selectedStudentFilter));

  return (
    <div style={{ minHeight:"100vh", background:T.bg }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:`1px solid ${T.border}`, padding:"16px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>📝</span>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Test Manager</h1>
            <p style={{ fontSize:12, color:T.textSec, margin:0 }}>관리자 모드{saving&&" · 저장 중..."}</p>
          </div>
        </div>
        <button onClick={onLogout} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${T.border}`, background:"white", color:T.textSec, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>로그아웃</button>
      </div>

      {/* Tabs */}
      <div style={{ padding:"0 32px", background:"white", borderBottom:`1px solid ${T.border}`, display:"flex" }}>
        {[{key:"tests",label:"테스트 입력",icon:"✏️"},{key:"results",label:"결과 조회",icon:"📊"},{key:"students",label:"학생 관리",icon:"👥"}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{ padding:"14px 20px", border:"none", borderBottom:tab===t.key?`3px solid ${T.primary}`:"3px solid transparent", background:"transparent", color:tab===t.key?T.primary:T.textSec, fontSize:14, fontWeight:tab===t.key?700:500, cursor:"pointer", fontFamily:"inherit" }}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 32px" }}>

        {/* Students */}
        {tab==="students" && (
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:T.text, margin:"0 0 20px" }}>학생 목록 <span style={{ color:T.textLight, fontWeight:500 }}>({students.length}명)</span></h2>
            <div style={{ background:"white", borderRadius:T.radius, border:`1px solid ${T.border}`, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
                <thead><tr style={{ background:T.bg }}>
                  <th style={{...thStyle,width:50}}>No.</th><th style={thStyle}>이름</th><th style={{...thStyle,width:140}}>아이디</th>
                  <th style={{...thStyle,width:90}}>학년</th><th style={{...thStyle,width:120}}>비밀번호</th><th style={{...thStyle,width:90}}>테스트</th><th style={{...thStyle,width:80}}></th>
                </tr></thead>
                <tbody>
                  {students.sort((a,b)=>a.name.localeCompare(b.name,"ko")).map((s,idx)=>{
                    const cnt=tests.filter(t=>t.student_id===s.id).length;
                    return (
                      <tr key={s.id} onMouseEnter={e=>e.currentTarget.style.background="#FAFBFF"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                        <td style={{...tdStyle,textAlign:"center",color:T.textLight,fontSize:13}}>{idx+1}</td>
                        <td style={{...tdStyle,fontWeight:700}}>{s.name}</td>
                        <td style={{...tdStyle,padding:"6px 12px"}}>
                          {editingStudent?.id===s.id&&editingStudent?.field==="loginId" ? (
                            <input autoFocus defaultValue={s.login_id||""} onBlur={e=>updateStudentField(s.id,"loginId",e.target.value)}
                              onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditingStudent(null);}}
                              style={{...inputStyle,padding:"6px 8px",fontSize:13,border:`2px solid ${T.primary}`,fontFamily:"monospace"}} />
                          ) : (
                            <span onClick={()=>setEditingStudent({id:s.id,field:"loginId"})}
                              style={{fontFamily:"monospace",fontSize:13,color:T.primary,cursor:"pointer",padding:"4px 6px",borderRadius:4,border:"1px dashed transparent",transition:"all 0.15s"}}
                              onMouseEnter={e=>e.currentTarget.style.borderColor=T.border} onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}
                              title="클릭하여 수정">{s.login_id||"-"}</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={{background:s.grade==="고3"?T.dangerLight:s.grade==="고2"?T.warningLight:T.primaryLight,color:s.grade==="고3"?T.danger:s.grade==="고2"?"#92400E":T.primary,padding:"2px 10px",borderRadius:6,fontSize:12,fontWeight:700}}>{s.grade}</span>
                        </td>
                        <td style={{...tdStyle,padding:"6px 12px"}}>
                          {editingStudent?.id===s.id&&editingStudent?.field==="pin" ? (
                            <input autoFocus defaultValue={s.pin} onBlur={e=>updateStudentField(s.id,"pin",e.target.value)}
                              onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditingStudent(null);}}
                              style={{...inputStyle,padding:"6px 8px",fontSize:13,border:`2px solid ${T.primary}`,fontFamily:"monospace"}} />
                          ) : (
                            <span onClick={()=>setEditingStudent({id:s.id,field:"pin"})}
                              style={{fontFamily:"monospace",fontSize:13,color:T.textSec,cursor:"pointer",padding:"4px 6px",borderRadius:4,border:"1px dashed transparent",transition:"all 0.15s"}}
                              onMouseEnter={e=>e.currentTarget.style.borderColor=T.border} onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}
                              title="클릭하여 수정">{s.pin}</span>
                          )}
                        </td>
                        <td style={{...tdStyle,textAlign:"center"}}><span style={{fontSize:13,color:T.textSec}}>{cnt}건</span></td>
                        <td style={{...tdStyle,textAlign:"center"}}>
                          <button onClick={()=>deleteStudent(s.id)} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${T.dangerLight}`,background:T.dangerLight,color:T.danger,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>삭제</button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{background:T.bg}}>
                    <td style={{...tdStyle,textAlign:"center",color:T.primary,fontSize:16,borderBottom:"none"}}>+</td>
                    <td style={{...tdStyle,borderBottom:"none"}}><input value={studentName} onChange={e=>setStudentName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addStudent()} placeholder="이름" style={{...inputStyle,padding:"8px 10px",fontSize:14,border:`1px solid ${T.border}`}} /></td>
                    <td style={{...tdStyle,borderBottom:"none"}}><input value={studentLoginId} onChange={e=>setStudentLoginId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addStudent()} placeholder="아이디" style={{...inputStyle,padding:"8px 10px",fontSize:13,border:`1px solid ${T.border}`}} /></td>
                    <td style={{...tdStyle,borderBottom:"none"}}><select value={studentGrade} onChange={e=>setStudentGrade(e.target.value)} style={{...inputStyle,padding:"8px 6px",fontSize:13,border:`1px solid ${T.border}`}}><option>고1</option><option>고2</option><option>고3</option></select></td>
                    <td style={{...tdStyle,borderBottom:"none"}}><input value={studentPin} onChange={e=>setStudentPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addStudent()} placeholder="0000" style={{...inputStyle,padding:"8px 10px",fontSize:13,border:`1px solid ${T.border}`}} /></td>
                    <td style={{...tdStyle,borderBottom:"none"}} />
                    <td style={{...tdStyle,textAlign:"center",borderBottom:"none"}}><button onClick={addStudent} disabled={saving} style={{padding:"6px 14px",borderRadius:6,border:"none",background:T.primary,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>등록</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Test Input */}
        {tab==="tests" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700,color:T.text,margin:0}}>테스트 결과 입력</h2>
              <button onClick={()=>openTestForm()} style={{padding:"10px 20px",borderRadius:10,border:"none",background:T.primary,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ 새 테스트</button>
            </div>
            {students.length===0 && <div style={{background:T.warningLight,border:`1px solid ${T.warning}`,borderRadius:T.radiusSm,padding:"16px 20px",marginBottom:20}}><p style={{margin:0,fontSize:14,color:"#92400E"}}>⚠️ 먼저 "학생 관리" 탭에서 학생을 등록해주세요.</p></div>}

            {showTestForm && (
              <div style={{background:"white",borderRadius:T.radius,padding:28,boxShadow:T.shadowLg,marginBottom:24,border:`1px solid ${T.border}`}}>
                <h3 style={{fontSize:16,fontWeight:700,margin:"0 0 20px",color:T.text}}>{editingTest?"테스트 수정":"새 테스트 등록"}</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
                  <div><label style={labelStyle}>테스트명</label><input value={testName} onChange={e=>setTestName(e.target.value)} placeholder="예: 단어 테스트 1회" style={inputStyle} /></div>
                  <div><label style={labelStyle}>시험 날짜</label><input type="date" value={testDate} onChange={e=>setTestDate(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>만점</label><input type="number" value={testTotal} onChange={e=>setTestTotal(e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <label style={labelStyle}>응시 학생 선택 및 점수 입력</label>
                    <button onClick={selectAllStudents} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${T.border}`,background:"white",fontSize:12,fontWeight:600,cursor:"pointer",color:T.primary,fontFamily:"inherit"}}>{testStudents.length===students.length?"전체 해제":"전체 선택"}</button>
                  </div>
                  <div style={{maxHeight:400,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:T.radiusSm}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                      <thead><tr style={{background:T.bg,position:"sticky",top:0,zIndex:1}}>
                        <th style={thStyle}>선택</th><th style={thStyle}>이름</th><th style={thStyle}>학년</th><th style={thStyle}>점수</th><th style={thStyle}>재시험 날짜</th><th style={thStyle}>재시험 사유</th>
                      </tr></thead>
                      <tbody>
                        {students.sort((a,b)=>a.name.localeCompare(b.name,"ko")).map(s=>(
                          <tr key={s.id} style={{background:testStudents.includes(s.id)?T.primaryLight:"white"}}>
                            <td style={tdStyle}><input type="checkbox" checked={testStudents.includes(s.id)} onChange={()=>toggleStudent(s.id)} style={{width:18,height:18,cursor:"pointer"}} /></td>
                            <td style={{...tdStyle,fontWeight:600}}>{s.name}</td><td style={tdStyle}>{s.grade}</td>
                            <td style={tdStyle}>{testStudents.includes(s.id)&&<input type="number" min="0" value={testScores[s.id]??""} onChange={e=>setTestScores(p=>({...p,[s.id]:e.target.value}))} placeholder="점수" style={{...inputStyle,width:80,padding:"6px 8px",fontSize:14,textAlign:"center"}} />}</td>
                            <td style={tdStyle}>{testStudents.includes(s.id)&&<input type="date" value={retestDates[s.id]??""} onChange={e=>setRetestDates(p=>({...p,[s.id]:e.target.value}))} style={{...inputStyle,width:140,padding:"6px 8px",fontSize:13}} />}</td>
                            <td style={tdStyle}>{testStudents.includes(s.id)&&<input value={retestReasons[s.id]??""} onChange={e=>setRetestReasons(p=>({...p,[s.id]:e.target.value}))} placeholder="사유" style={{...inputStyle,width:120,padding:"6px 8px",fontSize:13}} />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                  <button onClick={()=>{setShowTestForm(false);setEditingTest(null);}} style={{padding:"12px 24px",borderRadius:10,border:`1px solid ${T.border}`,background:"white",color:T.textSec,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                  <button onClick={saveTestResults} disabled={saving} style={{padding:"12px 32px",borderRadius:10,border:"none",background:saving?T.textLight:T.primary,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💾 {saving?"저장 중...":"저장"}</button>
                </div>
              </div>
            )}

            <h3 style={{fontSize:15,fontWeight:700,color:T.text,margin:"0 0 12px"}}>최근 등록된 테스트</h3>
            {testGroups.length===0 ? (
              <div style={{textAlign:"center",padding:40,color:T.textLight}}><div style={{fontSize:40,marginBottom:8}}>📋</div><p style={{fontSize:14}}>등록된 테스트가 없습니다.</p></div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {testGroups.slice(0,10).map(g=>(
                  <div key={`${g.testName}__${g.testDate}`} style={{background:"white",borderRadius:T.radiusSm,padding:"14px 20px",border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:T.text}}>{g.testName}</div>
                      <div style={{fontSize:12,color:T.textSec,marginTop:2}}>{formatDate(g.testDate)} · {g.tests.length}명 · 만점 {g.totalScore}점</div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>openTestForm(g)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.primaryLight}`,background:T.primaryLight,color:T.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>수정</button>
                      <button onClick={()=>deleteTest(g.testName,g.testDate)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.dangerLight}`,background:T.dangerLight,color:T.danger,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {tab==="results" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <h2 style={{fontSize:18,fontWeight:700,color:T.text,margin:0}}>성적 조회</h2>
              <select value={selectedStudentFilter} onChange={e=>setSelectedStudentFilter(e.target.value)} style={{...inputStyle,width:200}}>
                <option value="all">전체 학생</option>
                {students.sort((a,b)=>a.name.localeCompare(b.name,"ko")).map(s=><option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
              </select>
            </div>
            {filteredGroups.length===0 ? (
              <div style={{textAlign:"center",padding:60,color:T.textLight}}><div style={{fontSize:48,marginBottom:12}}>📊</div><p style={{fontSize:15,fontWeight:600}}>조회할 결과가 없습니다.</p></div>
            ) : filteredGroups.map(g=>(
              <div key={`${g.testName}__${g.testDate}`} style={{background:"white",borderRadius:T.radius,border:`1px solid ${T.border}`,marginBottom:16,overflow:"hidden"}}>
                <div style={{padding:"14px 20px",background:T.bg,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><span style={{fontSize:15,fontWeight:700,color:T.text}}>{g.testName}</span><span style={{fontSize:13,color:T.textSec,marginLeft:10}}>{formatDate(g.testDate)} · 만점 {g.totalScore}점</span></div>
                  <div style={{fontSize:13,color:T.textSec}}>평균: {(()=>{const sc=g.tests.filter(t=>t.score!==null);return sc.length===0?"-":(sc.reduce((a,b)=>a+b.score,0)/sc.length).toFixed(1);})()}점</div>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                  <thead><tr style={{background:"#FAFBFF"}}><th style={thStyle}>이름</th><th style={thStyle}>학년</th><th style={thStyle}>점수</th><th style={thStyle}>재시험</th><th style={thStyle}>사유</th></tr></thead>
                  <tbody>
                    {g.tests.filter(t=>selectedStudentFilter==="all"||t.student_id===selectedStudentFilter).map(t=>{
                      const st=students.find(s=>s.id===t.student_id); if(!st)return null;
                      const pct=t.score!==null?(t.score/(t.total_score||100))*100:null;
                      return (
                        <tr key={t.id}>
                          <td style={{...tdStyle,fontWeight:600}}>{st.name}</td><td style={tdStyle}>{st.grade}</td>
                          <td style={tdStyle}>{t.score!==null?<span style={{fontWeight:700,color:pct>=90?T.success:pct>=70?T.primary:pct>=50?T.warning:T.danger}}>{t.score}/{t.total_score} <span style={{fontSize:11,color:T.textSec}}>({pct.toFixed(0)}%)</span></span>:<span style={{color:T.textLight}}>미입력</span>}</td>
                          <td style={tdStyle}>{t.retest_date?<span style={{background:T.accentLight,color:T.accent,padding:"2px 8px",borderRadius:4,fontSize:12,fontWeight:600}}>{formatDate(t.retest_date)}</span>:"-"}</td>
                          <td style={{...tdStyle,color:T.textSec}}>{t.retest_reason||"-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Student View ───
function StudentView({ student, tests, onLogout }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTest, setSelectedTest] = useState(null);
  const year=currentDate.getFullYear(), month=currentDate.getMonth();
  const days = getMonthDays(year, month);

  const testsMap = useMemo(() => { const m={}; tests.forEach(t=>{if(!m[t.test_date])m[t.test_date]=[];m[t.test_date].push(t);}); return m; }, [tests]);
  const retestMap = useMemo(() => { const m={}; tests.forEach(t=>{if(t.retest_date){if(!m[t.retest_date])m[t.retest_date]=[];m[t.retest_date].push(t);}}); return m; }, [tests]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, maxWidth:500, margin:"0 auto" }}>
      <div style={{background:"white",padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div><div style={{fontSize:17,fontWeight:800,color:T.text}}>🎓 {student.name}</div><div style={{fontSize:12,color:T.textSec}}>나의 테스트 결과</div></div>
        <button onClick={onLogout} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:"white",color:T.textSec,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>로그아웃</button>
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 8px"}}>
        <button onClick={()=>setCurrentDate(new Date(year,month-1,1))} style={navBtnStyle}>◀</button>
        <div style={{fontSize:18,fontWeight:800,color:T.text}}>{year}년 {MONTHS_KR[month]}</div>
        <button onClick={()=>setCurrentDate(new Date(year,month+1,1))} style={navBtnStyle}>▶</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"4px 12px 0"}}>
        {DAYS_KR.map((d,i)=><div key={d} style={{textAlign:"center",fontSize:12,fontWeight:700,padding:"6px 0",color:i===0?T.danger:i===6?T.primary:T.textSec}}>{d}</div>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 12px 12px",gap:2}}>
        {days.map((day,idx)=>{
          if(day===null)return <div key={`e-${idx}`}/>;
          const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dt=testsMap[ds]||[], dr=retestMap[ds]||[];
          const isToday=ds===todayStr, dow=idx%7;
          return (
            <div key={ds} style={{minHeight:70,background:isToday?T.primaryLight:"white",borderRadius:8,padding:"3px 4px",border:isToday?`2px solid ${T.primary}`:`1px solid ${T.border}`,overflow:"hidden"}}>
              <div style={{fontSize:11,fontWeight:isToday?800:600,textAlign:"right",padding:"1px 3px",color:isToday?T.primary:dow===0?T.danger:dow===6?T.primary:T.textSec}}>{day}</div>
              {dt.map(t=><button key={t.id} onClick={()=>setSelectedTest(t)} style={{display:"block",width:"100%",padding:"2px 3px",background:t.score!==null?((t.score/(t.total_score||100))>=0.7?"#DBEAFE":"#FEE2E2"):T.bg,border:"none",borderRadius:4,fontSize:9,fontWeight:600,color:T.text,cursor:"pointer",textAlign:"left",marginBottom:1,fontFamily:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"16px"}}>📝 {t.test_name}</button>)}
              {dr.map(t=><button key={`r-${t.id}`} onClick={()=>setSelectedTest(t)} style={{display:"block",width:"100%",padding:"2px 3px",background:T.accentLight,border:"none",borderRadius:4,fontSize:9,fontWeight:600,color:T.accent,cursor:"pointer",textAlign:"left",marginBottom:1,fontFamily:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"16px"}}>🔄 {t.test_name}</button>)}
            </div>
          );
        })}
      </div>

      {/* Recent Results */}
      {(()=>{
        const recent=[...tests].filter(t=>t.score!==null).sort((a,b)=>b.test_date.localeCompare(a.test_date)).slice(0,5);
        if(!recent.length)return null;
        return (
          <div style={{padding:"8px 20px 4px"}}>
            <h3 style={{fontSize:15,fontWeight:700,color:T.text,margin:"0 0 10px"}}>📊 최근 테스트 결과</h3>
            {recent.map(t=>{const pct=(t.score/(t.total_score||100))*100;return(
              <div key={t.id} onClick={()=>setSelectedTest(t)} style={{background:"white",borderRadius:T.radiusSm,padding:"12px 16px",border:`1px solid ${T.border}`,marginBottom:8,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.test_name}</div>
                  <div style={{fontSize:12,color:T.textSec}}>{formatDate(t.test_date)}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <div style={{width:60,height:6,borderRadius:3,background:T.border,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:pct>=90?T.success:pct>=70?T.primary:pct>=50?T.warning:T.danger}}/></div>
                  <span style={{fontSize:15,fontWeight:800,minWidth:48,textAlign:"right",color:pct>=90?T.success:pct>=70?T.primary:pct>=50?T.warning:T.danger}}>{t.score}<span style={{fontSize:11,fontWeight:500,color:T.textSec}}>/{t.total_score}</span></span>
                </div>
              </div>
            );})}
          </div>
        );
      })()}

      {/* Upcoming Retests */}
      {(()=>{
        const up=tests.filter(t=>t.retest_date&&t.retest_date>=todayStr).sort((a,b)=>a.retest_date.localeCompare(b.retest_date));
        if(!up.length)return null;
        return (
          <div style={{padding:"8px 20px 20px"}}>
            <h3 style={{fontSize:15,fontWeight:700,color:T.text,margin:"0 0 10px"}}>📅 다가오는 재시험</h3>
            {up.map(t=>(
              <div key={t.id} onClick={()=>setSelectedTest(t)} style={{background:"white",borderRadius:T.radiusSm,padding:"12px 16px",border:`1px solid ${T.border}`,marginBottom:8,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:14,fontWeight:700,color:T.text}}>{t.test_name}</div><div style={{fontSize:12,color:T.textSec}}>원래 점수: {t.score}/{t.total_score}</div></div>
                <div style={{background:T.accentLight,color:T.accent,padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:700}}>{formatDate(t.retest_date)}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Detail Modal */}
      {selectedTest && (
        <div onClick={()=>setSelectedTest(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000,animation:"fadeIn 0.2s ease"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",width:"100%",maxWidth:500,animation:"slideUp 0.3s ease"}}>
            <div style={{width:40,height:4,borderRadius:2,background:T.border,margin:"0 auto 20px"}}/>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:"0 0 4px"}}>{selectedTest.test_name}</h2>
            <p style={{fontSize:13,color:T.textSec,margin:"0 0 20px"}}>시험일: {formatDate(selectedTest.test_date)}</p>
            <div style={{background:T.bg,borderRadius:14,padding:"20px 24px",textAlign:"center",marginBottom:16}}>
              {selectedTest.score!==null?(<>
                <div style={{fontSize:42,fontWeight:900,color:(()=>{const p=(selectedTest.score/(selectedTest.total_score||100))*100;return p>=90?T.success:p>=70?T.primary:p>=50?T.warning:T.danger;})()}}>{selectedTest.score}<span style={{fontSize:18,fontWeight:600,color:T.textSec}}>/{selectedTest.total_score}</span></div>
                <div style={{fontSize:14,fontWeight:600,marginTop:4,color:T.textSec}}>{((selectedTest.score/(selectedTest.total_score||100))*100).toFixed(0)}점</div>
              </>):<div style={{fontSize:16,color:T.textLight,fontWeight:600}}>점수 미입력</div>}
            </div>
            {selectedTest.retest_date&&(
              <div style={{background:T.accentLight,borderRadius:14,padding:"16px 20px",marginBottom:16,border:"1px solid rgba(255,107,53,0.2)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:16}}>🔄</span><span style={{fontSize:14,fontWeight:700,color:T.accent}}>재시험 예정</span></div>
                <div style={{fontSize:20,fontWeight:800,color:T.text}}>{formatDate(selectedTest.retest_date)}</div>
                {selectedTest.retest_reason&&<div style={{fontSize:13,color:T.textSec,marginTop:4}}>사유: {selectedTest.retest_reason}</div>}
              </div>
            )}
            <button onClick={()=>setSelectedTest(null)} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:T.primary,color:"white",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>닫기</button>
          </div>
        </div>
      )}

      {tests.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:T.textLight}}><div style={{fontSize:48,marginBottom:12}}>📋</div><p style={{fontSize:15,fontWeight:600}}>아직 등록된 테스트가 없습니다.</p></div>}

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}
