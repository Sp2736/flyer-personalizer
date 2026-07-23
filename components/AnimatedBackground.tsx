'use client';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0B0B12]">
      {/* Dynamic Ambient Gradient Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-700/30 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] bg-pink-600/20 rounded-full blur-3xl animate-float-reverse" />
      <div className="absolute -bottom-40 left-1/4 w-[32rem] h-[32rem] bg-amber-500/15 rounded-full blur-3xl animate-float-slow" />

      {/* Subtle Grain Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
