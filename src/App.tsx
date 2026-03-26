/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NoteInfo, NOTES, AppMode, SCALES, PROGRESSIONS, SoundType } from './types';
import { audioService } from './services/audio';
import { Visualizer } from './components/Visualizer';
import { Keyboard } from './components/Keyboard';
import { Staff } from './components/Staff';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Brain, GraduationCap, Piano, Music, Settings2, Square, SkipForward, Eye, EyeOff, Languages, Palette, Activity, Volume2, Mic2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Language, translations } from './i18n';

export default function App() {
  const [mode, setMode] = useState<AppMode>('learning');
  const [language, setLanguage] = useState<Language>('en');
  const [colorMode, setColorMode] = useState<'classic' | 'chromatic'>('classic');
  const [activeNote, setActiveNote] = useState<NoteInfo | null>(null);
  const [viewMode, setViewMode] = useState<'scale' | 'piano'>('piano');
  const [showStaff, setShowStaff] = useState(true);
  const [showMelodySheet, setShowMelodySheet] = useState(false);
  const [octaveOffset, setOctaveOffset] = useState(0);
  
  // Chord Mode State
  const [bpm, setBpm] = useState(120);
  const [rootNote, setRootNote] = useState('C');
  const [scaleType, setScaleType] = useState('major');
  const [soundType, setSoundType] = useState<SoundType>('piano');
  const [isPlayingProgression, setIsPlayingProgression] = useState(false);
  const progressionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[language];
  
  // Chord Mode Logic
  const getScaleNotes = useCallback(() => {
    const scale = SCALES[scaleType];
    if (!scale) return [];
    
    // Find root index in chromatic scale
    const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIdx = chromatic.indexOf(rootNote);
    
    return NOTES.filter(note => {
      const noteName = note.note.replace(/\d/, '');
      const noteIdx = chromatic.indexOf(noteName);
      const diff = (noteIdx - rootIdx + 12) % 12;
      return scale.intervals.includes(diff);
    }).map(n => n.note);
  }, [rootNote, scaleType]);

  const playProgression = (progression: typeof PROGRESSIONS[0]) => {
    if (isPlayingProgression) {
      stopProgression();
      return;
    }

    setIsPlayingProgression(true);
    let currentChordIdx = 0;
    const beatDuration = 60 / bpm;
    
    const playNextChord = () => {
      const chordSymbol = progression.chords[currentChordIdx];
      const frequencies = getChordFrequencies(chordSymbol, rootNote, scaleType);
      audioService.playChord(frequencies, beatDuration * 0.9, soundType);
      
      currentChordIdx = (currentChordIdx + 1) % progression.chords.length;
      progressionIntervalRef.current = setTimeout(playNextChord, beatDuration * 1000);
    };

    playNextChord();
  };

  const stopProgression = () => {
    if (progressionIntervalRef.current) {
      clearTimeout(progressionIntervalRef.current);
      progressionIntervalRef.current = null;
    }
    setIsPlayingProgression(false);
    audioService.stopAll();
  };

  const getChordFrequencies = (symbol: string, root: string, scale: string) => {
    const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIdx = chromatic.indexOf(root);
    
    // Simple chord mapping for common symbols
    // I, ii, iii, IV, V, vi, vii°
    const scaleIntervals = SCALES[scale].intervals;
    const romanToIdx: Record<string, number> = {
      'I': 0, 'i': 0,
      'ii': 1, 'II': 1,
      'iii': 2, 'III': 2,
      'IV': 3, 'iv': 3,
      'V': 4, 'v': 4,
      'vi': 5, 'VI': 5,
      'vii': 6, 'VII': 6,
    };

    const degree = romanToIdx[symbol.replace(/[^a-zA-Z]/g, '')] || 0;
    const chordRootInterval = scaleIntervals[degree % scaleIntervals.length];
    const chordRootIdx = (rootIdx + chordRootInterval) % 12;
    
    // Determine quality (Major/Minor) based on symbol case
    const isMinor = symbol === symbol.toLowerCase();
    const intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
    
    return intervals.map(interval => {
      const noteIdx = (chordRootIdx + interval) % 12;
      const noteName = chromatic[noteIdx];
      // Find frequency in Octave 4
      const note = NOTES.find(n => n.note === `${noteName}4`) || NOTES.find(n => n.note.startsWith(noteName));
      return note?.frequency || 440;
    });
  };

  const visibleNotes = NOTES.filter(note => {
    const octave = parseInt(note.note.match(/\d/)?.[0] || '4');
    return octave >= (3 + octaveOffset) && octave <= (5 + octaveOffset);
  });

  const activeScaleNotes = getScaleNotes();
  const [sequence, setSequence] = useState<NoteInfo[]>([]);
  const [userInput, setUserInput] = useState<NoteInfo[]>([]);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'success' | 'fail'>('idle');

  const audioInitRef = useRef(false);

  // Initialize Audio on first interaction
  const initAudio = async () => {
    if (!audioInitRef.current) {
      await audioService.init();
      audioInitRef.current = true;
    }
  };

  // Handle Note Press
  const handleNotePress = useCallback(async (note: NoteInfo) => {
    await initAudio();
    setActiveNote(note);
    audioService.playNote(note.frequency, note.midiNote, 0.5, soundType);

    if ((mode === 'memory' || mode === 'melody') && gameStatus === 'playing' && !isPlayingSequence) {
      const nextInput = [...userInput, note];
      setUserInput(nextInput);

      // Check if correct
      const isCorrectSoFar = nextInput.every((n, i) => n.note === sequence[i].note);
      
      if (!isCorrectSoFar) {
        setGameStatus('fail');
        // Repeat the sequence after a short delay
        setTimeout(() => {
          setGameStatus('playing');
          playSequence(sequence);
        }, 1000);
      } else if (nextInput.length === sequence.length) {
        setGameStatus('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        if (mode === 'memory') {
          setTimeout(() => nextLevel(), 1500);
        } else {
          // In melody mode, just stay success until reset or next
          setTimeout(() => setGameStatus('idle'), 3000);
        }
      }
    }
  }, [mode, gameStatus, isPlayingSequence, sequence, userInput, soundType]);

  const handleNotePressRef = useRef(handleNotePress);
  useEffect(() => {
    handleNotePressRef.current = handleNotePress;
  }, [handleNotePress]);

  // MIDI Support
  useEffect(() => {
    if (typeof navigator.requestMIDIAccess !== 'function') return;

    let midiAccess: MIDIAccess | null = null;

    const onMIDIMessage = (event: any) => {
      const [status, note, velocity] = event.data;
      const type = status & 0xf0;
      
      if (type === 144 && velocity > 0) { // Note On
        const foundNote = NOTES.find(n => n.midiNote === note);
        if (foundNote) {
          handleNotePressRef.current(foundNote);
        }
      }
    };

    (navigator as any).requestMIDIAccess().then((access: any) => {
      midiAccess = access;
      for (const input of access.inputs.values()) {
        input.onmidimessage = onMIDIMessage;
      }
    }).catch((err: any) => console.error('MIDI Access Denied', err));

    return () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, []);

  // Memory Game Logic
  const startMemoryGame = () => {
    setMode('memory');
    setGameStatus('playing');
    const firstNote = visibleNotes[Math.floor(Math.random() * visibleNotes.length)];
    playSequence([firstNote]);
  };

  // Melody Game Logic
  const startMelodyMode = () => {
    setMode('melody');
    setGameStatus('playing');
    setShowMelodySheet(false);
    
    // Generate a simple melody from visible notes
    const melodies = [
      ['C', 'C', 'G', 'G', 'A', 'A', 'G'], // Twinkle
      ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D'], // Ode to Joy
      ['G', 'E', 'E', 'F', 'D', 'D', 'C', 'E', 'G'], // Simple tune
      ['C', 'D', 'E', 'C', 'C', 'D', 'E', 'C'], // Frere Jacques
    ];
    
    const selectedMelodyNames = melodies[Math.floor(Math.random() * melodies.length)];
    const baseOctave = 4 + octaveOffset;
    const newSequence = selectedMelodyNames.map(n => visibleNotes.find(note => note.note === `${n}${baseOctave}`) || visibleNotes.find(note => note.note.startsWith(n))!).filter(Boolean);
    
    playSequence(newSequence);
  };

  const skipSequence = () => {
    if (mode === 'memory') {
      nextLevel();
    } else if (mode === 'melody') {
      startMelodyMode();
    }
  };

  const playSequence = async (newSequence: NoteInfo[]) => {
    setIsPlayingSequence(true);
    setSequence(newSequence);
    setUserInput([]);
    
    for (const note of newSequence) {
      setActiveNote(note);
      audioService.playNote(note.frequency, note.midiNote, 0.6);
      await new Promise(r => setTimeout(r, 800));
    }
    
    setActiveNote(null);
    setIsPlayingSequence(false);
  };

  const nextLevel = () => {
    const nextNote = visibleNotes[Math.floor(Math.random() * visibleNotes.length)];
    const newSequence = [...sequence, nextNote];
    playSequence(newSequence);
    setGameStatus('playing');
  };

  const resetGame = () => {
    setSequence([]);
    setUserInput([]);
    setGameStatus('idle');
    setActiveNote(null);
  };

  // Learning Mode Drone
  useEffect(() => {
    if (mode === 'learning') {
      if (activeNote) {
        audioService.playDrone(activeNote.frequency, soundType);
      } else {
        audioService.stopAll();
      }
    }
  }, [mode, activeNote, soundType]);

  // Cleanup on mode change
  useEffect(() => {
    if (mode !== 'learning') {
      audioService.stopAll();
    }
  }, [mode]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/20">
      {/* Header */}
      <header className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ChromaSolfege</h1>
            <p className="text-xs text-white/40 uppercase tracking-widest font-medium">{t.subtitle}</p>
          </div>
        </div>

        <nav className="flex bg-white/5 p-1 rounded-2xl backdrop-blur-md border border-white/10">
          <button 
            onClick={() => { setMode('learning'); resetGame(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${mode === 'learning' ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5'}`}
          >
            <GraduationCap className="w-4 h-4" />
            <span className="text-sm font-semibold">{t.learning}</span>
          </button>
          <button 
            onClick={() => { setMode('memory'); resetGame(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${mode === 'memory' ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5'}`}
          >
            <Brain className="w-4 h-4" />
            <span className="text-sm font-semibold">{t.memory}</span>
          </button>
          <button 
            onClick={() => { setMode('melody'); resetGame(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${mode === 'melody' ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5'}`}
          >
            <Music className="w-4 h-4" />
            <span className="text-sm font-semibold">{t.melody}</span>
          </button>
          <button 
            onClick={() => { setMode('chord'); resetGame(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${mode === 'chord' ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5'}`}
          >
            <Activity className="w-4 h-4" />
            <span className="text-sm font-semibold">{t.chord}</span>
          </button>
        </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1 mr-2">
              <button 
                onClick={() => setOctaveOffset(o => Math.max(-1, o - 1))}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-white/60 font-bold"
                disabled={octaveOffset <= -1}
              >
                -
              </button>
              <div className="px-2 text-[10px] uppercase tracking-widest text-white/40 font-bold">Oct</div>
              <button 
                onClick={() => setOctaveOffset(o => Math.min(1, o + 1))}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-white/60 font-bold"
                disabled={octaveOffset >= 1}
              >
                +
              </button>
            </div>
            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'pt' : 'en')}
            className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-xl transition-colors border border-white/10"
            title="Toggle Language"
          >
            <Languages className="w-4 h-4 text-white/60" />
            <span className="text-xs font-bold uppercase">{language}</span>
          </button>
          <button 
            onClick={() => setColorMode(m => m === 'classic' ? 'chromatic' : 'classic')}
            className={`p-2 rounded-xl transition-all border ${colorMode === 'chromatic' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'hover:bg-white/5 border-white/10 text-white/60'}`}
            title={t.toggleColorMode}
          >
            <Palette className="w-5 h-5" />
          </button>
           <button 
            onClick={() => setViewMode(v => v === 'piano' ? 'scale' : 'piano')}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
            title={t.toggleKeyboard}
          >
            <Piano className="w-5 h-5 text-white/60" />
          </button>
          <button 
            onClick={() => setShowStaff(s => !s)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
            title={t.toggleStaff}
          >
            <Settings2 className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-8">
        {/* Top Section: Visualizer & Staff */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Visualizer activeNote={activeNote} isPulsing={mode === 'learning'} />
          
          <div className="flex flex-col gap-6">
            <AnimatePresence>
              {showStaff && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <Staff activeNote={activeNote} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Game Controls */}
            {(mode === 'memory' || mode === 'melody') && (
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">
                    {mode === 'memory' ? t.memoryChallenge : t.melodyMaster}
                  </h3>
                  <div className="flex items-center gap-3">
                    {mode === 'melody' && (
                      <button 
                        onClick={() => setShowMelodySheet(!showMelodySheet)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60"
                        title={showMelodySheet ? t.hideSheet : t.showSheet}
                      >
                        {showMelodySheet ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                    <div className="text-sm font-mono bg-white/10 px-3 py-1 rounded-full">
                      {mode === 'memory' ? `${t.level}: ${sequence.length}` : `${t.length}: ${sequence.length}`}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {gameStatus === 'idle' ? (
                    <button 
                      onClick={mode === 'memory' ? startMemoryGame : startMelodyMode}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      <Play className="w-5 h-5" /> {mode === 'memory' ? t.startGame : t.newMelody}
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={resetGame}
                        className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <RotateCcw className="w-5 h-5" /> {t.reset}
                      </button>
                      <button 
                        onClick={skipSequence}
                        className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-white/10"
                      >
                        <SkipForward className="w-5 h-5" /> {t.skip}
                      </button>
                    </div>
                  )}
                </div>

                {gameStatus !== 'idle' && (
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {sequence.map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3 h-3 rounded-full transition-all ${
                          i < userInput.length ? 'bg-green-500 scale-110' : 
                          (gameStatus === 'fail' && i === userInput.length) ? 'bg-red-500 animate-pulse' : 'bg-white/20'
                        }`} 
                      />
                    ))}
                  </div>
                )}

                {showMelodySheet && sequence.length > 0 && (
                  <div className="mt-4 p-4 bg-white rounded-xl overflow-x-auto">
                    <div className="flex gap-4 min-w-max">
                      {sequence.map((note, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="w-12 h-24 relative">
                             <Staff activeNote={note} />
                          </div>
                          <span className="text-[10px] text-black font-bold">{note.solfege}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chord Mode Controls */}
            {mode === 'chord' && (
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">{t.chordExplorer}</h3>
                  <div className="flex gap-2">
                    {(['drone', 'piano', 'voice'] as SoundType[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSoundType(s)}
                        className={`p-2 rounded-lg transition-all border ${soundType === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                        title={s.toUpperCase()}
                      >
                        {s === 'drone' ? <Activity className="w-4 h-4" /> : s === 'piano' ? <Volume2 className="w-4 h-4" /> : <Mic2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t.root}</label>
                    <select 
                      value={rootNote}
                      onChange={(e) => setRootNote(e.target.value)}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                        <option key={n} value={n} className="bg-zinc-900">{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t.scale}</label>
                    <select 
                      value={scaleType}
                      onChange={(e) => setScaleType(e.target.value)}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(SCALES).map(([key, scale]) => (
                        <option key={key} value={key} className="bg-zinc-900">{scale.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t.bpm}</label>
                    <span className="text-xs font-mono text-indigo-400">{bpm}</span>
                  </div>
                  <input 
                    type="range" 
                    min="40" 
                    max="240" 
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t.progression}</label>
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {PROGRESSIONS.map((prog, i) => (
                      <button
                        key={i}
                        onClick={() => playProgression(prog)}
                        className={`flex flex-col items-start p-3 rounded-xl border transition-all ${isPlayingProgression && progressionIntervalRef.current ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                      >
                        <div className="flex justify-between w-full items-center mb-1">
                          <span className="text-sm font-bold">{prog.name}</span>
                          <span className="text-[10px] font-mono text-white/40">{prog.chords.join(' - ')}</span>
                        </div>
                        <span className="text-[10px] italic text-indigo-400">{prog.feeling}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Learning Mode Controls */}
            {mode === 'learning' && (
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold">{t.droneLearning}</h3>
                  <div className="flex gap-2">
                    {(['drone', 'piano', 'voice'] as SoundType[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSoundType(s)}
                        className={`p-2 rounded-lg transition-all border ${soundType === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                        title={s.toUpperCase()}
                      >
                        {s === 'drone' ? <Activity className="w-4 h-4" /> : s === 'piano' ? <Volume2 className="w-4 h-4" /> : <Mic2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">
                  {t.droneDesc}
                </p>
                
                {activeNote && (
                  <button 
                    onClick={() => setActiveNote(null)}
                    className="flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-2xl font-bold transition-all border border-red-500/30"
                  >
                    <Square className="w-4 h-4 fill-current" /> {t.stopDrone}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Section */}
        <div className="mt-auto">
          <Keyboard 
            notes={visibleNotes}
            activeNote={activeNote} 
            onNotePress={handleNotePress} 
            viewMode={viewMode}
            language={language}
            colorMode={colorMode}
            activeScaleNotes={mode === 'chord' ? activeScaleNotes : undefined}
          />
        </div>
      </main>

      {/* Footer / Info */}
      <footer className="p-8 text-center text-white/20 text-xs uppercase tracking-[0.2em] font-medium">
        {t.footer}
      </footer>
    </div>
  );
}
