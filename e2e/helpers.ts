import { expect, type Page } from '@playwright/test';
export async function assertNoOverflow(page:Page) {
  const widths=await page.evaluate(() => ({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport+1);
}
export async function fixtureImpact(page:Page) {
  await page.route('**/api/v1/impact',route=>route.fulfill({json:{success:true,data:{available:true,cashBackAmount:'$676,500',charityAmount:'$66,270',totalVolumeSold:'$189 Million'}}}));
}
