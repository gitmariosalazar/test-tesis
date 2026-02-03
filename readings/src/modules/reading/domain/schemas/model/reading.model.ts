export class ReadingModel {
  constructor(
    public readonly id: number,
    public readonly connectionId: string,
    public readonly readingDate: Date,
    public readonly readingTime: string,
    public readonly sector: number,
    public readonly account: number,
    public readonly cadastralKey: string,
    public readonly readingValue: number,
    public readonly sewerRate: number,
    public readonly previousReading: number,
    public readonly currentReading: number,
    public readonly rentalIncomeCode: number | null,
    public readonly novelty: string | null,
    public readonly incomeCode: number | null,
    public readonly typeNoveltyReadingId: number,
    public readonly currentMonthReading: string,
  ) {}

  // Domain logic
  public calculateConsumption(): number {
    return this.currentReading - this.previousReading;
  }
}
