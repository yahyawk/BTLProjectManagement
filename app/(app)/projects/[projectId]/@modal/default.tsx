/**
 * Rendered in the `modal` slot whenever the current URL is not an intercepted
 * task route — i.e. almost always. Without this, a hard navigation to any
 * project route would 404 the slot.
 */
export default function ModalDefault() {
  return null
}
