import React from 'react';
import { NoteInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface VisualizerProps {
  activeNote: NoteInfo | null;
  isPulsing?: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ activeNote, isPulsing }) => {
  return (
    <div className="relative w-full h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <AnimatePresence mode="wait">
        {activeNote ? (
          <motion.div
            key={activeNote.note}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              backgroundColor: activeNote.color 
            }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {isPulsing && (
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.2, 0.5]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-white/30 rounded-full blur-3xl"
              />
            )}

            {/* Accessibility Pattern Overlay */}
            <div className={`absolute inset-0 opacity-5 pointer-events-none ${activeNote.pattern}`} />
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="z-10 text-center"
              style={{ color: activeNote.textColor }}
            >
              <h1 className="text-8xl font-bold tracking-tighter mb-2">{activeNote.solfege}</h1>
              <p className="text-2xl font-medium opacity-80 uppercase tracking-widest">{activeNote.note}</p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/30 text-xl font-medium italic"
          >
            Play a note to begin
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
