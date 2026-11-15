// ─────────────────────────────────────────────────────────────────────────────
// audio.js - Siren, beeps, spoken audio description and voice commands
//
// Everything uses browser APIs (WebAudio, speechSynthesis, SpeechRecognition); nothing is sent anywhere.
// The sound and audio-description choices are remembered in localStorage.
// ─────────────────────────────────────────────────────────────────────────────
import { t, LANG, speechLang } from './i18n.js';

const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('protocol-' + k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('protocol-' + k, JSON.stringify(v)); } catch {} },
};

export const sound = { muted: store.get('muted', false), audioOn: store.get('audio', false), voiceOn: false };
let ac = null, siren = null, rec = null;

export function beep(kind) {
  if (sound.muted) return;
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination);
    o.frequency.value = kind === 'ok' ? 660 : 880; g.gain.value = 0.08; o.start(); o.stop(ac.currentTime + (kind === 'ok' ? 0.25 : 0.5));
  } catch {}
}

/** Two-tone siren: a square wave whose pitch is swept by a slow oscillator. */
export function sirenOn() {
  if (sound.muted || siren) return;
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'square'; o.frequency.value = 760; lfo.frequency.value = 1.6; lg.gain.value = 260; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.value = 0.05; o.connect(g); g.connect(ac.destination); o.start(); lfo.start(); siren = { o, lfo };
  } catch {}
}
export function sirenOff() { if (siren) { try { siren.o.stop(); siren.lfo.stop(); } catch {} siren = null; } }

export function toggleMute() { sound.muted = !sound.muted; store.set('muted', sound.muted); if (sound.muted) sirenOff(); else sirenOn(); }

/** Reads a text aloud (only with audio description on, or when forced). Chemical symbols are spoken as words. */
export function say(text, force) {
  if (!(sound.audioOn || force) || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, '').replace(/CO₂/g, t('ce o dos', 'C O 2')).replace(/O₂/g, t('oxígeno', 'oxygen')).replace(/\bCO\b/g, t('monóxido de carbono', 'carbon monoxide')));
  u.lang = speechLang();
  if (LANG === 'en') { const v = speechSynthesis.getVoices?.().find((x) => /^en[-_]US/i.test(x.lang)); if (v) u.voice = v; }
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

export function toggleAudio(onEnable) {
  sound.audioOn = !sound.audioOn; store.set('audio', sound.audioOn);
  if (sound.audioOn) onEnable?.(); else speechSynthesis?.cancel();
}

/** Starts or stops listening. onText(text) receives every phrase heard. Returns false if the browser cannot listen. */
export function toggleVoice(onText) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  if (sound.voiceOn) { sound.voiceOn = false; rec?.stop(); return true; }
  rec = new SR(); rec.lang = speechLang(); rec.continuous = true;
  rec.onresult = (e) => onText(e.results[e.results.length - 1][0].transcript);
  rec.onend = () => { if (sound.voiceOn) try { rec.start(); } catch {} };
  sound.voiceOn = true; try { rec.start(); } catch {}
  return true;
}
export function stopVoice() { sound.voiceOn = false; rec?.stop(); }
/** Keeps speech recognition in the current language after a language change. */
export function relangVoice() { if (rec) rec.lang = speechLang(); }
