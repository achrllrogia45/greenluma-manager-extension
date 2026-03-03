// manualinput.js
(function () {
    'use strict';

    const manualInputBtn = document.getElementById('manualInputListBtn');
    const manualInputPopup = document.getElementById('manualInputPopup');
    const manualInputContent = document.querySelector('.manual-input-content');
    const manualInputClose = document.getElementById('manualInputClose');
    const manualPasteInput = document.getElementById('manualPasteInput');
    const manualPasteCheck = document.getElementById('manualPasteCheck');
    const manualInputList = document.getElementById('manualInputList');
    const manualSelectAll = document.getElementById('manualSelectAll');
    const manualClearBtn = document.getElementById('manualClearBtn');
    const manualDownBtn = document.getElementById('manualDownBtn');
    const manualInputResize = document.getElementById('manualInputResize');
    const manualSelectionNotification = document.getElementById('manualSelectionNotification');
    const manualSelectionCount = document.getElementById('manualSelectionCount');

    // Selection state tracking
    const manualSelectionState = {
        selectedItems: new Set(),
        lastSelectedIndex: -1
    };

    // Resize functionality
    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    // Load saved dimensions
    function loadSavedDimensions() {
        const savedWidth = localStorage.getItem('manualInputWidth');
        const savedHeight = localStorage.getItem('manualInputHeight');
        
        if (manualInputContent) {
            // Set dimensions (defaults to 500x600 if not saved)
            manualInputContent.style.width = savedWidth || '500px';
            manualInputContent.style.height = savedHeight || '600px';
        }
    }

    // Initialize dimensions on load
    if (manualInputContent) {
        loadSavedDimensions();
    }

    // Initialize resize handle
    if (manualInputResize && manualInputContent) {
        manualInputResize.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const computedStyle = window.getComputedStyle(manualInputContent);
            startWidth = parseInt(computedStyle.width, 10);
            startHeight = parseInt(computedStyle.height, 10);
            
            manualInputContent.classList.add('resizing');
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
        });

        // Double click to toggle size
        manualInputResize.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const currentWidth = parseInt(getComputedStyle(manualInputContent).width);
            const currentHeight = parseInt(getComputedStyle(manualInputContent).height);
            
            if (currentWidth < 700 || currentHeight < 700) {
                manualInputContent.style.width = '800px';
                manualInputContent.style.height = '800px';
                localStorage.setItem('manualInputWidth', '800px');
                localStorage.setItem('manualInputHeight', '800px');
            } else {
                manualInputContent.style.width = '500px';
                manualInputContent.style.height = '600px';
                localStorage.setItem('manualInputWidth', '500px');
                localStorage.setItem('manualInputHeight', '600px');
            }
        });
    }

    function handleResize(e) {
        if (!isResizing || !manualInputContent) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newWidth = startWidth + dx;
        let newHeight = startHeight + dy;
        
        // Apply constraints
        const minWidth = 350;
        const minHeight = 400;
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 40;
        
        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        
        manualInputContent.style.width = newWidth + 'px';
        manualInputContent.style.height = newHeight + 'px';
    }

    function stopResize() {
        if (!isResizing) return;
        
        isResizing = false;
        
        if (manualInputContent) {
            manualInputContent.classList.remove('resizing');
            
            // Save dimensions
            localStorage.setItem('manualInputWidth', manualInputContent.style.width);
            localStorage.setItem('manualInputHeight', manualInputContent.style.height);
        }
        
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    // Open popup
    if (manualInputBtn) {
        manualInputBtn.addEventListener('click', () => {
            if (manualInputPopup) {
                loadSavedDimensions();
                manualInputPopup.style.display = 'block';
                manualInputPopup.setAttribute('aria-hidden', 'false');
                
                // Save popup state as open
                localStorage.setItem('manualInputPopupOpen', 'true');
                
                // Load saved items
                loadManualListItems();
                
                if (manualPasteInput) {
                    manualPasteInput.focus();
                }
            }
        });
    }

    // Close popup function
    function closePopup() {
        if (manualInputPopup) {
            manualInputPopup.style.display = 'none';
            manualInputPopup.setAttribute('aria-hidden', 'true');
            
            // Save popup state as closed
            localStorage.setItem('manualInputPopupOpen', 'false');
        }
    }

    // Check if popup should be reopened on load
    document.addEventListener('DOMContentLoaded', () => {
        const wasOpen = localStorage.getItem('manualInputPopupOpen');
        if (wasOpen === 'true' && manualInputPopup) {
            loadSavedDimensions();
            manualInputPopup.style.display = 'block';
            manualInputPopup.setAttribute('aria-hidden', 'false');
            loadManualListItems();
        }
    });

    // Also check if already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const wasOpen = localStorage.getItem('manualInputPopupOpen');
        if (wasOpen === 'true' && manualInputPopup) {
            setTimeout(() => {
                loadSavedDimensions();
                manualInputPopup.style.display = 'block';
                manualInputPopup.setAttribute('aria-hidden', 'false');
                loadManualListItems();
            }, 100);
        }
    }

    // Close button
    if (manualInputClose) {
        manualInputClose.addEventListener('click', closePopup);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && manualInputPopup && manualInputPopup.style.display === 'block') {
            closePopup();
        }
    });

    // Close on clicking outside
    if (manualInputPopup) {
        manualInputPopup.addEventListener('click', (e) => {
            if (e.target === manualInputPopup) {
                closePopup();
            }
        });
    }

    // Process pasted input (check button)
    if (manualPasteCheck) {
        const processInput = async () => {
            const input = manualPasteInput?.value?.trim();
            if (!input) return;

            const appIds = input
                .split(/\s+/)
                .map(token => token.trim())
                .filter(token => /^\d+$/.test(token));

            if (appIds.length === 0) {
                if (typeof showNotification === 'function') {
                    showNotification('No valid App IDs found', 'warning');
                }
                return;
            }
            
            // Clear input
            if (manualPasteInput) {
                manualPasteInput.value = '';
            }

            // Show loading state
            if (manualPasteCheck) {
                manualPasteCheck.disabled = true;
                manualPasteCheck.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            }

            // Process each App ID token
            for (const appId of appIds) {
                await fetchAndAddApp(appId);
            }

            // Reset button state
            if (manualPasteCheck) {
                manualPasteCheck.disabled = false;
                manualPasteCheck.innerHTML = '<i class="bi bi-check-lg"></i>';
            }
        };

        manualPasteCheck.addEventListener('click', processInput);

        // Also handle Enter key in the input field
        if (manualPasteInput) {
            manualPasteInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    processInput();
                }
            });
        }
    }

    // Fetch app data from Steam API and add to manual list
    async function fetchAndAddApp(appId) {
        try {
            console.log(`Fetching app ${appId} from Steam API...`);
            
            // Check if already exists in manual list
            if (manualInputList) {
                const existing = Array.from(manualInputList.querySelectorAll('.manual-row')).find(
                    row => row.dataset.appId === appId
                );
                if (existing) {
                    console.log(`App ${appId} already in manual list`);
                    return;
                }
            }

            // Fetch from Steam API
            const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const appData = data[appId];

            if (!appData || !appData.success) {
                console.warn(`App ${appId} not found in Steam API`);
                addToManualList(appId, `App ${appId}`, 'Game');
                return;
            }

            const gameInfo = appData.data;
            const appName = gameInfo.name || `App ${appId}`;
            
            // Determine type: Check if DLC by Steam's type or by name pattern (2 underscores)
            let appType = 'Game';
            
            // First check Steam's type
            if (gameInfo.type && gameInfo.type.toLowerCase() === 'dlc') {
                appType = 'DLC';
            } 
            // Check for 2 underscores pattern in the URL-friendly name
            else if (appName.split('__').length - 1 >= 2) {
                appType = 'DLC';
            }
            // Also check if it has a fullgame/base game requirement
            else if (gameInfo.fullgame || gameInfo.required_age) {
                // Some DLCs are marked with fullgame property
                if (gameInfo.fullgame) {
                    appType = 'DLC';
                }
            }

            console.log(`Fetched: ${appId} - ${appName} (${appType})`);
            
            // Add to manual list with links
            addToManualList(appId, appName, appType);

        } catch (error) {
            console.error(`Error fetching app ${appId}:`, error);
            // Add with default name if fetch fails
            addToManualList(appId, `App ${appId}`, 'Game');
        }
    }

    // Add item to manual input list
    function addToManualList(id, name, type) {
        if (!manualInputList) return;

        // Check if already exists
        const existing = Array.from(manualInputList.querySelectorAll('.manual-row')).find(
            row => row.dataset.appId === id
        );
        if (existing) return;

        const row = document.createElement('div');
        row.className = 'manual-row d-flex border-bottom border-dark-custom';
        row.dataset.appId = id;
        row.dataset.appName = name;
        row.dataset.appType = type;

        row.innerHTML = `
            <div class="col-checkbox text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem;">
                <input type="checkbox" class="form-check-input form-check-input-sm manual-row-checkbox">
            </div>
            <div class="col-id text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;"><span class="text-selectable">${id}</span></div>
            <div class="col-name border-end border-dark-custom" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;"><span class="text-selectable">${name}</span></div>
            <div class="col-type text-center" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;">${type}</div>
        `;

        manualInputList.appendChild(row);
        
        // Add click handler for Shift/Ctrl selection
        addRowClickHandler(row);
        
        // Save to localStorage
        saveManualListItems();
    }

    // Save manual list items to localStorage
    function saveManualListItems() {
        if (!manualInputList) return;
        
        const items = [];
        const rows = manualInputList.querySelectorAll('.manual-row');
        
        rows.forEach(row => {
            items.push({
                id: row.dataset.appId,
                name: row.dataset.appName,
                type: row.dataset.appType
            });
        });
        
        localStorage.setItem('manualInputListItems', JSON.stringify(items));
    }

    // Load manual list items from localStorage
    function loadManualListItems() {
        if (!manualInputList) return;
        
        // Clear existing items
        manualInputList.innerHTML = '';
        
        const savedItems = localStorage.getItem('manualInputListItems');
        if (!savedItems) return;
        
        try {
            const items = JSON.parse(savedItems);
            items.forEach(item => {
                addToManualList(item.id, item.name, item.type);
            });
        } catch (error) {
            console.error('Error loading manual list items:', error);
        }
    }

    // Update selection count notification
    function updateManualSelectionCount() {
        const count = manualSelectionState.selectedItems.size;
        
        if (manualSelectionCount) {
            manualSelectionCount.textContent = count;
        }
        
        if (manualSelectionNotification) {
            if (count > 0) {
                manualSelectionNotification.style.opacity = '1';
            } else {
                manualSelectionNotification.style.opacity = '0';
            }
        }
    }

    // Add row click handler for Shift/Ctrl selection
    function addRowClickHandler(row) {
        const checkbox = row.querySelector('.manual-row-checkbox');
        if (!checkbox) return;

        // Prevent text selection during shift-click
        row.addEventListener('mousedown', (e) => {
            if (e.shiftKey) {
                e.preventDefault();
            }
        });

        row.addEventListener('click', (e) => {
            // Ignore clicks on checkbox itself (it handles its own state)
            if (e.target === checkbox) {
                handleCheckboxChange(checkbox, row, e);
                return;
            }

            // Ignore clicks on links
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }

            // Ignore clicks on ID column (entire column is text-selectable)
            if (e.target.closest('.col-id')) {
                return;
            }

            // Ignore clicks on text-selectable spans in Name column
            if (e.target.classList.contains('text-selectable')) {
                return;
            }

            // Handle row click
            e.preventDefault();
            e.stopPropagation();

            const allRows = Array.from(manualInputList.querySelectorAll('.manual-row'));
            const currentIndex = allRows.indexOf(row);
            const appId = row.dataset.appId;

            if (e.shiftKey && manualSelectionState.lastSelectedIndex !== -1) {
                // Shift+Click: Range selection
                const start = Math.min(manualSelectionState.lastSelectedIndex, currentIndex);
                const end = Math.max(manualSelectionState.lastSelectedIndex, currentIndex);

                for (let i = start; i <= end; i++) {
                    const targetRow = allRows[i];
                    const targetCheckbox = targetRow.querySelector('.manual-row-checkbox');
                    const targetId = targetRow.dataset.appId;

                    if (targetCheckbox && !targetCheckbox.checked) {
                        targetCheckbox.checked = true;
                        manualSelectionState.selectedItems.add(targetId);
                        updateRowSelection(targetRow, true);
                    }
                }
            } else if (e.ctrlKey || e.metaKey) {
                // Ctrl+Click: Toggle selection
                checkbox.checked = !checkbox.checked;
                
                if (checkbox.checked) {
                    manualSelectionState.selectedItems.add(appId);
                    updateRowSelection(row, true);
                } else {
                    manualSelectionState.selectedItems.delete(appId);
                    updateRowSelection(row, false);
                }
                
                manualSelectionState.lastSelectedIndex = currentIndex;
            } else {
                // Normal click: Clear others and select this
                manualSelectionState.selectedItems.clear();
                
                allRows.forEach(r => {
                    const cb = r.querySelector('.manual-row-checkbox');
                    if (cb) cb.checked = false;
                    updateRowSelection(r, false);
                });

                checkbox.checked = true;
                manualSelectionState.selectedItems.add(appId);
                updateRowSelection(row, true);
                manualSelectionState.lastSelectedIndex = currentIndex;
            }

            updateManualSelectionCount();
            updateManualSelectAllState();
        });

        // Handle checkbox change
        checkbox.addEventListener('change', (e) => {
            handleCheckboxChange(checkbox, row, e);
        });
    }

    // Handle checkbox change
    function handleCheckboxChange(checkbox, row, e) {
        const appId = row.dataset.appId;
        const allRows = Array.from(manualInputList.querySelectorAll('.manual-row'));
        const currentIndex = allRows.indexOf(row);

        if (checkbox.checked) {
            manualSelectionState.selectedItems.add(appId);
            updateRowSelection(row, true);
        } else {
            manualSelectionState.selectedItems.delete(appId);
            updateRowSelection(row, false);
        }

        manualSelectionState.lastSelectedIndex = currentIndex;
        updateManualSelectionCount();
        updateManualSelectAllState();
    }

    // Update row visual selection
    function updateRowSelection(row, isSelected) {
        if (isSelected) {
            row.style.backgroundColor = 'rgba(13, 110, 253, 0.15)';
        } else {
            row.style.backgroundColor = '';
        }
    }

    // Update select all checkbox state
    function updateManualSelectAllState() {
        if (!manualSelectAll || !manualInputList) return;

        const allCheckboxes = manualInputList.querySelectorAll('.manual-row-checkbox');
        const checkedCheckboxes = manualInputList.querySelectorAll('.manual-row-checkbox:checked');

        if (allCheckboxes.length === 0) {
            manualSelectAll.checked = false;
            manualSelectAll.indeterminate = false;
        } else if (checkedCheckboxes.length === 0) {
            manualSelectAll.checked = false;
            manualSelectAll.indeterminate = false;
        } else if (checkedCheckboxes.length === allCheckboxes.length) {
            manualSelectAll.checked = true;
            manualSelectAll.indeterminate = false;
        } else {
            manualSelectAll.checked = false;
            manualSelectAll.indeterminate = true;
        }
    }

    // Select all checkbox
    if (manualSelectAll) {
        manualSelectAll.addEventListener('change', (e) => {
            const checkboxes = manualInputList?.querySelectorAll('.manual-row-checkbox');
            checkboxes?.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }

    // Handle Select All checkbox
    if (manualSelectAll) {
        manualSelectAll.addEventListener('change', () => {
            const allCheckboxes = manualInputList?.querySelectorAll('.manual-row-checkbox');
            const allRows = manualInputList?.querySelectorAll('.manual-row');
            
            if (!allCheckboxes) return;

            manualSelectionState.selectedItems.clear();
            
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = manualSelectAll.checked;
                const row = checkbox.closest('.manual-row');
                if (row) {
                    const appId = row.dataset.appId;
                    if (manualSelectAll.checked) {
                        manualSelectionState.selectedItems.add(appId);
                        updateRowSelection(row, true);
                    } else {
                        updateRowSelection(row, false);
                    }
                }
            });

            updateManualSelectionCount();
        });
    }

    // Clear selected items (X button) with confirmation
    if (manualClearBtn) {
        let confirmActive = false;
        let confirmTimer = null;
        const originalHTML = manualClearBtn.innerHTML;
        const originalTitle = manualClearBtn.title || '';

        function revertButton() {
            confirmActive = false;
            if (confirmTimer) {
                clearTimeout(confirmTimer);
                confirmTimer = null;
            }
            // Restore original state
            manualClearBtn.innerHTML = originalHTML;
            manualClearBtn.classList.remove('text-warning', 'confirming');
            manualClearBtn.classList.add('text-muted');
            manualClearBtn.title = originalTitle;
            manualClearBtn.classList.remove('expanded');
        }

        manualClearBtn.addEventListener('click', () => {
            try {
                // If not currently in confirm mode, enter confirm mode
                if (!confirmActive) {
                    const selected = manualInputList?.querySelectorAll('.manual-row-checkbox:checked');
                    
                    // If nothing selected, notify and return
                    if (!selected || selected.length === 0) {
                        console.warn("No items selected in manual input list");
                        if (typeof showNotification === 'function') {
                            showNotification('No items selected', 'warning');
                        }
                        return;
                    }

                    confirmActive = true;
                    // Visual change: show text and warning color
                    manualClearBtn.classList.remove('text-muted');
                    manualClearBtn.classList.add('text-warning');
                    manualClearBtn.innerHTML = `
                        <div class="arrow-side-line"></div>
                        <span class="d-flex align-items-center justify-content-center mx-2" style="font-size: 0.7rem; line-height: 1; pointer-events: none;">
                            ARE YOU SURE?
                        </span>
                        <div class="arrow-side-line"></div>
                    `;
                    manualClearBtn.title = 'Click again within 2s to confirm deletion';
                    manualClearBtn.classList.add('confirming', 'expanded');

                    // Revert after 2 seconds if not confirmed
                    confirmTimer = setTimeout(() => {
                        revertButton();
                    }, 2000);
                } else {
                    // Confirmed: perform delete immediately
                    if (confirmTimer) {
                        clearTimeout(confirmTimer);
                        confirmTimer = null;
                    }

                    // Perform the actual deletion
                    const selected = manualInputList?.querySelectorAll('.manual-row-checkbox:checked');
                    if (selected && selected.length > 0) {
                        const count = selected.length;
                        selected.forEach(checkbox => {
                            const row = checkbox.closest('.manual-row');
                            if (row) {
                                const appId = row.dataset.appId;
                                manualSelectionState.selectedItems.delete(appId);
                                row.remove();
                            }
                        });
                        
                        // Reset select all
                        if (manualSelectAll) {
                            manualSelectAll.checked = false;
                        }

                        // Update selection count
                        updateManualSelectionCount();
                        
                        // Save changes to localStorage
                        saveManualListItems();

                        if (typeof showNotification === 'function') {
                            showNotification(`Removed ${count} item(s) from manual list`, 'success');
                        }
                    }

                    // Revert button back to original state
                    revertButton();
                }
            } catch (err) {
                console.error('Error handling manual clear button confirmation:', err);
                revertButton();
            }
        });
    }

    // Move selected items down to main games list (down arrow button)
    if (manualDownBtn) {
        manualDownBtn.addEventListener('click', () => {
            const selected = Array.from(manualInputList?.querySelectorAll('.manual-row-checkbox:checked') || []);
            
            if (selected.length === 0) {
                console.warn("No items selected in manual input list");
                return;
            }

            // Get current games data
            let currentGames = window.gamesData || [];
            
            // Get priority start value
            const priorityStartInput = document.getElementById('priorityStart');
            const priorityStart = priorityStartInput ? parseInt(priorityStartInput.value) || 0 : 0;
            
            // Calculate starting priority (at the bottom of the list)
            const startingPriority = priorityStart + currentGames.length;
            
            // Collect apps to add
            const appsToAdd = [];
            const existingIds = new Set(currentGames.map(game => game.ID.toString()));
            
            selected.forEach((checkbox, index) => {
                const row = checkbox.closest('.manual-row');
                if (!row) return;

                const appId = row.dataset.appId;
                const appName = row.dataset.appName;
                const appType = row.dataset.appType;

                // Skip if already exists in games list
                if (existingIds.has(appId)) {
                    console.log(`App ${appId} already exists in games list`);
                    manualSelectionState.selectedItems.delete(appId);
                    row.remove();
                    return;
                }

                // Add to list of apps to add
                appsToAdd.push({
                    ID: appId,
                    Name: appName,
                    Type: appType,
                    Priority: startingPriority + index,
                    SteamStoreLink: `https://store.steampowered.com/app/${appId}/`,
                    SteamDBLink: `https://steamdb.info/app/${appId}/`
                });

                // Remove from selection state and manual list
                manualSelectionState.selectedItems.delete(appId);
                row.remove();
            });

            if (appsToAdd.length === 0) {
                console.log("No new apps to add");
                return;
            }

            // Update games data
            window.gamesData = [...currentGames, ...appsToAdd];
            console.log(`Added ${appsToAdd.length} apps to games list`);

            // Reset generated flag since list has changed
            if (typeof resetGeneratedFlag === 'function') {
                resetGeneratedFlag();
            }

            // Save to localStorage
            if (typeof saveGamesData === 'function') {
                saveGamesData(window.gamesData);
            }

            // Refresh main games display
            if (typeof displayGames === 'function') {
                const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
                displayGames(sortedGames);
            }

            // Show notification
            if (typeof showNotification === 'function') {
                showNotification(`Added ${appsToAdd.length} app(s) to games list`, 'success');
            }

            // Reset select all
            if (manualSelectAll) {
                manualSelectAll.checked = false;
            }
            
            // Update selection count
            updateManualSelectionCount();
            
            // Save changes to localStorage
            saveManualListItems();
        });
    }

})();
