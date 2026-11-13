import { findSlotProblem } from './guide-availability.service.js';

describe('findSlotProblem', () => {
  it('accepts separate slots on the same day and on different days', () => {
    expect(
      findSlotProblem([
        { weekday: 6, timeFrom: '05:00', timeTo: '08:00' },
        { weekday: 6, timeFrom: '08:00', timeTo: '10:00' },
        { weekday: 0, timeFrom: '05:00', timeTo: '08:00' },
      ]),
    ).toBeNull();
  });

  it('rejects a slot that ends before it starts', () => {
    expect(
      findSlotProblem([{ weekday: 1, timeFrom: '09:00', timeTo: '07:00' }]),
    ).toBe('INVALID_TIME_RANGE');
  });

  it('rejects overlapping slots on the same day', () => {
    expect(
      findSlotProblem([
        { weekday: 3, timeFrom: '06:00', timeTo: '09:00' },
        { weekday: 3, timeFrom: '08:30', timeTo: '11:00' },
      ]),
    ).toBe('OVERLAPPING_SLOTS');
  });
});
