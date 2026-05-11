import './style.css';

// DOM Elements
const btnToggleMic = document.getElementById('btn-toggle-mic');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const heightSlider = document.getElementById('target-height');
const smoothingSlider = document.getElementById('smoothing');
const radioMale = document.getElementById('mode-male');
const radioFemale = document.getElementById('mode-female');
const radioGuitar = document.getElementById('mode-guitar');
const radioDrum = document.getElementById('mode-drum');
const radioKeyboard = document.getElementById('mode-keyboard');
const radioElectric = document.getElementById('mode-electric');
const radioBass = document.getElementById('mode-bass');
const explMale = document.getElementById('expl-male');
const explFemale = document.getElementById('expl-female');
const explGuitar = document.getElementById('expl-guitar');
const explDrum = document.getElementById('expl-drum');
const explKeyboard = document.getElementById('expl-keyboard');
const explElectric = document.getElementById('expl-electric');
const explBass = document.getElementById('expl-bass');

// Audio Nodes
// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed: ', err));
  });
}

let audioCtx;
let analyser;
let stream;
let source;

// Settings
let targetHeightBase = parseInt(heightSlider.value);
let smoothingValue = parseFloat(smoothingSlider.value);

heightSlider.addEventListener('input', (e) => {
  targetHeightBase = parseInt(e.target.value);
});

smoothingSlider.addEventListener('input', (e) => {
  smoothingValue = parseFloat(e.target.value);
  if (analyser) {
    analyser.smoothingTimeConstant = smoothingValue;
  }
});

let currentMode = 'male';

const allExpls = { male: explMale, female: explFemale, guitar: explGuitar, drum: explDrum, keyboard: explKeyboard, electric: explElectric, bass: explBass };

function updateMode() {
  // Determine which radio is checked
  if (radioMale.checked) currentMode = 'male';
  else if (radioFemale.checked) currentMode = 'female';
  else if (radioGuitar.checked) currentMode = 'guitar';
  else if (radioDrum.checked) currentMode = 'drum';
  else if (radioKeyboard.checked) currentMode = 'keyboard';
  else if (radioElectric.checked) currentMode = 'electric';
  else currentMode = 'bass';

  // Show/hide explanation panels
  Object.entries(allExpls).forEach(([key, el]) => {
    el.style.display = key === currentMode ? 'block' : 'none';
  });

  if (!analyser || audioCtx.state === 'closed') {
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawTargetCurve();
  }
}

radioMale.addEventListener('change', updateMode);
radioFemale.addEventListener('change', updateMode);
radioGuitar.addEventListener('change', updateMode);
radioDrum.addEventListener('change', updateMode);
radioKeyboard.addEventListener('change', updateMode);
radioElectric.addEventListener('change', updateMode);
radioBass.addEventListener('change', updateMode);

// Canvas Setup
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize Web Audio API
async function initAudio() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    
    // Higher resolution FFT
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = smoothingValue;

    // Direct connection: Source -> Analyser (NO filters)
    source.connect(analyser);

    btnToggleMic.textContent = '마이크 끄기';
    btnToggleMic.classList.replace('primary', 'secondary');
    
    drawVisualizer();
  } catch (err) {
    console.error('마이크 접근 권한이 필요합니다.', err);
    alert('마이크 접근을 허용해야 스펙트럼 분석기를 사용할 수 있습니다.');
  }
}

function stopAudio() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  if (audioCtx) {
    audioCtx.close();
  }
  
  btnToggleMic.textContent = '마이크 켜기';
  btnToggleMic.classList.replace('secondary', 'primary');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTargetCurve(); // Keep drawing the target curve even when stopped
}

// ─── 로그 스케일 주파수 ↔ X 픽셀 변환 (0~1kHz 시각 폭 확보) ───
const LOG_MIN_FREQ = 20;     // 표시 시작 주파수
const LOG_MAX_FREQ = 11000;  // 표시 최대 주파수

function freqToX(freq, width) {
  if (freq <= LOG_MIN_FREQ) return 0;
  if (freq >= LOG_MAX_FREQ) return width;
  return width * Math.log(freq / LOG_MIN_FREQ) / Math.log(LOG_MAX_FREQ / LOG_MIN_FREQ);
}

function xToFreq(x, width) {
  return LOG_MIN_FREQ * Math.pow(LOG_MAX_FREQ / LOG_MIN_FREQ, x / width);
}

// Draw the ideal EQ Target Curve
function drawTargetCurve() {
  const width = canvas.width;
  const height = canvas.height;
  const maxFreq = audioCtx ? audioCtx.sampleRate / 2 : 24000;

  ctx.beginPath();
  ctx.lineWidth = 4;
  
  // Set color based on mode
  if (currentMode === 'male') {
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
  } else if (currentMode === 'female') {
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)'; // Pink
    ctx.fillStyle = 'rgba(236, 72, 153, 0.1)';
  } else if (currentMode === 'guitar') {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'; // Amber
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
  } else if (currentMode === 'drum') {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
  } else if (currentMode === 'keyboard') {
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)'; // Purple
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
  } else if (currentMode === 'electric') {
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.8)'; // Slate
    ctx.fillStyle = 'rgba(100, 116, 139, 0.1)';
  } else {
    ctx.strokeStyle = 'rgba(55, 48, 163, 0.8)'; // Indigo
    ctx.fillStyle = 'rgba(55, 48, 163, 0.1)';
  }

  // Base Y height (inverted because canvas Y goes down)
  const baseY = height - targetHeightBase;

  const malePoints = [
    { f: 0, yOffset: -100 },      
    { f: 80, yOffset: -50 },      
    { f: 120, yOffset: 10 },      
    { f: 250, yOffset: -20 },     
    { f: 500, yOffset: 0 },       
    { f: 1000, yOffset: 0 },      
    { f: 3000, yOffset: 20 },     
    { f: 4500, yOffset: 40 },     
    { f: 7000, yOffset: 10 },     
    { f: 11000, yOffset: -20 }    
  ];

  const femalePoints = [
    { f: 0, yOffset: -100 },
    { f: 120, yOffset: -50 },     // Cut higher for female
    { f: 180, yOffset: 10 },      // Body
    { f: 300, yOffset: -20 },     // Mud cut
    { f: 600, yOffset: 0 },
    { f: 1000, yOffset: 0 },
    { f: 3500, yOffset: 20 },
    { f: 5500, yOffset: 40 },     // Higher clarity peak
    { f: 8000, yOffset: -10 },    // Sibilance cut
    { f: 11000, yOffset: 10 }     // Slight air
  ];

  const instrumentPoints = [
    { f: 0, yOffset: -100 },
    { f: 80, yOffset: -50 },
    { f: 150, yOffset: 0 },
    { f: 200, yOffset: -25 },
    { f: 500, yOffset: 0 },
    { f: 1000, yOffset: 10 },
    { f: 3500, yOffset: 30 },
    { f: 6000, yOffset: 0 },
    { f: 8000, yOffset: 20 },
    { f: 11000, yOffset: -10 }
  ];

  // Drum: Big sub kick, mud cut, snare crack, hi-hat shimmer
  const drumPoints = [
    { f: 0, yOffset: 40 },        // Sub kick thump
    { f: 80, yOffset: 50 },       // Kick body peak
    { f: 180, yOffset: 0 },
    { f: 350, yOffset: -30 },     // Mud cut
    { f: 700, yOffset: 0 },
    { f: 1500, yOffset: 25 },     // Snare crack
    { f: 3000, yOffset: 0 },
    { f: 7000, yOffset: 30 },     // Hi-hat presence
    { f: 10000, yOffset: 20 },    // Cymbal air
    { f: 11000, yOffset: 10 }
  ];

  // Keyboard: Warm body, clean mid, key attack, brilliance
  const keyboardPoints = [
    { f: 0, yOffset: -80 },       // Low hum cut
    { f: 60, yOffset: -50 },
    { f: 200, yOffset: 10 },      // Body warmth
    { f: 400, yOffset: 5 },
    { f: 1000, yOffset: 0 },      // Clean mid
    { f: 2000, yOffset: 0 },
    { f: 4000, yOffset: 25 },     // Key attack
    { f: 7000, yOffset: 5 },
    { f: 9000, yOffset: 30 },     // Brilliance
    { f: 11000, yOffset: 20 }
  ];

  // Electric Guitar: Mid-focused, roll off highs
  const electricPoints = [
    { f: 0, yOffset: -100 },      // Aggressive highpass
    { f: 100, yOffset: -50 },
    { f: 250, yOffset: 10 },      // Body
    { f: 800, yOffset: -15 },     // Boxiness cut
    { f: 2000, yOffset: 30 },     // Presence/Bite
    { f: 4000, yOffset: 20 },
    { f: 5000, yOffset: -30 },    // Aggressive high cut
    { f: 11000, yOffset: -80 }
  ];

  let curvePoints;
  if (currentMode === 'male') curvePoints = malePoints;
  else if (currentMode === 'female') curvePoints = femalePoints;
  else if (currentMode === 'guitar') curvePoints = instrumentPoints;
  else if (currentMode === 'drum') curvePoints = drumPoints;
  else if (currentMode === 'keyboard') curvePoints = keyboardPoints;
  else if (currentMode === 'electric') curvePoints = electricPoints;
  else {
    // Bass Guitar: Low-end focus, presence around 1k
    curvePoints = [
      { f: 0, yOffset: -80 },       // Low cut
      { f: 40, yOffset: -30 },
      { f: 80, yOffset: 40 },       // Punch/Bottom
      { f: 200, yOffset: 0 },
      { f: 400, yOffset: -20 },     // Mud cut
      { f: 1000, yOffset: 25 },     // Growl/Presence
      { f: 3000, yOffset: 15 },     // Attack
      { f: 5000, yOffset: -40 },    // High cut
      { f: 11000, yOffset: -90 }
    ];
  }

  ctx.moveTo(0, height);
  
  // Iterate over every pixel column, map to frequency via log scale
  for (let x = 0; x <= width; x += 1) {
    const currentFreq = xToFreq(x, width);
    
    // Find surrounding points
    let p1 = curvePoints[0];
    let p2 = curvePoints[curvePoints.length - 1];
    
    for (let i = 0; i < curvePoints.length - 1; i++) {
      if (currentFreq >= curvePoints[i].f && currentFreq <= curvePoints[i+1].f) {
        p1 = curvePoints[i];
        p2 = curvePoints[i+1];
        break;
      }
    }
    
    // Interpolate Y
    let interpolatedYOffset = 0;
    if (p2.f === p1.f) {
      interpolatedYOffset = p1.yOffset;
    } else {
      const ratio = (currentFreq - p1.f) / (p2.f - p1.f);
      // Smooth interpolation using cosine
      const smoothRatio = (1 - Math.cos(ratio * Math.PI)) / 2;
      interpolatedYOffset = p1.yOffset + (p2.yOffset - p1.yOffset) * smoothRatio;
    }
    
    const drawY = baseY - interpolatedYOffset;
    ctx.lineTo(x, drawY);
  }

  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  
  // Draw labels for target curve
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '12px Inter';
  ctx.textAlign = 'center';

  const maleLabels = [
    { freq: 80,   text: 'Low Cut',  color: '#ef4444', dir: 'down' },
    { freq: 250,  text: 'Mud Cut',  color: '#f59e0b', dir: 'down' },
    { freq: 1000, text: 'Mid Base', color: '#10b981', dir: 'keep' },
    { freq: 4000, text: 'Presence', color: '#3b82f6', dir: 'up'   },
    { freq: 8000, text: 'Air',      color: '#8b5cf6', dir: 'up'   }
  ];

  const femaleLabels = [
    { freq: 120,  text: 'Low Cut',  color: '#ef4444', dir: 'down' },
    { freq: 300,  text: 'Mud Cut',  color: '#f59e0b', dir: 'down' },
    { freq: 1000, text: 'Mid Base', color: '#10b981', dir: 'keep' },
    { freq: 5500, text: 'Presence', color: '#3b82f6', dir: 'up'   },
    { freq: 8000, text: 'De-Esser', color: '#8b5cf6', dir: 'down' }
  ];

  const instrumentLabels = [
    { freq: 80,   text: 'Low Cut',   color: '#ef4444', dir: 'down' },
    { freq: 200,  text: 'Boominess', color: '#f59e0b', dir: 'down' },
    { freq: 1000, text: 'Attack',    color: '#10b981', dir: 'up'   },
    { freq: 3500, text: 'Pick Bite', color: '#3b82f6', dir: 'up'   },
    { freq: 8000, text: 'Shimmer',   color: '#8b5cf6', dir: 'up'   }
  ];

  const drumLabels = [
    { freq: 80,    text: 'Kick Sub', color: '#ef4444', dir: 'up'   },
    { freq: 350,   text: 'Mud Cut',  color: '#f59e0b', dir: 'down' },
    { freq: 1500,  text: 'Snare',    color: '#10b981', dir: 'up'   },
    { freq: 7000,  text: 'Hi-Hat',   color: '#3b82f6', dir: 'up'   },
    { freq: 10000, text: 'Cymbal',   color: '#8b5cf6', dir: 'up'   }
  ];

  const keyboardLabels = [
    { freq: 60,   text: 'Low Cut',    color: '#ef4444', dir: 'down' },
    { freq: 200,  text: 'Body',       color: '#f59e0b', dir: 'up'   },
    { freq: 1000, text: 'Mid Base',   color: '#10b981', dir: 'keep' },
    { freq: 4000, text: 'Key Attack', color: '#3b82f6', dir: 'up'   },
    { freq: 9000, text: 'Brilliance', color: '#8b5cf6', dir: 'up'   }
  ];

  const electricLabels = [
    { freq: 100,  text: 'Low Cut',  color: '#ef4444', dir: 'down' },
    { freq: 350,  text: 'Body',     color: '#f59e0b', dir: 'keep' },
    { freq: 800,  text: 'Boxiness', color: '#10b981', dir: 'down' },
    { freq: 2500, text: 'Bite',     color: '#3b82f6', dir: 'up'   },
    { freq: 5000, text: 'High Cut', color: '#8b5cf6', dir: 'down' }
  ];

  let labels;
  if (currentMode === 'male') labels = maleLabels;
  else if (currentMode === 'female') labels = femaleLabels;
  else if (currentMode === 'guitar') labels = instrumentLabels;
  else if (currentMode === 'drum') labels = drumLabels;
  else if (currentMode === 'keyboard') labels = keyboardLabels;
  else if (currentMode === 'electric') labels = electricLabels;
  else {
    // Bass Labels
    labels = [
      { freq: 40,   text: 'Low Cut', color: '#ef4444', dir: 'down' },
      { freq: 80,   text: 'Punch',   color: '#f59e0b', dir: 'up'   },
      { freq: 400,  text: 'Mud Cut', color: '#10b981', dir: 'down' },
      { freq: 1000, text: 'Growl',   color: '#3b82f6', dir: 'up'   },
      { freq: 3000, text: 'Attack',  color: '#8b5cf6', dir: 'up'   }
    ];
  }

  // Helper: compute Y on the target curve at a given frequency
  function getCurveY(freq) {
    let p1 = curvePoints[0];
    let p2 = curvePoints[curvePoints.length - 1];
    for (let i = 0; i < curvePoints.length - 1; i++) {
      if (freq >= curvePoints[i].f && freq <= curvePoints[i+1].f) {
        p1 = curvePoints[i]; p2 = curvePoints[i+1]; break;
      }
    }
    const ratio = p2.f === p1.f ? 0 : (freq - p1.f) / (p2.f - p1.f);
    const smooth = (1 - Math.cos(ratio * Math.PI)) / 2;
    return baseY - (p1.yOffset + (p2.yOffset - p1.yOffset) * smooth);
  }

  // Helper: draw arrow triangle at curve position
  function drawDirectionArrow(x, curveY, dir, freq) {
    const s = 9; // size
    const freqLabel = freq >= 1000 ? (freq / 1000) + 'kHz' : freq + 'Hz';
    if (dir === 'up') {
      // Arrow tip AT curve, pointing upward
      const tipY = curveY - 10;
      ctx.beginPath();
      ctx.moveTo(x, tipY - s * 1.6);    // tip
      ctx.lineTo(x - s, tipY);           // left base
      ctx.lineTo(x + s, tipY);           // right base
      ctx.closePath();
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      // Stem
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.lineTo(x, tipY + s * 1.4);
      ctx.stroke();
      // "▲ 올리기" text
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px Inter';
      ctx.fillText('▲ 올리기', x, tipY + s * 1.4 + 12);
      // Hz number below
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 11px Inter';
      ctx.fillText(freqLabel, x, tipY + s * 1.4 + 25);
    } else if (dir === 'down') {
      // Arrow tip AT curve, pointing downward
      const tipY = curveY + 10;
      ctx.beginPath();
      ctx.moveTo(x, tipY + s * 1.6);    // tip
      ctx.lineTo(x - s, tipY);           // left base
      ctx.lineTo(x + s, tipY);           // right base
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      // Stem
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.lineTo(x, tipY - s * 1.4);
      ctx.stroke();
      // "▼ 내리기" text
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px Inter';
      ctx.fillText('▼ 내리기', x, tipY - s * 1.4 - 15);
      // Hz number above
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 11px Inter';
      ctx.fillText(freqLabel, x, tipY - s * 1.4 - 2);
    } else {
      // Keep: horizontal dash
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, curveY);
      ctx.lineTo(x + 8, curveY);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px Inter';
      ctx.fillText('― 유지', x, curveY - 18);
      // Hz number
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 11px Inter';
      ctx.fillText(freqLabel, x, curveY - 5);
    }
  }

  labels.forEach(item => {
    // Log-scale X position
    const x = freqToX(item.freq, width);
    if (x > 0 && x < width) {
      const cy = getCurveY(item.freq);

      // Faint vertical guide line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(x, 55);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Frequency Hz text (top bar)
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.freq >= 1000 ? item.freq/1000 + 'k' : item.freq}Hz`, x, 16);

      // Feature name text
      ctx.fillStyle = item.color;
      ctx.font = '10px Inter';
      ctx.fillText(item.text, x, 30);

      // Direction arrow drawn ON the curve
      drawDirectionArrow(x, cy, item.dir, item.freq);
    }
  });
}

// Draw Analyzer
function drawVisualizer() {
  if (!analyser || audioCtx.state === 'closed') return;

  requestAnimationFrame(drawVisualizer);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const maxFreq = audioCtx.sampleRate / 2;

  // Draw actual microphone spectrum (log-scale X axis)
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);

  for (let px = 0; px < canvas.width; px++) {
    const freq = xToFreq(px, canvas.width);
    const binIndex = Math.min(
      Math.floor((freq / maxFreq) * bufferLength),
      bufferLength - 1
    );
    const val = dataArray[binIndex];
    const scaledHeight = (val / 255) * canvas.height;
    ctx.lineTo(px, canvas.height - scaledHeight);
  }
  
  ctx.lineTo(canvas.width, canvas.height);
  
  // Fill spectrum with neon cyan
  const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
  gradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw the target curve ON TOP of the spectrum
  drawTargetCurve();
}

// Event Listeners
btnToggleMic.addEventListener('click', () => {
  if (audioCtx && audioCtx.state !== 'closed') {
    stopAudio();
  } else {
    initAudio();
  }
});

// Draw initial empty state with target curve
ctx.fillStyle = 'rgba(0, 0, 0, 1)';
ctx.fillRect(0, 0, canvas.width, canvas.height);
drawTargetCurve();
