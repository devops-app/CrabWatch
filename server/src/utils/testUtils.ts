import type { NextFunction, Request, Response } from 'express'
import { errorHandler } from '../middleware/error'

/**
 * Invoke an Express handler wrapped by `asyncHandler` (a 3-arg middleware)
 * from a unit test.
 *
 * `asyncHandler` returns `(req, res, next) => void` and swallows the inner
 * promise, so tests cannot simply `await handler(req, res)`. This helper
 * supplies a mock `next` wired to the real `errorHandler`, calls the
 * middleware, then polls (via `setImmediate`) until the handler has
 * responded (`res.json` called) or delegated to `next`.
 *
 * Returns the mock `next` so tests can assert on error delegation if needed.
 */
export async function callHandler(
  handler: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response,
): Promise<jest.Mock> {
  const next = jest.fn()
  const wrappedNext = (err?: unknown) => {
    if (err) {
      errorHandler(err as Error, req, res, next)
    } else {
      next()
    }
  }
  handler(req, res, wrappedNext as NextFunction)

  const json = res.json as unknown as jest.Mock
  for (let i = 0; i < 1000; i++) {
    if ((json && json.mock.calls.length > 0) || next.mock.calls.length > 0) {
      break
    }
    await new Promise((resolve) => setImmediate(resolve))
  }

  return next
}
