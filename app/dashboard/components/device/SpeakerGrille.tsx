'use client';

interface SpeakerGrilleProps {
  rows?: number;
  cols?: number;
}

export default function SpeakerGrille({ rows = 8, cols = 12 }: SpeakerGrilleProps) {
  return (
    <div
      className="speaker-grille"
      style={{
        width: cols * 8,
        height: rows * 8,
        backgroundSize: '8px 8px',
      }}
    />
  );
}
