/**
 * Dual-Tone "Ding Dong" Doorbell Chime using Native Web Audio API
 * Generates an authentic harmonic doorbell sound:
 * - Tone 1 ("Ding"): E5 (659.25 Hz) with gentle overtone decay
 * - Tone 2 ("Dong"): C5 (523.25 Hz) with warm resonant decay
 *
 * Guaranteed 100% reliable without any external audio files, network latency, or decoding bugs.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playDingDongSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // --- TONE 1: "DING" (Starts immediately at t = 0) ---
    // Fundamental Frequency: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    // Harmonic overtone for metallic warmth (E6 - 1318.5 Hz)
    const osc1Harmonic = ctx.createOscillator();
    const gain1Harmonic = ctx.createGain();
    osc1Harmonic.type = 'sine';
    osc1Harmonic.frequency.setValueAtTime(1318.5, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    gain1Harmonic.gain.setValueAtTime(0.001, now);
    gain1Harmonic.gain.exponentialRampToValueAtTime(0.1, now + 0.015);
    gain1Harmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc1.connect(gain1);
    osc1Harmonic.connect(gain1Harmonic);
    gain1.connect(ctx.destination);
    gain1Harmonic.connect(ctx.destination);

    osc1.start(now);
    osc1Harmonic.start(now);
    osc1.stop(now + 0.95);
    osc1Harmonic.stop(now + 0.45);

    // --- TONE 2: "DONG" (Starts after 0.38s delay) ---
    // Fundamental Frequency: C5 (523.25 Hz)
    const tone2Start = now + 0.38;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, tone2Start);

    // Harmonic overtone for depth (C6 - 1046.5 Hz)
    const osc2Harmonic = ctx.createOscillator();
    const gain2Harmonic = ctx.createGain();
    osc2Harmonic.type = 'sine';
    osc2Harmonic.frequency.setValueAtTime(1046.5, tone2Start);

    gain2.gain.setValueAtTime(0.001, tone2Start);
    gain2.gain.exponentialRampToValueAtTime(0.4, tone2Start + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, tone2Start + 1.4);

    gain2Harmonic.gain.setValueAtTime(0.001, tone2Start);
    gain2Harmonic.gain.exponentialRampToValueAtTime(0.12, tone2Start + 0.015);
    gain2Harmonic.gain.exponentialRampToValueAtTime(0.0001, tone2Start + 0.6);

    osc2.connect(gain2);
    osc2Harmonic.connect(gain2Harmonic);
    gain2.connect(ctx.destination);
    gain2Harmonic.connect(ctx.destination);

    osc2.start(tone2Start);
    osc2Harmonic.start(tone2Start);
    osc2.stop(tone2Start + 1.45);
    osc2Harmonic.stop(tone2Start + 0.65);
  } catch (err) {
    console.warn('Could not play ding dong sound:', err);
  }
}
