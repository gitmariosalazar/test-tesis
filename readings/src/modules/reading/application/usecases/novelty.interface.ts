export interface INovelty {
  id: number;
  title: string;
  description: string;
  minPercentage: number | null;
  maxPercentage: number | null;
  actionRecommended: string;
}

export const NOVELTIES: Record<number, INovelty> = {
  1: {
    id: 1,
    title: 'NORMAL',
    description: 'Consumo dentro del rango aceptable (60% a 140% del promedio).',
    minPercentage: 60.00,
    maxPercentage: 140.00,
    actionRecommended: 'Registrar la lectura sin intervención adicional. Continuar con monitoreo estándar.'
  },
  2: {
    id: 2,
    title: 'CONSUMO BAJO',
    description: 'Consumo por debajo del 60% del promedio, indicando posible anomalía.',
    minPercentage: 20.00,
    maxPercentage: 59.99,
    actionRecommended: 'Verificar el estado del medidor en campo. Contactar al cliente para confirmar cambios en el uso. Registrar una novedad para seguimiento.'
  },
  3: {
    id: 3,
    title: 'CONSUMO ALTO',
    description: 'Consumo por encima del 140% del promedio, indicando posible anomalía.',
    minPercentage: 140.01,
    maxPercentage: 200.00,
    actionRecommended: 'Verificar la lectura actual en campo. Notificar al cliente para confirmar cambios en el uso o posibles fugas. Registrar para seguimiento.'
  },
  4: {
    id: 4,
    title: 'ADVERTENCIA',
    description: 'Consumo en rango de advertencia (40-60% o 140-180% del promedio).',
    minPercentage: null,
    maxPercentage: null,
    actionRecommended: 'Registrar la lectura y añadir una nota para seguimiento en la próxima lectura. Verificar el historial de consumo.'
  },
  5: {
    id: 5,
    title: 'CONSUMO MUY BAJO',
    description: 'El consumo es prácticamente inexistente, sugiriendo un problema grave o una situación especial.',
    minPercentage: 0.00,
    maxPercentage: 19.99,
    actionRecommended: 'Inspección inmediata del medidor y la conexión. Confirmar el estado del suministro. Registrar como anomalía crítica.'
  },
  6: {
    id: 6,
    title: 'CONSUMO EXCESIVO',
    description: 'El consumo es extremadamente alto, indicando una posible emergencia o error grave.',
    minPercentage: 200.01,
    maxPercentage: null,
    actionRecommended: 'Inspección urgente en campo para descartar fugas o problemas en el medidor. Contactar al cliente de inmediato. Suspender facturación hasta confirmar la causa.'
  },
  7: {
    id: 7,
    title: 'ADVERTENCIA INFERIOR',
    description: 'El consumo está ligeramente por debajo del rango normal (40-60%), lo que puede ser un indicio temprano de una anomalía.',
    minPercentage: 40.00,
    maxPercentage: 59.99,
    actionRecommended: 'Registrar la lectura y añadir una nota para seguimiento en la próxima lectura. Verificar el historial de consumo.'
  },
  8: {
    id: 8,
    title: 'ADVERTENCIA SUPERIOR',
    description: 'El consumo está ligeramente por encima del rango normal (140-180%), lo que puede indicar un problema menor o un cambio en el uso.',
    minPercentage: 140.01,
    maxPercentage: 180.00,
    actionRecommended: 'Verificar la lectura actual en campo. Notificar al cliente para confirmar cambios en el uso. Registrar para seguimiento.'
  },
  9: {
    id: 9,
    title: 'LECTURA INVÁLIDA',
    description: 'La lectura no es válida debido a un error en el registro o en el medidor (consumo negativo o inconsistente).',
    minPercentage: null,
    maxPercentage: null,
    actionRecommended: 'Inspección inmediata del medidor. Revisar el historial de lecturas para identificar inconsistencias. Registrar como anomalía crítica.'
  },
  10: {
    id: 10,
    title: 'SIN LECTURA',
    description: 'No se pudo obtener una lectura debido a problemas de acceso o fallos técnicos.',
    minPercentage: null,
    maxPercentage: null,
    actionRecommended: 'Programar una nueva visita para tomar la lectura. Notificar al cliente sobre la falta de lectura. Usar el promedio histórico para facturación provisional.'
  },
  11: {
    id: 11,
    title: 'CONSUMO ESTACIONAL',
    description: 'El consumo está influenciado por factores estacionales, pero dentro de un rango esperado para la época del año.',
    minPercentage: null,
    maxPercentage: null,
    actionRecommended: 'Comparar con el historial estacional del cliente. Registrar como normal si está dentro de los patrones esperados. Notificar al cliente si el cambio es significativo.'
  }
};