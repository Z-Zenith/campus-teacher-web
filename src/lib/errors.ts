import { toast } from 'sonner'
import { ApiError } from './api'

// MarksController.CreateInternal (backend) returns BadRequest({ error, message }) for a
// non-403 failure such as negative marks. #158 tracks teaching api.ts's request() to parse
// that JSON body into ApiError.message directly instead of the raw response text; until
// that lands, err.message here is the raw JSON blob, so unwrap it ourselves — this still
// works unchanged once #158 merges (JSON.parse on an already-plain message just fails and
// falls through to the plain-string branch below).
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback
  try {
    const parsed = JSON.parse(err.message)
    if (parsed && typeof parsed.message === 'string' && parsed.message) return parsed.message
  } catch {
    // Not JSON — err.message is already the plain message (e.g. once #158 lands).
  }
  return err.message || fallback
}

/** Shared error-to-toast surface, replacing each page's hand-rolled local message/error state. */
export function reportApiError(err: unknown, fallback: string) {
  toast.error(extractErrorMessage(err, fallback))
}
