// Jest stub for image/asset files. Returns a stable string so `require()` of
// a .png/.jpg/etc. resolves to something renderable in jsdom tests.
module.exports = 'test-file-stub'
