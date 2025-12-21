'use client';

import { motion } from 'framer-motion';

export function PadSkeleton() {
  return (
    <motion.div
      className="pad-card relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* LED placeholder */}
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-700" />

      {/* Content */}
      <div className="pr-4 space-y-3">
        {/* Client name */}
        <SkeletonBar width="60%" height={14} />

        {/* Description */}
        <div className="space-y-1.5">
          <SkeletonBar width="100%" height={10} />
          <SkeletonBar width="80%" height={10} />
        </div>

        {/* Info row */}
        <div className="flex items-center gap-3">
          <SkeletonBar width="50px" height={8} />
          <SkeletonBar width="70px" height={8} />
        </div>

        {/* Deadline */}
        <SkeletonBar width="80px" height={10} />
      </div>

      {/* Actions placeholder */}
      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-white/5">
        <SkeletonBar width={28} height={28} rounded />
        <SkeletonBar width={28} height={28} rounded />
        <SkeletonBar width={28} height={28} rounded />
      </div>
    </motion.div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="lcd-screen p-4">
      <div className="flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBar key={i} width={24} height={24} rounded />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBar width={12} height={12} rounded />
            <SkeletonBar width={12} height={12} rounded />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-800" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <SkeletonBar width={60} height={10} />
              <SkeletonBar width={50} height={32} />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-800" />

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <SkeletonBar width={80} height={20} />
          <div className="flex items-center gap-2">
            <SkeletonBar width={40} height={16} />
            <SkeletonBar width={40} height={16} />
            <SkeletonBar width={40} height={16} />
          </div>
          <SkeletonBar width={60} height={20} />
        </div>
      </div>
    </div>
  );
}

function SkeletonBar({
  width,
  height,
  rounded = false,
}: {
  width: number | string;
  height: number;
  rounded?: boolean;
}) {
  return (
    <motion.div
      className="relative overflow-hidden"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`,
        borderRadius: rounded ? '4px' : '2px',
        background: 'linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%)',
      }}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

export function SectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <SkeletonBar width={8} height={8} rounded />
        <SkeletonBar width={100} height={14} />
        <SkeletonBar width={30} height={20} rounded />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <PadSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
