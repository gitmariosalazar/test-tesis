import { PhotoReadingResponse } from "../schemas/dto/response/photo-reading.response";
import { PhotoReadingModel } from "../schemas/model/photo-reading.model";

export interface InterfacePhotoReadingRepository {
  createPhotoReading(photoReading: PhotoReadingModel): Promise<PhotoReadingResponse | null>;
  getPhotoReadingsByCadastralKey(cadastralKey: string): Promise<PhotoReadingResponse[]>;
  getPhotoReadingsByReadingId(readingId: number): Promise<PhotoReadingResponse[]>;
}