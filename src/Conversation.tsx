import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChatCircle, CheckCircle, Cpu, Microphone, PaperPlaneTilt, Pause, SpeakerHigh, SpeakerSlash, Target } from '@phosphor-icons/react';
import { CampusScene, Character, type CharacterMood } from './Character';
import { biomeFor, dialogueLines, initialConversationState, isConversationState, LOCAL_MAX_TURNS, LOCAL_XP_PER_TURN, people, ratings, type CoachSource, type ConversationState, type Delivery, type Lesson, type Move, type PersonaId, type Rating } from './engine';
import { localRequest, startLocalRecording, type LocalRecorder } from './localApi';

type Mode = 'text' | 'voice';
type VoiceProfile = { description: string; voice: string; example: string; voices: { id: string; label: string }[] };
type Health = { ready: boolean; voice: boolean; transcription: boolean; voiceLoaded?: boolean; modelLoaded?: boolean; model?: string; personas?: Record<PersonaId, VoiceProfile> };
export type PracticeRun = { id: string; lesson: Lesson; persona: PersonaId; mode: Mode; moves: Move[]; model?: string; voice?: string };
const defaultVoices = { maya: 'bf_emma', leo: 'bm_fable', sam: 'bm_george' };
const expression: Record<ConversationState['mood'], CharacterMood> = { open: 'ready', playful: 'happy', reserved: 'thoughtful', guarded: 'thoughtful', annoyed: 'annoyed', sad: 'sad', calmer: 'ready' };
const moodLabels = { open: 'Open to a chat', playful: 'Warming up', reserved: 'Taking it slowly', guarded: 'A little guarded', annoyed: 'Frustrated', sad: 'Feeling low', calmer: 'A little calmer' };

export function LessonSetup({ lesson, start }: { lesson: Lesson; start: (persona: PersonaId, mode: Mode, model: string, voice: string) => void }) {
  const [persona, setPersona] = useState<PersonaId>(lesson.partner);
  const [mode, setMode] = useState<Mode>('text');
  const [health, setHealth] = useState<Health | null>(null);
  const [status, setStatus] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [retry, setRetry] = useState(0);
  const [voice, setVoice] = useState('');
  const [previewStatus, setPreviewStatus] = useState('');
  const preview = useRef<{ controller: AbortController; audio?: HTMLAudioElement; url?: string } | null>(null);
  const selectedVoice = voice || health?.personas?.[persona]?.voice || defaultVoices[persona];
  const stopPreview = () => { preview.current?.controller.abort(); preview.current?.audio?.pause(); if (preview.current?.url) URL.revokeObjectURL(preview.current.url); preview.current = null; };
  useEffect(() => {
    const controller = new AbortController(); setStatus('checking');
    localRequest<Health>('health', undefined, controller.signal).then(s => { setHealth(s); setStatus(s.ready ? 'ready' : 'offline'); }).catch(() => { if (!controller.signal.aborted) setStatus('offline'); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => { setPreviewStatus(''); return stopPreview; }, [persona, selectedVoice]);
  async function hearVoice() {
    stopPreview(); setPreviewStatus('Preparing a voice sample…');
    const current = { controller: new AbortController() } as NonNullable<typeof preview.current>; preview.current = current;
    try {
      const blob = await localRequest<Blob>('speech', { persona, voice: selectedVoice, text: health?.personas?.[persona]?.example ?? 'Hello there. It’s nice to meet you.' }, current.controller.signal);
      if (current.controller.signal.aborted) return;
      current.url = URL.createObjectURL(blob); current.audio = new Audio(current.url);
      current.audio.onended = () => setPreviewStatus('Sample finished. Pick the voice you prefer.');
      await current.audio.play(); setPreviewStatus('Playing voice sample…');
    } catch (error) { if (!current.controller.signal.aborted) setPreviewStatus(error instanceof Error ? error.message : 'Could not play the sample.'); }
  }
  const voiceAvailable = Boolean(health?.voice && health.transcription);
  return <div className="local-setup lesson-setup" data-lesson-id={lesson.id}><div className="brief-heading"><div className={`modal-symbol ${lesson.color}`}><Target size={32} /></div><span className="small-pill">{biomeFor(lesson.id).name} · AI-powered lesson</span></div><h2>{lesson.title}</h2><p className="muted">{lesson.context}</p>
    <div className="target-box"><Target size={24} /><div><span>Your target</span><strong>{lesson.target}</strong></div></div>
    <div className={`local-status ${status}`} role="status"><span />{status === 'ready' ? 'SSD models connected' : status === 'checking' ? 'Checking your local models…' : 'Local service is offline'}</div>
    {status === 'ready' && <p className="model-readiness">Qwen: {health?.modelLoaded ? 'loaded' : 'loads on first reply'} · Kokoro: {health?.voiceLoaded ? 'loaded' : 'loads on first preview'} · Whisper: on demand</p>}
    {status === 'offline' && <div className="info-box"><p>Keep Extreme SSD connected and run <code>bash scripts/start-local-web.sh</code>. <button className="text-button" onClick={() => setRetry(n => n + 1)}>Check again</button></p></div>}
    <h3 className="form-heading">Who are you meeting?</h3>
    <div className="persona-options">{(Object.keys(people) as PersonaId[]).map(id => <button key={id} className={`persona-option ${persona === id ? 'selected' : ''}`} aria-pressed={persona === id} onClick={() => { setPersona(id); setVoice(''); }}><div className={`avatar ${people[id].color}`}><Character person={id} portrait /></div><strong>{people[id].name} <small>the {people[id].animal.toLowerCase()}</small></strong><small>{people[id].tag}</small></button>)}</div>
    <p className="persona-bio">{people[persona].bio}</p>
    <div className="voice-audition"><label className="local-field">Character voice<select value={selectedVoice} onChange={e => setVoice(e.target.value)}>{(health?.personas?.[persona]?.voices ?? [{ id: defaultVoices[persona], label: 'British voice' }]).map(v => <option value={v.id} key={v.id}>{v.label}</option>)}</select></label><button className="button secondary" disabled={status !== 'ready' || !health?.voice} onClick={() => void hearVoice()}><SpeakerHigh size={19} /> Hear {people[persona].name}</button></div><p className="voice-preview-status" role="status">{previewStatus}</p>
    <h3 className="form-heading">How would you like to practise?</h3><div className="mode-options"><button className={mode === 'text' ? 'selected' : ''} onClick={() => setMode('text')} aria-pressed={mode === 'text'}><ChatCircle size={21} /><span>Text<small>Type your response</small></span></button><button className={mode === 'voice' ? 'selected' : ''} disabled={!voiceAvailable} onClick={() => setMode('voice')} aria-pressed={mode === 'voice'}><Microphone size={21} /><span>Voice<small>Whisper + Kokoro</small></span></button></div>
    {status === 'ready' && !voiceAvailable && <p className="inline-warning">Speech models are unavailable. You can still practise this lesson with AI using text.</p>}
    <p className="local-explanation">Up to {LOCAL_MAX_TURNS} exchanges, or a natural earlier ending. Start Live practice inside the scene for hands-free, uneditable speech. Ratings appear after each reply.</p>
    <button className="button primary full-width" disabled={status !== 'ready' || (mode === 'voice' && !voiceAvailable)} onClick={() => { stopPreview(); start(persona, mode, health?.model ?? 'Local model', selectedVoice); }}>Start lesson <ArrowRight size={18} /></button>
  </div>;
}

function messagesFor(opening: string, moves: Move[], reply: string) {
  return [{ role: 'assistant', content: opening }, ...moves.flatMap(m => [{ role: 'user', content: m.text }, { role: 'assistant', content: m.reply }]), { role: 'user', content: reply }];
}

export function Conversation({ run, finish: finishRun, exit }: { run: PracticeRun; finish: (moves: Move[], model?: string) => void; exit: () => void }) {
  const { lesson, persona } = run; const opening = lesson.steps[0].prompt;
  const voice = run.voice ?? defaultVoices[persona];
  const [moves, setMoves] = useState(run.moves);
  const [lineIndex, setLineIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState(run.mode);
  const [source, setSource] = useState<Mode>('text');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(run.mode === 'voice');
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceRetry, setVoiceRetry] = useState(0);
  const [recording, setRecording] = useState(false);
  const [arming, setArming] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [grading, setGrading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [activeModel, setActiveModel] = useState(run.model ?? 'Local model');
  const [pendingGrades, setPendingGrades] = useState<number[]>([]);
  const [handsFree, setHandsFree] = useState(false);
  const [silenceMs, setSilenceMs] = useState(1600);
  const [heardSpeech, setHeardSpeech] = useState(false);
  const [lockedDraft, setLockedDraft] = useState(false);
  const [draftDelivery, setDraftDelivery] = useState<Delivery | undefined>();
  const [stopped, setStopped] = useState(false);
  const gradeJobs = useRef(new Map<number, Promise<Move>>());
  const lifecycle = useRef(new AbortController());
  const capture = useRef(new AbortController());
  const captureId = useRef(0);
  const recorder = useRef<LocalRecorder | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const speechRequest = useRef<AbortController | null>(null);
  const sending = useRef(false);
  const pendingRecording = useRef(false);
  const automatic = useRef(false);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const state = moves.at(-1)?.state ?? initialConversationState(persona, lesson.id);
  const prompt = moves.at(-1)?.reply ?? opening;
  const lines = dialogueLines(prompt);
  const line = lines[lineIndex] ?? prompt;
  const complete = state.ended || stopped || moves.length >= LOCAL_MAX_TURNS;
  const ready = lineIndex === lines.length - 1 && !busy;
  const speechText = handsFree ? prompt : line;
  const live = useRef({ complete, mode, lines, lineIndex, ready, busy });
  live.current = { complete, mode, lines, lineIndex, ready, busy };
  const actions = useRef<{ record: (auto: boolean) => void; stop: (auto: boolean) => void }>({ record: () => {}, stop: () => {} });

  function cancelCapture() {
    captureId.current++; capture.current.abort(); recorder.current?.cancel(); recorder.current = null;
    setRecording(false); setArming(false); setTranscribing(false); pendingRecording.current = false;
  }
  function pauseLive() {
    automatic.current = false; setHandsFree(false); setSound(false);
    if (turnTimer.current) clearTimeout(turnTimer.current);
    cancelCapture(); speechRequest.current?.abort(); audio.current?.pause(); setSpeaking(false); setVoiceLoading(false);
    setDraft(''); setDraftDelivery(undefined); setLockedDraft(false);
  }
  function finish(completed: Move[]) {
    pauseLive();
    finishRun(completed.map(move => move.why === 'Reviewing this response…' ? { ...move, rating: 'unrated' as const, why: 'Saved before live coaching finished. This move is left unrated.' } : move), activeModel);
  }
  useEffect(() => {
    lifecycle.current = new AbortController();
    return () => { lifecycle.current.abort(); capture.current.abort(); recorder.current?.cancel(); audio.current?.pause(); if (turnTimer.current) clearTimeout(turnTimer.current); };
  }, []);
  useEffect(() => {
    if (busy || handsFree) return;
    if (!ready) next.current?.focus({ preventScroll: true });
    else if (!complete && mode === 'text' && (lineIndex > 0 || moves.length > 0)) input.current?.focus({ preventScroll: true });
  }, [ready, busy, complete, lineIndex, moves.length, handsFree, mode]);
  useEffect(() => {
    const controller = new AbortController(); speechRequest.current = controller;
    let url: string | null = null; let player: HTMLAudioElement | null = null;
    setSpeaking(false); setVoiceLoading(false);
    if (sound && !busy && !recording && !transcribing && !grading) {
      setVoiceLoading(true); setVoiceError('');
      localRequest<Blob>('speech', { persona, voice, text: speechText }, controller.signal).then(async blob => {
        if (controller.signal.aborted) return;
        if (blob.size < 100) throw new Error('The voice service returned empty audio.');
        url = URL.createObjectURL(blob); player = new Audio(url); audio.current = player;
        player.onplay = () => setSpeaking(true);
        player.ontimeupdate = () => {
          if (!automatic.current || !player || !Number.isFinite(player.duration)) return;
          const current = live.current; const total = current.lines.join(' ').length;
          let cumulative = 0; let index = 0;
          for (let i = 0; i < current.lines.length; i++) { cumulative += current.lines[i].length + 1; if (player.currentTime / player.duration * total >= cumulative) index = Math.min(i + 1, current.lines.length - 1); }
          setLineIndex(index);
        };
        player.onended = () => {
          setSpeaking(false);
          if (!automatic.current) return;
          setLineIndex(live.current.lines.length - 1);
          if (live.current.complete) { automatic.current = false; setHandsFree(false); setSound(false); return; }
          turnTimer.current = setTimeout(() => { if (automatic.current && !live.current.complete) actions.current.record(true); }, 250);
        };
        player.onerror = () => { setVoiceError('Audio playback failed. Choose Play voice again, or switch to text.'); automatic.current = false; setHandsFree(false); setSound(false); setSpeaking(false); };
        setVoiceLoading(false); await player.play();
      }).catch(err => {
        if (!controller.signal.aborted) { setVoiceLoading(false); setVoiceError(err instanceof Error ? err.message : 'Could not play local voice.'); automatic.current = false; setHandsFree(false); setSound(false); }
      });
    }
    return () => { controller.abort(); if (player) { player.onplay = null; player.onended = null; player.onerror = null; player.ontimeupdate = null; player.pause(); if (audio.current === player) audio.current = null; } if (url) URL.revokeObjectURL(url); };
  }, [speechText, sound, busy, grading, persona, voice, voiceRetry, handsFree]);

  async function send(value = draft, origin = source, isLive = lockedDraft, delivery = draftDelivery) {
    if (!value.trim() || complete || sending.current || (!isLive && (!ready || recording || transcribing || arming))) return;
    sending.current = true; setBusy(true); setError(''); setSpeaking(false); audio.current?.pause();
    const clean = value.trim(); const index = moves.length;
    try {
      const response = await localRequest<{ reply: string; model: string; state: ConversationState }>('turn', { persona, lessonId: lesson.id, context: lesson.context, target: lesson.target, state, messages: messagesFor(opening, moves, clean) }, lifecycle.current.signal);
      if (lifecycle.current.signal.aborted) return;
      if (!response.reply?.trim() || !isConversationState(response.state)) throw new Error('The character returned an incomplete reply. Your words are kept; retry this turn.');
      setActiveModel(response.model);
      const deduction = isLive && delivery ? Math.min(3, delivery.deduction) : 0;
      const move: Move = { text: clean, prompt, reply: response.reply, state: response.state, rating: 'unrated', why: 'Reviewing this response…', points: LOCAL_XP_PER_TURN - deduction, fillers: delivery?.fillers ?? 0, deduction, source: origin, guided: false, experimental: true, delivery, live: isLive };
      setMoves(m => [...m, move]); setPendingGrades(p => [...p, index]);
      const job = localRequest<{ rating: Rating; reason: string; evidence: string; sources?: CoachSource[] }>('grade', { lessonId: lesson.id, target: lesson.target, messages: messagesFor(opening, moves, clean) }, lifecycle.current.signal)
        .then(result => ({ ...move, rating: result.rating, why: result.reason, evidence: result.evidence, sources: result.sources }))
        .catch((): Move => ({ ...move, rating: 'unrated', why: 'The local coach could not review this move. Your attempt still counts.' }))
        .then(reviewed => { if (!lifecycle.current.signal.aborted) { setMoves(current => current.map((m, i) => i === index ? reviewed : m)); setPendingGrades(p => p.filter(i => i !== index)); } return reviewed; });
      gradeJobs.current.set(index, job);
      setLineIndex(0); setDraft(''); setSource('text'); setLockedDraft(false); setDraftDelivery(undefined); setShowHint(false);
    } catch (err) { if (!lifecycle.current.signal.aborted) { pauseLive(); setDraft(clean); setLockedDraft(isLive); setError(err instanceof Error ? err.message : 'Could not generate a reply.'); } }
    finally { sending.current = false; if (!lifecycle.current.signal.aborted) setBusy(false); }
  }

  async function stopRecording(auto = automatic.current) {
    const active = recorder.current; if (!active) return;
    const id = captureId.current; const signal = capture.current.signal;
    recorder.current = null; setRecording(false); setTranscribing(true);
    try {
      const encoded = await active.stop();
      const response = await localRequest<{ text: string; truncated: boolean; delivery?: Delivery }>('transcribe', { audio: encoded }, signal);
      if (signal.aborted || id !== captureId.current || lifecycle.current.signal.aborted) return;
      setDraft(response.text); setSource('voice'); setDraftDelivery(response.delivery); setLockedDraft(auto);
      if (response.truncated) { pauseLive(); setError('The transcript exceeded 600 characters. It has not been submitted. Please record a shorter turn.'); return; }
      if (auto && automatic.current) await send(response.text, 'voice', true, response.delivery);
    } catch (err) { if (!signal.aborted && !lifecycle.current.signal.aborted) { pauseLive(); setError(err instanceof Error ? err.message : 'Transcription failed. Try again or switch to text.'); } }
    finally { if (id === captureId.current && !lifecycle.current.signal.aborted) setTranscribing(false); }
  }

  async function record(auto = false) {
    if (recorder.current) return stopRecording(auto);
    if (pendingRecording.current || live.current.complete || sending.current) return;
    capture.current.abort(); capture.current = new AbortController();
    const signal = capture.current.signal; const id = ++captureId.current;
    pendingRecording.current = true; setArming(true); setError(''); setHeardSpeech(false); setDraft(''); setLockedDraft(auto);
    speechRequest.current?.abort(); audio.current?.pause(); setSpeaking(false); setVoiceLoading(false);
    try {
      const active = await startLocalRecording(signal, reason => {
        if (signal.aborted || id !== captureId.current) return;
        if (reason === 'idle') { pauseLive(); setError('No speech detected. Live practice is paused; resume when you’re ready.'); }
        else actions.current.stop(auto);
      }, {
        autoStop: auto, silenceMs, onSpeech: () => setHeardSpeech(true),
        onPreview: async encoded => {
          const response = await localRequest<{ text: string }>('transcribe', { audio: encoded, preview: true }, signal);
          if (!signal.aborted && id === captureId.current && recorder.current) { setDraft(response.text); setSource('voice'); }
        },
      });
      if (signal.aborted || id !== captureId.current || live.current.mode !== 'voice') { active.cancel(); return; }
      recorder.current = active; setRecording(true);
    } catch (err) { if (!signal.aborted && !lifecycle.current.signal.aborted) { pauseLive(); setError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in browser settings, or switch to text.' : err instanceof Error ? err.message : 'Could not start recording.'); } }
    finally { if (id === captureId.current && !lifecycle.current.signal.aborted) { pendingRecording.current = false; setArming(false); } }
  }
  actions.current = { record: auto => { void record(auto); }, stop: auto => { void stopRecording(auto); } };

  function startLive() {
    if (complete || busy) return;
    cancelCapture(); setMode('voice'); setDraft(''); setLockedDraft(true); setError('');
    automatic.current = true; setHandsFree(true); setSound(true); setVoiceRetry(n => n + 1);
  }
  async function review() {
    if (sending.current || !moves.length) return;
    sending.current = true; pauseLive(); setGrading(true);
    const reviewed = await Promise.all(moves.map((move, i) => gradeJobs.current.get(i) ?? Promise.resolve(move)));
    if (!lifecycle.current.signal.aborted) finish(reviewed);
  }
  const xp = moves.reduce((sum, move) => sum + move.points, 0);
  const endTitle = state.endReason === 'hostility' ? `${people[persona].name} chose to leave.` : state.endReason === 'goodbye' ? 'You wrapped things up.' : 'A good place to stop.';

  return <div className="conversation-page character-led local-conversation">
    <div className="conversation-top"><button className="text-button" onClick={() => { if (window.confirm('Leave this unfinished conversation?')) { pauseLive(); exit(); } }}><ArrowLeft size={18} /> Leave practice</button><span>Move {Math.min(moves.length + 1, LOCAL_MAX_TURNS)} · up to {LOCAL_MAX_TURNS}</span><button className="icon-button" onClick={() => { if (handsFree) pauseLive(); else setSound(v => !v); }} aria-label={sound ? 'Mute Kokoro voice' : 'Enable Kokoro voice'}>{sound ? <SpeakerHigh size={22} /> : <SpeakerSlash size={22} />}</button></div>
    <progress className="conversation-progress" value={moves.length} max={LOCAL_MAX_TURNS} aria-label="Conversation progress" />
    <header className="lesson-intro"><span className="local-chip"><Cpu size={15} /> AI practice · {activeModel}</span><h1>{lesson.title}</h1><p>{biomeFor(lesson.id).name} · {lesson.context}</p></header>
    <div className="lesson-target"><Target size={23} /><div><span>Your little mission</span><strong>{lesson.target}</strong></div></div>
    {mode === 'voice' && !complete && <section className={`live-voice-bar ${handsFree ? 'enabled' : ''}`} aria-label="Live voice controls"><div><strong>{handsFree ? recording ? heardSpeech ? 'Listening to you…' : 'Your turn. I’m listening.' : transcribing ? 'Recognizing your words…' : busy ? 'Thinking…' : 'Partner’s turn' : 'Live practice'}</strong><small>{handsFree ? 'Speech submits automatically. Your words can’t be edited.' : 'Listen, speak, pause. No send button needed.'}</small></div><button className="button secondary" disabled={busy || grading} onClick={handsFree ? pauseLive : startLive}>{handsFree ? <><Pause size={18} /> Pause live</> : <><Microphone size={18} /> Start live practice</>}</button><label>Pause to send<select value={silenceMs} disabled={handsFree} onChange={e => setSilenceMs(Number(e.target.value))}><option value={1200}>1.2 seconds</option><option value={1600}>1.6 seconds</option><option value={2400}>2.4 seconds</option></select></label></section>}
    <section className={`dialogue-stage ${lesson.color}`} aria-label={`Local conversation with ${people[persona].name}`}><CampusScene place={lesson.place} biome={biomeFor(lesson.id).id} /><div className="stage-person"><Character person={persona} mood={busy ? 'thinking' : recording ? 'listening' : expression[state.mood]} talking={speaking} /><span className="character-name">{people[persona].name} the {people[persona].animal.toLowerCase()}<small>{moodLabels[state.mood]}</small></span></div><div className="stage-dialogue">{moves.at(-1) && <div className="previous-reply"><span>You said{moves.at(-1)!.live ? ' · live' : ''}</span><p>{moves.at(-1)!.text}</p></div>}<div className="speech-bubble" aria-live="polite"><span className="speaker-label">{people[persona].name}</span>{busy ? <><div className="thinking-dots" aria-hidden="true"><i /><i /><i /></div><span className="sr-only">Generating a local reply.</span></> : <p className="spoken-line">{line}</p>}</div><div className="bubble-meta"><span>{busy ? 'Thinking on your Mac…' : recording ? 'Listening. Take your time.' : voiceLoading ? 'Preparing the character’s voice…' : complete ? state.endReason === 'hostility' ? 'The conversation has ended.' : 'A natural ending counts, too.' : ready ? 'Your turn.' : handsFree ? 'Listening to the whole reply…' : 'A little more to say…'}</span></div></div></section>
    {voiceError && <div className="local-error" role="status">{voiceError}<button className="text-button" onClick={() => { setSound(true); setVoiceRetry(n => n + 1); }}>Play voice again</button></div>}
    {moves.length > 0 && <section className={`live-move-coach ${moves.at(-1)!.rating}`} aria-live="polite" aria-label="Your response rating"><div className="live-coach-heading"><span>Move {moves.length} · your response</span><small>Experimental coach</small></div>{pendingGrades.includes(moves.length - 1) ? <div className="live-coach-pending"><span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span><strong>Reviewing your response…</strong><p>You can keep talking while the coach checks this move.</p></div> : <><div className="live-coach-rating"><span className={`rating-symbol ${moves.at(-1)!.rating}`}>{ratings[moves.at(-1)!.rating].symbol}</span><strong>{ratings[moves.at(-1)!.rating].label}</strong><span>+{moves.at(-1)!.points} XP</span></div><p>{moves.at(-1)!.why}</p>{moves.at(-1)!.evidence && <blockquote>“{moves.at(-1)!.evidence}”</blockquote>}</>}{moves.at(-1)!.delivery && <details className="delivery-details"><summary>Voice delivery · {moves.at(-1)!.fillers} detected fillers{moves.at(-1)!.deduction ? ` · −${moves.at(-1)!.deduction} XP` : ''}</summary><p>{moves.at(-1)!.delivery!.paceWpm ?? 'Not enough speech to estimate'} words/min · pitch range {moves.at(-1)!.delivery!.pitchSpanSemitones ?? 'not reliably measured'}</p>{moves.at(-1)!.delivery!.notes.map(note => <p key={note}>{note}</p>)}<small>{moves.at(-1)!.delivery!.caveat}</small></details>}{Boolean(moves.at(-1)!.sources?.length) && <details className="coach-sources"><summary>Coach reference notes</summary>{moves.at(-1)!.sources!.map(s => <a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</details>}</section>}
    <div className="dialogue-controls" data-turn-ready={ready}>
      {busy ? <div className="continue-row" role="status"><span>Generating a reply using your SSD model…</span></div> : !ready && !handsFree ? <div className="continue-row"><span>One thought at a time.</span><button ref={next} className="button primary" onClick={() => setLineIndex(i => i + 1)}>Continue <ArrowRight size={19} /></button></div> : complete && ready ? <div className="local-finish"><div><CheckCircle size={28} /><strong>{endTitle} {xp} XP earned.</strong></div><p>{state.endReason === 'hostility' ? 'Direct insults can end an interaction. Try a different approach in a new conversation.' : 'A short, respectful conversation can be a success.'}</p><button className="button primary" disabled={grading} onClick={() => void review()}>{grading ? 'Finishing move reviews…' : 'Review my moves'} <ArrowRight size={18} /></button><button className="text-button" disabled={grading} onClick={() => finish(moves)}>Save now</button></div> : <div className="chat-composer">
        <div className="composer-tools"><div className="input-mode"><button className={mode === 'text' ? 'selected' : ''} onClick={() => { pauseLive(); setMode('text'); setDraft(''); setLockedDraft(false); setDraftDelivery(undefined); }} disabled={arming} aria-pressed={mode === 'text'}><ChatCircle size={18} /> Text</button><button className={mode === 'voice' ? 'selected' : ''} onClick={() => setMode('voice')} disabled={arming} aria-pressed={mode === 'voice'}><Microphone size={18} /> Voice</button></div><button className="text-button" onClick={() => setShowHint(v => !v)}>A little nudge</button></div>
        {showHint && <p className="stage-hint">{lesson.id === 'deescalate' ? 'Acknowledge the actual problem without accepting blame or matching the anger. You can hold a boundary too.' : lesson.id === 'support' ? 'Acknowledge the feeling. Ask whether they want listening, company, advice, or space.' : 'Pick up on one detail. Share a little or ask a relevant follow-up. Respect an exit cue.'}</p>}
        {mode === 'voice' && <div className="voice-controls"><button className={`record-button ${recording ? 'recording' : ''}`} disabled={transcribing || arming || !ready} onClick={() => { if (recording) void stopRecording(automatic.current); else void record(handsFree); }}><Microphone size={20} />{arming ? 'Opening microphone…' : transcribing ? 'Whisper is transcribing…' : recording ? 'Finish recording' : 'Record your reply'}</button><small>{handsFree ? 'Auto-send after your pause · 45-second turn limit' : 'Read-only transcript · use Live practice for auto-submit'}</small></div>}
        <label htmlFor="local-reply" className="composer-label">{mode === 'voice' || lockedDraft ? 'Live transcript' : 'Your reply'}</label><div className="input-wrap"><textarea id="local-reply" aria-label="Your reply" ref={input} value={draft} maxLength={600} rows={2} placeholder={recording ? 'Your words appear as Whisper recognizes them…' : `Say something to ${people[persona].name}…`} readOnly={mode === 'voice' || lockedDraft} disabled={arming} onChange={e => { setDraft(e.target.value); setSource('text'); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !handsFree) { e.preventDefault(); void send(); } }} />{!handsFree && <button className="send-button" aria-label="Send reply" disabled={!draft.trim() || recording || transcribing || arming || !ready} onClick={() => void send()}><PaperPlaneTilt size={23} weight="fill" /></button>}</div><div className="composer-footer"><span>{handsFree ? 'Live transcript may correct its own recognition; your submitted words cannot be edited.' : 'Voice delivery and conversational choices are reviewed separately.'}</span><span>{draft.length}/600</span></div>
        {moves.length > 0 && !recording && !transcribing && <button className="text-button end-session" onClick={() => { pauseLive(); setStopped(true); setLineIndex(lines.length - 1); }}>Finish this session</button>}
      </div>}
    </div>
    {error && <div className="local-error" role="alert">{error}</div>}
    <details className="conversation-recap"><summary><ChatCircle size={18} /> Conversation so far <span>{moves.length} replies</span></summary><div className="recap-transcript"><div className="message partner"><span>{people[persona].name}</span><p>{opening}</p></div>{moves.map((m, i) => <div key={i}><div className="message you"><span>You{m.live ? ' · live' : ''}</span><p>{m.text}</p></div><div className="recap-move-rating"><span className={`rating-symbol ${m.rating}`}>{pendingGrades.includes(i) ? '…' : ratings[m.rating].symbol}</span><strong>{pendingGrades.includes(i) ? 'Reviewing…' : ratings[m.rating].label}</strong></div><div className="message partner"><span>{people[persona].name}</span><p>{m.reply}</p></div></div>)}</div></details>
    <details className="session-memory"><summary>What’s remembered in this scene?</summary><p>The full conversation so far is sent with each turn. These selected quotes help preserve personal details; memory starts fresh in a new session.</p>{state.memories.length ? <ul>{state.memories.map((m, i) => <li key={i}><strong>{m.speaker === 'learner' ? 'You' : people[persona].name}:</strong> “{m.quote}”</li>)}</ul> : <p>No personal detail has been saved yet.</p>}</details>
    <p className="stage-disclosure">Fictional animal characters · Qwen + Whisper + Kokoro on this Mac. Completed transcripts stay in this browser. Temporary recordings are deleted after transcription.</p>
  </div>;
}
