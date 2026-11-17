/** Small synthesized sound effects (no audio files). */
let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

function tone(freq: number, start: number, length: number, volume = 0.08): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

export const sounds = {
  unlock: () => audio(),
  flip: () => tone(660, 0, 0.08, 0.04),
  good: () => (tone(660, 0, 0.12), tone(990, 0.08, 0.18)),
  forgot: () => tone(220, 0, 0.25, 0.06),
};
