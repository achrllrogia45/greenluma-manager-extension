// popup.js
// Convert AppID cells in #getAppList and #gamesList into clickable Steam Store links
(function () {
	'use strict';

	const STORE_URL = 'https://store.steampowered.com/app/';

	// Helper: create anchor element for a given appId and text
	function makeSteamLink(appId, text) {
		const a = document.createElement('a');
		a.href = STORE_URL + encodeURIComponent(appId) + '/';
		a.textContent = text || appId;
		// a.title = `Open ${appId} on Steam Store`;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.classList.add('steam-store-link');
		a.style.color = 'var(--bs-info, #0dcaf0)';
		a.style.textDecoration = 'underline';
		a.style.cursor = 'pointer';
		return a;
	}

	// Replace plain AppID text nodes inside a cell with a link.
	// cellEl: the element that contains the ID (for example .col-id in a row)
	function convertCellToLink(cellEl) {
		if (!cellEl || cellEl.dataset.steamLinked === '1') return;

		// Avoid converting header rows or empty cells
		const text = (cellEl.textContent || '').trim();
		if (!text) return;

		// If it already contains an anchor with steam-store-link, skip
		if (cellEl.querySelector && cellEl.querySelector('a.steam-store-link')) {
			cellEl.dataset.steamLinked = '1';
			return;
		}

		// Extract first numeric chunk from the cell text
		const m = text.match(/(\d{1,12})/);
		if (!m) return; // no numeric AppID found

		const appId = m[1];

		// Clear cell and insert link (preserve any leading/trailing content by surrounding spans)
		const before = text.slice(0, m.index).trim();
		const after = text.slice(m.index + appId.length).trim();

		cellEl.innerHTML = '';
		if (before) {
			const s = document.createElement('span');
			s.textContent = before + ' ';
			cellEl.appendChild(s);
		}

		const link = makeSteamLink(appId, appId);

		// Prefer extension tab open when clicked (works in extension context)
		link.addEventListener('click', function (ev) {
			ev.preventDefault();
			const url = this.href;

			// Try chrome.tabs (or browser.tabs) if available
			const tabsApi = (window.chrome && chrome.tabs) || (window.browser && browser.tabs);
			if (tabsApi && typeof tabsApi.create === 'function') {
				try {
					tabsApi.create({ url });
					return;
				} catch (e) {
					// fallback to window.open below
				}
			}

			// As a fallback from popup, attempt to open a new window/tab
			window.open(url, '_blank', 'noopener');
		});

		cellEl.appendChild(link);

		if (after) {
			const s2 = document.createElement('span');
			s2.textContent = ' ' + after;
			cellEl.appendChild(s2);
		}

		cellEl.dataset.steamLinked = '1';
	}

	// Process all existing ID cells inside the two containers
	function processExisting() {
		const selectors = ['#getAppList .col-id', '#gamesList .col-id'];
		selectors.forEach(sel => {
			document.querySelectorAll(sel).forEach(convertCellToLink);
		});
	}

	// Observe added nodes inside containers and convert new ID cells
	function observeContainer(container) {
		if (!container) return;
		const mo = new MutationObserver(muts => {
			muts.forEach(m => {
				// Look for added elements containing .col-id
				m.addedNodes.forEach(node => {
					if (!(node instanceof Element)) return;
					// If the added node itself is a row with .col-id children
					node.querySelectorAll && node.querySelectorAll('.col-id').forEach(convertCellToLink);
					// Or if the node itself is a .col-id element
					if (node.classList && node.classList.contains('col-id')) convertCellToLink(node);
				});
			});
		});
		mo.observe(container, { childList: true, subtree: true });
	}

	// Initialize
	document.addEventListener('DOMContentLoaded', () => {
		processExisting();
		observeContainer(document.getElementById('getAppList'));
		observeContainer(document.getElementById('gamesList'));
	});

	// Also run once in case script executes after DOM is ready already
	if (document.readyState === 'complete' || document.readyState === 'interactive') {
		processExisting();
		observeContainer(document.getElementById('getAppList'));
		observeContainer(document.getElementById('gamesList'));
	}

})();

	// --- Steam preview popup behavior ---
	(function () {
		'use strict';

		// Create popup element and append to body so it's easy to style in index.html
		let popupEl = document.getElementById('steamPreviewPopup');
		if (!popupEl) {
			popupEl = document.createElement('div');
			popupEl.id = 'steamPreviewPopup';
			popupEl.innerHTML = `
				<div class="preview-inner">
					<img class="preview-thumb" src="" alt="thumb">
					<div class="preview-meta">
						<div class="preview-title">Loading...</div>
						<div class="preview-sub"></div>
						<div class="preview-desc"></div>
					</div>
				</div>
				<div class="preview-footer"></div>
			`;
			document.body.appendChild(popupEl);
		}

		const thumbEl = popupEl.querySelector('.preview-thumb');
		const titleEl = popupEl.querySelector('.preview-title');
		const subEl = popupEl.querySelector('.preview-sub');
		const descEl = popupEl.querySelector('.preview-desc');
		const footerEl = popupEl.querySelector('.preview-footer');

		// Cache for app details to avoid repeated requests
		const appCache = new Map();

		// Delay timers
		let showTimer = null;
		let hideTimer = null;

		// Last mouse coords (used to position popup near cursor)
		let lastMouse = { x: null, y: null };

		function positionPopup(anchorEl, coords) {
			const popupRect = popupEl.getBoundingClientRect();
			const gap = 12;
			let left, top;

			// If coordinates are provided (mouse position), prefer positioning near cursor
			if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
				// show to the right and slightly above the cursor
				left = coords.x + gap;
				top = coords.y - popupRect.height / 2;

				// clamp to viewport
				if (left + popupRect.width > window.innerWidth - 10) {
					left = coords.x - popupRect.width - gap;
				}
				if (top < 10) top = 10;
				if (top + popupRect.height > window.innerHeight - 10) top = Math.max(10, window.innerHeight - popupRect.height - 10);
			} else if (anchorEl && anchorEl.getBoundingClientRect) {
				// Fallback to anchor bounding rect
				const rect = anchorEl.getBoundingClientRect();
				left = rect.right + gap;
				top = rect.top;
				if (left + popupRect.width > window.innerWidth - 10) {
					left = rect.left - popupRect.width - gap;
				}
				if (top + popupRect.height > window.innerHeight - 10) {
					top = Math.max(10, window.innerHeight - popupRect.height - 10);
				}
				left = Math.max(10, left);
			} else {
				// ultimate fallback: center
				left = Math.max(10, (window.innerWidth - popupRect.width) / 2);
				top = Math.max(10, (window.innerHeight - popupRect.height) / 2);
			}

			popupEl.style.left = Math.round(left) + 'px';
			popupEl.style.top = Math.round(top) + 'px';
		}

		// Fetch app details using Steam store appdetails endpoint
		function fetchAppDetails(appId) {
			if (appCache.has(appId)) return Promise.resolve(appCache.get(appId));
			const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&l=en`;
			return fetch(url, { credentials: 'omit' })
				.then(r => r.json())
				.then(data => {
					if (!data || !data[appId] || !data[appId].success) throw new Error('no data');
					const details = data[appId].data;
					appCache.set(appId, details);
					return details;
				});
		}

		function showPreviewForAnchor(aEl) {
			const href = aEl.href || '';
			const m = href.match(/app\/(\d+)/);
			if (!m) return;
			const appId = m[1];

			// Show loading state immediately but with short delay
			titleEl.textContent = 'Loading...';
			subEl.textContent = '';
			descEl.textContent = '';
			thumbEl.src = '';
			footerEl.textContent = '';

			popupEl.style.display = 'block';
			popupEl.style.opacity = '1';
			positionPopup(aEl, lastMouse.x !== null ? lastMouse : null);

			fetchAppDetails(appId).then(details => {
				titleEl.textContent = details.name || appId;
				// release date or short info
				subEl.textContent = details.release_date && details.release_date.date ? details.release_date.date : '';
				descEl.textContent = (details.short_description || '').replace(/\s+/g, ' ').trim();
				// thumbnail - use header_image or capsule
				const imageUrl = details.header_image || (details.capsule && details.capsule.thumb) || '';
				setThumbSrc(imageUrl);

				// footer e.g., price or metascore
				let footerParts = [];
				if (details.is_free) footerParts.push('Free to Play');
				if (details.price_overview && details.price_overview.final_formatted) footerParts.push(details.price_overview.final_formatted);
				if (details.metacritic && details.metacritic.score) footerParts.push(`Metacritic: ${details.metacritic.score}`);
				footerEl.textContent = footerParts.join(' • ');

				// Reposition in case size changed
				positionPopup(aEl);
			}).catch(() => {
				titleEl.textContent = 'Preview unavailable';
				subEl.textContent = '';
				descEl.textContent = '';
				thumbEl.src = '';
				footerEl.textContent = '';
			});
		}

		function hidePreview() {
			popupEl.style.display = 'none';
			popupEl.style.opacity = '0';
		}

			// Helper: set thumbnail src with fallback to fetch blob and then to placeholder
			let currentObjectUrl = null;
			function revokeCurrentObjectUrl() {
				if (currentObjectUrl) {
					try { URL.revokeObjectURL(currentObjectUrl); } catch (e) {}
					currentObjectUrl = null;
				}
			}

			function setThumbSrc(url) {
				revokeCurrentObjectUrl();
				if (!url) {
					thumbEl.src = '';
					thumbEl.style.background = '#222';
					return;
				}

				// Quick debug log
				try { console.debug('Loading preview thumb:', url); } catch (e) {}

				// Try setting image directly first
				thumbEl.onerror = async function () {
					// Direct load failed; try fetching as blob (bypass some CORS/img issues)
					thumbEl.onerror = null;
					try {
						const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
						if (!resp.ok) throw new Error('fetch failed');
						const blob = await resp.blob();
						const obj = URL.createObjectURL(blob);
						currentObjectUrl = obj;
						thumbEl.src = obj;
						thumbEl.style.background = 'transparent';
					} catch (err) {
						// fallback placeholder (simple SVG data URL)
						const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='184' height='84'><rect width='100%' height='100%' fill='#222'/><text x='50%' y='50%' font-size='12' fill='#888' dominant-baseline='middle' text-anchor='middle'>No image</text></svg>`;
						thumbEl.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
						thumbEl.style.background = 'transparent';
					}
				};

				// Start by setting the direct URL; onerror will handle fallback
				thumbEl.style.background = 'transparent';
				thumbEl.src = url;
			}

		// Attach hover handlers to steam links (we already add links earlier) - handle dynamically too
		function attachHoverHandlers(root = document) {
			root.querySelectorAll && root.querySelectorAll('a.steam-store-link').forEach(a => {
				if (a.dataset.previewAttached === '1') return;
				a.dataset.previewAttached = '1';

				// record mouse position when moving over the anchor so we can place the popup near cursor
				if (!a.dataset.mousetrackAttached) {
					a.addEventListener('mousemove', (ev) => {
						lastMouse.x = ev.clientX;
						lastMouse.y = ev.clientY;
					});
					a.dataset.mousetrackAttached = '1';
				}

				a.addEventListener('mouseenter', (ev) => {
					// ensure we have a mouse position even if the user doesn't move after entering
					lastMouse.x = ev.clientX;
					lastMouse.y = ev.clientY;
					clearTimeout(hideTimer);
					// attach a temporary global mousemove listener to keep coords updated while hovering
					if (!a._tmpMouseMove) {
						a._tmpMouseMove = function (m) { lastMouse.x = m.clientX; lastMouse.y = m.clientY; };
					}
					document.addEventListener('mousemove', a._tmpMouseMove);
					showTimer = setTimeout(() => showPreviewForAnchor(a), 220);
				});
				a.addEventListener('mouseleave', (ev) => {
					clearTimeout(showTimer);
					// remove temporary global mousemove listener
					if (a._tmpMouseMove) {
						document.removeEventListener('mousemove', a._tmpMouseMove);
					}
					hideTimer = setTimeout(hidePreview, 250);
				});
				// Keep popup open when hovering over it
				popupEl.addEventListener('mouseenter', () => {
					clearTimeout(hideTimer);
				});
				popupEl.addEventListener('mouseleave', () => {
					hideTimer = setTimeout(hidePreview, 200);
				});
			});
		}

		// Initial attach and observe future anchors
		document.addEventListener('DOMContentLoaded', () => attachHoverHandlers(document));
		// Run immediately if already ready
		if (document.readyState === 'complete' || document.readyState === 'interactive') attachHoverHandlers(document);

		// Observe new anchors added by earlier MutationObserver
		const outerObserver = new MutationObserver(muts => {
			muts.forEach(m => {
				m.addedNodes.forEach(node => {
					if (!(node instanceof Element)) return;
					if (node.matches && node.matches('a.steam-store-link')) attachHoverHandlers(node.parentNode || document);
					if (node.querySelectorAll) attachHoverHandlers(node);
				});
			});
		});
		outerObserver.observe(document.body, { childList: true, subtree: true });

	})();

