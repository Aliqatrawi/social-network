export function WaveBackground() {
  return (
    <div className="absolute bottom-0 left-0 w-full h-44 overflow-hidden pointer-events-none">
      {/* Wave Layer 1 — Back, most transparent */}
      <svg
        className="absolute bottom-0 left-0 w-full h-28 opacity-15"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z"
          className="fill-primary"
        />
      </svg>

      {/* Wave Layer 2 — Middle */}
      <svg
        className="absolute bottom-0 left-0 w-full h-24 opacity-25"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 C150,20 350,100 600,40 C850,0 1050,100 1200,80 L1200,120 L0,120 Z"
          className="fill-secondary"
        />
      </svg>

      {/* Wave Layer 3 — Front, most visible */}
      <svg
        className="absolute bottom-0 left-0 w-full h-20 opacity-20"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,90 C300,30 500,110 800,50 C1100,10 1100,90 1200,70 L1200,120 L0,120 Z"
          className="fill-primary"
        />
      </svg>
    </div>
  );
}
