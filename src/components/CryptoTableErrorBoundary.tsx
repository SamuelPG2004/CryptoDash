/**
 * @fileoverview CryptoTableErrorBoundary — Error Boundary para el módulo de mercado.
 *
 * Los Error Boundaries en React deben ser clases (limitación de la API de React).
 * Este componente captura errores de render en sus hijos y muestra una UI de fallback.
 *
 * @module components/CryptoTableErrorBoundary
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

/**
 * Error Boundary para el módulo CryptoTable.
 *
 * @example
 * <CryptoTableErrorBoundary>
 *   <CryptoTable />
 * </CryptoTableErrorBoundary>
 */
class CryptoTableErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state   = { hasError: false, errorMessage: '' };
        this.handleReset = this.handleReset.bind(this);
    }

    static getDerivedStateFromError(error: unknown): State {
        return {
            hasError:     true,
            errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo): void {
        console.error('[CryptoTableErrorBoundary] Error capturado:', error, info.componentStack);
    }

    handleReset(): void {
        this.setState({ hasError: false, errorMessage: '' });
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-20 bg-zinc-950 rounded-xl border border-rose-800/30">
                    <AlertTriangle className="text-rose-400 mb-4" size={40} />
                    <p className="text-rose-400 font-bold text-lg mb-2">Error en el módulo de mercado</p>
                    <p className="text-zinc-500 text-sm mb-6">{this.state.errorMessage}</p>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all"
                    >
                        <RotateCcw size={16} />
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default CryptoTableErrorBoundary;
