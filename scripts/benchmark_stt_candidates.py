#!/usr/bin/env python3
"""Optional, sequential Whisper.cpp smoke benchmark; no server integration or downloads.

Uses only stdlib plus existing numpy/soundfile. All generated audio/results stay
under --root on the SSD. Synthetic references are TTS input text, not human labels.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import statistics
import subprocess
import time

import numpy as np
import soundfile as sf


PROMPT = ('Um, I was, uh, thinking about it. Ah, let me start again. '
          'I, I think we could go tomorrow, um, if that works for you.')
FILLERS = ('um', 'uh', 'erm', 'ah')
REVISION = '5359861c739e955e79d9a303bcbc70fb988958b1'
MODEL_HASHES = {
    'small.en': 'c6138d6d58ecc8322097e0f987c32f1be8bb0a18532a3f88f734d1bbf9c41e5d',
    'base.en': 'a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002',
}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def words(text):
    return re.findall(r'\b\w+\b', text.lower().replace('’', '').replace("'", ''))


def errors(ref, hyp):
    previous = list(range(len(hyp) + 1))
    for i, a in enumerate(ref, 1):
        row = [i]
        for j, b in enumerate(hyp, 1):
            row.append(min(row[-1] + 1, previous[j] + 1, previous[j - 1] + (a != b)))
        previous = row
    return previous[-1]


def score(reference, transcript):
    ref, hyp = words(reference), words(transcript)
    rc, hc = Counter(ref), Counter(hyp)
    regular_ref = [w for w in ref if w not in FILLERS]
    regular_hyp = [w for w in hyp if w not in FILLERS]
    return {
        'wer': errors(ref, hyp) / len(ref),
        'regular_word_wer': errors(regular_ref, regular_hyp) / len(regular_ref),
        # Count agreement only: not event recall or acoustic validation.
        'filler_counts': {w: {'reference': rc[w], 'hypothesis': hc[w],
                              'count_retention': min(rc[w], hc[w]) / rc[w] if rc[w] else None,
                              'excess_count': max(0, hc[w] - rc[w])} for w in FILLERS},
    }


def prepare_samples(root, output):
    samples = []
    arrays = []
    definitions = [
        ('fillers', 'voice-fillers.wav', 'Um, I, uh, got lost. Like, I walked into the wrong lecture.', True),
        ('maya', 'voice-maya.wav', 'Hey, is this the psychology lecture? I got lost finding the building.', True),
        ('jfk', 'asr-jfk-16k.wav', 'And so my fellow Americans ask not what your country can do for you ask what you can do for your country', False),
    ]
    for name, filename, reference, synthetic in definitions:
        source = root / 'results' / filename
        audio, rate = sf.read(source, always_2d=True)
        audio = audio.mean(axis=1)
        if rate != 16000:
            # Match the previous smoke benchmark, not production-quality resampling.
            audio = np.interp(np.arange(round(len(audio) * 16000 / rate)) / 16000,
                              np.arange(len(audio)) / rate, audio)
        path = output / f'{name}-16k.wav'
        sf.write(path, audio, 16000, subtype='PCM_16')
        arrays.append(audio)
        samples.append(dict(name=name, path=str(path), source=str(source),
                            source_sha256=digest(source), sha256=digest(path),
                            seconds=len(audio) / 16000, reference=reference, synthetic=synthetic))
    # Explicitly artificial >30 s fixture tests carry-prompt across decode windows.
    long_audio = np.tile(np.concatenate([arrays[0], np.zeros(16000), arrays[1], np.zeros(16000)]), 4)
    path = output / 'concatenated-16k.wav'
    sf.write(path, long_audio, 16000, subtype='PCM_16')
    samples.append(dict(name='concatenated', path=str(path), sha256=digest(path),
                        seconds=len(long_audio) / 16000,
                        reference=' '.join([samples[0]['reference'], samples[1]['reference']] * 4),
                        synthetic=True, construction='(fillers + 1s silence + maya + 1s silence) x 4'))
    return samples


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('/Volumes/Extreme SSD/Microtalks'))
    parser.add_argument('--models', nargs='+', choices=list(MODEL_HASHES), default=list(MODEL_HASHES))
    parser.add_argument('--repeats', type=int, default=3, help='Warm fresh-process repetitions per sample/config')
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error('--repeats must be positive')
    root = args.root.resolve(strict=True)
    output = root / 'results' / 'stt-candidates'
    output.mkdir(exist_ok=True)
    cli = root / 'runtime/whisper.cpp/build/bin/whisper-cli'
    models = []
    for name in args.models:
        path = root / 'models/whisper' / f'ggml-{name}.bin'
        sha = digest(path)
        if sha != MODEL_HASHES[name]:
            raise RuntimeError(f'Unexpected model SHA256: {path}: {sha}')
        models.append(dict(name=name, path=str(path), size_bytes=path.stat().st_size,
                           sha256=sha, source_revision=REVISION,
                           source_url=f'https://huggingface.co/ggerganov/whisper.cpp/resolve/{REVISION}/{path.name}'))
    samples = prepare_samples(root, output)
    result = dict(tested_at=datetime.now(timezone.utc).isoformat(), models=models, samples=samples,
                  cli=str(cli), cli_sha256=digest(cli),
                  whisper_cpp_revision=subprocess.check_output(
                      ['git', '-C', str(root / 'runtime/whisper.cpp'), 'rev-parse', 'HEAD'], text=True).strip(),
                  prompt=PROMPT, warm_repeats=args.repeats,
                  methodology='Sequential fresh CLI processes; wall time includes startup, model load, decode and exit. '
                  'Cold-labelled calls are first observed per model/config, NOT OS-cache-cold: hashes read weights first, '
                  'and prior usage/Metal caches are uncontrolled. Warm means repeated process with potentially warm OS caches, '
                  'not a resident-model server. Audio preparation and hashing excluded from wall time.',
                  limitations=['Two clean Kokoro clips and one recorded JFK clip; no microphone evaluation.',
                               'Long fixture repeats synthetic clips; not spontaneous long speech.',
                               'No positive ah/erm examples; null retention is untested, not zero.',
                               'Filler count retention is not aligned event recall; matching counts can hide errors.',
                               'TTS script is an intended reference, not a listening-verified acoustic annotation.',
                               'Existing desktop/server load is uncontrolled; no conversation LLM invoked.'],
                  runs=[], summary=[])

    def save():
        (root / 'results/stt-candidates.json').write_text(json.dumps(result, indent=2) + '\n')

    save()
    for model in models:
        for mode in ('default', 'prompt', 'carry'):
            candidate = f'{model["name"]}/{mode}'
            schedule = [('cold_first_observed', 0, samples[0])]
            schedule += [('warm_fresh_process', repeat, sample)
                         for repeat in range(1, args.repeats + 1) for sample in samples]
            for phase, repeat, sample in schedule:
                stem = output / f'{model["name"]}-{mode}-{phase}-{repeat}-{sample["name"]}'
                command = [str(cli), '-m', model['path'], '-f', sample['path'], '-l', 'en',
                           '-t', '4', '-bs', '1', '-bo', '1', '-tp', '0', '-tpi', '0.2',
                           '-otxt', '-of', str(stem), '-nt']
                if mode != 'default':
                    command += ['--prompt', PROMPT]
                if mode == 'carry':
                    command += ['--carry-initial-prompt']
                # Avoid accepting a stale transcript if the CLI unexpectedly produces no output.
                transcript_path = Path(str(stem) + '.txt')
                transcript_path.unlink(missing_ok=True)
                start = time.perf_counter()
                process = subprocess.run(command, capture_output=True, text=True, timeout=180)
                wall = time.perf_counter() - start
                log_path = Path(str(stem) + '.log')
                log_path.write_text(process.stderr)
                row = dict(candidate=candidate, sample=sample['name'], phase=phase, repeat=repeat,
                           command=command, wall_seconds=wall, real_time_factor=wall / sample['seconds'],
                           returncode=process.returncode, log=str(log_path))
                result['runs'].append(row)
                save()
                if process.returncode or not transcript_path.exists():
                    raise RuntimeError(f'CLI failed or missing transcript; inspect {log_path}')
                transcript = transcript_path.read_text().strip()
                row.update(transcript=transcript, **score(sample['reference'], transcript))
                row['metal_backend'] = 'using MTL0 backend' in process.stderr
                row['timings_ms'] = {key: float(value) for key, value in re.findall(
                    r'whisper_print_timings:\s+(\w+) time\s*=\s*([\d.]+) ms', process.stderr)}
                print(f'{candidate} {phase} {sample["name"]}: {wall:.3f}s WER={row["wer"]:.3f}: {transcript}', flush=True)
                save()
            rows = [r for r in result['runs'] if r['candidate'] == candidate]
            summary = dict(candidate=candidate, first_observed_seconds=rows[0]['wall_seconds'], samples={})
            for sample in samples:
                warm = [r for r in rows if r['sample'] == sample['name'] and r['phase'] == 'warm_fresh_process']
                summary['samples'][sample['name']] = dict(
                    warm_median_seconds=statistics.median(r['wall_seconds'] for r in warm),
                    warm_min_seconds=min(r['wall_seconds'] for r in warm),
                    warm_max_seconds=max(r['wall_seconds'] for r in warm),
                    wer_values=[r['wer'] for r in warm],
                    regular_word_wer_values=[r['regular_word_wer'] for r in warm],
                    transcripts=sorted(set(r['transcript'] for r in warm)))
            result['summary'].append(summary)
            save()


if __name__ == '__main__':
    main()
