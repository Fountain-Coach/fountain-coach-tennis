import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {strFromU8, unzipSync} from 'fflate';
import {DEFAULT_PLAYERS, generateSchedule} from '../../src/tennis-core.js';

async function createPlan(page) {
  await page.goto('/?app=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', {name:'Spielplan erzeugen'}).click();
  await expect(page.getByRole('status')).toContainText('Spielplan gültig');
}

test.skip('Desktop: kompletter Plan, Regeln, Filter, Auswertung und Excel-Export', async ({page}) => {
  await createPlan(page);
  await expect(page.locator('.day-card')).toHaveCount(30);
  await expect(page.locator('.match')).toHaveCount(150);
  await expect(page.locator('.match select')).toHaveCount(300);
  await expect(page.getByText('30', {exact:true}).first()).toBeVisible();

  const jan9 = page.locator('.day-card').filter({hasText:'09.01.2027'});
  await expect(jan9).toHaveCount(1);
  await expect(jan9.locator('select').filter({hasText:'Spieler 01'})).toHaveCount(0);
  const firstDay = page.locator('.day-card').first();
  await expect(firstDay.locator('time').nth(0)).toHaveText('12:00–13:00 Uhr');
  await expect(firstDay.locator('time').nth(4)).toHaveText('16:00–17:00 Uhr');

  await page.getByRole('button', {name:'Auswertung'}).click();
  await expect(page.getByRole('heading', {name:'Spiele je Spieler'})).toBeVisible();
  await expect(page.getByRole('heading', {name:'Alle Spielerpaare'})).toBeVisible();
  await page.getByRole('button', {name:'Spielplan', exact:true}).click();
  await page.locator('#date-filter').selectOption('2026-10-31');
  await expect(page.locator('.day-card')).toHaveCount(1);
  await page.locator('#date-filter').selectOption('');

  const firstSelect = page.locator('.match select').first();
  await firstSelect.selectOption('p2');
  await expect(page.getByRole('alert')).toContainText('doppelt eingesetzt');
  await page.getByRole('button', {name:'Spielplan erzeugen'}).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name:'Excel exportieren'}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('fountain-coach-tennisrunde.xlsx');
  const workbook = unzipSync(await readFile(await download.path()));
  const workbookXml = strFromU8(workbook['xl/workbook.xml']);
  expect(workbookXml).toContain('Spielplan');
  expect(workbookXml).toContain('Spiele je Spieler');
  expect(workbookXml).toContain('Spielerpaare');
  expect((strFromU8(workbook['xl/worksheets/sheet1.xml']).match(/<row /g) || []).length).toBe(151);
});

test.skip('Mobile: Tabs, Spieleränderung und Speicherung nach Reload', async ({page}) => {
  await createPlan(page);
  await expect(page.locator('.matches').first()).toBeVisible();
  await page.getByRole('button', {name:'Spieler'}).click();
  const name = page.locator('[data-player-name="p1"]');
  await name.fill('Spieler 01 Neu');
  await name.press('Tab');
  await expect(name).toHaveValue('Spieler 01 Neu');
  await page.reload();
  await page.getByRole('button', {name:'Spieler'}).click();
  await expect(page.locator('[data-player-name="p1"]')).toHaveValue('Spieler 01 Neu');
  const active = page.locator('[data-player-active="p12"]');
  await active.evaluate(element => element.click());
  await page.reload();
  await page.getByRole('button', {name:'Spieler'}).click();
  await expect(page.locator('[data-player-active="p12"]')).not.toBeChecked();
  await page.locator('[data-player-active="p12"]').evaluate(element => element.click());
  await page.locator('[data-player-unavailable="p5"]').fill('2027-03-06');
  await page.locator('[data-player-unavailable="p5"]').press('Tab');
  await page.reload();
  await page.getByRole('button', {name:'Spieler'}).click();
  await expect(page.locator('[data-player-unavailable="p5"]')).toHaveValue('2027-03-06');
  await page.locator('[data-player-unavailable="p5"]').fill('');
  await page.locator('[data-player-unavailable="p5"]').press('Tab');
  await page.locator('[data-fixed="p3|first"]').evaluate(element => element.click());
  await expect(page.getByRole('alert')).toContainText('Mehr als ein aktiver Spieler');
  await expect(page.locator('[data-fixed="p3|first"]')).not.toBeChecked();
  await page.locator('[data-player-unavailable="p5"]').fill('kein-datum');
  await page.locator('[data-player-unavailable="p5"]').press('Tab');
  await expect(page.getByRole('alert')).toContainText('Ungültige Datumswerte');
  await page.getByRole('button', {name:'Spielplan', exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Spielplan gültig');
});

test.skip('Accessibility: keine automatisierten axe-Verstöße auf den Kernansichten', async ({page}) => {
  await createPlan(page);
  for (const tab of ['Spielplan', 'Spieler', 'Auswertung']) {
    await page.getByRole('button', {name:tab, exact:true}).click();
    const result = await new AxeBuilder({page}).analyze();
    expect(result.violations, `${tab}: ${result.violations.map(v => v.id).join(', ')}`).toEqual([]);
  }
});

test('Produktansicht: Entwicklungssteuerung ist nicht sichtbar', async ({page}) => {
  await page.goto('/?app=1');
  await expect(page.locator('#auth-gate')).toBeVisible();
  await expect(page.locator('.dashboard-shell')).toBeHidden();
  await expect(page.getByRole('heading', {name: 'Bitte anmelden'})).toBeVisible();
  await expect(page.locator('#auth-gate-login')).toHaveAttribute('href', '/auth/login');
});

test('Landing: isometrische Pong-Stage lädt Three/Cannon und bietet Csound-Geste', async ({page}) => {
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('#pong-stage')).toBeVisible();
  await expect(page.locator('#pong-stage')).toHaveAttribute('aria-label', /Isometrische Pong-Tennisbühne/);
  await expect(page.locator('#pong-stage')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#pong-canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#pong-audio')).toHaveText('Sound aktivieren');
  await expect.poll(async () => page.locator('#pong-canvas').evaluate(canvas => ({width: canvas.width, height: canvas.height}))).toMatchObject({width: expect.any(Number), height: expect.any(Number)});
  const stage = page.locator('#pong-stage');
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(stage).toHaveClass(/is-dragging/);
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 10);
  await page.mouse.up();
  await expect(stage).not.toHaveClass(/is-dragging/);
  await expect.poll(() => consoleErrors.filter(error => !error.includes('favicon')).length).toBe(0);
});
