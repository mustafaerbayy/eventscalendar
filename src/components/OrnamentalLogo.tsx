interface OrnamentalLogoProps {
  className?: string;
}

const OrnamentalLogo = ({ className = "h-8 w-8" }: OrnamentalLogoProps) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B8860B" />
          <stop offset="50%" stopColor="#DAA520" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <radialGradient id="centerGlow">
          <stop offset="0%" stopColor="#E0C097" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B8860B" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      
      {/* Outer decorative ring */}
      <circle cx="50" cy="50" r="48" fill="url(#goldGradient)" opacity="0.15" />
      
      {/* Ornamental petals - outer layer */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x = 50 + 38 * Math.cos(angle);
        const y = 50 + 38 * Math.sin(angle);
        return (
          <g key={`petal-outer-${i}`} transform={`rotate(${i * 30} 50 50)`}>
            <ellipse
              cx="50"
              cy="12"
              rx="4"
              ry="8"
              fill="url(#goldGradient)"
              opacity="0.8"
            />
          </g>
        );
      })}
      
      {/* Middle decorative layer */}
      <circle cx="50" cy="50" r="36" fill="url(#blueGradient)" opacity="0.9" />
      
      {/* Geometric pattern - middle */}
      {[...Array(8)].map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        return (
          <g key={`pattern-middle-${i}`} transform={`rotate(${i * 45} 50 50)`}>
            <path
              d="M 50 14 Q 55 20, 50 26 Q 45 20, 50 14"
              fill="#DAA520"
              opacity="0.7"
            />
            <path
              d="M 50 16 L 52 22 L 50 24 L 48 22 Z"
              fill="#8B6914"
              opacity="0.8"
            />
          </g>
        );
      })}
      
      {/* Inner decorative ring */}
      <circle cx="50" cy="50" r="28" fill="url(#goldGradient)" opacity="0.3" />
      <circle cx="50" cy="50" r="26" fill="url(#blueGradient)" stroke="#B8860B" strokeWidth="1.5" />
      
      {/* Inner ornamental stars */}
      {[...Array(8)].map((_, i) => {
        return (
          <g key={`star-inner-${i}`} transform={`rotate(${i * 45} 50 50)`}>
            <circle cx="50" cy="24" r="2.5" fill="#DAA520" />
            <circle cx="50" cy="24" r="1.5" fill="#E0C097" />
          </g>
        );
      })}
      
      {/* Center medallion */}
      <circle cx="50" cy="50" r="18" fill="url(#centerGlow)" />
      <circle cx="50" cy="50" r="16" fill="#064e3b" stroke="#DAA520" strokeWidth="2" opacity="0.95" />
      
      {/* Center pattern */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * 60 * Math.PI) / 180;
        const x1 = 50 + 8 * Math.cos(angle);
        const y1 = 50 + 8 * Math.sin(angle);
        const x2 = 50 + 12 * Math.cos(angle);
        const y2 = 50 + 12 * Math.sin(angle);
        return (
          <g key={`center-${i}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B8860B" strokeWidth="1.5" opacity="0.8" />
            <circle cx={x2} cy={y2} r="1.5" fill="#DAA520" />
          </g>
        );
      })}
      
      {/* Center star */}
      <circle cx="50" cy="50" r="5" fill="#DAA520" />
      <circle cx="50" cy="50" r="3" fill="#E0C097" />
      <circle cx="50" cy="50" r="1.5" fill="#8B6914" />
      
      {/* Decorative connecting patterns */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x = 50 + 32 * Math.cos(angle);
        const y = 50 + 32 * Math.sin(angle);
        return (
          <circle key={`dot-${i}`} cx={x} cy={y} r="1" fill="#B8860B" opacity="0.6" />
        );
      })}
    </svg>
  );
};

export default OrnamentalLogo;
