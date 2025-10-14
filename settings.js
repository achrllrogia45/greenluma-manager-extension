// settings.js - provide reset logic for extension
(function () {
    'use strict';

    // Clear both chrome.storage.local and window.localStorage used by the extension
    async function clearExtensionStorage() {
        // Clear chrome.storage.local if available
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.clear(() => {
                        const err = chrome.runtime.lastError;
                        if (err) return reject(err);
                        resolve();
                    });
                });
            } catch (e) {
                console.warn('chrome.storage.local.clear failed', e);
                // continue to localStorage clear as fallback
            }
        }

        // Also clear window.localStorage (only affects popup page's origin)
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.clear();
            }
        } catch (e) {
            console.warn('localStorage.clear failed', e);
        }
    }

    // Show temporary status message next to control
    function showStatus(msg, timeout = 2500) {
        const el = document.getElementById('settingsStatus');
        if (!el) return;
        el.textContent = msg;
        setTimeout(() => {
            // only clear if it hasn't been overwritten
            if (el.textContent === msg) el.textContent = '';
        }, timeout);
    }

    // Wire up UI interactions
    function initUI() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPopup = document.getElementById('settingsPopup');
        const closeBtn = document.getElementById('settingsCloseBtn');
        const checks = document.querySelectorAll('.settings-check');
        const confirmBubble = document.getElementById('settingsConfirm');
        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');
        const confirmText = document.getElementById('confirmText');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (settingsPopup) {
                    settingsPopup.setAttribute('aria-hidden', 'false');
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (settingsPopup) settingsPopup.setAttribute('aria-hidden', 'true');
                if (confirmBubble) {
                    confirmBubble.setAttribute('aria-hidden', 'true');
                }
            });
        }

        // Clicking outside popup closes it
        document.addEventListener('click', (ev) => {
            const popup = document.getElementById('settingsPopup');
            if (!popup) return;
            if (popup.getAttribute('aria-hidden') === 'true') return;
            if (!popup.contains(ev.target) && ev.target.id !== 'settingsBtn') {
                popup.setAttribute('aria-hidden', 'true');
                if (confirmBubble) confirmBubble.setAttribute('aria-hidden', 'true');
            }
        });

        // When a checkbox is used as a "confirm" control (e.g. Reset), show confirmation bubble
        checks.forEach(chk => {
            chk.addEventListener('change', (ev) => {
                const c = ev.currentTarget;
                const key = c.dataset.key;
                if (!key) return;

                // Only treat the 'reset' key as requiring confirmation (others are just UI)
                if (key === 'reset' && c.checked) {
                    // position the confirm bubble near the checkbox
                    if (confirmBubble) {
                        confirmText.textContent = 'Reset all extension data?';
                        confirmBubble.setAttribute('aria-hidden', 'false');
                    }
                }
                // For non-confirm keys, just toggle and then immediately uncheck (visual-only)
                else if (c.checked) {
                    // brief visual tick then uncheck
                    setTimeout(() => { c.checked = false; }, 350);
                }
            });
        });

        // Confirm Yes -> perform reset
        if (confirmYes) {
            confirmYes.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                if (confirmBubble) confirmBubble.setAttribute('aria-hidden', 'true');
                showStatus('Resetting...');
                try {
                    await clearExtensionStorage();
                    showStatus('Reset complete');
                } catch (err) {
                    console.error('Reset failed', err);
                    showStatus('Reset failed');
                }
                // Uncheck the reset checkbox after action
                const resetChk = document.querySelector('.settings-check[data-key="reset"]');
                if (resetChk) resetChk.checked = false;
            });
        }

        // Confirm No -> hide and uncheck
        if (confirmNo) {
            confirmNo.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (confirmBubble) confirmBubble.setAttribute('aria-hidden', 'true');
                const resetChk = document.querySelector('.settings-check[data-key="reset"]');
                if (resetChk) resetChk.checked = false;
            });
        }

        // close with Escape key when popup open
        document.addEventListener('keydown', (ev) => {
            const popup = document.getElementById('settingsPopup');
            if (!popup) return;
            if (popup.getAttribute('aria-hidden') === 'false' && ev.key === 'Escape') {
                popup.setAttribute('aria-hidden', 'true');
                if (confirmBubble) confirmBubble.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // Auto init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }

    // Expose function for testing if needed
    window._settings = {
        clearExtensionStorage
    };
})();
