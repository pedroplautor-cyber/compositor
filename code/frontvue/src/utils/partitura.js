import { jsPDF } from "jspdf";
import { Renderer, Stave, StaveNote, Beam, Formatter, Dot, Accidental } from "vexflow";

export const PartituraExport = {
  exportToPartitura({
    title,
    bpm,
    timeSignature = "4/4",
    measureMelody = [],
    measureHarmony = [],
    includeHarmony = true
  }) {
    // 1. Crear un Canvas temporal en memoria
    const canvas = document.createElement("canvas");
    canvas.width = 1200; 
    canvas.height = 1600; 
    
    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    const context = renderer.getContext();
    context.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    let startX = 50;
    let startY = 80; 
    const measureWidth = 260; 
    const measuresPerLine = 4;

    const totalMeasures = Math.max(measureMelody.length, measureHarmony.length);

    // --- DIBUJAR COMPÁS POR COMPÁS ---
    for (let i = 0; i < totalMeasures; i++) {
      if (i > 0 && i % measuresPerLine === 0) {
        startX = 50;
        startY += includeHarmony ? 240 : 140; 
      }

      const isFirstInLine = (startX === 50);

      // --- 1. PENTAGRAMA DE LA MELODÍA ---
      const staffMelody = new Stave(startX, startY, measureWidth);
      if (isFirstInLine) {
        staffMelody.addClef("treble").addTimeSignature(timeSignature);
      }
      staffMelody.setContext(context).draw();
      const notesMelody = this._convertToVexFlowNotes(measureMelody[i], "treble");

      // --- 2. PENTAGRAMA DE LA ARMONÍA ---
      let staffHarmony = null;
      let notesHarmony = [];
      if (includeHarmony) {
        staffHarmony = new Stave(startX, startY + 80, measureWidth);
        if (isFirstInLine) {
          staffHarmony.addClef("bass").addTimeSignature(timeSignature);
        }
        staffHarmony.setContext(context).draw();
        notesHarmony = this._convertToVexFlowNotes(measureHarmony[i], "bass");
      }

      // --- 3. FORMATEO Y RENDERIZADO SEGURO MULTIVERSIÓN ---
      // Eliminamos 'Voice' y 'joinVoices' que causaban el TypeError de Softmax
      if (notesMelody.length > 0) {
        Formatter.FormatAndDraw(context, staffMelody, notesMelody);
        try {
          const beams = Beam.generateBeams(notesMelody);
          beams.forEach(b => b.setContext(context).draw());
        } catch (e) {
          console.warn("No se pudieron generar barras de unión en melodía", e);
        }
      }

      if (includeHarmony && notesHarmony.length > 0) {
        Formatter.FormatAndDraw(context, staffHarmony, notesHarmony);
        try {
          const beams = Beam.generateBeams(notesHarmony);
          beams.forEach(b => b.setContext(context).draw());
        } catch (e) {
          console.warn("No se pudieron generar barras de unión en armonía", e);
        }
      }

      startX += measureWidth;
    }

    // --- 4. PASAR EL CANVAS A JSPDF ---
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(title || "Sin Título", 20, 20);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`BPM: ${bpm || 120}  |  Métrica: ${timeSignature}`, 20, 27);

    const imageData = canvas.toDataURL("image/png");
    doc.addImage(imageData, "PNG", 10, 35, 190, 250);

    return doc.output("arraybuffer");
  },

  /**
   * Mapea tus objetos de nota nativos a StaveNote de VexFlow
   */
  _convertToVexFlowNotes(measure, clef) {
    if (!measure || !Array.isArray(measure)) return [];

    const validDurations = {
      "1": "1", "2": "2", "4": "4", "8": "8", "16": "16"
    };

    return measure.map((note, idx) => {
      let rawDuration = note.duration;
      if (typeof rawDuration === 'string') {
        rawDuration = rawDuration.replace(".", "");
      }

      let baseDuration = validDurations[rawDuration] || "4";
      let durationStr = baseDuration;
      
      const isRest = note.isRest || note.pitch === "_" || !note.pitch;
      if (isRest) {
        return new StaveNote({
          clef: clef,
          keys: [clef === "treble" ? "b/4" : "d/3"], 
          duration: baseDuration + "r"     
        });
      }

      const hasDot = note.hasDot || note.dotted || String(note.duration).includes(".");
      if (hasDot) {
        durationStr += "d";
      }

      let keys = [];
      if (note.isChord && Array.isArray(note.notes)) {
        keys = note.notes.map(n => this._formatVexKey(n.pitch || n, n.octave || note.octave || 4));
      } else {
        keys = [this._formatVexKey(note.pitch, note.octave || 4)];
      }

      try {
        const staveNote = new StaveNote({
          clef: clef,
          keys: keys,
          duration: durationStr
        });

        if (hasDot) {
          staveNote.addModifier(new Dot(), 0);
        }

        keys.forEach((key, index) => {
          if (key.includes("#")) {
            staveNote.addModifier(new Accidental("#"), index);
          }
        });

        return staveNote;
      } catch (error) {
        console.error(`Error en nota índice ${idx}:`, note, error);
        return new StaveNote({ clef: clef, keys: [clef === "treble" ? "b/4" : "d/3"], duration: "4r" });
      }
    });
  },

  _formatVexKey(pitch, octave) {
    if (!pitch) return "c/4";
    
    const map = { 
      "DO": "c", "RE": "d", "MI": "e", "FA": "f", 
      "SOL": "g", "LA": "a", "SI": "b" 
    };
    
    // Convertimos TODO a mayúsculas para que acepte tanto "do4" como "DO4"
    const cleanPitch = pitch.replace("#", "").toUpperCase().trim();
    const hasSharp = pitch.includes("#");
    
    let vexLetter = map[cleanPitch] || "c";
    if (hasSharp) vexLetter += "#";
    
    return `${vexLetter}/${octave}`;
  }
  
};