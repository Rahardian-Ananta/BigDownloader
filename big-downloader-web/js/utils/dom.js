/**
 * BIG Downloader Web — DOM Utilities & Notifications
 */
import { escapeHTML } from './helpers.js';

export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

/**
 * Show a Neo-Brutalist Toast notification
 * @param {string} message 
 * @param {'success'|'error'|'info'|'warning'} type 
 * @param {number} durationMs 
 */
export function showToast(message, type = 'info', durationMs = 4000) {
  let container = $('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `nb-toast nb-toast-${type}`;

  const iconSvg = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }[type] || '';

  toast.innerHTML = `
    <div>${iconSvg}</div>
    <div style="flex: 1; font-weight: 700; font-size: 0.9rem;">${escapeHTML(message)}</div>
    <button class="toast-close-btn" style="background: none; border: none; cursor: pointer; font-weight: 800; font-size: 1.1rem; line-height: 1;">&times;</button>
  `;

  container.appendChild(toast);

  const close = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector('.toast-close-btn').addEventListener('click', close);
  setTimeout(close, durationMs);
}

/**
 * Open modal by ID
 * @param {string} modalId 
 */
export function openModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close modal by ID
 * @param {string} modalId 
 */
export function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}
