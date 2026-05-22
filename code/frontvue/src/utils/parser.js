// ── PARSER MODULE ──────────────────────────────────────────────────────────────
// Cambiamos window.Parser por una constante normal
const Parser = (() => {

  const NOTE_FREQ_BASE = {
    "DO": 261.63, "DO#": 277.18, "REB": 277.18, "RE": 293.66, "RE#": 311.13, "MIB": 311.13,
    "MI": 329.63, "FA": 349.23, "FA#": 369.99, "SOLB": 369.99, "SOL": 392.00,
    "SOL#": 415.30, "LAB": 415.30, "LA": 440.00, "LA#": 466.16, "SIB": 466.16, "SI": 493.88
  };
  const ENHARMONIC = {
    "REB": "DO#", "RE#": "MIB", "SOLB": "FA#", "SOL#": "LAB",
    "LA#": "SIB", "LAB": "SOL#", "MIB": "RE#"
  };
  const NOTE_COLORS = {
    "DO": "#ff2244", "DO#": "#ff6600", "REB": "#ff6600", "RE": "#ffee00",
    "RE#": "#aaff00", "MIB": "#aaff00", "MI": "#00ff55", "FA": "#00ffee",
    "FA#": "#0088ff", "SOLB": "#0088ff", "SOL": "#8800ff", "SOL#": "#cc00ff",
    "LAB": "#cc00ff", "LA": "#ff00cc", "LA#": "#ff0077", "SIB": "#ff0077", "SI": "#ff1133"
  };
  const NOTES_LIST = ["DO", "DO#", "RE", "RE#", "MI", "FA", "FA#", "SOL", "SOL#", "LA", "LA#", "SI"];

  function parseDuration(str, bpm) {
    const m = str.match(/^([^.]+)(\.*)$/);
    if (!m) return { beats: 1, duration: 60 / bpm };
    const base = m[1], dots = m[2].length;
    let b;
    switch (base) {
      case '1': b = 4; break; case '2': b = 2; break; case '4': b = 1; break;
      case '8': b = 0.5; break; case '16': b = 0.25; break;
      case '1/2': b = 0.5; break; case '1/4': b = 0.25; break; default: b = 1;
    }
    let add = b;
    for (let i = 0; i < dots; i++) { add /= 2; b += add; }
    return { beats: b, duration: (60 / bpm) * b };
  }

  function parseSimpleToken(raw, bpm) {
    if (!raw) return null;
    const token = raw.toUpperCase();
    const isTied = token.endsWith('-');
    const t = isTied ? token.slice(0, -1) : token;
    const downs = (t.match(/</g) || []).length;
    const ups = (t.match(/>/g) || []).length;
    const octave = 4 - downs + ups;
    const body = t.replace(/[<>]/g, '');
    const isRest = body.startsWith('_');
    let noteName = null;
    if (!isRest) {
      const m = body.match(/^([A-Z]+#?)/);
      if (!m) return null;
      noteName = m[1];
      if (!NOTE_FREQ_BASE[noteName]) return null;
    }
    const afterName = isRest ? body.slice(1) : body.slice((noteName || '').length);
    const { beats, duration } = parseDuration(afterName || '4', bpm);
    const freq = (!isRest) ? NOTE_FREQ_BASE[noteName] * Math.pow(2, octave - 4) : 0;
    const canonName = ENHARMONIC[noteName] || noteName;
    return { freq, duration, beats, isTied, name: noteName || "REST", canonName, octave, original: raw, isRest };
  }

  // ... (El resto de tus funciones internas se quedan exactamente igual)
  function tokenizePart(text, bpm) {
    if (!text || !text.trim()) return [];
    const result = [];
    const upper = text.toUpperCase();
    const regex = /\[([^\]]+)\]([^\s|[({]*)|(\(([^)]+)\))|(\S+)/g;
    let match;
    while ((match = regex.exec(upper)) !== null) {
      if (match[1] !== undefined) {
        const toks = match[1].trim().split(/\s+/), dur = match[2] || '4';
        const isTied = dur.endsWith('-');
        const cd = isTied ? dur.slice(0, -1) : dur;
        const { beats, duration } = parseDuration(cd, bpm);
        const notes = toks.map(t => parseSimpleToken(t, bpm)).filter(Boolean);
        result.push({ isChord: true, notes, beats, duration, isTied, original: `[${match[1]}]${match[2] || '4'}` });
        continue;
      }
      if (match[3] !== undefined) {
        match[4].trim().split(/\s+/).forEach(t => {
          const n = parseSimpleToken(t, bpm);
          if (n) { n.beats *= (2 / 3); n.duration *= (2 / 3); n.original = `(${n.original})`; result.push(n); }
        });
        continue;
      }
      const raw = match[5];
      if (!raw || raw === '|') continue;
      const n = parseSimpleToken(raw, bpm);
      if (n) result.push(n);
    }
    return result;
  }

  function applyTies(notes) {
    if (!notes.length) return [];
    const out = [];
    let i = 0;
    while (i < notes.length) {
      let cur = { ...notes[i] };
      if (!cur.isTied) { out.push(cur); i++; continue; }
      if (i + 1 < notes.length) {
        const nxt = notes[i + 1];
        const canLig = !cur.isChord && !nxt.isChord && cur.canonName === nxt.canonName && cur.octave === nxt.octave;
        if (canLig) {
          cur = { ...cur };
          cur.duration += nxt.duration; cur.beats += nxt.beats; cur.isTied = nxt.isTied;
          cur.original = cur.original.replace(/-$/, '') + '~';
          i += 2;
          while (cur.isTied && i < notes.length) {
            const nn = notes[i];
            if (nn.isChord || nn.canonName !== cur.canonName || nn.octave !== cur.octave) break;
            cur.duration += nn.duration; cur.beats += nn.beats; cur.isTied = nn.isTied;
            cur.original += '~'; i++;
          }
          out.push(cur);
        } else { out.push({ ...cur, isTied: false }); i++; }
      } else { out.push({ ...cur, isTied: false }); i++; }
    }
    return out;
  }

  function parseMeasures(rows, bpm) {
    const melody = [], harmony = [];
    rows.forEach(row => {
      const [m, h] = row.split('|');
      melody.push(applyTies(tokenizePart(m || '', bpm)));
      harmony.push(applyTies(tokenizePart(h || '', bpm)));
    });
    return { melody, harmony };
  }

  function getTargetBeats(timeSignature) {
    return timeSignature === '6/8' ? 3 : parseInt(timeSignature.split('/')[0]);
  }

  function countBeats(text, bpm) {
    const notes = tokenizePart(text.split('|')[0], bpm);
    return notes.reduce((a, n) => a + n.beats, 0);
  }

  function buildScoreData(measureMelody, measureHarmony, timeSignature, bpm) {
    console.log(bpm)
    const tb = getTargetBeats(timeSignature);
    const SUBS = tb * 4;
    return measureMelody.map((mel, mi) => {
      const har = measureHarmony[mi] || [];
      function notesToSegments(notes) {
        const segs = []; let colCursor = 0;
        notes.forEach(note => {
          const cols = Math.max(1, Math.round(note.beats * 4));
          segs.push({ note, startCol: colCursor, cols });
          colCursor += cols;
        });
        if (segs.length > 0) {
          const total = segs.reduce((a, s) => a + s.cols, 0);
          if (total !== SUBS) segs[segs.length - 1].cols += (SUBS - total);
        }
        return segs;
      }
      return { melSegs: notesToSegments(mel), harSegs: notesToSegments(har), SUBS };
    });
  }

  return { NOTE_FREQ_BASE, ENHARMONIC, NOTE_COLORS, NOTES_LIST, parseDuration, parseSimpleToken, tokenizePart, applyTies, parseMeasures, getTargetBeats, countBeats, buildScoreData };
})();

// Exportamos por defecto para que funcione con tus importaciones de Vue
export default Parser;