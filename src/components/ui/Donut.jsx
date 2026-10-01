import { useEffect, useState } from 'react';

// Dona de segmentos. Los arcos se dibujan al montar (el recorrido crece
// de 0 a su largo), para que el dato "se arme" en vez de aparecer de golpe.
export const Donut = ({ segments, size = 168, thickness = 22, children }) => {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
    const gap = segments.filter((s) => s.value > 0).length > 1 ? 5 : 0;

    const arcs = segments.map((s, i) => {
        const before = segments.slice(0, i).reduce((sum, p) => sum + Math.max(0, p.value), 0);
        const fraction = total > 0 ? Math.max(0, s.value) / total : 0;
        return { ...s, length: Math.max(0, fraction * circumference - gap), offset: (total > 0 ? before / total : 0) * circumference };
    });

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--card-soft)" strokeWidth={thickness} />
                {arcs.map((a) => (
                    <circle
                        key={a.label}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={a.color}
                        strokeWidth={thickness}
                        strokeLinecap="round"
                        strokeDasharray={`${ready ? a.length : 0} ${circumference}`}
                        strokeDashoffset={-a.offset}
                        style={{ transition: 'stroke-dasharray 900ms var(--ease-ios)' }}
                    />
                ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
        </div>
    );
};
