import React from 'react';
import { WandSparkles } from "lucide-react";

export function WandsLogo({ className = "", size = 32 }: { className?: string, size?: number }) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Icono estilizado de una varita mágica */}
      <WandSparkles className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

export default WandsLogo;
