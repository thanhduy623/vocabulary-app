// Global UI state: toasts, modal confirmations, and the app-busy flag.
// Framework: Pinia (docs/state-management.md §2.4).

import { defineStore } from 'pinia'
import { uuid } from '@/lib/uuid'

/** @type {number} */
let toastSeq = 0

export const useUiStore = defineStore('ui', {
  state: () => ({
    /** @type {{id: string, kind: string, text: string}[]} */
    toasts: [],
    /** @type {number} number of open modals (used to lock scroll etc.) */
    activeModals: 0,
    /** @type {boolean} global busy flag (mutation in-flight) */
    appBusy: false,
    /** @type {null | {title: string, message: string, confirmText: string, cancelText: string, danger: boolean, resolve: Function}} */
    confirmState: null,
  }),

  actions: {
    /**
     * Push a toast notification. Auto-hides after `duration` ms
     * (default 3000). Pass duration ≤ 0 for sticky toasts.
     * @param {string} kind  one of 'primary'|'success'|'danger'|'warning'|'info'|'secondary'
     * @param {string} text
     * @param {{duration?: number}} [options]
     * @returns {string} toast id
     */
    pushToast(kind, text, { duration = 3000 } = {}) {
      const id = `${Date.now()}-${toastSeq++}`
      this.toasts.push({ id, kind, text })

      if (duration > 0) {
        setTimeout(() => this.dismissToast(id), duration)
      }
      return id
    },

    /**
     * Dismiss a toast by id.
     * @param {string} id
     */
    dismissToast(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },

    /** Register one more open modal (scroll-lock accounting). */
    modalOpen() {
      this.activeModals += 1
    },

    /** Deregister an open modal. */
    modalClose() {
      if (this.activeModals > 0) this.activeModals -= 1
    },

    /**
     * Open a confirm dialog; resolves true/false.
     * Consumed by <ConfirmModalHost/>.
     * @param {Object} options
     * @returns {Promise<boolean>}
     */
    confirm(options = {}) {
      return new Promise((resolve) => {
        this.confirmState = {
          title: options.title || 'Confirm',
          message: options.message || '',
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          danger: Boolean(options.danger),
          resolve,
        }
      })
    },

    /**
     * Internal: resolve the active confirmation.
     * @param {boolean|any} value
     */
    confirmResolve(value) {
      const state = this.confirmState
      this.confirmState = null
      if (state?.resolve) state.resolve(value)
    },

    /** Set the global busy flag (mutation in progress). */
    setAppBusy(value) {
      this.appBusy = Boolean(value)
    },
  },
})