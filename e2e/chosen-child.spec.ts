// The chosen-child flow: pick a partner, add a daily, complete it, see Bits and the crest gate move.
import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function freshPartner(request: APIRequestContext) {
  const current = await (await request.get('/api/state')).json()
  if (current.state) await request.post('/api/state', { data: { action: 'reset' } })
}

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', e => errors.push(e.message))
  page.on('requestfailed', r => errors.push(`${r.url()} ${r.failure()?.errorText}`))
  return errors
}

async function shoot(page: Page, name: string, project: string) {
  await page.screenshot({ path: `e2e/screenshots/${project}-${name}.png`, fullPage: true })
}

test('a chosen child adds a daily, completes it and earns Bits', async ({ page, request }, testInfo) => {
  await freshPartner(request)
  const errors = collectErrors(page)
  const res = await page.goto('/')
  expect(res?.status()).toBeLessThan(400)

  const choose = page.getByRole('heading', { name: 'Choose your partner' })
  if (await choose.isVisible().catch(() => false)) {
    await shoot(page, 'choose', testInfo.project.name)
    await page.locator('button.btn-accent', { hasText: 'This one!' }).click()
  }
  await expect(page.getByText('Koromon').first()).toBeVisible()
  await expect(page.getByText('Bits')).toBeVisible()
  await shoot(page, 'home', testInfo.project.name)

  await page.getByRole('button', { name: /✅/ }).click()
  await expect(page.getByRole('tab', { name: /Dailies/ })).toHaveAttribute('aria-selected', 'true')
  await page.getByLabel('New quest...').fill('Workout')
  await page.getByLabel('Crest').selectOption('courage')
  await page.getByLabel('Difficulty').selectOption('hard')
  await page.getByLabel('New quest...').press('Enter')
  const row = page.getByLabel('Workout', { exact: true })
  await expect(row).toBeVisible()
  await shoot(page, 'quests', testInfo.project.name)

  await row.click()
  await expect(row).toBeChecked()
  await expect(page.getByText('12 ₿')).toBeVisible()
  await expect(page.getByText(/🔥 1 streak/)).toBeVisible()
  await shoot(page, 'quest-done', testInfo.project.name)

  await page.getByRole('button', { name: /🔥/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Crests' }).or(page.getByText('Crests', { exact: true }))).toBeVisible()
  await expect(page.getByText('Courage ★')).toBeVisible()
  await shoot(page, 'crests', testInfo.project.name)

  const a11y = await new AxeBuilder({ page }).analyze()
  const serious = a11y.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))
  if (serious.length) console.log('a11y serious:', serious.map(v => `${v.id}: ${v.nodes.length}`).join(', '))
  expect(a11y.violations.filter(v => v.impact === 'critical')).toEqual([])
  expect(errors.filter(e => !/127\.0\.0\.1:9|ECONNREFUSED/.test(e))).toEqual([])
})
