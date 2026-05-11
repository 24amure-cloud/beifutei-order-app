/** アラートではなく軽い「終了」チャイム（ユーザー操作の直後に呼ぶ） */
export function playNomihodaiSoftEndSound() {
  if (typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.065;
    master.connect(ctx.destination);

    const t0 = ctx.currentTime;
    const scheduleTone = (offsetSec, freqHz, durationSec) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const start = t0 + offsetSec;
      osc.frequency.setValueAtTime(freqHz, start);
      osc.frequency.exponentialRampToValueAtTime(freqHz * 0.88, start + durationSec * 0.55);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.4, start + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + durationSec + 0.06);
    };

    scheduleTone(0, 784, 0.32);
    scheduleTone(0.26, 523.25, 0.42);

    void ctx.resume?.();
    setTimeout(() => {
      void ctx.close?.();
    }, 900);
  } catch {
    /* 未対応環境は無視 */
  }
}
