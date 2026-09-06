import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom lacks ResizeObserver and elementFromPoint, both of which `input-otp` uses.
class ResizeObserverStub {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
document.elementFromPoint = () => null

afterEach(() => {
  cleanup()
  localStorage.clear()
})
