import { TextEncoder, TextDecoder } from 'node:util'

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder
} else {
  // harden in case a polyfill polluted it
  globalThis.TextEncoder = TextEncoder
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder
} else {
  globalThis.TextDecoder = TextDecoder
}
