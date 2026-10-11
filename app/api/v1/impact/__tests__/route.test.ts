import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({metrics:vi.fn()}));
vi.mock('@/services/salesforceImpactService',()=>({getAllImpactMetrics:mocks.metrics}));
import { GET } from '../route';
beforeEach(()=>{mocks.metrics.mockReset();});
describe('impact availability',()=>{
 it('preserves verified figures and availability',async()=>{const data={cashBackAmount:'$12',charityAmount:'$1',totalVolumeSold:'$1 Million',available:true};mocks.metrics.mockResolvedValue(data);expect(await (await GET()).json()).toEqual({success:true,data});});
 it('marks legacy service fallback unavailable',async()=>{mocks.metrics.mockResolvedValue({cashBackAmount:'$384,287',charityAmount:'$36,000',totalVolumeSold:'$136 Million',available:false});expect((await (await GET()).json()).data.available).toBe(false);});
 it('never promotes an exception fallback to a verified metric',async()=>{mocks.metrics.mockRejectedValue(new Error('offline'));expect((await (await GET()).json()).data.available).toBe(false);});
});
