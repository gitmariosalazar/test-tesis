export class ReadingCreatedEvent {
  constructor(
    public readonly readingId: number,
    public readonly cadastralKey: string,
    public readonly readingValue: number,
    public readonly readingDate: Date,
  ) {}
}
