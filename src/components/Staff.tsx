import React from 'react';
import { NoteInfo } from '../types';

interface StaffProps {
  activeNote: NoteInfo | null;
}

export const Staff: React.FC<StaffProps> = ({ activeNote }) => {
  // Simple SVG staff
  // Lines: E4, G4, B4, D5, F5
  // Notes: C4 is below the staff with a ledger line
  
  const lines = [40, 60, 80, 100, 120]; // Y coordinates for E4 to F5
  
  const getNotePosition = (note: string) => {
    const noteName = note.replace(/\d/, '');
    const octave = parseInt(note.match(/\d/)?.[0] || '4');
    
    const letterMap: Record<string, number> = {
      'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
    };
    
    const letterIndex = letterMap[noteName.replace('#', '')] || 0;
    
    // Base position for C4 is 140
    // Each octave is 70 units (7 steps * 10)
    // Each letter step is 10 units
    return 140 - (octave - 4) * 70 - (letterIndex * 10);
  };

  const noteY = activeNote ? getNotePosition(activeNote.note) : null;
  const isSharp = activeNote?.note.includes('#');

  // Ledger lines logic
  const getLedgerLines = (y: number) => {
    const ledgerLines = [];
    // Bottom ledger lines (below E4 = 120)
    if (y >= 140) {
      for (let currY = 140; currY <= y; currY += 20) {
        ledgerLines.push(currY);
      }
    }
    // Top ledger lines (above F5 = 40)
    if (y <= 20) {
      for (let currY = 20; currY >= y; currY -= 20) {
        ledgerLines.push(currY);
      }
    }
    return ledgerLines;
  };

  const ledgerLines = noteY !== null ? getLedgerLines(noteY) : [];

  return (
    <div className="w-full max-w-md mx-auto bg-white p-4 rounded-xl shadow-inner border border-black/5">
      <svg viewBox="0 0 400 220" className="w-full h-auto">
        {/* Staff Lines */}
        {lines.map((y, i) => (
          <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="black" strokeWidth="1" />
        ))}
        
        {/* Clef (Simplified) */}
        <text x="20" y="115" fontSize="80" className="select-none pointer-events-none">𝄞</text>

        {/* Active Note */}
        {activeNote && noteY !== null && (
          <g>
            {/* Ledger lines */}
            {ledgerLines.map((y, i) => (
              <line key={i} x1="185" y1={y} x2="215" y2={y} stroke="black" strokeWidth="1" />
            ))}

            {/* Sharp Symbol */}
            {isSharp && (
              <text x="170" y={noteY + 8} fontSize="24" fontWeight="bold">♯</text>
            )}

            <ellipse 
              cx="200" 
              cy={noteY} 
              rx="12" 
              ry="8" 
              fill={activeNote.color} 
              stroke="black" 
              strokeWidth="2"
              transform={`rotate(-20, 200, ${noteY})`}
            />
            
            {/* Stem direction */}
            {noteY < 80 ? (
              <line x1="189" y1={noteY} x2="189" y2={noteY + 40} stroke="black" strokeWidth="1.5" />
            ) : (
              <line x1="211" y1={noteY} x2="211" y2={noteY - 40} stroke="black" strokeWidth="1.5" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
};
