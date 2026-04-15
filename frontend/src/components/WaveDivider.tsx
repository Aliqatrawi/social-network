interface WaveDividerProps {
  flip?: boolean;
  className?: string;
}

export function WaveDivider({
  flip = false,
  className = "fill-background",
}: WaveDividerProps) {
  return (
    <div
      className={`w-full overflow-hidden leading-none ${flip ? "rotate-180" : ""}`}
    >
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className={`relative block w-full h-16 sm:h-20 md:h-24 ${className}`}
      >
        <path d="M0,0 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z" />
      </svg>
    </div>
  );
}
