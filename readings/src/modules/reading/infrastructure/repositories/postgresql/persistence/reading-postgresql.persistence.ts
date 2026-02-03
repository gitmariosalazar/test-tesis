import { InterfaceReadingRepository } from './../../../../domain/contracts/reading.interface.repository';
import { Injectable } from '@nestjs/common';
import { toZonedTime } from 'date-fns-tz';
import {
  ReadingBasicInfoSQLResult,
  ReadingInfoSQLResult,
  ReadingSQLResult,
} from '../../../interfaces/sql/reading-sql.result.interface';
import { ReadingPostgreSQLAdapter } from '../adapters/reading-postgresql.adapter';
import { DatabaseServicePostgreSQL } from '../../../../../../shared/connections/database/postgresql/postgresql.service';
import {
  ReadingBasicInfoResponse,
  ReadingInfoResponse,
} from '../../../../application/dtos/response/reading-basic.response';
import { ReadingModel } from '../../../../domain/schemas/model/reading.model';
import { ReadingResponse } from '../../../../application/dtos/response/reading.response';
import { RpcException } from '@nestjs/microservices';
import { statusCode } from '../../../../../../settings/environments/status-code';
import { getTypeCurrentConsumption } from '../../../../../../shared/types/novelty.type';

@Injectable()
export class ReadingPersistencePostgreSQL implements InterfaceReadingRepository {
  constructor(private readonly postgresqlService: DatabaseServicePostgreSQL) {}

  async findReadingBasicInfo(
    cadastralKey: string,
  ): Promise<ReadingBasicInfoResponse[]> {
    try {
      const query: string = `
        SELECT
            l.lectura_id AS "reading_id",
            l.fecha_lectura AS "previous_reading_date",
            ac.acometida_id AS "cadastral_key",
            c.cliente_id AS "card_id",
            COALESCE(ci.nombres || ' ' || ci.apellidos, e.razon_social) AS "client_name",
            ac.direccion AS address,
            l.lectura_anterior AS "previous_reading",
            l.lectura_actual AS "current_reading",
            ac.sector,
            ac.cuenta AS account,
            l.valor_lectura AS "reading_value",
            cp.average_consumption AS "average_consumption",
            ac.numero_medidor AS "meter_number",
            ac.tarifa_id AS "rate_id",
            ct.nombre AS "rate_name"
        FROM acometida ac
            LEFT JOIN cliente c ON ac.cliente_id = c.cliente_id
            LEFT JOIN ciudadano ci ON ci.ciudadano_id = c.cliente_id
            LEFT JOIN empresa e ON e.ruc = c.cliente_id
            INNER JOIN lectura l ON l.acometida_id = ac.acometida_id
            INNER JOIN tarifa t on t.tarifa_id = ac.tarifa_id
            left join categoria ct on t.categoria_id = ct.categoria_id
            LEFT JOIN consumo_promedio cp ON cp.acometida_id = ac.acometida_id
            WHERE ac.acometida_id = $1 AND l.fecha_lectura IS NOT NULL
            ORDER BY l.fecha_lectura  DESC LIMIT 2;
      `;
      const params: string[] = [cadastralKey];

      const result =
        await this.postgresqlService.query<ReadingBasicInfoSQLResult>(
          query,
          params,
        );
      const response: ReadingBasicInfoResponse[] = result.map((value) =>
        ReadingPostgreSQLAdapter.fromReadingPostgreSQLResultToReadingBasicInfoResponse(
          value,
        ),
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async findReadingInfo(cadastralKey: string): Promise<ReadingInfoResponse[]> {
    try {
      const query: string = `
WITH ultima_lectura_valida AS (
  -- 1. Últimas 5 lecturas válidas
  SELECT
    l.lectura_id,
    l.acometida_id,
    l.fecha_lectura,
    l.hora_lectura,
    l.lectura_anterior,
    l.lectura_actual,
    l.valor_lectura,
    l.mes_lectura
  FROM (
    SELECT l.*
    FROM lectura l
    WHERE l.acometida_id = $1
      AND l.fecha_lectura IS NOT NULL
      AND l.novedad IS NOT NULL
      AND l.novedad NOT LIKE '%INICIAL AUTOMÁTICA%'
      AND l.novedad NOT LIKE '%CAMBIO MEDIDOR%'
    ORDER BY l.fecha_lectura DESC
    LIMIT 5
  ) l
  ORDER BY l.fecha_lectura DESC
),

ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY acometida_id ORDER BY fecha_lectura DESC) AS rn,
    date_trunc('month', fecha_lectura)::date AS mes_lectura_trunc
  FROM ultima_lectura_valida
),

mes_actual AS (
  SELECT date_trunc('month', CURRENT_DATE)::date AS mes_hoy
),

-- ¿Ya existe una lectura tomada en el mes actual?
lectura_mes_actual_existe AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM lectura l
      WHERE l.acometida_id = $1
        AND date_trunc('month', l.fecha_lectura)::date = date_trunc('month', CURRENT_DATE)::date
        AND l.novedad NOT LIKE '%INICIAL AUTOMÁTICA%'
        AND l.novedad NOT LIKE '%CAMBIO MEDIDOR%'
    ) AS ya_tomada_mes_actual
),

-- Próximo mes que debería tener lectura
proximo_mes_esperado AS (
  SELECT
    COALESCE(
      date_trunc('month', MAX(l.fecha_lectura)) + INTERVAL '1 month',
      date_trunc('month', CURRENT_DATE)
    )::date AS mes_que_toca
  FROM lectura l
  WHERE l.acometida_id = $1
    AND l.fecha_lectura IS NOT NULL
    AND l.novedad NOT LIKE '%INICIAL AUTOMÁTICA%'
    AND l.novedad NOT LIKE '%CAMBIO MEDIDOR%'
),

periodo AS (
  SELECT
    COALESCE(sl.fecha_inicio_periodo, CURRENT_DATE - INTERVAL '1 month') AS inicio,
    sl.fecha_siguiente_lectura AS fecha_mitad,
    COALESCE(sl.fecha_fin_periodo, CURRENT_DATE + INTERVAL '1 month') AS fin
  FROM siguiente_lectura sl
  WHERE sl.acometida_id = $1
),

lectura_en_periodo AS (
  SELECT
    p.inicio,
    p.fin,
    (CURRENT_DATE BETWEEN p.inicio AND p.fin) AS en_periodo,
    EXISTS (
      SELECT 1
      FROM lectura l2
      WHERE l2.acometida_id = $1
        AND l2.fecha_lectura::date >= COALESCE(p.fecha_mitad, p.inicio)
        AND l2.novedad NOT LIKE '%INICIAL AUTOMÁTICA%'
        AND l2.novedad NOT LIKE '%CAMBIO MEDIDOR%'
    ) AS ya_tomada_en_periodo_actual
  FROM periodo p
)

-- Resultado final
SELECT
  l.lectura_id AS "reading_id",
  l.fecha_lectura AS "previous_reading_date",
  l.hora_lectura AS "reading_time",
  ac.acometida_id AS "cadastral_key",
  c.cliente_id AS "card_id",
  COALESCE(ci.nombres || ' ' || ci.apellidos, e.razon_social) AS "client_name",
  cc.phones AS "client_phones",
  cc.correos AS "client_emails",
  ac.direccion AS address,
  l.lectura_anterior AS "previous_reading",
  l.lectura_actual AS "current_reading",
  l.valor_lectura AS "reading_value",
  ac.sector,
  ac.cuenta AS account,
  cp.average_consumption AS "average_consumption",
  ac.numero_medidor AS "meter_number",
  ac.tarifa_id AS "rate_id",
  ct.nombre AS "rate_name",

  -- LÓGICA FINAL CORRECTA
  CASE
    -- Solo habilitamos edición si:
    -- - Estamos en el mes actual
    -- - Y aún NO se ha tomado la lectura de este mes
    -- - Y esta es la fila más reciente (rn=1)
    WHEN l.rn = 1
     AND pme.mes_que_toca = ma.mes_hoy
     AND NOT lmae.ya_tomada_mes_actual
    THEN true

    -- La lectura anterior siempre como referencia
    WHEN l.rn = 2 THEN true

    -- Cualquier otro caso: false
    ELSE false
  END AS "has_current_reading",

  -- Debug muy útil
  pme.mes_que_toca AS "next_month_to_take_debug",
  ma.mes_hoy AS "current_month_debug",
  lmae.ya_tomada_mes_actual AS "already_taken_current_month_debug",
  l.mes_lectura_trunc AS "reading_month_debug",
  lep.inicio AS "start_date_period",
  lep.fin AS "end_date_period",
  lep.en_periodo AS "in_period_debug",
  l.mes_lectura AS "month_reading"

FROM ranked l
CROSS JOIN proximo_mes_esperado pme
CROSS JOIN mes_actual ma
CROSS JOIN lectura_mes_actual_existe lmae
CROSS JOIN periodo p
CROSS JOIN lectura_en_periodo lep
JOIN acometida ac ON ac.acometida_id = l.acometida_id
LEFT JOIN cliente c ON c.cliente_id = ac.cliente_id
LEFT JOIN ciudadano ci ON ci.ciudadano_id = c.cliente_id
LEFT JOIN empresa e ON e.ruc = c.cliente_id
INNER JOIN tarifa t ON t.tarifa_id = ac.tarifa_id
LEFT JOIN categoria ct ON ct.categoria_id = t.categoria_id
LEFT JOIN consumo_promedio cp ON cp.acometida_id = ac.acometida_id
LEFT JOIN cliente_contacto cc ON cc.cliente_id = c.cliente_id

WHERE l.rn <= 2
ORDER BY l.fecha_lectura DESC;
      `;

      const params: string[] = [cadastralKey];

      const result = await this.postgresqlService.query<ReadingInfoSQLResult>(
        query,
        params,
      );

      const response: ReadingInfoResponse[] = result.map((value) =>
        ReadingPostgreSQLAdapter.fromReadingPostgreSQLResultToReadingInfoResponse(
          value,
        ),
      );

      if (response.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `No readings found for cadastral key: ${cadastralKey}`,
        });
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async verifyReadingIfExist(readingId: number): Promise<boolean> {
    try {
      const query: string = `SELECT EXISTS (SELECT 1 FROM lectura l WHERE l.lectura_id = $1)`;
      const params: number[] = [readingId];
      const result = await this.postgresqlService.query<boolean>(query, params);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  async updateCurrentReading(
    readingId: number,
    reading: ReadingModel,
  ): Promise<ReadingModel | null> {
    try {
      const query: string = `
        UPDATE lectura
        SET
            fecha_lectura = (NOW() AT TIME ZONE 'America/Guayaquil')::DATE,
            hora_lectura = TO_CHAR(NOW() AT TIME ZONE 'America/Guayaquil', 'HH24:MI:SS'),
            valor_lectura = $1,
            tasa_alcantarillado = $2,
            lectura_actual = $3,
            codigo_ingreso_renta = $4,
            novedad = $5,
            codigo_ingreso = $6
        WHERE lectura_id = $7
        RETURNING
          lectura_id as "reading_id",
          acometida_id as "connection_id",
          fecha_lectura as "reading_date",
          hora_lectura as "reading_time",
          sector as "sector",
          cuenta as "account",
          clave_catastral as "cadastral_key",
          valor_lectura as "reading_value",
          tasa_alcantarillado as "sewer_rate",
          lectura_anterior as "previous_reading",
          lectura_actual as "current_reading",
          codigo_ingreso_renta as "rental_income_code",
          novedad as "novelty",
          codigo_ingreso as "income_code";
      `;

      const params = [
        reading.readingValue ?? 0,
        reading.sewerRate ?? 0,
        reading.currentReading ?? 0,
        reading.rentalIncomeCode ?? 0,
        reading.novelty ?? 'NO NOVELTY',
        reading.incomeCode ?? 0,
        reading.id,
      ];

      const result = await this.postgresqlService.query<ReadingSQLResult>(
        query,
        params,
      );
      if (result.length === 0) {
        return null;
      }
      return ReadingPostgreSQLAdapter.fromReadingSQLResultToReadingModel(
        result[0],
      );
    } catch (error) {
      throw error;
    }
  }

  async createReading(reading: ReadingModel): Promise<ReadingModel | null> {
    try {
      const acometidaId = reading.connectionId;

      // === TRANSACCIÓN CON CONTROL AVANZADO DE DUPLICADOS ===
      const result = await this.postgresqlService.transaction(
        async (client) => {
          // === 1. Obtener IDs de estados ===
          const pendQuery = `SELECT lectura_estado_id FROM lectura_estado WHERE codigo = 'PEND' LIMIT 1;`;
          const fuerQuery = `SELECT lectura_estado_id FROM lectura_estado WHERE codigo = 'FUER' LIMIT 1;`;

          const [pendResult, fuerResult] = await Promise.all([
            client.query(pendQuery),
            client.query(fuerQuery),
          ]);

          const pendId =
            pendResult.rowCount > 0
              ? pendResult.rows[0].lectura_estado_id
              : null;
          const fuerId =
            fuerResult.rowCount > 0
              ? fuerResult.rows[0].lectura_estado_id
              : null;
          console.log('pendId', pendId);
          console.log('fuerId', fuerId);
          if (!pendId || !fuerId) {
            throw new RpcException({
              statusCode: statusCode.INTERNAL_SERVER_ERROR,
              message: `Estados PEND o FUER no encontrados en LecturaEstado.`,
            });
          }

          // === 2. CONTROL AVANZADO: REGLAS DE DUPLICADOS ===
          const timeZone = 'America/Guayaquil';
          const now = new Date();
          const zonedDate = toZonedTime(now, timeZone);

          const fechaLecturaInput = reading.readingDate ?? zonedDate;
          const mesLectura = zonedDate.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
          const novedadInput = reading.novelty ?? 'LECTURA NORMAL';
          const observation = novedadInput.includes('LECTURA NORMAL')
            ? 'NORMAL'
            : novedadInput || 'LECTURA NORMAL';

          const isEspecial =
            novedadInput.includes('INICIAL') ||
            novedadInput.includes('CAMBIO DE MEDIDOR');

          // Conteo con filtro
          const countQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE novedad NOT LIKE '%INICIAL%' AND novedad NOT LIKE '%CAMBIO DE MEDIDOR%') AS normales,
          COUNT(*) FILTER (WHERE novedad LIKE '%INICIAL%' OR novedad LIKE '%CAMBIO DE MEDIDOR%') AS especiales
        FROM lectura
        WHERE acometida_id = $1
          AND TO_CHAR(fecha_lectura, 'YYYY-MM') = $2
          AND lectura_estado_id IS NOT NULL;
      `;
          const countResult = await client.query(countQuery, [
            acometidaId,
            mesLectura,
          ]);
          const normales = parseInt(countResult.rows[0].normales || '0', 10);
          const especiales = parseInt(
            countResult.rows[0].especiales || '0',
            10,
          );

          const maxNormal = 1;
          const maxEspecial = 2;

          if (!isEspecial && normales >= maxNormal) {
            throw new RpcException({
              statusCode: statusCode.CONFLICT,
              message: `Ya existe una lectura normal en ${mesLectura}. Máximo ${maxNormal} permitida.`,
            });
          }

          if (isEspecial && especiales >= maxEspecial) {
            throw new RpcException({
              statusCode: statusCode.CONFLICT,
              message: `Máximo ${maxEspecial} lecturas especiales (INICIAL/CAMBIO MEDIDOR) en ${mesLectura}.`,
            });
          }

          // === 2.5 Obterner Promedio Consumo ===
          const avgQuery = `SELECT average_consumption FROM consumo_promedio WHERE acometida_id = $1 LIMIT 1;`;
          const avgResult = await client.query(avgQuery, [acometidaId]);
          const averageConsumption =
            avgResult.rowCount > 0
              ? parseFloat(avgResult.rows[0].average_consumption)
              : 0;

          const calculatedNovelty = getTypeCurrentConsumption(
            reading.previousReading,
            reading.currentReading,
            averageConsumption,
          );

          // === 3. Verificar rango de período ===
          const nextQuery = `
        SELECT fecha_inicio_periodo, fecha_fin_periodo
        FROM siguiente_lectura
        WHERE acometida_id = $1;
      `;
          const nextResult = await client.query(nextQuery, [acometidaId]);

          let estadoId = pendId;
          let novedadFinal = calculatedNovelty.title;
          let observationFinal = observation;

          const hoy = new Date(fechaLecturaInput);
          hoy.setHours(0, 0, 0, 0);

          if (nextResult.rowCount > 0) {
            const { fecha_inicio_periodo: inicio, fecha_fin_periodo: fin } =
              nextResult.rows[0];
            const inicioDate = new Date(inicio);
            const finDate = new Date(fin);

            const dentro = hoy >= inicioDate && hoy <= finDate;

            if (!dentro) {
              estadoId = fuerId;
              observationFinal = observation || 'LECTURA FUERA DE PERIODO';
            }
          } else {
            estadoId = fuerId;
            observationFinal = observation || 'LECTURA SIN PERIODO DEFINIDO';
          }

          // === 4. INSERT Lectura con estado y novedad correctos ===
          const insertQuery = `
        INSERT INTO lectura(
          acometida_id, fecha_lectura, hora_lectura, sector, cuenta, clave_catastral,
          valor_lectura, tasa_alcantarillado, lectura_anterior, lectura_actual,
          codigo_ingreso_renta, novedad, codigo_ingreso, tipo_novedad_lectura_id, lectura_estado_id, mes_lectura,observacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING
          lectura_id as "reading_id",
          acometida_id as "connection_id",
          fecha_lectura as "reading_date",
          hora_lectura as "reading_time",
          sector as "sector",
          cuenta as "account",
          clave_catastral as "cadastral_key",
          valor_lectura as "reading_value",
          tasa_alcantarillado as "sewer_rate",
          lectura_anterior as "previous_reading",
          lectura_actual as "current_reading",
          codigo_ingreso_renta as "rental_income_code",
          novedad as "novelty",
          codigo_ingreso as "income_code",
          (SELECT codigo FROM Lectura_estado WHERE lectura_estado_id = $15) as "status_code";
      `;

          let horaLectura: string | null;

          if (reading.readingTime && reading.readingTime.trim() !== '') {
            horaLectura = reading.readingTime.trim();
          } else {
            // Create a time string in HH:mm:ss format for Ecuador time
            const ecTime = toZonedTime(new Date(), 'America/Guayaquil');
            // Format manually or use a formatter if imported. Simple ISO split might be UTC.
            // toZonedTime returns a Date instance tailored for the zone, but .toISOString() converts back to UTC.
            // We need string representation in that zone.
            // Using Intl.DateTimeFormat for safety.
            horaLectura = new Intl.DateTimeFormat('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'America/Guayaquil',
              hour12: false,
            }).format(new Date());
          }

          console.log('novedadFinal', reading);

          const params: (string | Date | number | null)[] = [
            acometidaId,
            fechaLecturaInput,
            horaLectura,
            reading.sector,
            reading.account,
            reading.cadastralKey,
            reading.readingValue ?? 0,
            reading.sewerRate ?? 0,
            reading.previousReading ?? 0,
            reading.currentReading ?? 0,
            reading.rentalIncomeCode ?? null,
            novedadFinal,
            reading.incomeCode ?? null,
            reading.typeNoveltyReadingId ?? 1,
            estadoId,
            mesLectura,
            observationFinal,
          ];

          const insertResult = await client.query<ReadingSQLResult>(
            insertQuery,
            params,
          );

          if (insertResult.rowCount === 0) {
            throw new RpcException({
              statusCode: statusCode.INTERNAL_SERVER_ERROR,
              message: `Failed to create reading.`,
            });
          }

          return insertResult.rows[0];
        },
      );

      // === RESPUESTA ENRIQUECIDA ===
      return ReadingPostgreSQLAdapter.fromReadingSQLResultToReadingModel(
        result,
      );
    } catch (error) {
      throw error;
    }
  }

  async save(reading: ReadingModel): Promise<ReadingModel> {
    return this.createReading(reading) as Promise<ReadingModel>;
  }
}
