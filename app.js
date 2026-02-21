/**
 * app.js  –  Manga Greeting App
 *
 * Features:
 *  - Anime character slides in from right on Greet click
 *  - Speech bubble types out "HELLO!" then shows the name
 *  - 3 random canvas animations (confetti / rockets / glow)
 *  - Manga speed-lines burst drawn on a separate canvas
 *  - SFX tags ("WHOOSH!", "POW!", "KIRAKIRA✨") appear on card
 */

/* ─── DOM ─── */
const canvas = document.getElementById('animCanvas');
const ctx = canvas.getContext('2d');
const speedCanvas = document.getElementById('speedCanvas');
const sctx = speedCanvas.getContext('2d');
const glowBurstEl = document.getElementById('glowBurst');
const greetBtn = document.getElementById('greetBtn');
const nameInput = document.getElementById('nameInput');
const greetingOutput = document.getElementById('greetingOutput');
const charWrap = document.getElementById('characterWrap');
const animeChar = document.getElementById('animeChar');
const speechBubble = document.getElementById('speechBubble');
const bubbleText = document.getElementById('bubbleText');
const bubbleName = document.getElementById('bubbleName');
const sfxWrap = document.getElementById('sfxWrap');
const sfxTag = document.getElementById('sfxTag');
// Voice UI
const micBtn = document.getElementById('micBtn');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
const voiceStatus = document.getElementById('voiceStatus');

/* ─── Resize both canvases ─── */
function resizeCanvases() {
  canvas.width = speedCanvas.width = window.innerWidth;
  canvas.height = speedCanvas.height = window.innerHeight;
}
resizeCanvases();
window.addEventListener('resize', resizeCanvases);

/* ═══════════════════════════════════════════════
   MANGA SPEED LINES
   ═══════════════════════════════════════════════ */
let speedLinesId = null;

function drawSpeedLines(progress) {
  sctx.clearRect(0, 0, speedCanvas.width, speedCanvas.height);
  const cx = speedCanvas.width / 2;
  const cy = speedCanvas.height / 2;
  const num = 90;
  const maxLen = Math.max(speedCanvas.width, speedCanvas.height) * 0.72;
  const alpha = (1 - progress) * 0.55;

  for (let i = 0; i < num; i++) {
    const angle = (i / num) * Math.PI * 2;
    const len = maxLen * (0.4 + Math.random() * 0.6);
    const width = Math.random() * 2.5 + 0.4;

    sctx.save();
    sctx.globalAlpha = alpha * (Math.random() * 0.6 + 0.4);
    sctx.strokeStyle = i % 3 === 0 ? '#ff4d8d' : '#fff';
    sctx.lineWidth = width;
    sctx.beginPath();
    sctx.moveTo(cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 30);
    sctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    sctx.stroke();
    sctx.restore();
  }
}

function startSpeedLines() {
  let start = null;
  const duration = 700; // ms

  function frame(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    drawSpeedLines(progress);
    if (progress < 1) {
      speedLinesId = requestAnimationFrame(frame);
    } else {
      sctx.clearRect(0, 0, speedCanvas.width, speedCanvas.height);
      speedLinesId = null;
    }
  }
  if (speedLinesId) cancelAnimationFrame(speedLinesId);
  speedLinesId = requestAnimationFrame(frame);
}

/* ═══════════════════════════════════════════════
   ANIME CHARACTER  –  slide in + speech bubble
   ═══════════════════════════════════════════════ */
let hideCharTimeout = null;
let typeInterval = null;

const SFX_WORDS = ['WHOOOOSH!!', 'KI RA KI RA ✨', 'POW!', 'SUGOI~!!', 'FWOOOM!', 'YATTA!'];

function pickSFX() {
  return SFX_WORDS[Math.floor(Math.random() * SFX_WORDS.length)];
}

function typeText(el, text, speed, done) {
  if (typeInterval) clearInterval(typeInterval);
  el.textContent = '';
  let i = 0;
  typeInterval = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(typeInterval);
      typeInterval = null;
      if (done) done();
    }
  }, speed);
}

function showCharacter(name) {
  // Cancel any pending hide
  if (hideCharTimeout) { clearTimeout(hideCharTimeout); hideCharTimeout = null; }

  // reset bubble instantly for re-entry
  charWrap.classList.remove('visible');
  bubbleText.textContent = '';
  bubbleName.textContent = '';
  animeChar.classList.remove('waving');

  // tiny delay so CSS transition re-fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      charWrap.classList.add('visible');

      // Typewriter "HELLO!" then show name
      setTimeout(() => {
        typeText(bubbleText, 'HELLO!', 80, () => {
          bubbleName.textContent = name ? `${name}!` : 'Friend!';
          animeChar.classList.add('waving');
        });
      }, 400);
    });
  });

  // auto-hide after 5.5 s
  hideCharTimeout = setTimeout(hideCharacter, 5500);
}

function hideCharacter() {
  charWrap.classList.remove('visible');
  if (typeInterval) { clearInterval(typeInterval); typeInterval = null; }
}

/* ── SFX pop-tag ── */
function showSFX() {
  sfxTag.textContent = pickSFX();
  sfxTag.classList.remove('pop');
  void sfxTag.offsetWidth;
  sfxTag.classList.add('pop');
  setTimeout(() => sfxTag.classList.remove('pop'), 1400);
}

/* ═══════════════════════════════════════════════
   ANIMATION ENGINE  (unchanged from v1)
   ═══════════════════════════════════════════════ */
let animationId = null;
let activeAnim = null;
let particles = [];

function clearAnimation() {
  if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = [];
  activeAnim = null;
  glowBurstEl.classList.remove('active');
  void glowBurstEl.offsetWidth;
}

let lastAnim = -1;
function pickAnim() {
  let idx;
  do { idx = Math.floor(Math.random() * 3); } while (idx === lastAnim);
  lastAnim = idx;
  return idx;
}

function triggerAnimation() {
  clearAnimation();
  const i = pickAnim();
  if (i === 0) startConfetti();
  else if (i === 1) startPartyPopper();
  else startGlowBurst();
}

/* ── Helpers ── */
function randomRange(a, b) { return Math.random() * (b - a) + a; }

const CONFETTI_COLORS = [
  '#ff4d8d', '#ffd700', '#3b4cca', '#ff90be', '#6c7cff',
  '#00e5ff', '#ff6b35', '#c77dff', '#0aff99',
];
const SPARK_COLORS = ['#ff4da6', '#ffd700', '#ff6b35', '#00e5ff', '#b967ff', '#0aff99', '#fff44f'];

/* ──────────────── CONFETTI ──────────────── */
function createConfettiParticle() {
  const angle = randomRange(-Math.PI / 3, -2 * Math.PI / 3);
  const speed = randomRange(6, 18);
  return {
    x: canvas.width / 2 + randomRange(-80, 80),
    y: canvas.height / 2 + randomRange(-40, 40),
    vx: Math.cos(angle) * speed * randomRange(0.6, 1.2),
    vy: Math.sin(angle) * speed,
    size: randomRange(5, 13),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: randomRange(0, Math.PI * 2),
    rotSpeed: randomRange(-0.12, 0.12),
    shape: Math.random() < 0.5 ? 'rect' : 'circle',
    alpha: 1,
    decay: randomRange(0.012, 0.022),
    gravity: randomRange(0.25, 0.45),
    drift: randomRange(-0.15, 0.15),
  };
}

function startConfetti() {
  activeAnim = 'confetti';
  for (let i = 0; i < 200; i++) particles.push(createConfettiParticle());
  loopConfetti();
}

function loopConfetti() {
  if (activeAnim !== 'confetti') return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.alpha > 0.02);
  if (!particles.length) { clearAnimation(); return; }

  particles.forEach(p => {
    p.vy += p.gravity; p.vx += p.drift;
    p.x += p.vx; p.y += p.vy;
    p.rotation += p.rotSpeed; p.alpha -= p.decay;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
  animationId = requestAnimationFrame(loopConfetti);
}

/* ──────────────── PARTY POPPER ──────────────── */
const ROCKET_COUNT = 8;
let rockets = [];

function createRocket(fx, fy) {
  const tx = randomRange(canvas.width * 0.1, canvas.width * 0.9);
  const ty = randomRange(canvas.height * 0.05, canvas.height * 0.4);
  const dx = tx - fx, dy = ty - fy;
  const d = Math.hypot(dx, dy);
  const spd = randomRange(10, 16);
  return {
    x: fx, y: fy, vx: dx / d * spd, vy: dy / d * spd, tx, ty,
    exploded: false, trail: [], color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)], sparks: []
  };
}

function explodeRocket(r) {
  r.exploded = true;
  const n = randomRange(50, 80);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const spd = randomRange(2, 9);
    r.sparks.push({
      x: r.x, y: r.y,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      alpha: 1, decay: randomRange(0.018, 0.032),
      size: randomRange(2, 5),
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      gravity: 0.1,
    });
  }
}

function startPartyPopper() {
  activeAnim = 'party';
  rockets = [];
  const cx = canvas.width / 2, cy = canvas.height / 2;
  for (let i = 0; i < ROCKET_COUNT; i++) {
    setTimeout(() => { if (activeAnim === 'party') rockets.push(createRocket(cx, cy)); }, i * 80);
  }
  loopPartyPopper();
}

function loopPartyPopper() {
  if (activeAnim !== 'party') return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let alive = false;

  rockets.forEach(r => {
    if (!r.exploded) {
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 8) r.trail.shift();
      r.x += r.vx; r.y += r.vy;
      r.trail.forEach((pt, i) => {
        ctx.save(); ctx.globalAlpha = (i / r.trail.length) * 0.5;
        ctx.fillStyle = r.color; ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.arc(r.x, r.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (Math.hypot(r.x - r.tx, r.y - r.ty) < 12) explodeRocket(r);
      alive = true;
    } else {
      r.sparks = r.sparks.filter(s => s.alpha > 0.02);
      r.sparks.forEach(s => {
        s.vy += s.gravity; s.x += s.vx; s.y += s.vy; s.alpha -= s.decay;
        const a = Math.max(0, s.alpha);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = s.color; ctx.lineWidth = s.size * 0.5;
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2); ctx.stroke(); ctx.restore();
      });
      if (r.sparks.length > 0) alive = true;
    }
  });

  if (!alive && rockets.length === ROCKET_COUNT) { clearAnimation(); return; }
  animationId = requestAnimationFrame(loopPartyPopper);
}

/* ──────────────── GLOW BURST ──────────────── */
const ORB_COLORS = ['#ffd700', '#ff6700', '#ff00aa', '#00eaff', '#c77dff', '#ff4d8d'];

function startGlowBurst() {
  activeAnim = 'glow';
  glowBurstEl.classList.add('active');
  const cx = canvas.width / 2, cy = canvas.height / 2;
  for (let i = 0; i < 80; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = randomRange(3, 15);
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      size: randomRange(4, 12),
      color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
      alpha: 1, decay: randomRange(0.015, 0.028),
      gravity: randomRange(-0.02, 0.08),
    });
  }
  loopGlowBurst();
}

function loopGlowBurst() {
  if (activeAnim !== 'glow') return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.alpha > 0.02);
  if (!particles.length) { clearAnimation(); return; }

  particles.forEach(p => {
    p.vy += p.gravity; p.x += p.vx; p.y += p.vy;
    p.vx *= 0.97; p.vy *= 0.97; p.alpha -= p.decay;
    const a = Math.max(0, p.alpha);
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
    g.addColorStop(0, p.color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  animationId = requestAnimationFrame(loopGlowBurst);
}

/* ═══════════════════════════════════════════════
   VOICE ENGINE
   ═══════════════════════════════════════════════ */

/* ── 1. TEXT-TO-SPEECH (SpeechSynthesis) ── */
const synth = window.speechSynthesis || null;
let isMuted = false;
let isSpeaking = false;

/**
 * Speak a given text in an anime-style high voice.
 * Picks the best available feminine / high-pitched voice.
 */
function speakGreeting(name) {
  if (!synth || isMuted) return;

  // Cancel any ongoing speech
  synth.cancel();

  const display = name || 'Friend';
  // Build the utterance text – cheerful script
  const scripts = [
    `Hello, ${display}! I'm so happy to meet you! Yoroshiku!`,
    `Yay, ${display}! It's wonderful to see you! Kawaii!`,
    `Oh my gosh, ${display}! You're here! This makes me so happy! Yatta!`,
    `${display}! Konnichiwa! Let's be best friends forever!`,
  ];
  const script = scripts[Math.floor(Math.random() * scripts.length)];

  const utter = new SpeechSynthesisUtterance(script);

  // Pick a high-pitched / feminine voice when available
  const voices = synth.getVoices();
  const preferred = voices.find(v =>
    /female|zira|hazel|aria|victoria|samantha|karen|moira|fiona|tessa/i.test(v.name)
  ) || voices.find(v => /en/i.test(v.lang)) || voices[0];

  if (preferred) utter.voice = preferred;
  utter.pitch = 1.6;   // Higher = more anime-like
  utter.rate = 1.15;  // Slightly faster, energetic
  utter.volume = 1;

  utter.onstart = () => {
    isSpeaking = true;
    animeChar.classList.add('speaking');
    setVoiceStatus('speaking', '🔊 Speaking...');
  };

  utter.onend = utter.onerror = () => {
    isSpeaking = false;
    animeChar.classList.remove('speaking');
    setVoiceStatus('', '');
  };

  // Small delay so character is on screen first
  setTimeout(() => synth.speak(utter), 700);
}

/* Mute toggle */
muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  if (isMuted) {
    synth && synth.cancel();
    muteIcon.textContent = '🔇';
    muteBtn.querySelector('.mute-label').textContent = 'Voice OFF';
    muteBtn.classList.add('muted');
    setVoiceStatus('', '');
  } else {
    muteIcon.textContent = '🔊';
    muteBtn.querySelector('.mute-label').textContent = 'Voice ON';
    muteBtn.classList.remove('muted');
  }
});

/* Voice status helper */
function setVoiceStatus(state, message) {
  voiceStatus.textContent = message;
  voiceStatus.className = 'voice-status' + (state ? ` ${state}` : '');
}

/* ── 2. SPEECH RECOGNITION (Voice Input) ── */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;  // show partial results live
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add('listening');
    setVoiceStatus('listening', '🎤 Listening... say your name!');
    nameInput.placeholder = 'Listening...';
    nameInput.value = '';
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join('')
      .trim();

    // Show interim result in input live
    nameInput.value = transcript;

    if (event.results[event.results.length - 1].isFinal) {
      // Capitalise first letter nicely
      nameInput.value = transcript.charAt(0).toUpperCase() + transcript.slice(1);
    }
  };

  recognition.onerror = (event) => {
    const msgs = {
      'no-speech': '🤫 No speech detected. Try again!',
      'not-allowed': '🚫 Microphone access denied.',
      'audio-capture': '🎙 No microphone found.',
      'network': '📡 Network error.',
    };
    setVoiceStatus('error', msgs[event.error] || `⚠️ Error: ${event.error}`);
    stopListening();
    setTimeout(() => setVoiceStatus('', ''), 3000);
  };

  recognition.onend = () => {
    stopListening();
    if (nameInput.value.trim()) {
      setVoiceStatus('', '');
    }
    nameInput.placeholder = 'Type your name here';
  };

} else {
  // Browser doesn't support STT — hide mic button
  micBtn.style.display = 'none';
}

function startListening() {
  if (!recognition || isListening) return;
  // Stop any current speech so it doesn't interfere
  synth && synth.cancel();
  try { recognition.start(); } catch (e) { /* already started */ }
}

function stopListening() {
  isListening = false;
  micBtn.classList.remove('listening');
}

/* Mic button click — toggle */
micBtn.addEventListener('click', () => {
  if (isListening) {
    recognition.stop();
  } else {
    startListening();
  }
});

/* Preload voices (Chrome lazy-loads voice list) */
if (synth) {
  synth.getVoices(); // triggers population
  synth.addEventListener('voiceschanged', () => synth.getVoices());
}

/* ═══════════════════════════════════════════════
   GREETING LOGIC
   ═══════════════════════════════════════════════ */
function showGreeting(name) {
  const display = name.trim() || 'Friend';
  greetingOutput.classList.remove('visible');
  setTimeout(() => {
    greetingOutput.textContent = `Hello, ${display}! 👋`;
    greetingOutput.classList.add('visible');
  }, 80);
}

/* ═══════════════════════════════════════════════
   MAIN GREET HANDLER
   ═══════════════════════════════════════════════ */
function onGreet() {
  const name = nameInput.value.trim();

  // Stop any active listening/speaking first
  if (isListening) { recognition && recognition.stop(); }
  synth && synth.cancel();

  // 1. greeting text
  showGreeting(name);

  // 2. manga speed lines
  startSpeedLines();

  // 3. SFX pop tag
  showSFX();

  // 4. canvas particle animation
  triggerAnimation();

  // 5. anime character slides in + speech bubble
  showCharacter(name);

  // 6. 🔊 Character speaks the greeting!
  speakGreeting(name);
}

/* ─── Events ─── */
greetBtn.addEventListener('click', onGreet);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') onGreet(); });

