import { Coins } from '@phosphor-icons/react';

// Marca: moneda sobre el degradé de marca. Una sola fuente de verdad para
// el login, la barra lateral y la pantalla de carga.
export const Logo = ({ size = 40 }) => (
    <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size, borderRadius: size * 0.34, background: 'var(--grad-hero)', boxShadow: '0 10px 20px -8px var(--primary-glow)' }}
    >
        <Coins size={size * 0.54} weight="fill" color="#fff" />
    </span>
);
