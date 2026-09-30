export async function localRequest<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = window.setTimeout(cancel, 100_000);
  try {
    const response = await fetch(`/api/local/${path}`, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? 'Local AI is unavailable. Start scripts/start-local-web.sh and retry.');
    }
    return (path === 'speech' ? await response.blob() : await response.json()) as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw new Error('The local model took too long. Check the SSD connection and retry.');
    throw error instanceof Error ? error : new Error('Could not reach local AI.');
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
}

export type LocalRecorder = { stop: () => Promise<string>; cancel: () => void };
type RecorderOptions = { autoStop?: boolean; silenceMs?: number; onSpeech?: () => void; onPreview?: (audio: string) => Promise<void> };

async function encodeAudio(chunks: Float32Array[], rate: number): Promise<string> {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (length < rate * .2) throw new Error('That recording was too short. Try speaking for a little longer.');
  const pcm = new Float32Array(length); let offset = 0;
  for (const chunk of chunks) { pcm.set(chunk, offset); offset += chunk.length; }
  const offline = new OfflineAudioContext(1, Math.min(Math.round(length * 16000 / rate), 45 * 16000), 16000);
  const input = offline.createBuffer(1, length, rate); input.copyToChannel(pcm, 0);
  const source = offline.createBufferSource(); source.buffer = input; source.connect(offline.destination); source.start();
  const samples = (await offline.startRendering()).getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2); const view = new DataView(buffer);
  const ascii = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); ascii(8, 'WAVE'); ascii(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767), true));
  const bytes = new Uint8Array(buffer); let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export async function startLocalRecording(signal: AbortSignal, onLimit: (reason: 'limit' | 'silence' | 'idle') => void, options: RecorderOptions = {}): Promise<LocalRecorder> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone recording requires localhost or HTTPS. You can still type.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  if (signal.aborted) { stream.getTracks().forEach(t => t.stop()); throw new DOMException('Cancelled', 'AbortError'); }
  const context = new AudioContext();
  let closed = false;
  const cancel = () => { if (closed) return; closed = true; stream.getTracks().forEach(t => t.stop()); void context.close(); signal.removeEventListener('abort', cancel); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    await context.audioWorklet.addModule('/pcm-recorder.js');
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const node = new AudioWorkletNode(context, 'pcm-recorder', { processorOptions: { autoStop: options.autoStop ?? false, silenceMs: options.silenceMs ?? 1600 } });
    const mute = context.createGain(); mute.gain.value = 0;
    context.createMediaStreamSource(stream).connect(node).connect(mute).connect(context.destination);
    const chunks: Float32Array[] = [];
    let frames = 0; let lastPreview = 0; let previewBusy = false;
    let flushed: (() => void) | null = null;
    node.port.onmessage = event => {
      if (event.data.type === 'samples') {
        chunks.push(event.data.samples); frames += event.data.samples.length;
        if (options.onPreview && !previewBusy && !closed && frames - lastPreview >= context.sampleRate * 2.4) {
          lastPreview = frames; previewBusy = true;
          void encodeAudio([...chunks], context.sampleRate).then(audio => !closed ? options.onPreview!(audio) : undefined).catch(() => {}).finally(() => { previewBusy = false; });
        }
      }
      if (event.data.type === 'flushed') flushed?.();
      if (event.data.type === 'limit') onLimit('limit');
      if (event.data.type === 'speech-end') onLimit('silence');
      if (event.data.type === 'idle') onLimit('idle');
      if (event.data.type === 'speech-start') options.onSpeech?.();
    };
    await context.resume();
    return { cancel, stop: async () => {
      if (closed) throw new Error('Recording has ended. Try again.');
      await new Promise<void>(resolve => { const timer = setTimeout(resolve, 300); flushed = () => { clearTimeout(timer); resolve(); }; node.port.postMessage('stop'); });
      const rate = context.sampleRate;
      cancel();
      return encodeAudio(chunks, rate);
    } };
  } catch (error) { cancel(); throw error; }
}
