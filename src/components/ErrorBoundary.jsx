import { Component } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

// Sin esto, cualquier error de render no capturado (un campo null
// inesperado de la API, por ejemplo) tumbaba TODA la app a una pantalla en
// blanco, sin ninguna forma de recuperarse -- ahora que Split.it es
// instalable como PWA, eso es peor: el usuario no tiene ni la barra de
// Safari para recargar fácil, solo un ícono muerto en su pantalla de
// inicio. Esta es la última red de seguridad, no reemplaza el manejo de
// errores puntual que ya existe en cada pantalla (fetch con catch, etc.).
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Error no capturado en la UI:', error, info);
    }

    handleReload = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
                style={{ background: 'var(--app-bg)', color: 'var(--text-primary)' }}
            >
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                >
                    <ShieldAlert size={26} />
                </div>
                <div className="max-w-sm">
                    <h1 className="text-lg font-bold">Algo salió mal</h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Split.it tuvo un error inesperado. Tus datos están a salvo -- solo hay que recargar.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={this.handleReload}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' }}
                >
                    <RefreshCw size={15} />
                    Recargar
                </button>
            </div>
        );
    }
}
