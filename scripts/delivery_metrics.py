"""Descriptive acoustic measurements, not an emotion/personality classifier."""
import io
import re
import wave


def measure_delivery(raw, transcript):
    import numpy as np
    with wave.open(io.BytesIO(raw)) as wav:
        rate = wav.getframerate()
        samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float32) / 32768
    size = int(rate * .04)
    frames = [samples[i:i + size] for i in range(0, len(samples) - size + 1, size)]
    levels = np.array([np.sqrt(np.mean(f * f)) for f in frames])
    active = np.where(levels > .009)[0]
    pitches = []
    window = np.hanning(size)
    for index in active:
        frame = (frames[index] - np.mean(frames[index])) * window
        spectrum = np.fft.rfft(frame, n=2048)
        correlation = np.fft.irfft(spectrum * spectrum.conj())
        low, high = int(rate / 350), int(rate / 75)
        lag = low + int(np.argmax(correlation[low:high]))
        if correlation[0] > 0 and correlation[lag] / correlation[0] > .45:
            pitches.append(rate / lag)
    words = re.findall(r"\b[\w’']+\b", transcript)
    fillers = re.findall(r'\b(?:um+|uh+|erm|hmm)\b', transcript, re.I)
    fillers += ['like'] * len(re.findall(r'(?:^|,)\s*like\s*,', transcript, re.I))
    duration = len(samples) / rate
    span = ((active[-1] - active[0] + 1) * .04) if len(active) else 0
    pace = round(len(words) / span * 60) if span >= 2 and len(words) >= 6 else None
    pitch_span = None
    if len(pitches) >= 35 and len(pitches) >= len(active) * .4:
        pitch_span = round(float(12 * np.log2(np.percentile(pitches, 90) / np.percentile(pitches, 10))), 1)
    notes = []
    if pitch_span is not None and pitch_span < 2.5:
        notes.append('Narrow pitch range in this recording. You could try emphasizing one important word; this does not tell us how you feel.')
    if pitch_span is not None and pitch_span > 12:
        notes.append('Wide pitch variation was measured. Consider whether that emphasis fits this moment; it is not proof of an emotion or a scoring penalty.')
    if pace is not None and pace > 200:
        notes.append('A quick speaking pace was measured. A short pause between ideas may make this easier to follow.')
    if pace is not None and pace < 80:
        notes.append('A measured pace with room between words. That can be appropriate; there is no pause penalty.')
    deduction = min(3, max(0, len(fillers) - 2)) if len(fillers) / max(len(words), 1) >= .08 else 0
    if deduction:
        notes.append('Several transcript fillers occurred close together. Try replacing one with a quiet pause.')
    return {'fillers': len(fillers), 'fillerWords': fillers, 'deduction': deduction, 'paceWpm': pace,
            'pitchSpanSemitones': pitch_span, 'durationSeconds': round(duration, 2),
            'voicedSeconds': round(len(active) * .04, 2), 'notes': notes,
            'caveat': 'Approximate measurements. ASR can omit fillers; pitch is not a measure of emotion. No tone-based deduction.'}
