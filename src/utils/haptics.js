const HAPTIC = {
  tap: [[8]],
  step: [[6]],
  success: [[10, 50, 10]],
  warning: [[20, 30, 20, 30, 20]],
  destruct: [[25]],
  record: [[12, 24, 12]],
  light: [[8]],
  medium: [[15]],
  heavy: [[25]],
  error: [[20, 30, 20, 30, 20]],
  selection: [[6]],
};

let _audioCtx = null;
let _feedbackSoundEnabled = false;

export function setFeedbackSoundEnabled(v) {
  _feedbackSoundEnabled = !!v;
}

function getAudio() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }
  return _audioCtx;
}

function iosTap(durationMs = 10) {
  const ctx = getAudio();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.00001, ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {}
}

export function primeIOSFeedback() {
  const ctx = getAudio();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    iosTap(1);
  } catch {}
}

export function haptic(patternOrPreset) {
  try {
    const patterns =
      typeof patternOrPreset === "string"
        ? HAPTIC[patternOrPreset] || [[6]]
        : [patternOrPreset];

    const isIOS = !navigator.vibrate && typeof window.webkitAudioContext !== 'undefined';
    if (isIOS) {
      if (!_feedbackSoundEnabled) return;
      let delay = 0;
      for (const pattern of patterns) {
        for (let i = 0; i < pattern.length; i++) {
          const dur = pattern[i];
          if (i % 2 === 0) {
            const d = delay;
            setTimeout(() => iosTap(dur), d);
          }
          delay += dur;
        }
      }
      return;
    }

    if (navigator.vibrate) {
      navigator.vibrate(patterns[0]);
    }
  } catch {}
}

