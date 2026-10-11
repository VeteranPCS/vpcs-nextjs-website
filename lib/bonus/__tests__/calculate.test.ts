import { describe, it, expect } from 'vitest';
import { calculateMovingBonus } from '../calculate';
describe('established closing bonus', () => {
  it.each([[0,200],[99999,200],[100000,400],[199999,400],[200000,700],[299999,700],[300000,1000],[399999,1000],[400000,1200],[499999,1200],[500000,1500],[649999,1500],[650000,2000],[799999,2000],[800000,3000],[999999,3000],[1000000,4000],[10000000,4000]])('prices %s return %s', (price, bonus) => expect(calculateMovingBonus(price!)).toBe(bonus));
  it.each([NaN,Infinity,-1])('rejects invalid price %s', price => expect(calculateMovingBonus(price)).toBe(0));
});
