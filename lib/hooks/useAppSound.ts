'use client';

import { useCallback, useRef, useEffect } from 'react';

// Sound types available in the app
type SoundType = 'click' | 'success' | 'error' | 'whoosh' | 'tick' | 'notification';

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Generate synthetic sounds using Web Audio API
function createSound(type: SoundType): () => void {
  return () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (type) {
        case 'click':
          // Short mechanical click
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(800, now);
          oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.05);
          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          oscillator.start(now);
          oscillator.stop(now + 0.05);
          break;

        case 'success':
          // Satisfying success beep (two tones going up)
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523.25, now); // C5
          oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;

        case 'error':
          // Low buzz for error
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(150, now);
          oscillator.frequency.setValueAtTime(100, now + 0.1);
          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;

        case 'whoosh':
          // Soft whoosh for refresh/transitions
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          gainNode.gain.setValueAtTime(0.08, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;

        case 'tick':
          // Subtle tick for hover/interactions
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1200, now);
          gainNode.gain.setValueAtTime(0.05, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
          oscillator.start(now);
          oscillator.stop(now + 0.02);
          break;

        case 'notification':
          // Attention-grabbing notification
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, now); // A5
          oscillator.frequency.setValueAtTime(1108.73, now + 0.1); // C#6
          oscillator.frequency.setValueAtTime(880, now + 0.2); // A5
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.setValueAtTime(0.2, now + 0.2);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          oscillator.start(now);
          oscillator.stop(now + 0.35);
          break;
      }
    } catch {
      // Audio not supported or blocked
    }
  };
}

export function useAppSound(enabled: boolean = true) {
  const soundsRef = useRef<Record<SoundType, () => void> | null>(null);

  // Initialize sounds lazily
  useEffect(() => {
    if (typeof window !== 'undefined' && !soundsRef.current) {
      soundsRef.current = {
        click: createSound('click'),
        success: createSound('success'),
        error: createSound('error'),
        whoosh: createSound('whoosh'),
        tick: createSound('tick'),
        notification: createSound('notification'),
      };
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (enabled && !prefersReducedMotion && soundsRef.current) {
      soundsRef.current[type]();
    }
  }, [enabled]);

  return {
    playClick: useCallback(() => playSound('click'), [playSound]),
    playSuccess: useCallback(() => playSound('success'), [playSound]),
    playError: useCallback(() => playSound('error'), [playSound]),
    playWhoosh: useCallback(() => playSound('whoosh'), [playSound]),
    playTick: useCallback(() => playSound('tick'), [playSound]),
    playNotification: useCallback(() => playSound('notification'), [playSound]),
    playSound,
  };
}
