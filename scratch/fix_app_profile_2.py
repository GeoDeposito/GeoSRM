try:
    with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    # Search for the button opening style and the profile card start
    target = """              <button 
                onClick={() => { setView('directorio'); setApicultorSeleccionado(null); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  padding: '0.5rem 0'
                }}
              >

                
                {/* Perfil del Apicultor */}"""

    replacement = """              <button 
                onClick={() => { setView('directorio'); setApicultorSeleccionado(null); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  padding: '0.5rem 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                Volver al Directorio de Proveedores
              </button>
            </div>

            <div className="ficha-grid">
              {/* Columna Izquierda: Perfil y Análisis de Pareto 80/20 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Perfil del Apicultor */}"""

    if target in content:
        content = content.replace(target, replacement)
        with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
            f.write(content)
        print("Taggings fixed successfully!")
    else:
        print("Target not found. Please review the file content.")
except Exception as e:
    print("Error:", e)
