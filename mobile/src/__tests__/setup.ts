/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Global fetch mock
global.fetch = jest.fn()

// TextEncoder/TextDecoder polyfills for Firebase auth
const { TextEncoder: TEN, TextDecoder: TDE } = require('util')
;(globalThis as any).TextEncoder = TEN
;(globalThis as any).TextDecoder = TDE

// ReadableStream polyfill for Firebase auth in Jest
const { ReadableStream: RS } = require('stream/web')
;(globalThis as any).ReadableStream = RS

// Initialize i18next so useTranslation() renders real strings in tests.
// This mirrors the app's src/lib/i18n.ts initialization.
require('../lib/i18n')
