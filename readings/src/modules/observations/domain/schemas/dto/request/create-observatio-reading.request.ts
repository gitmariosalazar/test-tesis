export class CreateObservationReadingRequest {
  readingId: number;
  observationTitle: string;
  observationDetails: string;

  constructor(
    readingId: number,
    observationTitle: string,
    observationDetails: string,
  ) {
    this.readingId = readingId;
    this.observationTitle = observationTitle;
    this.observationDetails = observationDetails;
  }

}