import sys

try:
    with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    # Find the back button section
    start_marker = "Volver al Directorio de Proveedores\n              </button>\n            </div>"
    # Find the start of the Pareto analysis loop
    end_marker = "const catInfo = apicultoresCategorizados.mapaCategorias[apicultorSeleccionado.id]"

    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)

    if start_idx != -1 and end_idx != -1:
        # We want to replace everything in between start_marker and the enclosing loop of the end_marker
        # The loop starts with "{(() => {" which is just before end_marker
        loop_start_idx = content.rfind("{(() => {", start_idx, end_idx)
        if loop_start_idx != -1:
            print(f"Found match: start={start_idx}, loop_start={loop_start_idx}, end={end_idx}")
            
            replacement = """            </div>

            <div className="ficha-grid">
              
              {/* Columna Izquierda: Perfil y Análisis de Pareto 80/20 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Perfil del Apicultor */}
                <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                  <div>
                    <h2 className="font-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>
                      {apicultorSeleccionado.nombre}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Socio Registrado #AP-{apicultorSeleccionado.cod_api || '4402'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-success" style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}>Activo</span>
                  </div>

                  <div style={{
                    width: '100%',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <span className="label-caps" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span> Ubicación Base
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }}>
                        {apicultorSeleccionado.localidad ? `${apicultorSeleccionado.localidad}, ${apicultorSeleccionado.provincia || 'Ubicación'}` : 'Mercedes, Uruguay'}
                      </strong>
                    </div>
                    <div>
                      <span className="label-caps" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>call</span> Teléfono
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }} className="font-mono">
                        {apicultorSeleccionado.telefono || '+598 99 123 456'}
                      </strong>
                    </div>
                    <div>
                      <span className="label-caps" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fingerprint</span> CUIT
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }} className="font-mono">
                        {apicultorSeleccionado.cuit || '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="label-caps" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>badge</span> DNI
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }} className="font-mono">
                        {apicultorSeleccionado.dni || '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="label-caps" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dns</span> Registro RENAPA
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }} className="font-mono">
                        {apicultorSeleccionado.renapa || '-'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Aporte al Volumen (Pareto 80/20) */}
                {(() => {"""
            
            # Perform the replacement
            new_content = content[:start_idx + len(start_marker)] + "\n" + replacement + content[loop_start_idx + len("{(() => {"):]
            with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
                f.write(new_content)
            print("Successfully refactored profile card in App.tsx!")
        else:
            print("Could not find loop start marker.")
            sys.exit(1)
    else:
        print("Markers not found.")
        sys.exit(1)
except Exception as e:
    print("Error:", e)
    sys.exit(1)
