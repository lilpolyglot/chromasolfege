import React from 'react';
import { NoteInfo, NOTES } from '../types';
import { motion } from 'motion/react';
import { Language, translations } from '../i18n';

interface KeyboardProps {
  notes: NoteInfo[];
  onNotePress: (note: NoteInfo) => void;
  activeNote: NoteInfo | null;
  viewMode: 'scale' | 'piano';
  language: Language;
  colorMode: 'classic' | 'chromatic';
  activeScaleNotes?: string[]; // e.g. ["C4", "D4", "E4"...]
}

export const Keyboard: React.FC<KeyboardProps> = ({ notes, onNotePress, activeNote, viewMode, language, colorMode, activeScaleNotes }) => {
  const whiteKeys = notes.filter(n => !n.isAccidental);
  const blackKeys = notes.filter(n => n.isAccidental);
  const t = translations[language];

  const isInScale = (note: string) => {
    if (!activeScaleNotes) return true;
    return activeScaleNotes.includes(note);
  };

  const getWhiteKeyBg = (note: NoteInfo) => {
    if (activeNote?.note === note.note) return note.color;
    if (!isInScale(note.note)) return '#e5e7eb'; // Dimmed gray
    return colorMode === 'chromatic' ? note.color : '#FFFFFF';
  };

  const getWhiteKeyText = (note: NoteInfo) => {
    if (activeNote?.note === note.note) return note.textColor;
    if (!isInScale(note.note)) return '#9ca3af'; // Dimmed text
    return colorMode === 'chromatic' ? note.textColor : '#000000';
  };

  const getBlackKeyBg = (note: NoteInfo) => {
    if (activeNote?.note === note.note) return note.color;
    if (!isInScale(note.note)) return '#374151'; // Dimmed dark gray
    return colorMode === 'chromatic' ? note.color : '#1a1a1a';
  };

  if (viewMode === 'scale') {
    return (
      <div className="flex justify-center flex-wrap gap-2 p-4 w-full">
        {whiteKeys.map((note) => (
          <motion.button
            key={note.note}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNotePress(note)}
            className={`
              relative flex flex-col items-center justify-center rounded-2xl transition-all
              w-24 h-24 shadow-lg
              ${activeNote?.note === note.note ? 'ring-4 ring-white/50 scale-105' : ''}
            `}
            style={{ 
              backgroundColor: getWhiteKeyBg(note),
              color: getWhiteKeyText(note)
            }}
          >
            <div className="font-bold text-xl z-10">{(t.solfege as any)[note.solfege]}</div>
            <div className="text-xs opacity-70 z-10">{note.note}</div>
            {(activeNote?.note === note.note || colorMode === 'chromatic') && (
              <div className={`absolute inset-0 opacity-10 pointer-events-none ${note.pattern}`} />
            )}
          </motion.button>
        ))}
      </div>
    );
  }

  // Piano View
  return (
    <div className="relative flex justify-center p-4 overflow-x-auto w-full min-h-[250px]">
      <div className="relative flex">
        {/* White Keys */}
        {whiteKeys.map((note) => (
          <motion.button
            key={note.note}
            whileTap={{ scale: 0.98, y: 2 }}
            onClick={() => onNotePress(note)}
            className={`
              relative flex flex-col items-center justify-end pb-8 border border-black/10 rounded-b-2xl transition-all
              w-16 h-64 z-0
              ${activeNote?.note === note.note ? 'brightness-110 shadow-inner' : 'shadow-md'}
            `}
            style={{ 
              backgroundColor: getWhiteKeyBg(note),
              color: getWhiteKeyText(note)
            }}
          >
            <div className="font-bold text-base z-10">{(t.solfege as any)[note.solfege]}</div>
            <div className="text-xs opacity-50 z-10">{note.note}</div>
            {(activeNote?.note === note.note || colorMode === 'chromatic') && (
              <div className={`absolute inset-0 opacity-20 pointer-events-none ${note.pattern}`} />
            )}
          </motion.button>
        ))}

        {/* Black Keys */}
        {blackKeys.map((note) => {
          // Calculate position based on the white key it follows
          // C# follows C, D# follows D, etc.
          const baseNote = note.note.replace('#', '');
          const whiteIndex = whiteKeys.findIndex(w => w.note === baseNote);
          if (whiteIndex === -1) return null;

          // Offset is (index * width) + (width * 0.7)
          // White key width is now 64px.
          const leftOffset = (whiteIndex * 64) + 44;

          return (
            <motion.button
              key={note.note}
              whileTap={{ scale: 0.95, y: 1 }}
              onClick={() => onNotePress(note)}
              className={`
                absolute top-0 flex flex-col items-center justify-end pb-6 border border-white/10 rounded-b-xl transition-all
                w-10 h-40 z-10
                ${activeNote?.note === note.note ? 'brightness-125' : 'shadow-xl'}
              `}
              style={{ 
                left: `${leftOffset}px`,
                backgroundColor: getBlackKeyBg(note),
                color: '#FFFFFF'
              }}
            >
              <div className="text-xs font-bold z-10">{(t.solfege as any)[note.solfege]}#</div>
              <div className="text-[10px] opacity-50 z-10">{note.note}</div>
              {colorMode === 'chromatic' && (
                <div className={`absolute inset-0 opacity-10 pointer-events-none ${note.pattern}`} />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
