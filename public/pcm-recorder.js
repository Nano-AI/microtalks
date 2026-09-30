import { AudioEndpointer } from './audio-endpoint.js';

class PCMRecorder extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = new Float32Array(2048);
    this.offset = 0;
    this.total = 0;
    this.recording = true;
    this.autoStop = options.processorOptions?.autoStop === true;
    this.endpoint = new AudioEndpointer(sampleRate, options.processorOptions?.silenceMs ?? 1600);
    this.port.onmessage = () => {
      this.recording = false;
      this.flush();
      this.port.postMessage({ type: 'flushed' });
    };
  }
  flush() {
    if (!this.offset) return;
    const samples = this.buffer.slice(0, this.offset);
    this.port.postMessage({ type: 'samples', samples }, [samples.buffer]);
    this.offset = 0;
  }
  process(inputs) {
    if (!this.recording) return true;
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      this.buffer[this.offset++] = sample;
      this.total++;
      if (this.offset === this.buffer.length) this.flush();
      if (this.total >= sampleRate * 45) {
        this.recording = false;
        this.flush();
        this.port.postMessage({ type: 'limit' });
        break;
      }
    }
    if (this.autoStop && this.recording) {
      const event = this.endpoint.push(input);
      if (event === 'speech-start') this.port.postMessage({ type: event });
      if (event === 'speech-end' || event === 'idle') {
        this.recording = false;
        this.flush();
        this.port.postMessage({ type: event });
      }
    }
    return true;
  }
}
registerProcessor('pcm-recorder', PCMRecorder);
