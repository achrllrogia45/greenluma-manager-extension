// Prevent localStorage writes when setting value programmatically
    let isProgrammaticChange = false;

    // Helper to set value programmatically
    function setInputValue(input, value) {
        isProgrammaticChange = true;
        input.value = value;
        isProgrammaticChange = false;
    }
// Search functionality for the GreenLuma Manager

/**  
  Search Engine API References
        1. https://api.steampowered.com/IStoreService/GetAppList/v1/ (deprecated)
        2. https://store.steampowered.com/api/appdetails?appids={appID}&filters=basic,dlc
**/


// Search results cache configuration
const SEARCH_CACHE_KEY = 'greenlumaSearchCache';
const STEAMSTORE_CACHE_KEY = 'greenlumaSteamStoreCache';
const APPID_CACHE_KEY = 'greenlumaAppIDCache';
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours
// Local storage key for persisting type filter state
const TYPE_FILTER_KEY = 'greenlumaTypeFilter';

// Initialize the search functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search buttons and functionality
    initializeSearchButtons();

    // Initialize the search input functionality
    initializeSearchInput();
    
    // Initialize the app list with placeholder text
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = '<div class="small p-2 text-center text-light opacity-50 pe-none user-select-none" style="font-weight: 400; padding: 10px;">Use the search bar above to find apps</div>';
    }
    
    // Initialize sort dropdown functionality
    initializeSortDropdown();
    
    // Initialize type filter UI
    initializeTypeFilter();
    
    // Restore saved search state
    restoreSearchState();
    
    // Try to restore cached search results
    restoreCachedSearchResults();
    
    // Try to restore App ID search results
    restoreAppIDSearchResults();
});

async function getBatchAppDetails(appids) {
    console.log(`Fetching details for ${appids.length} DLCs...`);

    const results = {};

    if (!Array.isArray(appids) || appids.length === 0) {
        return results;
    }

    const uniqueIds = [...new Set(appids.map(id => Number(id)).filter(id => Number.isFinite(id)))];

    // Fetch DLCs individually since Steam API doesn't handle batch well
    for (let i = 0; i < uniqueIds.length; i++) {
        const appid = uniqueIds[i];
        const url = `https://store.steampowered.com/api/appdetails?appids=${appid}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                continue;
            }

            const data = await response.json();
            if (data && data[appid]) {
                results[appid] = data[appid];
            }

            // Small delay to avoid overwhelming the server (every 10 requests)
            if (i > 0 && i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
        }
    }

    return results;
}

// Search results cache functions
function saveSearchResultsToCache(searchTerm, results) {
    try {
        const cacheData = {
            searchTerm: searchTerm.toLowerCase(),
            results: results,
            timestamp: Date.now()
        };
        
        localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
    }
}

function loadSearchResultsFromCache(searchTerm) {
    try {
        const cachedData = localStorage.getItem(SEARCH_CACHE_KEY);
        if (!cachedData) return null;
        
        const cache = JSON.parse(cachedData);
        
        // Check if cache is for the same search term
        if (cache.searchTerm !== searchTerm.toLowerCase()) {
            return null;
        }
        
        // Check if cache is not expired
        const ageInHours = (Date.now() - cache.timestamp) / (1000 * 60 * 60);
        if (ageInHours > CACHE_EXPIRY_HOURS) {
            localStorage.removeItem(SEARCH_CACHE_KEY);
            return null;
        }
        
        return cache.results;
    } catch (error) {
        localStorage.removeItem(SEARCH_CACHE_KEY);
        return null;
    }
}

// Steam Store search results cache functions
function saveSteamStoreResultsToCache(searchTerm, results) {
    try {
        const cacheData = {
            searchTerm: searchTerm.toLowerCase(),
            results: results,
            timestamp: Date.now()
        };
        
        localStorage.setItem(STEAMSTORE_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
    }
}

function loadSteamStoreResultsFromCache(searchTerm) {
    try {
        const cachedData = localStorage.getItem(STEAMSTORE_CACHE_KEY);
        if (!cachedData) return null;
        
        const cache = JSON.parse(cachedData);
        
        // Check if cache is for the same search term
        if (cache.searchTerm !== searchTerm.toLowerCase()) {
            return null;
        }
        
        // Check if cache is not expired
        const ageInHours = (Date.now() - cache.timestamp) / (1000 * 60 * 60);
        if (ageInHours > CACHE_EXPIRY_HOURS) {
            localStorage.removeItem(STEAMSTORE_CACHE_KEY);
            return null;
        }
        
        return cache.results;
    } catch (error) {
        localStorage.removeItem(STEAMSTORE_CACHE_KEY);
        return null;
    }
}

function clearSteamStoreCacheOnSearchChange() {
    try {
        localStorage.removeItem(STEAMSTORE_CACHE_KEY);
    } catch (error) {
    }
}

function clearAllSearchCaches() {
    try {
        localStorage.removeItem(SEARCH_CACHE_KEY);
        localStorage.removeItem(STEAMSTORE_CACHE_KEY);
    } catch (error) {
    }
}

function restoreSteamStoreCachedResults() {
    // Only restore if there's a search term and Steam Store is active
    const searchInput = document.getElementById('getAppSearch');
    const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
    
    if (!searchInput || !steamStoreBtn) return false;
    
    const searchTerm = searchInput.value.trim();
    if (!searchTerm || steamStoreBtn.getAttribute('data-active') !== 'true') return false;
    
    // Try to load cached results
    const cachedResults = loadSteamStoreResultsFromCache(searchTerm);
    if (cachedResults && cachedResults.length > 0) {
        
        // Update window.getAppData
        const withFilter = applyTypeFilterToResults(cachedResults);
        window.getAppData = withFilter;
        
        // Display the cached results
        displayAppList(window.getAppData);
        
        // Show notification that results were loaded from cache
        showNotification(`Loaded ${cachedResults.length} cached Steam Store results for "${searchTerm}"`, "info");
        
        return true;
    }
    
    return false;
}

function restoreCachedSearchResults() {
    // Restore cached results for both Steam API and Steam Store
    const searchInput = document.getElementById('getAppSearch');
    const steamBtn = document.getElementById('steamSearchBtn');
    const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
    
    // Get search term from appropriate input
    let searchTerm = '';
    if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
        if (searchInput) {
            searchTerm = searchInput.value.trim();
        }
    } else if (searchInput) {
        // For other engines, use the single search input
        searchTerm = searchInput.value.trim();
    }
    
    if (!searchTerm) return;
    
    // Try Steam API cache first
    if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
        // Try to load cached results
        const cachedResults = loadSearchResultsFromCache(searchTerm);
        if (cachedResults && cachedResults.length > 0) {
            
            // Apply type filter then update window.getAppData
            const withFilter = applyTypeFilterToResults(cachedResults);
            window.getAppData = withFilter;
            
            // Display the cached results
            displayAppList(window.getAppData);
            
            // Show notification that results were loaded from cache
            showNotification(`Loaded ${cachedResults.length} cached Steam API results for "${searchTerm}"`, "info");
            
            return true;
        }
    }
    
    // Try Steam Store cache
    if (steamStoreBtn && steamStoreBtn.getAttribute('data-active') === 'true') {
        return restoreSteamStoreCachedResults();
    }
    
    return false;
}

// App ID search results cache functions
function saveAppIDSearchToCache(appID, results) {
    try {
        const cacheData = {
            appID: appID,
            results: results,
            timestamp: Date.now()
        };
        
        localStorage.setItem(APPID_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
    }
}

function restoreAppIDSearchResults() {
    try {
        const cachedData = localStorage.getItem(APPID_CACHE_KEY);
        if (!cachedData) return false;
        
        const cache = JSON.parse(cachedData);
        
        // Check if we're in SteamAPI mode (dual mode)
        const steamBtn = document.getElementById('steamSearchBtn');
        if (!steamBtn || steamBtn.getAttribute('data-active') !== 'true') {
            return false;
        }
        
        // Restore the App ID in the input
        const searchInputAppID = document.getElementById('getAppSearchAppID');
        if (searchInputAppID && cache.appID) {
            if (typeof setInputValue === 'function') {
                setInputValue(searchInputAppID, cache.appID);
            } else {
                searchInputAppID.value = cache.appID;
            }
        }
        
        // Apply type filter to results
        const finalResults = applyTypeFilterToResults(cache.results);
        
        // Update window.getAppData and display results
        window.getAppData = finalResults;
        displayAppList(finalResults);
        
        return true;
    } catch (error) {
        localStorage.removeItem(APPID_CACHE_KEY);
        return false;
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
    const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
    const steamdbBtn = document.getElementById('steamdbSearchBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchInfo = document.getElementById('searchInfo');
    const activeSearchEngine = document.getElementById('activeSearchEngine');
    
    if (!steamBtn || !steamStoreBtn || !steamdbBtn || !searchBtn || !searchInfo || !activeSearchEngine) {
        return;
    }
    
    // Function to toggle button active state
    function toggleSearchButton(btn, otherBtns) {
        // Always activate clicked button and deactivate others (radio button behavior)
        // Clear Steam Store cache when switching to a different search engine
        clearSteamStoreCacheOnSearchChange();
            
        // Activate this button
        btn.setAttribute('data-active', 'true');
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
            
        // Switch between single and dual mode based on selected engine
        const singleModeSearch = document.getElementById('singleModeSearch');
        const dualModeSearch = document.getElementById('dualModeSearch');
        const searchBtnAppID = document.getElementById('searchBtnAppID');
            
        if (btn.id === 'steamSearchBtn') {
            // Switch to dual mode for SteamAPI
            if (singleModeSearch) singleModeSearch.style.display = 'none';
            if (dualModeSearch) {
                dualModeSearch.classList.remove('d-none');
                dualModeSearch.classList.add('d-block');
            }
            // Enable dual mode button
            if (searchBtnAppID) searchBtnAppID.disabled = false;
            // Disable single mode button
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) searchBtn.disabled = true;
        } else {
            // Switch to single mode for other engines
            if (singleModeSearch) singleModeSearch.style.display = 'flex';
            if (dualModeSearch) {
                dualModeSearch.classList.remove('d-block');
                dualModeSearch.classList.add('d-none');
            }
            // Enable single mode button
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) searchBtn.disabled = false;
            if (searchBtnAppID) searchBtnAppID.disabled = true;
        }
            
        // Get search engine name
        let searchEngineName = btn.textContent.trim();
        if (btn.id === 'steamSearchBtn') {
            searchEngineName += " (Slower)";
        } else if (btn.id === 'steamstoreSearchBtn') {
            searchEngineName += " (Slow)";
        }
            
        // Update search info
        const searchInfo = document.getElementById('searchInfo');
        const activeSearchEngine = document.getElementById('activeSearchEngine');
        if (searchInfo && activeSearchEngine) {
            searchInfo.style.display = 'block';
            activeSearchEngine.textContent = searchEngineName;
        }
        
        // Show/Hide enter hint: only visible for SteamAPI mode
        const enterHint = document.getElementById('enterHint');
        if (enterHint) {
            if (btn.id === 'steamSearchBtn') {
                enterHint.style.display = 'block';
            } else {
                enterHint.style.display = 'none';
            }
        }
            
        // Deactivate the other buttons
        otherBtns.forEach(otherBtn => {
            otherBtn.setAttribute('data-active', 'false');
            otherBtn.classList.remove('btn-primary');
            otherBtn.classList.add('btn-secondary');
        });
            
        // Save active search engine to localStorage
        localStorage.setItem('activeSearchEngine', btn.id);
    }
    
    // Steam button click handler
    steamBtn.addEventListener('click', function() {
        toggleSearchButton(steamBtn, [steamStoreBtn, steamdbBtn]);
    });
    
    // Steam Store button click handler
    steamStoreBtn.addEventListener('click', function() {
        toggleSearchButton(steamStoreBtn, [steamBtn, steamdbBtn]);
    });
    
    // SteamDB button click handler
    steamdbBtn.addEventListener('click', function() {
        toggleSearchButton(steamdbBtn, [steamBtn, steamStoreBtn]);
    });
    
    // Initialize buttons to inactive state
    steamBtn.setAttribute('data-active', 'false');
    steamStoreBtn.setAttribute('data-active', 'false');
    steamdbBtn.setAttribute('data-active', 'false');
    searchBtn.disabled = true;
    
    // Initialize dual search buttons
    const searchBtnAppID = document.getElementById('searchBtnAppID');
    if (searchBtnAppID) searchBtnAppID.disabled = true;
}

// Initialize search input functionality
function initializeSearchInput() {
    const searchInput = document.getElementById('getAppSearch');
    const searchBtn = document.getElementById('searchBtn');
    const searchInputAppID = document.getElementById('getAppSearchAppID');
    const searchBtnAppID = document.getElementById('searchBtnAppID');
    const getAppListSearchInput = document.getElementById('getAppListSearch');
    
    if (!searchInput || !searchBtn) {
        return;
    }
    
    // Perform search when button is clicked (single search bar)
    searchBtn.addEventListener('click', function() {
        performSearch();
    });
    
    // Also perform search when Enter key is pressed in the search input (single search bar)
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Helper to ensure a searching animation element exists
    function ensureSearchingAnimation() {
        let anim = document.getElementById('searchingAnimation');
        if (!anim) {
            // Create a small inline animation element
            anim = document.createElement('div');
            anim.id = 'searchingAnimation';
            anim.style.display = 'none';
            anim.style.alignItems = 'center';
            anim.style.gap = '8px';
            anim.style.color = '#ccc';
            anim.style.marginLeft = '8px';
            anim.style.fontSize = '0.85rem';
            anim.innerHTML = `<img src="steam.gif" alt="Searching..." width="20" height="20" style="vertical-align:middle; opacity:.9;"> <span style="color:#cfe3ff;">Searching...</span>`;

            // Prefer placing it inside the search bar container so it's visible and near the input
            const preferredContainers = [
                document.getElementById('searchBarContainer'),
                document.getElementById('singleModeSearch'),
                document.getElementById('dualModeSearch'),
                document.getElementById('searchBarContainer')
            ];

            let placed = false;
            for (const c of preferredContainers) {
                if (c) {
                    // insert after the container to avoid breaking input-group layout
                    c.appendChild(anim);
                    placed = true;
                    break;
                }
            }

            if (!placed) document.body.appendChild(anim);
        }
        return anim;
    }

    if (searchInputAppID && searchBtnAppID) {
        // App ID search button click
        searchBtnAppID.addEventListener('click', function() {
            performAppIDSearch();
        });
        
        // App ID search on Enter key
        searchInputAppID.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performAppIDSearch();
            }
        });
    }

    if (getAppListSearchInput) {
        let getAppListSearchTimer;
        const getAppListSearchDelay = 250;

        getAppListSearchInput.addEventListener('input', function() {
            clearTimeout(getAppListSearchTimer);
            getAppListSearchTimer = setTimeout(() => {
                applyGetAppListTextFilter();
            }, getAppListSearchDelay);
        });
        
        // Also update filter on Enter key for immediate response
        getAppListSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                clearTimeout(getAppListSearchTimer);
                applyGetAppListTextFilter();
            }
        });
    }
    
    // Filter results as user types (debounced 2s) - for single search bar
    let typingTimer;
    const doneTypingInterval = 2000; // ms (2 seconds)

    searchInput.addEventListener('input', function() {
        const anim = ensureSearchingAnimation();
        clearTimeout(typingTimer);
        // Show searching animation
        if (anim) anim.style.display = 'flex';

        // Clear Steam Store cache when search input changes
        const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
        if (steamStoreBtn && steamStoreBtn.getAttribute('data-active') === 'true') {
            clearSteamStoreCacheOnSearchChange();
        }
        typingTimer = setTimeout(() => {
            filterAppListByInput();
            // Hide searching animation
            if (anim) anim.style.display = 'none';
        }, doneTypingInterval);
        // Save search query to localStorage
        const query = this.value.trim();
        if (query) {
            localStorage.setItem('searchQuery', query);
        } else {
            localStorage.removeItem('searchQuery');
        }
    });
}

// Perform search based on active search engine
async function performSearch() {
    const searchInput = document.getElementById('getAppSearch');
    const steamBtn = document.getElementById('steamSearchBtn');
    const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
    const steamdbBtn = document.getElementById('steamdbSearchBtn');
    
    if (!searchInput || !steamBtn || !steamStoreBtn || !steamdbBtn) {
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
    } else if (steamStoreBtn.getAttribute('data-active') === 'true') {
        // Perform Steam Store scraping search
        await performSteamStoreSearch(searchTerm);
    } else if (steamdbBtn.getAttribute('data-active') === 'true') {
        // For SteamDB, open external page (since we don't have SteamDB API integration)
        const searchUrl = steamdbBtn.getAttribute('data-search-url') + encodeURIComponent(searchTerm);
        window.open(searchUrl, '_blank');
        showNotification(`Searching for "${searchTerm}" on SteamDB (external)`, "info");
    } else {
        showNotification("Select a search engine first", "warning");
    }
}

// Perform App ID search (right search bar in SteamAPI mode)
async function performAppIDSearch() {
    const searchInput = document.getElementById('getAppSearchAppID');
    if (!searchInput) return;
    
    const appID = searchInput.value.trim();
    if (!appID || isNaN(appID)) {
        showNotification("Enter a valid App ID sir!", "warning");
        return;
    }
    
    console.log(`Performing App ID search for: ${appID}`);
    
    // Clear previous App ID cache if searching a new ID
    const cachedAppID = localStorage.getItem('lastSearchedAppID');
    if (cachedAppID !== appID) {
        localStorage.removeItem(APPID_CACHE_KEY);
        localStorage.setItem('lastSearchedAppID', appID);
    }
    
    // Show loading animation
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = `<div class="d-flex justify-content-center align-items-center w-100" style="padding: 20px;">
            <img src="steam.gif" alt="Searching App ID..." title="Searching App ID..." width="64" height="64" style="opacity: 0.8;">
        </div>`;
    }
    
    try {
        // Step 1: Fetch app details from Steam Store API with filters
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appID}&filters=basic,dlc`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const appData = data[appID];
        
        if (!appData || !appData.success) {
            if (getAppList) {
                getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;"><i class="bi bi-search me-2"></i>App ID not found</div>';
            }
            showNotification(`App ID ${appID} not found`, "warning");
            return;
        }
        
        const gameInfo = appData.data;
        const results = [];
        
        // Add the main game/app
        const appType = gameInfo.type.toLowerCase() === 'dlc' 
            ? 'DLC' 
            : gameInfo.type.charAt(0).toUpperCase() + gameInfo.type.slice(1);
        
        results.push({
            ID: gameInfo.steam_appid.toString(),
            Name: gameInfo.name,
            Type: appType
        });
        
        // Step 2: If there are DLCs, fetch their names from the Steam API
        if (gameInfo.dlc && gameInfo.dlc.length > 0) {
            console.log(`Found ${gameInfo.dlc.length} DLCs, fetching names...`);
            
            // Show progress in the list
            if (getAppList) {
                getAppList.innerHTML = `<div class="d-flex justify-content-center align-items-center w-100" style="padding: 20px;">
                    <img src="steam.gif" alt="Fetching DLC names..." title="Fetching DLC names..." width="64" height="64" style="opacity: 0.8;">
                    <span class="ms-2">Fetching ${gameInfo.dlc.length} DLC names...</span>
                </div>`;
            }

            // Fetch DLC details in batches to get actual names
            for (let i = 0; i < gameInfo.dlc.length; i++) {
                const dlcId = gameInfo.dlc[i];
                
                try {
                    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${dlcId}`);
                    if (response.ok) {
                        const data = await response.json();
                        const dlcData = data[dlcId];
                        
                        if (dlcData && dlcData.success && dlcData.data) {
                            results.push({
                                ID: dlcId.toString(),
                                Name: dlcData.data.name || `DLC ${dlcId}`,
                                Type: 'DLC'
                            });
                        } else {
                            // Fallback if API doesn't return data
                            results.push({
                                ID: dlcId.toString(),
                                Name: `DLC ${dlcId}`,
                                Type: 'DLC'
                            });
                        }
                    } else {
                        // Fallback if fetch fails
                        results.push({
                            ID: dlcId.toString(),
                            Name: `DLC ${dlcId}`,
                            Type: 'DLC'
                        });
                    }
                    
                    // Small delay every 10 requests to avoid rate limiting
                    if (i > 0 && i % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    // Add with fallback name
                    results.push({
                        ID: dlcId.toString(),
                        Name: `DLC ${dlcId}`,
                        Type: 'DLC'
                    });
                }
            }
        }
        
        // Apply type filter to results
        const finalResults = applyTypeFilterToResults(results);

        // Update window.getAppData and display results
        window.getAppData = finalResults;
        displayAppList(finalResults);
        
        // Save to localStorage for persistence
        saveAppIDSearchToCache(appID, results);
        
        showNotification(`Found ${results.length} items for App ID ${appID} (${gameInfo.name})`, "success");
        
    } catch (error) {
        console.error('Error fetching app details:', error);
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100 text-danger" style="font-weight: 400; padding: 10px;"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error fetching app details</div>';
        }
        
        if (error.message.includes('CORS') || error.name === 'TypeError') {
            showNotification("CORS restriction: Consider running as browser extension or using proxy", "warning");
        } else {
            showNotification("Error fetching app details", "danger");
        }
    }
}

// SteamAPI mode now delegates to Steam Store search
async function performSteamAPISearch(searchTerm) {
    console.log(`SteamAPI mode search delegated to Steam Store for: "${searchTerm}"`);
    await performSteamStoreSearch(searchTerm);
}

// Perform Steam Store search by scraping the website
async function performSteamStoreSearch(searchTerm) {
    console.log(`Performing Steam Store search for: "${searchTerm}"`);
    
    // First, try to load from cache
    const cachedResults = loadSteamStoreResultsFromCache(searchTerm);
    if (cachedResults && cachedResults.length > 0) {
        
        // Update window.getAppData
        window.getAppData = cachedResults;
        
        // Display the cached results
        displayAppList(cachedResults);
        
        // Show notification that results were loaded from cache
        showNotification(`Loaded ${cachedResults.length} cached Steam Store results for "${searchTerm}"`, "info");
        
        return;
    }
    
    // Show loading animation
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = `<div class="d-flex justify-content-center align-items-center w-100" style="padding: 20px;">
            <img src="steam.gif" alt="Searching Steam Store..." title="Searching Steam Store..." width="64" height="64" style="opacity: 0.8;">
        </div>`;
    }
    
    try {
        // Search for games and DLCs from Steam Store
        const results = await searchSteamStore(searchTerm);
        
        if (results.length === 0) {
            if (getAppList) {
                getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;"><i class="bi bi-search me-2"></i>No matching apps found</div>';
            }
            showNotification(`No apps found matching "${searchTerm}"`, "warning");
            return;
        }
        
        // Apply sorting based on dropdown selection
        const sortDropdown = document.getElementById('sortDropdown');
        const sortMode = sortDropdown ? sortDropdown.value : 'relevance';
        
        let sortedResults = applySteamStoreSort(results, sortMode, searchTerm);
        
    // Apply type filter after sorting (bring selected types to top)
    const sortedWithFilter = applyTypeFilterToResults(sortedResults);
    // Update window.getAppData for consistency
    window.getAppData = sortedWithFilter;
        
    // Display the results
    displayAppList(window.getAppData);
        
        showNotification(`Found ${results.length} apps from Steam Store`, "success");
        
        // Cache the successful search results
        saveSteamStoreResultsToCache(searchTerm, sortedResults);
        
    } catch (error) {
        console.error('Error performing Steam Store search:', error);
        
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100 text-danger" style="font-weight: 400; padding: 10px;"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error searching Steam Store</div>';
        }
        
        showNotification("Error searching Steam Store - may be blocked by CORS", "danger");
    }
}

// Search Steam Store and extract games and DLCs
async function searchSteamStore(searchTerm) {
    const results = [];
    
    try {
        // Step 1: Search for games on Steam Store
        const games = await searchSteamStoreGames(searchTerm);
        results.push(...games);
        
        // Step 2: For each game found, fetch its DLCs
        for (const game of games) {
            try {
                const dlcs = await fetchGameDLCs(game.ID, game.Name);
                results.push(...dlcs);
                
                // Add small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (dlcError) {
                // Continue with other games even if one fails
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('Error searching Steam Store:', error);
        throw error;
    }
}

// Search for games on Steam Store
async function searchSteamStoreGames(searchTerm) {
    const url = `https://store.steampowered.com/search/results?term=${encodeURIComponent(searchTerm)}&count=25&start=0&category1=998`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        return parseSteamStoreSearchResults(html);
        
    } catch (error) {
        console.error('Error fetching Steam Store search results:', error);
        throw error;
    }
}

// Parse Steam Store search results HTML
function parseSteamStoreSearchResults(html) {
    const games = [];
    
    try {
        // Remove all img tags, script tags, and style tags to prevent CSP violations and unwanted content loading
        const cleanHtml = html
            .replace(/<img[^>]*>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/src\s*=\s*["'][^"']*["']/gi, '')
            .replace(/background-image\s*:\s*url\([^)]*\)/gi, '');
        
        // Create a temporary DOM element to parse HTML (use createDocumentFragment for better isolation)
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        fragment.appendChild(tempDiv);
        tempDiv.innerHTML = cleanHtml;
        
        // Find all search result rows
        const searchRows = tempDiv.querySelectorAll('a.search_result_row');
        
        searchRows.forEach(row => {
            try {
                const appid = row.getAttribute('data-ds-appid');
                const titleElement = row.querySelector('span.title');
                const name = titleElement ? titleElement.textContent.trim() : '';
                
                if (appid && name) {
                    games.push({
                        ID: appid,
                        Name: name,
                        Type: 'Game'
                    });
                }
            } catch (parseError) {
            }
        });
        
        return games;
        
    } catch (error) {
        console.error('Error parsing Steam Store search results:', error);
        return [];
    }
}

// Fetch DLCs for a specific game
async function fetchGameDLCs(appid, gameName) {
    // Sanitize game name for URL (remove special characters)
    const sanitizedName = encodeURIComponent(gameName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_'));
    const dlcUrl = `https://store.steampowered.com/dlc/${appid}/${sanitizedName}/ajaxgetfilteredrecommendations?sort=newreleases&count=64&start=0`;
    
    try {
        const response = await fetch(dlcUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'en-US,en;q=0.5',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        return parseDLCResults(jsonData);
        
    } catch (error) {
        console.error(`Error fetching DLCs for game ${gameName} (${appid}):`, error);
        return []; // Return empty array on error to continue processing
    }
}

// Parse DLC results from Steam Store AJAX response
function parseDLCResults(jsonData) {
    const dlcs = [];
    
    try {
        if (!jsonData.results_html) {
            return dlcs;
        }
        
        // Remove all img tags, script tags, and style tags to prevent CSP violations and unwanted content loading
        const cleanHtml = jsonData.results_html
            .replace(/<img[^>]*>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/src\s*=\s*["'][^"']*["']/gi, '')
            .replace(/background-image\s*:\s*url\([^)]*\)/gi, '');
        
        // Create a temporary DOM element to parse the results HTML (use createDocumentFragment for better isolation)
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        fragment.appendChild(tempDiv);
        tempDiv.innerHTML = cleanHtml;
        
        // Find all recommendation elements (DLCs)
        const recommendations = tempDiv.querySelectorAll('div.recommendation');
        
        recommendations.forEach(rec => {
            try {
                const linkElement = rec.querySelector('a[data-ds-appid]');
                const nameElement = rec.querySelector('span.color_created');
                
                if (linkElement && nameElement) {
                    const dlcAppid = linkElement.getAttribute('data-ds-appid');
                    const dlcName = nameElement.textContent.trim();
                    
                    if (dlcAppid && dlcName) {
                        dlcs.push({
                            ID: dlcAppid,
                            Name: dlcName,
                            Type: 'DLC'
                        });
                    }
                }
            } catch (parseError) {
            }
        });
        
        return dlcs;
        
    } catch (error) {
        console.error('Error parsing DLC results:', error);
        return [];
    }
}

// Apply sorting to Steam Store search results
function applySteamStoreSort(results, sortMode, searchTerm = '') {
    let sortedResults = [...results];
    
    switch (sortMode) {
        case 'relevance':
            // Sort by relevance: Games first, then DLCs, with name relevance within each type
            sortedResults = results.sort((a, b) => {
                // Type priority: Game > DLC
                if (a.Type !== b.Type) {
                    if (a.Type === 'Game' && b.Type === 'DLC') return -1;
                    if (a.Type === 'DLC' && b.Type === 'Game') return 1;
                }
                
                // Within same type, sort by name relevance
                const termLower = searchTerm.toLowerCase();
                const aNameLower = a.Name.toLowerCase();
                const bNameLower = b.Name.toLowerCase();
                
                // Exact matches first
                const aExact = aNameLower === termLower;
                const bExact = bNameLower === termLower;
                if (aExact !== bExact) return aExact ? -1 : 1;
                
                // Starts with search term
                const aStarts = aNameLower.startsWith(termLower);
                const bStarts = bNameLower.startsWith(termLower);
                if (aStarts !== bStarts) return aStarts ? -1 : 1;
                
                // Contains search term (all should contain it, so sort alphabetically)
                return aNameLower.localeCompare(bNameLower);
            });
            break;
            
        case 'id':
            sortedResults = results.sort((a, b) => parseInt(a.ID) - parseInt(b.ID));
            break;
            
        case 'name':
            sortedResults = results.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
            break;
            
        case 'type':
            sortedResults = results.sort((a, b) => {
                // Sort by type first (Game before DLC), then by name
                if (a.Type !== b.Type) {
                    if (a.Type === 'Game' && b.Type === 'DLC') return -1;
                    if (a.Type === 'DLC' && b.Type === 'Game') return 1;
                }
                return a.Name.toLowerCase().localeCompare(b.Name.toLowerCase());
            });
            break;
            
        default:
            // Default to relevance sorting
            return applySteamStoreSort(results, 'relevance', searchTerm);
    }
    
    return sortedResults;
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
    const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
    
    if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
        // Perform real Steam API search
        await performSteamAPISearch(searchTerm);
    } else if (steamStoreBtn && steamStoreBtn.getAttribute('data-active') === 'true') {
        // Perform Steam Store search
        await performSteamStoreSearch(searchTerm);
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
    const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
    
    if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
        // Use real Steam API search
        await performSteamAPISearch(searchTerm);
    } else if (steamStoreBtn && steamStoreBtn.getAttribute('data-active') === 'true') {
        // Use Steam Store search
        await performSteamStoreSearch(searchTerm);
    } else {
        // If no search engine is active, show message
        const getAppList = document.getElementById('getAppList');
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;">Please select a search engine (Steam API, Steam Store, or SteamDB) first</div>';
        }
    }
}

// Display apps in the Get App list
function displayAppList(apps) {
    
    const getAppList = document.getElementById('getAppList');
    if (!getAppList) {
        return;
    }
    
    if (apps.length === 0) {
        getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;"><i class="bi bi-search me-2"></i>No matching apps found</div>';
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
            <div class="col-id text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem; white-space: nowrap; font-size: 0.75rem;"><span class="text-selectable">${app.ID}</span></div>
            <div class="col-name border-end border-dark-custom" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;"><span class="text-selectable">${app.Name}</span></div>
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

    // Apply any existing text filter from getAppListSearch
    applyGetAppListTextFilter();
}

// Filter app list based on getAppListSearch input
function applyGetAppListTextFilter() {
    const filterInput = document.getElementById('getAppListSearch');
    const getAppList = document.getElementById('getAppList');
    
    if (!filterInput || !getAppList) {
        return;
    }
    
    const filterText = filterInput.value.trim().toLowerCase();
    const appRows = getAppList.querySelectorAll('.app-row');
    
    if (!filterText) {
        // Show all rows if filter is empty
        appRows.forEach(row => {
            row.style.removeProperty('display');
            row.classList.remove('filtered-hidden');
        });
        // Remove empty state if it exists
        const emptyState = getAppList.querySelector('.filter-empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        return;
    }
    
    let visibleCount = 0;
    appRows.forEach((row, idx) => {
        // Get the name from the col-name div only
        const nameCell = row.querySelector('.col-name');
        const idCell = row.querySelector('.col-id');
        
        if (nameCell) {
            const nameText = nameCell.textContent.toLowerCase();
            const idText = idCell ? idCell.textContent.toLowerCase() : '';
            const searchableText = `${nameText} ${idText}`;
            
            const matches = searchableText.includes(filterText);
            
            if (matches) {
                row.style.removeProperty('display');
                row.classList.remove('filtered-hidden');
                visibleCount++;
            } else {
                row.style.setProperty('display', 'none', 'important');
                row.classList.add('filtered-hidden');
            }
        }
    });
    
    // Show empty state if no matches
    if (visibleCount === 0 && appRows.length > 0) {
        // Create or update empty state message
        let emptyState = getAppList.querySelector('.filter-empty-state');
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'filter-empty-state small p-2 text-center w-100 text-muted';
            emptyState.style.fontWeight = '400';
            emptyState.style.padding = '10px';
            getAppList.appendChild(emptyState);
        }
        emptyState.textContent = `No results matching "${filterInput.value}"`;
        emptyState.style.display = 'block';
    } else {
        // Remove empty state if it exists
        const emptyState = getAppList.querySelector('.filter-empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }
}

// Add click handlers for app row selection
function addAppRowClickHandlers() {
    document.querySelectorAll('.app-row').forEach((row, index) => {
        row.addEventListener('click', function(e) {
            // Don't toggle if clicking directly on checkbox
            if (e.target.type === 'checkbox') return;
            
            // Don't toggle if clicking on ID column (entire column is text-selectable)
            if (e.target.closest('.col-id')) return;
            
            // Don't toggle if clicking on text-selectable spans in Name column
            if (e.target.classList.contains('text-selectable')) return;
            
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
    
    // Show notification for Get App List
    if (selectedCount > 0) {
        showSelectionNotification(selectedCount, true);
    }
}

// Show selection notification (shared function)
function showSelectionNotification(count, isGetAppList = false) {
    const notificationId = isGetAppList ? 'selectionNotification' : 'gamesSelectionNotification';
    const countId = isGetAppList ? 'selectionCount' : 'gamesSelectionCount';

    const notification = document.getElementById(notificationId);
    const countSpan = document.getElementById(countId);

    if (notification && countSpan) {
        countSpan.textContent = count;

        // Show notification only if there are selected items
        notification.style.opacity = count > 0 ? '1' : '0';
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

// Initialize sort dropdown functionality
function initializeSortDropdown() {
    const sortDropdown = document.getElementById('sortDropdown');
    if (!sortDropdown) {
        return;
    }
    
    sortDropdown.addEventListener('change', function() {
        const selectedSort = this.value;
        
        // Sync with app sort state and update header indicators
        if (typeof appSortState !== 'undefined') {
            if (selectedSort === 'relevance') {
                // Clear all header sorting indicators for relevance
                appSortState.column = null;
                appSortState.direction = 'asc';
                clearAppHeaderSortIndicators();
            } else {
                // Map dropdown values to header sort columns
                const columnMapping = {
                    'id': 'ID',
                    'name': 'Name', 
                    'type': 'Type'
                };
                
                appSortState.column = columnMapping[selectedSort];
                appSortState.direction = 'asc'; // Default to ascending when changing sort type
                
                // Update header sort indicators
                if (typeof updateAppSortIndicators === 'function') {
                    updateAppSortIndicators();
                }
            }
        }
        
        // Re-run search with new sort order if there are current results
        if (window.getAppData && window.getAppData.length > 0) {
            const searchInput = document.getElementById('getAppSearch');
            if (searchInput && searchInput.value.trim()) {
                const steamBtn = document.getElementById('steamSearchBtn');
                const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
                
                if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
                    performSteamAPISearch(searchInput.value.trim());
                } else if (steamStoreBtn && steamStoreBtn.getAttribute('data-active') === 'true') {
                    performSteamStoreSearch(searchInput.value.trim());
                }
            }
        }
    });
}

// Clear all header sorting indicators for app list
function clearAppHeaderSortIndicators() {
    // Reset all header styles
    document.querySelectorAll('[data-app-sort]').forEach(header => {
        header.style.fontWeight = 'normal';
        header.style.color = '#f8f9fa'; // text-light
    });
    
    // Remove all existing sort indicators
    document.querySelectorAll('.app-sort-indicator').forEach(indicator => {
        indicator.remove();
    });
}

// Sync dropdown when header is clicked
function syncDropdownWithHeader(column) {
    const sortDropdown = document.getElementById('sortDropdown');
    if (!sortDropdown) return;
    
    // Map header columns to dropdown values
    const dropdownMapping = {
        'ID': 'id',
        'Name': 'name',
        'Type': 'type'
    };
    
    const dropdownValue = dropdownMapping[column];
    if (dropdownValue && sortDropdown.value !== dropdownValue) {
        sortDropdown.value = dropdownValue;
    }
}

// Function to restore search state from localStorage
function restoreSearchState() {
    // Restore search input
    const savedQuery = localStorage.getItem('searchQuery');
    const searchInput = document.getElementById('getAppSearch');
    
    if (savedQuery) {
        if (typeof setInputValue === 'function') {
            if (searchInput) setInputValue(searchInput, savedQuery);
        } else {
            if (searchInput) searchInput.value = savedQuery;
        }
    }
    
    // Restore active search engine
    const savedEngine = localStorage.getItem('activeSearchEngine');
    if (savedEngine) {
        const engineBtn = document.getElementById(savedEngine);
        if (engineBtn) {
            // Activate the saved button
            engineBtn.setAttribute('data-active', 'true');
            engineBtn.classList.remove('btn-secondary');
            engineBtn.classList.add('btn-primary');
            
            // Update search info and show appropriate search bars
            const searchInfo = document.getElementById('searchInfo');
            const activeSearchEngine = document.getElementById('activeSearchEngine');
            const searchBtn = document.getElementById('searchBtn');
            const singleSearchBar = document.getElementById('singleSearchBar');
            const dualSearchBar = document.getElementById('dualSearchBar');
            
            if (searchInfo && activeSearchEngine) {
                let searchEngineName = engineBtn.textContent.trim();
                if (savedEngine === 'steamSearchBtn') {
                    searchEngineName += " (Slower)";
                    // Switch to dual mode for SteamAPI
                    const singleModeSearch = document.getElementById('singleModeSearch');
                    const dualModeSearch = document.getElementById('dualModeSearch');
                    const searchBtnAppID = document.getElementById('searchBtnAppID');

                    if (singleModeSearch) singleModeSearch.style.display = 'none';
                    if (dualModeSearch) {
                        dualModeSearch.classList.remove('d-none');
                        dualModeSearch.classList.add('d-block');
                    }

                    // Enable dual mode button
                    if (searchBtnAppID) searchBtnAppID.disabled = false;
                    if (searchBtn) searchBtn.disabled = true;
                } else {
                    if (savedEngine === 'steamstoreSearchBtn') {
                        searchEngineName += "";
                    }
                    // Switch to single mode for other engines
                    const singleModeSearch = document.getElementById('singleModeSearch');
                    const dualModeSearch = document.getElementById('dualModeSearch');

                    if (singleModeSearch) singleModeSearch.style.display = 'flex';
                    if (dualModeSearch) {
                        dualModeSearch.classList.remove('d-block');
                        dualModeSearch.classList.add('d-none');
                    }

                    // Enable single mode button
                    if (searchBtn) searchBtn.disabled = false;
                }
                
                searchInfo.style.display = 'block';
                activeSearchEngine.textContent = searchEngineName;
                
                // Show/Hide enter hint: only visible for SteamAPI mode
                const enterHint = document.getElementById('enterHint');
                if (enterHint) {
                    if (savedEngine === 'steamSearchBtn') {
                        enterHint.style.display = 'block';
                    } else {
                        enterHint.style.display = 'none';
                    }
                }
            }
        }
    }
}

// ------------------ Type filter helpers ------------------
// Initialize type filter UI events
function initializeTypeFilter() {
    // Update label initially
    updateTypeFilterLabel();

    const applyBtn = document.getElementById('typeFilterApply');
    const filterGame = document.getElementById('filterGame');
    const filterDLC = document.getElementById('filterDLC');

    // Toggle behavior for dropdown button (works without Bootstrap JS)
    const toggleBtn = document.getElementById('typeFilterBtn');
    const menu = document.getElementById('typeFilterDropdown');
    if (toggleBtn && menu) {
        // prevent default Bootstrap reliance and implement custom toggle
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('show');
            // close any other open dropdown menus
            document.querySelectorAll('.dropdown-menu.show').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });
            menu.classList.toggle('show', !isOpen);
            toggleBtn.setAttribute('aria-expanded', String(!isOpen));
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) {
                menu.classList.remove('show');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                menu.classList.remove('show');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Prevent clicks inside menu from bubbling and immediately closing it
        menu.addEventListener('click', (e) => e.stopPropagation());
    }

    if (filterGame) filterGame.addEventListener('change', onTypeFilterChange);
    if (filterDLC) filterDLC.addEventListener('change', onTypeFilterChange);

    // Restore saved filter state (if any)
    try {
        const saved = localStorage.getItem(TYPE_FILTER_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (filterGame && typeof parsed.game === 'boolean') filterGame.checked = parsed.game;
            if (filterDLC && typeof parsed.dlc === 'boolean') filterDLC.checked = parsed.dlc;
            // Update label and apply immediately
            updateTypeFilterLabel();
            if (window.getAppData && Array.isArray(window.getAppData)) {
                window.getAppData = applyTypeFilterToResults(window.getAppData);
                displayAppList(window.getAppData);
            }
        }
    } catch (e) {
    }
}

function onTypeFilterChange() {
    updateTypeFilterLabel();
    // Live-apply when checkbox toggled
    if (window.getAppData && Array.isArray(window.getAppData)) {
        window.getAppData = applyTypeFilterToResults(window.getAppData);
        displayAppList(window.getAppData);
    }
    // Persist the selection
    try {
        const gameCb = document.getElementById('filterGame');
        const dlcCb = document.getElementById('filterDLC');
        const state = { game: !!(gameCb && gameCb.checked), dlc: !!(dlcCb && dlcCb.checked) };
        localStorage.setItem(TYPE_FILTER_KEY, JSON.stringify(state));
    } catch (e) {
    }
}

function getSelectedTypes() {
    const types = [];
    const gameCb = document.getElementById('filterGame');
    const dlcCb = document.getElementById('filterDLC');
    if (gameCb && gameCb.checked) types.push('Game');
    if (dlcCb && dlcCb.checked) types.push('DLC');
    return types;
}

function updateTypeFilterLabel() {
    const valueEl = document.getElementById('typeFilterValue');
    if (!valueEl) return;
    const selected = getSelectedTypes();
    if (selected.length === 0) {
        valueEl.textContent = '(None)';
    } else if (selected.length === 2) {
        valueEl.textContent = '(All)';
    } else {
        valueEl.textContent = `(${selected[0]})`;
    }
}

// Given an array of results that are already sorted by the chosen Sort By,
// move items whose Type is selected in the filter to the very top, preserving
// the relative order (stable partition).
function applyTypeFilterToResults(results) {
    if (!Array.isArray(results) || results.length === 0) return results;
    const selectedTypes = getSelectedTypes();
    // If no filters selected, return original results
    if (!selectedTypes || selectedTypes.length === 0) return results;

    const matching = [];
    const others = [];
    results.forEach(item => {
        if (selectedTypes.includes(item.Type)) matching.push(item);
        else others.push(item);
    });

    return [...matching, ...others];
}