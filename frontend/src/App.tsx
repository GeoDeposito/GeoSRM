/* src/App.tsx */
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Bell, 
  Key, 
  LogOut, 
  Plus, 
  ArrowLeft, 
  Search, 
  Info,
  Menu,
  Truck,
  DollarSign,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { srmService } from './services/srmService';
import { isMockMode } from './services/supabaseClient';
import type { Apicultor, ApicultorCompleto } from './types/srm.types';
import './App.css';


function App() {
  // Estados de navegación y datos
  const [apicultores, setApicultores] = useState<Apicultor[]>([]);
  const [apicultorSeleccionado, setApicultorSeleccionado] = useState<ApicultorCompleto | null>(null);
  const [view, setView] = useState<'dashboard' | 'directorio' | 'detail'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filtroAlerta, setFiltroAlerta] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'entregas' | 'envases' | 'cuenta_corriente' | 'operculo'>('general');
  const [globalStats, setGlobalStats] = useState<{
    totalKilosMiel: number;
    totalTamboresCampo: number;
    totalMielEquivSaldo: number;
    incidencias: any[];
  }>({
    totalKilosMiel: 0,
    totalTamboresCampo: 0,
    totalMielEquivSaldo: 0,
    incidencias: []
  });
  
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
      const stats = await srmService.getGlobalStats();
      setGlobalStats(stats);
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
      // Auto-calculate or adjust manual input to ensure correct sign based on transaction type
      let finalKilos = newCCForm.kilos_miel_equiv;
      if (finalKilos === 0 && newCCForm.precio_referencia_miel > 0) {
        finalKilos = newCCForm.monto / newCCForm.precio_referencia_miel;
      }
      
      // Assign the correct sign: DEBE and VENTA_LIQUIDACION decrease honey balance (negative), HABER increases it (positive)
      if (newCCForm.tipo_transaccion === 'VENTA_LIQUIDACION' || newCCForm.tipo === 'DEBE') {
        finalKilos = -Math.abs(finalKilos);
      } else {
        finalKilos = Math.abs(finalKilos);
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
  const apicultoresFiltrados = apicultores.filter(a => {
    const matchesSearch = 
      a.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.cuit.includes(searchQuery) ||
      (a.cod_api && a.cod_api.includes(searchQuery)) ||
      (a.dni && a.dni.includes(searchQuery)) ||
      (a.renapa && a.renapa.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.localidad && a.localidad.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.provincia && a.provincia.toLowerCase().includes(searchQuery.toLowerCase()));
      
    if (!matchesSearch) return false;
    
    if (filtroAlerta) {
      const tieneIncidencia = globalStats.incidencias.some(inc => inc.apicultor_nombre === a.nombre);
      const bajoRating = a.puntuacion < 4.5;
      const tieneEnvases = getSaldoEnvases(a.id) > 0;
      return tieneIncidencia || bajoRating || tieneEnvases;
    }
    
    return true;
  });


  return (
    <div className="app-container">
      {/* Overlay del Sidebar para móviles */}
      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setMobileMenuOpen(false)} 
      />

      {/* -------------------------------------------------------------------
          BARRA LATERAL (Sidebar)
          ------------------------------------------------------------------- */}
      <aside className={`sidebar-premium ${mobileMenuOpen ? 'open' : ''}`}>
        <div>
          {/* Logo y Encabezado de Geomiel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem', padding: '0.25rem 0.5rem' }}>
            <img 
              src="/logo-geomiel.png" 
              alt="GeoMiel Logo" 
              style={{ height: '52px', width: 'auto', objectFit: 'contain', alignSelf: 'flex-start' }} 
            />
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: '0.25rem' }}>
              <span className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: 700, letterSpacing: '0.12em' }}>
                ADMIN EXECUTIVE SUITE
              </span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <button 
              onClick={() => { setView('dashboard'); setApicultorSeleccionado(null); setFiltroAlerta(false); setMobileMenuOpen(false); }}
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
                <span>Dashboard Central</span>
              </div>
            </button>

            <button 
              onClick={() => { setView('directorio'); setApicultorSeleccionado(null); setFiltroAlerta(false); setMobileMenuOpen(false); }}
              className="font-title"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: (view === 'directorio' && !filtroAlerta) ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: (view === 'directorio' && !filtroAlerta) ? 'var(--bg-sidebar-active)' : 'transparent',
                color: (view === 'directorio' && !filtroAlerta) ? 'var(--primary)' : 'var(--text-body)',
                borderLeft: (view === 'directorio' && !filtroAlerta) ? '4px solid var(--primary)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={18} />
                <span>Red de Proveedores</span>
              </div>
              {apicultores.length > 0 && (
                <span className="font-mono" style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(8,32,26,0.05)',
                  color: 'var(--primary)',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontWeight: 700
                }}>
                  {apicultores.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setView('directorio'); setApicultorSeleccionado(null); setFiltroAlerta(true); setMobileMenuOpen(false); }}
              className="font-title"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: (view === 'directorio' && filtroAlerta) ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: (view === 'directorio' && filtroAlerta) ? 'var(--bg-sidebar-active)' : 'transparent',
                color: (view === 'directorio' && filtroAlerta) ? 'var(--primary)' : 'var(--text-body)',
                borderLeft: (view === 'directorio' && filtroAlerta) ? '4px solid var(--primary)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
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
                {globalStats.incidencias.length}
              </span>
            </button>
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
              backgroundColor: 'var(--primary)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#FFFFFF'
            }}>
              GM
            </div>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-title)' }}>Admin Geomiel</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ENTERPRISE</span>
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
              Clave
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
          paddingBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Botón menú móvil */}
            <button 
              className="burger-menu-btn" 
              onClick={() => setMobileMenuOpen(true)}
              style={{ marginRight: '0.75rem' }}
            >
              <Menu size={22} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <span style={{ textTransform: 'uppercase' }}>
                  {view === 'dashboard' ? 'Finanzas' : view === 'directorio' ? 'Admin' : 'Registro'}
                </span>
                <ChevronRight size={12} />
                <span style={{ textTransform: 'uppercase', color: 'var(--secondary)' }}>
                  {view === 'dashboard' ? 'Reportes Ejecutivos' : view === 'directorio' ? 'Apicultores' : 'Detalle de Apicultor'}
                </span>
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.02em', marginTop: '0.25rem' }}>
                {view === 'dashboard' ? 'Inteligencia Financiera' : view === 'directorio' ? 'Panel de Gestión' : 'Ficha de Apicultor'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.125rem' }}>
                {view === 'dashboard' 
                  ? 'Balance consolidado en tiempo real y rendimiento de ventas operativas de miel.'
                  : view === 'directorio'
                    ? 'Monitoreo en vivo de utilidades, análisis de mieles y control de tambores vacíos.'
                    : 'Detalle consolidado de comportamiento, balances monetarios dobles y control analítico de calidad.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {view === 'dashboard' && (
              <>
                <div style={{
                  display: 'inline-flex',
                  backgroundColor: '#ECEAE9',
                  padding: '2px',
                  borderRadius: '10px'
                }}>
                  {['Mensual', 'Trimestral', 'Anual'].map((opt) => (
                    <button 
                      key={opt}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        backgroundColor: opt === 'Mensual' ? '#FFFFFF' : 'transparent',
                        color: opt === 'Mensual' ? 'var(--text-title)' : 'var(--text-secondary)',
                        boxShadow: opt === 'Mensual' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <button style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  backgroundColor: 'var(--secondary)',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}>
                  Exportar Reporte
                </button>
              </>
            )}
            
            {view === 'directorio' && (
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
                <Plus size={18} style={{ color: '#FFFFFF' }} />
                Registrar Apicultor
              </button>
            )}

            {view === 'detail' && apicultorSeleccionado && (
              <>
                <button 
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)'
                  }}
                >
                  Exportar PDF
                </button>
                <button 
                  onClick={() => {
                    alert('Editar Perfil disponible en producción.');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    backgroundColor: 'var(--secondary)',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  Editar Perfil
                </button>
              </>
            )}
          </div>
        </header>

        {/* -------------------------------------------------------------------
            VISTA 1: TABLERO / PANEL PRINCIPAL (DASHBOARD)
            ------------------------------------------------------------------- */}
        {/* -------------------------------------------------------------------
            VISTA 1: DASHBOARD CENTRAL (INTELIGENCIA FINANCIERA)
            ------------------------------------------------------------------- */}
        {view === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Columna Principal Izquierda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Tarjetas KPI de Inteligencia Financiera */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Ventas Totales</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>$142,500.00</h2>
                  <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>↗ +12.5% vs mes anterior</span>
                </div>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Gastos Operativos</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>$38,200.00</h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>↗ +4.2% vs presupuestado</span>
                </div>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Utilidad Neta</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>$104,300.00</h2>
                  <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>↗ +15.1% margen neto</span>
                </div>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Precio Promedio/Ton</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>$4,850.00</h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estable en el mercado global</span>
                </div>
              </div>

              {/* Gráficos de Desempeño */}
              <div className="charts-grid">
                
                {/* Gráfico Ventas vs Gastos */}
                <div className="card-premium">
                  <h3 className="font-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-title)', marginBottom: '0.5rem' }}>Ventas vs. Gastos</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Comparativa de ingresos y costos operativos mensuales en dólares.</p>
                  
                  <div className="bar-chart-container">
                    <div className="bar-chart-y-axis">
                      {/* Grid Lines */}
                      <div className="bar-chart-grid-line" style={{ bottom: '75%' }}></div>
                      <div className="bar-chart-grid-line" style={{ bottom: '50%' }}></div>
                      <div className="bar-chart-grid-line" style={{ bottom: '25%' }}></div>
                      
                      {[
                        { mes: 'Jun', ing: 110, cos: 35 },
                        { mes: 'Jul', ing: 135, cos: 45 },
                        { mes: 'Ago', ing: 160, cos: 50 },
                        { mes: 'Sep', ing: 185, cos: 55 },
                        { mes: 'Oct', ing: 155, cos: 40 },
                      ].map((m, idx) => (
                        <div key={idx} className="bar-chart-month-group">
                          <div className="bar-chart-bars">
                            <div 
                              className="bar-chart-bar bar-chart-bar-ingresos" 
                              style={{ height: `${(m.ing / 200) * 100}%` }}
                              data-val={`$${m.ing}k`}
                            />
                            <div 
                              className="bar-chart-bar bar-chart-bar-costos" 
                              style={{ height: `${(m.cos / 200) * 100}%` }}
                              data-val={`$${m.cos}k`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bar-chart-x-axis">
                      <span>Jun</span>
                      <span>Jul</span>
                      <span>Ago</span>
                      <span>Sep</span>
                      <span>Oct</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--secondary)' }}></div>
                      <span>Ingresos</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#5C6F68' }}></div>
                      <span>Gastos</span>
                    </div>
                  </div>
                </div>

                {/* Distribución por Tipo de Miel */}
                <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 className="font-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-title)', marginBottom: '0.5rem' }}>Distribución por Tipo</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Porcentaje del stock de miel física en depósito según floración.</p>
                  </div>
                  
                  <div className="donut-chart-wrapper">
                    {/* SVG Donut */}
                    <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                      <svg width="120" height="120" viewBox="0 0 42 42" className="donut">
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#EFEDED" strokeWidth="4.5"></circle>
                        {/* Multiflora 65% (stroke-dasharray: 65 35, stroke-dashoffset: 25) */}
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--secondary)" strokeWidth="4.5" strokeDasharray="65 35" strokeDashoffset="25"></circle>
                        {/* Eucalipto 25% (stroke-dasharray: 25 75, stroke-dashoffset: 60) */}
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--primary)" strokeWidth="4.5" strokeDasharray="25 75" strokeDashoffset="60"></circle>
                        {/* Azahar 10% (stroke-dasharray: 10 90, stroke-dashoffset: 35) */}
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--secondary-container)" strokeWidth="4.5" strokeDasharray="10 90" strokeDashoffset="35"></circle>
                      </svg>
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1
                      }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)' }}>28.4k</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, marginTop: '2px' }}>KILOS</span>
                      </div>
                    </div>

                    <div className="donut-chart-legend">
                      <div className="donut-legend-item">
                        <span><span className="donut-legend-color" style={{ backgroundColor: 'var(--secondary)' }}></span>Multiflora</span>
                        <strong className="font-mono">65%</strong>
                      </div>
                      <div className="donut-legend-item">
                        <span><span className="donut-legend-color" style={{ backgroundColor: 'var(--primary)' }}></span>Eucalipto</span>
                        <strong className="font-mono">25%</strong>
                      </div>
                      <div className="donut-legend-item">
                        <span><span className="donut-legend-color" style={{ backgroundColor: 'var(--secondary-container)' }}></span>Azahar</span>
                        <strong className="font-mono">10%</strong>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Transacciones Globales Recientes */}
              <section className="card-premium">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 className="font-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-title)' }}>
                    Transacciones Globales Recientes
                  </h3>
                  <span className="badge badge-info">En Vivo</span>
                </div>

                <div className="table-container">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th className="font-title">ID REF</th>
                        <th className="font-title">BENEFICIARIO / CLIENTE</th>
                        <th className="font-title">TIPO</th>
                        <th className="font-title">MÉTODO</th>
                        <th className="font-title">ESTADO</th>
                        <th className="font-title text-right">MONTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'TXN-9021', name: 'Exportadora del Sur', desc: 'Mercado Internacional', tipo: 'VENTA', met: 'Transferencia SWIFT', est: 'Completado', mon: 35000 },
                        { id: 'TXN-8984', name: 'Logística Abeja Real', desc: 'Flete Terrestre Carga', tipo: 'GASTO', met: 'Tarjeta Corp.', est: 'En Proceso', mon: 4200 },
                        { id: 'TXN-8952', name: 'Suministros Apícolas S.A.', desc: 'Insumos de Extracción', tipo: 'SUMINISTRO', met: 'Crédito Directo', est: 'Completado', mon: 12800 },
                        { id: 'TXN-8931', name: 'Distribuidora Naturalis', desc: 'Retail National Packs', tipo: 'VENTA', met: 'Pago en Línea', est: 'Completado', mon: 22500 }
                      ].map((tx) => (
                        <tr key={tx.id} className="table-row-hover">
                          <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{tx.id}</td>
                          <td>
                            <strong style={{ display: 'block', color: 'var(--text-title)' }}>{tx.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.desc}</span>
                          </td>
                          <td>
                            <span className={`badge ${tx.tipo === 'VENTA' ? 'badge-success' : tx.tipo === 'GASTO' ? 'badge-danger' : 'badge-amber'}`}>
                              {tx.tipo}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{tx.met}</td>
                          <td>
                            <span className={`badge ${tx.est === 'Completado' ? 'badge-success' : 'badge-amber'}`}>
                              {tx.est}
                            </span>
                          </td>
                          <td className="font-mono text-right" style={{ fontWeight: 700, color: tx.tipo === 'VENTA' ? '#137333' : 'var(--text-title)' }}>
                            {tx.tipo === 'VENTA' ? '+' : '-'}${tx.mon.toLocaleString('es-AR')}.00
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>

            {/* Columna Lateral Derecha (Sidebar Ejecutivo) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Perspectiva de Cosecha Q4 */}
              <div className="card-premium" style={{
                backgroundColor: 'var(--primary-container)',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'49\' viewBox=\'0 0 28 49\'%3E%3Cpath fill=\'%23ffffff\' fill-opacity=\'0.03\' d=\'M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.91v12.18l10.99 6.34 11-6.34V17.91l-11-6.34L3 17.91z\'/%3E%3C/svg%3E")'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} style={{ color: 'var(--secondary-container)' }} />
                  <span className="label-caps" style={{ color: 'var(--secondary-container)', fontSize: '0.65rem' }}>Proyección de Cosecha</span>
                </div>
                <h3 className="font-title" style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>
                  Perspectiva de Cosecha Q4
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#B3C4BF', lineHeight: 1.4 }}>
                  Se espera un alto rendimiento para las variedades de Eucalipto basado en los informes biométricos y climáticos actuales de la región.
                </p>
                <button 
                  onClick={() => alert('Descargando modelo predictivo Q4.')}
                  style={{
                    backgroundColor: 'var(--secondary-container)',
                    color: 'var(--primary)',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    marginTop: '0.5rem'
                  }}
                >
                  Descargar Modelo Predictivo
                </button>
              </div>

              {/* Alertas SRM e Incumplimientos */}
              <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <Bell size={18} style={{ color: 'var(--danger)' }} />
                  <h4 className="font-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-title)' }}>Alertas de Control</h4>
                </div>

                {/* Alerta Presupuesto */}
                <div style={{
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid rgba(186, 26, 26, 0.1)',
                  borderRadius: '12px',
                  padding: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--danger-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alerta de Presupuesto</strong>
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#F87171', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>CRÍTICO</span>
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-title)', marginTop: '0.25rem' }}>EXCESO DE PRESUPUESTO</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    El gasto en Logística excedió el límite proyectado para Octubre (+15%). Requiere revisión del CFO.
                  </p>
                </div>

                {/* Alerta Cobro Pendiente */}
                <div style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid rgba(217, 119, 6, 0.1)',
                  borderRadius: '12px',
                  padding: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <strong style={{ fontSize: '0.75rem', color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobro Pendiente</strong>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-title)', marginTop: '0.25rem' }}>EXPORTADORA DEL SUR</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    Pago de $12.4k programado para procesamiento automático el 15/10.
                  </p>
                </div>

                {/* Alertas dinámicas de apicultores (incidencias de calidad) */}
                {globalStats.incidencias.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Calidad de Proveedores</span>
                    {globalStats.incidencias.map((inc) => (
                      <div 
                        key={inc.id} 
                        onClick={() => {
                          setView('directorio');
                          setFiltroAlerta(true);
                        }}
                        style={{
                          backgroundColor: '#FFF5F5',
                          borderLeft: '3px solid var(--danger)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.75rem', color: 'var(--text-title)', display: 'block' }}>{inc.apicultor_nombre}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Humedad: {inc.humedad}%</span>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Directrices de Gobernanza */}
              <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 className="font-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-title)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Directrices de Gobernanza
                </h4>
                <ul style={{
                  paddingLeft: '1.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  lineHeight: 1.4
                }}>
                  <li>Mantener la liquidez operativa por encima del 15% del total auditado.</li>
                  <li>Auditoría externa trimestral mandatoria de todas las cuentas de apicultores.</li>
                  <li>Exigir reporte RENAPA actualizado para liquidaciones mayores a $10k USD.</li>
                </ul>
              </div>

            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            VISTA 2: DIRECTORIO DE APICULTORES (RED DE PROVEEDORES)
            ------------------------------------------------------------------- */}
        {view === 'directorio' && (
          <>
            {/* Tarjetas KPI del Directorio */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div className="card-premium hex-pattern" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: 'rgba(8, 32, 26, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                }}>
                  <Users size={24} />
                </div>
                <div>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Total Apicultores</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>1,284</span>
                  <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>↗ +12% vs mes anterior</span>
                </div>
              </div>

              <div className="card-premium hex-pattern" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: 'rgba(19, 115, 51, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#137333'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>verified_user</span>
                </div>
                <div>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Tasa de Verificación</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>98.2%</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>1,261 apicultores validados</span>
                </div>
              </div>

              <div className="card-premium hex-pattern" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: 'rgba(125, 87, 0, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>star</span>
                </div>
                <div>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Rating Global</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>4.85</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Basado en 500 entregas</span>
                </div>
              </div>

              <div className="card-premium hex-pattern" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: 'rgba(8, 32, 26, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>hive</span>
                </div>
                <div>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Apiarios Activos</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>4,512</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>En producción actual</span>
                </div>
              </div>
            </div>

            {/* Buscador, Filtros y Herramientas */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem'
            }}>
              {/* Tabs de Filtro Rápido */}
              <div style={{
                display: 'inline-flex',
                backgroundColor: '#ECEAE9',
                padding: '3px',
                borderRadius: '10px'
              }}>
                <button 
                  onClick={() => setFiltroAlerta(false)}
                  style={{
                    padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px',
                    backgroundColor: !filtroAlerta ? 'var(--secondary)' : 'transparent',
                    color: !filtroAlerta ? '#FFFFFF' : 'var(--text-secondary)',
                    boxShadow: !filtroAlerta ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFiltroAlerta(true)}
                  style={{
                    padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px',
                    backgroundColor: filtroAlerta ? 'var(--secondary)' : 'transparent',
                    color: filtroAlerta ? '#FFFFFF' : 'var(--text-secondary)',
                    boxShadow: filtroAlerta ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  En Revisión / Alerta ({globalStats.incidencias.length})
                </button>
              </div>

              {/* Buscador Integrado */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, maxWidth: '450px', minWidth: '280px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre, CUIT, RENAPA o localidad..."
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
                  onClick={() => alert('Exportando listado de apicultores a CSV.')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.625rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Listado de Apicultores */}
            <section className="card-premium">
              <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-title)' }}>
                Directorio y Fichas de Control de Productores
              </h3>

              <div className="table-container">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th className="font-title">Apicultor</th>
                      <th className="font-title">Identificación (CUIT)</th>
                      <th className="font-title">Ubicación</th>
                      <th className="font-title">Apiarios</th>
                      <th className="font-title">Rating</th>
                      <th className="font-title">Estado</th>
                      <th className="font-title text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apicultoresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem' }}>
                          No se encontraron apicultores registrados.
                        </td>
                      </tr>
                    ) : (
                      apicultoresFiltrados.map((a) => {
                        const tieneIncidencia = globalStats.incidencias.some(inc => inc.apicultor_nombre === a.nombre);
                        const apiariosCount = Math.floor((a.nombre.length * 7) % 15) + 3; // Mock apiarios count
                        
                        let estadoBadge = <span className="badge badge-success">Activo</span>;
                        if (tieneIncidencia || a.puntuacion < 4.5) {
                          estadoBadge = <span className="badge badge-danger">En Revisión</span>;
                        } else if (a.puntuacion < 3.8) {
                          estadoBadge = <span className="badge badge-danger">Inactivo</span>;
                        }

                        return (
                          <tr key={a.id} className="table-row-hover">
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  width: '38px', height: '38px', borderRadius: '50%',
                                  backgroundColor: tieneIncidencia ? 'rgba(186, 26, 26, 0.08)' : 'rgba(8, 32, 26, 0.08)',
                                  color: tieneIncidencia ? 'var(--danger)' : 'var(--primary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.85rem'
                                }}>
                                  {a.nombre.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ display: 'block', color: 'var(--text-title)' }}>{a.nombre}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.nombre.toLowerCase().replace(/ /g, '') + '@geomiel.com'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="font-mono">{a.cuit}</td>
                            <td>{a.localidad ? `${a.localidad}, ${a.provincia || 'Ubicación'}` : 'No declarada'}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>hive</span>
                                <strong className="font-mono">{apiariosCount}</strong>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '18px' }}>star</span>
                                <span className="font-mono" style={{ fontWeight: 700 }}>{a.puntuacion.toFixed(1)}</span>
                              </div>
                            </td>
                            <td>{estadoBadge}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => seleccionarApicultor(a.id)}
                                className="font-title"
                                style={{
                                  padding: '0.5rem 1.25rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--secondary)',
                                  color: '#FFFFFF',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                }}
                              >
                                DETALLES
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
            VISTA 3: FICHA DE APICULTOR (DETALLE 360°)
            ------------------------------------------------------------------- */}
        {view === 'detail' && apicultorSeleccionado && (
          <>
            {/* Botón de Retorno */}
            <div style={{ marginBottom: '1rem' }}>
              <button 
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
                <ArrowLeft size={16} />
                Volver al Directorio de Proveedores
              </button>
            </div>

            <div className="ficha-grid">
              
              {/* Columna Izquierda: Perfil y Apiarios */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Perfil del Apicultor */}
                <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.25rem' }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-sidebar-active)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '2rem',
                    border: '3px solid var(--border-color-glow)',
                    fontFamily: 'var(--font-title)'
                  }}>
                    {apicultorSeleccionado.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)' }}>
                      {apicultorSeleccionado.nombre}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Socio Registrado #AP-{apicultorSeleccionado.cod_api || '4402'}
                    </span>
                  </div>

                  <span className="badge badge-success" style={{ padding: '0.35rem 1rem' }}>Activo</span>

                  <div style={{
                    width: '100%',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem'
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
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span> Correo Electrónico
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }}>
                        {apicultorSeleccionado.nombre.toLowerCase().replace(/ /g, '')}@geomiel.com
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Mapa de Distribución de Apiarios */}
                <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="label-caps" style={{ fontSize: '0.65rem' }}>Distribución de Apiarios</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Uruguay / G. Pico</span>
                  </div>
                  
                  {/* Contenedor Gráfico del Mapa */}
                  <div style={{
                    width: '100%',
                    height: '220px',
                    borderRadius: '12px',
                    backgroundColor: '#1E352F',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* SVG Map Lines */}
                    <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.15 }}>
                      <path d="M20,10 Q60,40 100,20 T180,80 T260,110 T300,220" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                      <path d="M10,90 Q80,120 150,140 T220,170 T320,190" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
                    </svg>
                    
                    {/* Dots representing apiarios */}
                    {[
                      { t: '15%', l: '30%' },
                      { t: '25%', l: '60%' },
                      { t: '35%', l: '20%' },
                      { t: '40%', l: '45%' },
                      { t: '50%', l: '75%' },
                      { t: '65%', l: '35%' },
                      { t: '75%', l: '65%' },
                      { t: '80%', l: '50%' },
                      { t: '20%', l: '85%' },
                      { t: '60%', l: '15%' }
                    ].map((dot, idx) => (
                      <div 
                        key={idx}
                        style={{
                          position: 'absolute',
                          top: dot.t,
                          left: dot.l,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--secondary-container)',
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 0 8px var(--secondary-container)',
                          cursor: 'pointer'
                        }}
                        title={`Apiario #${idx + 1}`}
                      />
                    ))}
                    
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      backgroundColor: 'rgba(8, 32, 26, 0.85)',
                      backdropFilter: 'blur(4px)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FFFFFF' }}>Total Apiarios: 12</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Columna Derecha: KPIs e Historial de Transacciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Métricas de la Ficha */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.25rem'
                }}>
                  <div className="card-premium">
                    <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Saldo Tambores</span>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>
                      {apicultorSeleccionado.stats.saldo_envases}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>+12 esta semana</span>
                  </div>
                  <div className="card-premium">
                    <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Liquidación Pendiente</span>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>
                      ${Math.abs(apicultorSeleccionado.stats.saldo_financiero_ars).toLocaleString('es-AR')}.00
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Siguiente pago: Oct 25</span>
                  </div>
                  <div className="card-premium">
                    <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Entregas Totales</span>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>
                      {(apicultorSeleccionado.stats.entregas_totales_kilos / 1000).toFixed(1)}k
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Miel de Pradera: 80%</span>
                  </div>
                </div>

                {/* Panel de Operaciones Rápidas */}
                <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem' }}>Operaciones Comerciales</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setShowAddEntrega(true)}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: 'var(--secondary)',
                        color: '#FFFFFF', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem'
                      }}
                    >
                      <Plus size={14} style={{ color: '#FFFFFF' }} /> Registrar Entrega
                    </button>
                    <button 
                      onClick={() => setShowAddEnvase(true)}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF', color: 'var(--text-body)', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem'
                      }}
                    >
                      <Truck size={14} /> Registrar Envases
                    </button>
                    <button 
                      onClick={() => setShowAddCC(true)}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF', color: 'var(--text-body)', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem'
                      }}
                    >
                      <DollarSign size={14} /> Transacción CC
                    </button>
                    <button 
                      onClick={() => setShowAddOperculo(true)}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF', color: 'var(--text-body)', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>hive</span> Opérculo
                    </button>
                  </div>
                </div>

                {/* Historial de Transacciones */}
                <section className="card-premium">
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <h3 className="font-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-title)' }}>
                      Historial de Transacciones
                    </h3>
                    
                    {/* Buscador de transacciones interno */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Buscar transacción..." 
                        style={{
                          padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                          fontSize: '0.8rem', outline: 'none'
                        }} 
                      />
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="table-premium">
                      <thead>
                        <tr>
                          <th className="font-title">Fecha</th>
                          <th className="font-title">Operación / Detalle</th>
                          <th className="font-title text-center">Tambores</th>
                          <th className="font-title text-right">Importe</th>
                          <th className="font-title text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Compile a list of all transactions across categories
                          const list: any[] = [];
                          
                          apicultorSeleccionado.entregas.forEach(e => {
                            list.push({
                              fecha: e.fecha,
                              operacion: `Entrega de Cosecha (Lote #${e.id.slice(0, 4).toUpperCase()})`,
                              tambores: e.cantidad_tambores,
                              importe: e.kilos_neto.toLocaleString() + ' kg',
                              est: 'Procesado',
                              tipo: 'delivery'
                            });
                          });

                          apicultorSeleccionado.envases.forEach(n => {
                            list.push({
                              fecha: n.fecha,
                              operacion: `${n.tipo_movimiento === 'PRESTAMO' ? 'Préstamo' : 'Devolución'} Envases - ${n.observaciones || 'Recupero'}`,
                              tambores: n.tipo_movimiento === 'PRESTAMO' ? n.cantidad : -n.cantidad,
                              importe: '--',
                              est: 'Confirmado',
                              tipo: 'envase'
                            });
                          });

                          apicultorSeleccionado.cuenta_corriente.forEach(cc => {
                            list.push({
                              fecha: cc.fecha,
                              operacion: `${cc.tipo_transaccion || 'MOVIMIENTO'} - ${cc.detalle}`,
                              tambores: 0,
                              importe: (cc.tipo_movimiento === 'DEBE' ? '-' : '+') + (cc.moneda === 'USD' ? 'u$s ' : '$') + cc.monto.toLocaleString(),
                              est: 'Liquidado',
                              tipo: 'cc'
                            });
                          });

                          // Sort by date descending
                          list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                  No hay transacciones registradas.
                                </td>
                              </tr>
                            );
                          }

                          return list.map((item, idx) => (
                            <tr key={idx} className="table-row-hover">
                              <td className="font-mono">{new Date(item.fecha).toLocaleDateString('es-AR')}</td>
                              <td>
                                <strong style={{ color: 'var(--text-title)' }}>{item.operacion}</strong>
                              </td>
                              <td className="font-mono text-center" style={{ color: item.tambores !== 0 ? 'var(--text-title)' : 'var(--text-secondary)' }}>
                                {item.tambores !== 0 ? (item.tambores > 0 ? `+${item.tambores}` : item.tambores) : '--'}
                              </td>
                              <td className="font-mono text-right" style={{ 
                                fontWeight: 700, 
                                color: item.importe.startsWith('-') ? 'var(--danger)' : (item.importe.startsWith('+') ? '#137333' : 'var(--text-title)') 
                              }}>
                                {item.importe}
                              </td>
                              <td className="text-right">
                                <span className={`badge ${
                                  item.est === 'Procesado' ? 'badge-success' : item.est === 'Confirmado' ? 'badge-info' : 'badge-amber'
                                }`}>
                                  {item.est}
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Sección Desplegable para Análisis Técnico Secundario (Tabs de Detalles) */}
                <details className="card-premium" style={{ cursor: 'pointer' }}>
                  <summary style={{ fontWeight: 800, color: 'var(--text-title)', fontSize: '0.9rem', outline: 'none' }}>
                    📊 Ver Radiografía Técnica Avanzada (Análisis de Tambores, Cuentas Corrientes y Ceras)
                  </summary>
                  <div style={{ marginTop: '1rem', cursor: 'default' }}>
                    
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1rem', overflowX: 'auto', marginBottom: '1rem' }}>
                      {[
                        { id: 'general', label: 'Ficha Impositiva' },
                        { id: 'entregas', label: `Muestreos de Calidad (${apicultorSeleccionado.entregas.length})` },
                        { id: 'envases', label: 'Envases Detalle' },
                        { id: 'cuenta_corriente', label: 'Cuenta Corriente / Kilos Equivalentes' },
                        { id: 'operculo', label: `Opérculo y Cera (${apicultorSeleccionado.operculo?.length || 0})` }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id as any)}
                          style={{
                            padding: '0.5rem 0.25rem',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            color: activeTab === t.id ? 'var(--secondary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === t.id ? '3px solid var(--secondary)' : 'none',
                            marginBottom: '-2px'
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Contenido Dinámico de Tabs */}
                    {activeTab === 'general' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', padding: '0.5rem' }}>
                        <div>
                          <label className="label-caps">Código API</label>
                          <p className="font-mono" style={{ fontWeight: 700 }}>{apicultorSeleccionado.cod_api || '-'}</p>
                        </div>
                        <div>
                          <label className="label-caps">CUIT / DNI</label>
                          <p className="font-mono" style={{ fontWeight: 700 }}>{apicultorSeleccionado.cuit} {apicultorSeleccionado.dni ? ` / ${apicultorSeleccionado.dni}` : ''}</p>
                        </div>
                        <div>
                          <label className="label-caps">RENAPA</label>
                          <p className="font-mono" style={{ fontWeight: 700, textTransform: 'uppercase' }}>{apicultorSeleccionado.renapa || '-'}</p>
                        </div>
                        <div>
                          <label className="label-caps">Rating de Proveedor</label>
                          <p className="font-mono" style={{ fontWeight: 700 }}>{apicultorSeleccionado.puntuacion.toFixed(1)} / 5.0</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'entregas' && (
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
                                <td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>No hay entregas registradas.</td>
                              </tr>
                            ) : (
                              apicultorSeleccionado.entregas.map((e) => (
                                <tr key={e.id}>
                                  <td className="font-mono">{new Date(e.fecha).toLocaleDateString()}</td>
                                  <td className="font-mono">{e.color_pfund} mm</td>
                                  <td className="font-mono" style={{ fontWeight: 700, color: e.humedad > 18 ? 'var(--danger)' : 'var(--text-title)' }}>
                                    {e.humedad}%
                                  </td>
                                  <td className="font-mono" style={{ fontWeight: 700, color: e.hmf > 40 ? 'var(--danger)' : 'var(--text-title)' }}>
                                    {e.hmf} mg/kg
                                  </td>
                                  <td className="font-mono">{e.cantidad_tambores}</td>
                                  <td className="font-mono" style={{ fontWeight: 700 }}>{e.kilos_neto.toLocaleString()} kg</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'envases' && (
                      <div className="table-container">
                        <table className="table-premium">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Operación</th>
                              <th>Cantidad</th>
                              <th>Observaciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apicultorSeleccionado.envases.length === 0 ? (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>No hay movimientos de envases.</td>
                              </tr>
                            ) : (
                              apicultorSeleccionado.envases.map((env) => (
                                <tr key={env.id}>
                                  <td className="font-mono">{new Date(env.fecha).toLocaleDateString()}</td>
                                  <td>
                                    <span className={`badge ${env.tipo_movimiento === 'PRESTAMO' ? 'badge-danger' : 'badge-success'}`}>
                                      {env.tipo_movimiento === 'PRESTAMO' ? 'PRESTAMO' : 'DEVOLUCION'}
                                    </span>
                                  </td>
                                  <td className="font-mono" style={{ fontWeight: 700 }}>{env.cantidad} tambores</td>
                                  <td>{env.observaciones || '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'cuenta_corriente' && (
                      <div className="table-container">
                        <table className="table-premium">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Operación</th>
                              <th>Importe</th>
                              <th>Precio Ref.</th>
                              <th>Miel Equiv. (kg)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apicultorSeleccionado.cuenta_corriente.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No hay movimientos financieros.</td>
                              </tr>
                            ) : (
                              apicultorSeleccionado.cuenta_corriente.map((item) => (
                                <tr key={item.id}>
                                  <td className="font-mono">{new Date(item.fecha).toLocaleDateString()}</td>
                                  <td>
                                    <span className="badge badge-info">{item.tipo_transaccion || 'CC'}</span>
                                    <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>{item.detalle}</span>
                                  </td>
                                  <td className="font-mono" style={{ fontWeight: 700 }}>
                                    {item.tipo_movimiento === 'DEBE' ? '-' : '+'}{item.moneda === 'USD' ? 'u$s ' : '$'}{item.monto.toLocaleString()}
                                  </td>
                                  <td className="font-mono">{item.precio_referencia_miel ? `${item.moneda === 'USD' ? 'u$s ' : '$'}${item.precio_referencia_miel}/kg` : '--'}</td>
                                  <td className="font-mono" style={{ fontWeight: 800, color: (item.kilos_miel_equiv || 0) < 0 ? 'var(--danger)' : 'var(--primary)' }}>
                                    {item.kilos_miel_equiv ? `${item.kilos_miel_equiv > 0 ? '+' : ''}${item.kilos_miel_equiv.toLocaleString()} kg` : '--'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'operculo' && (
                      <div className="table-container">
                        <table className="table-premium">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Operación</th>
                              <th>Detalle</th>
                              <th>Rendimiento</th>
                              <th>Opérculo (kg)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(apicultorSeleccionado.operculo || []).length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No hay movimientos de opérculo.</td>
                              </tr>
                            ) : (
                              apicultorSeleccionado.operculo.map((op) => (
                                <tr key={op.id}>
                                  <td className="font-mono">{new Date(op.fecha).toLocaleDateString()}</td>
                                  <td>
                                    <span className={`badge ${op.kilos_op < 0 ? 'badge-danger' : 'badge-success'}`}>
                                      {op.tipo_movimiento}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{op.detalle || '-'}</td>
                                  <td className="font-mono">{op.rendimiento_cera}</td>
                                  <td className="font-mono" style={{ fontWeight: 700 }}>{op.kilos_op > 0 ? '+' : ''}{op.kilos_op.toFixed(1)} kg</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                </details>

              </div>

            </div>
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
          zIndex: 999, padding: '1rem'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '550px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
          zIndex: 999, padding: '1rem'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '450px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          zIndex: 999, padding: '1rem'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '450px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          zIndex: 999, padding: '1rem'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '550px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    onChange={e => setNewCCForm({ ...newCCForm, monto: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio Ref. Pactado con Apicultor (por kg)</label>
                  <input 
                    type="number" required min="0" step="any"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newCCForm.precio_referencia_miel}
                    placeholder="Ej: 300 o 1.2"
                    onChange={e => setNewCCForm({ ...newCCForm, precio_referencia_miel: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kilos Miel Equiv. (Ingresar manualmente o dejar en 0 para auto-calcular)</label>
                <input 
                  type="number" step="any"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={newCCForm.kilos_miel_equiv}
                  placeholder="0 para auto-calcular"
                  onChange={e => setNewCCForm({ ...newCCForm, kilos_miel_equiv: parseFloat(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Auto-cálculo sugerido: <strong>{newCCForm.precio_referencia_miel > 0 ? (newCCForm.monto / newCCForm.precio_referencia_miel).toFixed(2) : '0.00'} kg</strong> de miel. El negocio con cada apicultor es particular.
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
          zIndex: 999, padding: '1rem'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '450px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
