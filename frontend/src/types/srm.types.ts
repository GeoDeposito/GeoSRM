/* src/types/srm.types.ts */

export interface Apicultor {
  id: string;
  nombre: string;
  cuit: string;
  localidad?: string;
  cod_api?: string;
  provincia?: string;
  dni?: string;
  renapa?: string;
  telefono?: string;
  puntuacion: number; // 0.00 to 5.00
  etapa?: 'PROSPECTO' | 'CONTACTADO' | 'NEGOCIANDO' | 'ACTIVO';
  tag?: string;
  notas_onboarding?: string;
  created_at: string;
  updated_at: string;
}

export interface FichaEntregaTambor {
  id: string;
  entrega_id: string;
  nro_tambor: string;
  barras_ean?: string;
  lote?: number;
  kilos_bruto: number;
  tara: number;
  kilos_neto: number; // generated on DB, but tracked in FE
  color_pfund?: number;
  humedad?: number;
  hmf?: number;
  antibiotico?: string;
  created_at: string;
}

export interface FichaEntregaMiel {
  id: string;
  apicultor_id: string;
  fecha: string;
  romaneo?: string; // Número de Romaneo único
  color_pfund: number; // mm Pfund
  humedad: number; // percentage %
  hmf: number; // mg/kg
  cantidad_tambores: number;
  kilos_neto: number;
  created_at: string;
  updated_at: string;
  tambores?: FichaEntregaTambor[]; // Expanded details
}

export interface FichaControlEnvases {
  id: string;
  apicultor_id: string;
  fecha: string;
  tipo_movimiento: 'PRESTAMO' | 'DEVOLUCION';
  cantidad: number;
  producto?: string; // e.g. TRR, TNA, TCM
  remito?: string;
  nro_viaje?: string;
  chofer?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface FichaCuentaCorriente {
  id: string;
  apicultor_id: string;
  fecha: string;
  moneda: 'ARS' | 'USD';
  tipo_movimiento: 'DEBE' | 'HABER';
  monto: number;
  detalle?: string;
  precio_referencia_miel?: number;
  kilos_miel_equiv?: number;
  tipo_transaccion?: 'ANTICIPO_CASH' | 'RETIRO_INSUMO' | 'CARGO_ENVASE' | 'VENTA_LIQUIDACION' | 'SALDO_INICIAL' | 'AJUSTE' | 'SERVICIO_TRAZABILIDAD';
  tcp?: number;
  interes_mensual?: number;
  created_at: string;
  updated_at: string;
}

export interface FichaControlOperculo {
  id: string;
  apicultor_id: string;
  fecha: string;
  tipo_movimiento: 'ENTREGA_OP' | 'RETIRO_CERA' | 'AJUSTE';
  kilos_op: number;
  rendimiento_cera: number; // Default 0.8
  nro_viaje?: string;
  chofer?: string;
  detalle?: string;
  created_at: string;
  updated_at: string;
}

export interface ApicultorDashboardStats {
  saldo_envases: number; // Saldo de envases en campo
  saldo_financiero_ars: number; // Debe vs Haber consolidado en pesos
  saldo_financiero_usd: number; // Debe vs Haber consolidado en dólares
  saldo_miel_equivalente: number; // Virtual honey equivalent balance
  saldo_operculo: number; // Net cappings balance
  entregas_totales_kilos: number;
  entregas_totales_tambores: number;
}

export interface ApicultorCompleto extends Apicultor {
  stats: ApicultorDashboardStats;
  entregas: FichaEntregaMiel[];
  envases: FichaControlEnvases[];
  cuenta_corriente: FichaCuentaCorriente[];
  operculo: FichaControlOperculo[];
}

export interface Producto {
  codigo: number;
  producto: string;
  descripcion: string;
  unidad: string;
  categoria: string;
}


