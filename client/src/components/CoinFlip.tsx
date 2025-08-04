import { useEffect, useState } from "react";

interface CoinFlipProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  selectedSide: 'heads' | 'tails';
}

export default function CoinFlip({ isFlipping, result, selectedSide }: CoinFlipProps) {
  const [displaySide, setDisplaySide] = useState<'heads' | 'tails'>('heads');

  useEffect(() => {
    if (result) {
      setDisplaySide(result);
    }
  }, [result]);

  const coinClasses = `
    w-32 h-32 md:w-40 md:h-40 rounded-full coin-shadow cursor-pointer transition-all duration-300 hover:scale-110 relative
    ${isFlipping ? 'animate-coin-flip' : ''}
  `;

  const getIndicatorColor = () => {
    if (!result) return 'bg-gray-400';
    return result === selectedSide ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className="relative">
      <div className={coinClasses} data-testid="coin-display">
        {/* Coin Face */}
        <div className={`w-full h-full rounded-full flex items-center justify-center relative ${
          displaySide === 'heads' 
            ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600' 
            : 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600'
        }`}>
          {/* Outer ring */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-amber-200/40 flex items-center justify-center relative overflow-hidden">
            {/* Inner coin design */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center relative">
              {displaySide === 'heads' ? (
                <div className="text-amber-900 flex items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold">H</span>
                </div>
              ) : (
                <div className="text-amber-900 flex items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold">T</span>
                </div>
              )}
            </div>
            
            {/* Coin edge ridges */}
            <div className="absolute inset-0 rounded-full" style={{
              background: `conic-gradient(
                from 0deg,
                transparent 0deg,
                rgba(255,255,255,0.1) 2deg,
                transparent 4deg,
                rgba(255,255,255,0.1) 6deg,
                transparent 8deg,
                rgba(255,255,255,0.1) 10deg,
                transparent 12deg
              )`,
              backgroundSize: '100% 100%'
            }}></div>
          </div>
        </div>
          
        {/* Result Indicator */}
        {result && (
          <div 
            className={`absolute -top-2 -right-2 w-6 h-6 rounded-full animate-pulse ${getIndicatorColor()}`}
            title={`Last Result: ${result}`}
            data-testid="result-indicator"
          ></div>
        )}
      </div>
    </div>
  );
}