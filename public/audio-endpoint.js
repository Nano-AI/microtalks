// Lightweight local voice-activity/pause detection. No audio leaves the worklet for detection.
// A sustained signal is required so a single click does not submit a turn.
export class AudioEndpointer {
  constructor(rate, silenceMs = 1600) {
    this.rate = rate;
    this.silence = rate * Math.max(1000, Math.min(3000, silenceMs)) / 1000;
    this.total = 0;
    this.candidate = 0;
    this.lastVoice = 0;
    this.started = false;
    this.done = false;
    this.floor = .002;
  }
  push(samples) {
    if (this.done || !samples.length) return null;
    let energy = 0;
    for (const value of samples) energy += value * value;
    const rms = Math.sqrt(energy / samples.length);
    this.total += samples.length;
    const voiced = rms > Math.max(.009, this.floor * 3.5);
    if (!voiced && rms < .012) this.floor = .98 * this.floor + .02 * rms;
    if (voiced) {
      this.lastVoice = this.total;
      this.candidate += samples.length;
      if (!this.started && this.candidate >= this.rate * .22) {
        this.started = true;
        return 'speech-start';
      }
    } else {
      this.candidate = Math.max(0, this.candidate - samples.length * 2);
    }
    if (this.started && this.total - this.lastVoice >= this.silence) {
      this.done = true;
      return 'speech-end';
    }
    if (!this.started && this.total >= this.rate * 20) {
      this.done = true;
      return 'idle';
    }
    return null;
  }
}
