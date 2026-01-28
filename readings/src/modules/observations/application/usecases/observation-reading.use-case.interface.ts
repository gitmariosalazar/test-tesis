import { CreateObservationReadingRequest } from "../../domain/schemas/dto/request/create-observatio-reading.request";
import { ObservationDetailsResponse } from "../../domain/schemas/dto/response/observation-dedtails.response";
import { ObservationReadingResponse } from "../../domain/schemas/dto/response/observation-reading.response";

export interface InterfaceObservationReadingUseCase {
  createObservationReading(observation: CreateObservationReadingRequest): Promise<ObservationReadingResponse>;
  getObservationsByReadingId(readingId: number): Promise<ObservationReadingResponse[]>;
  getObservationDetailsByCadastralKey(cadastralKey: string): Promise<ObservationDetailsResponse[]>;
  getObservations(): Promise<ObservationDetailsResponse[]>;
}