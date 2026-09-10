import React, { useEffect, useMemo, useState } from 'react';

const KEY = 'studyspace-v1';
const defaultData = {
  tasks: [],
  subjects: [
    { id: 'physics', name: 'Physics', notes: '', resources: [] },
    { id: 'chemistry', name: 'Chemistry', notes: '', resources: [] },
    { id: 'mathematics', name: 'Mathematics', notes: '', resources: [] },
    { id: 'coding', name: 'Coding', notes: '', resources: [] }
  ],
  books: [],
  marks: [],
  deadlines: [],
  resources: [],
  sessions: [],
  studyDates: [],
  spotify: '',
  preferences: { userName: '', quoteIndex: 0 }
};

function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return {
      ...defaultData,
      ...parsed,
      preferences: { ...defaultData.preferences, ...(parsed.preferences || {}) }
    };
  } catch {
    return defaultData;
  }
}

function uid(prefix='id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}
function todayISO() { return new Date().toISOString().slice(0,10); }
function formatDate(date) {
  if (!date) return 'No date';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
}
function daysFromToday(date) {
  if (!date) return Infinity;
  const a = new Date(`${todayISO()}T00:00:00`);
  const b = new Date(`${date}T00:00:00`);
  return Math.round((b-a)/86400000);
}
function formatMinutes(total) {
  const h=Math.floor(total/60), m=total%60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function calculateStreak(dates) {
  const set=new Set(dates);
  let cursor=new Date(`${todayISO()}T00:00:00`);
  let streak=0;
  if (!set.has(todayISO())) cursor.setDate(cursor.getDate()-1);
  while (set.has(cursor.toISOString().slice(0,10))) {
    streak++; cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}
function longestStreak(dates) {
  const sorted=[...new Set(dates)].sort();
  let best=0, run=0, prev=null;
  for (const d of sorted) {
    if (prev) {
      const diff=(new Date(`${d}T00:00:00`)-new Date(`${prev}T00:00:00`))/86400000;
      run=diff===1 ? run+1 : 1;
    } else run=1;
    best=Math.max(best,run); prev=d;
  }
  return best;
}
function greeting() {
  const h=new Date().getHours();
  if(h<12) return 'Good morning';
  if(h<17) return 'Good afternoon';
  if(h<21) return 'Good evening';
  return 'Good night';
}
function deadlineLabel(d) {
  const n=daysFromToday(d);
  if(n<0) return `Overdue by ${Math.abs(n)} day${Math.abs(n)===1?'':'s'}`;
  if(n===0) return 'Due today';
  if(n===1) return 'Due tomorrow';
  return `Due in ${n} days`;
}

const quotes=[
  'Progress over perfection.',
  'Just start.',
  'One focused hour can change your day.',
  'Consistency beats intensity.',
  'Make the next small step count.',
  'A calm desk. A clear mind. One thing at a time.'
];

const nav=[
  ['dashboard','Dashboard','⌂'],['tasks','Tasks','✓'],['subjects','Subjects','▤'],
  ['books','Books','▥'],['marks','Marks','▧'],['resources','Resources','↗'],['statistics','Statistics','◌']
];

function Modal({title,onClose,children}) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}>×</button></div>{children}</div>
  </div>;
}
function Empty({text,action}) { return <div className="empty">{text}{action}</div>; }

function Sidebar({page,setPage,streak,quote}) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">☕</span><span>StudySpace</span></div>
    <nav>{nav.map(([id,label,icon])=><button key={id} className={page===id?'nav-item active':'nav-item'} onClick={()=>setPage(id)}><span>{icon}</span>{label}</button>)}</nav>
    <div className="side-bottom">
      <div className="side-streak"><span>Study streak</span><strong>{streak} day{streak===1?'':'s'}</strong></div>
      <div className="side-quote">“{quote}”</div>
    </div>
  </aside>;
}

function MobileNav({page,setPage}) {
  return <div className="mobile-nav">{nav.map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><span>{icon}</span><small>{label}</small></button>)}</div>;
}

function Card({title,value,sub,icon}) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className="tiny-icon">{icon}</span></div><strong>{value}</strong><small>{sub}</small></div>;
}

function TaskForm({initial,onSave,onCancel}) {
  const [form,setForm]=useState(initial||{title:'',deadline:'',priority:'Medium'});
  return <form className="form-grid" onSubmit={e=>{e.preventDefault();if(form.title.trim())onSave({...form,title:form.title.trim()})}}>
    <label>Task name<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Finish Physics assignment" required/></label>
    <label>Deadline<input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label>
    <label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></label>
    <div className="form-actions"><button type="button" className="btn ghost" onClick={onCancel}>Cancel</button><button className="btn primary">Save task</button></div>
  </form>;
}

function TasksPage({data,setData,onStudy}) {
  const [filter,setFilter]=useState('All'), [editing,setEditing]=useState(null), [adding,setAdding]=useState(false);
  const tasks=data.tasks;
  const filtered=tasks.filter(t=>filter==='All'||(filter==='Active'&&!t.done)||(filter==='Completed'&&t.done)||filter===t.priority);
  const saveTask=t=>{setData(d=>({...d,tasks:t.id?d.tasks.map(x=>x.id===t.id?t:{...x,id:uid('task'),done:false}):[...d.tasks,{...t,id:uid('task'),done:false}]}));setAdding(false);setEditing(null)};
  const toggle=t=>{setData(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,done:!x.done}:x)}));if(!t.done)onStudy()};
  return <section className="page"><div className="page-head"><div><p className="eyebrow">Your desk</p><h1>Tasks</h1><p>Keep the next few steps visible, not overwhelming.</p></div><button className="btn primary" onClick={()=>setAdding(true)}>+ Add task</button></div>
    <div className="filter-row">{['All','Active','Completed','High','Medium','Low'].map(x=><button className={filter===x?'filter active':'filter'} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div>
    <div className="task-list">{filtered.length===0?<Empty text="Nothing here yet. Add one small task to begin."/>:filtered.sort((a,b)=>(a.done-b.done)||(daysFromToday(a.deadline)-daysFromToday(b.deadline))).map(t=><div className={`task-row ${t.done?'done':''}`} key={t.id}>
      <button className={`check ${t.done?'checked':''}`} onClick={()=>toggle(t)}>{t.done?'✓':''}</button>
      <div className="task-main"><strong>{t.title}</strong><div className="meta">{t.deadline&&<span>{formatDate(t.deadline)}</span>}<span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span></div></div>
      <div className="row-actions"><button onClick={()=>setEditing(t)}>Edit</button><button onClick={()=>setData(d=>({...d,tasks:d.tasks.filter(x=>x.id!==t.id)}))}>Delete</button></div>
    </div>)}</div>
    <div className="mini-summary"><strong>{tasks.filter(t=>t.done).length} / {tasks.length}</strong> tasks completed</div>
    {(adding||editing)&&<Modal title={editing?'Edit task':'New task'} onClose={()=>{setAdding(false);setEditing(null)}}><TaskForm initial={editing} onSave={saveTask} onCancel={()=>{setAdding(false);setEditing(null)}}/></Modal>}
  </section>;
}

function Pomodoro({onStudy,focusToday}) {
  const modes={Focus:25*60,'Short Break':5*60,'Long Break':15*60};
  const [mode,setMode]=useState('Focus'), [seconds,setSeconds]=useState(modes.Focus), [running,setRunning]=useState(false), [completed,setCompleted]=useState(0);
  useEffect(()=>{if(!running)return;const id=setInterval(()=>setSeconds(s=>{if(s<=1){setRunning(false);if(mode==='Focus'){setCompleted(c=>c+1);onStudy(Math.ceil(modes.Focus/60));}return 0;}return s-1}),1000);return()=>clearInterval(id)},[running,mode]);
  useEffect(()=>{setSeconds(modes[mode]);setRunning(false)},[mode]);
  const min=String(Math.floor(seconds/60)).padStart(2,'0'), sec=String(seconds%60).padStart(2,'0');
  const pct=(seconds/modes[mode])*100;
  const stop=()=>{setRunning(false);setSeconds(modes[mode])};
  return <div className="pomodoro card">
    <div className="pom-head"><div><p className="eyebrow">Focus corner</p><h2>☕ Pomodoro</h2></div><span className="session-count">{completed} sessions this visit</span></div>
    <div className="mode-tabs">{Object.keys(modes).map(m=><button className={mode===m?'active':''} onClick={()=>setMode(m)} key={m}>{m}</button>)}</div>
    <div className="timer-wrap"><div className="timer-ring" style={{'--progress':`${pct}%`}}><div><span>{mode}</span><strong>{min}:{sec}</strong></div></div></div>
    <div className="timer-controls">{!running?<button className="btn primary" onClick={()=>setRunning(true)}>{seconds===modes[mode]?'Start':'Resume'}</button>:<button className="btn secondary" onClick={()=>setRunning(false)}>Pause</button>}<button className="btn ghost" onClick={stop}>Stop</button><button className="btn ghost" onClick={()=>setSeconds(modes[mode])}>Reset</button></div>
    <p className="today-focus">Today's focus time <strong>{formatMinutes(focusToday)}</strong></p>
  </div>;
}

function Deadlines({data,setData}) {
  const [open,setOpen]=useState(false), [form,setForm]=useState({title:'',subject:'',date:'',description:''});
  const add=e=>{e.preventDefault();if(!form.title||!form.date)return;setData(d=>({...d,deadlines:[...d.deadlines,{...form,id:uid('deadline'),completed:false}]}));setForm({title:'',subject:'',date:'',description:''});setOpen(false)};
  const list=[...data.deadlines].sort((a,b)=>daysFromToday(a.date)-daysFromToday(b.date));
  return <div className="card"><div className="section-head"><div><p className="eyebrow">Don't forget</p><h2>Upcoming deadlines</h2></div><button className="text-btn" onClick={()=>setOpen(true)}>+ Add</button></div>
    {list.length===0?<Empty text="No deadlines added. Your calendar is clear."/>:<div className="deadline-list">{list.slice(0,5).map(d=><div className={`deadline ${d.completed?'completed':''}`} key={d.id}><button className="check" onClick={()=>setData(x=>({...x,deadlines:x.deadlines.map(y=>y.id===d.id?{...y,completed:!y.completed}:y)}))}>{d.completed?'✓':''}</button><div><strong>{d.title}</strong><small>{d.subject||'General'} · {formatDate(d.date)}</small></div><span className={daysFromToday(d.date)<=1?'deadline-badge soon':'deadline-badge'}>{d.completed?'Completed':deadlineLabel(d.date)}</span><button className="delete-inline" onClick={()=>setData(x=>({...x,deadlines:x.deadlines.filter(y=>y.id!==d.id)}))}>×</button></div>)}</div>}
    {open&&<Modal title="Add deadline" onClose={()=>setOpen(false)}><form className="form-grid" onSubmit={add}><label>Title<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></label><label>Subject<input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-actions"><button type="button" className="btn ghost" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Add deadline</button></div></form></Modal>}
  </div>;
}

function Motivation({data,setData}) {
  const idx=data.preferences.quoteIndex||0;
  const next=()=>setData(d=>({...d,preferences:{...d.preferences,quoteIndex:(idx+1)%quotes.length}}));
  const msg=data.tasks.length===0?'Your desk is clear. Let’s begin.':data.tasks.every(t=>t.done)?'Nice work. Keep going.':data.deadlines.some(d=>!d.completed&&daysFromToday(d.date)<=2)?'You have something due soon. One focused session?':calculateStreak(data.studyDates)>0?'You’re building consistency.':'One small session is enough to start.';
  return <div className="card motivation"><div className="coffee-doodle">☕</div><div><p className="eyebrow">A little thought</p><blockquote>“{quotes[idx]}”</blockquote><p className="context-msg">{msg}</p></div><button className="text-btn" onClick={next}>New thought ↗</button></div>;
}

function Dashboard({data,setData,onStudy}) {
  const focusToday=data.sessions.filter(s=>s.date===todayISO()).reduce((a,b)=>a+b.minutes,0);
  const done=data.tasks.filter(t=>t.done).length;
  const upcoming=[...data.deadlines].filter(d=>!d.completed&&daysFromToday(d.date)>=0).sort((a,b)=>daysFromToday(a.date)-daysFromToday(b.date))[0];
  return <section className="page dashboard"><div className="welcome"><div><p className="eyebrow">{new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})}</p><h1>{greeting()}, {data.preferences.userName||'there'} <span>☕</span></h1><p>Small progress is still progress.</p></div><div className="desk-note">Everything you need, in one quiet place.</div></div>
    <div className="stats-grid"><Card title="Today's study time" value={formatMinutes(focusToday)} sub="Focus sessions" icon="◷"/><Card title="Tasks" value={`${done} / ${data.tasks.length}`} sub="Completed" icon="✓"/><Card title="Current streak" value={`${calculateStreak(data.studyDates)} days`} sub={`${longestStreak(data.studyDates)} longest`} icon="✦"/><Card title="Upcoming deadline" value={upcoming?deadlineLabel(upcoming.date):'None'} sub={upcoming?.title||'Nothing due soon'} icon="⌁"/></div>
    <div className="dashboard-grid"><Pomodoro onStudy={onStudy} focusToday={focusToday}/><div className="stack"><TodaysTasks data={data} setData={setData} onStudy={onStudy}/><Deadlines data={data} setData={setData}/></div></div>
    <Motivation data={data} setData={setData}/>
  </section>;
}

function TodaysTasks({data,setData,onStudy}) {
  const today=data.tasks.filter(t=>!t.deadline||t.deadline===todayISO()).slice(0,6);
  return <div className="card"><div className="section-head"><div><p className="eyebrow">Today</p><h2>Tasks</h2></div><span className="count">{data.tasks.filter(t=>t.done).length}/{data.tasks.length}</span></div>{today.length===0?<Empty text="Your desk is clear. Add a task from Tasks."/>:<div className="task-list compact">{today.map(t=><div className={`task-row ${t.done?'done':''}`} key={t.id}><button className={`check ${t.done?'checked':''}`} onClick={()=>{setData(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,done:!x.done}:x)}));if(!t.done)onStudy()}}>{t.done?'✓':''}</button><div className="task-main"><strong>{t.title}</strong><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span></div></div>)}</div>}</div>;
}

function Subjects({data,setData}) {
  const [selected,setSelected]=useState(null), [adding,setAdding]=useState(false), [name,setName]=useState('');
  if(selected) return <SubjectWorkspace subject={selected} data={data} setData={setData} onBack={()=>setSelected(null)}/>;
  const add=()=>{if(!name.trim())return;const s={id:uid('subject'),name:name.trim(),notes:'',resources:[]};setData(d=>({...d,subjects:[...d.subjects,s]}));setName('');setAdding(false)};
  return <section className="page"><div className="page-head"><div><p className="eyebrow">Your study shelf</p><h1>Subjects</h1><p>Give each subject its own little workspace.</p></div><button className="btn primary" onClick={()=>setAdding(true)}>+ Add subject</button></div>
    <div className="subject-grid">{data.subjects.map((s,i)=><div className="subject-card" key={s.id} onClick={()=>setSelected(s)}><span className="subject-index">{String(i+1).padStart(2,'0')}</span><h2>{s.name}</h2><p>{s.notes?`${s.notes.length} characters of notes`:'A fresh page waiting for you.'}</p><div className="subject-footer"><span>{s.resources.length} resources</span><span>Open →</span></div></div>)}</div>
    {adding&&<Modal title="New subject" onClose={()=>setAdding(false)}><div className="form-grid"><label>Subject name<input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="e.g. Data Structures"/></label><div className="form-actions"><button className="btn ghost" onClick={()=>setAdding(false)}>Cancel</button><button className="btn primary" onClick={add}>Create</button></div></div></Modal>}
  </section>;
}
function SubjectWorkspace({subject,data,setData,onBack}) {
  const current=data.subjects.find(s=>s.id===subject.id)||subject;
  const [res,setRes]=useState({name:'',link:'',notes:''});
  const update=(patch)=>setData(d=>({...d,subjects:d.subjects.map(s=>s.id===current.id?{...s,...patch}:s)}));
  const add=()=>{if(!res.name.trim())return;update({resources:[...current.resources,{...res,id:uid('sr')} ]});setRes({name:'',link:'',notes:''})};
  return <section className="page"><button className="back-btn" onClick={onBack}>← Subjects</button><div className="page-head"><div><p className="eyebrow">Subject workspace</p><h1>{current.name}</h1><p>Notes, links and study material for this subject.</p></div><button className="btn danger-soft" onClick={()=>{if(confirm(`Delete ${current.name}?`)){setData(d=>({...d,subjects:d.subjects.filter(s=>s.id!==current.id)}));onBack()}}}>Delete subject</button></div>
    <div className="workspace-grid"><div className="card"><div className="section-head"><div><p className="eyebrow">Notebook</p><h2>Notes</h2></div><span className="save-hint">Saved locally</span></div><textarea className="notes" value={current.notes} onChange={e=>update({notes:e.target.value})} placeholder="Write formulas, explanations, reminders, questions…"/></div>
    <div className="card"><div className="section-head"><div><p className="eyebrow">Shelf</p><h2>Resources</h2></div></div><div className="inline-add"><input value={res.name} onChange={e=>setRes({...res,name:e.target.value})} placeholder="Resource name"/><input value={res.link} onChange={e=>setRes({...res,link:e.target.value})} placeholder="Optional link"/><button className="btn primary" onClick={add}>Add</button></div><input className="wide-input" value={res.notes} onChange={e=>setRes({...res,notes:e.target.value})} placeholder="Optional notes"/><div className="resource-list">{current.resources.length===0?<Empty text="No resources yet."/>:current.resources.map(r=><div className="resource-row" key={r.id}><div><strong>▧ {r.name}</strong><small>{r.notes}</small></div>{r.link&&<a href={r.link} target="_blank" rel="noreferrer">Open ↗</a>}<button className="delete-inline" onClick={()=>update({resources:current.resources.filter(x=>x.id!==r.id)})}>×</button></div>)}</div></div></div>
  </section>;
}

function Books({data,setData}) {
  const blank={title:'',author:'',category:'',link:'',status:'Want to Read'};
  const [form,setForm]=useState(blank),[editing,setEditing]=useState(null),[open,setOpen]=useState(false);
  const save=e=>{e.preventDefault();if(!form.title.trim())return;const item={...form,title:form.title.trim()};setData(d=>({...d,books:editing?d.books.map(b=>b.id===editing?{...b,...item}:b):[...d.books,{...item,id:uid('book')}]}));setForm(blank);setEditing(null);setOpen(false)};
  const edit=b=>{setForm(b);setEditing(b.id);setOpen(true)};
  return <section className="page"><div className="page-head"><div><p className="eyebrow">Quiet shelf</p><h1>Books</h1><p>Keep the books you want to read close at hand.</p></div><button className="btn primary" onClick={()=>{setForm(blank);setEditing(null);setOpen(true)}}>+ Add book</button></div>
    {data.books.length===0?<div className="card"><Empty text="Your bookshelf is waiting for its first book."/></div>:<div className="bookshelf">{data.books.map(b=><article className="book-card" key={b.id}><div className="book-spine"></div><div className="book-content"><span className="book-status">{b.status}</span><h2>{b.title}</h2><p>{b.author||'Author not added'}</p><small>{b.category||'Uncategorized'}</small><div className="book-actions">{b.link&&<a href={b.link} target="_blank" rel="noreferrer">Open link ↗</a>}<button onClick={()=>edit(b)}>Edit</button><button onClick={()=>setData(d=>({...d,books:d.books.filter(x=>x.id!==b.id)}))}>Delete</button></div></div></article>)}</div>}
    {open&&<Modal title={editing?'Edit book':'Add a book'} onClose={()=>setOpen(false)}><form className="form-grid" onSubmit={save}><label>Book title<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></label><label>Author<input value={form.author} onChange={e=>setForm({...form,author:e.target.value})}/></label><label>Subject / category<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Optional link<input type="url" value={form.link} onChange={e=>setForm({...form,link:e.target.value})}/></label><label>Reading status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Want to Read</option><option>Reading</option><option>Completed</option></select></label><div className="form-actions"><button type="button" className="btn ghost" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Save book</button></div></form></Modal>}
  </section>;
}

function Marks({data,setData}) {
  const blank={subject:'',exam:'',obtained:'',max:'',date:todayISO()};
  const [form,setForm]=useState(blank),[editing,setEditing]=useState(null),[open,setOpen]=useState(false);
  const save=e=>{e.preventDefault();const obtained=Number(form.obtained),max=Number(form.max);if(!form.subject||!max||obtained<0)return;const item={...form,obtained,max};setData(d=>({...d,marks:editing?d.marks.map(m=>m.id===editing?{...m,...item}:m):[...d.marks,{...item,id:uid('mark')}]}));setForm(blank);setEditing(null);setOpen(false)};
  const percentages=data.marks.map(m=>m.obtained/m.max*100);
  const overall=percentages.length?Math.round(data.marks.reduce((a,m)=>a+m.obtained,0)/data.marks.reduce((a,m)=>a+m.max,0)*100):0;
  const subjectMap={};data.marks.forEach(m=>(subjectMap[m.subject]??=[]).push(m.obtained/m.max*100));
  const best=Object.entries(subjectMap).sort((a,b)=>b[1].reduce((x,y)=>x+y,0)/b[1].length-a[1].reduce((x,y)=>x+y,0)/a[1].length)[0]?.[0];
  return <section className="page"><div className="page-head"><div><p className="eyebrow">Academic shelf</p><h1>Marks</h1><p>Track results without turning them into a complicated spreadsheet.</p></div><button className="btn primary" onClick={()=>{setForm(blank);setEditing(null);setOpen(true)}}>+ Add marks</button></div>
    <div className="academic-summary"><Card title="Overall percentage" value={`${overall}%`} sub={`${data.marks.length} records`} icon="%" /><Card title="Best subject" value={best||'—'} sub="Based on recorded marks" icon="★"/><Card title="Recent performance" value={data.marks.length?`${Math.round(percentages[percentages.length-1])}%`:'—'} sub="Latest entry" icon="↗"/></div>
    <div className="card table-card">{data.marks.length===0?<Empty text="No marks yet. Add your first result to start the tracker."/>:<table><thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Percentage</th><th>Date</th><th></th></tr></thead><tbody>{[...data.marks].reverse().map(m=><tr key={m.id}><td><strong>{m.subject}</strong></td><td>{m.exam}</td><td>{m.obtained} / {m.max}</td><td><span className="score">{Math.round(m.obtained/m.max*100)}%</span></td><td>{formatDate(m.date)}</td><td><div className="row-actions"><button onClick={()=>{setForm(m);setEditing(m.id);setOpen(true)}}>Edit</button><button onClick={()=>setData(d=>({...d,marks:d.marks.filter(x=>x.id!==m.id)}))}>Delete</button></div></td></tr>)}</tbody></table>}</div>
    {open&&<Modal title={editing?'Edit marks':'Add marks'} onClose={()=>setOpen(false)}><form className="form-grid" onSubmit={save}><label>Subject<input autoFocus value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} required/></label><label>Exam name<input value={form.exam} onChange={e=>setForm({...form,exam:e.target.value})}/></label><label>Marks obtained<input type="number" min="0" value={form.obtained} onChange={e=>setForm({...form,obtained:e.target.value})} required/></label><label>Maximum marks<input type="number" min="1" value={form.max} onChange={e=>setForm({...form,max:e.target.value})} required/></label><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><div className="form-actions"><button type="button" className="btn ghost" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Save marks</button></div></form></Modal>}
  </section>;
}

function Resources({data,setData}) {
  const blank={name:'',category:'Coding',link:'',notes:''};
  const [form,setForm]=useState(blank),[search,setSearch]=useState(''),[open,setOpen]=useState(false);
  const add=e=>{e.preventDefault();if(!form.name.trim())return;setData(d=>({...d,resources:[...d.resources,{...form,id:uid('res')}]}));setForm(blank);setOpen(false)};
  const list=data.resources.filter(r=>`${r.name} ${r.category} ${r.notes}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="page"><div className="page-head"><div><p className="eyebrow">Your library</p><h1>Resources</h1><p>Save links and study material you already use. StudySpace never fetches anything automatically.</p></div><button className="btn primary" onClick={()=>setOpen(true)}>+ Add resource</button></div>
    <div className="search-row"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your resources…"/><span>{list.length} saved</span></div>
    <div className="resource-grid">{list.length===0?<div className="card"><Empty text={search?'No matching resources.':'Your resource shelf is empty.'}/></div>:list.map(r=><article className="resource-card" key={r.id}><span className="resource-cat">{r.category}</span><h2>{r.name}</h2><p>{r.notes||'No notes added.'}</p><div className="resource-actions">{r.link&&<a href={r.link} target="_blank" rel="noreferrer">Open ↗</a>}<button onClick={()=>setData(d=>({...d,resources:d.resources.filter(x=>x.id!==r.id)}))}>Delete</button></div></article>)}</div>
    {open&&<Modal title="Save a resource" onClose={()=>setOpen(false)}><form className="form-grid" onSubmit={add}><label>Name<input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Physics','Maths','Coding','College','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label>Link<input type="url" value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="https://…"/></label><label>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="form-actions"><button type="button" className="btn ghost" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Save resource</button></div></form></Modal>}
  </section>;
}

function SpotifyPlayer({data,setData}) {
  const [url,setUrl]=useState(data.spotify||''),[saved,setSaved]=useState(Boolean(data.spotify));
  const save=()=>{let u=url.trim(); if(u.includes('open.spotify.com')&&!u.includes('/embed/')) u=u.replace('open.spotify.com/','open.spotify.com/embed/');setUrl(u);setData(d=>({...d,spotify:u}));setSaved(Boolean(u))};
  return <div className="card spotify"><div><p className="eyebrow">Study music</p><h2>🎵 Your café playlist</h2><p>Paste a Spotify playlist URL. No Spotify API, login or backend is used.</p></div><div className="spotify-form"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://open.spotify.com/embed/playlist/…"/><button className="btn primary" onClick={save}>Save</button></div>{saved?<iframe title="Spotify study playlist" src={url} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>:<div className="spotify-empty">Add your study playlist ☕</div>}</div>;
}

function Statistics({data}) {
  const total=data.sessions.reduce((a,s)=>a+s.minutes,0), today=data.sessions.filter(s=>s.date===todayISO()).reduce((a,s)=>a+s.minutes,0);
  const completed=data.tasks.filter(t=>t.done).length;
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const iso=d.toISOString().slice(0,10);return {iso,label:d.toLocaleDateString(undefined,{weekday:'short'}),minutes:data.sessions.filter(s=>s.date===iso).reduce((a,s)=>a+s.minutes,0)}})
  return <section className="page"><div className="page-head"><div><p className="eyebrow">Your patterns</p><h1>Statistics</h1><p>Simple numbers that help you notice your habits.</p></div></div>
    <div className="stats-grid six"><Card title="Total study time" value={formatMinutes(total)} sub="Recorded focus" icon="◷"/><Card title="Today's time" value={formatMinutes(today)} sub="Today" icon="○"/><Card title="Current streak" value={`${calculateStreak(data.studyDates)} days`} sub="Consecutive" icon="✦"/><Card title="Longest streak" value={`${longestStreak(data.studyDates)} days`} sub="Best run" icon="↗"/><Card title="Tasks completed" value={completed} sub={`${data.tasks.length} total`} icon="✓"/><Card title="Pomodoro sessions" value={data.sessions.length} sub="Completed focus sessions" icon="●"/></div>
    <div className="card weekly"><div className="section-head"><div><p className="eyebrow">Last 7 days</p><h2>Study rhythm</h2></div><strong>{formatMinutes(last7.reduce((a,x)=>a+x.minutes,0))}</strong></div><div className="bars">{last7.map(x=><div className="bar-col" key={x.iso}><span>{x.minutes?formatMinutes(x.minutes):'—'}</span><div className="bar-track"><div className="bar-fill" style={{height:`${Math.max(4,Math.min(100,x.minutes/180*100))}%`}}/></div><small>{x.label}</small></div>)}</div></div>
    <div className="card heat"><div className="section-head"><div><p className="eyebrow">Consistency</p><h2>Study days</h2></div><span>{data.studyDates.length} total days</span></div><div className="heat-grid">{Array.from({length:35},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(34-i));const iso=d.toISOString().slice(0,10);const mins=data.sessions.filter(s=>s.date===iso).reduce((a,s)=>a+s.minutes,0);return <span key={iso} className={`heat-cell level-${mins===0?0:mins<25?1:mins<60?2:3}`} title={`${iso}: ${formatMinutes(mins)}`}/>})}</div></div>
  </section>;
}

function Settings({data,setData}) {
  return <div className="settings"><label>Your name<input value={data.preferences.userName} onChange={e=>setData(d=>({...d,preferences:{...d.preferences,userName:e.target.value}}))} placeholder="What should StudySpace call you?"/></label><button className="btn danger-soft" onClick={()=>{if(confirm('Reset all StudySpace data? This cannot be undone.')){localStorage.removeItem(KEY);location.reload()}}}>Reset all local data</button></div>;
}

export default function App() {
  const [data,setData]=useState(loadData),[page,setPage]=useState('dashboard'),[settingsOpen,setSettingsOpen]=useState(false);
  useEffect(()=>localStorage.setItem(KEY,JSON.stringify(data)),[data]);
  const onStudy=(minutes=1)=>setData(d=>{const today=todayISO();const sessions=[...d.sessions,{id:uid('session'),date:today,minutes}];return {...d,sessions,studyDates:d.studyDates.includes(today)?d.studyDates:[...d.studyDates,today]};});
  const streak=calculateStreak(data.studyDates), quote=quotes[data.preferences.quoteIndex||0];
  const content={dashboard:<Dashboard data={data} setData={setData} onStudy={onStudy}/>,tasks:<TasksPage data={data} setData={setData} onStudy={onStudy}/>,subjects:<Subjects data={data} setData={setData}/>,books:<Books data={data} setData={setData}/>,marks:<Marks data={data} setData={setData}/>,resources:<Resources data={data} setData={setData}/>,statistics:<Statistics data={data}/>}[page];
  return <div className="app-shell"><Sidebar page={page} setPage={setPage} streak={streak} quote={quote}/><main className="main"><header className="topbar"><div className="mobile-brand">☕ StudySpace</div><div className="top-actions"><button className="icon-btn" title="Settings" onClick={()=>setSettingsOpen(true)}>⚙</button></div></header>{content}</main><MobileNav page={page} setPage={setPage}/>{settingsOpen&&<Modal title="StudySpace settings" onClose={()=>setSettingsOpen(false)}><Settings data={data} setData={setData}/></Modal>}</div>;
}