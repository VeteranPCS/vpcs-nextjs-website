import { calculateBonus, calculatePayout } from '../bonus-calculator';

describe('calculateBonus', () => {
  // Boundary tests for each tier (uses salePrice < max)
  test('< $100K → $200 bonus, $20 charity', () => {
    expect(calculateBonus(0)).toEqual({ bonus: 200, charity: 20 });
    expect(calculateBonus(50000)).toEqual({ bonus: 200, charity: 20 });
    expect(calculateBonus(99999)).toEqual({ bonus: 200, charity: 20 });
  });

  test('$100K boundary → tier 2 ($400)', () => {
    expect(calculateBonus(100000)).toEqual({ bonus: 400, charity: 40 });
  });

  test('$100K-$199K → $400 bonus', () => {
    expect(calculateBonus(150000)).toEqual({ bonus: 400, charity: 40 });
    expect(calculateBonus(199999)).toEqual({ bonus: 400, charity: 40 });
  });

  test('$200K-$299K → $700 bonus', () => {
    expect(calculateBonus(200000)).toEqual({ bonus: 700, charity: 70 });
    expect(calculateBonus(250000)).toEqual({ bonus: 700, charity: 70 });
  });

  test('$300K-$399K → $1,000 bonus', () => {
    expect(calculateBonus(300000)).toEqual({ bonus: 1000, charity: 100 });
  });

  test('$400K-$499K → $1,200 bonus', () => {
    expect(calculateBonus(400000)).toEqual({ bonus: 1200, charity: 120 });
  });

  test('$500K-$649K → $1,500 bonus', () => {
    expect(calculateBonus(500000)).toEqual({ bonus: 1500, charity: 150 });
    expect(calculateBonus(649999)).toEqual({ bonus: 1500, charity: 150 });
  });

  test('$650K-$799K → $2,000 bonus', () => {
    expect(calculateBonus(650000)).toEqual({ bonus: 2000, charity: 200 });
  });

  test('$800K-$999K → $3,000 bonus', () => {
    expect(calculateBonus(800000)).toEqual({ bonus: 3000, charity: 300 });
    expect(calculateBonus(999999)).toEqual({ bonus: 3000, charity: 300 });
  });

  test('$1M+ → $4,000 bonus', () => {
    expect(calculateBonus(1000000)).toEqual({ bonus: 4000, charity: 400 });
    expect(calculateBonus(5000000)).toEqual({ bonus: 4000, charity: 400 });
  });
});

describe('calculatePayout', () => {
  test('calculates commission split correctly', () => {
    expect(calculatePayout(10000, 50)).toBe(5000);
    expect(calculatePayout(10000, 100)).toBe(10000);
    expect(calculatePayout(10000, 0)).toBe(0);
    expect(calculatePayout(15000, 70)).toBe(10500);
  });
});
