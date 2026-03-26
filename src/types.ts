export type Solfege = 'Do' | 'Re' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si';

export interface NoteInfo {
  note: string;
  solfege: Solfege;
  frequency: number;
  color: string;
  textColor: string;
  pattern?: string;
  midiNote: number;
  isAccidental?: boolean;
}

export const NOTES: NoteInfo[] = (() => {
  const notes: NoteInfo[] = [];
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const solfeges: Solfege[] = ['Do', 'Do', 'Re', 'Re', 'Mi', 'Fa', 'Fa', 'Sol', 'Sol', 'La', 'La', 'Si'];
  const colors = ['#FF0000', '#800000', '#FF7F00', '#804000', '#FFFF00', '#00FF00', '#008000', '#0000FF', '#000080', '#4B0082', '#250041', '#8B00FF'];
  const textColors = ['#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];
  const patterns = ['pattern-dots', '', 'pattern-lines', '', 'pattern-grid', 'pattern-waves', '', 'pattern-dots', '', 'pattern-lines', '', 'pattern-grid'];

  for (let octave = 2; octave <= 6; octave++) {
    for (let i = 0; i < 12; i++) {
      const isAccidental = names[i].includes('#');
      const midiNote = (octave + 1) * 12 + i;
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      
      notes.push({
        note: `${names[i]}${octave}`,
        solfege: solfeges[i],
        frequency: parseFloat(frequency.toFixed(2)),
        color: colors[i],
        textColor: textColors[i],
        midiNote,
        isAccidental,
        pattern: patterns[i] || undefined
      });
    }
  }
  return notes;
})();

export type AppMode = 'learning' | 'memory' | 'melody' | 'chord';

export type SoundType = 'drone' | 'piano' | 'voice';

export interface ScaleDefinition {
  name: string;
  intervals: number[]; // semitones from root
}

export const SCALES: Record<string, ScaleDefinition> = {
  major: { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: 'Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPentatonic: { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  arabic: { name: 'Arabic Double Harmonic', intervals: [0, 1, 4, 5, 7, 8, 11] },
  chromatic: { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  blues: { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
};

export interface Progression {
  name: string;
  feeling: string;
  chords: string[]; // e.g. ["I", "IV", "V", "I"]
}

export const PROGRESSIONS: Progression[] = [
  { name: 'Traditional', feeling: 'Stable, Classic', chords: ['I', 'IV', 'V', 'I'] },
  { name: 'Jazz Standard', feeling: 'Sophisticated, Resolving', chords: ['ii', 'V', 'I'] },
  { name: '50s Ballad', feeling: 'Nostalgic, Romantic', chords: ['I', 'vi', 'IV', 'V'] },
  { name: 'Epic Pop', feeling: 'Emotional, Powerful', chords: ['vi', 'IV', 'I', 'V'] },
  { name: 'Uplifting', feeling: 'Hopeful, Bright', chords: ['I', 'V', 'vi', 'IV'] },
  { name: 'Dark Heroic', feeling: 'Tense, Epic', chords: ['i', 'VI', 'III', 'VII'] },
  { name: 'Perfect Cadence', feeling: 'Final, Complete', chords: ['V', 'I'] },
  { name: 'Plagal Cadence', feeling: 'Soft, Religious', chords: ['IV', 'I'] },
  { name: 'Deceptive Cadence', feeling: 'Surprising, Suspended', chords: ['V', 'vi'] },
];
