/* src/services/srmService.ts */
import { supabase, isMockMode } from './supabaseClient';
import type { 
  Apicultor, 
  FichaEntregaMiel, 
  FichaControlEnvases, 
  FichaCuentaCorriente, 
  FichaControlOperculo, 
  FichaEntregaTambor, 
  ApicultorCompleto, 
  ApicultorDashboardStats,
  Producto
} from '../types/srm.types';
import {
  PRODUCTOS_MOCK,
  RUIZ_MOCK_ENTREGAS,
  RUIZ_MOCK_ENVASES,
  RUIZ_MOCK_CUENTA_CORRIENTE,
  RUIZ_MOCK_OPERCULO,
  RUIZ_PROFILE
} from './ruizMockData';

// =========================================================================
// BASE DE DATOS MOCK (LOCAL STORAGE FALLBACK)
// =========================================================================
const MOCK_APICULTORES: Apicultor[] = [
  {
    id: '1',
    nombre: 'Denis Capello',
    cuit: '20-34891024-9',
    localidad: 'Huinca Renancó',
    cod_api: '1923',
    provincia: 'Córdoba',
    dni: '34891024',
    renapa: 'X4285',
    telefono: '0351-4829104',
    puntuacion: 4.8,
    created_at: new Date(2026, 4, 1).toISOString(),
    updated_at: new Date(2026, 4, 1).toISOString(),
  },
  {
    id: '2',
    nombre: 'Mieles del Chaco (Juan Gómez)',
    cuit: '27-14285901-4',
    localidad: 'Sáenz Peña',
    cod_api: '2352',
    provincia: 'Chaco',
    dni: '14285901',
    renapa: 'H1041',
    telefono: '03732-491048',
    puntuacion: 4.2,
    created_at: new Date(2026, 3, 15).toISOString(),
    updated_at: new Date(2026, 3, 15).toISOString(),
  },
  {
    id: '3',
    nombre: 'Cooperativa Apícola Pampeana',
    cuit: '30-58291048-2',
    localidad: 'General Pico',
    cod_api: '1887',
    provincia: 'La Pampa',
    dni: '58291048',
    renapa: 'L2251',
    telefono: '02302-429104',
    puntuacion: 5.0,
    created_at: new Date(2026, 2, 10).toISOString(),
    updated_at: new Date(2026, 2, 10).toISOString(),
  }
];

const MOCK_ENTREGAS: FichaEntregaMiel[] = [
  {
    id: 'e1',
    apicultor_id: '1',
    fecha: new Date(2026, 5, 1).toISOString(),
    color_pfund: 34.0,
    humedad: 17.2,
    hmf: 12.5,
    cantidad_tambores: 2,
    kilos_neto: 600.0,
    created_at: new Date(2026, 5, 1).toISOString(),
    updated_at: new Date(2026, 5, 1).toISOString(),
  }
];

const MOCK_TAMBORES: FichaEntregaTambor[] = [
  {
    id: 't1',
    entrega_id: 'e1',
    nro_tambor: 'TAMB-1001',
    barras_ean: '18-08046134-4',
    lote: 13006,
    kilos_bruto: 316,
    tara: 16,
    kilos_neto: 300,
    color_pfund: 34,
    humedad: 17.2,
    hmf: 12.5,
    antibiotico: 'NEGATIVO',
    created_at: new Date(2026, 5, 1).toISOString()
  },
  {
    id: 't2',
    entrega_id: 'e1',
    nro_tambor: 'TAMB-1002',
    barras_ean: '18-08708453-8',
    lote: 13006,
    kilos_bruto: 316,
    tara: 16,
    kilos_neto: 300,
    color_pfund: 34,
    humedad: 17.2,
    hmf: 12.5,
    antibiotico: 'NEGATIVO',
    created_at: new Date(2026, 5, 1).toISOString()
  }
];

const MOCK_ENVASES: FichaControlEnvases[] = [
  {
    id: 'n1',
    apicultor_id: '1',
    fecha: new Date(2026, 4, 15).toISOString(),
    tipo_movimiento: 'PRESTAMO',
    cantidad: 10,
    observaciones: 'Préstamo de tambores vacíos para cosecha',
    created_at: new Date(2026, 4, 15).toISOString(),
    updated_at: new Date(2026, 4, 15).toISOString(),
  }
];

const MOCK_CUENTA_CORRIENTE: FichaCuentaCorriente[] = [
  {
    id: 'c1',
    apicultor_id: '1',
    fecha: new Date(2026, 4, 2).toISOString(),
    moneda: 'ARS',
    tipo_movimiento: 'DEBE',
    monto: 300000.00,
    detalle: 'Adelanto efectivo Pesos',
    precio_referencia_miel: 300,
    kilos_miel_equiv: -1000,
    tipo_transaccion: 'ANTICIPO_CASH',
    created_at: new Date(2026, 4, 2).toISOString(),
    updated_at: new Date(2026, 4, 2).toISOString(),
  },
  {
    id: 'c2',
    apicultor_id: '1',
    fecha: new Date(2026, 4, 20).toISOString(),
    moneda: 'USD',
    tipo_movimiento: 'DEBE',
    monto: 305.00,
    detalle: 'Retiro 10 TR Raldas',
    precio_referencia_miel: 1.0, // Honey USD
    kilos_miel_equiv: -305, // 10 * 30.5 / 1.0
    tipo_transaccion: 'CARGO_ENVASE',
    created_at: new Date(2026, 4, 20).toISOString(),
    updated_at: new Date(2026, 4, 20).toISOString(),
  }
];

const MOCK_OPERCULO: FichaControlOperculo[] = [
  {
    id: 'op1',
    apicultor_id: '1',
    fecha: new Date(2026, 4, 10).toISOString(),
    tipo_movimiento: 'ENTREGA_OP',
    kilos_op: 500,
    rendimiento_cera: 0.8,
    detalle: 'Entrega opérculo de cosecha temprana',
    created_at: new Date(2026, 4, 10).toISOString(),
    updated_at: new Date(2026, 4, 10).toISOString(),
  },
  {
    id: 'op2',
    apicultor_id: '1',
    fecha: new Date(2026, 4, 12).toISOString(),
    tipo_movimiento: 'RETIRO_CERA',
    kilos_op: -87.5, // 70 kg wax / 0.8
    rendimiento_cera: 0.8,
    detalle: 'Retira 7 cajas de cera (70 kg)',
    created_at: new Date(2026, 4, 12).toISOString(),
    updated_at: new Date(2026, 4, 12).toISOString(),
  }
];

// Cargar Mock en LocalStorage si no existe
const initializeLocalStorageMock = () => {
  // Separar tambores de entregas para Ruiz Ruben Oscar
  const ruizEntregasOnly = RUIZ_MOCK_ENTREGAS.map(({ tambores, ...rest }) => rest);
  const ruizTamboresOnly = RUIZ_MOCK_ENTREGAS.flatMap(e => e.tambores || []);

  const combinedApicultores = [...MOCK_APICULTORES, RUIZ_PROFILE];
  const combinedEntregas = [...MOCK_ENTREGAS, ...ruizEntregasOnly];
  const combinedTambores = [...MOCK_TAMBORES, ...ruizTamboresOnly];
  const combinedEnvases = [...MOCK_ENVASES, ...RUIZ_MOCK_ENVASES];
  const combinedCuentaCorriente = [...MOCK_CUENTA_CORRIENTE, ...RUIZ_MOCK_CUENTA_CORRIENTE];
  const combinedOperculo = [...MOCK_OPERCULO, ...RUIZ_MOCK_OPERCULO];

  const storedApics = localStorage.getItem('srm_apicultores');
  const hasRuiz = storedApics && storedApics.includes('e37fb194-9e25-5d90-b912-9925001072c0');

  if (!localStorage.getItem('srm_apicultores') || !hasRuiz) {
    localStorage.setItem('srm_apicultores', JSON.stringify(combinedApicultores));
    localStorage.setItem('srm_entregas', JSON.stringify(combinedEntregas));
    localStorage.setItem('srm_tambores', JSON.stringify(combinedTambores));
    localStorage.setItem('srm_envases', JSON.stringify(combinedEnvases));
    localStorage.setItem('srm_cuenta_corriente', JSON.stringify(combinedCuentaCorriente));
    localStorage.setItem('srm_operculo', JSON.stringify(combinedOperculo));
    localStorage.setItem('srm_productos', JSON.stringify(PRODUCTOS_MOCK));
  }
};



if (isMockMode) {
  initializeLocalStorageMock();
}

const getMockData = <T>(key: string): T[] => {
  return JSON.parse(localStorage.getItem(key) || '[]');
};

const saveMockData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// =========================================================================
// SERVICIO DE NEGOCIO (APICULTOR SRM API)
// =========================================================================
export const srmService = {
  // -----------------------------------------------------------------------
  // APICULTORES
  // -----------------------------------------------------------------------
  async listApicultores(): Promise<Apicultor[]> {
    if (isMockMode) {
      return getMockData<Apicultor>('srm_apicultores');
    }
    const { data, error } = await supabase!
      .from('apicultores')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async listProductos(): Promise<Producto[]> {
    if (isMockMode) {
      return getMockData<Producto>('srm_productos');
    }
    try {
      const { data, error } = await supabase!
        .from('productos')
        .select('*')
        .order('codigo', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("⚠️ Supabase error getting products, using local fallback:", err);
      return getMockData<Producto>('srm_productos') || PRODUCTOS_MOCK;
    }
  },


  async getApicultor(id: string): Promise<ApicultorCompleto> {
    if (isMockMode) {
      const apicultores = getMockData<Apicultor>('srm_apicultores');
      const apicultor = apicultores.find(a => a.id === id);
      if (!apicultor) throw new Error('Apicultor no encontrado');

      const entregas = getMockData<FichaEntregaMiel>('srm_entregas').filter(e => e.apicultor_id === id);
      const tambores = getMockData<FichaEntregaTambor>('srm_tambores');
      
      // Anidar tambores en entregas
      const entregasCompletas = entregas.map(e => ({
        ...e,
        tambores: tambores.filter(t => t.entrega_id === e.id)
      }));

      const envases = getMockData<FichaControlEnvases>('srm_envases').filter(e => e.apicultor_id === id);
      const cuenta_corriente = getMockData<FichaCuentaCorriente>('srm_cuenta_corriente').filter(e => e.apicultor_id === id);
      const operculo = getMockData<FichaControlOperculo>('srm_operculo').filter(e => e.apicultor_id === id);

      const stats = this.calcularStats(entregasCompletas, envases, cuenta_corriente, operculo);

      return {
        ...apicultor,
        stats,
        entregas: entregasCompletas,
        envases,
        cuenta_corriente,
        operculo
      };
    }

    // Consulta real en Supabase
    const { data: apicultor, error: errA } = await supabase!
      .from('apicultores')
      .select('*')
      .eq('id', id)
      .single();
    if (errA) throw errA;

    // Obtener entregas con tambores anidados
    const { data: entregas, error: errE } = await supabase!
      .from('ficha_entregas_miel')
      .select('*, tambores:ficha_entrega_tambores(*)')
      .eq('apicultor_id', id)
      .order('fecha', { ascending: false });
    if (errE) throw errE;

    const { data: envases, error: errN } = await supabase!
      .from('ficha_control_envases')
      .select('*')
      .eq('apicultor_id', id)
      .order('fecha', { ascending: false });
    if (errN) throw errN;

    const { data: cc, error: errC } = await supabase!
      .from('ficha_cuenta_corriente')
      .select('*')
      .eq('apicultor_id', id)
      .order('fecha', { ascending: false });
    if (errC) throw errC;

    const { data: operculo, error: errO } = await supabase!
      .from('ficha_control_operculo')
      .select('*')
      .eq('apicultor_id', id)
      .order('fecha', { ascending: false });
    if (errO) throw errO;

    const stats = this.calcularStats(entregas || [], envases || [], cc || [], operculo || []);

    return {
      ...apicultor,
      stats,
      entregas: entregas || [],
      envases: envases || [],
      cuenta_corriente: cc || [],
      operculo: operculo || []
    };
  },

  async createApicultor(
    nombre: string,
    cuit: string,
    localidad: string,
    cod_api?: string,
    provincia?: string,
    dni?: string,
    renapa?: string,
    telefono?: string
  ): Promise<Apicultor> {
    if (isMockMode) {
      const apicultores = getMockData<Apicultor>('srm_apicultores');
      const nuevo: Apicultor = {
        id: (apicultores.length + 1).toString(),
        nombre,
        cuit,
        localidad,
        cod_api,
        provincia,
        dni,
        renapa,
        telefono,
        puntuacion: 5.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      apicultores.push(nuevo);
      saveMockData('srm_apicultores', apicultores);
      return nuevo;
    }

    const { data, error } = await supabase!
      .from('apicultores')
      .insert([{
        nombre,
        cuit,
        localidad,
        cod_api,
        provincia,
        dni,
        renapa,
        telefono,
        puntuacion: 5.0
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -----------------------------------------------------------------------
  // ENTREGAS DE MIEL
  // -----------------------------------------------------------------------
  async createEntrega(
    apicultor_id: string,
    color_pfund: number,
    humedad: number,
    hmf: number,
    cantidad_tambores: number,
    kilos_neto: number,
    fecha?: string
  ): Promise<FichaEntregaMiel> {
    const fechaMov = fecha ? new Date(fecha).toISOString() : new Date().toISOString();
    
    if (isMockMode) {
      const entregas = getMockData<FichaEntregaMiel>('srm_entregas');
      const nuevo: FichaEntregaMiel = {
        id: 'e_new_' + Math.random().toString(36).substr(2, 9),
        apicultor_id,
        fecha: fechaMov,
        color_pfund,
        humedad,
        hmf,
        cantidad_tambores,
        kilos_neto,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      entregas.push(nuevo);
      saveMockData('srm_entregas', entregas);
      return nuevo;
    }

    const { data, error } = await supabase!
      .from('ficha_entregas_miel')
      .insert([{ apicultor_id, color_pfund, humedad, hmf, cantidad_tambores, kilos_neto, fecha: fechaMov }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createEntregaTambor(
    entrega_id: string,
    nro_tambor: string,
    barras_ean: string,
    lote: number,
    kilos_bruto: number,
    tara: number,
    color_pfund?: number,
    humedad?: number,
    hmf?: number,
    antibiotico?: string
  ): Promise<FichaEntregaTambor> {
    if (isMockMode) {
      const tambores = getMockData<FichaEntregaTambor>('srm_tambores');
      const nuevo: FichaEntregaTambor = {
        id: 't_new_' + Math.random().toString(36).substr(2, 9),
        entrega_id,
        nro_tambor,
        barras_ean,
        lote,
        kilos_bruto,
        tara,
        kilos_neto: kilos_bruto - tara,
        color_pfund,
        humedad,
        hmf,
        antibiotico,
        created_at: new Date().toISOString()
      };
      tambores.push(nuevo);
      saveMockData('srm_tambores', tambores);
      return nuevo;
    }

    const { data, error } = await supabase!
      .from('ficha_entrega_tambores')
      .insert([{
        entrega_id,
        nro_tambor,
        barras_ean,
        lote,
        kilos_bruto,
        tara,
        color_pfund,
        humedad,
        hmf,
        antibiotico
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -----------------------------------------------------------------------
  // CONTROL DE ENVASES (TAMBORES VACÍOS)
  // -----------------------------------------------------------------------
  async createEnvaseMovimiento(
    apicultor_id: string,
    tipo_movimiento: 'PRESTAMO' | 'DEVOLUCION',
    cantidad: number,
    observaciones: string,
    fecha?: string
  ): Promise<FichaControlEnvases> {
    const fechaMov = fecha ? new Date(fecha).toISOString() : new Date().toISOString();

    if (isMockMode) {
      const envases = getMockData<FichaControlEnvases>('srm_envases');
      const nuevo: FichaControlEnvases = {
        id: 'n_new_' + Math.random().toString(36).substr(2, 9),
        apicultor_id,
        fecha: fechaMov,
        tipo_movimiento,
        cantidad,
        observaciones,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      envases.push(nuevo);
      saveMockData('srm_envases', envases);
      return nuevo;
    }

    const { data, error } = await supabase!
      .from('ficha_control_envases')
      .insert([{ apicultor_id, tipo_movimiento, cantidad, observaciones, fecha: fechaMov }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -----------------------------------------------------------------------
  // CUENTA CORRIENTE FINANCIERA (CON EXTENSIONES DE MIEL EQUIVALENTE)
  // -----------------------------------------------------------------------
  async createCuentaCorrienteMovimiento(
    apicultor_id: string,
    moneda: 'ARS' | 'USD',
    tipo_movimiento: 'DEBE' | 'HABER',
    monto: number,
    detalle: string,
    fecha?: string,
    precio_referencia_miel?: number,
    kilos_miel_equiv?: number,
    tipo_transaccion?: 'ANTICIPO_CASH' | 'RETIRO_INSUMO' | 'CARGO_ENVASE' | 'VENTA_LIQUIDACION' | 'SALDO_INICIAL' | 'AJUSTE'
  ): Promise<FichaCuentaCorriente> {
    const fechaMov = fecha ? new Date(fecha).toISOString() : new Date().toISOString();

    if (isMockMode) {
      const cc = getMockData<FichaCuentaCorriente>('srm_cuenta_corriente');
      const nuevo: FichaCuentaCorriente = {
        id: 'c_new_' + Math.random().toString(36).substr(2, 9),
        apicultor_id,
        fecha: fechaMov,
        moneda,
        tipo_movimiento,
        monto,
        detalle,
        precio_referencia_miel,
        kilos_miel_equiv,
        tipo_transaccion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      cc.push(nuevo);
      saveMockData('srm_cuenta_corriente', cc);
      return nuevo;
    }

    const { data, error } = await supabase!
      .from('ficha_cuenta_corriente')
      .insert([{ 
        apicultor_id, 
        moneda, 
        tipo_movimiento, 
        monto, 
        detalle, 
        fecha: fechaMov,
        precio_referencia_miel,
        kilos_miel_equiv,
        tipo_transaccion
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -----------------------------------------------------------------------
  // CONTROL DE OPÉRCULO / CERA
  // -----------------------------------------------------------------------
  async createOperculoMovimiento(
    apicultor_id: string,
    tipo_movimiento: 'ENTREGA_OP' | 'RETIRO_CERA' | 'AJUSTE',
    kilos_op: number,
    rendimiento_cera: number = 0.8,
    detalle?: string,
    fecha?: string
  ): Promise<FichaControlOperculo> {
    const fechaMov = fecha ? new Date(fecha).toISOString() : new Date().toISOString();

    if (isMockMode) {
      const op = getMockData<FichaControlOperculo>('srm_operculo');
      const nuevo: FichaControlOperculo = {
        id: 'op_new_' + Math.random().toString(36).substr(2, 9),
        apicultor_id,
        fecha: fechaMov,
        tipo_movimiento,
        kilos_op,
        rendimiento_cera,
        detalle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      op.push(nuevo);
      saveMockData('srm_operculo', op);
      return nuevo;
    }

    const { data, error } = await supabase!
      .from('ficha_control_operculo')
      .insert([{ 
        apicultor_id, 
        tipo_movimiento, 
        kilos_op, 
        rendimiento_cera, 
        detalle, 
        fecha: fechaMov 
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -----------------------------------------------------------------------
  // HELPERS DE CÁLCULO ESTADÍSTICO
  // -----------------------------------------------------------------------
  calcularStats(
    entregas: FichaEntregaMiel[],
    envases: FichaControlEnvases[],
    cuenta_corriente: FichaCuentaCorriente[],
    operculo: FichaControlOperculo[]
  ): ApicultorDashboardStats {
    // 1. Saldo de Envases en Campo (Préstamos - Devoluciones)
    let saldo_envases = 0;
    envases.forEach(e => {
      if (e.tipo_movimiento === 'PRESTAMO') {
        saldo_envases += e.cantidad;
      } else {
        saldo_envases -= e.cantidad;
      }
    });

    // 2. Cuentas Financieras (ARS y USD)
    let saldo_ars = 0;
    let saldo_usd = 0;

    cuenta_corriente.forEach(cc => {
      const factor = cc.tipo_movimiento === 'HABER' ? 1 : -1;
      if (cc.moneda === 'ARS') {
        saldo_ars += cc.monto * factor;
      } else {
        saldo_usd += cc.monto * factor;
      }
    });

    // 3. Totales de entrega física de miel
    let entregas_kilos = 0;
    let entregas_tambores = 0;
    entregas.forEach(e => {
      entregas_kilos += e.kilos_neto;
      entregas_tambores += e.cantidad_tambores;
    });

    // 4. Saldo Virtual de Miel Equivalente (Fórmula de la Ficha)
    // Saldo = Sum(Kilos Neto entregados) + Sum(Kilos miel equivalentes cargados en cuenta corriente)
    // Nota: kilos_miel_equiv son negativos para débitos (retiros, anticipos) y positivos/negativos para ajustes
    let saldo_miel_equiv = entregas_kilos;
    cuenta_corriente.forEach(cc => {
      if (cc.kilos_miel_equiv) {
        saldo_miel_equiv += cc.kilos_miel_equiv;
      }
    });

    // 5. Saldo Secundario de Opérculo
    let saldo_op = 0;
    operculo.forEach(op => {
      saldo_op += op.kilos_op;
    });

    return {
      saldo_envases,
      saldo_financiero_ars: saldo_ars,
      saldo_financiero_usd: saldo_usd,
      saldo_miel_equivalente: saldo_miel_equiv,
      saldo_operculo: saldo_op,
      entregas_totales_kilos: entregas_kilos,
      entregas_totales_tambores: entregas_tambores
    };
  },

  async getGlobalStats(): Promise<{
    totalKilosMiel: number;
    totalTamboresCampo: number;
    totalMielEquivSaldo: number;
    incidencias: { id: string; apicultor_nombre: string; fecha: string; humedad: number; hmf: number; kilos_neto: number; cantidad_tambores: number }[];
  }> {
    if (isMockMode) {
      const entregas = getMockData<FichaEntregaMiel>('srm_entregas');
      const envases = getMockData<FichaControlEnvases>('srm_envases');
      const cc = getMockData<FichaCuentaCorriente>('srm_cuenta_corriente');
      const apicultores = getMockData<Apicultor>('srm_apicultores');

      const totalKilosMiel = entregas.reduce((acc, curr) => acc + curr.kilos_neto, 0);
      const totalTamboresCampo = envases.reduce((acc, curr) => acc + (curr.tipo_movimiento === 'PRESTAMO' ? curr.cantidad : -curr.cantidad), 0);
      
      let totalMielEquivSaldo = totalKilosMiel;
      cc.forEach(item => {
        if (item.kilos_miel_equiv) {
          totalMielEquivSaldo += item.kilos_miel_equiv;
        }
      });

      const incidencias: any[] = [];
      entregas.forEach(e => {
        if (e.humedad > 18.0 || e.hmf > 40.0) {
          const apicultor = apicultores.find(a => a.id === e.apicultor_id);
          incidencias.push({
            id: e.id,
            apicultor_nombre: apicultor ? apicultor.nombre : 'Desconocido',
            fecha: e.fecha,
            humedad: e.humedad,
            hmf: e.hmf,
            kilos_neto: e.kilos_neto,
            cantidad_tambores: e.cantidad_tambores
          });
        }
      });

      return {
        totalKilosMiel,
        totalTamboresCampo,
        totalMielEquivSaldo,
        incidencias
      };
    }

    // Supabase Mode
    const { data: entregas, error: errE } = await supabase!
      .from('ficha_entregas_miel')
      .select('id, apicultor_id, fecha, kilos_neto, humedad, hmf, cantidad_tambores');
    if (errE) throw errE;

    const { data: envases, error: errN } = await supabase!
      .from('ficha_control_envases')
      .select('tipo_movimiento, cantidad');
    if (errN) throw errN;

    const { data: cc, error: errC } = await supabase!
      .from('ficha_cuenta_corriente')
      .select('kilos_miel_equiv');
    if (errC) throw errC;

    const apicultores = await this.listApicultores();

    const totalKilosMiel = (entregas || []).reduce((acc, curr) => acc + curr.kilos_neto, 0);
    const totalTamboresCampo = (envases || []).reduce((acc, curr) => acc + (curr.tipo_movimiento === 'PRESTAMO' ? curr.cantidad : -curr.cantidad), 0);
    const totalMielEquivSaldo = totalKilosMiel + (cc || []).reduce((acc, curr) => acc + (curr.kilos_miel_equiv || 0), 0);

    const incidencias: any[] = [];
    (entregas || []).forEach(e => {
      if (e.humedad > 18.0 || e.hmf > 40.0) {
        const apicultor = apicultores.find(a => a.id === e.apicultor_id);
        incidencias.push({
          id: e.id,
          apicultor_nombre: apicultor ? apicultor.nombre : 'Desconocido',
          fecha: e.fecha,
          humedad: e.humedad,
          hmf: e.hmf,
          kilos_neto: e.kilos_neto,
          cantidad_tambores: e.cantidad_tambores
        });
      }
    });

    return {
      totalKilosMiel,
      totalTamboresCampo,
      totalMielEquivSaldo,
      incidencias
    };
  }
};
