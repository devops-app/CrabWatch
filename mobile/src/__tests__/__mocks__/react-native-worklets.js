/**
 * Jest mock for react-native-worklets.
 *
 * The real package ships ESM which ts-jest (CommonJS) cannot parse. In tests
 * the frame-output worklet never runs (no frames are delivered), so we only
 * need `runOnJS` to be an identity wrapper: `runOnJS(fn)` returns `fn` so any
 * accidental call still behaves like a plain function invocation.
 */
module.exports = {
  runOnJS: (fn) => fn,
  worklet: (fn) => fn,
}
