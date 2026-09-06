const documents = new WeakMap();

function stateFor(doc) {
  if (!documents.has(doc)) documents.set(doc, { stack: [], overflow: "" });
  return documents.get(doc);
}

/** Shared scroll ownership with per-popup focus restoration. */
export class ModalController {
  constructor(owner) { this.owner = owner; this.previousFocus = null; }
  acquire() {
    const doc = this.owner.mount.ownerDocument;
    const state = stateFor(doc);
    if (state.stack.includes(this)) return;
    this.previousFocus = doc.activeElement;
    if (!state.stack.length) state.overflow = doc.body.style.overflow;
    state.stack.push(this);
    doc.body.style.overflow = "hidden";
  }
  release() {
    const doc = this.owner.mount.ownerDocument;
    const state = stateFor(doc);
    const index = state.stack.indexOf(this);
    if (index < 0) return;
    const wasTop = index === state.stack.length - 1;
    state.stack.splice(index, 1);
    if (!state.stack.length) doc.body.style.overflow = state.overflow;
    if (wasTop) {
      const top = state.stack.at(-1);
      if (top) top.owner.dom.popupClose.focus();
      else if (this.previousFocus?.isConnected) this.previousFocus.focus();
    }
  }
  handleKey(event) {
    const { owner } = this;
    const doc = owner.mount.ownerDocument;
    if (!owner.popupOpen || stateFor(doc).stack.at(-1) !== this) return;
    if (event.key === "Escape") { event.preventDefault(); owner.close(); return; }
    if (event.key !== "Tab") return;
    const nodes = [...owner.dom.popupBackdrop.querySelectorAll('button, a[href], input, select, [tabindex]')]
      .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length
        && !node.closest('[hidden], [aria-hidden="true"]'));
    if (!nodes.length) return;
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && (doc.activeElement === first || !nodes.includes(doc.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || !nodes.includes(doc.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }
}
