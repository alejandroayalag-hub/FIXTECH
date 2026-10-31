export default function CampoLista({ items, onChange }) {
  const agregar = () => onChange([...items, '']);
  const actualizar = (i, val) => onChange(items.map((v, idx) => idx === i ? val : v));
  const eliminar = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: 20, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>•</span>
          <input
            type="text"
            value={item}
            onChange={e => actualizar(i, e.target.value)}
            placeholder={`Punto ${i + 1}...`}
            style={{
              flex: 1, border: '2px solid #d1d5db', borderRadius: 12,
              padding: '14px 18px', fontSize: 17, background: '#f9fafb',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#f9fafb'; }}
          />
          <button type="button" onClick={() => eliminar(i)}
            style={{ color: '#f87171', fontSize: 22, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', lineHeight: 1, flexShrink: 0 }}>
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={agregar}
        style={{ fontSize: 16, color: '#2563eb', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', marginTop: 4 }}>
        + Agregar punto
      </button>
    </div>
  );
}
