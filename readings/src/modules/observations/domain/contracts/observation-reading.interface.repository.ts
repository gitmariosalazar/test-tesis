import { ObservationDetailsResponse } from "../schemas/dto/response/observation-dedtails.response";
import { ObservationReadingResponse } from "../schemas/dto/response/observation-reading.response";
import { ObservationReadingModel } from "../schemas/model/observation-reading.model";

export interface InterfaceObservationReadingRepository {
  createObservationReading(observation: ObservationReadingModel): Promise<ObservationReadingResponse>;
  getObservationsByReadingId(readingId: number): Promise<ObservationReadingResponse[]>;
  getObservationDetailsByCadastralKey(cadastralKey: string): Promise<ObservationDetailsResponse[]>;
  getObservations(): Promise<ObservationDetailsResponse[]>;
}