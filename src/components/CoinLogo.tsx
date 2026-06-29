import React, { useState, useEffect } from 'react';

interface CoinLogoProps {
    symbol: string;
    name: string;
    image?: string;
    className?: string;
}

export const CoinLogo: React.FC<CoinLogoProps> = ({ symbol, name, image, className = 'w-8 h-8' }) => {
    const cleanSymbol = symbol.toLowerCase();
    
    // Lista ordenada de CDNs altamente confiables y el string original de la API
    const sources = [
        `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`,
        `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${cleanSymbol}.png`,
        image || '',
    ].filter(Boolean);

    const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setCurrentSrcIndex(0);
        setHasError(false);
    }, [symbol, image]);

    const handleError = () => {
        if (currentSrcIndex + 1 < sources.length) {
            setCurrentSrcIndex(currentSrcIndex + 1);
        } else {
            setHasError(true);
        }
    };

    if (hasError || !sources[currentSrcIndex]) {
        // Fallback visual elegante tipo Avatar con las iniciales de la criptomoneda
        return (
            <div className={`flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-zinc-800 border border-emerald-500/30 text-emerald-400 font-black uppercase select-none overflow-hidden shrink-0 ${className}`}>
                <span className="text-[35%] tracking-tighter leading-none">{symbol.slice(0, 4)}</span>
            </div>
        );
    }

    return (
        <img
            src={sources[currentSrcIndex]}
            alt={`Logo de ${name}`}
            className={`${className} object-contain shrink-0`}
            onError={handleError}
            loading="lazy"
        />
    );
};
