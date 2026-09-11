export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      {label}
    </div>
  );
}
