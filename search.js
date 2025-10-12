// Search functionality for the GreenLuma Manager

/**  
  Search Engine API References
    1. https://api.steampowered.com/ISteamApps/GetAppList/v2/
    2. https://store.steampowered.com/api/appdetails?appids=${appID}
**/


// Steam API cache and data storage
let steamAppsList = null;
let steamAppsCache = new Map();
let isLoadingSteamApps = false;

// Search results cache configuration
const SEARCH_CACHE_KEY = 'greenlumaSearchCache';
const STEAMSTORE_CACHE_KEY = 'greenlumaSteamStoreCache';
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
        getAppList.innerHTML = '<div class="small p-2 text-center" style="color: #ffffff; font-weight: 400; padding: 10px;">Use the search bar above to find apps</div>';
    }
    
    // Preload Steam apps list when page loads
    preloadSteamAppsList();
    
    // Initialize down button functionality
    initializeDownButton();
    
    // Initialize sort dropdown functionality
    initializeSortDropdown();
    
    // Initialize type filter UI
    initializeTypeFilter();
    
    // Restore saved search state
    restoreSearchState();
    
    // Try to restore cached search results
    restoreCachedSearchResults();
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

function filterAppsByName(apps, searchTerm, sortMode = 'relevance') {
    if (!apps || !searchTerm) return [];
    
    const term = searchTerm.toLowerCase();
    
    // First, filter all apps that match either name or ID
    const matchingApps = apps.filter(app => {
        const appName = app.name ? app.name.toLowerCase() : '';
        const appId = app.appid ? app.appid.toString() : '';
        return appName.includes(term) || appId.includes(term);
    });
    
    // Apply sorting based on sort mode
    switch (sortMode) {
        case 'relevance':
            // Separate results into different priority groups for relevance sorting
            const idMatches = [];
            const startsWithName = [];
            const containsName = [];
            
            matchingApps.forEach(app => {
                const appName = app.name ? app.name.toLowerCase() : '';
                const appId = app.appid ? app.appid.toString() : '';
                
                // Check if ID matches (exact or partial) - HIGHEST PRIORITY
                if (appId.includes(term)) {
                    idMatches.push(app);
                }
                // Check if name starts with search term - HIGH PRIORITY
                else if (appName.startsWith(term)) {
                    startsWithName.push(app);
                }
                // Check if name contains search term - LOWER PRIORITY
                else if (appName.includes(term)) {
                    containsName.push(app);
                }
            });
            
            // Sort each group
            const sortByName = (a, b) => {
                const nameA = a.name ? a.name.toLowerCase() : '';
                const nameB = b.name ? b.name.toLowerCase() : '';
                return nameA.localeCompare(nameB);
            };
            
            // Sort ID matches by ID (ascending)
            idMatches.sort((a, b) => parseInt(a.appid) - parseInt(b.appid));
            // Sort name groups alphabetically
            startsWithName.sort(sortByName);
            containsName.sort(sortByName);
            
            // Return results in priority order: ID matches, starts with, then contains
            return [...idMatches, ...startsWithName, ...containsName];
            
        case 'id':
            // Sort numerically by App ID
            return matchingApps.sort((a, b) => parseInt(a.appid) - parseInt(b.appid));
            
        case 'name':
            // Sort alphabetically (A-Z)
            return matchingApps.sort((a, b) => {
                const nameA = a.name ? a.name.toLowerCase() : '';
                const nameB = b.name ? b.name.toLowerCase() : '';
                return nameA.localeCompare(nameB);
            });
            
        case 'type':
            // Note: Type sorting will be applied after getting app details
            // For now, sort by name as placeholder
            return matchingApps.sort((a, b) => {
                const nameA = a.name ? a.name.toLowerCase() : '';
                const nameB = b.name ? b.name.toLowerCase() : '';
                return nameA.localeCompare(nameB);
            });
            
        default:
            return matchingApps;
    }
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

// Search results cache functions
function saveSearchResultsToCache(searchTerm, results) {
    try {
        const cacheData = {
            searchTerm: searchTerm.toLowerCase(),
            results: results,
            timestamp: Date.now(),
            steamAppsListLength: steamAppsList ? steamAppsList.length : 0
        };
        
        localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cacheData));
        console.log(`Cached search results for "${searchTerm}" with ${results.length} results`);
    } catch (error) {
        console.warn('Failed to cache search results:', error);
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
            console.log('Search cache expired, removing...');
            localStorage.removeItem(SEARCH_CACHE_KEY);
            return null;
        }
        
        // Check if Steam apps list size has changed significantly (indicates new data)
        if (steamAppsList && Math.abs(steamAppsList.length - cache.steamAppsListLength) > 1000) {
            console.log('Steam apps list size changed significantly, invalidating cache...');
            localStorage.removeItem(SEARCH_CACHE_KEY);
            return null;
        }
        
        console.log(`Loaded cached search results for "${searchTerm}" with ${cache.results.length} results`);
        return cache.results;
    } catch (error) {
        console.warn('Failed to load cached search results:', error);
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
        console.log(`Cached Steam Store search results for "${searchTerm}" with ${results.length} results`);
    } catch (error) {
        console.warn('Failed to cache Steam Store search results:', error);
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
            console.log('Steam Store cache expired, removing...');
            localStorage.removeItem(STEAMSTORE_CACHE_KEY);
            return null;
        }
        
        console.log(`Loaded cached Steam Store search results for "${searchTerm}" with ${cache.results.length} results`);
        return cache.results;
    } catch (error) {
        console.warn('Failed to load cached Steam Store search results:', error);
        localStorage.removeItem(STEAMSTORE_CACHE_KEY);
        return null;
    }
}

function clearSteamStoreCacheOnSearchChange() {
    // Clear Steam Store cache when search input changes
    try {
        localStorage.removeItem(STEAMSTORE_CACHE_KEY);
        console.log('Cleared Steam Store cache due to search change');
    } catch (error) {
        console.warn('Failed to clear Steam Store cache:', error);
    }
}

function clearAllSearchCaches() {
    // Clear both Steam API and Steam Store caches
    try {
        localStorage.removeItem(SEARCH_CACHE_KEY);
        localStorage.removeItem(STEAMSTORE_CACHE_KEY);
        console.log('Cleared all search caches');
    } catch (error) {
        console.warn('Failed to clear all search caches:', error);
    }
}

// Debug function to check cache status (accessible from browser console)
function debugCacheStatus() {
    const steamApiCache = localStorage.getItem(SEARCH_CACHE_KEY);
    const steamStoreCache = localStorage.getItem(STEAMSTORE_CACHE_KEY);
    
    console.log('=== Cache Status ===');
    
    if (steamApiCache) {
        try {
            const apiData = JSON.parse(steamApiCache);
            const ageHours = (Date.now() - apiData.timestamp) / (1000 * 60 * 60);
            console.log(`Steam API Cache: "${apiData.searchTerm}" (${apiData.results.length} results, ${ageHours.toFixed(1)}h old)`);
        } catch (e) {
            console.log('Steam API Cache: Invalid data');
        }
    } else {
        console.log('Steam API Cache: Empty');
    }
    
    if (steamStoreCache) {
        try {
            const storeData = JSON.parse(steamStoreCache);
            const ageHours = (Date.now() - storeData.timestamp) / (1000 * 60 * 60);
            console.log(`Steam Store Cache: "${storeData.searchTerm}" (${storeData.results.length} results, ${ageHours.toFixed(1)}h old)`);
        } catch (e) {
            console.log('Steam Store Cache: Invalid data');
        }
    } else {
        console.log('Steam Store Cache: Empty');
    }
    
    console.log('===================');
}

// Make debug function globally available
window.debugCacheStatus = debugCacheStatus;

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
        console.log(`Restoring ${cachedResults.length} cached Steam Store search results for "${searchTerm}"`);
        
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
    const searchInputUniversal = document.getElementById('getAppSearchUniversal');
    const steamBtn = document.getElementById('steamSearchBtn');
    const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
    
    // Get search term from appropriate input
    let searchTerm = '';
    if (steamBtn && steamBtn.getAttribute('data-active') === 'true') {
        // For SteamAPI, check the universal search input
        if (searchInputUniversal) {
            searchTerm = searchInputUniversal.value.trim();
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
            console.log(`Restoring ${cachedResults.length} cached Steam API search results for "${searchTerm}"`);
            
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
        console.error("Search buttons or elements not found");
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
        const searchBtnUniversal = document.getElementById('searchBtnUniversal');
        const searchBtnAppID = document.getElementById('searchBtnAppID');
            
        if (btn.id === 'steamSearchBtn') {
            // Switch to dual mode for SteamAPI
            if (singleModeSearch) singleModeSearch.style.display = 'none';
            if (dualModeSearch) {
                dualModeSearch.classList.remove('d-none');
                dualModeSearch.classList.add('d-block');
            }
            // Enable dual mode buttons
            if (searchBtnUniversal) searchBtnUniversal.disabled = false;
            if (searchBtnAppID) searchBtnAppID.disabled = false;
            // Copy text from single mode to universal search if it exists
            const universalInput = document.getElementById('getAppSearchUniversal');
            const searchInput = document.getElementById('getAppSearch');
            if (universalInput && searchInput) {
                universalInput.value = searchInput.value;
            }
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
        }
            
        // Get search engine name
        let searchEngineName = btn.textContent.trim();
        if (btn.id === 'steamSearchBtn') {
            searchEngineName += " (Faster)";
        } else if (btn.id === 'steamstoreSearchBtn') {
            searchEngineName += " (Slower)";
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
    const searchBtnUniversal = document.getElementById('searchBtnUniversal');
    const searchBtnAppID = document.getElementById('searchBtnAppID');
    if (searchBtnUniversal) searchBtnUniversal.disabled = true;
    if (searchBtnAppID) searchBtnAppID.disabled = true;
}

// Initialize search input functionality
function initializeSearchInput() {
    const searchInput = document.getElementById('getAppSearch');
    const searchBtn = document.getElementById('searchBtn');
    const searchInputUniversal = document.getElementById('getAppSearchUniversal');
    const searchBtnUniversal = document.getElementById('searchBtnUniversal');
    const searchInputAppID = document.getElementById('getAppSearchAppID');
    const searchBtnAppID = document.getElementById('searchBtnAppID');
    
    if (!searchInput || !searchBtn) {
        console.error("Search input or button not found");
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
    
    // Initialize dual search bar event handlers
    if (searchInputUniversal && searchBtnUniversal) {
        // Universal search button click
        searchBtnUniversal.addEventListener('click', function() {
            performUniversalSearch();
        });
        
        // Universal search on Enter key
        searchInputUniversal.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performUniversalSearch();
            }
        });
        
        // Universal search input handling
        let universalTypingTimer;
        searchInputUniversal.addEventListener('input', function() {
            clearTimeout(universalTypingTimer);
            universalTypingTimer = setTimeout(filterAppListByUniversalInput, 300);
            
            // Save search query to localStorage
            const query = this.value.trim();
            if (query) {
                localStorage.setItem('searchQuery', query);
            } else {
                localStorage.removeItem('searchQuery');
            }
        });
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
    
    // Filter results as user types (after small delay) - for single search bar
    let typingTimer;
    const doneTypingInterval = 300; // ms
    
    searchInput.addEventListener('input', function() {
        clearTimeout(typingTimer);
        
        // Clear Steam Store cache when search input changes
        const steamStoreBtn = document.getElementById('steamstoreSearchBtn');
        if (steamStoreBtn && steamStoreBtn.getAttribute('data-active') === 'true') {
            clearSteamStoreCacheOnSearchChange();
        }
        
        typingTimer = setTimeout(filterAppListByInput, doneTypingInterval);
        
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

// Perform universal search (left search bar in SteamAPI mode)
async function performUniversalSearch() {
    const searchInput = document.getElementById('getAppSearchUniversal');
    const getAppList = document.getElementById('getAppList');
    if (!searchInput || !getAppList) return;
    
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        getAppList.innerHTML = '<div class="small p-2 text-center" style="color: #ffffff; font-weight: 400; padding: 10px;">Use the search bar above to find apps</div>';
        return;
    }

    // Show loading animation
    getAppList.innerHTML = `<div class="d-flex justify-content-center align-items-center w-100" style="padding: 20px;">
        <img src="steam.gif" alt="Searching..." title="Searching..." width="64" height="64" style="opacity: 0.8;">
    </div>`;

    try {
        // Use the new universal search from utils.js
        const searchResult = await window.utils.universalSearch(searchTerm);
        
        if (!searchResult.success) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;"><i class="bi bi-search me-2"></i>No matching apps found</div>';
            showNotification(searchResult.message || 'No matching apps found', "warning");
            return;
        }

        // Update global app data and display results
        window.getAppData = searchResult.results;
        displayAppList(searchResult.results);

        // Show success notification
        const mainAppsCount = searchResult.results.filter(r => r.Type !== 'DLC').length;
        const dlcsCount = searchResult.results.filter(r => r.Type === 'DLC').length;
        showNotification(
            `Found ${mainAppsCount} apps with ${dlcsCount} DLCs`,
            "success"
        );

        // Cache the results
        saveSearchResultsToCache(searchTerm, searchResult.results);

    } catch (error) {
        console.error('Error in universal search:', error);
        getAppList.innerHTML = '<div class="small p-2 text-center w-100 text-danger" style="font-weight: 400; padding: 10px;"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error searching Steam</div>';
        
        if (error.message.includes('CORS') || error.name === 'TypeError') {
            showNotification("CORS restriction: Consider running as browser extension or using proxy", "warning");
        } else {
            showNotification("Error searching Steam", "danger");
        }
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
    
    // Show loading animation
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = `<div class="d-flex justify-content-center align-items-center w-100" style="padding: 20px;">
            <img src="steam.gif" alt="Searching App ID..." title="Searching App ID..." width="64" height="64" style="opacity: 0.8;">
        </div>`;
    }
    
    try {
        // Step 1: Fetch app details from Steam Store API
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appID}`);
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
        results.push({
            ID: gameInfo.steam_appid.toString(),
            Name: gameInfo.name,
            Type: gameInfo.type.charAt(0).toUpperCase() + gameInfo.type.slice(1)
        });
        
        // Step 2: If there are DLCs, fetch their details from Steam Apps List
        if (gameInfo.dlc && gameInfo.dlc.length > 0) {
            console.log(`Found ${gameInfo.dlc.length} DLCs, fetching their details...`);
            
            // Ensure Steam apps list is loaded
            if (!steamAppsList) {
                if (isLoadingSteamApps) {
                    showNotification("Loading Steam apps list, please wait...", "info");
                    while (isLoadingSteamApps) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } else {
                    showNotification("Loading Steam apps list...", "info");
                    await preloadSteamAppsList();
                }
            }
            
            if (steamAppsList && steamAppsList.length > 0) {
                // Create a map for faster lookup
                const appsMap = new Map(steamAppsList.map(app => [app.appid, app.name]));
                
                // Add DLCs to results
                gameInfo.dlc.forEach(dlcId => {
                    const dlcName = appsMap.get(dlcId);
                    if (dlcName) {
                        results.push({
                            ID: dlcId.toString(),
                            Name: dlcName,
                            Type: 'DLC'
                        });
                    }
                });
                
                console.log(`Added ${gameInfo.dlc.length} DLCs to results`);
            } else {
                showNotification("Could not load Steam apps list for DLC details", "warning");
            }
        }
        
        // Apply type filter to results
        const finalResults = applyTypeFilterToResults(results);
        
        // Update window.getAppData and display results
        window.getAppData = finalResults;
        displayAppList(finalResults);
        
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

// Filter app list by universal input (for the left search bar in SteamAPI mode)
function filterAppListByUniversalInput() {
    const searchInput = document.getElementById('getAppSearchUniversal');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        const getAppList = document.getElementById('getAppList');
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center" style="color: #ffffff; font-weight: 400; padding: 10px;">Use the search bar above to find apps</div>';
        }
        return;
    }
    
    // Perform a new search instead of filtering existing results
    performSteamAPISearch(searchTerm);
}

// Perform Steam API search and display results
async function performSteamAPISearch(searchTerm) {
    console.log(`Performing Steam API search for: "${searchTerm}"`);
    
    // First, try to load from cache
    const cachedResults = loadSearchResultsFromCache(searchTerm);
    if (cachedResults && cachedResults.length > 0) {
            console.log(`Using cached results for "${searchTerm}"`);
            
            // Update window.getAppData
            window.getAppData = cachedResults;
            
            // Display the cached results
            displayAppList(cachedResults);
            
            // Show notification that results were loaded from cache
            showNotification(`Loaded ${cachedResults.length} cached results for "${searchTerm}"`, "info");
        
        return;
    }
    
    // If no cache, proceed with API search
    console.log(`No cache found, proceeding with API search for: "${searchTerm}"`);
    
    // Show loading animation
    const getAppList = document.getElementById('getAppList');
    if (getAppList) {
        getAppList.innerHTML = `<div class="d-flex justify-content-center align-items-center w-100" style="padding: 20px;">
            <img src="steam.gif" alt="Searching Steam API..." title="Searching Steam API..." width="64" height="64" style="opacity: 0.8;">
        </div>`;
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
            getAppList.innerHTML = '<div class="small p-2 text-center w-100 text-danger" style="font-weight: 400; padding: 10px;"><i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to load Steam apps list</div>';
        }
        showNotification("Failed to load Steam apps list", "danger");
        return;
    }
    
    // Filter apps by search term with selected sort mode
    const sortDropdown = document.getElementById('sortDropdown');
    const sortMode = sortDropdown ? sortDropdown.value : 'relevance';
    const filteredApps = filterAppsByName(steamAppsList, searchTerm, sortMode);
    
    if (filteredApps.length === 0) {
        if (getAppList) {
            getAppList.innerHTML = '<div class="small p-2 text-center w-100" style="color: #ffffff; font-weight: 400; padding: 10px;"><i class="bi bi-search me-2"></i>No matching apps found</div>';
        }
        showNotification(`No apps found matching "${searchTerm}"`, "warning");
        return;
    }
    
    // Show all results - no limit
    const limitedResults = filteredApps;
    
    showNotification(`Found ${filteredApps.length} apps`, "success");
    
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
        
        // Apply final sorting based on dropdown selection
        const sortDropdown = document.getElementById('sortDropdown');
        const sortMode = sortDropdown ? sortDropdown.value : 'relevance';
        
        let finalResults = formattedResults;
        
        switch (sortMode) {
            case 'relevance':
                // Already sorted by relevance in filterAppsByName, keep order
                break;
                
            case 'id':
                // Sort numerically by ID
                finalResults = formattedResults.sort((a, b) => parseInt(a.ID) - parseInt(b.ID));
                break;
                
            case 'name':
                // Sort alphabetically by name
                finalResults = formattedResults.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
                break;
                
            case 'type':
                // Sort by Game/DLC priority (Game first), then alphabetically by name
                finalResults = formattedResults.sort((a, b) => {
                    const typeA = a.Type.toLowerCase();
                    const typeB = b.Type.toLowerCase();
                    
                    // Game comes before DLC and other types
                    if (typeA === 'game' && typeB !== 'game') return -1;
                    if (typeA !== 'game' && typeB === 'game') return 1;
                    if (typeA === 'dlc' && typeB !== 'dlc' && typeB !== 'game') return -1;
                    if (typeA !== 'dlc' && typeA !== 'game' && typeB === 'dlc') return 1;
                    
                    // If same type, sort alphabetically by name
                    if (typeA === typeB) {
                        return a.Name.toLowerCase().localeCompare(b.Name.toLowerCase());
                    }
                    
                    // Otherwise sort alphabetically by type
                    return typeA.localeCompare(typeB);
                });
                break;
        }
        
    // Apply type filter after sorting (bring selected types to top)
    const finalWithFilter = applyTypeFilterToResults(finalResults);

    // Update window.getAppData for consistency
    window.getAppData = finalWithFilter;
        
    // Display the results based on current sort mode
    const currentSortDropdown = document.getElementById('sortDropdown');
    const currentSortMode = currentSortDropdown ? currentSortDropdown.value : 'relevance';
        
        // Update appSortState to match dropdown selection
        if (typeof appSortState !== 'undefined') {
            if (currentSortMode === 'relevance') {
                appSortState.column = null;
                appSortState.direction = 'asc';
            } else {
                const columnMapping = {
                    'id': 'ID',
                    'name': 'Name',
                    'type': 'Type'
                };
                appSortState.column = columnMapping[currentSortMode];
                appSortState.direction = 'asc';
            }
        }
        
        // For relevance mode, results are already sorted, just display them
        if (currentSortMode === 'relevance') {
            displayAppList(window.getAppData);
            // Clear header sort indicators for relevance mode
            if (typeof clearAppHeaderSortIndicators === 'function') {
                clearAppHeaderSortIndicators();
            }
        } else {
            // For other modes, apply additional sorting and update indicators
            if (typeof getSortedApps === 'function' && typeof appSortState !== 'undefined' && appSortState.column) {
                const sortedResults = getSortedApps(window.getAppData, appSortState.column, appSortState.direction);
                displayAppList(sortedResults);
                
                // Update header sort indicators
                if (typeof updateAppSortIndicators === 'function') {
                    updateAppSortIndicators();
                }
            } else {
                displayAppList(window.getAppData);
            }
        }
        
        console.log(`Displayed ${formattedResults.length} Steam API results for "${searchTerm}"`);
        
    // Cache the successful search results (include filter ordering)
    saveSearchResultsToCache(searchTerm, finalWithFilter);
        
    } catch (error) {
        console.error('Error getting app details:', error);
        
        // Display basic results without type information
        const basicResults = limitedResults.map(app => ({
            ID: app.appid.toString(),
            Name: app.name,
            Type: 'Game' // Default fallback
        }));
        
        // Apply sorting even for basic results
        const fallbackSortDropdown = document.getElementById('sortDropdown');
        const fallbackSortMode = fallbackSortDropdown ? fallbackSortDropdown.value : 'relevance';
        
        let finalBasicResults = basicResults;
        
        switch (fallbackSortMode) {
            case 'id':
                finalBasicResults = basicResults.sort((a, b) => parseInt(a.ID) - parseInt(b.ID));
                break;
            case 'name':
                finalBasicResults = basicResults.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
                break;
            case 'type':
                // All are 'Game' type, so just sort by name
                finalBasicResults = basicResults.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
                break;
            // 'relevance' case is already handled by filterAppsByName
        }
        
        window.getAppData = finalBasicResults;
        displayAppList(finalBasicResults);
        
        showNotification(`Found ${basicResults.length} apps (details may be incomplete)`, "warning");
        
        // Cache the basic results as well
        saveSearchResultsToCache(searchTerm, finalBasicResults);
    }
}

// Perform Steam Store search by scraping the website
async function performSteamStoreSearch(searchTerm) {
    console.log(`Performing Steam Store search for: "${searchTerm}"`);
    
    // First, try to load from cache
    const cachedResults = loadSteamStoreResultsFromCache(searchTerm);
    if (cachedResults && cachedResults.length > 0) {
        console.log(`Using cached Steam Store results for "${searchTerm}" (${cachedResults.length} results)`);
        
        // Update window.getAppData
        window.getAppData = cachedResults;
        
        // Display the cached results
        displayAppList(cachedResults);
        
        // Show notification that results were loaded from cache
        showNotification(`Loaded ${cachedResults.length} cached Steam Store results for "${searchTerm}"`, "info");
        
        return;
    }
    
    // If no cache, proceed with Steam Store search
    console.log(`No cache found for "${searchTerm}", proceeding with fresh Steam Store search...`);
    
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
        
        console.log(`Displayed ${results.length} Steam Store results for "${searchTerm}"`);
        
        // Cache the successful search results
        console.log(`Caching ${sortedResults.length} Steam Store results for "${searchTerm}"`);
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
                console.warn(`Failed to fetch DLCs for game ${game.Name} (${game.ID}):`, dlcError);
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
                console.warn('Error parsing individual search result:', parseError);
            }
        });
        
        console.log(`Parsed ${games.length} games from Steam Store search results`);
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
                console.warn('Error parsing individual DLC result:', parseError);
            }
        });
        
        console.log(`Parsed ${dlcs.length} DLCs from Steam Store AJAX response`);
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
    console.log("displayAppList called with", apps.length, "apps");
    
    const getAppList = document.getElementById('getAppList');
    if (!getAppList) {
        console.error("Could not find getAppList element");
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

// Initialize sort dropdown functionality
function initializeSortDropdown() {
    const sortDropdown = document.getElementById('sortDropdown');
    if (!sortDropdown) {
        console.warn("Sort dropdown not found");
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
    const searchInputUniversal = document.getElementById('getAppSearchUniversal');
    
    if (savedQuery) {
        if (searchInput) searchInput.value = savedQuery;
        if (searchInputUniversal) searchInputUniversal.value = savedQuery;
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
                    searchEngineName += " (Faster)";
                    // Switch to dual mode for SteamAPI
                    const singleModeSearch = document.getElementById('singleModeSearch');
                    const dualModeSearch = document.getElementById('dualModeSearch');
                    const searchBtnUniversal = document.getElementById('searchBtnUniversal');
                    const searchBtnAppID = document.getElementById('searchBtnAppID');

                    if (singleModeSearch) singleModeSearch.style.display = 'none';
                    if (dualModeSearch) {
                        dualModeSearch.classList.remove('d-none');
                        dualModeSearch.classList.add('d-block');
                    }

                    // Copy search text and enable dual mode buttons
                    const universalInput = document.getElementById('getAppSearchUniversal');
                    if (universalInput && searchInput) {
                        universalInput.value = searchInput.value;
                    }
                    if (searchBtnUniversal) searchBtnUniversal.disabled = false;
                    if (searchBtnAppID) searchBtnAppID.disabled = false;
                    if (searchBtn) searchBtn.disabled = true;
                } else {
                    if (savedEngine === 'steamstoreSearchBtn') {
                        searchEngineName += " (Slower)";
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
        console.warn('Failed to restore type filter state:', e);
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
        console.warn('Failed to save type filter state:', e);
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