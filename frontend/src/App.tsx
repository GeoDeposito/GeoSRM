/* src/App.tsx */
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Printer, 
  Bell, 
  Key, 
  LogOut, 
  Plus, 
  ArrowLeft, 
  Search, 
  Award, 
  Info,
  Warehouse
} from 'lucide-react';
import { srmService } from './services/srmService';
import { isMockMode } from './services/supabaseClient';
import type { Apicultor, ApicultorCompleto } from './types/srm.types';
import './App.css';

function App() {
  // Estados de navegación y datos
  const [apicultores, setApicultores] = useState<Apicultor[]>([]);
  const [apicultorSeleccionado, setApicultorSeleccionado] = useState<ApicultorCompleto | null>(null);
  const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
  const [activeTab, setActiveTab] = useState<'general' | 'entregas' | 'envases' | 'cuenta_corriente' | 'operculo'>('general');
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para diálogos (Modales)
  const [showAddApicultor, setShowAddApicultor] = useState(false);
  const [showAddEntrega, setShowAddEntrega] = useState(false);
  const [showAddEnvase, setShowAddEnvase] = useState(false);
  const [showAddCC, setShowAddCC] = useState(false);
  const [showAddOperculo, setShowAddOperculo] = useState(false);
  
  // Estados de formularios
  const [newApicultorForm, setNewApicultorForm] = useState({
    nombre: '',
    cuit: '',
    localidad: '',
    cod_api: '',
    provincia: '',
    dni: '',
    renapa: '',
    telefono: ''
  });
  const [newEntregaForm, setNewEntregaForm] = useState({ pfund: 34, humedad: 17.5, hmf: 10, tambores: 5, kilos: 1500 });
  const [newEnvaseForm, setNewEnvaseForm] = useState({ tipo: 'PRESTAMO' as 'PRESTAMO' | 'DEVOLUCION', cantidad: 10, obs: '' });
  const [newCCForm, setNewCCForm] = useState({ 
    moneda: 'ARS' as 'ARS' | 'USD', 
    tipo: 'DEBE' as 'DEBE' | 'HABER', 
    monto: 100000, 
    detalle: '', 
    fecha: '',
    precio_referencia_miel: 0,
    kilos_miel_equiv: 0,
    tipo_transaccion: 'ANTICIPO_CASH' as 'ANTICIPO_CASH' | 'RETIRO_INSUMO' | 'CARGO_ENVASE' | 'VENTA_LIQUIDACION' | 'SALDO_INICIAL' | 'AJUSTE'
  });
  const [newOperculoForm, setNewOperculoForm] = useState({
    tipo: 'ENTREGA_OP' as 'ENTREGA_OP' | 'RETIRO_CERA' | 'AJUSTE',
    kilos_op: 100,
    rendimiento_cera: 0.8,
    detalle: '',
    fecha: ''
  });

  // Cargar lista de apicultores al montar
  useEffect(() => {
    cargarApicultores();
  }, []);

  const cargarApicultores = async () => {
    try {
      const lista = await srmService.listApicultores();
      setApicultores(lista);
    } catch (e) {
      console.error('Error cargando apicultores:', e);
    }
  };

  const seleccionarApicultor = async (id: string) => {
    try {
      const completo = await srmService.getApicultor(id);
      setApicultorSeleccionado(completo);
      setView('detail');
      setActiveTab('general');
    } catch (e) {
      console.error('Error al obtener ficha completa:', e);
    }
  };

  // Acciones de inserción
  const handleCreateApicultor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApicultorForm.nombre || !newApicultorForm.cuit) return;
    try {
      await srmService.createApicultor(
        newApicultorForm.nombre,
        newApicultorForm.cuit,
        newApicultorForm.localidad,
        newApicultorForm.cod_api,
        newApicultorForm.provincia,
        newApicultorForm.dni,
        newApicultorForm.renapa,
        newApicultorForm.telefono
      );
      setNewApicultorForm({
        nombre: '',
        cuit: '',
        localidad: '',
        cod_api: '',
        provincia: '',
        dni: '',
        renapa: '',
        telefono: ''
      });
      setShowAddApicultor(false);
      cargarApicultores();
    } catch (err) {
      alert('Error creando apicultor: ' + err);
    }
  };

  const handleCreateEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apicultorSeleccionado) return;
    try {
      await srmService.createEntrega(
        apicultorSeleccionado.id,
        newEntregaForm.pfund,
        newEntregaForm.humedad,
        newEntregaForm.hmf,
        newEntregaForm.tambores,
        newEntregaForm.kilos
      );
      setShowAddEntrega(false);
      seleccionarApicultor(apicultorSeleccionado.id);
    } catch (err) {
      alert('Error registrando entrega: ' + err);
    }
  };

  const handleCreateEnvase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apicultorSeleccionado) return;
    try {
      await srmService.createEnvaseMovimiento(
        apicultorSeleccionado.id,
        newEnvaseForm.tipo,
        newEnvaseForm.cantidad,
        newEnvaseForm.obs
      );
      setShowAddEnvase(false);
      setNewEnvaseForm({ tipo: 'PRESTAMO', cantidad: 10, obs: '' });
      seleccionarApicultor(apicultorSeleccionado.id);
    } catch (err) {
      alert('Error registrando movimiento: ' + err);
    }
  };

  const handleCreateCC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apicultorSeleccionado) return;
    try {
      // Auto-calculate kilos_miel_equiv if it is 0 and reference price is provided
      let finalKilos = newCCForm.kilos_miel_equiv;
      if (finalKilos === 0 && newCCForm.precio_referencia_miel > 0) {
        if (newCCForm.tipo_transaccion === 'VENTA_LIQUIDACION') {
          finalKilos = -Math.abs(newCCForm.monto / newCCForm.precio_referencia_miel);
        } else if (newCCForm.tipo === 'DEBE') {
          finalKilos = -Math.abs(newCCForm.monto / newCCForm.precio_referencia_miel);
        } else {
          finalKilos = Math.abs(newCCForm.monto / newCCForm.precio_referencia_miel);
        }
      }

      await srmService.createCuentaCorrienteMovimiento(
        apicultorSeleccionado.id,
        newCCForm.moneda,
        newCCForm.tipo,
        newCCForm.monto,
        newCCForm.detalle,
        newCCForm.fecha || undefined,
        newCCForm.precio_referencia_miel || undefined,
        finalKilos || undefined,
        newCCForm.tipo_transaccion
      );
      setShowAddCC(false);
      setNewCCForm({ 
        moneda: 'ARS', 
        tipo: 'DEBE', 
        monto: 100000, 
        detalle: '', 
        fecha: '',
        precio_referencia_miel: 0,
        kilos_miel_equiv: 0,
        tipo_transaccion: 'ANTICIPO_CASH'
      });
      seleccionarApicultor(apicultorSeleccionado.id);
    } catch (err) {
      alert('Error registrando transacción: ' + err);
    }
  };

  const handleCreateOperculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apicultorSeleccionado) return;
    try {
      let finalKilosOp = newOperculoForm.kilos_op;
      if (newOperculoForm.tipo === 'RETIRO_CERA') {
        // Cappings equivalent is negative for withdrawals (e.g. -70/0.8)
        finalKilosOp = -Math.abs(newOperculoForm.kilos_op);
      }

      await srmService.createOperculoMovimiento(
        apicultorSeleccionado.id,
        newOperculoForm.tipo,
        finalKilosOp,
        newOperculoForm.rendimiento_cera,
        newOperculoForm.detalle,
        newOperculoForm.fecha || undefined
      );
      setShowAddOperculo(false);
      setNewOperculoForm({
        tipo: 'ENTREGA_OP',
        kilos_op: 100,
        rendimiento_cera: 0.8,
        detalle: '',
        fecha: ''
      });
      seleccionarApicultor(apicultorSeleccionado.id);
    } catch (err) {
      alert('Error registrando movimiento de opérculo: ' + err);
    }
  };

  // Contar alertas globales (ej. humedad de mieles en los lotes existentes)
  const totalIncidencias = 1; // Denis Capello tiene una entrega con 18.5% de humedad

  // Calcular saldo de envases de un apicultor a partir de LocalStorage
  const getSaldoEnvases = (id: string): number => {
    try {
      const raw = localStorage.getItem('srm_envases');
      if (!raw) return 0;
      const envases = JSON.parse(raw);
      return envases
        .filter((e: any) => e.apicultor_id === id)
        .reduce((acc: number, curr: any) => acc + (curr.tipo_movimiento === 'PRESTAMO' ? curr.cantidad : -curr.cantidad), 0);
    } catch {
      return 0;
    }
  };

  // Apicultores filtrados
  const apicultoresFiltrados = apicultores.filter(a => 
    a.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.cuit.includes(searchQuery) ||
    (a.cod_api && a.cod_api.includes(searchQuery)) ||
    (a.dni && a.dni.includes(searchQuery)) ||
    (a.renapa && a.renapa.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (a.localidad && a.localidad.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (a.provincia && a.provincia.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="app-container">
      {/* -------------------------------------------------------------------
          BARRA LATERAL (Sidebar)
          ------------------------------------------------------------------- */}
      <aside style={{
        width: '280px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.5rem 1rem'
      }}>
        <div>
          {/* Logo y Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Warehouse size={22} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-title)', lineHeight: 1.2 }}>APICULTOR SRM</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ADMINISTRACIÓN
              </span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <button 
              onClick={() => { setView('dashboard'); setApicultorSeleccionado(null); }}
              className="font-title"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: view === 'dashboard' ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: view === 'dashboard' ? 'var(--bg-sidebar-active)' : 'transparent',
                color: view === 'dashboard' ? 'var(--primary)' : 'var(--text-body)',
                borderLeft: view === 'dashboard' ? '4px solid var(--primary)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LayoutDashboard size={18} />
                <span>Tablero Principal</span>
              </div>
            </button>

            <button 
              onClick={() => { setView('dashboard'); }}
              className="font-title"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: view === 'detail' ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: view === 'detail' ? 'var(--bg-sidebar-active)' : 'transparent',
                color: view === 'detail' ? 'var(--primary)' : 'var(--text-body)',
                borderLeft: view === 'detail' ? '4px solid var(--primary)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={18} />
                <span>Fichas Apicultores</span>
              </div>
              {apicultores.length > 0 && (
                <span className="font-mono" style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontWeight: 700
                }}>
                  {apicultores.length}
                </span>
              )}
            </button>

            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--text-body)',
              opacity: 0.7
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bell size={18} />
                <span>Alertas Incumplimientos</span>
              </div>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: 700
              }}>
                {totalIncidencias}
              </span>
            </div>
          </nav>
        </div>

        {/* Footer con Perfil y Controles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          {/* Ficha de Usuario Claudio Oviedo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#E2E8F0',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'var(--secondary)'
            }}>
              OA
            </div>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-title)' }}>Operador Apícola</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ADMINISTRADOR</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button 
              onClick={() => alert('Opción de cambiar contraseña disponible en producción.')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: '#FAFBFD'
              }}
            >
              <Key size={14} style={{ color: '#EAB308' }} />
              Cambiar Clave
            </button>
            <button 
              onClick={() => alert('Sesión finalizada.')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--danger)',
                backgroundColor: '#FFF5F5'
              }}
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------
          CONTENIDO PRINCIPAL
          ------------------------------------------------------------------- */}
      <main className="main-content">
        {/* Banner Informativo si se ejecuta en MOCK MODE */}
        {isMockMode && (
          <div style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#B45309',
            fontSize: '0.85rem'
          }}>
            <Info size={16} />
            <div>
              <strong>Modo de Simulación (Offline Mock) Activo:</strong> La base de datos Supabase independiente no está conectada. Los cambios realizados se persistirán localmente en tu navegador. Configura <code>.env</code> para conectar a producción.
            </div>
          </div>
        )}

        {/* Encabezado General */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.25rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.02em' }}>
              {view === 'dashboard' ? 'TABLERO DE GESTIÓN' : `FICHA PROVEEDOR: ${apicultorSeleccionado?.nombre}`}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {view === 'dashboard' 
                ? 'Monitoreo en vivo de utilidades, análisis de mieles, cuenta corriente financiera y control de tambores vacíos.'
                : 'Detalle consolidado de comportamiento, balances monetarios dobles y control analítico de calidad.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-body)'
            }}>
              Cuadro Financiero
            </button>
            <button style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-secondary)'
            }}>
              Control de Gastos
            </button>
            <button 
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#0EA5E9',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              <Printer size={16} />
              Imprimir Resumen
            </button>
          </div>
        </header>

        {/* -------------------------------------------------------------------
            SECTOR FILTRO COMERCIAL DE FECHAS
            ------------------------------------------------------------------- */}
        <section className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📅 Selector de Fecha Horizontal (Filtro Comercial Interactivo)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {[
              { dia: 'SÁB', num: '30', mes: 'MAY' },
              { dia: 'DOM', num: '31', mes: 'MAY' },
              { dia: 'LUN', num: '1', mes: 'JUN' },
              { dia: 'MAR', num: '2', mes: 'JUN' },
              { dia: 'MIÉ', num: '3', mes: 'JUN' },
              { dia: 'JUE', num: '4', mes: 'JUN' },
              { dia: 'VIE', num: '5', mes: 'JUN', activo: true },
            ].map((d, i) => (
              <div 
                key={i} 
                style={{
                  minWidth: '75px',
                  padding: '0.625rem',
                  borderRadius: '12px',
                  backgroundColor: d.activo ? 'rgba(133, 227, 68, 0.15)' : '#FAFBFD',
                  border: d.activo ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.dia}</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)', margin: '0.125rem 0' }}>{d.num}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.mes}</span>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------------
            VISTA 1: TABLERO / PANEL PRINCIPAL (DASHBOARD)
            ------------------------------------------------------------------- */}
        {view === 'dashboard' && (
          <>
            {/* Buscador y botón de creación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, CUIT o localidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.625rem 0.625rem 2.5rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <button 
                onClick={() => setShowAddApicultor(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  backgroundColor: 'var(--secondary)',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                <Plus size={18} style={{ color: 'var(--primary)' }} />
                Registrar Apicultor
              </button>
            </div>

            {/* Listado de Apicultores */}
            <section className="card-premium">
              <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-title)' }}>
                Directorio y Fichas 360° de Proveedores
              </h3>

              <div className="table-container">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th className="font-title">Apicultor / Razón Social</th>
                      <th className="font-title">Código API</th>
                      <th className="font-title">CUIT</th>
                      <th className="font-title">RENAPA</th>
                      <th className="font-title">Ubicación</th>
                      <th className="font-title">Rating</th>
                      <th className="font-title">Tambores en Campo</th>
                      <th className="font-title text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apicultoresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem' }}>
                          No se encontraron apicultores registrados.
                        </td>
                      </tr>
                    ) : (
                      apicultoresFiltrados.map((a) => {
                        // Calcular saldo de envases dinámicamente
                        const saldoEnvases = getSaldoEnvases(a.id);

                        return (
                          <tr key={a.id} className="table-row-hover">
                            <td style={{ fontWeight: 700, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{a.nombre}</td>
                            <td className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{a.cod_api || '-'}</td>
                            <td className="font-mono">{a.cuit}</td>
                            <td className="font-mono" style={{ textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{a.renapa || '-'}</td>
                            <td>{a.localidad ? `${a.localidad}${a.provincia ? `, ${a.provincia}` : ''}` : 'No declarada'}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Award size={16} style={{ color: 'var(--primary)' }} />
                                <span className="font-mono" style={{ fontWeight: 700 }}>{a.puntuacion.toFixed(1)}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${saldoEnvases > 0 ? 'badge-danger' : 'badge-success'}`}>
                                {saldoEnvases} en campo
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => seleccionarApicultor(a.id)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--bg-sidebar-active)',
                                  color: 'var(--primary)',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                Ver Radiografía 360°
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* -------------------------------------------------------------------
            VISTA 2: RADICACIÓN / RADIOGRAFÍA 360° DETALLE
            ------------------------------------------------------------------- */}
        {view === 'detail' && apicultorSeleccionado && (
          <>
            {/* Botón de Retorno */}
            <div>
              <button 
                onClick={() => { setView('dashboard'); setApicultorSeleccionado(null); }}
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
                <ArrowLeft size={16} />
                Volver al Tablero Principal
              </button>
            </div>

            {/* KPI Cards del Apicultor en Foco */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem'
            }}>
              {/* Prestados / Campo (Progreso circular simulado) */}
              <div className="card-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Envases en Campo
                  </span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '0.25rem' }}>
                    {apicultorSeleccionado.stats.saldo_envases} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>tambores</span>
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Saldo pendiente en campo</span>
                </div>
                {/* Indicador circular CSS SVG */}
                <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                  <svg width="60" height="60" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={apicultorSeleccionado.stats.saldo_envases > 0 ? "var(--danger)" : "var(--primary-dark)"}
                      strokeWidth="3.5"
                      strokeDasharray={`${Math.min(100, Math.max(0, apicultorSeleccionado.stats.saldo_envases * 5))}, 100`}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700
                  }}>
                    {apicultorSeleccionado.stats.saldo_envases > 0 ? 'alert' : 'ok'}
                  </div>
                </div>
              </div>

              {/* Miel Entregada */}
              <div className="card-premium">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Miel Física Entregada
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '0.25rem' }}>
                  {apicultorSeleccionado.stats.entregas_totales_kilos.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>kg netos</span>
                </h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Total: {apicultorSeleccionado.stats.entregas_totales_tambores} tambores llenos
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 700 }}>100% OK</span>
                </div>
              </div>

              {/* Saldo Miel Equivalente (Unificado) */}
              <div className="card-premium" style={{ borderLeft: '4px solid var(--primary)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Saldo Miel Equivalente (Total)
                </span>
                <h2 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 800, 
                  color: apicultorSeleccionado.stats.saldo_miel_equivalente >= 0 ? 'var(--primary-dark)' : 'var(--danger)', 
                  marginTop: '0.25rem' 
                }}>
                  {apicultorSeleccionado.stats.saldo_miel_equivalente >= 0 ? '+' : ''}
                  {apicultorSeleccionado.stats.saldo_miel_equivalente.toFixed(2).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>kg</span>
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {apicultorSeleccionado.stats.saldo_miel_equivalente >= 0 ? 'Miel a favor en depósito' : 'Deuda convertida a miel'}
                </span>
              </div>

              {/* Saldo Opérculo */}
              <div className="card-premium" style={{ borderLeft: '4px solid #8B5A2B' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Saldo Opérculo (OP)
                </span>
                <h2 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 800, 
                  color: apicultorSeleccionado.stats.saldo_operculo >= 0 ? '#8B5A2B' : 'var(--danger)', 
                  marginTop: '0.25rem' 
                }}>
                  {apicultorSeleccionado.stats.saldo_operculo >= 0 ? '+' : ''}
                  {apicultorSeleccionado.stats.saldo_operculo.toFixed(1).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>kg</span>
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Saldo secundario de cappings/cera
                </span>
              </div>

              {/* Cuenta Corriente ARS */}
              <div className="card-premium">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Saldo Financiero ARS
                </span>
                <h2 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 800, 
                  color: apicultorSeleccionado.stats.saldo_financiero_ars >= 0 ? 'var(--secondary)' : 'var(--danger)', 
                  marginTop: '0.25rem' 
                }}>
                  {apicultorSeleccionado.stats.saldo_financiero_ars >= 0 ? '+' : ''}
                  ${apicultorSeleccionado.stats.saldo_financiero_ars.toLocaleString()}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {apicultorSeleccionado.stats.saldo_financiero_ars >= 0 ? 'Saldo a favor (pesos)' : 'Deuda en pesos'}
                </span>
              </div>

              {/* Cuenta Corriente USD */}
              <div className="card-premium" style={{ borderLeft: '4px solid #F59E0B' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Saldo Financiero USD
                </span>
                <h2 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 800, 
                  color: apicultorSeleccionado.stats.saldo_financiero_usd >= 0 ? 'var(--secondary)' : 'var(--danger)', 
                  marginTop: '0.25rem' 
                }}>
                  {apicultorSeleccionado.stats.saldo_financiero_usd >= 0 ? '+' : ''}
                  USD {apicultorSeleccionado.stats.saldo_financiero_usd.toLocaleString()}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {apicultorSeleccionado.stats.saldo_financiero_usd >= 0 ? 'Saldo a favor (USD)' : 'Deuda en dólares'}
                </span>
              </div>
            </div>

            {/* Pestañas de detalle */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1rem', marginTop: '1rem', overflowX: 'auto' }}>
              {[
                { id: 'general', label: 'Datos Generales' },
                { id: 'entregas', label: `Análisis de Miel (${apicultorSeleccionado.entregas.length})` },
                { id: 'envases', label: 'Control de Envases' },
                { id: 'cuenta_corriente', label: 'Cuenta Corriente / Miel Equiv.' },
                { id: 'operculo', label: `Control de Opérculo (${apicultorSeleccionado.operculo?.length || 0})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    color: activeTab === t.id ? 'var(--secondary)' : 'var(--text-secondary)',
                    borderBottom: activeTab === t.id ? '3px solid var(--primary-dark)' : 'none',
                    marginBottom: '-2px'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* -----------------------------------------------------------------
                PESTAÑA: GENERAL
                ----------------------------------------------------------------- */}
            {activeTab === 'general' && (
              <section className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)' }}>
                  Ficha Impositiva y Datos de Contacto
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Bloque 1: Identificación Comercial */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem', borderRight: '1px solid var(--border-color)' }}>
                    <h4 className="font-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                      Identificación Comercial
                    </h4>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código de Apicultor (API)</label>
                      <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-title)', marginTop: '0.25rem' }}>{apicultorSeleccionado.cod_api || 'No asignado'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUIT</label>
                      <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-title)', marginTop: '0.25rem' }}>{apicultorSeleccionado.cuit}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DNI</label>
                      <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-title)', marginTop: '0.25rem' }}>{apicultorSeleccionado.dni || 'No declarado'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RENAPA</label>
                      <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-title)', textTransform: 'uppercase', marginTop: '0.25rem' }}>{apicultorSeleccionado.renapa || 'No registrado'}</p>
                    </div>
                  </div>

                  {/* Bloque 2: Ubicación & Contacto */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 className="font-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                      Contacto y Ubicación
                    </h4>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Localidad</label>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-title)', marginTop: '0.25rem' }}>{apicultorSeleccionado.localidad || 'No declarada'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provincia</label>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-title)', marginTop: '0.25rem' }}>{apicultorSeleccionado.provincia || 'No declarada'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono de Contacto</label>
                      <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-title)', marginTop: '0.25rem' }}>{apicultorSeleccionado.telefono || 'No declarado'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Puntuación / Calificación</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Award key={s} size={18} style={{ 
                            color: s <= Math.round(apicultorSeleccionado.puntuacion) ? 'var(--primary-container)' : 'var(--border-color)',
                            fill: s <= Math.round(apicultorSeleccionado.puntuacion) ? 'var(--primary-container)' : 'none'
                          }} />
                        ))}
                        <span className="font-mono" style={{ fontWeight: 800, marginLeft: '0.5rem', color: 'var(--text-title)' }}>
                          {apicultorSeleccionado.puntuacion.toFixed(1)} / 5.0
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* -----------------------------------------------------------------
                PESTAÑA: ENTREGAS / ANÁLISIS DE MIEL
                ----------------------------------------------------------------- */}
            {activeTab === 'entregas' && (
              <section className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registro Analítico de Envíos de Miel</h3>
                  <button 
                    onClick={() => setShowAddEntrega(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--secondary)',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <Plus size={16} style={{ color: 'var(--primary)' }} />
                    Registrar Nueva Entrega
                  </button>
                </div>

                <div className="table-container">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Color Pfund</th>
                        <th>Humedad (%)</th>
                        <th>HMF (mg/kg)</th>
                        <th>Tambores</th>
                        <th>Kilos Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apicultorSeleccionado.entregas.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                            No hay registros de entregas para este apicultor.
                          </td>
                        </tr>
                      ) : (
                        apicultorSeleccionado.entregas.map((e) => {
                          const alertaHumedad = e.humedad > 18.0;
                          const alertaHmf = e.hmf > 40.0;

                          return (
                            <tr key={e.id} style={{ 
                              backgroundColor: (alertaHumedad || alertaHmf) ? '#FFF5F5' : 'transparent'
                            }}>
                              <td>{new Date(e.fecha).toLocaleDateString()}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ 
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    backgroundColor: e.color_pfund < 34 ? '#FEF08A' : e.color_pfund < 50 ? '#F59E0B' : '#B45309'
                                  }}></span>
                                  <span>{e.color_pfund} mm Pfund</span>
                                </div>
                              </td>
                              <td style={{ fontWeight: alertaHumedad ? 800 : 500, color: alertaHumedad ? 'var(--danger)' : 'inherit' }}>
                                {e.humedad.toFixed(1)}%
                                {alertaHumedad && (
                                  <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', verticalAlign: 'middle' }} className="badge badge-danger">
                                    ¡EXCESO HUMEDAD!
                                  </span>
                                )}
                              </td>
                              <td style={{ fontWeight: alertaHmf ? 800 : 500, color: alertaHmf ? 'var(--danger)' : 'inherit' }}>
                                {e.hmf} mg/kg
                                {alertaHmf && (
                                  <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', verticalAlign: 'middle' }} className="badge badge-danger">
                                    ¡ENVEJECIDA!
                                  </span>
                                )}
                              </td>
                              <td>{e.cantidad_tambores}</td>
                              <td style={{ fontWeight: 700 }}>{e.kilos_neto.toLocaleString()} kg</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* -----------------------------------------------------------------
                PESTAÑA: CONTROL DE ENVASES
                ----------------------------------------------------------------- */}
            {activeTab === 'envases' && (
              <section className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historial de Tambores Vacíos Prestados y Devueltos</h3>
                  <button 
                    onClick={() => setShowAddEnvase(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--secondary)',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <Plus size={16} style={{ color: 'var(--primary)' }} />
                    Registrar Movimiento
                  </button>
                </div>

                <div className="table-container">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo de Movimiento</th>
                        <th>Cantidad</th>
                        <th>Observaciones / Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apicultorSeleccionado.envases.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                            No hay movimientos de envases registrados.
                          </td>
                        </tr>
                      ) : (
                        apicultorSeleccionado.envases.map((e) => (
                          <tr key={e.id}>
                            <td>{new Date(e.fecha).toLocaleDateString()}</td>
                            <td>
                              <span className={`badge ${e.tipo_movimiento === 'PRESTAMO' ? 'badge-danger' : 'badge-success'}`}>
                                {e.tipo_movimiento}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700 }}>{e.cantidad} tambores</td>
                            <td>{e.observaciones || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* -----------------------------------------------------------------
                PESTAÑA: CUENTA CORRIENTE Y MIEL EQUIVALENTE
                ----------------------------------------------------------------- */}
            {activeTab === 'cuenta_corriente' && (() => {
              // 1. Merge honey deliveries and account movements
              const ledgerItems = [
                ...apicultorSeleccionado.entregas.map(e => ({
                  id: e.id,
                  fecha: e.fecha,
                  comprobante: `Remito ${e.id.substring(0, 6).toUpperCase()}`,
                  tipo: 'ENTREGA' as const,
                  detalle: `Entrega física de miel - ${e.cantidad_tambores} tambores`,
                  moneda: '-',
                  monto: 0,
                  precio_ref: 0,
                  kilos: e.kilos_neto
                })),
                ...apicultorSeleccionado.cuenta_corriente.map(cc => ({
                  id: cc.id,
                  fecha: cc.fecha,
                  comprobante: cc.tipo_transaccion || 'FINANCIERO',
                  tipo: cc.tipo_movimiento === 'DEBE' ? 'DEBITO' as const : 'CREDITO' as const,
                  detalle: cc.detalle || '',
                  moneda: cc.moneda,
                  monto: cc.monto,
                  precio_ref: cc.precio_referencia_miel || 0,
                  kilos: cc.kilos_miel_equiv || 0
                }))
              ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

              // 2. Compute running sum
              let runningBal = 0;
              const ledgerWithBalance = ledgerItems.map(item => {
                runningBal += item.kilos;
                return { ...item, balance: runningBal };
              }).reverse(); // Display newest first

              return (
                <section className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-title)' }}>
                        Libro Diario de Miel Equivalente & Financiero
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Combina entregas de miel física, retiros de insumos y adelantos monetarios pesificados/dolarizados en kg de miel clara equivalente.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowAddCC(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--secondary)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <Plus size={16} style={{ color: 'var(--primary)' }} />
                      Registrar Transacción CC
                    </button>
                  </div>

                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    borderLeft: '4px solid var(--primary-container)',
                    lineHeight: '1.4'
                  }}>
                    <strong>Lógica del Negocio (Miel Equivalente)</strong>: Las entregas suman kilos físicos. Los retiros de insumos y adelantos financieros restan kilos (débitos). La cotización se fija al registrar la operación para mantener el balance libre de inflación.
                  </div>

                  <div className="table-container">
                    <table className="table-premium">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Comprobante</th>
                          <th>Detalle de Operación</th>
                          <th>Valor Monetario</th>
                          <th>Precio Ref. Miel</th>
                          <th>Kilos Miel (Var.)</th>
                          <th>Saldo Miel Acum.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerWithBalance.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                              No hay transacciones registradas en este libro.
                            </td>
                          </tr>
                        ) : (
                          ledgerWithBalance.map((item) => {
                            const isNegative = item.kilos < 0;
                            const isDelivery = item.tipo === 'ENTREGA';
                            
                            return (
                              <tr key={item.id} style={{ 
                                borderLeft: isDelivery ? '4px solid var(--primary)' : (isNegative ? '4px solid var(--danger)' : '4px solid var(--secondary)')
                              }}>
                                <td className="font-mono">{new Date(item.fecha).toLocaleDateString()}</td>
                                <td>
                                  <span style={{ 
                                    fontSize: '0.75rem', 
                                    padding: '0.15rem 0.4rem', 
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    backgroundColor: isDelivery ? '#FEF3C7' : '#F1F5F9',
                                    color: isDelivery ? 'var(--primary-dark)' : 'var(--text-secondary)'
                                  }}>
                                    {item.comprobante}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{item.detalle}</td>
                                <td className="font-mono">
                                  {item.monto > 0 ? (
                                    <span>{item.moneda === 'USD' ? 'u$s ' : '$'}{item.monto.toLocaleString()}</span>
                                  ) : '-'}
                                </td>
                                <td className="font-mono">
                                  {item.precio_ref > 0 ? (
                                    <span>{item.moneda === 'USD' ? 'u$s ' : '$'}{item.precio_ref.toLocaleString()}/kg</span>
                                  ) : '-'}
                                </td>
                                <td className="font-mono" style={{ 
                                  fontWeight: 800, 
                                  color: isNegative ? 'var(--danger)' : 'var(--secondary)'
                                }}>
                                  {isNegative ? '' : '+'}{item.kilos.toLocaleString()} kg
                                </td>
                                <td className="font-mono" style={{ 
                                  fontWeight: 800, 
                                  color: item.balance >= 0 ? 'var(--primary-dark)' : 'var(--danger)'
                                }}>
                                  {item.balance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })()}

            {/* -----------------------------------------------------------------
                PESTAÑA: CONTROL DE OPÉRCULO / CERA
                ----------------------------------------------------------------- */}
            {activeTab === 'operculo' && (() => {
              // Calculate running balance
              const opItems = [...(apicultorSeleccionado.operculo || [])].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
              
              let runningOp = 0;
              const opWithBalance = opItems.map(item => {
                runningOp += item.kilos_op;
                return { ...item, balance: runningOp };
              }).reverse();

              return (
                <section className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-title)' }}>
                        Control de Opérculo y Cera (Subproductos)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Movimientos de entrega de opérculo bruto y retiros de cajas de cera valuados en opérculo equivalente.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowAddOperculo(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--secondary)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <Plus size={16} style={{ color: 'var(--primary)' }} />
                      Registrar Movimiento Opérculo
                    </button>
                  </div>

                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    borderLeft: '4px solid #8B5A2B',
                    lineHeight: '1.4'
                  }}>
                    <strong>Conversión de Cera a Opérculo</strong>: Los retiros de cera se dividen por el rendimiento de 0.8 kg cera/kg op (ej. retirar 70 kg de cera equivale a retirar 87.5 kg de opérculo de tu saldo).
                  </div>

                  <div className="table-container">
                    <table className="table-premium">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo de Movimiento</th>
                          <th>Descripción / Detalle</th>
                          <th>Factor Rend.</th>
                          <th>Opérculo Var. (kg)</th>
                          <th>Saldo Opérculo Acum.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opWithBalance.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                              No hay registros de opérculo o cera para este apicultor.
                            </td>
                          </tr>
                        ) : (
                          opWithBalance.map((item) => {
                            const isNegative = item.kilos_op < 0;
                            return (
                              <tr key={item.id}>
                                <td className="font-mono">{new Date(item.fecha).toLocaleDateString()}</td>
                                <td>
                                  <span className={`badge ${isNegative ? 'badge-danger' : 'badge-success'}`}>
                                    {item.tipo_movimiento === 'ENTREGA_OP' ? 'ENTREGA OP' : (item.tipo_movimiento === 'RETIRO_CERA' ? 'RETIRO CERA' : 'AJUSTE')}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{item.detalle || '-'}</td>
                                <td className="font-mono">{item.rendimiento_cera}</td>
                                <td className="font-mono" style={{ 
                                  fontWeight: 800, 
                                  color: isNegative ? 'var(--danger)' : 'var(--secondary)' 
                                }}>
                                  {isNegative ? '' : '+'}{item.kilos_op.toFixed(1)} kg
                                </td>
                                <td className="font-mono" style={{ 
                                  fontWeight: 800, 
                                  color: item.balance >= 0 ? '#8B5A2B' : 'var(--danger)' 
                                }}>
                                  {item.balance.toFixed(1)} kg
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })()}
          </>
        )}
      </main>

      {/* -------------------------------------------------------------------
          MODALES / DIÁLOGOS DE REGISTRO
          ------------------------------------------------------------------- */}
      
      {/* 1. Modal: Agregar Apicultor */}
      {showAddApicultor && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="card-premium" style={{ width: '550px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)' }}>Registrar Nuevo Apicultor</h3>
            
            <form onSubmit={handleCreateApicultor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Nombre completo */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nombre / Razón Social</label>
                <input 
                  type="text" required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newApicultorForm.nombre}
                  onChange={e => setNewApicultorForm({ ...newApicultorForm, nombre: e.target.value })}
                />
              </div>

              {/* Fila: CUIT y DNI */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CUIT (formato 20-XXXXXXXX-9)</label>
                  <input 
                    type="text" required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newApicultorForm.cuit}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, cuit: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>DNI</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newApicultorForm.dni}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, dni: e.target.value })}
                  />
                </div>
              </div>

              {/* Fila: Código API y RENAPA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Código API</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newApicultorForm.cod_api}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, cod_api: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>RENAPA</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newApicultorForm.renapa}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, renapa: e.target.value })}
                  />
                </div>
              </div>

              {/* Fila: Localidad y Provincia */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Localidad</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newApicultorForm.localidad}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, localidad: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Provincia</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newApicultorForm.provincia}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, provincia: e.target.value })}
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Teléfono de Contacto</label>
                <input 
                  type="text"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newApicultorForm.telefono}
                  onChange={e => setNewApicultorForm({ ...newApicultorForm, telefono: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowAddApicultor(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: '#FFFFFF', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                  Guardar Apicultor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Agregar Entrega de Miel */}
      {showAddEntrega && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="card-premium" style={{ width: '450px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Entrada de Lote de Miel</h3>
            <form onSubmit={handleCreateEntrega} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Color Pfund (mm)</label>
                  <input 
                    type="number" required step="any"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newEntregaForm.pfund}
                    onChange={e => setNewEntregaForm({ ...newEntregaForm, pfund: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Humedad (%)</label>
                  <input 
                    type="number" required step="any"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newEntregaForm.humedad}
                    onChange={e => setNewEntregaForm({ ...newEntregaForm, humedad: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>HMF (mg/kg)</label>
                  <input 
                    type="number" required step="any"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newEntregaForm.hmf}
                    onChange={e => setNewEntregaForm({ ...newEntregaForm, hmf: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cant. Tambores</label>
                  <input 
                    type="number" required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newEntregaForm.tambores}
                    onChange={e => setNewEntregaForm({ ...newEntregaForm, tambores: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kilos Neto</label>
                <input 
                  type="number" required step="any"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newEntregaForm.kilos}
                  onChange={e => setNewEntregaForm({ ...newEntregaForm, kilos: parseFloat(e.target.value) })}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddEntrega(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--secondary)', color: '#FFFFFF', borderRadius: '8px', fontWeight: 600 }}>
                  Confirmar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Agregar Movimiento de Envases */}
      {showAddEnvase && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="card-premium" style={{ width: '450px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Movimiento de Tambores</h3>
            <form onSubmit={handleCreateEnvase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tipo de Movimiento</label>
                <select 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                  value={newEnvaseForm.tipo}
                  onChange={e => setNewEnvaseForm({ ...newEnvaseForm, tipo: e.target.value as any })}
                >
                  <option value="PRESTAMO">PRESTAMO (Se entregan tambores vacíos al productor)</option>
                  <option value="DEVOLUCION">DEVOLUCION (El productor devuelve/entrega tambores)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cantidad de Tambores</label>
                <input 
                  type="number" required min="1"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newEnvaseForm.cantidad}
                  onChange={e => setNewEnvaseForm({ ...newEnvaseForm, cantidad: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Observaciones / Notas</label>
                <input 
                  type="text"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newEnvaseForm.obs}
                  placeholder="Detalle del camión, chofer o remito..."
                  onChange={e => setNewEnvaseForm({ ...newEnvaseForm, obs: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddEnvase(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--secondary)', color: '#FFFFFF', borderRadius: '8px', fontWeight: 600 }}>
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Registrar Movimiento Cuenta Corriente & Miel Equivalente */}
      {showAddCC && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="card-premium" style={{ width: '550px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registrar Transacción en Cuenta Corriente</h3>
            
            <form onSubmit={handleCreateCC} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tipo de Operación</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                    value={newCCForm.tipo_transaccion}
                    onChange={e => {
                      const val = e.target.value as any;
                      let matchedTipo: 'DEBE' | 'HABER' = 'DEBE';
                      if (val === 'VENTA_LIQUIDACION') matchedTipo = 'HABER';
                      setNewCCForm({ ...newCCForm, tipo_transaccion: val, tipo: matchedTipo });
                    }}
                  >
                    <option value="ANTICIPO_CASH">Anticipo Efectivo / Transferencia</option>
                    <option value="RETIRO_INSUMO">Retiro de Insumo (Materiales)</option>
                    <option value="CARGO_ENVASE">Cargo / Alquiler de Tambor</option>
                    <option value="VENTA_LIQUIDACION">Venta / Liquidación de Miel (Fijar Precio)</option>
                    <option value="SALDO_INICIAL">Saldo Inicial</option>
                    <option value="AJUSTE">Ajuste de Cuenta</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fecha Operación</label>
                  <input 
                    type="date"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newCCForm.fecha}
                    onChange={e => setNewCCForm({ ...newCCForm, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Moneda</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                    value={newCCForm.moneda}
                    onChange={e => setNewCCForm({ ...newCCForm, moneda: e.target.value as any })}
                  >
                    <option value="ARS">Pesos (ARS)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dirección (Imputación)</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                    value={newCCForm.tipo}
                    onChange={e => setNewCCForm({ ...newCCForm, tipo: e.target.value as any })}
                  >
                    <option value="DEBE">DEBE (Apicultor retira dinero/insumos - Débito)</option>
                    <option value="HABER">HABER (Liquidación o cobro - Crédito)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Monto Financiero (Efectivo)</label>
                  <input 
                    type="number" required min="0" step="any"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newCCForm.monto}
                    onChange={e => setNewCCForm({ ...newCCForm, monto: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio Ref. Miel (por kg)</label>
                  <input 
                    type="number" required min="0" step="any"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newCCForm.precio_referencia_miel}
                    placeholder="Ej: 300 o 1.2"
                    onChange={e => setNewCCForm({ ...newCCForm, precio_referencia_miel: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kilos Miel Equiv. (Manual o auto-calculado si se deja en 0)</label>
                <input 
                  type="number" step="any"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newCCForm.kilos_miel_equiv}
                  placeholder="0 para auto-calcular"
                  onChange={e => setNewCCForm({ ...newCCForm, kilos_miel_equiv: parseFloat(e.target.value) })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Auto-cálculo: `{newCCForm.precio_referencia_miel > 0 ? (newCCForm.monto / newCCForm.precio_referencia_miel).toFixed(2) : '0.00'} kg` de miel.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descripción / Detalle</label>
                <input 
                  type="text" required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newCCForm.detalle}
                  placeholder="Ej. Retira ahumador - Remito PA-110..."
                  onChange={e => setNewCCForm({ ...newCCForm, detalle: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddCC(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--secondary)', color: '#FFFFFF', borderRadius: '8px', fontWeight: 600 }}>
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Registrar Movimiento de Opérculo / Cera */}
      {showAddOperculo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="card-premium" style={{ width: '450px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registrar Movimiento de Opérculo</h3>
            
            <form onSubmit={handleCreateOperculo} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tipo de Movimiento</label>
                <select 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                  value={newOperculoForm.tipo}
                  onChange={e => setNewOperculoForm({ ...newOperculoForm, tipo: e.target.value as any })}
                >
                  <option value="ENTREGA_OP">Entrega de Opérculo Bruto (+)</option>
                  <option value="RETIRO_CERA">Retiro de Cajas de Cera (-)</option>
                  <option value="AJUSTE">Ajuste de Saldo</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fecha Operación</label>
                <input 
                  type="date"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newOperculoForm.fecha}
                  onChange={e => setNewOperculoForm({ ...newOperculoForm, fecha: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {newOperculoForm.tipo === 'RETIRO_CERA' ? 'Kilos de Cera Brutos a retirar (ej: 70)' : 'Kilos de Opérculo (Variación)'}
                </label>
                <input 
                  type="number" required min="1" step="any"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newOperculoForm.kilos_op}
                  onChange={e => setNewOperculoForm({ ...newOperculoForm, kilos_op: parseFloat(e.target.value) })}
                />
                {newOperculoForm.tipo === 'RETIRO_CERA' && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Al retirar cera, se calculará: `-{newOperculoForm.kilos_op} kg / {newOperculoForm.rendimiento_cera} = -{(newOperculoForm.kilos_op / newOperculoForm.rendimiento_cera).toFixed(1)} kg` de opérculo equivalente.
                  </span>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rendimiento Cera Estándar</label>
                <input 
                  type="number" required step="0.01"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newOperculoForm.rendimiento_cera}
                  onChange={e => setNewOperculoForm({ ...newOperculoForm, rendimiento_cera: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descripción / Observaciones</label>
                <input 
                  type="text" required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newOperculoForm.detalle}
                  placeholder="Ej. Entrega 443kg Op / Retira 7 cajas cera 3/4..."
                  onChange={e => setNewOperculoForm({ ...newOperculoForm, detalle: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddOperculo(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--secondary)', color: '#FFFFFF', borderRadius: '8px', fontWeight: 600 }}>
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
