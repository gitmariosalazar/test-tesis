import { Injectable } from '@nestjs/common';
import {
  ObservationReadingSQLResponse,
  ObservationReadingSQLResult,
  ObservationSQLResult,
} from '../../../interfaces/sql/observatio-reading.sql.response';
import { ObservationReadingSQLAdapter } from '../adapters/observation-reading.postgresql.adapter';
import { InterfaceObservationReadingRepository } from '../../../../domain/contracts/observation-reading.interface.repository';
import { DatabaseServicePostgreSQL } from '../../../../../../shared/connections/database/postgresql/postgresql.service';
import { ObservationDetailsResponse } from '../../../../domain/schemas/dto/response/observation-dedtails.response';
import { ObservationReadingModel } from '../../../../domain/schemas/model/observation-reading.model';
import { ObservationReadingResponse } from '../../../../domain/schemas/dto/response/observation-reading.response';

@Injectable()
export class ObservationReadingPostgreSQLPersistence implements InterfaceObservationReadingRepository {
  constructor(private readonly postgresqlService: DatabaseServicePostgreSQL) {}

  async getObservations(): Promise<ObservationDetailsResponse[]> {
    try {
      const query: string = `
        SELECT
            o.titulo_observacion as "observation_title",
            o.detalle_observacion as "observation_detail",
            ol.fecha_registro as "registration_date",
            ol.lectura_id as "reading_id",
            l.acometida_id as "connection_id",
            l.lectura_anterior as "previous_reading",
            l.lectura_actual as "current_reading",
            l.sector as "sector",
            l.cuenta as "account",
            l.valor_lectura as "reading_value",
            tnl.tipo_novedad_lectura_id as "novelty_reading_type_id",
            tnl.nombre as "novelty_type_name",
            tnl.descripcion as "novelty_type_description",
            a.direccion as "address",
            a.observaciones as "observations",
            c.cliente_id as "client_id",
            COALESCE(c2.nombres || ' ' || c2.apellidos, e.razon_social, e.nombre_comercial) AS "client_name"
        FROM acometida a
        INNER JOIN lectura l ON a.acometida_id = l.acometida_id
        INNER JOIN observacion_lectura ol ON l.lectura_id = ol.lectura_id
        INNER JOIN observacion o ON ol.observacion_id = o.observacion_id
        INNER JOIN tipo_novedad_lectura tnl ON l.tipo_novedad_lectura_id = tnl.tipo_novedad_lectura_id
        INNER JOIN cliente c ON a.cliente_id = c.cliente_id
        LEFT JOIN ciudadano c2 ON c2.ciudadano_id = c.cliente_id
        LEFT JOIN empresa e ON e.cliente_id = c.cliente_id
        ORDER BY l.fecha_lectura DESC;
      `;
      const result =
        await this.postgresqlService.query<ObservationDetailsResponse>(query);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getObservationDetailsByCadastralKey(
    cadastralKey: string,
  ): Promise<ObservationDetailsResponse[]> {
    try {
      const query: string = `
        SELECT
            o.titulo_observacion as "observation_title",
            o.detalle_observacion as "observation_detail",
            ol.fecha_registro as "registration_date",
            ol.lectura_id as "reading_id",
            l.acometida_id as "connection_id",
            l.lectura_anterior as "previous_reading",
            l.lectura_actual as "current_reading",
            l.sector as "sector",
            l.cuenta as "account",
            l.valor_lectura as "reading_value",
            tnl.tipo_novedad_lectura_id as "novelty_reading_type_id",
            tnl.nombre as "novelty_type_name",
            tnl.descripcion as "novelty_type_description",
            a.direccion as "address",
            a.observaciones as "observations",
            c.cliente_id as "client_id",
            COALESCE(c2.nombres || ' ' || c2.apellidos, e.razon_social, e.nombre_comercial) AS "client_name"
        FROM acometida a
        INNER JOIN lectura l ON a.acometida_id = l.acometida_id
        INNER JOIN observacion_lectura ol ON l.lectura_id = ol.lectura_id
        INNER JOIN observacion o ON ol.observacion_id = o.observacion_id
        INNER JOIN tipo_novedad_lectura tnl ON l.tipo_novedad_lectura_id = tnl.tipo_novedad_lectura_id
        INNER JOIN cliente c ON a.cliente_id = c.cliente_id
        LEFT JOIN ciudadano c2 ON c2.ciudadano_id = c.cliente_id
        LEFT JOIN empresa e ON e.cliente_id = c.cliente_id
        WHERE a.clave_catastral = $1
        ORDER BY l.fecha_lectura DESC;
      `;
      const params: string[] = [cadastralKey];

      const result =
        await this.postgresqlService.query<ObservationDetailsResponse>(
          query,
          params,
        );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async createObservationReading(
    observation: ObservationReadingModel,
  ): Promise<ObservationReadingResponse> {
    try {
      const insertObservationQuery: string = `
        INSERT INTO observacion (titulo_observacion, detalle_observacion) VALUES ($1,$2) returning observacion_id as
        "observation_id", titulo_observacion as "observation_title", detalle_observacion as "observation_details";
      `;
      const insertObservationParams = [
        observation.getObservation().getObservationTitle(),
        observation.getObservation().getObservationDetails(),
      ];

      const result = await this.postgresqlService.query<ObservationSQLResult>(
        insertObservationQuery,
        insertObservationParams,
      );
      console.log(`result`, result);
      const observationId: number = result[0].observation_id;

      const insertObservationReadingQuery: string = `insert into observacion_lectura (observacion_id, lectura_id) values ($1, $2) returning observacion_lectura_id as "observation_reading_id", observacion_id as "observation_id", lectura_id as "reading_id";`;
      const insertObservationReadingParams = [
        observationId,
        observation.getReadingId(),
      ];

      const resultObservationReading =
        await this.postgresqlService.query<ObservationReadingSQLResult>(
          insertObservationReadingQuery,
          insertObservationReadingParams,
        );

      const observationReadingId: number =
        resultObservationReading[0].observation_reading_id;

      const selectObservationReadingQuery: string = `
        SELECT 
          ol.observacion_lectura_id AS "observation_reading_id",
          ol.lectura_id AS "reading_id",
          o.observacion_id AS "observation_id",
          o.titulo_observacion AS "observation_title",
          o.detalle_observacion AS "observation_details"
        FROM observacion_lectura ol
        INNER JOIN observacion o ON ol.observacion_id = o.observacion_id
        WHERE ol.observacion_lectura_id = $1;
      `;
      const selectObservationReadingParams = [observationReadingId];

      const resultSelect =
        await this.postgresqlService.query<ObservationReadingSQLResponse>(
          selectObservationReadingQuery,
          selectObservationReadingParams,
        );

      return ObservationReadingSQLAdapter.toObservationReadingResponse(
        resultSelect[0],
      );
    } catch (error) {
      throw error;
    }
  }

  async getObservationsByReadingId(
    readingId: number,
  ): Promise<ObservationReadingResponse[]> {
    try {
      const query: string = `
        SELECT 
          ol.observacion_lectura_id AS "observation_reading_id",
          ol.lectura_id AS "reading_id",
          o.observacion_id AS "observation_id",
          o.titulo_observacion AS "observation_title",
          o.detalle_observacion AS "observation_details"
        FROM observacion_lectura ol
        INNER JOIN observacion o ON ol.observacion_id = o.observacion_id
        WHERE ol.lectura_id = $1;
      `;
      const params = [readingId];

      const result =
        await this.postgresqlService.query<ObservationReadingSQLResponse>(
          query,
          params,
        );
      return result.map(
        ObservationReadingSQLAdapter.toObservationReadingResponse,
      );
    } catch (error) {
      throw error;
    }
  }
}
