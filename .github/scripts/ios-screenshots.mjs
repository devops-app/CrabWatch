/**
 * Automates the CrabWatch iOS app in a booted simulator:
 *   1. Launches the app
 *   2. Logs in (email/password from env)
 *   3. Captures a screenshot of each main tab
 *
 * Screenshots are saved to images/screenshots/store/ as:
 *   01-home.png, 02-new.png, 03-analytics.png, 04-profile.png
 *
 * Requires: Appium 2 + xcuitest driver running (started automatically below).
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// appium is CommonJS — named imports fail under ESM, so use default import + destructure
import appium from 'appium'
const { remote } = appium

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../../images/screenshots/store')
const SIM_NAME = process.env.SIM_NAME || 'iPhone 16'
const BUNDLE_ID = process.env.BUNDLE_ID || 'com.dsigncodehub.crabwatch'
const EMAIL = process.env.REVIEW_EMAIL
const PASSWORD = process.env.REVIEW_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('REVIEW_EMAIL / REVIEW_PASSWORD env vars are required')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Accept any system alert (e.g. camera permission) so it doesn't block screenshots. */
async function dismissAlerts(driver) {
  for (let i = 0; i < 3; i++) {
    const present = await driver.isAlertPresent()
    if (!present) break
    await driver.acceptAlert()
    await sleep(1000)
  }
}

// --- Start Appium server -------------------------------------------------
const appium = spawn('npx', ['appium', '--port', '4723'], {
  stdio: 'inherit',
  cwd: __dirname,
})
await new Promise((resolve) => setTimeout(resolve, 8000))

let driver
try {
  mkdirSync(OUT_DIR, { recursive: true })

  driver = await remote({
    automationName: 'XCUITest',
    platformName: 'iOS',
    deviceName: SIM_NAME,
    bundleId: BUNDLE_ID,
    newCommandTimeout: 300,
    noReset: true,
    fullReset: false,
  })

  // --- Launch app ---------------------------------------------------------
  console.log('Launching app...')
  await driver.execute('mobile: launchApp')
  await sleep(5000)
  await dismissAlerts(driver)

  // --- Login ---------------------------------------------------------------
  console.log('Logging in...')
  const emailInput = await driver.$(`XCUIElementTypeTextField[label:"Email"]`)
  await emailInput.click()
  await sleep(500)
  await emailInput.sendKeys(EMAIL)

  const passInput = await driver.$(`XCUIElementTypeSecureTextField[label:"Password"]`)
  await passInput.click()
  await sleep(500)
  await passInput.sendKeys(PASSWORD)

  const signIn = await driver.$(`XCUIElementTypeButton[label:"Sign In"]`)
  await signIn.click()

  // Wait for the Home screen greeting (login success)
  console.log('Waiting for Home screen...')
  const home = await driver.waitForElement(`-ios predicate string:label BEGINSWITH "Welcome"`, 60000)
  if (!home) throw new Error('Login failed — Home screen did not appear')
  await sleep(3000)

  // Dismiss keyboard so it doesn't appear in screenshots
  await driver.pressKeyCode(4) // HOME
  await sleep(1000)

  // --- Capture each tab ------------------------------------------------------
  // Labels must match tabBarAccessibilityLabel in MainTabs.tsx (i18n en values)
  const tabs = [
    { name: 'Home', file: '01-home.png' },
    { name: 'New Observation', file: '02-new.png' },
    { name: 'Analytics', file: '03-analytics.png' },
    { name: 'Profile', file: '04-profile.png' },
  ]

  for (const tab of tabs) {
    const el = await driver.$(`XCUIElementTypeButton[label:"${tab.name}"]`)
    await el.click()
    await sleep(4000) // allow data to load
    await dismissAlerts(driver)
    const out = path.join(OUT_DIR, tab.file)
    await driver.saveScreenshot(out)
    console.log(`Saved ${out}`)
  }

  console.log('All screenshots captured.')
} finally {
  if (driver) await driver.quit().catch(() => {})
  appium.kill()
}
