import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, ChartBar, ChatCircle, ChatCircleDots, Check, CheckCircle, Horse as ChessKnight, Clock, Coffee, Ear, Fire, Flag, HandWaving, Info, Lightbulb, Microphone, Moon, PaperPlaneTilt, Play, Repeat, SignOut, SlidersHorizontal, Sparkle, SpeakerHigh, SpeakerSlash, Star, Sun, Target, Trophy, X } from '@phosphor-icons/react';
import { biomes, biomeFor, dayKey, dialogueLines, emptyProgress, evaluate, lessons, loadProgress, people, ratings, streak, type Lesson, type Move, type PersonaId, type Progress, type Rating, type Session } from './engine';
import { CampusScene, Character } from './Character';
import { LocalConversation, LocalSetup } from './LocalConversation';
import './forest.css';

type Page = 'learn' | 'practice' | 'review' | 'progress';
type Mode = 'text' | 'voice';
type Run = { id: string; lesson: Lesson; persona: PersonaId; mode: Mode; arcade: boolean; moves: Move[]; engine?: 'local' | 'guided'; model?: string; voice?: string };
const icons = { chat: ChatCircleDots, ear: Ear, spark: Sparkle, coffee: Coffee, hand: HandWaving, door: SignOut };
const nav = [{ id: 'learn', name: 'Learn', icon: BookOpen }, { id: 'practice', name: 'Practice', icon: ChatCircleDots }, { id: 'review', name: 'Move review', icon: ChessKnight }, { id: 'progress', name: 'My progress', icon: ChartBar }] as const;
const storageKey = 'microtalks-progress-v1';

function Avatar({ id, size = '' }: { id: PersonaId; size?: string }) {
  return <div className={`avatar ${people[id].color} ${size}`} aria-hidden="true"><Character person={id} portrait /><span /></div>;
}
function Badge({ rating }: { rating: Rating }) {
  return <span className={`rating ${rating}`}><b>{ratings[rating].symbol}</b>{ratings[rating].label}</span>;
}
function Modal({ children, title, close, wide = false }: { children: ReactNode; title: string; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={close} aria-label={title} onClick={e => { if (e.target === e.currentTarget) close(); }}><button className="icon-button modal-close" onClick={close} aria-label="Close"><X size={22} /></button>{children}</dialog>;
}

export default function App() {
  const [page, setPage] = useState<Page>('learn');
  const [progress, setProgress] = useState<Progress>(() => { try { return loadProgress(localStorage.getItem(storageKey)); } catch { return emptyProgress(); } });
  const [storageError, setStorageError] = useState(false);
  const [brief, setBrief] = useState<Lesson | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [review, setReview] = useState<Session | null>(null);
  const [settings, setSettings] = useState(false);
  const [guide, setGuide] = useState(false);
  const [localSetup, setLocalSetup] = useState(false);
  const [fluency, setFluency] = useState(true);
  const [theme, setTheme] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const content = useRef<HTMLElement>(null);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(progress)); setStorageError(false); } catch { setStorageError(true); } }, [progress]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { content.current?.focus(); window.scrollTo(0, 0); }, [page, run?.id, review?.id]);

  const completed = new Set(progress.sessions.map(s => s.lessonId));
  const nextLesson = lessons.find(l => !completed.has(l.id)) ?? lessons[0];
  const totalXp = lessons.reduce((sum, lesson) => sum + Math.max(0, ...progress.sessions.filter(s => s.lessonId === lesson.id).map(s => s.xp)), 0);
  const today = dayKey();
  const todaySessions = progress.sessions.filter(s => dayKey(new Date(s.date)) === today);
  const navigate = (target: Page) => { setPage(target); setReview(null); };
  const finish = (moves: Move[], model?: string) => {
    if (!run) return;
    const session: Session = { id: run.id, lessonId: run.lesson.id, persona: run.persona, date: new Date().toISOString(), moves, xp: moves.reduce((sum, m) => sum + m.points, 0), engine: run.engine, model: model ?? run.model, voice: run.voice };
    setProgress(p => ({ ...p, sessions: [...p.sessions.filter(s => s.id !== session.id), session].slice(-60) }));
    setRun(null); setReview(session); setPage('review');
  };

  return <div className={`app-shell forest-app ${run ? 'is-practising' : ''}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <button className="wordmark" onClick={() => { if (!run) navigate('learn'); }} aria-label="Microtalks home"><ChatCircleDots size={32} weight="fill" />microtalks</button>
      <div className="sidebar-caption">A little practice. A little braver.</div>
      <button className="icon-button mobile-settings" onClick={() => setSettings(true)} aria-label="Preferences"><SlidersHorizontal size={21} /></button>
      <nav aria-label="Main navigation">{nav.map(n => <button key={n.id} disabled={Boolean(run)} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => navigate(n.id)} aria-current={page === n.id ? 'page' : undefined}><n.icon size={23} weight={page === n.id ? 'fill' : 'regular'} /><span>{n.name}</span>{n.id === 'learn' && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><div className="note-icon"><Sparkle size={22} /></div><strong>Real life is the next level.</strong><p>A little awkward is a perfectly good place to start.</p></div><button className="nav-item" onClick={() => setSettings(true)}><SlidersHorizontal size={22} /><span>Preferences</span></button><div className="profile"><span className="profile-avatar">Y</span><div><strong>Your practice space</strong><small>Local profile · no account needed</small></div></div></div>
    </aside>
    <div className="workspace">
      <div className="forest-canopy" aria-hidden="true"><CampusScene place="Forest campus" biome="woodland" /></div>
      <header className="topbar"><div className="breadcrumb">Your campus era <span>/</span> <strong>{run ? 'In conversation' : nav.find(n => n.id === page)?.name}</strong></div><div className="top-stats"><span title="Consecutive practice days"><Fire weight="fill" size={21} className="orange-ink" /><b>{streak(progress.sessions)}</b><span className="stat-label">day streak</span></span><span title="Best score earned in each lesson"><Star weight="fill" size={21} className="gold-ink" /><b>{totalXp}</b><span className="stat-label">XP</span></span><button className="icon-button theme-button" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button></div></header>
      {storageError && <div className="storage-warning" role="alert">Browser storage is unavailable. You can keep practising, but this session’s progress won’t survive a reload.</div>}
      {!run && <div className="local-invite"><div><strong>A real reply. A familiar face.</strong><span>Try the conversation and voice models on your SSD.</span></div><button className="button primary" onClick={() => setLocalSetup(true)}>Try local AI <ArrowRight size={18} /></button></div>}
      <main id="main" ref={content} tabIndex={-1}>
        {run ? (run.engine === 'local' ? <LocalConversation key={`${run.id}-${run.moves.length}`} run={run} finish={finish} exit={() => setRun(null)} /> : <Conversation key={`${run.id}-${run.moves.length}`} run={run} fluency={fluency} finish={finish} exit={() => setRun(null)} />) : review ? <Review key={review.id} session={review} back={() => setReview(null)} replay={index => { if (review.moves.some(m => m.live)) return; setRun({ id: review.id, lesson: lessons.find(l => l.id === review.lessonId)!, persona: review.persona, mode: 'text', arcade: false, moves: review.moves.slice(0, index), engine: review.engine, model: review.model, voice: review.voice }); setReview(null); }} next={() => { setReview(null); if (review.engine === 'local') setLocalSetup(true); else setBrief(nextLesson); }} /> :
          <div className="dashboard">
            <div className="primary-column">
              {page === 'learn' && <>
                <div className="page-heading"><div className="eyebrow"><span className="live-dot" /> YOUR DAILY DOSE OF CONFIDENCE</div><h1>Small talk.<br className="mobile-break" /> Big little wins.</h1><p>You don’t have to be a natural. You just need a little practice.</p></div>
                <section className="daily-card"><div className="daily-content"><span className="pill"><Target size={15} /> {completed.size ? 'Your next little win' : 'A good place to start'}</span><h2>{nextLesson.title}</h2><p>{nextLesson.description}<br />One skill. Three moves. All you.</p><button className="button primary" onClick={() => setBrief(nextLesson)}>{completed.size ? 'Keep practising' : 'Start a conversation'}<ArrowRight size={20} /></button><span className="duration"><Clock size={14} /> About 3 minutes with {people[nextLesson.partner].name}</span></div><div className="daily-art cast-art" aria-hidden="true"><span className="float-bubble bubble-one">hey, is this seat taken?</span><Character person={nextLesson.partner} /><span className="float-bubble bubble-two"><span>!!</span> a little braver already.</span></div></section>
                <section className="path-section forest-path" aria-labelledby="forest-path-title">
                  <div className="section-heading"><div><h2 id="forest-path-title">Your forest journey</h2><p>{lessons.length} little lessons with Maya the dog, Leo the fox, and Sam the owl.</p></div><button className="icon-button" onClick={() => setGuide(true)} aria-label="Open unit guide"><BookOpen size={22} /></button></div>
                  <div className="forest-map" aria-label="Choose a biome">
                    {biomes.map((biome, i) => {
                      const unit = lessons.filter(l => biome.lessonIds.includes(l.id));
                      const destination = unit.find(l => !completed.has(l.id)) ?? unit[0];
                      const done = unit.filter(l => completed.has(l.id)).length;
                      return <button key={biome.id} className={`forest-stop biome-${biome.id}`} onClick={() => setBrief(destination)} aria-label={`${biome.name}: ${done} of ${unit.length} practised. Open ${destination.title}`}><span className="forest-stop-scene" aria-hidden="true"><CampusScene place={biome.name} biome={biome.id} /></span><span className="forest-stop-copy"><small>0{i + 1}</small><strong>{biome.name}</strong><span>{done}/{unit.length} practised <ArrowRight size={14} /></span></span></button>;
                    })}
                  </div>
                  <p className="forest-map-note">Follow the trail or wander. Every lesson is open.</p>
                  {biomes.map((biome, unitIndex) => {
                    const unit = lessons.filter(l => biome.lessonIds.includes(l.id));
                    const doneCount = unit.filter(l => completed.has(l.id)).length;
                    return <section key={biome.id} className={`biome-section biome-${biome.id}`} aria-labelledby={`${biome.id}-title`}>
                      <header className="biome-heading"><span className="biome-number">0{unitIndex + 1}</span><div><small>{biome.title}</small><h3 id={`${biome.id}-title`}>{biome.name}</h3><p>{biome.description}</p></div><span className="biome-progress" aria-label={`${doneCount} of ${unit.length} lessons practised`}>{doneCount}/{unit.length}<small>practised</small></span></header>
                      <div className="lesson-path">{unit.map(l => { const Icon = icons[l.icon]; const done = completed.has(l.id); const current = l.id === nextLesson.id; return <button key={l.id} className={`path-lesson ${current ? 'current' : ''} ${done ? 'done' : ''}`} onClick={() => setBrief(l)}><div className="path-node-wrap"><div className={`path-node ${current ? 'green' : done ? 'completed' : l.color}`}>{done ? <Check weight="bold" size={28} /> : <Icon weight={current ? 'fill' : 'regular'} size={28} />}</div></div><div className="path-description"><small>Lesson {lessons.indexOf(l) + 1} <span>·</span> {l.skill}</small><h3>{l.title}</h3><p>{l.description}</p></div>{current ? <span className="start-tag">LET’S GO <Play size={12} weight="fill" /></span> : done ? <span className="lesson-status">Replay <Repeat size={16} /></span> : <ArrowRight size={18} className="path-arrow" />}</button>; })}</div>
                    </section>;
                  })}
                </section>
                <div className="bottom-note"><ChatCircle size={19} /> You’re practising connection, not perfection.</div>
              </>}
              {page === 'practice' && <><div className="page-heading"><div className="eyebrow">THE PRACTICE ROOM</div><h1>Meet your next moment.</h1><p>A familiar face. A new situation. A little more you.</p></div><div className="scenario-grid">{lessons.map(l => <button className="scenario-card" key={l.id} onClick={() => setBrief(l)}><div className={`scenario-art illustrated-scenario ${l.color}`}><Character person={l.partner} /><span className="scenario-greeting">{l.partner === 'maya' ? 'Oh, hey!' : l.partner === 'leo' ? 'You won’t believe this.' : 'Got a minute?'}</span><span className="scenario-time"><Clock size={13} /> 3 min</span></div><div className="scenario-copy"><small>{l.place} · with {people[l.partner].name}</small><h2>{l.title}</h2><p>{l.description}</p><div><span>{l.skill}</span><ArrowUpRight size={20} /></div></div></button>)}</div></>}
              {page === 'review' && <><div className="page-heading"><div className="eyebrow">EVERY CONVERSATION HAS A REPLAY</div><h1>Find your turning points.</h1><p>A good move is worth noticing. A tricky one is worth another try.</p></div>{progress.sessions.length ? <div className="history-list">{[...progress.sessions].reverse().map(s => { const lesson = lessons.find(l => l.id === s.lessonId)!; return <button key={s.id} className="history-row" onClick={() => setReview(s)}><Avatar id={s.persona} /><div><h3>{lesson.title}</h3><p>With {people[s.persona].name} · {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p><div className="mini-ratings">{s.moves.map((m, i) => <span key={i} className={`rating-symbol ${m.rating}`}>{ratings[m.rating].symbol}</span>)}</div></div><strong>{s.xp} XP</strong><ArrowRight size={20} /></button>; })}</div> : <div className="empty-state"><ChessKnight size={54} weight="duotone" /><h2>Your first review is one chat away.</h2><p>Finish a conversation to see your moves here. You can replay any moment and try a different approach.</p><button className="button primary" onClick={() => setBrief(lessons[0])}>Start a conversation <ArrowRight size={18} /></button></div>}</>}
              {page === 'progress' && <><div className="page-heading"><div className="eyebrow">SHOWING UP COUNTS</div><h1>Little by little.</h1><p>Every attempt is practice, even the awkward ones.</p></div><div className="progress-summary"><div><Trophy size={26} /><strong>{completed.size}<small> / {lessons.length}</small></strong><span>Skills practised</span></div><div><Star size={26} /><strong>{totalXp}</strong><span>Personal-best XP</span></div><div><ChatCircleDots size={26} /><strong>{progress.sessions.length}</strong><span>Conversations</span></div></div><section className="panel skill-progress"><h2>Your growing toolkit</h2>{lessons.map(l => { const score = Math.max(0, ...progress.sessions.filter(s => s.lessonId === l.id).map(s => s.xp)); return <div key={l.id} className="skill-row"><div><strong>{l.skill}</strong><span>{completed.has(l.id) ? `${score} / 90 XP` : 'Ready when you are'}</span></div><progress value={score} max={90} aria-label={`${l.skill}: ${score} of 90 XP`} /><button className="text-button" onClick={() => setBrief(l)}>{completed.has(l.id) ? 'Practise again' : 'Try this skill'}<ArrowRight size={15} /></button></div>; })}<p className="fine-print">XP reflects prototype lesson feedback, not a measurement of your social ability. Your best attempt per lesson counts toward total XP.</p></section></>}
            </div>
            <aside className="coaching-rail"><section className="panel daily-goal"><div className="rail-heading"><h3>A little every day</h3><Fire size={23} weight="duotone" className="orange-ink" /></div><div className="goal-summary"><span>{Math.min(todaySessions.length, 1)}<small> / 1</small></span><p>conversation today<br /><strong>{todaySessions.length ? 'You showed up. Nice work.' : 'Three minutes is a good start.'}</strong></p></div><progress value={Math.min(todaySessions.length, 1)} max={1} aria-label="Daily conversation goal"/><div className="week-days">{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const active = progress.sessions.some(s => dayKey(new Date(s.date)) === dayKey(d)); return <div key={i}><span>{d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span><b className={`${active ? 'practised' : ''} ${i === 6 ? 'today' : ''}`} aria-label={`${d.toLocaleDateString()}: ${active ? 'practised' : 'not yet'}`}>{active ? <Check size={13} weight="bold" /> : '·'}</b></div>; })}</div></section>
              <section className="coach-tip"><div className="tip-label"><Lightbulb size={20} weight="duotone" /> A SMALL REMINDER</div><h3>Interesting beats<br />impressive.</h3><p>Pick up on one thing they said. A genuine follow-up goes further than a perfect opening line.</p><div className="tip-example">“Wait, how did you get into that?”</div></section>
              <section className="panel real-world"><div className="rail-heading"><h3>Take it outside</h3><ArrowUpRight size={20} /></div><span className="small-pill">Your real-world side quest</span><p>Say one thing to someone before your next lecture. That’s it. That’s the challenge.</p><button className={`challenge-button ${progress.challengeDates.includes(today) ? 'checked' : ''}`} onClick={() => setProgress(p => ({ ...p, challengeDates: p.challengeDates.includes(today) ? p.challengeDates.filter(d => d !== today) : [...p.challengeDates, today].slice(-90) }))}><span>{progress.challengeDates.includes(today) && <Check size={13} weight="bold" />}</span>{progress.challengeDates.includes(today) ? 'I gave it a go!' : 'Mark as attempted'}</button><small>Reward the attempt. Not the outcome.</small></section>
              <button className="how-link" onClick={() => setGuide(true)}><Info size={17} /> How Microtalks works</button><div className="prototype-label">Made for practice, not perfection.<br />Interactive prototype · rule-based coaching</div>
            </aside>
          </div>}
      </main>
    </div>
    {brief && <Briefing lesson={brief} close={() => setBrief(null)} start={(persona, mode, arcade) => { setRun({ id: crypto.randomUUID(), lesson: brief, persona, mode, arcade, moves: [] }); setBrief(null); }} />}
    {localSetup && <Modal title="Try local AI" close={() => setLocalSetup(false)} wide><LocalSetup start={(lesson, persona, mode, model, voice) => { setRun({ id: crypto.randomUUID(), lesson, persona, mode, arcade: false, moves: [], engine: 'local', model, voice }); setLocalSetup(false); setReview(null); }} /></Modal>}
    {guide && <Modal title="How Microtalks works" close={() => setGuide(false)}><div className="modal-symbol green"><BookOpen size={32} /></div><h2>One skill. A few real moments.</h2><p className="muted">You don’t need a script for being yourself.</p><ol className="guide-steps"><li><strong>Meet your target.</strong><p>Each lesson focuses on one conversational skill in a university setting.</p></li><li><strong>Give it a go.</strong><p>Type, speak, or use suggested replies. Listen for cues from your partner.</p></li><li><strong>Review your moves.</strong><p>See what worked, then replay a turning point. Several responses can be equally good.</p></li></ol><div className="info-box"><Info size={20} /><p>This prototype uses authored scenarios and approximate keyword feedback, not a live AI. Ratings are learning prompts, not judgments of you.</p></div><button className="button primary full-width" onClick={() => setGuide(false)}>Got it <Check size={18} /></button></Modal>}
    {settings && <Modal title="Preferences" close={() => setSettings(false)}><div className="modal-symbol green"><SlidersHorizontal size={30} /></div><h2>Your kind of practice.</h2><p className="muted">A few small choices to make this space yours.</p><label className="setting-row"><div><strong>Voice filler feedback</strong><p>Deduct 2 XP per detected filler, capped at 6 per move. Pauses are never penalised.</p></div><input type="checkbox" checked={fluency} onChange={e => setFluency(e.target.checked)} /></label><label className="setting-row"><div><strong>Dark appearance</strong><p>A softer screen for evening practice.</p></div><input type="checkbox" checked={theme === 'dark'} onChange={e => setTheme(e.target.checked ? 'dark' : 'light')} /></label><div className="info-box"><Info size={20} /><p>Progress and transcripts stay in this browser. Browser voice recognition may use your browser vendor’s service. Microtalks does not store audio.</p></div><button className="button primary full-width" onClick={() => setSettings(false)}>Done <Check size={18} /></button></Modal>}
  </div>;
}

function Briefing({ lesson, close, start }: { lesson: Lesson; close: () => void; start: (persona: PersonaId, mode: Mode, arcade: boolean) => void }) {
  const [persona, setPersona] = useState<PersonaId>(lesson.partner);
  const [mode, setMode] = useState<Mode>('text');
  const [arcade, setArcade] = useState(false);
  const Icon = icons[lesson.icon];
  return <Modal title={`Start ${lesson.title}`} close={close} wide><div className="brief-heading"><div className={`modal-symbol ${lesson.color}`}><Icon size={32} /></div><span className="small-pill"><Clock size={13} /> 3 minutes · 3 moves</span></div><h2>{lesson.title}</h2><p className="muted">{lesson.context}</p><div className="target-box"><Target size={24} /><div><span>Your target</span><strong>{lesson.target}</strong></div></div><h3 className="form-heading">Who are you talking to?</h3><div className="persona-options">{(Object.keys(people) as PersonaId[]).map(id => <button className={`persona-option ${persona === id ? 'selected' : ''}`} aria-pressed={persona === id} onClick={() => setPersona(id)} key={id}><Avatar id={id} /><strong>{people[id].name}</strong><small>{people[id].tag}</small>{persona === id && <CheckCircle className="selection-check" size={17} weight="fill" />}</button>)}</div><p className="persona-bio">{people[persona].bio}</p><h3 className="form-heading">How do you want to practise?</h3><div className="mode-options"><button className={mode === 'text' ? 'selected' : ''} aria-pressed={mode === 'text'} onClick={() => setMode('text')}><ChatCircle size={21} /><span>Text<small>Think it through</small></span></button><button className={mode === 'voice' ? 'selected' : ''} aria-pressed={mode === 'voice'} onClick={() => setMode('voice')}><Microphone size={21} /><span>Voice<small>Say it out loud</small></span></button></div><label className="arcade-option"><input type="checkbox" checked={arcade} onChange={e => setArcade(e.target.checked)} /><span>Arcade mode <small>See move ratings as you go</small></span><ChessKnight size={23} /></label><button className="button primary full-width" onClick={() => start(persona, mode, arcade)}>Let’s talk <ArrowRight size={20} /></button><p className="modal-footnote">No timer. No perfect answers. Just a little practice.</p></Modal>;
}

type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

function Conversation({ run, fluency, finish, exit }: { run: Run; fluency: boolean; finish: (moves: Move[]) => void; exit: () => void }) {
  const [moves, setMoves] = useState(run.moves);
  const [draft, setDraft] = useState('');
  const [source, setSource] = useState<Mode>('text');
  const [mode, setMode] = useState(run.mode);
  const [hint, setHint] = useState(false);
  const [suggestions, setSuggestions] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [sound, setSound] = useState(run.mode === 'voice');
  const [confirmExit, setConfirmExit] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const { lesson, persona } = run;
  const currentStep = lesson.steps[moves.length];
  const complete = moves.length === lesson.steps.length;
  const RecognitionApi = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
  const prompt = moves.length === 0 && persona === 'sam' ? `Hey. ${lesson.steps[0].prompt}` : currentStep?.prompt ?? '';
  const lastMove = moves.at(-1);
  const lines = dialogueLines(`${moves.length > run.moves.length ? lastMove?.reply ?? '' : ''} ${prompt}`);
  const currentLine = lines[lineIndex] ?? '';
  const ready = !thinking && lineIndex === lines.length - 1;
  const serious = lesson.id === 'room' && moves.length > 0 && !complete;

  useEffect(() => {
    if (!thinking) return;
    const timer = window.setTimeout(() => setThinking(false), 650);
    return () => window.clearTimeout(timer);
  }, [thinking]);
  useEffect(() => {
    if (thinking || confirmExit) return;
    if (!ready) continueRef.current?.focus({ preventScroll: true });
    else if (!complete && (lineIndex > 0 || moves.length > 0)) draftRef.current?.focus({ preventScroll: true });
  }, [thinking, ready, complete, lineIndex, moves.length, confirmExit]);
  useEffect(() => {
    setSpeaking(false);
    if (!sound || thinking || confirmExit || !currentLine || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(currentLine); utterance.rate = persona === 'sam' ? 0.93 : 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
    return () => { utterance.onstart = null; utterance.onend = null; utterance.onerror = null; window.speechSynthesis.cancel(); };
  }, [currentLine, thinking, sound, persona, confirmExit]);
  useEffect(() => () => { if (recognition.current) { recognition.current.onresult = null; recognition.current.onerror = null; recognition.current.onend = null; recognition.current.abort(); } if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  const stopRecording = () => { if (recognition.current) { recognition.current.onresult = null; recognition.current.onerror = null; recognition.current.onend = null; recognition.current.abort(); recognition.current = null; } setListening(false); };
  const send = (text = draft) => {
    if (!text.trim() || complete || listening || !ready) return;
    const move = evaluate(lesson, moves.length, text, persona, source, fluency, prompt);
    setMoves(m => [...m, move]); setDraft(''); setSource('text'); setHint(false); setSuggestions(false); setLineIndex(0); setThinking(true); setSpeaking(false);
  };
  const record = () => {
    if (listening) { recognition.current?.stop(); return; }
    if (!RecognitionApi) { setVoiceError('Voice input is not supported in this browser. Try Chrome, or continue with text.'); return; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setVoiceError('');
    const rec = new RecognitionApi(); recognition.current = rec;
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = true;
    rec.onresult = event => { const words = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(' '); setDraft(words.slice(0, 600)); setSource('voice'); };
    rec.onerror = event => { setListening(false); setVoiceError(event.error === 'not-allowed' ? 'Microphone access was denied. Allow it in browser settings, or type your reply below.' : event.error === 'no-speech' ? 'No speech was detected. Take your time, then try again or type below.' : `Voice input stopped (${event.error}). Try again or type your reply.`); };
    rec.onend = () => setListening(false);
    setListening(true);
    try { rec.start(); } catch { setListening(false); setVoiceError('Could not start the microphone. Try again or use text.'); }
  };
  return <div className="conversation-page character-led">
    <div className="conversation-top">
      <button className="text-button" onClick={() => { stopRecording(); setConfirmExit(true); }}><ArrowLeft size={18} /> Leave practice</button>
      <span>Move {Math.min(moves.length + 1, 3)} of 3</span>
      <button className="icon-button" disabled={!('speechSynthesis' in window)} onClick={() => setSound(v => !v)} aria-label={sound ? 'Mute partner voice' : 'Read partner replies aloud'}>{sound ? <SpeakerHigh size={22} /> : <SpeakerSlash size={22} />}</button>
    </div>
    <progress className="conversation-progress" value={moves.length} max={3} aria-label="Conversation progress" />
    <header className="lesson-intro"><span>{lesson.place}</span><h1>{lesson.title}</h1><p>{lesson.context}</p></header>
    <div className="lesson-target"><Target size={23} /><div><span>Your little mission</span><strong>{lesson.target}</strong></div><button className="icon-button" disabled={complete} onClick={() => setHint(v => !v)} aria-label="A little nudge" aria-expanded={hint}><Lightbulb size={23} /></button></div>
    {hint && currentStep && <div className="stage-hint" role="status"><Lightbulb size={19} />{currentStep.hint}</div>}
    <section className={`dialogue-stage ${lesson.color}`} aria-label={`Conversation with ${people[persona].name}`}>
      <CampusScene place={lesson.place} biome={biomeFor(lesson.id).id} />
      <div className="stage-person"><Character person={persona} mood={thinking ? 'thinking' : listening ? 'listening' : speaking ? 'speaking' : serious ? 'thoughtful' : complete ? 'happy' : moves.length === 0 && lesson.id === 'support' ? 'sad' : moves.length === 0 && lesson.id === 'deescalate' ? 'annoyed' : 'ready'} /><span className="character-name">{people[persona].name} the {people[persona].animal.toLowerCase()}<small>{people[persona].tag}</small></span></div>
      <div className="stage-dialogue">
        {lastMove && <div className="previous-reply"><span>You said</span><p>{lastMove.text}</p></div>}
        <div className="speech-bubble" key={`${moves.length}-${lineIndex}-${thinking}`} aria-live="polite" aria-atomic="true">
          <span className="speaker-label">{people[persona].name}</span>
          {thinking ? <><div className="thinking-dots" aria-hidden="true"><i /><i /><i /></div><span className="sr-only">{people[persona].name} is thinking.</span></> : <p className="spoken-line">{currentLine}</p>}
        </div>
        <div className="bubble-meta"><span>{thinking ? 'A moment to think…' : listening ? 'Go on, I’m listening.' : ready && !complete ? 'Your turn. Take your time.' : complete && ready ? 'A conversation worth showing up for.' : `${people[persona].name} has a little more to say…`}</span><div className="line-dots" aria-label={`Line ${lineIndex + 1} of ${lines.length}`}>{lines.map((_, i) => <i key={i} className={i <= lineIndex && !thinking ? 'revealed' : ''} />)}</div></div>
      </div>
    </section>
    {run.arcade && lastMove && !thinking && <div className="live-review stage-rating"><Badge rating={lastMove.rating} /><span>{lastMove.points} XP</span></div>}
    <div className="dialogue-controls" data-turn-ready={ready}>
      {!ready ? <div className="continue-row"><span><Ear size={21} /> A little listening goes a long way.</span><button ref={continueRef} className="button primary" disabled={thinking} onClick={() => setLineIndex(i => Math.min(i + 1, lines.length - 1))}>Continue <ArrowRight size={19} /></button></div> : complete ? <div className="finish-row"><div><CheckCircle size={29} weight="fill" /><span><strong>You showed up. That counts.</strong><small>Let’s take a look at your three moves.</small></span></div><button className="button primary" onClick={() => finish(moves)}>Review my moves <ChessKnight size={21} /></button></div> : <div className="chat-composer">
        <div className="composer-tools"><div className="input-mode"><button className={mode === 'text' ? 'selected' : ''} onClick={() => { stopRecording(); setMode('text'); }} aria-pressed={mode === 'text'}><ChatCircle size={18} /> Text</button><button className={mode === 'voice' ? 'selected' : ''} onClick={() => setMode('voice')} aria-pressed={mode === 'voice'}><Microphone size={18} /> Voice</button></div><button className="text-button" onClick={() => setSuggestions(v => !v)} aria-expanded={suggestions}>{suggestions ? 'Hide ideas' : 'Need an idea?'}<Lightbulb size={19} /></button></div>
        {suggestions && <div className="suggested-replies"><p>A starting point, if you need one. You can change the words.</p>{currentStep.choices.map((c, i) => <button key={c.text} onClick={() => { stopRecording(); setDraft(c.text); setSource('text'); setSuggestions(false); draftRef.current?.focus(); }}><span className="suggestion-number">{i + 1}</span>{c.text}<ArrowUpRight size={17} /></button>)}</div>}
        {mode === 'voice' && <div className="voice-controls"><button className={`record-button ${listening ? 'recording' : ''}`} onClick={record}><Microphone size={20} weight="fill" />{listening ? 'Finish recording' : 'Record your reply'}</button><small>{listening ? 'Listening… take your time.' : 'Review the transcript before sending.'}</small>{!RecognitionApi && <p className="inline-warning">Voice input isn’t supported here. Try Chrome or type below.</p>}</div>}
        {voiceError && <p className="inline-warning" role="alert">{voiceError}</p>}
        <label htmlFor="reply" className="composer-label">Your reply</label><div className="input-wrap"><textarea id="reply" ref={draftRef} value={draft} onChange={e => { setDraft(e.target.value); setSource('text'); }} maxLength={600} placeholder={`Say something to ${people[persona].name}…`} rows={2} disabled={listening} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} /><button className="send-button" disabled={!draft.trim() || listening} onClick={() => send()} aria-label="Send reply"><PaperPlaneTilt size={23} weight="fill" /></button></div><div className="composer-footer"><span>Enter to send · Shift + Enter for a new line</span><span>{draft.length}/600</span></div>
      </div>}
    </div>
    <details className="conversation-recap"><summary><ChatCircleDots size={18} /> Conversation so far <span>{moves.length} / 3 replies</span></summary><div className="recap-transcript" aria-label="Conversation transcript">{moves.length === 0 ? <p className="recap-empty">Your replies will appear here. For now, just say hello.</p> : moves.map((move, i) => <div key={i} className="exchange"><div className="message partner"><span>{people[persona].name}</span><p>{move.prompt}</p></div><div className="message you"><span>You</span><p>{move.text}</p></div>{(i < moves.length - 1 || ready) && <div className="message partner response"><span>{people[persona].name}</span><p>{move.reply}</p></div>}</div>)}</div></details>
    <p className="stage-disclosure">An illustrated practice scene · rule-based coaching.{mode === 'voice' && ' Voice transcripts can miss fillers; edited replies use text scoring.'}</p>
    {confirmExit && <Modal title="Leave practice?" close={() => setConfirmExit(false)}><h2>Take a breather?</h2><p className="muted">This unfinished attempt won’t be saved. You can start the lesson again whenever you’re ready.</p><div className="modal-actions"><button className="button secondary" onClick={exit}>Leave practice</button><button className="button primary" onClick={() => setConfirmExit(false)}>Keep going</button></div></Modal>}
  </div>;
}

function Review({ session, back, replay, next }: { session: Session; back: () => void; replay: (index: number) => void; next: () => void }) {
  const [selected, setSelected] = useState(() => { const index = session.moves.findIndex(m => m.rating === 'mistake' || m.rating === 'missed'); return index < 0 ? 0 : index; });
  const lesson = lessons.find(l => l.id === session.lessonId)!;
  const move = session.moves[selected];
  const local = session.engine === 'local' || Boolean(move.experimental);
  const live = session.moves.some(m => m.live);
  const endState = session.moves.at(-1)?.state;
  const endReasons = { none: 'Attempt finished', goodbye: 'A goodbye brought this conversation to a close', hostility: 'Your partner ended the conversation after a hostile exchange', natural: 'The conversation reached a natural ending', session_limit: 'The practice turn limit was reached' };
  const count = (r: Rating) => session.moves.filter(m => m.rating === r).length;
  return <div className="review-page">
    <button className="text-button" onClick={back}><ArrowLeft size={18} /> All conversations</button>
    <div className="review-heading"><div className="review-celebration"><Flag size={32} weight="duotone" /></div><div><div className="eyebrow">CONVERSATION COMPLETE</div><h1>There’s a little win in every try.</h1><p>{lesson.title} with {people[session.persona].name} the {people[session.persona].animal.toLowerCase()}{session.engine === 'local' ? ' · Local AI' : ''}</p>{endState && <p className="forest-end-reason">How it ended: {endReasons[endState.endReason]}.</p>}</div><div className="xp-earned"><Star size={24} weight="fill" /><strong>{session.xp}</strong><span>{session.engine === 'local' ? 'Participation XP' : 'XP this attempt'}</span></div></div>
    {session.engine === 'local' && <div className="local-review-note"><strong>Experimental AI coaching</strong><p>The model can misread a conversation. Ratings don’t affect your XP. Feedback without a matching evidence quote is left unrated.</p></div>}
    <div className="review-grid"><section className="panel move-list"><div className="rail-heading"><h2>Your moves</h2><ChessKnight size={22} /></div><p>Pick a moment to take a closer look.</p>{session.moves.map((m, i) => <button key={i} className={`move-list-item ${selected === i ? 'selected' : ''}`} onClick={() => setSelected(i)} aria-pressed={selected === i}><span className={`rating-symbol ${m.rating}`}>{ratings[m.rating].symbol}</span><div><small>Move {i + 1}</small><strong>{ratings[m.rating].label}</strong><p>{m.text}</p></div><ArrowRight size={16} /></button>)}<div className="review-counts">{(Object.keys(ratings) as Rating[]).filter(r => count(r)).map(r => <div key={r}><Badge rating={r} /><strong>{count(r)}</strong></div>)}</div></section>
    <section className="panel move-detail" aria-live="polite">
      <div className="detail-top"><span>Move {selected + 1} of {session.moves.length}</span><Badge rating={move.rating} /></div>
      <div className="review-quote"><span>{people[session.persona].name} said</span><p>“{move.prompt}”</p></div>
      <div className="review-quote your-quote"><span>You replied</span><p>“{move.text}”</p></div>
      <div className="review-quote"><span>{people[session.persona].name} responded</span><p>“{move.reply}”</p></div>
      <div className="feedback-block"><Lightbulb size={24} weight="duotone" /><div><h3>{local ? 'The experimental coach’s take' : move.rating === 'mistake' || move.rating === 'missed' || move.rating === 'blunder' ? 'Here’s the moment to notice.' : 'Here’s what worked.'}</h3><p>{move.why}</p></div></div>
      <div className="cue-note"><Ear size={20} /><div><strong>{local ? 'Quoted evidence' : 'The cue'}</strong><p>{local ? move.evidence || 'No verified evidence quote is available for this move.' : lesson.steps[selected]?.cue}</p></div></div>
      {move.delivery ? <section className="forest-delivery" aria-labelledby="delivery-title">
        <h3 id="delivery-title"><Microphone size={19} /> Voice delivery observations</h3>
        <p>Measured observations only, separate from conversational coaching. Pace and pitch do not diagnose emotions, confidence, or social ability.</p>
        <dl className="forest-metrics">
          <div><dt>Pace</dt><dd>{move.delivery.paceWpm === null ? 'Not reliably measured' : `${move.delivery.paceWpm} words/min`}</dd></div>
          <div><dt>Pitch range</dt><dd>{move.delivery.pitchSpanSemitones === null ? 'Not reliably measured' : `${move.delivery.pitchSpanSemitones} semitones`}</dd></div>
          <div><dt>Recording / voiced time</dt><dd>{move.delivery.durationSeconds.toFixed(1)}s / {move.delivery.voicedSeconds.toFixed(1)}s</dd></div>
          <div><dt>Detected fillers</dt><dd>{move.delivery.fillers}{move.delivery.fillerWords.length > 0 && ` · ${move.delivery.fillerWords.join(', ')}`}</dd></div>
        </dl>
        {move.delivery.notes.length > 0 && <ul>{move.delivery.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>}
        <p>{move.deduction ? `−${move.deduction} delivery XP applied.` : 'No delivery XP deduction.'}</p>
        <p className="fine-print">{move.delivery.caveat}</p>
      </section> : move.source === 'voice' && <div className="delivery-note"><Microphone size={18} /><p>{local ? 'Local voice transcript. Audio delivery measurements are not available for this move.' : `${move.fillers} transcript fillers detected · ${move.deduction ? `−${move.deduction} delivery XP` : 'No delivery deduction'}. Pauses weren’t scored.`}</p></div>}
      {Boolean(move.sources?.length) && <section className="forest-references"><h3>Coach references</h3><p>Reference notes retrieved for this feedback.</p><ul>{move.sources!.map(source => <li key={source.id}><a href={/^https?:\/\//i.test(source.url) ? source.url : undefined} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={15} /></a></li>)}</ul></section>}
      {live ? <button className="button secondary" onClick={next}>Start a new attempt <ArrowRight size={19} /></button> : <button className="button secondary" onClick={() => replay(selected)}><Repeat size={19} /> Replay from here</button>}
      <p className="fine-print">{local ? `Generated by ${session.model ?? 'the local model'} on your Mac. Matching evidence does not guarantee correct judgment.` : move.guided ? 'Authored feedback for a suggested reply.' : 'Approximate rule-based feedback for your reply.'} There are many good ways to respond. {live ? 'Live-voice attempts stay as recorded. A new attempt starts a fresh conversation.' : 'Replay updates this attempt.'}</p>
    </section></div>
    <div className="review-footer"><div><HandWaving size={25} /><div><strong>One tiny thing to try in real life</strong><p>{lesson.challenge}</p></div></div><button className="button primary" onClick={next}>Next conversation <ArrowRight size={18} /></button></div>
  </div>;
}
