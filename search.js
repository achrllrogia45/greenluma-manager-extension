// Search functionality for the GreenLuma Manager

// Steam API cache and data storage
let steamAppsList = null;
let steamAppsCache = new Map();
let isLoadingSteamApps = false;

// Initialize the search functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search buttons and functionality
    initializeSearchButtons();

    // Initialize the search input functionality
    initializeSearchInput();
    
    // Initialize the app list with placeholder text
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = '<div class="small p-2 text-center" style="color: #ffffff; font-weight: 400; padding: 10px;">Use the search bar above to find apps</div>';
    }
    
    // Preload Steam apps list when page loads
    preloadSteamAppsList();
    
    // Initialize down button functionality
    initializeDownButton();
});

// Steam API Functions
async function getSteamAppsList() {
    console.log("Fetching Steam apps list...");
    
    try {
        // Note: This may fail due to CORS restrictions in browsers
        // For production, consider using a proxy server or browser extension
        const response = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.applist.apps.length} Steam apps`);
        return data.applist.apps;
    } catch (error) {
        console.error('Error fetching Steam apps list:', error);
        
        // If CORS error, show helpful message to user
        if (error.message.includes('CORS') || error.name === 'TypeError') {
            showNotification("CORS restriction: Consider running as browser extension or using proxy", "warning");
        }
        
        throw error;
    }
}

async function getBatchAppDetails(appids) {
    console.log(`Fetching details for ${appids.length} apps...`);
    
    // Steam API allows up to 100 apps per request
    const batchSize = 100;
    const results = {};
    
    for (let i = 0; i < appids.length; i += batchSize) {
        const batch = appids.slice(i, i + batchSize);
        const ids = batch.join(',');
        
        try {
            // Note: This may fail due to CORS restrictions in browsers
            const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${ids}`);
            if (!response.ok) {
                console.warn(`Failed to fetch batch starting at index ${i}`);
                continue;
            }
            
            const batchData = await response.json();
            Object.assign(results, batchData);
            
            // Add small delay to avoid rate limiting
            if (i + batchSize < appids.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error(`Error fetching batch starting at index ${i}:`, error);
            
            // If CORS error, show helpful message to user
            if (error.message.includes('CORS') || error.name === 'TypeError') {
                showNotification("CORS restriction detected - app types may not load", "warning");
            }
        }
    }
    
    console.log(`Successfully fetched details for ${Object.keys(results).length} apps`);
    return results;
}

function filterAppsByName(apps, searchTerm) {
    if (!apps || !searchTerm) return [];
    
    const term = searchTerm.toLowerCase();
    return apps.filter(app => 
        app.name && app.name.toLowerCase().includes(term)
    );
}

async function preloadSteamAppsList() {
    if (steamAppsList || isLoadingSteamApps) {
        return;
    }
    
    console.log("Preloading Steam apps list...");
    isLoadingSteamApps = true;
    
    try {
        steamAppsList = await getSteamAppsList();
        console.log("Steam apps list preloaded successfully");
    } catch (error) {
        console.error("Failed to preload Steam apps list:", error);
        steamAppsList = [];
    } finally {
        isLoadingSteamApps = false;
    }
}

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

// Perform search based on active search engine
async function performSearch() {
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
    
    // Determine which search engine to use and perform API search
    if (steamBtn.getAttribute('data-active') === 'true') {
        // Perform Steam API search and display results in Get App List
        await performSteamAPISearch(searchTerm);
    } else if (steamdbBtn.getAttribute('data-active') === 'true') {
        // For SteamDB, open external page (since we don't have SteamDB API integration)
        const searchUrl = steamdbBtn.getAttribute('data-search-url') + encodeURIComponent(searchTerm);
        window.open(searchUrl, '_blank');
        showNotification(`Searching for "${searchTerm}" on SteamDB (external)`, "info");
    } else {
        showNotification("Please select a search engine first", "warning");
    }
}

// Perform Steam API search and display results
async function performSteamAPISearch(searchTerm) {
    console.log(`Performing Steam API search for: "${searchTerm}"`);
    
    // Show loading message
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;">Searching Steam API...</div>';
    }
    
    // Ensure Steam apps list is loaded
    if (!steamAppsList) {
        if (isLoadingSteamApps) {
            showNotification("Loading Steam apps list, please wait...", "info");
            // Wait for the loading to complete
            while (isLoadingSteamApps) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } else {
            showNotification("Loading Steam apps list...", "info");
            await preloadSteamAppsList();
        }
    }
    
    if (!steamAppsList || steamAppsList.length === 0) {
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ff6b6b; font-weight: 400; padding: 10px;">Failed to load Steam apps list</div>';
        }
        showNotification("Failed to load Steam apps list", "danger");
        return;
    }
    
    // Filter apps by search term
    const filteredApps = filterAppsByName(steamAppsList, searchTerm);
    
    if (filteredApps.length === 0) {
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;">No matching apps found</div>';
        }
        showNotification(`No apps found matching "${searchTerm}"`, "warning");
        return;
    }
    
    // Limit results to reasonable number to avoid overwhelming the UI
    const maxResults = 50;
    const limitedResults = filteredApps.slice(0, maxResults);
    
    showNotification(`Found ${filteredApps.length} apps${filteredApps.length > maxResults ? ` (showing first ${maxResults})` : ''}`, "success");
    
    // Get app details for the filtered results
    try {
        const appIds = limitedResults.map(app => app.appid);
        const details = await getBatchAppDetails(appIds);
        
        // Convert to our expected format
        const formattedResults = limitedResults.map(app => {
            const detail = details[app.appid];
            let type = 'Game'; // Default to 'Game' if we can't get details
            
            if (detail && detail.success && detail.data) {
                type = detail.data.type || 'Game';
                // Capitalize first letter
                type = type.charAt(0).toUpperCase() + type.slice(1);
            }
            
            return {
                ID: app.appid.toString(),
                Name: app.name,
                Type: type
            };
        });
        
        // Update window.getAppData for consistency
        window.getAppData = formattedResults;
        
        // Display the results
        if (typeof appSortState !== 'undefined' && appSortState.column) {
            const sortedResults = getSortedApps(formattedResults, appSortState.column, appSortState.direction);
            displayAppList(sortedResults);
        } else {
            displayAppList(formattedResults);
        }
        
        console.log(`Displayed ${formattedResults.length} Steam API results for "${searchTerm}"`);
        
    } catch (error) {
        console.error('Error getting app details:', error);
        
        // Display basic results without type information
        const basicResults = limitedResults.map(app => ({
            ID: app.appid.toString(),
            Name: app.name,
            Type: 'Game' // Default fallback
        }));
        
        window.getAppData = basicResults;
        displayAppList(basicResults);
        
        showNotification(`Found ${basicResults.length} apps (details may be incomplete)`, "warning");
    }
}

// Filter apps in Get App list based on current search input
async function filterAppListByInput() {
    const searchInput = document.getElementById('getAppSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // If search term is empty, show a message
    if (!searchTerm) {
        const getAppList = document.getElementById('getAppList');
        if (getAppList) {
            getAppList.innerHTML = '<div class="d-flex small p-2 justify-content-center align-items-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px; height: 100%;">Use the search bar above to find apps</div>';
            
            // Clear any previous data
            window.getAppData = [];
        }
        return;
    }
    
    // Check if Steam search is active
    const steamBtn = document.getElementById('steamSearchBtn');
    if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
        // Perform real Steam API search
        await performSteamAPISearch(searchTerm);
    }
}

// Filter and display apps in Get App list based on search term
async function filterAppList(searchTerm) {
    // If search term is empty, show a message
    if (!searchTerm) {
        const getAppList = document.getElementById('getAppList');
        if (getAppList) {
            getAppList.innerHTML = '<div class="d-flex small p-2 justify-content-center align-items-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px; height: 100%;">Use the search bar above to find apps</div>';
            
            // Clear any previous data
            window.getAppData = [];
        }
        return;
    }
    
    // Check if Steam search is active
    const steamBtn = document.getElementById('steamSearchBtn');
    if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
        // Use real Steam API search
        await performSteamAPISearch(searchTerm);
    } else {
        // If no search engine is active, show message
        const getAppList = document.getElementById('getAppList');
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;">Please select a search engine (Steam or SteamDB) first</div>';
        }
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
    const selectAllCheckbox = document.getElementById('getAppSelectAll');
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

// Initialize down button functionality
function initializeDownButton() {
    const downBtn = document.querySelector('#downBtn button');
    if (!downBtn) {
        console.warn("Down button not found");
        return;
    }
    
    downBtn.addEventListener('click', function() {
        moveSelectedAppsToMainList();
    });
}

// Move selected apps from search results to main games list
function moveSelectedAppsToMainList() {
    if (!appSelectionState.selectedItems || appSelectionState.selectedItems.size === 0) {
        showNotification("No apps selected", "warning");
        return;
    }
    
    if (!window.getAppData || window.getAppData.length === 0) {
        showNotification("No search results available", "warning");
        return;
    }
    
    // Get selected apps
    const selectedApps = window.getAppData.filter(app => 
        appSelectionState.selectedItems.has(app.ID.toString())
    );
    
    if (selectedApps.length === 0) {
        showNotification("No valid apps selected", "warning");
        return;
    }
    
    // Get current games data or initialize empty array
    let currentGames = window.gamesData || [];
    
    // Get current priority start value
    const priorityStartInput = document.getElementById('priorityStart');
    const priorityStart = priorityStartInput ? parseInt(priorityStartInput.value) || 0 : 0;
    
    // Check for duplicates and filter them out
    const existingIds = new Set(currentGames.map(game => game.ID.toString()));
    const newApps = selectedApps.filter(app => !existingIds.has(app.ID.toString()));
    
    if (newApps.length === 0) {
        showNotification("All selected apps are already in the main list", "info");
        return;
    }
    
    // Add new apps with proper priority values
    const startingPriority = priorityStart + currentGames.length;
    const appsToAdd = newApps.map((app, index) => ({
        ID: app.ID,
        Name: app.Name,
        Type: app.Type,
        Priority: startingPriority + index
    }));
    
    // Add to main games list
    window.gamesData = [...currentGames, ...appsToAdd];
    
    // Save to localStorage (using main.js function if available)
    if (typeof saveGamesData === 'function') {
        saveGamesData(window.gamesData);
    }
    
    // Refresh main games display (using main.js function if available)
    if (typeof displayGames === 'function') {
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        displayGames(sortedGames);
    }
    
    // Clear selection in search results
    appSelectionState.selectedItems.clear();
    
    // Update UI to reflect cleared selection
    document.querySelectorAll('.app-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const row = checkbox.closest('.app-row');
        if (row && typeof updateAppRowSelection === 'function') {
            updateAppRowSelection(row, false);
        }
    });
    
    // Update select all state
    updateAppSelectAllState();
    
    // Show success notification
    const duplicateCount = selectedApps.length - newApps.length;
    let message = `Added ${newApps.length} apps to main list`;
    if (duplicateCount > 0) {
        message += ` (${duplicateCount} duplicates skipped)`;
    }
    
    showNotification(message, "success");
    
    console.log(`Moved ${newApps.length} apps to main list`);
}