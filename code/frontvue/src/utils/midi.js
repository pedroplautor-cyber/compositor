// ── MIDI EXPORT MODULE ─────────────────────────────────────────────────────────
const MidiExport = (() => {

  function frequencyToMidi(freq) {
    if (!freq || freq <= 0) return 60;
    return Math.round(12 * Math.log2(freq / 440) + 69);
  }

  function encodeVariableLength(val) {
    const bytes = [val & 0x7F]; val >>= 7;
    while (val) { bytes.unshift((val & 0x7F) | 0x80); val >>= 7; }
    return bytes;
  }

  function constructTrack(events) {
    let data = []; let lastTick = 0;
    for (let evt of events) {
      const delta = evt.tick - lastTick;
      data.push(...encodeVariableLength(delta));
      if (evt.type === 'meta') {
        data.push(0xFF, evt.data.type);
        if (evt.data.type === 0x03) {
          const text = evt.data.text;
          data.push(text.length, ...Array.from(text).map(c => c.charCodeAt(0)));
        } else if (evt.data.type === 0x51) {
          data.push(3, (evt.data.tempo >> 16) & 0xFF, (evt.data.tempo >> 8) & 0xFF, evt.data.tempo & 0xFF);
        } else if (evt.data.type === 0x58) {
          data.push(4, evt.data.numerator, Math.log2(evt.data.denominator), 0x18, 0x08);
        }
      } else if (evt.type === 'noteOn') {
        data.push(0x90 | evt.channel, evt.note, evt.velocity);
      } else if (evt.type === 'noteOff') {
        data.push(0x80 | evt.channel, evt.note, 0x40);
      }
      lastTick = evt.tick;
    }
    data.push(0x00, 0xFF, 0x2F, 0x00);
    return data;
  }

  function buildMidiFile(tracks, ticksPerBeat) {
    const data = [];
    data.push(0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, tracks.length,
      (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF);
    for (let track of tracks) {
      data.push(0x4D, 0x54, 0x72, 0x6B,
        (track.length >> 24) & 0xFF, (track.length >> 16) & 0xFF,
        (track.length >> 8) & 0xFF, track.length & 0xFF, ...track);
    }
    return new Uint8Array(data);
  }

  function exportToMidi({ title, bpm, timeSignature, measureMelody, measureHarmony, includeHarmony, separateChannels }) {
    const ticksPerBeat = 480;
    const quarterNoteDuration = 60000000 / bpm;
    const [tsNum, tsDen] = timeSignature.split('/').map(Number);
    const beatType = 4 / tsDen;
    let events = [];
    let currentTick = 0;
    events.push({ tick: 0, type: 'meta', data: { type: 0x03, text: title } });
    events.push({ tick: 0, type: 'meta', data: { type: 0x51, tempo: Math.round(quarterNoteDuration) } });
    events.push({ tick: 0, type: 'meta', data: { type: 0x58, numerator: tsNum, denominator: tsDen } });

    const melodyChannel = 0, harmonyStartChannel = 1, drumChannel = 9;

    measureMelody.forEach((melody, mi) => {
      const harmony = measureHarmony[mi] || [];
      melody.forEach(note => {
        const ticks = Math.round(note.beats * ticksPerBeat * beatType);
        if (!note.isRest) {
          const midiNote = frequencyToMidi(note.freq);
          events.push({ tick: currentTick, type: 'noteOn', channel: melodyChannel, note: midiNote, velocity: 100 });
          events.push({ tick: currentTick + ticks, type: 'noteOff', channel: melodyChannel, note: midiNote });
        }
        if (note.isChord && note.notes) {
          note.notes.forEach(n => {
            const midiNote = frequencyToMidi(n.freq);
            events.push({ tick: currentTick, type: 'noteOn', channel: melodyChannel, note: midiNote, velocity: 80 });
            events.push({ tick: currentTick + ticks, type: 'noteOff', channel: melodyChannel, note: midiNote });
          });
        }
        currentTick += ticks;
      });

      if (includeHarmony) {
        let harmonyTick = currentTick - melody.reduce((a, n) => a + Math.round(n.beats * ticksPerBeat * beatType), 0);
        harmony.forEach((note, hi) => {
          const ticks = Math.round(note.beats * ticksPerBeat * beatType);
          const harmonyChannel = separateChannels ? Math.min(harmonyStartChannel + hi, 15) : melodyChannel;
          if (!note.isRest) {
            const midiNote = frequencyToMidi(note.freq);
            events.push({ tick: harmonyTick, type: 'noteOn', channel: harmonyChannel, note: midiNote, velocity: 70 });
            events.push({ tick: harmonyTick + ticks, type: 'noteOff', channel: harmonyChannel, note: midiNote });
          }
          if (note.isChord && note.notes) {
            note.notes.forEach(n => {
              const midiNote = frequencyToMidi(n.freq);
              events.push({ tick: harmonyTick, type: 'noteOn', channel: harmonyChannel, note: midiNote, velocity: 60 });
              events.push({ tick: harmonyTick + ticks, type: 'noteOff', channel: harmonyChannel, note: midiNote });
            });
          }
          harmonyTick += ticks;
        });
      }
    });

    const beatTicks = ticksPerBeat * beatType;
    const tb = tsNum;
    let percTick = 0;
    for (let i = 0; i < measureMelody.length * tb; i++) {
      const kickNote = 36, snareNote = 38;
      const note = i % tb === 0 ? kickNote : snareNote;
      events.push({ tick: percTick, type: 'noteOn', channel: drumChannel, note, velocity: 100 });
      events.push({ tick: percTick + Math.round(beatTicks * 0.3), type: 'noteOff', channel: drumChannel, note });
      percTick += beatTicks;
    }

    events.sort((a, b) => a.tick - b.tick);
    const tracks = [constructTrack(events)];
    return buildMidiFile(tracks, ticksPerBeat);
  }

  return { exportToMidi };
})();

export default MidiExport;
