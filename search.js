// Search functionality for the GreenLuma Manager

// Initialize the search functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search buttons and functionality
    initializeSearchButtons();

    // Initialize the search input functionality
    initializeSearchInput();
    
    // Initialize mock search results (example games that would come from API)
    initializeMockSearchResults();
    
    // Initialize the app list with placeholder text
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = '<div class="small p-2 text-center" style="color: #ffffff; font-weight: 400; padding: 10px;">Use the search bar above to find apps</div>';
    }
});

// Mock search results to simulate API responses
let mockSearchResults = [];

// Selection state tracking for apps
let appSelectionState = {
    lastSelectedIndex: -1,
    selectedItems: new Set()
};

// Initialize search buttons
function initializeSearchButtons() {
    const steamBtn = document.getElementById('steamSearchBtn');
    const steamdbBtn = document.getElementById('steamdbSearchBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchInfo = document.getElementById('searchInfo');
    const activeSearchEngine = document.getElementById('activeSearchEngine');
    
    if (!steamBtn || !steamdbBtn || !searchBtn || !searchInfo || !activeSearchEngine) {
        console.error("Search buttons or elements not found");
        return;
    }
    
    // Function to toggle button active state
    function toggleSearchButton(btn, otherBtn) {
        const isActive = btn.getAttribute('data-active') === 'true';
        
        // Toggle this button's state
        btn.setAttribute('data-active', !isActive);
        
        // Update button appearance
        if (!isActive) {
            // Activate this button
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
            
            // Get search engine name
            const searchEngineName = btn.textContent.trim();
            
            // Update search info
            searchInfo.style.display = 'block';
            activeSearchEngine.textContent = searchEngineName;
            
            // Enable search button
            searchBtn.disabled = false;
            
            // Deactivate the other button
            otherBtn.setAttribute('data-active', 'false');
            otherBtn.classList.remove('btn-primary');
            otherBtn.classList.add('btn-secondary');
        } else {
            // Deactivate this button
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
            
            // Update search info
            searchInfo.style.display = 'none';
            activeSearchEngine.textContent = 'None';
            
            // Disable search button
            searchBtn.disabled = true;
        }
    }
    
    // Steam button click handler
    steamBtn.addEventListener('click', function() {
        toggleSearchButton(steamBtn, steamdbBtn);
    });
    
    // SteamDB button click handler
    steamdbBtn.addEventListener('click', function() {
        toggleSearchButton(steamdbBtn, steamBtn);
    });
    
    // Initialize buttons to inactive state
    steamBtn.setAttribute('data-active', 'false');
    steamdbBtn.setAttribute('data-active', 'false');
    searchBtn.disabled = true;
}

// Initialize search input functionality
function initializeSearchInput() {
    const searchInput = document.getElementById('getAppSearch');
    const searchBtn = document.getElementById('searchBtn');
    
    if (!searchInput || !searchBtn) {
        console.error("Search input or button not found");
        return;
    }
    
    // Perform search when button is clicked
    searchBtn.addEventListener('click', function() {
        performSearch();
    });
    
    // Also perform search when Enter key is pressed in the search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Filter results as user types (after small delay)
    let typingTimer;
    const doneTypingInterval = 300; // ms
    
    searchInput.addEventListener('input', function() {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(filterAppListByInput, doneTypingInterval);
    });
}

// Perform external search based on active search engine
function performSearch() {
    const searchInput = document.getElementById('getAppSearch');
    const steamBtn = document.getElementById('steamSearchBtn');
    const steamdbBtn = document.getElementById('steamdbSearchBtn');
    
    if (!searchInput || !steamBtn || !steamdbBtn) {
        console.error("Search elements not found");
        return;
    }
    
    const searchTerm = searchInput.value.trim();
    
    // Don't search if input is empty
    if (!searchTerm) {
        return;
    }
    
    // Determine which search engine to use
    let searchUrl = null;
    let searchEngine = '';
    
    if (steamBtn.getAttribute('data-active') === 'true') {
        searchUrl = steamBtn.getAttribute('data-search-url') + encodeURIComponent(searchTerm);
        searchEngine = 'Steam';
    } else if (steamdbBtn.getAttribute('data-active') === 'true') {
        searchUrl = steamdbBtn.getAttribute('data-search-url') + encodeURIComponent(searchTerm);
        searchEngine = 'SteamDB';
    }
    
    // Open the search URL in a new tab if a search engine is active
    if (searchUrl) {
        window.open(searchUrl, '_blank');
        
        // Show notification
        showNotification(`Searching for "${searchTerm}" on ${searchEngine}`, "info");
        
        // Simulate search results for the Get App list
        simulateSearchResults(searchTerm);
    }
}

// Filter apps in Get App list based on current search input
function filterAppListByInput() {
    const searchInput = document.getElementById('getAppSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    filterAppList(searchTerm);
}

// Filter and display apps in Get App list based on search term
function filterAppList(searchTerm) {
        // If search term is empty, show a message
        if (!searchTerm) {
            const getAppList = document.getElementById('getAppList');
            if (getAppList) {
                getAppList.innerHTML = '<div class="d-flex small p-2 justify-content-center align-items-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px; height: 100%;">Use the search bar above to find apps</div>';
                
                // Clear any previous data
                window.getAppData = [];
            }
            return;
        }    // Filter mock results based on search term
    const filteredResults = mockSearchResults.filter(app => 
        app.Name.toLowerCase().includes(searchTerm) || 
        app.ID.toString().includes(searchTerm)
    );
    
    // Update window.getAppData for consistency
    window.getAppData = filteredResults;
    
    // Display the filtered results based on current sort state (if defined)
    if (typeof appSortState !== 'undefined' && appSortState.column) {
        // Apply current sort if appSortState is defined
        const sortedResults = getSortedApps(filteredResults, appSortState.column, appSortState.direction);
        displayAppList(sortedResults);
    } else {
        // Default display if no sort state is defined
        displayAppList(filteredResults);
    }
}

// Display apps in the Get App list
function displayAppList(apps) {
    console.log("displayAppList called with", apps.length, "apps");
    
    const getAppList = document.getElementById('getAppList');
    if (!getAppList) {
        console.error("Could not find getAppList element");
        return;
    }
    
    if (apps.length === 0) {
        getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;">No matching apps found</div>';
        return;
    }
    
    getAppList.innerHTML = '';
    
    apps.forEach((app, index) => {
        const isLast = index === apps.length - 1;
        const borderClass = isLast ? '' : 'border-bottom border-dark-custom';
        
        const appRow = document.createElement('div');
        appRow.className = `d-flex small ${borderClass} app-row`;
        appRow.style.width = '100%';
        appRow.style.padding = '0.15rem 0';
        appRow.style.cursor = 'pointer';
        appRow.setAttribute('data-app-id', app.ID);
        
        appRow.innerHTML = `
            <div class="col-checkbox text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem;">
                <input type="checkbox" class="form-check-input form-check-input-sm app-checkbox" data-app-id="${app.ID}" style="margin: 0;" ${appSelectionState.selectedItems.has(app.ID.toString()) ? 'checked' : ''}>
            </div>
            <div class="col-id text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem; white-space: nowrap; font-size: 0.75rem;">${app.ID}</div>
            <div class="col-name border-end border-dark-custom" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;">${app.Name}</div>
            <div class="col-type text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem; white-space: nowrap; font-size: 0.75rem;">${app.Type}</div>
        `;
        
        getAppList.appendChild(appRow);
        
        // Apply selection visual if item is selected
        if (appSelectionState.selectedItems.has(app.ID.toString())) {
            updateAppRowSelection(appRow, true);
        }
    });
    
    // Add click handlers for row selection
    addAppRowClickHandlers();
    
    // Update select all state
    updateAppSelectAllState();
    
    // Re-add sorting event listeners
    if (typeof addAppSortingEventListeners === 'function') {
        addAppSortingEventListeners();
    }
    
    // Update sort indicators if appSortState exists
    if (typeof updateAppSortIndicators === 'function' && typeof appSortState !== 'undefined') {
        updateAppSortIndicators();
    }
    
    console.log("Apps displayed successfully");
}

// Add click handlers for app row selection
function addAppRowClickHandlers() {
    document.querySelectorAll('.app-row').forEach((row, index) => {
        row.addEventListener('click', function(e) {
            // Don't toggle if clicking directly on checkbox
            if (e.target.type === 'checkbox') return;
            
            const appId = this.getAttribute('data-app-id');
            const checkbox = this.querySelector(`[data-app-id="${appId}"]`);
            
            handleAppRowSelection(index, appId, checkbox, e);
        });
    });
    
    // Add change handlers for checkboxes
    document.querySelectorAll('.app-checkbox').forEach((checkbox, index) => {
        checkbox.addEventListener('change', function(e) {
            const row = this.closest('.app-row');
            const appId = this.getAttribute('data-app-id');
            
            // Handle individual checkbox changes
            if (this.checked) {
                appSelectionState.selectedItems.add(appId);
            } else {
                appSelectionState.selectedItems.delete(appId);
            }
            
            appSelectionState.lastSelectedIndex = index;
            updateAppRowSelection(row, this.checked);
            updateAppSelectAllState();
        });
    });
}

// Handle app row selection with keyboard modifiers
function handleAppRowSelection(index, appId, checkbox, event) {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    if (isShiftPressed && appSelectionState.lastSelectedIndex !== -1) {
        // Shift+Click: Select range
        selectAppRange(appSelectionState.lastSelectedIndex, index);
    } else if (isCtrlPressed) {
        // Ctrl+Click: Toggle individual selection
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            appSelectionState.selectedItems.add(appId);
        } else {
            appSelectionState.selectedItems.delete(appId);
        }
        
        appSelectionState.lastSelectedIndex = index;
        updateAppRowSelection(checkbox.closest('.app-row'), checkbox.checked);
    } else {
        // Normal click: Clear all and select this one
        clearAllAppSelections();
        
        checkbox.checked = true;
        appSelectionState.selectedItems.add(appId);
        appSelectionState.lastSelectedIndex = index;
        updateAppRowSelection(checkbox.closest('.app-row'), true);
    }
    
    updateAppSelectAllState();
}

// Select a range of app items
function selectAppRange(startIndex, endIndex) {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    const checkboxes = document.querySelectorAll('.app-checkbox');
    const rows = document.querySelectorAll('.app-row');
    
    for (let i = start; i <= end; i++) {
        if (checkboxes[i] && rows[i]) {
            const appId = checkboxes[i].getAttribute('data-app-id');
            checkboxes[i].checked = true;
            appSelectionState.selectedItems.add(appId);
            updateAppRowSelection(rows[i], true);
        }
    }
}

// Clear all app selections
function clearAllAppSelections() {
    appSelectionState.selectedItems.clear();
    
    document.querySelectorAll('.app-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        updateAppRowSelection(checkbox.closest('.app-row'), false);
    });
}

// Update the select all checkbox state for apps
function updateAppSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllApps');
    if (!selectAllCheckbox) return;
    
    const totalCheckboxes = document.querySelectorAll('.app-checkbox').length;
    const selectedCount = appSelectionState.selectedItems.size;
    
    if (selectedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === totalCheckboxes) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Update app row selection visual
function updateAppRowSelection(row, isSelected) {
    if (!row) return;
    
    if (isSelected) {
        row.style.backgroundColor = 'rgba(13, 202, 240, 0.2)';
        row.style.borderColor = '#0dcaf0';
    } else {
        row.style.backgroundColor = '';
        row.style.borderColor = '';
    }
}

// Simulate search results (in a real implementation, this would fetch from an API)
function simulateSearchResults(searchTerm) {
    // Filter existing mock results by search term
    const filteredResults = mockSearchResults.filter(app => 
        app.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.ID.toString().includes(searchTerm)
    );
    
    // If we have results, display them
    if (filteredResults.length > 0) {
        // Update window.getAppData for consistency
        window.getAppData = filteredResults;
        
        // Display the filtered results based on current sort state (if defined)
        if (typeof appSortState !== 'undefined' && appSortState.column) {
            // Apply current sort if appSortState is defined
            const sortedResults = getSortedApps(filteredResults, appSortState.column, appSortState.direction);
            displayAppList(sortedResults);
        } else {
            // Default display if no sort state is defined
            displayAppList(filteredResults);
        }
        showNotification(`Found ${filteredResults.length} apps matching "${searchTerm}"`, "success");
    } else {
        // No results found
        const getAppList = document.getElementById('getAppList');
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;">No matching apps found</div>';
        }
        
        showNotification(`No apps found matching "${searchTerm}"`, "warning");
    }
}

// Initialize mock search results (for demonstration purposes)
function initializeMockSearchResults() {
    // These would normally come from an API
    mockSearchResults = [
        { ID: "730", Name: "Counter-Strike 2", Type: "Game" },
        { ID: "440", Name: "Team Fortress 2", Type: "Game" },
        { ID: "570", Name: "Dota 2", Type: "Game" },
        { ID: "578080", Name: "PUBG: BATTLEGROUNDS", Type: "Game" },
        { ID: "1091500", Name: "Cyberpunk 2077", Type: "Game" },
        { ID: "1091501", Name: "Cyberpunk 2077: Phantom Liberty", Type: "DLC" },
        { ID: "292030", Name: "The Witcher 3: Wild Hunt", Type: "Game" },
        { ID: "377160", Name: "Fallout 4", Type: "Game" },
        { ID: "489830", Name: "The Elder Scrolls V: Skyrim Special Edition", Type: "Game" },
        { ID: "782330", Name: "DOOM Eternal", Type: "Game" },
        { ID: "1174180", Name: "Red Dead Redemption 2", Type: "Game" },
        { ID: "1245620", Name: "ELDEN RING", Type: "Game" },
        { ID: "1551360", Name: "Forza Horizon 5", Type: "Game" }
    ];
    
    // Initialize window.getAppData as empty array
    window.getAppData = [];
    
    // Initialize app sort state if available
    if (typeof appSortState !== 'undefined') {
        // Default to Name, asc
        appSortState.column = 'Name';
        appSortState.direction = 'asc';
    }
}

// Show a temporary notification
function showNotification(message, type) {
    // Check if there's an existing notification
    let notification = document.querySelector('.notification-toast');
    
    // If notification already exists, remove it
    if (notification) {
        document.body.removeChild(notification);
    }
    
    // Create new notification
    notification = document.createElement('div');
    notification.className = `notification-toast bg-${type} text-white`;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}