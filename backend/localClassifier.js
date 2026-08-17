const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { CATEGORIES } = require('./categories');

const PREDICT_SCRIPT = path.join(__dirname, 'ml', 'predict.py');
const VENV_PYTHON = path.join(__dirname, 'ml', '.venv', 'bin', 'python');
const DEFAULT_THRESHOLD = 0.75;
const WORKER_READY_MS = 12000;
const WORKER_REQUEST_MS = 8000;

let worker = null;
let workerReady = false;
let stoppingWorker = false;
const waiters = [];

function debugTimingEnabled() {
  const v = String(process.env.DEBUG_TIMING || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function timingMs(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1e6;
}

function logTiming(label, ms) {
  if (!debugTimingEnabled()) return;
  console.debug(`[timing] ${label} ${ms.toFixed(1)}ms`);
}

function classifierThreshold() {
  const raw = Number(process.env.ML_CATEGORY_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : DEFAULT_THRESHOLD;
}

function pythonBin() {
  if (process.env.PYTHON || process.env.ML_PYTHON) {
    return process.env.PYTHON || process.env.ML_PYTHON;
  }
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON;
  return 'python3';
}

function failWaiters() {
  while (waiters.length) {
    const waiter = waiters.shift();
    clearTimeout(waiter.timer);
    waiter.resolve(null);
  }
}

function stopClassifierWorker() {
  stoppingWorker = true;
  workerReady = false;
  failWaiters();
  if (worker) {
    const child = worker;
    worker = null;
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

function sendToWorker(payload) {
  if (!worker || !workerReady || !worker.stdin.writable) return Promise.resolve(null);

  return new Promise((resolve) => {
    const waiter = { resolve, timer: null };
    waiter.timer = setTimeout(() => {
      const idx = waiters.indexOf(waiter);
      if (idx >= 0) waiters.splice(idx, 1);
      console.debug('[ai/parse] classifier worker request timed out');
      stopClassifierWorker();
      resolve(null);
    }, WORKER_REQUEST_MS);
    waiters.push(waiter);
    try {
      worker.stdin.write(`${JSON.stringify(payload)}\n`);
    } catch {
      clearTimeout(waiter.timer);
      const idx = waiters.indexOf(waiter);
      if (idx >= 0) waiters.splice(idx, 1);
      resolve(null);
    }
  });
}

function parsePrediction(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw).trim());
    const category = String(parsed.category || '').trim();
    const confidence = Number(parsed.confidence);
    if (!CATEGORIES.includes(category) || !Number.isFinite(confidence)) return null;
    return { category, confidence };
  } catch {
    return null;
  }
}

async function startClassifierWorker() {
  stopClassifierWorker();
  if (!fs.existsSync(PREDICT_SCRIPT)) {
    console.debug('[ai/parse] classifier script missing; skipping worker');
    return false;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      workerReady = ok;
      resolve(ok);
    };

    let child;
    try {
      child = spawn(pythonBin(), [PREDICT_SCRIPT, '--serve'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });
    } catch (error) {
      console.debug('[ai/parse] classifier worker failed to spawn', error.message || error);
      finish(false);
      return;
    }

    worker = child;
    stoppingWorker = false;
    const readyTimer = setTimeout(() => {
      console.debug('[ai/parse] classifier worker health check timed out');
      stopClassifierWorker();
      finish(false);
    }, WORKER_READY_MS);

    const rl = readline.createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      const trimmed = String(line || '').trim();
      if (!trimmed) return;
      if (!settled) {
        try {
          const msg = JSON.parse(trimmed);
          if (msg.ok && msg.ready) {
            clearTimeout(readyTimer);
            finish(true);
            return;
          }
        } catch {
          /* wait for ready */
        }
        return;
      }
      const waiter = waiters.shift();
      if (!waiter) return;
      clearTimeout(waiter.timer);
      waiter.resolve(trimmed);
    });

    child.stderr.on('data', (buf) => {
      const msg = String(buf).trim();
      if (msg) console.debug(`[classifier] ${msg}`);
    });

    child.on('error', (error) => {
      clearTimeout(readyTimer);
      console.debug('[ai/parse] classifier worker error', error.message || error);
      workerReady = false;
      failWaiters();
      finish(false);
    });

    child.on('exit', (code, signal) => {
      clearTimeout(readyTimer);
      const diedReady = workerReady && !stoppingWorker;
      if (worker === child) worker = null;
      workerReady = false;
      failWaiters();
      if (diedReady) {
        console.error(
          `[ai/parse] classifier worker died (${signal || `exit ${code}`}); falling back to Gemini/regex`
        );
      }
      finish(false);
    });
  });
}

async function classifyLocally(description) {
  const text = String(description || '').trim();
  if (!text) return null;

  const started = process.hrtime.bigint();
  if (!workerReady) {
    logTiming('classifyLocally', timingMs(started));
    return null;
  }

  const raw = await sendToWorker({ text });
  logTiming('classifyLocally', timingMs(started));
  return parsePrediction(raw);
}

module.exports = {
  classifyLocally,
  classifierThreshold,
  startClassifierWorker,
  stopClassifierWorker,
  debugTimingEnabled,
  timingMs,
  logTiming
};
