import { base64DecodePureJs, base64ToUint8Array } from '../base64'

describe('base64 utils', () => {
  describe('base64DecodePureJs', () => {
    it('decodes a simple string', () => {
      // "Hello" -> SGVsbG8=
      const bytes = base64DecodePureJs('SGVsbG8=')
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
    })

    it('decodes without padding', () => {
      // "Hello" without padding
      const bytes = base64DecodePureJs('SGVsbG8')
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
    })

    it('decodes all 256 byte values', () => {
      const original = new Uint8Array(256)
      for (let i = 0; i < 256; i++) original[i] = i
      // Encode via Buffer (available in Jest/Node)
      const b64 = Buffer.from(original).toString('base64')
      const decoded = base64DecodePureJs(b64)
      expect(Array.from(decoded)).toEqual(Array.from(original))
    })

    it('handles 1-byte and 2-byte remainders', () => {
      // 1 byte: "A" -> QQ==
      expect(Array.from(base64DecodePureJs('QQ=='))).toEqual([65])
      // 2 bytes: "AB" -> QUI=
      expect(Array.from(base64DecodePureJs('QUI='))).toEqual([65, 66])
    })

    it('ignores whitespace', () => {
      const bytes = base64DecodePureJs('SGVs\nbG8=\r\n')
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
    })

    it('returns empty array for empty input', () => {
      expect(base64DecodePureJs('').length).toBe(0)
    })

    it('decodes a JPEG magic header', () => {
      // FF D8 FF E0 -> /9j/4A==
      const bytes = base64DecodePureJs('/9j/4A==')
      expect(Array.from(bytes)).toEqual([0xff, 0xd8, 0xff, 0xe0])
    })
  })

  describe('base64ToUint8Array', () => {
    it('decodes correctly (atob or fallback)', () => {
      const bytes = base64ToUint8Array('SGVsbG8=')
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
    })

    it('matches Buffer output for binary data', () => {
      const original = new Uint8Array(1024)
      for (let i = 0; i < original.length; i++) original[i] = (i * 7) % 256
      const b64 = Buffer.from(original).toString('base64')
      const decoded = base64ToUint8Array(b64)
      expect(Array.from(decoded)).toEqual(Array.from(original))
    })
  })
})
