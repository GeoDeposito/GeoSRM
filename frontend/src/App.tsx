/* src/App.tsx */
import { useState, useEffect, useMemo, Fragment } from 'react';
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
  ChevronRight,
  Kanban
} from 'lucide-react';
import { srmService } from './services/srmService';
import { isMockMode } from './services/supabaseClient';
import type { Apicultor, ApicultorCompleto, Producto, FichaEntregaMiel } from './types/srm.types';
import * as XLSX from 'xlsx';
import './App.css';


function App() {
  // Estados de navegación y datos
  const [apicultores, setApicultores] = useState<Apicultor[]>([]);
  const [apicultorSeleccionado, setApicultorSeleccionado] = useState<ApicultorCompleto | null>(null);
  const [view, setView] = useState<'dashboard' | 'directorio' | 'detail' | 'alertas' | 'embudo'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filtroAlerta, setFiltroAlerta] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'entregas' | 'envases' | 'cuenta_corriente' | 'operculo'>('general');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [entregas, setEntregas] = useState<FichaEntregaMiel[]>([]);
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
  const [nombreSearchQuery, setNombreSearchQuery] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filtroAlerta]);
  
  // Estados para diálogos (Modales)
  const [showAddApicultor, setShowAddApicultor] = useState(false);
  const [showAddEntrega, setShowAddEntrega] = useState(false);
  const [showAddEnvase, setShowAddEnvase] = useState(false);
  const [showAddCC, setShowAddCC] = useState(false);
  const [showAddOperculo, setShowAddOperculo] = useState(false);
  const [showPowerAutomateGuide, setShowPowerAutomateGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAuth, setCopiedAuth] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [syncTab, setSyncTab] = useState<'auto' | 'manual'>('auto');
  
  // Estados de formularios
  const [newApicultorForm, setNewApicultorForm] = useState({
    nombre: '',
    cuit: '',
    localidad: '',
    cod_api: '',
    provincia: '',
    dni: '',
    renapa: '',
    telefono: '',
    etapa: 'ACTIVO' as 'PROSPECTO' | 'CONTACTADO' | 'NEGOCIANDO' | 'ACTIVO',
    tag: 'PRODUCTOR',
    notas_onboarding: ''
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

  // Estados para cálculos reactivos en Cuenta Corriente (Formularios Avanzados)
  const [insumoCodigo, setInsumoCodigo] = useState<number | 'manual'>('manual');
  const [insumoCantidad, setInsumoCantidad] = useState<number>(1);
  const [insumoPrecioUnitario, setInsumoPrecioUnitario] = useState<number>(0);
  const [envaseTipo, setEnvaseTipo] = useState<'TNA' | 'TR'>('TNA');
  const [envaseCantidad, setEnvaseCantidad] = useState<number>(1);
  const [envasePrecioUnitarioUsd, setEnvasePrecioUnitarioUsd] = useState<number>(34.0);
  const [precioMielUsd, setPrecioMielUsd] = useState<number>(1.0);
  const [ventaKilos, setVentaKilos] = useState<number>(1000);
  const [ventaPrecioRef, setVentaPrecioRef] = useState<number>(1700);

  // Estados para el Embudo de Proveedores (Kanban)
  const [activeEmbudoTab, setActiveEmbudoTab] = useState<'embudo' | 'notas_feed'>('embudo');
  const [apicultorParaEditarEtapa, setApicultorParaEditarEtapa] = useState<Apicultor | null>(null);
  const [showQuickEditOnboardingModal, setShowQuickEditOnboardingModal] = useState(false);
  const [quickEditForm, setQuickEditForm] = useState({
    nombre: '',
    cuit: '',
    localidad: '',
    cod_api: '',
    provincia: '',
    dni: '',
    renapa: '',
    telefono: '',
    etapa: 'PROSPECTO' as 'PROSPECTO' | 'CONTACTADO' | 'NEGOCIANDO' | 'ACTIVO',
    tag: 'PRODUCTOR',
    notas_onboarding: ''
  });
  const [expandedRomaneos, setExpandedRomaneos] = useState<Record<string, boolean>>({});

  // Estado para la validación de RENAPA
  const [renapaStatus, setRenapaStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'warning' | 'error';
    message: string;
    showWhatsappBtn?: boolean;
    whatsappText?: string;
  }>({ type: 'idle', message: '' });

  // Resetear estado del validador de RENAPA al abrir o cerrar modals
  useEffect(() => {
    setRenapaStatus({ type: 'idle', message: '' });
  }, [showAddApicultor, showQuickEditOnboardingModal]);

  // Efecto para auto-calcular montos, miel equivalente y detalles de Cuenta Corriente reactivamente
  useEffect(() => {
    if (!showAddCC) return;
    
    const tipoTx = newCCForm.tipo_transaccion;
    if (tipoTx === 'ANTICIPO_CASH') {
      const precioRef = newCCForm.precio_referencia_miel;
      const calcKilos = precioRef > 0 ? -(newCCForm.monto / precioRef) : 0;
      setNewCCForm(prev => ({
        ...prev,
        tipo: 'DEBE',
        kilos_miel_equiv: Number(calcKilos.toFixed(2)),
        detalle: prev.detalle || `Anticipo de Fondos (${prev.moneda})`
      }));
    } else if (tipoTx === 'RETIRO_INSUMO') {
      const totalMonto = insumoCantidad * insumoPrecioUnitario;
      const precioRef = newCCForm.precio_referencia_miel || 1700;
      const calcKilos = precioRef > 0 ? -(totalMonto / precioRef) : 0;
      let prodDesc = 'Insumos Varios';
      if (insumoCodigo !== 'manual') {
        const prod = productos.find(p => p.codigo === insumoCodigo);
        if (prod) prodDesc = prod.descripcion;
      }
      setNewCCForm(prev => ({
        ...prev,
        moneda: 'ARS',
        tipo: 'DEBE',
        monto: totalMonto,
        precio_referencia_miel: precioRef,
        kilos_miel_equiv: Number(calcKilos.toFixed(2)),
        detalle: `Retiro de ${insumoCantidad} ${prodDesc} (Unitario: $${insumoPrecioUnitario})`
      }));
    } else if (tipoTx === 'CARGO_ENVASE') {
      const totalMonto = envaseCantidad * envasePrecioUnitarioUsd;
      const calcKilos = precioMielUsd > 0 ? -(totalMonto / precioMielUsd) : 0;
      const descEnvase = envaseTipo === 'TNA' ? 'Tambor Nuevo Apto (TNA)' : 'Tambor Retornable (TR/TRR)';
      setNewCCForm(prev => ({
        ...prev,
        moneda: 'USD',
        tipo: 'DEBE',
        monto: totalMonto,
        precio_referencia_miel: precioMielUsd,
        kilos_miel_equiv: Number(calcKilos.toFixed(2)),
        detalle: `Cargo de ${envaseCantidad} envases ${descEnvase} (Unitario: ${envasePrecioUnitarioUsd} USD)`
      }));
    } else if (tipoTx === 'VENTA_LIQUIDACION') {
      const totalMonto = ventaKilos * ventaPrecioRef;
      setNewCCForm(prev => ({
        ...prev,
        moneda: 'ARS',
        tipo: 'HABER',
        monto: totalMonto,
        precio_referencia_miel: ventaPrecioRef,
        kilos_miel_equiv: -Math.abs(ventaKilos), // Liquida reduce physical balance
        detalle: `Liquidación de ${ventaKilos.toLocaleString('es-AR')} kg de miel a $${ventaPrecioRef}/kg`
      }));
    }
  }, [
    newCCForm.tipo_transaccion,
    newCCForm.monto,
    newCCForm.precio_referencia_miel,
    newCCForm.moneda,
    insumoCodigo,
    insumoCantidad,
    insumoPrecioUnitario,
    envaseTipo,
    envaseCantidad,
    envasePrecioUnitarioUsd,
    precioMielUsd,
    ventaKilos,
    ventaPrecioRef,
    showAddCC
  ]);


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
      const prods = await srmService.listProductos();
      setProductos(prods);
      const listE = await srmService.listAllEntregas();
      setEntregas(listE);
    } catch (e) {
      console.error('Error cargando apicultores y productos:', e);
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
  // Helper para extraer DNI desde CUIT (remueve prefijo de 2 dígitos y sufijo de 1 dígito)
  const extraerDniDeCuit = (cuit: string): string => {
    const clean = cuit.replace(/\D/g, '');
    if (clean.length >= 10) {
      return clean.slice(2, clean.length - 1);
    }
    return '';
  };

  // Categorización Pareto 80/20 dinámica basada en volumen neto acumulado
  const apicultoresCategorizados = useMemo(() => {
    const kilosPorApicultor: { [apicultorId: string]: number } = {};
    
    // Inicializar
    apicultores.forEach(a => {
      kilosPorApicultor[a.id] = 0;
    });
    
    // Sumar entregas
    entregas.forEach(e => {
      if (kilosPorApicultor[e.apicultor_id] !== undefined) {
        kilosPorApicultor[e.apicultor_id] += e.kilos_neto;
      }
    });
    
    // Filtrar productores activos y ordenar por volumen descendente
    const apicultoresActivos = apicultores.filter(a => (a.etapa || 'ACTIVO') === 'ACTIVO');
    const apicultoresOrdenados = [...apicultoresActivos].sort((a, b) => {
      const kilosA = kilosPorApicultor[a.id] || 0;
      const kilosB = kilosPorApicultor[b.id] || 0;
      return kilosB - kilosA;
    });
    
    const totalMielFisica = apicultoresOrdenados.reduce((acc, a) => acc + (kilosPorApicultor[a.id] || 0), 0);
    
    let acumulado = 0;
    const idsClaseA = new Set<string>();
    
    for (const a of apicultoresOrdenados) {
      const kilos = kilosPorApicultor[a.id] || 0;
      if (kilos === 0) continue;
      
      // Si el acumulado es menor al 80% o es el primer productor
      if (acumulado < totalMielFisica * 0.8 || idsClaseA.size === 0) {
        idsClaseA.add(a.id);
        acumulado += kilos;
      } else {
        break;
      }
    }
    
    const mapaCategorias: { [id: string]: { categoria: 'A' | 'B'; kilos: number; porcentaje: number } } = {};
    apicultores.forEach(a => {
      const kilos = kilosPorApicultor[a.id] || 0;
      const pct = totalMielFisica > 0 ? (kilos / totalMielFisica) * 100 : 0;
      const esClaseA = idsClaseA.has(a.id);
      mapaCategorias[a.id] = {
        categoria: esClaseA ? 'A' : 'B',
        kilos,
        porcentaje: pct
      };
    });
    
    return {
      mapaCategorias,
      totalMielFisica,
      vipCount: idsClaseA.size
    };
  }, [apicultores, entregas]);

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
        newApicultorForm.telefono,
        newApicultorForm.etapa,
        newApicultorForm.tag,
        newApicultorForm.notas_onboarding
      );
      setNewApicultorForm({
        nombre: '',
        cuit: '',
        localidad: '',
        cod_api: '',
        provincia: '',
        dni: '',
        renapa: '',
        telefono: '',
        etapa: 'ACTIVO',
        tag: 'PRODUCTOR',
        notas_onboarding: ''
      });
      setShowAddApicultor(false);
      cargarApicultores();
    } catch (err) {
      alert('Error creando apicultor: ' + err);
    }
  };

  const handleImportarExcel = async (file: File) => {
    setIsImportingExcel(true);
    setImportProgress(0);
    setImportTotal(0);
    setImportErrorCount(0);
    setSyncMessage(null);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('pesaje') || 
        name.toLowerCase().includes('romaneo') || 
        name.toLowerCase().includes('tambor') ||
        name.toLowerCase().includes('datos')
      ) || workbook.SheetNames[0];
      
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      if (rawRows.length === 0) {
        setSyncMessage("Error: El archivo de Excel está vacío o no contiene hojas legibles.");
        setIsImportingExcel(false);
        return;
      }

      console.log("Filas leídas de Excel:", rawRows.length, rawRows);
      
      const findKey = (row: any, keywords: string[]) => {
        const keys = Object.keys(row);
        for (const kw of keywords) {
          const match = keys.find(k => 
            k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
          );
          if (match) return match;
        }
        return null;
      };

      const mappedRows: any[] = [];
      for (const row of rawRows) {
        const kFecha = findKey(row, ['fecha depo', 'fecha', 'deposito']);
        const kRomaneo = findKey(row, ['romaneo', 'remito', 'entrega']);
        const kApicultor = findKey(row, ['apicultor', 'nombre', 'proveedor']);
        const kIdGeo = findKey(row, ['id geo', 'tambor', 'nro_tambor', 'tcm']);
        const kSenasa = findKey(row, ['senasa', 'barras_ean', 'codigo_senasa', 'ean']);
        const kBruto = findKey(row, ['peso bruto', 'bruto', 'kilos_bruto']);
        const kTara = findKey(row, ['tara', 'peso tara']);
        
        const kColor = findKey(row, ['color', 'pfund']);
        const kHumedad = findKey(row, ['humedad', 'hum']);
        const kHmf = findKey(row, ['hmf']);

        if (!kRomaneo || !kIdGeo) continue;

        let fechaIso = new Date().toISOString();
        if (kFecha && row[kFecha]) {
          const fVal = row[kFecha];
          if (typeof fVal === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const msInDay = 24 * 60 * 60 * 1000;
            fechaIso = new Date(excelEpoch.getTime() + fVal * msInDay).toISOString();
          } else {
            try {
              fechaIso = new Date(fVal).toISOString();
            } catch (e) {
              fechaIso = new Date().toISOString();
            }
          }
        }

        const nombreApicultor = kApicultor ? String(row[kApicultor]).trim() : 'Apicultor Desconocido';
        const brutoVal = kBruto ? parseFloat(String(row[kBruto]).replace(',', '.')) : 300;
        const taraVal = kTara ? parseFloat(String(row[kTara]).replace(',', '.')) : 16;
        
        mappedRows.push({
          apicultor_nombre: nombreApicultor,
          cuit: '',
          fecha: fechaIso,
          romaneo: String(row[kRomaneo]).trim(),
          nro_tambor: String(row[kIdGeo]).trim(),
          barras_ean: kSenasa ? String(row[kSenasa]).trim() : '',
          lote: 14002,
          kilos_bruto: isNaN(brutoVal) ? 300 : brutoVal,
          tara: isNaN(taraVal) ? 16 : taraVal,
          color_pfund: kColor ? parseFloat(String(row[kColor]).replace(',', '.')) : 34,
          humedad: kHumedad ? parseFloat(String(row[kHumedad]).replace(',', '.')) : 17.2,
          hmf: kHmf ? parseFloat(String(row[kHmf]).replace(',', '.')) : 12.5,
          antibiotico: 'NEGATIVO'
        });
      }

      if (mappedRows.length === 0) {
        setSyncMessage("Error: No se encontraron columnas que coincidan con 'Romaneo' e 'ID GEO'.");
        setIsImportingExcel(false);
        return;
      }

      setImportTotal(mappedRows.length);
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < mappedRows.length; i++) {
        const row = mappedRows[i];
        try {
          await srmService.registrarTcmDesdeExcel(row);
          successCount++;
        } catch (err) {
          console.error("Error importando fila de Excel:", row, err);
          errorCount++;
        }
        setImportProgress(i + 1);
        setImportErrorCount(errorCount);
      }

      setSyncMessage(`Importación completada. Se procesaron ${mappedRows.length} filas: ${successCount} tambores (TCM) importados/actualizados y ${errorCount} errores.`);
      await cargarApicultores();
    } catch (err: any) {
      setSyncMessage("Error leyendo el archivo Excel: " + err.message);
    } finally {
      setIsImportingExcel(false);
    }
  };

  const handleVerificarRenapa = async (
    cuit: string, 
    nombreApicultor: string, 
    telefonoApicultor: string, 
    setFormValues: (values: { nombre: string; renapa: string; provincia: string; localidad: string }) => void
  ) => {
    if (!cuit || cuit.trim() === '') {
      setRenapaStatus({ type: 'error', message: 'Por favor, ingrese un CUIT para verificar.' });
      return;
    }
    
    setRenapaStatus({ type: 'loading', message: 'Consultando padrón público de RENAPA...' });
    try {
      const res = await srmService.consultarRenapa(cuit);
      if (res.Result === 'OK' && res.Records && res.Records.length > 0) {
        const record = res.Records[0];
        
        // Autocompletar campos en el formulario
        setFormValues({
          nombre: record.RazonSocial || nombreApicultor,
          renapa: record.NumeroRenapa || '',
          provincia: record.Provincia || '',
          localidad: record.Localidad || ''
        });

        // Analizar fecha de vencimiento y estado
        let isVencido = false;
        
        if (record.FechaVencimiento) {
          const parts = record.FechaVencimiento.split('/');
          if (parts.length === 3) {
            const expDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (expDate < new Date()) {
              isVencido = true;
            }
          }
        }
        
        if (record.Estado && record.Estado !== 'Vigente') {
          isVencido = true;
        }

        if (isVencido) {
          const phone = telefonoApicultor || record.Telefono || '';
          const cleanPhone = phone.replace(/[^\d]/g, '');
          const encodedMsg = encodeURIComponent(
            `Hola ${nombreApicultor || record.RazonSocial || 'Productor'}, te contactamos desde el equipo de Geomiel. Te escribimos para comentarte que tu RENAPA número ${record.NumeroRenapa || ''} figura como Vencido (con fecha de vencimiento el ${record.FechaVencimiento || ''}). Te solicitamos que procedas a su renovación para poder mantener al día tu registro y continuar operando normalmente. ¡Muchas gracias!`
          );
          const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

          setRenapaStatus({
            type: 'warning',
            message: `Registro encontrado en RENAPA, pero está VENCIDO (Estado: ${record.Estado || 'No Vigente'}, Vence: ${record.FechaVencimiento || 'S/D'}). Se autocompletaron los campos.`,
            showWhatsappBtn: !!phone,
            whatsappText: waUrl
          });
        } else {
          setRenapaStatus({
            type: 'success',
            message: `Registro encontrado y VIGENTE en RENAPA (Nro: ${record.NumeroRenapa || 'S/D'}, Vence: ${record.FechaVencimiento || 'S/D'}). Se autocompletaron los campos.`
          });
        }
      } else {
        setRenapaStatus({
          type: 'error',
          message: 'No se encontró ningún registro para el CUIT ingresado en el padrón de RENAPA.'
        });
      }
    } catch (err) {
      setRenapaStatus({
        type: 'error',
        message: 'Error al consultar RENAPA: ' + err
      });
    }
  };

  const handleUpdateApicultorStage = async (id: string, newEtapa: 'PROSPECTO' | 'CONTACTADO' | 'NEGOCIANDO' | 'ACTIVO') => {
    try {
      await srmService.updateApicultor(id, { etapa: newEtapa });
      cargarApicultores();
    } catch (err) {
      alert('Error al actualizar etapa: ' + err);
    }
  };

  const handleOpenQuickEdit = (a: Apicultor) => {
    setApicultorParaEditarEtapa(a);
    setQuickEditForm({
      nombre: a.nombre || '',
      cuit: a.cuit || '',
      localidad: a.localidad || '',
      cod_api: a.cod_api || '',
      provincia: a.provincia || '',
      dni: a.dni || '',
      renapa: a.renapa || '',
      telefono: a.telefono || '',
      etapa: (a.etapa || 'ACTIVO') as any,
      tag: a.tag || 'PRODUCTOR',
      notas_onboarding: a.notas_onboarding || ''
    });
    setShowQuickEditOnboardingModal(true);
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apicultorParaEditarEtapa) return;
    try {
      await srmService.updateApicultor(apicultorParaEditarEtapa.id, {
        nombre: quickEditForm.nombre,
        cuit: quickEditForm.cuit,
        localidad: quickEditForm.localidad,
        cod_api: quickEditForm.cod_api,
        provincia: quickEditForm.provincia,
        dni: quickEditForm.dni,
        renapa: quickEditForm.renapa,
        telefono: quickEditForm.telefono,
        etapa: quickEditForm.etapa,
        tag: quickEditForm.tag,
        notas_onboarding: quickEditForm.notas_onboarding
      });
      setShowQuickEditOnboardingModal(false);
      setApicultorParaEditarEtapa(null);
      cargarApicultores();
    } catch (err) {
      alert('Error actualizando perfil: ' + err);
    }
  };

  const renderEmbudoColumna = (
    stage: 'PROSPECTO' | 'CONTACTADO' | 'NEGOCIANDO' | 'ACTIVO', 
    color: string, 
    bgColor: string,
    borderColor: string,
    customTitle?: string
  ) => {
    const list = apicultores.filter(a => {
      const currentEtapa = a.etapa || 'ACTIVO';
      return currentEtapa === stage;
    });

    return (
      <div className="card-premium" style={{ 
        padding: '1rem', 
        backgroundColor: bgColor, 
        border: `1px solid ${borderColor}`,
        borderTop: `4px solid ${color}`,
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.85rem',
        minHeight: '450px',
        borderRadius: '12px'
      }}>
        {/* Encabezado de la columna */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
            <strong style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '0.05em' }}>
              {customTitle || stage}
            </strong>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: color,
            color: '#FFFFFF',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {list.length}
          </span>
        </div>

        {/* Lista de Tarjetas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '2rem 0', border: '1px dashed #ECEAE9', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
              Sin proveedores
            </div>
          ) : (
            list.map(a => {
              const letter = a.nombre ? a.nombre.charAt(0).toUpperCase() : 'P';
              const labelTag = a.tag || 'PRODUCTOR';
              
              let tagBg = '#FEF3C7';
              let tagColor = '#92400E';
              if (labelTag === 'REVENDEDOR') { tagBg = '#D1FAE5'; tagColor = '#065F46'; }
              else if (labelTag === 'NEGOCIOS') { tagBg = '#DBEAFE'; tagColor = '#1E40AF'; }
              else if (labelTag === 'ACOPIADOR') { tagBg = '#F3E8FF'; tagColor = '#6B21A8'; }

              return (
                <div 
                  key={a.id} 
                  className="card-premium" 
                  style={{ 
                    padding: '0.85rem', 
                    backgroundColor: '#FFFFFF', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    borderLeft: `4px solid ${color}`,
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem',
                    borderRadius: '8px'
                  }}
                >
                  {/* Fila 1: Avatar, Nombre y Tag */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(8, 32, 26, 0.05)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {letter}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden', flex: 1 }}>
                      <strong 
                        style={{ fontSize: '0.85rem', color: 'var(--text-title)', cursor: 'pointer', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
                        onClick={() => {
                          if (stage === 'ACTIVO') seleccionarApicultor(a.id);
                          else handleOpenQuickEdit(a);
                        }}
                        title={a.nombre}
                      >
                        {a.nombre}
                      </strong>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.6rem',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          backgroundColor: tagBg,
                          color: tagColor,
                          textTransform: 'uppercase'
                        }}>
                          {labelTag}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {a.localidad || 'S/D'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: WhatsApp si tiene telefono */}
                  {a.telefono && (
                    <a 
                      href={`https://wa.me/${a.telefono.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        backgroundColor: '#E8F5E9',
                        border: '1px solid #C8E6C9',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#2E7D32',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#C8E6C9'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#E8F5E9'; }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4CAF50', display: 'inline-block' }} />
                      WhatsApp
                    </a>
                  )}

                  {/* Fila 3: Notas rápidas */}
                  {a.notas_onboarding && (
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)', 
                      margin: 0, 
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      backgroundColor: '#FAFBFD',
                      padding: '0.35rem',
                      borderRadius: '4px',
                      border: '1px solid #ECEAE9'
                    }} title={a.notas_onboarding}>
                      {a.notas_onboarding}
                    </p>
                  )}

                  {/* Selector de Etapa */}
                  <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.25rem', width: '100%' }}>
                    <select 
                      style={{ 
                        flex: 1, 
                        padding: '0.35rem', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-color)', 
                        fontSize: '0.75rem', 
                        backgroundColor: '#FFFFFF',
                        fontWeight: 600,
                        color: 'var(--text-body)'
                      }}
                      value={stage}
                      onChange={e => handleUpdateApicultorStage(a.id, e.target.value as any)}
                    >
                      <option value="PROSPECTO">Prospecto</option>
                      <option value="CONTACTADO">Contactado</option>
                      <option value="NEGOCIANDO">Negociando</option>
                      <option value="ACTIVO">Proveedor Activo</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleOpenQuickEdit(a)}
                      title="Editar Ficha"
                      style={{
                        padding: '0.35rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#FAFBFD',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      ✏️
                    </button>
                    {stage === 'ACTIVO' && (
                      <button
                        type="button"
                        onClick={() => seleccionarApicultor(a.id)}
                        title="Ver Ficha 360°"
                        style={{
                          padding: '0.35rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontWeight: 'bold',
                          fontSize: '0.75rem'
                        }}
                      >
                        🍯
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
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
        finalKilosOp = -Math.abs(newOperculoForm.kilos_op / newOperculoForm.rendimiento_cera);
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
    const currentEtapa = a.etapa || 'ACTIVO';
    if (view === 'directorio' && currentEtapa !== 'ACTIVO') {
      return false;
    }

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
      const tieneEnvases = getSaldoEnvases(a.id) > 100; // Alerta si tiene saldo muy alto de envases
      return tieneIncidencia || tieneEnvases;
    }
    
    return true;
  });

  const totalLocalidades = new Set(apicultores.map(a => a.localidad).filter(Boolean)).size;
  const totalPages = Math.ceil(apicultoresFiltrados.length / itemsPerPage);
  const apicultoresPaginados = apicultoresFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


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
          {/* Logo y Encabezado de SRM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '2.5rem', padding: '0.25rem 0.5rem' }}>
            <img 
              src="/logo-geomiel.png?v=4" 
              alt="GeoMiel Logo" 
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }} 
            />
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.05em', fontFamily: 'var(--font-title)' }}>
              SRM
            </span>
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
                borderRadius: view === 'directorio' ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: view === 'directorio' ? 'var(--bg-sidebar-active)' : 'transparent',
                color: view === 'directorio' ? 'var(--primary)' : 'var(--text-body)',
                borderLeft: view === 'directorio' ? '4px solid var(--primary)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={18} />
                <span>Red de Proveedores</span>
              </div>
              {apicultores.filter(a => (a.etapa || 'ACTIVO') === 'ACTIVO').length > 0 && (
                <span className="font-mono" style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(8,32,26,0.05)',
                  color: 'var(--primary)',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontWeight: 700
                }}>
                  {apicultores.filter(a => (a.etapa || 'ACTIVO') === 'ACTIVO').length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setView('embudo'); setApicultorSeleccionado(null); setFiltroAlerta(false); setMobileMenuOpen(false); }}
              className="font-title"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: view === 'embudo' ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: view === 'embudo' ? 'var(--bg-sidebar-active)' : 'transparent',
                color: view === 'embudo' ? 'var(--primary)' : 'var(--text-body)',
                borderLeft: view === 'embudo' ? '4px solid var(--primary)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Kanban size={18} />
                <span>Embudo de Proveedores</span>
              </div>
            </button>

            <button 
              onClick={() => { setView('alertas'); setApicultorSeleccionado(null); setFiltroAlerta(false); setMobileMenuOpen(false); }}
              className="font-title"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: view === 'alertas' ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: view === 'alertas' ? 'var(--bg-sidebar-active)' : 'transparent',
                color: view === 'alertas' ? 'var(--primary)' : 'var(--text-body)',
                borderLeft: view === 'alertas' ? '4px solid var(--primary)' : 'none',
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
                  {view === 'dashboard' ? 'Finanzas' : view === 'directorio' ? 'Admin' : view === 'embudo' ? 'Proceso' : view === 'alertas' ? 'Control' : 'Registro'}
                </span>
                <ChevronRight size={12} />
                <span style={{ textTransform: 'uppercase', color: 'var(--secondary)' }}>
                  {view === 'dashboard' ? 'Reportes Ejecutivos' : view === 'directorio' ? 'Apicultores' : view === 'embudo' ? 'Embudo de Proveedores' : view === 'alertas' ? 'Alertas e Incumplimientos' : 'Detalle de Apicultor'}
                </span>
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.02em', marginTop: '0.25rem' }}>
                {view === 'dashboard' ? 'Inteligencia Financiera' : view === 'directorio' ? 'Panel de Gestión' : view === 'embudo' ? 'Embudo de Incorporación' : view === 'alertas' ? 'Centro de Alertas y Desvíos' : 'Ficha de Apicultor'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.125rem' }}>
                {view === 'dashboard' 
                  ? 'Balance consolidado en tiempo real y rendimiento de ventas operativas de miel.'
                  : view === 'directorio'
                    ? 'Monitoreo en vivo de utilidades, análisis de mieles y control de tambores vacíos.'
                    : view === 'embudo'
                      ? 'Gestión visual de prospectos y proveedores en proceso de negociación o activos.'
                      : view === 'alertas'
                        ? 'Detección automática de tambores sin analizar, vencimientos e inconsistencias operativas.'
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
            
            {(view === 'directorio' || view === 'embudo') && (
              <button 
                onClick={() => {
                  if (view === 'embudo') {
                    setNewApicultorForm(prev => ({
                      ...prev,
                      etapa: 'PROSPECTO'
                    }));
                  } else {
                    setNewApicultorForm(prev => ({
                      ...prev,
                      etapa: 'ACTIVO'
                    }));
                  }
                  setShowAddApicultor(true);
                }}
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
                {view === 'embudo' ? 'Registrar Prospecto' : 'Registrar Apicultor'}
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
              
              {/* Tarjetas KPI de Operaciones Geomiel */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Proveedores Registrados</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{apicultores.length}</h2>
                  <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>Activos en base de datos</span>
                </div>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Miel Total Recibida</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{(globalStats.totalKilosMiel / 1000).toFixed(1)} Ton</h2>
                  <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>{globalStats.totalKilosMiel.toLocaleString('es-AR')} kg en total</span>
                </div>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Tambores en el Campo</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{globalStats.totalTamboresCampo}</h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Saldo neto de envases prestados</span>
                </div>
                <div className="card-premium hex-pattern" style={{ padding: '1.25rem' }}>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Saldo CC (Miel Equivalente)</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{(globalStats.totalMielEquivSaldo / 1000).toFixed(1)} Ton</h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{globalStats.totalMielEquivSaldo.toLocaleString('es-AR')} kg virtuales</span>
                </div>
              </div>

              {/* Ficha Destacada Ruiz y Tipo de Miel */}
              <div className="charts-grid">
                
                {/* Ruiz Rubén Oscar Quick Access */}
                <div className="card-premium" style={{ borderLeft: '4px solid var(--secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: 700 }}>Productor Destacado</span>
                        <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '0.25rem', marginBottom: '0.5rem' }}>Ruiz Rubén Oscar</h3>
                      </div>
                      <div className="badge badge-success">Activo</div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '1rem' }}>
                      Acceso rápido al perfil de Ruiz Rubén Oscar (General Pico). Visualiza sus 8 entregas, control de 147 tambores individuales, control de envases vacíos (saldo de 137 tambores) y cuenta corriente de doble saldo.
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      backgroundColor: 'rgba(8, 32, 26, 0.03)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      marginBottom: '1rem'
                    }}>
                      <div><strong>CUIT:</strong> 20-08046134-4</div>
                      <div><strong>Localidad:</strong> G. Pico, La Pampa</div>
                      <div><strong>Entregas:</strong> 8 registradas</div>
                      <div><strong>Tambores:</strong> 147 individuales</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => seleccionarApicultor('e37fb194-9e25-5d90-b912-9925001072c0')}
                    className="font-title"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--secondary)',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Ver Ficha Completa de Ruiz
                  </button>
                </div>
                
                {/* Sincronización de Pesajes (TCM) */}
                <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Automatización de Pesajes</span>
                        <h3 className="font-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                          Base de Datos de Pesajes (TCM)
                        </h3>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary)', opacity: 0.7 }}>table_chart</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                      Conecte sus Romaneos y tambores (TCM) del archivo central de SharePoint en tiempo real o cargue manualmente.
                    </p>

                    {/* Barra de Pestañas (Tabs) */}
                    <div style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', backgroundColor: '#F0F0F0', borderRadius: '8px', marginBottom: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setSyncTab('auto')}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: syncTab === 'auto' ? '#137333' : 'transparent',
                          color: syncTab === 'auto' ? '#FFFFFF' : 'var(--text-secondary)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>bolt</span>
                        Real-Time (Auto)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSyncTab('manual')}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: syncTab === 'manual' ? 'var(--primary)' : 'transparent',
                          color: syncTab === 'manual' ? '#FFFFFF' : 'var(--text-secondary)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>upload_file</span>
                        Carga Manual
                      </button>
                    </div>
                  </div>

                  <div>
                    {syncMessage && (
                      <div style={{
                        padding: '0.65rem',
                        backgroundColor: syncMessage.includes('Error') ? '#FFE5E5' : '#E8F5E9',
                        color: syncMessage.includes('Error') ? '#C62828' : '#2E7D32',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                        lineHeight: 1.3
                      }}>
                        {syncMessage}
                      </div>
                    )}

                    {syncTab === 'auto' ? (
                      <div style={{
                        backgroundColor: 'rgba(19,115,51,0.04)',
                        border: '1px solid rgba(19,115,51,0.15)',
                        padding: '0.8rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        lineHeight: 1.4,
                        color: 'var(--text-body)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#137333', fontWeight: 'bold' }}>bolt</span>
                          <strong style={{ color: '#137333', fontSize: '0.8rem' }}>Ingreso en Tiempo Real</strong>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: '0 0 0.6rem 0' }}>
                          Conecte su Power Automate para insertar cada tambor (TCM) automáticamente en el SRM en cuanto se agregue una fila en el Excel de SharePoint.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPowerAutomateGuide(true)}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            backgroundColor: '#137333',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            boxShadow: '0 2px 4px rgba(19,115,51,0.15)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>settings_ethernet</span>
                          Configurar Conexión Real-Time
                        </button>
                      </div>
                    ) : (
                      <>
                        {isImportingExcel ? (
                          <div style={{
                            padding: '0.8rem',
                            backgroundColor: '#F9F9F9',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)',
                            textAlign: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                              <span className="material-symbols-outlined spinning" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>sync</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-title)' }}>Procesando planilla Excel...</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#E0E0E0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.25rem' }}>
                              <div style={{ height: '100%', backgroundColor: 'var(--primary)', width: `${(importProgress / importTotal) * 100}%`, transition: 'width 0.1s ease' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              <span>Cargados: {importProgress} de {importTotal}</span>
                              {importErrorCount > 0 && <span style={{ color: 'var(--danger)' }}>Errores: {importErrorCount}</span>}
                            </div>
                          </div>
                        ) : (
                          <>
                            <input 
                              type="file" 
                              accept=".xlsx, .xls"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImportarExcel(e.target.files[0]);
                                }
                              }}
                              style={{ display: 'none' }}
                              id="excel-upload-input"
                            />
                            <label 
                              htmlFor="excel-upload-input"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed var(--primary)',
                                borderRadius: '12px',
                                padding: '0.75rem',
                                backgroundColor: 'rgba(242, 172, 22, 0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                textAlign: 'center'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>upload_file</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)' }}>Cargar Planilla (.xlsx)</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Seleccione o arrastre el archivo central</span>
                            </label>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Catálogo de Insumos y Productos (Geomiel) */}
              <section className="card-premium">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 className="font-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-title)' }}>
                    Catálogo de Insumos y Productos (Geomiel)
                  </h3>
                  <span className="badge badge-info">{productos.length} Productos</span>
                </div>

                <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th className="font-title">Código</th>
                        <th className="font-title">Categoría</th>
                        <th className="font-title">Producto</th>
                        <th className="font-title">Descripción</th>
                        <th className="font-title text-right">Unidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                            Cargando catálogo de productos...
                          </td>
                        </tr>
                      ) : (
                        productos.map((prod) => (
                          <tr key={prod.codigo} className="table-row-hover">
                            <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{prod.codigo}</td>
                            <td>
                              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                                {prod.categoria}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--text-title)' }}>{prod.producto}</strong>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{prod.descripcion}</td>
                            <td className="font-mono text-right" style={{ fontWeight: 700, color: 'var(--text-title)' }}>
                              {prod.unidad}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Resumen del Embudo de Incorporación */}
              <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <Kanban size={18} style={{ color: 'var(--secondary)' }} />
                  <h4 className="font-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-title)' }}>Embudo de Incorporación</h4>
                </div>
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Proporción de proveedores en el proceso de alta comercial.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Prospectos (Leads)', key: 'PROSPECTO', color: '#9E9E9E' },
                    { label: 'Contactados', key: 'CONTACTADO', color: '#2196F3' },
                    { label: 'Negociando', key: 'NEGOCIANDO', color: '#FF9800' },
                    { label: 'Proveedores Activos', key: 'ACTIVO', color: '#4CAF50' }
                  ].map(item => {
                    const count = apicultores.filter(a => (a.etapa || 'ACTIVO') === item.key).length;
                    const percent = apicultores.length > 0 ? (count / apicultores.length) * 100 : 0;
                    return (
                      <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-body)' }}>{item.label}</span>
                          <span style={{ color: 'var(--text-title)', fontWeight: 700 }}>{count} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#ECEAE9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: item.color, borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setView('embudo')}
                  className="font-title"
                  style={{
                    backgroundColor: 'rgba(8, 32, 26, 0.05)',
                    color: 'var(--primary)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '0.25rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(8, 32, 26, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(8, 32, 26, 0.05)'; }}
                >
                  Ir al Tablero Kanban
                </button>
              </div>

              {/* Alertas SRM e Incumplimientos de Calidad */}
              <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <Bell size={18} style={{ color: 'var(--danger)' }} />
                  <h4 className="font-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-title)' }}>Alertas de Control de Calidad</h4>
                </div>

                {/* Alertas dinámicas de apicultores (incidencias de calidad de Supabase) */}
                {globalStats.incidencias.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>{"Parámetros Excedidos (Humedad >18% / HMF >40)"}</span>
                    {globalStats.incidencias.map((inc) => (
                      <div 
                        key={inc.id} 
                        onClick={() => {
                          setView('directorio');
                          setFiltroAlerta(true);
                        }}
                        style={{
                          backgroundColor: '#FFF5F5',
                          borderLeft: '4px solid var(--danger)',
                          borderRadius: '8px',
                          padding: '0.625rem 0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--text-title)', display: 'block' }}>{inc.apicultor_nombre}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--danger-dark)', fontWeight: 600 }}>
                            Humedad: {inc.humedad}% | HMF: {inc.hmf} mg/kg
                          </span>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#065F46',
                    fontSize: '0.8rem',
                    lineHeight: 1.4
                  }}>
                    <span style={{ fontSize: '24px', color: '#059669', marginBottom: '0.25rem', display: 'block' }}>✓</span>
                    <strong>Todo en Orden</strong>
                    <p style={{ marginTop: '0.25rem', color: '#047857', margin: 0 }}>
                      No se registran alertas de calidad de miel. Todas las entregas cumplen con Humedad &lt; 18.0% y HMF &lt; 40.0 mg/kg.
                    </p>
                  </div>
                )}
              </div>

              {/* Últimas Entregas de Miel (Resumen) */}
              <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <Truck size={18} style={{ color: 'var(--primary)' }} />
                  <h4 className="font-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-title)' }}>Últimos Lotes Recibidos</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { fecha: '03/05/2026', apicultor: 'Ruiz Rubén Oscar', tambores: 18, kilos: 5364.5 },
                    { fecha: '28/04/2026', apicultor: 'Ruiz Rubén Oscar', tambores: 22, kilos: 6542.0 },
                    { fecha: '15/04/2026', apicultor: 'Ruiz Rubén Oscar', tambores: 15, kilos: 4462.5 },
                    { fecha: '02/04/2026', apicultor: 'Ruiz Rubén Oscar', tambores: 20, kilos: 5980.0 }
                  ].map((ent, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.5rem', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-color)', 
                        backgroundColor: '#FAFBFD' 
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.75rem', color: 'var(--text-title)', display: 'block' }}>{ent.apicultor}</strong>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          {ent.fecha} · {ent.tambores} tambores
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)', fontFamily: 'var(--font-mono)' }}>
                        {ent.kilos.toLocaleString('es-AR')} kg
                      </span>
                    </div>
                  ))}
                </div>
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
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{apicultores.length}</span>
                  <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>Activos en base de datos</span>
                </div>
              </div>

              <div className="card-premium hex-pattern" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: 'rgba(19, 115, 51, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#137333'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>location_on</span>
                </div>
                <div>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Localidades</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{totalLocalidades}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Zonas de acopio representadas</span>
                </div>
              </div>

              <div className="card-premium hex-pattern" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: 'rgba(125, 87, 0, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>military_tech</span>
                </div>
                <div>
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Socios VIP (Clase A)</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>
                    {apicultoresCategorizados.vipCount}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {apicultores.filter(a => (a.etapa || 'ACTIVO') === 'ACTIVO').length > 0
                      ? `${((apicultoresCategorizados.vipCount / apicultores.filter(a => (a.etapa || 'ACTIVO') === 'ACTIVO').length) * 100).toFixed(0)}% del total`
                      : '0% del total'}
                  </span>
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
                  <span className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.25rem' }}>Miel Acopiada</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-title)', fontFamily: 'var(--font-title)' }}>{(globalStats.totalKilosMiel / 1000).toFixed(1)} Ton</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kilos netos totales</span>
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
                      <th className="font-title">Categoría 80/20</th>
                      <th className="font-title">Estado</th>
                      <th className="font-title text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apicultoresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem' }}>
                          No se encontraron apicultores registrados.
                        </td>
                      </tr>
                    ) : (
                      apicultoresPaginados.map((a) => {
                        const tieneIncidencia = globalStats.incidencias.some(inc => inc.apicultor_nombre === a.nombre);
                        
                        let estadoBadge = <span className="badge badge-success">Activo</span>;
                        if (tieneIncidencia) {
                          estadoBadge = <span className="badge badge-danger">En Alerta</span>;
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
                              {(() => {
                                const catInfo = apicultoresCategorizados.mapaCategorias[a.id] || { categoria: 'B', kilos: 0, porcentaje: 0 };
                                return catInfo.categoria === 'A' ? (
                                  <span className="badge badge-success" style={{ backgroundColor: '#D4AF37', color: '#FFFFFF', fontWeight: 800, border: 'none' }}>
                                    Clase A (VIP)
                                  </span>
                                ) : (
                                  <span className="badge badge-info" style={{ backgroundColor: '#A0A0A0', color: '#FFFFFF', border: 'none' }}>
                                    Clase B
                                  </span>
                                );
                              })()}
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

              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  padding: '0 0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Mostrando apicultores <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, apicultoresFiltrados.length)}</strong> de <strong>{apicultoresFiltrados.length}</strong> (Página {currentPage} de {totalPages})
                  </span>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1
                      }}
                    >
                      Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} style={{ display: 'flex', gap: '0.375rem' }}>
                            {showEllipsis && <span style={{ padding: '0.4rem 0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>...</span>}
                            <button
                              onClick={() => setCurrentPage(p)}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                border: p === currentPage ? '1px solid var(--secondary)' : '1px solid var(--border-color)',
                                backgroundColor: p === currentPage ? 'var(--secondary)' : '#FFFFFF',
                                color: p === currentPage ? '#FFFFFF' : 'var(--text-body)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages ? 0.5 : 1
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* -------------------------------------------------------------------
            VISTA DEL EMBUDO DE INCORPORACIÓN DE PROVEEDORES (KANBAN)
            ------------------------------------------------------------------- */}
        {view === 'embudo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Cabecera de Tabs del Embudo */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '2px',
              marginBottom: '0.5rem'
            }}>
              {[
                { id: 'embudo', label: '🎯 EMBUDO DE PROVEEDORES' },
                { id: 'notas_feed', label: '📝 NOTAS DE SEGUIMIENTO' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveEmbudoTab(t.id as any)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: activeEmbudoTab === t.id ? 'var(--secondary)' : 'var(--text-secondary)',
                    borderBottom: activeEmbudoTab === t.id ? '3px solid var(--secondary)' : 'none',
                    marginBottom: '-2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeEmbudoTab === 'embudo' && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '1rem',
                alignItems: 'start'
              }}>
                {renderEmbudoColumna('PROSPECTO', '#9E9E9E', '#FAF9F8', '#EBEAE9', 'PROSPECTO')}
                {renderEmbudoColumna('CONTACTADO', '#2196F3', '#F4F9FD', '#E3F2FD', 'CONTACTADO')}
                {renderEmbudoColumna('NEGOCIANDO', '#FF9800', '#FFFBF2', '#FFF3E0', 'NEGOCIANDO')}
                {renderEmbudoColumna('ACTIVO', '#4CAF50', '#F6FBF6', '#E8F5E9', 'PROVEEDOR ACTIVO')}
              </div>
            )}

            {activeEmbudoTab === 'notas_feed' && (
              <section className="card-premium" style={{ padding: '1.5rem' }}>
                <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-title)' }}>
                  Notas de Seguimiento de Incorporación
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {apicultores.filter(a => a.notas_onboarding && a.notas_onboarding.trim() !== '').length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                      No hay notas de seguimiento registradas para ningún proveedor.
                    </div>
                  ) : (
                    apicultores
                      .filter(a => a.notas_onboarding && a.notas_onboarding.trim() !== '')
                      .map(a => {
                        const letter = a.nombre ? a.nombre.charAt(0).toUpperCase() : 'P';
                        const stage = a.etapa || 'ACTIVO';
                        let stageColor = '#9E9E9E';
                        if (stage === 'CONTACTADO') stageColor = '#2196F3';
                        else if (stage === 'NEGOCIANDO') stageColor = '#FF9800';
                        else if (stage === 'ACTIVO') stageColor = '#4CAF50';

                        return (
                          <div 
                            key={a.id} 
                            style={{ 
                              padding: '1.25rem', 
                              backgroundColor: '#FFFFFF', 
                              borderRadius: '12px', 
                              border: '1px solid var(--border-color)',
                              borderLeft: `5px solid ${stageColor}`,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(8, 32, 26, 0.05)',
                                  color: 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700
                                }}>
                                  {letter}
                                </div>
                                <div>
                                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-title)' }}>{a.nombre}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                                    {a.localidad || 'Ubicación no declarada'}, {a.provincia || ''}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  backgroundColor: stageColor,
                                  color: '#FFFFFF',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  textTransform: 'uppercase'
                                }}>
                                  {stage}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickEdit(a)}
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: '#FAFBFD',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  ✏️ Editar
                                </button>
                              </div>
                            </div>
                            <div style={{ 
                              backgroundColor: '#FAFBFD', 
                              padding: '1rem', 
                              borderRadius: '8px', 
                              border: '1px solid #ECEAE9',
                              fontSize: '0.9rem',
                              color: 'var(--text-body)',
                              lineHeight: 1.4,
                              whiteSpace: 'pre-wrap'
                            }}>
                              {a.notas_onboarding}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            VISTA DE ALERTAS DE INCUMPLIMIENTOS / CALIDAD (DEDICADA)
            ------------------------------------------------------------------- */}
        {view === 'alertas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section className="card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)' }}>
                  Panel de Control de Calidad e Incumplimientos
                </h3>
                <span className="badge badge-danger">{globalStats.incidencias.length} Alertas Activas</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Registro de lotes de miel que exceden los parámetros estándar establecidos por Geomiel para la exportación. Los límites tolerados son de <strong>Humedad &lt; 18.0%</strong> y <strong>HMF &lt; 40.0 mg/kg</strong>.
              </p>

              <div className="table-container">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th className="font-title">Fecha</th>
                      <th className="font-title">Apicultor</th>
                      <th className="font-title text-center">Humedad (%)</th>
                      <th className="font-title text-center">HMF (mg/kg)</th>
                      <th className="font-title text-center">Tambores</th>
                      <th className="font-title text-right">Kilos Neto</th>
                      <th className="font-title text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalStats.incidencias.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: '#065F46', padding: '3rem', backgroundColor: '#ECFDF5' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#059669', marginBottom: '0.5rem', display: 'block' }}>check_circle</span>
                          <strong>Excelente - Todo en Orden</strong>
                          <p style={{ marginTop: '0.25rem', color: '#047857', fontSize: '0.85rem' }}>
                            No se registran alertas de calidad de miel en el sistema. Todos los lotes cumplen con los estándares.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      globalStats.incidencias.map((inc) => {
                        const apicultorObj = apicultores.find(a => a.nombre === inc.apicultor_nombre);
                        return (
                          <tr key={inc.id} className="table-row-hover">
                            <td className="font-mono">{new Date(inc.fecha).toLocaleDateString('es-AR')}</td>
                            <td>
                              <strong style={{ color: 'var(--text-title)' }}>{inc.apicultor_nombre}</strong>
                            </td>
                            <td className="font-mono text-center" style={{ 
                              fontWeight: 700,
                              color: inc.humedad > 18.0 ? 'var(--danger)' : 'var(--text-title)',
                              backgroundColor: inc.humedad > 18.0 ? 'var(--danger-light)' : 'transparent'
                            }}>
                              {inc.humedad.toFixed(1)}% {inc.humedad > 18.0 && '⚠️'}
                            </td>
                            <td className="font-mono text-center" style={{ 
                              fontWeight: 700,
                              color: inc.hmf > 40.0 ? 'var(--danger)' : 'var(--text-title)',
                              backgroundColor: inc.hmf > 40.0 ? 'var(--danger-light)' : 'transparent'
                            }}>
                              {inc.hmf.toFixed(1)} {inc.hmf > 40.0 && '⚠️'}
                            </td>
                            <td className="font-mono text-center">{inc.cantidad_tambores}</td>
                            <td className="font-mono text-right">{inc.kilos_neto.toLocaleString('es-AR')} kg</td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => {
                                  if (apicultorObj) seleccionarApicultor(apicultorObj.id);
                                }}
                                className="font-title"
                                style={{
                                  padding: '0.4rem 1rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--secondary)',
                                  color: '#FFFFFF',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                VER FICHA
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
          </div>
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
              
              {/* Columna Izquierda: Perfil y Análisis de Pareto 80/20 */}
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

                {/* Aporte al Volumen (Pareto 80/20) */}
                {(() => {
                  const catInfo = apicultoresCategorizados.mapaCategorias[apicultorSeleccionado.id] || { categoria: 'B', kilos: 0, porcentaje: 0 };
                  const esVIP = catInfo.categoria === 'A';
                  
                  return (
                    <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: esVIP ? '4px solid #D4AF37' : '4px solid #A0A0A0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="label-caps" style={{ fontSize: '0.65rem' }}>Análisis de Pareto 80/20</span>
                        <span className="badge font-mono" style={{
                          backgroundColor: esVIP ? 'rgba(212,175,55,0.1)' : 'rgba(160,160,160,0.1)',
                          color: esVIP ? '#D4AF37' : '#707070',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          border: 'none'
                        }}>
                          {esVIP ? 'Socio VIP - Clase A' : 'Socio Estándar - Clase B'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Miel Física Entregada:</span>
                          <strong style={{ color: 'var(--text-title)' }} className="font-mono">{catInfo.kilos.toLocaleString('es-AR')} kg</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Participación en Acopio:</span>
                          <strong style={{ color: 'var(--text-title)' }} className="font-mono">{catInfo.porcentaje.toFixed(2)}%</strong>
                        </div>
                      </div>

                      {/* Visual Progress Gauge */}
                      <div style={{ marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>Aporte de Miel</span>
                          <span>{catInfo.porcentaje.toFixed(1)}% del Total</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#EFEDED', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(5, catInfo.porcentaje * 4))}%`,
                            height: '100%',
                            backgroundColor: esVIP ? '#D4AF37' : 'var(--primary)',
                            borderRadius: '4px'
                          }} />
                        </div>
                      </div>

                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: esVIP ? 'rgba(212,175,55,0.05)' : 'rgba(8,32,26,0.02)',
                        fontSize: '0.8rem',
                        lineHeight: 1.4,
                        color: 'var(--text-secondary)'
                      }}>
                        {esVIP ? (
                          <>
                            🌟 <strong>Recomendación Comercial (VIP):</strong> Este productor es clave para el volumen de acopio de la empresa (aporta al 80% principal). Se recomienda priorizar sus pagos, envases vacíos y mantener comunicación fluida.
                          </>
                        ) : (
                          <>
                            📦 <strong>Recomendación Comercial (Estándar):</strong> Productor complementario (aporta al 20% secundario del volumen). Brindar la calidad de servicio estándar y fomentar mayor volumen en próximas cosechas.
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
                              operacion: `Romaneo #${e.romaneo || 'S/N'} (${e.cantidad_tambores} TCM)`,
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
                        { id: 'entregas', label: `Historial de Romaneos (${apicultorSeleccionado.entregas.length})` },
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
                          <label className="label-caps">Categorización 80/20</label>
                          <p className="font-mono" style={{ fontWeight: 700 }}>
                            {(() => {
                              const catInfo = apicultoresCategorizados.mapaCategorias[apicultorSeleccionado.id] || { categoria: 'B' };
                              return catInfo.categoria === 'A' ? 'Clase A (Socio VIP)' : 'Clase B (Estándar)';
                            })()}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'entregas' && (
                      <div className="table-container">
                        <table className="table-premium">
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}></th>
                              <th>Romaneo</th>
                              <th>Fecha</th>
                              <th>Color Promedio</th>
                              <th>Humedad Promedio</th>
                              <th>HMF Promedio</th>
                              <th>Tambores (TCM)</th>
                              <th>Kilos Neto Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apicultorSeleccionado.entregas.length === 0 ? (
                              <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '1rem' }}>No hay romaneos registrados.</td>
                              </tr>
                            ) : (
                              apicultorSeleccionado.entregas.map((e) => {
                                const isExpanded = !!expandedRomaneos[e.id];
                                return (
                                  <Fragment key={e.id}>
                                    <tr 
                                      onClick={() => setExpandedRomaneos({
                                        ...expandedRomaneos,
                                        [e.id]: !isExpanded
                                      })}
                                      style={{ cursor: 'pointer' }}
                                      className="table-row-hover"
                                    >
                                      <td style={{ textAlign: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ 
                                          fontSize: '1.2rem', 
                                          color: 'var(--primary)',
                                          transform: isExpanded ? 'rotate(90deg)' : 'none',
                                          transition: 'transform 0.15s ease'
                                        }}>
                                          chevron_right
                                        </span>
                                      </td>
                                      <td>
                                        <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                                          #{e.romaneo || 'S/N'}
                                        </strong>
                                      </td>
                                      <td className="font-mono">{new Date(e.fecha).toLocaleDateString()}</td>
                                      <td className="font-mono">{e.color_pfund} mm</td>
                                      <td className="font-mono" style={{ fontWeight: 700, color: e.humedad > 18 ? 'var(--danger)' : 'var(--text-title)' }}>
                                        {e.humedad}%
                                      </td>
                                      <td className="font-mono" style={{ fontWeight: 700, color: e.hmf > 40 ? 'var(--danger)' : 'var(--text-title)' }}>
                                        {e.hmf} mg/kg
                                      </td>
                                      <td className="font-mono">{e.cantidad_tambores} TCM</td>
                                      <td className="font-mono" style={{ fontWeight: 700 }}>{e.kilos_neto.toLocaleString()} kg</td>
                                    </tr>
                                    
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={8} style={{ backgroundColor: 'rgba(242, 172, 22, 0.01)', padding: '0.75rem 1rem' }}>
                                          <div style={{
                                            borderLeft: '3px solid var(--primary)',
                                            paddingLeft: '1rem',
                                            paddingTop: '0.25rem',
                                            paddingBottom: '0.25rem',
                                            margin: '0.25rem 0'
                                          }}>
                                            <h4 className="font-title" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-title)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>science</span>
                                              Detalle Técnico de Tambores (TCMs) del Romaneo #{e.romaneo || 'S/N'}
                                            </h4>
                                            
                                            {(!e.tambores || e.tambores.length === 0) ? (
                                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No hay tambores individuales registrados para este romaneo.</p>
                                            ) : (
                                              <div className="table-container" style={{ margin: '0.5rem 0', boxShadow: 'none', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                                <table className="table-premium" style={{ width: '100%', fontSize: '0.75rem' }}>
                                                  <thead>
                                                    <tr style={{ backgroundColor: '#F9F9F9' }}>
                                                      <th>ID GEO (Tambor)</th>
                                                      <th>Cod. SENASA</th>
                                                      <th>Lote</th>
                                                      <th style={{ textAlign: 'right' }}>Peso Bruto</th>
                                                      <th style={{ textAlign: 'right' }}>Tara</th>
                                                      <th style={{ textAlign: 'right' }}>Peso Neto</th>
                                                      <th style={{ textAlign: 'center' }}>Humedad</th>
                                                      <th style={{ textAlign: 'center' }}>Color (mm)</th>
                                                      <th style={{ textAlign: 'center' }}>HMF</th>
                                                      <th>Antibiótico</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {e.tambores.map((t) => (
                                                      <tr key={t.id} style={{ backgroundColor: '#FFFFFF' }}>
                                                        <td><strong style={{ color: 'var(--text-title)', fontFamily: 'monospace' }}>{t.nro_tambor}</strong></td>
                                                        <td className="font-mono">{t.barras_ean || '-'}</td>
                                                        <td className="font-mono">{t.lote || '-'}</td>
                                                        <td className="font-mono text-right">{t.kilos_bruto.toFixed(1)} kg</td>
                                                        <td className="font-mono text-right">{t.tara.toFixed(1)} kg</td>
                                                        <td className="font-mono text-right" style={{ fontWeight: 700 }}>{t.kilos_neto.toFixed(1)} kg</td>
                                                        <td className="font-mono text-center" style={{ fontWeight: 700, color: t.humedad && t.humedad > 18 ? 'var(--danger)' : 'var(--text-title)' }}>
                                                          {t.humedad !== undefined ? `${t.humedad}%` : '-'}
                                                        </td>
                                                        <td className="font-mono text-center">{t.color_pfund !== undefined ? `${t.color_pfund} mm` : '-'}</td>
                                                        <td className="font-mono text-center" style={{ fontWeight: 700, color: t.hmf && t.hmf > 40 ? 'var(--danger)' : 'var(--text-title)' }}>
                                                          {t.hmf !== undefined ? `${t.hmf} mg/kg` : '-'}
                                                        </td>
                                                        <td>
                                                          <span className={`badge ${t.antibiotico === 'POSITIVO' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}>
                                                            {t.antibiotico || 'NEGATIVO'}
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })
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
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                    <input 
                      type="text" required
                      style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                      value={newApicultorForm.cuit}
                      onChange={e => {
                        const val = e.target.value;
                        setNewApicultorForm(prev => ({
                          ...prev,
                          cuit: val,
                          dni: extraerDniDeCuit(val) || prev.dni
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleVerificarRenapa(
                        newApicultorForm.cuit, 
                        newApicultorForm.nombre,
                        newApicultorForm.telefono,
                        (vals) => setNewApicultorForm(prev => ({
                          ...prev,
                          nombre: vals.nombre || prev.nombre,
                          renapa: vals.renapa || prev.renapa,
                          provincia: vals.provincia || prev.provincia,
                          localidad: vals.localidad || prev.localidad,
                          dni: extraerDniDeCuit(newApicultorForm.cuit) || prev.dni
                        }))
                      )}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      🔍 Verificar
                    </button>
                  </div>

                  {/* Buscador de CUIT por Nombre/Apellido */}
                  <div style={{ marginTop: '0.5rem', backgroundColor: 'rgba(8,32,26,0.03)', padding: '0.5rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      ¿No conoces el CUIT? Buscar por Nombre
                    </label>
                    <input 
                      type="text" 
                      placeholder="Escribe el nombre del apicultor..."
                      style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      value={nombreSearchQuery}
                      onChange={e => setNombreSearchQuery(e.target.value)}
                    />
                    {nombreSearchQuery.trim() !== '' && (
                      <div style={{ maxHeight: '110px', overflowY: 'auto', marginTop: '0.25rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                        {apicultores
                          .filter(a => a.nombre.toLowerCase().includes(nombreSearchQuery.toLowerCase()))
                          .map(a => (
                            <div 
                              key={a.id} 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}
                              onClick={() => {
                                setNewApicultorForm(prev => ({
                                  ...prev,
                                  cuit: a.cuit,
                                  dni: extraerDniDeCuit(a.cuit) || a.dni || '',
                                  nombre: a.nombre,
                                  localidad: a.localidad || prev.localidad,
                                  provincia: a.provincia || prev.provincia,
                                  renapa: a.renapa || prev.renapa,
                                  telefono: a.telefono || prev.telefono
                                }));
                                setNombreSearchQuery('');
                              }}
                            >
                              <div>
                                <strong>{a.nombre}</strong>
                                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{a.cuit}</span>
                              </div>
                              <span style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.65rem' }}>Copiar</span>
                            </div>
                          ))
                        }
                        {apicultores.filter(a => a.nombre.toLowerCase().includes(nombreSearchQuery.toLowerCase())).length === 0 && (
                          <div style={{ padding: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Sin coincidencias.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>DNI (Generado automáticamente)</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FAF9F8' }}
                    value={newApicultorForm.dni}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, dni: e.target.value })}
                  />
                </div>
              </div>

              {/* Indicador de Estado de RENAPA */}
              {renapaStatus.type !== 'idle' && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  backgroundColor: renapaStatus.type === 'loading' ? '#F5F5F5'
                    : renapaStatus.type === 'success' ? '#E8F5E9'
                    : renapaStatus.type === 'warning' ? '#FFF3E0'
                    : '#FFE5E5',
                  color: renapaStatus.type === 'loading' ? 'var(--text-secondary)'
                    : renapaStatus.type === 'success' ? '#2E7D32'
                    : renapaStatus.type === 'warning' ? '#E65100'
                    : '#C62828',
                  border: `1px solid ${
                    renapaStatus.type === 'loading' ? '#E0E0E0'
                      : renapaStatus.type === 'success' ? '#C8E6C9'
                      : renapaStatus.type === 'warning' ? '#FFE0B2'
                      : '#FFCDD2'
                  }`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>
                      {renapaStatus.type === 'loading' ? '⌛'
                        : renapaStatus.type === 'success' ? '✅'
                        : renapaStatus.type === 'warning' ? '⚠️'
                        : '❌'}
                    </span>
                    <span style={{ flex: 1 }}>{renapaStatus.message}</span>
                  </div>
                  {renapaStatus.type === 'warning' && renapaStatus.showWhatsappBtn && renapaStatus.whatsappText && (
                    <a
                      href={renapaStatus.whatsappText}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: '#2E7D32',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      💬 Avisar por WhatsApp
                    </a>
                  )}
                </div>
              )}

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

              {/* Fila: Etapa del Embudo y Etiqueta Comercial */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Etapa en el Embudo</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                    value={newApicultorForm.etapa}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, etapa: e.target.value as any })}
                  >
                    <option value="PROSPECTO">Prospecto (Lead)</option>
                    <option value="CONTACTADO">Contactado</option>
                    <option value="NEGOCIANDO">Negociando</option>
                    <option value="ACTIVO">Proveedor Activo</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Etiqueta (Tag)</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                    value={newApicultorForm.tag}
                    onChange={e => setNewApicultorForm({ ...newApicultorForm, tag: e.target.value })}
                  >
                    <option value="PRODUCTOR">Productor</option>
                    <option value="REVENDEDOR">Revendedor</option>
                    <option value="NEGOCIOS">Negocios</option>
                    <option value="ACOPIADOR">Acopiador</option>
                  </select>
                </div>
              </div>

              {/* Notas de incorporación */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notas / Historial de Incorporación</label>
                <textarea 
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Ej: Reunión inicial en galpón. Solicita financiamiento inicial..."
                  value={newApicultorForm.notas_onboarding}
                  onChange={e => setNewApicultorForm({ ...newApicultorForm, notas_onboarding: e.target.value })}
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
          <div className="card-premium" style={{ width: '100%', maxWidth: '550px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)' }}>Registrar Transacción en Cuenta Corriente</h3>
              <button 
                type="button" 
                onClick={() => setShowAddCC(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateCC} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)' }}>Tipo de Operación Comercial</label>
                  <select 
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF', fontWeight: 600 }}
                    value={newCCForm.tipo_transaccion}
                    onChange={e => {
                      const val = e.target.value as any;
                      let matchedTipo: 'DEBE' | 'HABER' = 'DEBE';
                      let matchedMoneda: 'ARS' | 'USD' = 'ARS';
                      let matchedPrecioRef = 1700;
                      
                      if (val === 'VENTA_LIQUIDACION') matchedTipo = 'HABER';
                      if (val === 'CARGO_ENVASE') {
                        matchedMoneda = 'USD';
                        matchedPrecioRef = 1.0;
                      }
                      
                      setNewCCForm({ 
                        ...newCCForm, 
                        tipo_transaccion: val, 
                        tipo: matchedTipo,
                        moneda: matchedMoneda,
                        precio_referencia_miel: matchedPrecioRef,
                        monto: val === 'RETIRO_INSUMO' ? 0 : 100000
                      });
                      
                      // Resetear auxiliares
                      setInsumoCodigo('manual');
                      setInsumoCantidad(1);
                      setInsumoPrecioUnitario(0);
                      setEnvaseTipo('TNA');
                      setEnvaseCantidad(1);
                      setEnvasePrecioUnitarioUsd(34.0);
                      setPrecioMielUsd(1.0);
                      setVentaKilos(1000);
                      setVentaPrecioRef(1700);
                    }}
                  >
                    <option value="ANTICIPO_CASH">💵 Anticipo de Efectivo / Transferencia</option>
                    <option value="RETIRO_INSUMO">📦 Retiro de Insumos (Cera, Alzas, etc.)</option>
                    <option value="CARGO_ENVASE">🛢️ Cargo / Venta de Envases vacíos</option>
                    <option value="VENTA_LIQUIDACION">🍯 Fijación de Precio / Liquidación de Miel</option>
                    <option value="SALDO_INICIAL">⚖️ Saldo Inicial</option>
                    <option value="AJUSTE">⚙️ Ajuste Técnico de Cuenta</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)' }}>Fecha</label>
                  <input 
                    type="date"
                    required
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newCCForm.fecha}
                    onChange={e => setNewCCForm({ ...newCCForm, fecha: e.target.value })}
                  />
                </div>
              </div>

              {/* ----------------- SUB-FORMULARIO DINÁMICO ----------------- */}
              
              {newCCForm.tipo_transaccion === 'ANTICIPO_CASH' && (
                <div className="card-premium" style={{ backgroundColor: '#FAFBFD', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>Configuración de Anticipo</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Moneda de Pago</label>
                      <select 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                        value={newCCForm.moneda}
                        onChange={e => {
                          const m = e.target.value as any;
                          const pRef = m === 'USD' ? 1.0 : 1700;
                          setNewCCForm({ ...newCCForm, moneda: m, precio_referencia_miel: pRef });
                        }}
                      >
                        <option value="ARS">Pesos ($ ARS)</option>
                        <option value="USD">Dólares (US$ USD)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Monto Adelantado</label>
                      <input 
                        type="number" required min="1" step="any"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={newCCForm.monto}
                        onChange={e => setNewCCForm({ ...newCCForm, monto: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio de Referencia Miel Pactado</label>
                    <input 
                      type="number" required min="0.1" step="any"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                      value={newCCForm.precio_referencia_miel}
                      onChange={e => setNewCCForm({ ...newCCForm, precio_referencia_miel: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}

              {newCCForm.tipo_transaccion === 'RETIRO_INSUMO' && (
                <div className="card-premium" style={{ backgroundColor: '#FAFBFD', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>Detalle de Insumos Retirados</span>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Seleccionar Producto del Catálogo</label>
                    <select 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                      value={insumoCodigo}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'manual') {
                          setInsumoCodigo('manual');
                          setInsumoPrecioUnitario(0);
                        } else {
                          const cod = parseInt(val);
                          setInsumoCodigo(cod);
                          // Intentar pre-cargar un precio sugerido de insumo en base al código de Ruiz o catálogo
                          let precioSugerido = 0;
                          if (cod === 10) precioSugerido = 2200; // Cera Estampada
                          else if (cod === 13) precioSugerido = 2000; // Techo
                          else if (cod === 14) precioSugerido = 1800; // Piso
                          else precioSugerido = 2500;
                          setInsumoPrecioUnitario(precioSugerido);
                        }
                      }}
                    >
                      <option value="manual">✍️ Ingreso Manual / Personalizado</option>
                      {productos.filter(p => p.categoria !== 'Miel').map(p => (
                        <option key={p.codigo} value={p.codigo}>{p.descripcion} ({p.unidad})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cantidad Entregada</label>
                      <input 
                        type="number" required min="1" step="any"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={insumoCantidad}
                        onChange={e => setInsumoCantidad(parseFloat(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio Unitario ($ ARS)</label>
                      <input 
                        type="number" required min="0" step="any"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={insumoPrecioUnitario}
                        onChange={e => setInsumoPrecioUnitario(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio Ref. de Miel a aplicar ($/kg)</label>
                    <input 
                      type="number" required min="1" step="any"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                      value={newCCForm.precio_referencia_miel}
                      onChange={e => setNewCCForm({ ...newCCForm, precio_referencia_miel: parseFloat(e.target.value) || 1700 })}
                    />
                  </div>
                </div>
              )}

              {newCCForm.tipo_transaccion === 'CARGO_ENVASE' && (
                <div className="card-premium" style={{ backgroundColor: '#FAFBFD', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>Valorización de Envases (Dólares USD)</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tipo de Envase Cargado</label>
                      <select 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                        value={envaseTipo}
                        onChange={e => {
                          const t = e.target.value as any;
                          setEnvaseTipo(t);
                          setEnvasePrecioUnitarioUsd(t === 'TNA' ? 34.0 : 30.5);
                        }}
                      >
                        <option value="TNA">Tambor Nuevo Apto (TNA) - 34.0 USD</option>
                        <option value="TR">Tambor Usado / Retornable (TR/TRR) - 30.5 USD</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cantidad</label>
                      <input 
                        type="number" required min="1" step="1"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={envaseCantidad}
                        onChange={e => setEnvaseCantidad(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Valor Unitario (USD)</label>
                      <input 
                        type="number" required min="1" step="any"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={envasePrecioUnitarioUsd}
                        onChange={e => setEnvasePrecioUnitarioUsd(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio Miel Pactado (USD/kg)</label>
                      <input 
                        type="number" required min="0.1" step="any"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={precioMielUsd}
                        onChange={e => setPrecioMielUsd(parseFloat(e.target.value) || 1.0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {newCCForm.tipo_transaccion === 'VENTA_LIQUIDACION' && (
                <div className="card-premium" style={{ backgroundColor: '#FAFBFD', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>Fijación de Miel y Liquidación</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kilos Miel a Liquidar</label>
                      <input 
                        type="number" required min="1" step="any"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={ventaKilos}
                        onChange={e => setVentaKilos(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio de Venta ($ ARS/kg)</label>
                      <input 
                        type="number" required min="1" step="any"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                        value={ventaPrecioRef}
                        onChange={e => setVentaPrecioRef(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Campos generales que son calculados o editables */}
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)' }}>Monto Financiero Final</label>
                    <input 
                      type="number" required min="0" step="any"
                      readOnly={newCCForm.tipo_transaccion !== 'ANTICIPO_CASH' && newCCForm.tipo_transaccion !== 'SALDO_INICIAL' && newCCForm.tipo_transaccion !== 'AJUSTE'}
                      style={{ 
                        width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem',
                        backgroundColor: (newCCForm.tipo_transaccion !== 'ANTICIPO_CASH' && newCCForm.tipo_transaccion !== 'SALDO_INICIAL' && newCCForm.tipo_transaccion !== 'AJUSTE') ? '#F3F4F6' : '#FFFFFF',
                        fontWeight: 700
                      }}
                      value={newCCForm.monto}
                      onChange={e => setNewCCForm({ ...newCCForm, monto: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)' }}>Miel Equivalente (kg)</label>
                    <input 
                      type="number" required step="any"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem', fontWeight: 700 }}
                      value={newCCForm.kilos_miel_equiv}
                      onChange={e => setNewCCForm({ ...newCCForm, kilos_miel_equiv: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-sidebar-active)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>RESUMEN DE IMPUTACIÓN COMERCIAL:</span>
                  <strong style={{ fontSize: '0.8rem', color: newCCForm.kilos_miel_equiv < 0 ? 'var(--danger)' : '#137333' }}>
                    {newCCForm.kilos_miel_equiv.toLocaleString('es-AR')} kg de miel ({newCCForm.tipo === 'DEBE' ? 'DÉBITO / RESTA' : 'CRÉDITO / SUMA'})
                  </strong>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)' }}>Glosa / Detalle en Ficha</label>
                  <input 
                    type="text" required
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={newCCForm.detalle}
                    placeholder="Escriba una glosa comercial..."
                    onChange={e => setNewCCForm({ ...newCCForm, detalle: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddCC(false)} 
                  style={{ padding: '0.625rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#FFFFFF' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--secondary)', color: '#FFFFFF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', border: 'none' }}
                >
                  ✓ Confirmar y Registrar
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

      {/* Modal: Edición Rápida y Registro de Notas de Incorporación (Embudo) */}
      {showQuickEditOnboardingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '1rem'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '550px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)' }}>Editar Ficha de Incorporación</h3>
            
            <form onSubmit={handleSaveQuickEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Nombre completo */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nombre / Razón Social</label>
                <input 
                  type="text" required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={quickEditForm.nombre}
                  onChange={e => setQuickEditForm({ ...quickEditForm, nombre: e.target.value })}
                />
              </div>

              {/* Fila: CUIT y DNI */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CUIT (formato 20-XXXXXXXX-9)</label>
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                    <input 
                      type="text" required
                      style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                      value={quickEditForm.cuit}
                      onChange={e => {
                        const val = e.target.value;
                        setQuickEditForm(prev => ({
                          ...prev,
                          cuit: val,
                          dni: extraerDniDeCuit(val) || prev.dni
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleVerificarRenapa(
                        quickEditForm.cuit, 
                        quickEditForm.nombre,
                        quickEditForm.telefono,
                        (vals) => setQuickEditForm(prev => ({
                          ...prev,
                          nombre: vals.nombre || prev.nombre,
                          renapa: vals.renapa || prev.renapa,
                          provincia: vals.provincia || prev.provincia,
                          localidad: vals.localidad || prev.localidad,
                          dni: extraerDniDeCuit(quickEditForm.cuit) || prev.dni
                        }))
                      )}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      🔍 Verificar
                    </button>
                  </div>

                  {/* Buscador de CUIT por Nombre/Apellido */}
                  <div style={{ marginTop: '0.5rem', backgroundColor: 'rgba(8,32,26,0.03)', padding: '0.5rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      ¿No conoces el CUIT? Buscar por Nombre
                    </label>
                    <input 
                      type="text" 
                      placeholder="Escribe el nombre del apicultor..."
                      style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      value={nombreSearchQuery}
                      onChange={e => setNombreSearchQuery(e.target.value)}
                    />
                    {nombreSearchQuery.trim() !== '' && (
                      <div style={{ maxHeight: '110px', overflowY: 'auto', marginTop: '0.25rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                        {apicultores
                          .filter(a => a.nombre.toLowerCase().includes(nombreSearchQuery.toLowerCase()))
                          .map(a => (
                            <div 
                              key={a.id} 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}
                              onClick={() => {
                                setQuickEditForm(prev => ({
                                  ...prev,
                                  cuit: a.cuit,
                                  dni: extraerDniDeCuit(a.cuit) || a.dni || '',
                                  nombre: a.nombre,
                                  localidad: a.localidad || prev.localidad,
                                  provincia: a.provincia || prev.provincia,
                                  renapa: a.renapa || prev.renapa,
                                  telefono: a.telefono || prev.telefono
                                }));
                                setNombreSearchQuery('');
                              }}
                            >
                              <div>
                                <strong>{a.nombre}</strong>
                                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{a.cuit}</span>
                              </div>
                              <span style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.65rem' }}>Copiar</span>
                            </div>
                          ))
                        }
                        {apicultores.filter(a => a.nombre.toLowerCase().includes(nombreSearchQuery.toLowerCase())).length === 0 && (
                          <div style={{ padding: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Sin coincidencias.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>DNI (Generado automáticamente)</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FAF9F8' }}
                    value={quickEditForm.dni}
                    onChange={e => setQuickEditForm({ ...quickEditForm, dni: e.target.value })}
                  />
                </div>
              </div>

              {/* Indicador de Estado de RENAPA */}
              {renapaStatus.type !== 'idle' && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  backgroundColor: renapaStatus.type === 'loading' ? '#F5F5F5'
                    : renapaStatus.type === 'success' ? '#E8F5E9'
                    : renapaStatus.type === 'warning' ? '#FFF3E0'
                    : '#FFE5E5',
                  color: renapaStatus.type === 'loading' ? 'var(--text-secondary)'
                    : renapaStatus.type === 'success' ? '#2E7D32'
                    : renapaStatus.type === 'warning' ? '#E65100'
                    : '#C62828',
                  border: `1px solid ${
                    renapaStatus.type === 'loading' ? '#E0E0E0'
                      : renapaStatus.type === 'success' ? '#C8E6C9'
                      : renapaStatus.type === 'warning' ? '#FFE0B2'
                      : '#FFCDD2'
                  }`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>
                      {renapaStatus.type === 'loading' ? '⌛'
                        : renapaStatus.type === 'success' ? '✅'
                        : renapaStatus.type === 'warning' ? '⚠️'
                        : '❌'}
                    </span>
                    <span style={{ flex: 1 }}>{renapaStatus.message}</span>
                  </div>
                  {renapaStatus.type === 'warning' && renapaStatus.showWhatsappBtn && renapaStatus.whatsappText && (
                    <a
                      href={renapaStatus.whatsappText}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: '#2E7D32',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      💬 Avisar por WhatsApp
                    </a>
                  )}
                </div>
              )}

              {/* Fila: Código API y RENAPA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Código API</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={quickEditForm.cod_api}
                    onChange={e => setQuickEditForm({ ...quickEditForm, cod_api: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>RENAPA</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={quickEditForm.renapa}
                    onChange={e => setQuickEditForm({ ...quickEditForm, renapa: e.target.value })}
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
                    value={quickEditForm.localidad}
                    onChange={e => setQuickEditForm({ ...quickEditForm, localidad: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Provincia</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                    value={quickEditForm.provincia}
                    onChange={e => setQuickEditForm({ ...quickEditForm, provincia: e.target.value })}
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Teléfono de Contacto</label>
                <input 
                  type="text"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  value={quickEditForm.telefono}
                  onChange={e => setQuickEditForm({ ...quickEditForm, telefono: e.target.value })}
                />
              </div>

              {/* Fila: Etapa del Embudo y Etiqueta Comercial */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Etapa en el Embudo</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                    value={quickEditForm.etapa}
                    onChange={e => setQuickEditForm({ ...quickEditForm, etapa: e.target.value as any })}
                  >
                    <option value="PROSPECTO">Prospecto (Lead)</option>
                    <option value="CONTACTADO">Contactado</option>
                    <option value="NEGOCIANDO">Negociando</option>
                    <option value="ACTIVO">Proveedor Activo</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Etiqueta (Tag)</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', backgroundColor: '#FFFFFF' }}
                    value={quickEditForm.tag}
                    onChange={e => setQuickEditForm({ ...quickEditForm, tag: e.target.value })}
                  >
                    <option value="PRODUCTOR">Productor</option>
                    <option value="REVENDEDOR">Revendedor</option>
                    <option value="NEGOCIOS">Negocios</option>
                    <option value="ACOPIADOR">Acopiador</option>
                  </select>
                </div>
              </div>

              {/* Notas de incorporación */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notas / Historial de Incorporación</label>
                <textarea 
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Ej: Reunión inicial en galpón. Solicita financiamiento inicial..."
                  value={quickEditForm.notas_onboarding}
                  onChange={e => setQuickEditForm({ ...quickEditForm, notas_onboarding: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => { setShowQuickEditOnboardingModal(false); setApicultorParaEditarEtapa(null); }} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: '#FFFFFF', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Guía de Power Automate */}
      {showPowerAutomateGuide && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(8,32,26,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 className="font-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ color: '#137333', fontSize: '1.6rem' }}>bolt</span>
                Asistente de Ingestión en Tiempo Real (Power Automate)
              </h3>
              <button 
                onClick={() => setShowPowerAutomateGuide(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.4rem' }}>close</span>
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0 }}>
                Para evitar tener que cargar manualmente el archivo Excel, configure su flujo actual de <strong>Power Automate</strong> para que envíe cada tambor (TCM) al SRM en tiempo real en cuanto se pesen. Siga estos <strong>4 pasos simples</strong>:
              </p>

              {/* Paso 1 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(19,115,51,0.1)', color: '#137333', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                <div>
                  <strong style={{ color: 'var(--text-title)', fontSize: '0.9rem' }}>Abra su flujo en Power Automate</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Ingrese a Power Automate, edite su flujo actual de pesajes y ubique el bucle <strong>"Aplicar a cada fila"</strong> (Apply to each) donde procesa los datos del archivo Excel entrante.
                  </span>
                </div>
              </div>

              {/* Paso 2 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(19,115,51,0.1)', color: '#137333', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                <div>
                  <strong style={{ color: 'var(--text-title)', fontSize: '0.9rem' }}>Agregue una acción HTTP</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Al final de las acciones dentro de ese bucle, haga clic en <strong>"Agregar una acción"</strong>, busque el conector verde **"HTTP"** y seleccione la acción estándar **"HTTP"** (método POST).
                  </span>
                </div>
              </div>

              {/* Paso 3 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(19,115,51,0.1)', color: '#137333', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'var(--text-title)', fontSize: '0.9rem' }}>Complete la configuración de la acción HTTP</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Configure la tarjeta HTTP con los siguientes parámetros. Haga clic en copiar en cada campo para pegarlos directamente:
                  </span>

                  {/* Power Automate HTTP Mock UI */}
                  <div style={{ border: '1px solid #E0E0E0', borderRadius: '10px', backgroundColor: '#FAFADA', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #E0E0E0', paddingBottom: '0.4rem' }}>
                      <span className="material-symbols-outlined" style={{ color: '#137333', fontSize: '1.2rem' }}>dns</span>
                      <strong style={{ fontSize: '0.8rem', color: '#137333' }}>HTTP (Acción de Power Automate)</strong>
                    </div>

                    <div>
                      <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Método</strong>
                      <span style={{ fontFamily: 'monospace', backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>POST</span>
                    </div>

                    <div>
                      <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>URI</strong>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        <input 
                          type="text" 
                          readOnly 
                          value="https://ajrfkkiuludrdexgprmb.supabase.co/rest/v1/rpc/registrar_tcm_desde_sharepoint" 
                          style={{ flex: 1, padding: '0.4rem', fontFamily: 'monospace', fontSize: '0.7rem', border: '1px solid #CCC', borderRadius: '4px', backgroundColor: '#FFFFFF', color: 'var(--text-body)' }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("https://ajrfkkiuludrdexgprmb.supabase.co/rest/v1/rpc/registrar_tcm_desde_sharepoint");
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          style={{ 
                            padding: '0.4rem 0.75rem', 
                            backgroundColor: copiedUrl ? '#137333' : 'var(--primary)', 
                            color: '#FFFFFF', 
                            border: 'none', 
                            borderRadius: '4px', 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            minWidth: '80px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {copiedUrl ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Encabezados (Headers)</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'monospace', fontSize: '0.7rem', backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1D1D1', color: 'var(--text-body)' }}>
                        <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: '0.25rem' }}>
                          <strong>Content-Type:</strong> application/json
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.25rem' }}>
                          <span><strong>apikey:</strong> sb_publishable_bYlB4bsuJyv7nMOUXrs...</span>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("sb_publishable_bYlB4bsuJyv7nMOUXrsRew_ubUacX2Q");
                              setCopiedKey(true);
                              setTimeout(() => setCopiedKey(false), 2000);
                            }}
                            style={{ 
                              padding: '0.15rem 0.4rem', 
                              fontSize: '0.65rem', 
                              backgroundColor: copiedKey ? '#E8F5E9' : '#E0E0E0', 
                              color: copiedKey ? '#2E7D32' : 'var(--text-body)',
                              border: 'none', 
                              borderRadius: '3px', 
                              cursor: 'pointer', 
                              fontWeight: 700,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {copiedKey ? '¡Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><strong>Authorization:</strong> Bearer sb_publishable_bYlB4bsuJyv7nMOUXrs...</span>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("Bearer sb_publishable_bYlB4bsuJyv7nMOUXrsRew_ubUacX2Q");
                              setCopiedAuth(true);
                              setTimeout(() => setCopiedAuth(false), 2000);
                            }}
                            style={{ 
                              padding: '0.15rem 0.4rem', 
                              fontSize: '0.65rem', 
                              backgroundColor: copiedAuth ? '#E8F5E9' : '#E0E0E0', 
                              color: copiedAuth ? '#2E7D32' : 'var(--text-body)',
                              border: 'none', 
                              borderRadius: '3px', 
                              cursor: 'pointer', 
                              fontWeight: 700,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {copiedAuth ? '¡Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(19,115,51,0.1)', color: '#137333', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>4</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'var(--text-title)', fontSize: '0.9rem' }}>Copie y mapee el Cuerpo JSON</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Copie este JSON y péguelo en el campo <strong>"Cuerpo"</strong> (Body) de su acción HTTP. Luego, reemplace los valores por los campos dinámicos correspondientes a su Excel de SharePoint:
                  </span>

                  <div style={{ position: 'relative' }}>
                    <pre style={{
                      backgroundColor: '#1E1E1E',
                      color: '#D4D4D4',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      overflowX: 'auto',
                      margin: 0,
                      lineHeight: 1.4,
                      border: '1px solid #333'
                    }}>
{`{
  "p_cuit": "",
  "p_apicultor_nombre": "@{items('Aplicar_a_cada_fila')?['Apicultor']}",
  "p_fecha": "@{items('Aplicar_a_cada_fila')?['Fecha Depo']}",
  "p_romaneo": "@{items('Aplicar_a_cada_fila')?['Romaneo']}",
  "p_nro_tambor": "@{items('Aplicar_a_cada_fila')?['ID GEO']}",
  "p_barras_ean": "@{items('Aplicar_a_cada_fila')?['SENASA']}",
  "p_kilos_bruto": @{coalesce(items('Aplicar_a_cada_fila')?['Peso Bruto'], 300)},
  "p_tara": @{coalesce(items('Aplicar_a_cada_fila')?['Tara'], 16)},
  "p_color_pfund": @{coalesce(items('Aplicar_a_cada_fila')?['Color'], null)},
  "p_humedad": @{coalesce(items('Aplicar_a_cada_fila')?['Humedad'], null)},
  "p_hmf": @{coalesce(items('Aplicar_a_cada_fila')?['HMF'], null)}
}`}
                    </pre>
                    <button 
                      type="button"
                      onClick={() => {
                        const bodyTemplate = `{
  "p_cuit": "",
  "p_apicultor_nombre": "@{items('Aplicar_a_cada_fila')?['Apicultor']}",
  "p_fecha": "@{items('Aplicar_a_cada_fila')?['Fecha Depo']}",
  "p_romaneo": "@{items('Aplicar_a_cada_fila')?['Romaneo']}",
  "p_nro_tambor": "@{items('Aplicar_a_cada_fila')?['ID GEO']}",
  "p_barras_ean": "@{items('Aplicar_a_cada_fila')?['SENASA']}",
  "p_kilos_bruto": @{coalesce(items('Aplicar_a_cada_fila')?['Peso Bruto'], 300)},
  "p_tara": @{coalesce(items('Aplicar_a_cada_fila')?['Tara'], 16)},
  "p_color_pfund": @{coalesce(items('Aplicar_a_cada_fila')?['Color'], null)},
  "p_humedad": @{coalesce(items('Aplicar_a_cada_fila')?['Humedad'], null)},
  "p_hmf": @{coalesce(items('Aplicar_a_cada_fila')?['HMF'], null)}
}`;
                        navigator.clipboard.writeText(bodyTemplate);
                        setCopiedBody(true);
                        setTimeout(() => setCopiedBody(false), 2000);
                      }}
                      style={{ 
                        position: 'absolute', 
                        top: '8px', 
                        right: '8px', 
                        padding: '0.3rem 0.6rem', 
                        backgroundColor: copiedBody ? '#137333' : 'rgba(255,255,255,0.15)', 
                        color: '#FFFFFF', 
                        border: 'none', 
                        borderRadius: '4px', 
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedBody ? '¡Copiado!' : 'Copiar Cuerpo'}
                    </button>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    * Si los nombres de columnas de su planilla en SharePoint difieren (ej. "Nro Tambor" en vez de "ID GEO"), ajuste el nombre dentro del JSON en Power Automate para que coincidan.
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(19,115,51,0.06)', border: '1px solid rgba(19,115,51,0.2)', borderRadius: '10px', padding: '0.75rem', fontSize: '0.75rem', color: '#137333' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>info</span>
                  ¿Qué hace este Webhook automáticamente?
                </strong>
                <ul style={{ margin: '0.15rem 0 0 1.25rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <li><strong>Busca al Apicultor:</strong> Si el apicultor no está registrado en el SRM, crea un perfil temporal en etapa Prospecto para guardar de inmediato los tambores.</li>
                  <li><strong>Crea o Asocia el Romaneo:</strong> Agrupa automáticamente múltiples tambores del mismo Romaneo en un registro unificado, calculando los promedios organolépticos (color, humedad, HMF).</li>
                  <li><strong>Controla Duplicados:</strong> Si un tambor (ID GEO) ya existe, actualiza sus datos en lugar de duplicarlo.</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setShowPowerAutomateGuide(false)} 
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#137333', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(19,115,51,0.2)' }}
              >
                Cerrar Asistente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
