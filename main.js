// Load games data from localStorage only (no data.json fallback)
async function loadGamesData() {
    console.log("loadGamesData called");
    
    try {
        // Load from localStorage only
        const savedGames = localStorage.getItem('gamesData');
        let games = [];
        
        if (savedGames) {
            try {
                games = JSON.parse(savedGames);
                console.log("Loaded games from localStorage:", games.length);
                
                // Ensure backward compatibility: add missing links for existing games
                games = games.map(game => ({
                    ID: game.ID,
                    Name: game.Name,
                    Type: game.Type,
                    Priority: game.Priority,
                    SteamStoreLink: game.SteamStoreLink || (window.utils ? window.utils.generateSteamStoreLink(game.ID) : `https://store.steampowered.com/app/${game.ID}/`),
                    SteamDBLink: game.SteamDBLink || (window.utils ? window.utils.generateSteamDBLink(game.ID) : `https://steamdb.info/app/${game.ID}/`)
                }));
                
            } catch (parseError) {
                console.error("Error parsing saved games data:", parseError);
                games = []; // Reset to empty array if parsing fails
            }
        } else {
            console.log("No saved games found in localStorage, starting with empty list");
            games = []; // Start with empty array
        }
        
        // Validate games array
        if (!Array.isArray(games)) {
            console.error("Invalid games data format, resetting to empty array");
            games = [];
        }
        
        // Get priority start value
        const savedPriorityStart = parseInt(localStorage.getItem('priorityStart'));
        const priorityStart = isNaN(savedPriorityStart) ? 0 : savedPriorityStart;
        console.log("Loaded priority start value:", priorityStart);
        
        // Set the input field value
        const priorityStartInput = document.getElementById('priorityStart');
        if (priorityStartInput) {
            priorityStartInput.value = priorityStart;
        }
        
        // Handle empty games list
        if (games.length === 0) {
            console.log("No games data available, displaying empty state");
            window.gamesData = [];
            
            // Reset generated flag since list is empty
            if (typeof resetGeneratedFlag === 'function') {
                resetGeneratedFlag();
            }
            
            // Display empty state message
            const gamesList = document.getElementById('gamesList');
            if (gamesList) {
                gamesList.innerHTML = '<div class="text-light opacity-50 small p-3 text-center pe-none user-select-none">No games added yet. Use "Get App List" to search and add games with the Down button.</div>';
            }
            
            // Set initial sort state
            sortState.column = 'Priority';
            sortState.direction = 'asc';
            updateSortIndicators();
            
            console.log("Empty games list initialized");
            return;
        }
        
        // Deep clone to avoid mutation issues
        let sortedGames = JSON.parse(JSON.stringify(games));
        
        console.log("Processing priorities for", sortedGames.length, "games");
        
        // Check for existing priorities
        let hasPriorities = sortedGames.some(game => game.hasOwnProperty('Priority'));
        
        if (hasPriorities) {
            console.log("Some games have existing priorities");
        } else {
            console.log("No games have priorities, will assign based on ID order");
        }
        
        // First sort by existing priorities or IDs if no priorities
        sortedGames.sort((a, b) => {
            if (a.hasOwnProperty('Priority') && b.hasOwnProperty('Priority')) {
                return parseInt(a.Priority) - parseInt(b.Priority);
            } else if (!a.hasOwnProperty('Priority') && !b.hasOwnProperty('Priority')) {
                return parseInt(a.ID) - parseInt(b.ID);
            } else if (a.hasOwnProperty('Priority')) {
                return -1;
            } else {
                return 1;
            }
        });
        
        // Then assign priorities based on sort order and priorityStart
        sortedGames.forEach((game, index) => {
            game.Priority = priorityStart + index;
            console.log(`Assigned priority ${game.Priority} to ${game.Name} (ID: ${game.ID})`);
        });
        
        // Store globally for sorting
        window.gamesData = sortedGames;
        console.log("Stored", window.gamesData.length, "games in window.gamesData");
        
        // Reset generated flag since list has changed
        if (typeof resetGeneratedFlag === 'function') {
            resetGeneratedFlag();
        }
        
        // Save to ensure priorities are persisted
        saveGamesData(window.gamesData);
        
        // Display the games sorted by priority
        const displaySorted = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        console.log("Displaying games sorted by priority");
        
        // Set initial sort state
        sortState.column = 'Priority';
        sortState.direction = 'asc';
        
        // Display the games
        displayGames(displaySorted);
        updateSortIndicators();
        
        console.log("Games loaded and displayed with priority start:", priorityStart);
    } catch (error) {
        console.error('Error loading games data:', error);
        const gamesList = document.getElementById('gamesList');
        if (gamesList) {
            gamesList.innerHTML = '<div class="text-muted small p-2">Error loading games data</div>';
        }
    }
}

// Save games data to localStorage
function saveGamesData(games) {
    console.log("saveGamesData called");
    
    if (!games) {
        console.error('No games data provided for saving');
        return;
    }
    
    try {
        // Validate games data structure
        if (!Array.isArray(games)) {
            console.error('Games data is not an array:', games);
            return;
        }
        
        // Ensure all games have valid Priority values before saving
        games.forEach(game => {
            if (game.Priority === undefined || game.Priority === null) {
                console.warn(`Game ${game.Name} (ID: ${game.ID}) has no Priority, setting to 0`);
                game.Priority = 0;
            } else {
                // Ensure Priority is a number
                game.Priority = parseInt(game.Priority);
                if (isNaN(game.Priority)) {
                    console.warn(`Game ${game.Name} (ID: ${game.ID}) has invalid Priority, resetting to 0`);
                    game.Priority = 0;
                }
            }
        });
        
        // Validate by sorting to catch any NaN issues
        try {
            [...games].sort((a, b) => a.Priority - b.Priority);
        } catch (sortError) {
            console.error('Error validating priority sort:', sortError);
            // Fix the data - ensure all priorities are valid numbers
            games.forEach((game, index) => {
                game.Priority = index;
            });
        }
        
        console.log(`Saving ${games.length} games to localStorage`);
        localStorage.setItem('gamesData', JSON.stringify(games));
        console.log("Games data saved successfully");
    } catch (error) {
        console.error('Error saving games data:', error);
        // Try to handle quota exceeded errors
        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('localStorage quota exceeded, trying to free up space');
            // Try to clear some space
            localStorage.removeItem('lastSession'); // Example of removing less important data
            // Try again
            try {
                localStorage.setItem('gamesData', JSON.stringify(games));
                console.log('Saved games data after freeing up space');
            } catch (retryError) {
                console.error('Failed to save games data even after cleanup:', retryError);
            }
        }
    }
}

// Sorting state
let sortState = {
    column: 'Priority', // Default to Priority sorting
    direction: 'asc' // 'asc' or 'desc'
};

// Selection state tracking
let selectionState = {
    lastSelectedIndex: -1,
    selectedItems: new Set()
};

// Helper function to get sorted games based on column and direction
function getSortedGames(games, column, direction) {
    console.log(`getSortedGames called with column=${column}, direction=${direction}`);
    
    if (!games) {
        console.warn("No games provided for sorting");
        return [];
    }
    
    // Create a deep copy to avoid mutation issues
    const gamesToSort = JSON.parse(JSON.stringify(games));
    
    // Ensure all games have a valid Priority
    gamesToSort.forEach(game => {
        if (game.Priority === undefined || game.Priority === null) {
            console.warn(`Game ${game.Name} (ID: ${game.ID}) has no Priority, setting to 0`);
            game.Priority = 0;
        }
    });
    
    console.log(`Sorting ${gamesToSort.length} games by ${column} in ${direction} order`);
    
    return gamesToSort.sort((a, b) => {
        let valueA, valueB;
        
        switch(column) {
            case 'Priority':
                // Ensure we're comparing numbers
                valueA = parseInt(a.Priority);
                valueB = parseInt(b.Priority);
                
                // Handle NaN values
                if (isNaN(valueA)) valueA = 0;
                if (isNaN(valueB)) valueB = 0;
                break;
                
            case 'ID':
                valueA = parseInt(a.ID) || 0;
                valueB = parseInt(b.ID) || 0;
                break;
                
            case 'Name':
                valueA = (a.Name || '').toLowerCase();
                valueB = (b.Name || '').toLowerCase();
                break;
                
            case 'Type':
                // Special sorting for Type: Game comes before DLC
                valueA = (a.Type || '').toLowerCase();
                valueB = (b.Type || '').toLowerCase();
                
                // For Type sorting, prioritize "game" over "dlc"
                if (valueA === 'game' && valueB === 'dlc') {
                    return direction === 'asc' ? -1 : 1;
                } else if (valueA === 'dlc' && valueB === 'game') {
                    return direction === 'asc' ? 1 : -1;
                }
                break;
                
            default:
                console.warn(`Unknown sort column: ${column}`);
                return 0;
        }
        
        // Log some of the comparison values for debugging
        if (column === 'Priority') {
            console.log(`Comparing priorities: ${a.Name}(${valueA}) vs ${b.Name}(${valueB})`);
        }
        
        // For Type, if both are same or neither is game/dlc, do alphabetical
        if (column === 'Type' && valueA !== 'game' && valueA !== 'dlc' && valueB !== 'game' && valueB !== 'dlc') {
            if (direction === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        }
        
        // Standard comparison for non-Type columns or when Type values are same
        if (column !== 'Type' || valueA === valueB) {
            // For numeric values (Priority, ID)
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return direction === 'asc' ? valueA - valueB : valueB - valueA;
            }
            // For string values
            else {
                if (direction === 'asc') {
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                } else {
                    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
                }
            }
        }
        
        return 0;
    });
}

// Sort games data
function sortGames(column) {
    if (!window.gamesData) return;
    
    // Toggle direction if same column, otherwise start with ascending
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = column;
        sortState.direction = 'asc';
    }
    
    const sortedGames = getSortedGames(window.gamesData, column, sortState.direction);
    
    displayGames(sortedGames);
    updateSortIndicators();
}

// Update sort indicators in headers
function updateSortIndicators() {
    console.log(`Updating sort indicators: ${sortState.column} ${sortState.direction}`);
    
    // Reset all header styles first
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.style.fontWeight = 'normal';
        header.style.color = '#f8f9fa'; // text-light
    });
    
    // Remove all existing sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Add indicator to current sorted column
    if (sortState.column) {
        const headerCell = document.querySelector(`[data-sort="${sortState.column}"]`);
        if (headerCell) {
            // Make the sorted header more visible
            headerCell.style.fontWeight = 'bold';
            headerCell.style.color = '#6ea8fe'; // text-primary-custom
            
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.style.marginLeft = '5px';
            indicator.style.fontSize = '0.65rem';
            indicator.style.color = '#6ea8fe'; // text-primary-custom
            indicator.innerHTML = sortState.direction === 'asc' ? '▲' : '▼';
            
            headerCell.appendChild(indicator);
        }
    }
}

// Display games in the table
function displayGames(games) {
    console.log("displayGames called with", games.length, "games");
    
    const gamesList = document.getElementById('gamesList');
    if (!gamesList) {
        console.error("Could not find gamesList element");
        return;
    }
    
    gamesList.innerHTML = '';

    games.forEach((game, index) => {
        const isLast = index === games.length - 1;
        const borderClass = isLast ? '' : 'border-bottom border-dark-custom';
        const isDraggable = sortState.column === 'Priority' && sortState.direction === 'asc';
        
        // Ensure game has a Priority property with a valid value
        if (game.Priority === undefined || game.Priority === null) {
            console.warn(`Game ${game.Name} (ID: ${game.ID}) has no Priority, setting to ${index}`);
            game.Priority = index;
        }
        
        const gameRow = document.createElement('div');
        gameRow.className = `d-flex small ${borderClass} game-row`;
        gameRow.style.width = '100%';
        gameRow.style.padding = '0.15rem 0';
        gameRow.style.cursor = isDraggable ? 'move' : 'pointer';
        gameRow.setAttribute('data-game-id', game.ID);
        gameRow.setAttribute('data-priority', game.Priority);
        
        // Reset drag properties
        gameRow.draggable = false;
        gameRow.style.userSelect = 'auto';
        
        // Remove any existing drag event listeners
        gameRow.removeEventListener('dragstart', handleDragStart);
        gameRow.removeEventListener('dragover', handleDragOver);
        gameRow.removeEventListener('dragleave', handleDragLeave);
        gameRow.removeEventListener('drop', handleDrop);
        gameRow.removeEventListener('dragend', handleDragEnd);
        
        if (isDraggable) {
            gameRow.draggable = true;
            gameRow.addEventListener('dragstart', handleDragStart);
            gameRow.addEventListener('dragover', handleDragOver);
            gameRow.addEventListener('dragleave', handleDragLeave);
            gameRow.addEventListener('drop', handleDrop);
            gameRow.addEventListener('dragend', handleDragEnd);
            gameRow.style.userSelect = 'none';
            // gameRow.title = 'Drag to reorder priority';
        } else {
            gameRow.title = '';
        }
        
        // Explicitly ensure that the Priority is a number
        const priorityValue = parseInt(game.Priority);
        
        gameRow.innerHTML = `
            <div class="col-checkbox text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem;">
                <input type="checkbox" class="form-check-input form-check-input-sm game-checkbox" data-game-id="${game.ID}" style="margin: 0;" ${selectionState.selectedItems.has(game.ID.toString()) ? 'checked' : ''}>
            </div>
            <div class="col-priority text-center border-end border-dark-custom" style="padding: 0.15rem 0.25rem;">
                <input type="number" class="priority-input" data-game-id="${game.ID}" value="${priorityValue}" 
                       style="width: 40px; height: 20px; font-size: 0.7rem; text-align: center; background: transparent; border: 1px solid #495057; color: #f8f9fa; border-radius: 2px;" 
                       min="0" max="999" ${isDraggable ? '' : 'readonly'}>
            </div>
            <div class="col-id text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem; white-space: nowrap; font-size: 0.75rem;"><span class="text-selectable">${game.ID}</span></div>
            <div class="col-name border-end border-dark-custom" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;"><span class="text-selectable">${game.Name}</span></div>
            <div class="col-type text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem; white-space: nowrap; font-size: 0.75rem;">${game.Type}</div>
        `;
        
        gamesList.appendChild(gameRow);
        
        // Apply selection visual if item is selected
        if (selectionState.selectedItems.has(game.ID.toString())) {
            updateRowSelection(gameRow, true);
        }
    });
    
    console.log("Adding event handlers to displayed games");
    
    // Add click handlers for row selection
    addRowClickHandlers();
    // Add priority input handlers
    addPriorityHandlers();
    // Update select all state
    updateSelectAllState();
    // Add sorting event listeners
    addSortingEventListeners();
    
    // Apply games list filter
    applyGamesListTextFilter();
    
    console.log("Games displayed successfully");
}

// Add sorting event listeners to header elements
function addSortingEventListeners() {
    // Remove existing event listeners first
    document.querySelectorAll('[data-sort]').forEach(header => {
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
    });
    
    // Add new event listeners
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.addEventListener('click', function(e) {
            // Don't sort when dragging or clicking on inputs
            if (draggedElement || e.target.type === 'checkbox' || e.target.type === 'number') {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            const column = this.getAttribute('data-sort');
            sortGames(column);
        });
        
        // Make it clear these headers are clickable
        header.style.cursor = 'pointer';
        header.title = `Sort by ${header.getAttribute('data-sort')}`;
    });
}

// Handle priority input changes
function addPriorityHandlers() {
    document.querySelectorAll('.priority-input').forEach(input => {
        const isDraggable = sortState.column === 'Priority' && sortState.direction === 'asc';
        
        if (isDraggable) {
            input.addEventListener('change', function(e) {
                e.stopPropagation();
                const gameId = this.getAttribute('data-game-id');
                const newPriority = parseInt(this.value) || 0;
                const oldPriority = parseInt(this.dataset.oldValue) || 0;
                
                if (newPriority !== oldPriority) {
                    reorderPriorities(gameId, newPriority);
                }
            });
            
            input.addEventListener('focus', function(e) {
                this.dataset.oldValue = this.value;
            });
        }
        
        input.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
}

// Reorder priorities when priority is changed
function reorderPriorities(gameId, newPriority) {
    console.log(`reorderPriorities called for game ID ${gameId} with new priority ${newPriority}`);
    
    if (!window.gamesData) {
        console.error("No games data available");
        return;
    }
    
    const game = window.gamesData.find(g => g.ID == gameId);
    if (!game) {
        console.error(`Game with ID ${gameId} not found`);
        return;
    }
    
    const oldPriority = parseInt(game.Priority);
    const maxPriority = window.gamesData.length - 1;
    
    // Clamp new priority to valid range
    newPriority = Math.max(0, Math.min(parseInt(newPriority), maxPriority));
    
    console.log(`Changing game "${game.Name}" priority from ${oldPriority} to ${newPriority}`);
    
    if (oldPriority === newPriority) {
        console.log("Priority unchanged, no action needed");
        return;
    }
    
    console.log("Before reordering - priorities:", window.gamesData.map(g => ({ id: g.ID, name: g.Name, priority: g.Priority })));
    
    // Shift other games' priorities
    window.gamesData.forEach(g => {
        if (g.ID == gameId) {
            g.Priority = newPriority;
            console.log(`Set game "${g.Name}" priority to ${newPriority}`);
        } else if (oldPriority < newPriority) {
            // Moving down: shift games up that are between old and new position
            if (g.Priority > oldPriority && g.Priority <= newPriority) {
                g.Priority = parseInt(g.Priority) - 1;
                console.log(`Shifted game "${g.Name}" priority down to ${g.Priority}`);
            }
        } else {
            // Moving up: shift games down that are between new and old position
            if (g.Priority >= newPriority && g.Priority < oldPriority) {
                g.Priority = parseInt(g.Priority) + 1;
                console.log(`Shifted game "${g.Name}" priority up to ${g.Priority}`);
            }
        }
    });
    
    console.log("After reordering - priorities:", window.gamesData.map(g => ({ id: g.ID, name: g.Name, priority: g.Priority })));
    
    // Save changes to localStorage
    saveGamesData(window.gamesData);
    console.log("Saved updated games data to localStorage");
    
    // Re-sort and display if currently sorted by priority
    if (sortState.column === 'Priority') {
        console.log("Re-sorting by priority");
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        displayGames(sortedGames);
    } else {
        console.log(`Current sort is by ${sortState.column}, not re-sorting by priority`);
        displayGames(getSortedGames(window.gamesData, sortState.column, sortState.direction));
    }
    
    console.log("Reordering complete");
}

// Reorder multiple items with stacking behavior
function reorderMultiplePriorities(gameIds, targetPriority) {
    console.log(`reorderMultiplePriorities called for ${gameIds.length} games to priority ${targetPriority}`);
    
    if (!window.gamesData || gameIds.length === 0) {
        console.error("No games data available or no games to reorder");
        return;
    }
    
    // Get the games to move
    const gamesToMove = window.gamesData.filter(g => gameIds.includes(g.ID.toString()));
    
    if (gamesToMove.length === 0) {
        console.error("No games found with the provided IDs");
        return;
    }
    
    // Sort games to move by their current priority (highest number first to maintain order)
    gamesToMove.sort((a, b) => parseInt(b.Priority) - parseInt(a.Priority));
    
    console.log("Games to move:", gamesToMove.map(g => ({ id: g.ID, name: g.Name, oldPriority: g.Priority })));
    console.log("Before reordering - priorities:", window.gamesData.map(g => ({ id: g.ID, name: g.Name, priority: g.Priority })));
    
    // Get current priorities of games to move
    const oldPriorities = gamesToMove.map(g => parseInt(g.Priority)).sort((a, b) => a - b);
    const lowestOldPriority = oldPriorities[0];
    const highestOldPriority = oldPriorities[oldPriorities.length - 1];
    
    // Determine if we're moving up or down
    const movingDown = lowestOldPriority < targetPriority;
    
    // Create a temporary priority map for games NOT being moved
    const tempPriorities = new Map();
    const gamesNotMoving = window.gamesData.filter(g => !gameIds.includes(g.ID.toString()));
    
    // Calculate new priorities for non-moving games
    if (movingDown) {
        // Moving down: compact the space left by moved items, then shift items after target
        let currentPriority = 0;
        
        window.gamesData.forEach(g => {
            const gPriority = parseInt(g.Priority);
            
            if (!gameIds.includes(g.ID.toString())) {
                // Skip the priorities where we're inserting
                if (gPriority > highestOldPriority && gPriority <= targetPriority) {
                    // Shift these games up to fill the gap left by moved items
                    tempPriorities.set(g.ID, gPriority - gamesToMove.length);
                } else if (gPriority > targetPriority) {
                    // Keep these games as is
                    tempPriorities.set(g.ID, gPriority);
                } else {
                    // Keep games before the moved section as is
                    tempPriorities.set(g.ID, gPriority);
                }
            }
        });
    } else {
        // Moving up: shift items at target position and after, then compact the space
        window.gamesData.forEach(g => {
            const gPriority = parseInt(g.Priority);
            
            if (!gameIds.includes(g.ID.toString())) {
                if (gPriority >= targetPriority && gPriority < lowestOldPriority) {
                    // Shift these games down to make room
                    tempPriorities.set(g.ID, gPriority + gamesToMove.length);
                } else if (gPriority > highestOldPriority) {
                    // Keep these games as is
                    tempPriorities.set(g.ID, gPriority);
                } else {
                    // Keep games before target as is
                    tempPriorities.set(g.ID, gPriority);
                }
            }
        });
    }
    
    // Apply temp priorities to games not moving
    window.gamesData.forEach(g => {
        if (tempPriorities.has(g.ID)) {
            g.Priority = tempPriorities.get(g.ID);
        }
    });
    
    // Now assign new priorities to moved games (stacking sequentially at target)
    gamesToMove.reverse().forEach((game, index) => {
        const newPriority = targetPriority + index;
        
        // Find the game in the original data and update it
        const gameInData = window.gamesData.find(g => g.ID == game.ID);
        if (gameInData) {
            gameInData.Priority = newPriority;
            console.log(`Set game "${game.Name}" priority to ${newPriority}`);
        }
    });
    
    console.log("After reordering - priorities:", window.gamesData.map(g => ({ id: g.ID, name: g.Name, priority: g.Priority })));
    
    // Normalize priorities to ensure proper sequence
    normalizePriorities();
    
    // Save changes to localStorage
    saveGamesData(window.gamesData);
    console.log("Saved updated games data to localStorage");
    
    // Re-sort and display if currently sorted by priority
    if (sortState.column === 'Priority') {
        console.log("Re-sorting by priority");
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        displayGames(sortedGames);
    } else {
        console.log(`Current sort is by ${sortState.column}, not re-sorting by priority`);
        displayGames(getSortedGames(window.gamesData, sortState.column, sortState.direction));
    }
    
    console.log("Multiple items reordering complete");
}

// Normalize priorities to ensure proper sequence without gaps
function normalizePriorities() {
    if (!window.gamesData || window.gamesData.length === 0) return;
    
    console.log("Normalizing priorities to remove gaps");
    
    // Get priority start value
    const startValue = parseInt(localStorage.getItem('priorityStart')) || 0;
    
    // Sort by current priorities
    const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
    
    // Reassign priorities sequentially
    sortedGames.forEach((game, index) => {
        const newPriority = startValue + index;
        
        // Find the game in the original data and update it
        const gameInData = window.gamesData.find(g => g.ID == game.ID);
        if (gameInData) {
            gameInData.Priority = newPriority;
        }
    });
    
    console.log("Priorities normalized");
}

// Drag and drop functionality
let draggedElement = null;
let draggedGameId = null;
let draggedGameIds = []; // Store multiple selected game IDs
let dragCountBadge = null; // Visual indicator for drag count

function handleDragStart(e) {
    draggedElement = this;
    draggedGameId = this.getAttribute('data-game-id');
    
    // Check if the dragged item is part of a selection
    if (selectionState.selectedItems.has(draggedGameId)) {
        // Drag all selected items
        draggedGameIds = Array.from(selectionState.selectedItems);
        
        // Set opacity for all selected items
        document.querySelectorAll('.game-row').forEach(row => {
            const rowGameId = row.getAttribute('data-game-id');
            if (selectionState.selectedItems.has(rowGameId)) {
                row.style.opacity = '0.5';
            }
        });
        
        // Create and show drag count badge if multiple items
        if (draggedGameIds.length > 1) {
            createDragCountBadge(draggedGameIds.length);
        }
        
        // Set drag data to show count
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `Moving ${draggedGameIds.length} items`);
    } else {
        // Drag single item
        draggedGameIds = [draggedGameId];
        this.style.opacity = '0.5';
    }
    
    // Prevent sorting when dragging
    e.stopPropagation();
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Add visual feedback for drop target
    if (draggedGameIds.length > 0) {
        const targetGameId = this.getAttribute('data-game-id');
        if (!draggedGameIds.includes(targetGameId)) {
            this.style.borderTop = '2px solid #0dcaf0';
        }
    }
    
    // Update badge position to follow cursor
    if (dragCountBadge && draggedGameIds.length > 1) {
        dragCountBadge.style.left = `${e.clientX + 15}px`;
        dragCountBadge.style.top = `${e.clientY + 15}px`;
    }
}

function handleDragLeave(e) {
    // Remove visual feedback
    this.style.borderTop = '';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    this.style.borderTop = '';
    
    if (draggedElement !== this && draggedGameIds.length > 0) {
        const targetGameId = this.getAttribute('data-game-id');
        
        // Don't drop on a selected item
        if (draggedGameIds.includes(targetGameId)) {
            return;
        }
        
        // Find target game
        const targetGame = window.gamesData.find(g => g.ID == targetGameId);
        
        if (targetGame) {
            const targetPriority = targetGame.Priority;
            
            // Reorder multiple items with stacking behavior
            reorderMultiplePriorities(draggedGameIds, targetPriority);
            
            // Save changes to localStorage
            saveGamesData(window.gamesData);
        }
    }
}

function handleDragEnd(e) {
    // Reset opacity for all items
    document.querySelectorAll('.game-row').forEach(row => {
        row.style.opacity = '';
        row.style.borderTop = '';
    });
    
    // Remove drag count badge
    removeDragCountBadge();
    
    draggedElement = null;
    draggedGameId = null;
    draggedGameIds = [];
    e.stopPropagation();
}

// Create a visual badge showing the number of items being dragged
function createDragCountBadge(count) {
    // Remove existing badge if any
    removeDragCountBadge();
    
    dragCountBadge = document.createElement('div');
    dragCountBadge.id = 'dragCountBadge';
    dragCountBadge.className = 'position-fixed bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold';
    dragCountBadge.style.cssText = `
        width: 30px;
        height: 30px;
        font-size: 0.75rem;
        z-index: 9999;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    dragCountBadge.textContent = count;
    document.body.appendChild(dragCountBadge);
}

// Remove the drag count badge
function removeDragCountBadge() {
    if (dragCountBadge && dragCountBadge.parentNode) {
        dragCountBadge.parentNode.removeChild(dragCountBadge);
        dragCountBadge = null;
    }
}

// Add click handlers for row selection
function addRowClickHandlers() {
    document.querySelectorAll('.game-row').forEach((row, index) => {
        row.addEventListener('click', function(e) {
            // Don't toggle if clicking directly on checkbox or priority input
            if (e.target.type === 'checkbox' || e.target.type === 'number') return;
            
            // Don't toggle if clicking on ID column (entire column is text-selectable)
            if (e.target.closest('.col-id')) return;
            
            // Don't toggle if clicking on text-selectable spans in Name column
            if (e.target.classList.contains('text-selectable')) return;
            
            const gameId = this.getAttribute('data-game-id');
            const checkbox = this.querySelector(`[data-game-id="${gameId}"]`);
            
            handleRowSelection(index, gameId, checkbox, e);
        });
    });
    
    // Add change handlers for checkboxes
    document.querySelectorAll('.game-checkbox').forEach((checkbox, index) => {
        checkbox.addEventListener('change', function(e) {
            const row = this.closest('.game-row');
            const gameId = this.getAttribute('data-game-id');
            
            // Handle individual checkbox changes
            if (this.checked) {
                selectionState.selectedItems.add(gameId);
            } else {
                selectionState.selectedItems.delete(gameId);
            }
            
            selectionState.lastSelectedIndex = index;
            updateRowSelection(row, this.checked);
            updateSelectAllState();
        });
    });
}

// Handle row selection with keyboard modifiers
function handleRowSelection(index, gameId, checkbox, event) {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    if (isShiftPressed && selectionState.lastSelectedIndex !== -1) {
        // Shift+Click: Select range
        selectRange(selectionState.lastSelectedIndex, index);
    } else if (isCtrlPressed) {
        // Ctrl+Click: Toggle individual selection
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            selectionState.selectedItems.add(gameId);
        } else {
            selectionState.selectedItems.delete(gameId);
        }
        
        selectionState.lastSelectedIndex = index;
        updateRowSelection(checkbox.closest('.game-row'), checkbox.checked);
    } else {
        // Normal click: Clear all and select this one
        clearAllSelections();
        
        checkbox.checked = true;
        selectionState.selectedItems.add(gameId);
        selectionState.lastSelectedIndex = index;
        updateRowSelection(checkbox.closest('.game-row'), true);
    }
    
    updateSelectAllState();
}

// Select a range of items
function selectRange(startIndex, endIndex) {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    const checkboxes = document.querySelectorAll('.game-checkbox');
    const rows = document.querySelectorAll('.game-row');
    
    for (let i = start; i <= end; i++) {
        if (checkboxes[i] && rows[i]) {
            const gameId = checkboxes[i].getAttribute('data-game-id');
            checkboxes[i].checked = true;
            selectionState.selectedItems.add(gameId);
            updateRowSelection(rows[i], true);
        }
    }
}

// Clear all selections
function clearAllSelections() {
    selectionState.selectedItems.clear();
    
    document.querySelectorAll('.game-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        updateRowSelection(checkbox.closest('.game-row'), false);
    });
}

// Show selection notification
function showSelectionNotification(count, isGetAppList = false) {
    const notificationId = isGetAppList ? 'selectionNotification' : 'gamesSelectionNotification';
    const countId = isGetAppList ? 'selectionCount' : 'gamesSelectionCount';
    
    const notification = document.getElementById(notificationId);
    const countSpan = document.getElementById(countId);
    
    if (notification && countSpan) {
        countSpan.textContent = count;
        
        // Show notification
        notification.style.opacity = '1';
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 2000);
    }
}

// Update the select all checkbox state
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalCheckboxes = document.querySelectorAll('.game-checkbox').length;
    const selectedCount = selectionState.selectedItems.size;
    const gamesSelectionCount = document.getElementById('gamesSelectionCount');

    if (gamesSelectionCount) {
        gamesSelectionCount.textContent = selectedCount;
    }
    
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
    
    // Show notification for main games list
    if (selectedCount > 0) {
        showSelectionNotification(selectedCount, false);
    }
}

// Update row selection visual
function updateRowSelection(row, isSelected) {
    if (isSelected) {
        row.style.backgroundColor = 'rgba(13, 202, 240, 0.2)';
        row.style.borderColor = '#0dcaf0';
    } else {
        row.style.backgroundColor = '';
        row.style.borderColor = '';
    }
}

// Debug function to verify priority integrity
function verifyPriorityIntegrity() {
    if (!window.gamesData || window.gamesData.length === 0) {
        console.log("No games data to verify");
        return false;
    }
    
    // Check for duplicate priorities
    const priorities = {};
    let hasDuplicates = false;
    let hasInvalid = false;
    
    window.gamesData.forEach((game, index) => {
        const priority = parseInt(game.Priority);
        
        // Check if priority is valid
        if (isNaN(priority) || priority < 0) {
            console.error(`Game ${game.Name} (ID: ${game.ID}) has invalid priority: ${game.Priority}`);
            hasInvalid = true;
        }
        
        // Check for duplicates
        if (priorities[priority] !== undefined) {
            console.error(`Duplicate priority ${priority} found for games: "${priorities[priority]}" and "${game.Name}"`);
            hasDuplicates = true;
        } else {
            priorities[priority] = game.Name;
        }
    });
    
    // Check for gaps in priority sequence
    const sortedPriorities = Object.keys(priorities).map(Number).sort((a, b) => a - b);
    const startValue = parseInt(localStorage.getItem('priorityStart')) || 0;
    let hasGaps = false;
    
    for (let i = 0; i < sortedPriorities.length; i++) {
        const expectedPriority = startValue + i;
        if (sortedPriorities[i] !== expectedPriority) {
            console.warn(`Gap in priority sequence at ${expectedPriority}, found ${sortedPriorities[i]} instead`);
            hasGaps = true;
        }
    }
    
    console.log("Priority verification results:");
    console.log(`- Has duplicate priorities: ${hasDuplicates}`);
    console.log(`- Has invalid priorities: ${hasInvalid}`);
    console.log(`- Has gaps in sequence: ${hasGaps}`);
    
    return !hasDuplicates && !hasInvalid && !hasGaps;
}

// Repair priority sequence if needed
function repairPrioritySequence() {
    if (!window.gamesData || window.gamesData.length === 0) return;
    
    console.log("Repairing priority sequence");
    
    // Get priority start value
    const startValue = parseInt(localStorage.getItem('priorityStart')) || 0;
    
    // Sort by current priorities (even if some are invalid)
    const sortedGames = [...window.gamesData].sort((a, b) => {
        const priorityA = parseInt(a.Priority);
        const priorityB = parseInt(b.Priority);
        return isNaN(priorityA) && isNaN(priorityB) ? 0 :
               isNaN(priorityA) ? 1 :
               isNaN(priorityB) ? -1 :
               priorityA - priorityB;
    });
    
    // Reassign priorities sequentially
    sortedGames.forEach((game, index) => {
        const newPriority = startValue + index;
        
        // Find the game in the original data and update it
        for (let i = 0; i < window.gamesData.length; i++) {
            if (window.gamesData[i].ID == game.ID) {
                window.gamesData[i].Priority = newPriority;
                break;
            }
        }
    });
    
    console.log("Priority sequence repaired");
    saveGamesData(window.gamesData);
    
    // Verify repair
    const isValid = verifyPriorityIntegrity();
    console.log(`Repair result: ${isValid ? 'Successful' : 'Failed'}`);
    
    return isValid;
}

// Filter games list based on gamesSearch input
function applyGamesListTextFilter() {
    const filterInput = document.getElementById('gamesSearch');
    const gamesList = document.getElementById('gamesList');
    
    if (!filterInput || !gamesList) {
        return;
    }
    
    const filterText = filterInput.value.trim().toLowerCase();
    const gameRows = gamesList.querySelectorAll('.game-row');
    
    if (!filterText) {
        // Show all rows if filter is empty
        gameRows.forEach(row => {
            row.style.removeProperty('display');
            row.classList.remove('filtered-hidden');
        });
        // Remove empty state if it exists
        const emptyState = gamesList.querySelector('.filter-empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        return;
    }
    
    let visibleCount = 0;
    gameRows.forEach((row) => {
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
    if (visibleCount === 0 && gameRows.length > 0) {
        // Create or update empty state message
        let emptyState = gamesList.querySelector('.filter-empty-state');
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'filter-empty-state small p-2 text-center w-100 text-muted';
            emptyState.style.fontWeight = '400';
            emptyState.style.padding = '10px';
            gamesList.appendChild(emptyState);
        }
        emptyState.textContent = `No results matching "${filterInput.value}"`;
        emptyState.style.display = 'block';
    } else {
        // Remove empty state if it exists
        const emptyState = gamesList.querySelector('.filter-empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }
}

// Initialize games search filter
function initializeGamesSearch() {
    const gamesSearchInput = document.getElementById('gamesSearch');
    
    if (gamesSearchInput) {
        let gamesSearchTimer;
        const gamesSearchDelay = 250;

        gamesSearchInput.addEventListener('input', function() {
            clearTimeout(gamesSearchTimer);
            gamesSearchTimer = setTimeout(() => {
                applyGamesListTextFilter();
            }, gamesSearchDelay);
        });
        
        // Also update filter on Enter key for immediate response
        gamesSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                clearTimeout(gamesSearchTimer);
                applyGamesListTextFilter();
            }
        });
    }
}

// Initialize games type dropdown for bulk type changes
function initializeGamesTypeDropdown() {
    const gamesTypeDropdown = document.getElementById('gamesTypeDropdown');
    
    if (!gamesTypeDropdown) {
        console.warn("Could not find gamesTypeDropdown element");
        return;
    }
    
    gamesTypeDropdown.addEventListener('change', function() {
        const selectedType = this.value;
        
        if (!selectedType) {
            return;
        }
        
        // Get selected games
        const selectedGameIds = Array.from(selectionState.selectedItems);
        
        if (selectedGameIds.length === 0) {
            showNotification('Please select at least one game to change type', 'warning');
            // Reset dropdown to default
            this.value = '';
            return;
        }
        
        console.log(`Changing type to "${selectedType}" for ${selectedGameIds.length} selected games`);
        
        // Update the Type for all selected games
        let changedCount = 0;
        selectedGameIds.forEach(gameId => {
            const game = window.gamesData.find(g => g.ID == gameId);
            if (game) {
                const oldType = game.Type;
                game.Type = selectedType;
                changedCount++;
                console.log(`Changed ${game.Name} (ID: ${game.ID}) type from "${oldType}" to "${selectedType}"`);
            }
        });
        
        if (changedCount > 0) {
            // Save changes to localStorage
            saveGamesData(window.gamesData);
            console.log(`Saved changes for ${changedCount} games`);
            
            // Re-display the games list with current sort
            const sortedGames = getSortedGames(window.gamesData, sortState.column, sortState.direction);
            displayGames(sortedGames);
            
            // Show success notification
            showNotification(`Changed type to "${selectedType}" for ${changedCount} game${changedCount > 1 ? 's' : ''}`, 'success');
            
            // Clear selection after change
            clearAllSelections();
            updateSelectAllState();
        }
        
        // Reset dropdown to default
        this.value = '';
    });
    
    console.log("Games type dropdown initialized");
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded, initializing application");
    
    // Load games data when page loads
    loadGamesData();
    
    // Initialize path functionality
    initializePath();
    
    // Initialize priority start functionality
    initializePriorityStart();
    
    // Initialize clear button (remove selected games)
    initializeClearButton();
    
    // Initialize resize functionality
    initializeResize();
    
    // Initialize horizontal panel resize functionality
    initializeHorizontalPanelResize();
    
    // Initialize games search filter
    initializeGamesSearch();
    
    // Initialize games type dropdown for changing selected games' type
    initializeGamesTypeDropdown();
    
    // Add keyboard shortcut for debugging (Ctrl+Shift+D)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            console.log("Debug shortcut triggered");
            const integrityCheck = verifyPriorityIntegrity();
            
            if (!integrityCheck) {
                console.log("Priority integrity issues found, attempting repair");
                repairPrioritySequence();
            }
        }
    });
    
    // Add select all functionality
    document.addEventListener('change', function(e) {
        if (e.target.id === 'selectAll') {
            const checkboxes = document.querySelectorAll('.game-checkbox');
            const rows = document.querySelectorAll('.game-row');
            
            // Clear current selection
            selectionState.selectedItems.clear();
            
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = e.target.checked;
                
                if (e.target.checked) {
                    const gameId = checkbox.getAttribute('data-game-id');
                    selectionState.selectedItems.add(gameId);
                }
                
                updateRowSelection(rows[index], e.target.checked);
            });
            
            // Update last selected index
            if (e.target.checked && checkboxes.length > 0) {
                selectionState.lastSelectedIndex = checkboxes.length - 1;
            } else {
                selectionState.lastSelectedIndex = -1;
            }

            updateSelectAllState();
        }
    });
});

// Path functionality
function initializePath() {
    const folderPathInput = document.getElementById('folderPath');
    if (!folderPathInput) {
        console.warn("Could not find folderPath input element");
        return;
    }
    
    // Load saved path from localStorage
    const savedPath = localStorage.getItem('greenlumaPath');
    if (savedPath) {
        folderPathInput.value = savedPath;
    }
    
    // Save path when user types
    folderPathInput.addEventListener('input', function() {
        localStorage.setItem('greenlumaPath', this.value);
    });
    
}

// Priority start functionality
function initializePriorityStart() {
    const priorityStartInput = document.getElementById('priorityStart');
    if (!priorityStartInput) {
        console.warn("Could not find priorityStart input element");
        return;
    }
    
    const applyPriorityStartBtn = document.getElementById('applyPriorityStartBtn');
    if (!applyPriorityStartBtn) {
        console.warn("Could not find applyPriorityStartBtn element");
        return;
    }
    
    console.log("Found priority elements, initializing functionality");
    
    // Ensure the input has proper styling
    priorityStartInput.style.backgroundColor = "#2b3035"; // bg-secondary-custom equivalent
    priorityStartInput.style.color = "#f8f9fa"; // text-light equivalent
    
    // Load saved priority start from localStorage
    const savedPriorityStart = localStorage.getItem('priorityStart');
    if (savedPriorityStart !== null) {
        priorityStartInput.value = savedPriorityStart;
        console.log("Setting priorityStart input value to:", savedPriorityStart);
    } else {
        // Default to 0 if not saved previously
        priorityStartInput.value = "0";
        localStorage.setItem('priorityStart', "0");
    }
    
    // Handle apply priority start button
    applyPriorityStartBtn.addEventListener('click', function() {
        console.log("Apply button clicked");
        applyPriorityStart();
    });
    
    // Also apply on Enter key
    priorityStartInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            console.log("Enter pressed in priorityStart");
            applyPriorityStart();
        }
    });
    
    // Handle input validation
    priorityStartInput.addEventListener('input', function() {
        // Remove non-numeric characters
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Ensure it's a valid number
        const val = parseInt(this.value);
        if (isNaN(val)) {
            this.value = "0";
        } else if (val > 999) {
            this.value = "999";
        }
    });
    
    // Add focus indicator with border color
    priorityStartInput.addEventListener('focus', function() {
        this.style.borderColor = '#6ea8fe';
        this.style.boxShadow = '0 0 0 0.2rem rgba(13, 110, 253, 0.25)';
    });
    
    priorityStartInput.addEventListener('blur', function() {
        this.style.borderColor = '';
        this.style.boxShadow = '';
        
        // Save the value when losing focus
        if (this.value !== localStorage.getItem('priorityStart')) {
            localStorage.setItem('priorityStart', this.value);
            console.log("Saved priority start value on blur:", this.value);
        }
    });
    
    // Add tooltip
    priorityStartInput.title = "Set the starting priority number (0-999)";
    applyPriorityStartBtn.title = "Apply priority numbering starting from this value";
    
    console.log("Priority functionality initialized");
}

// Apply custom priority start
function applyPriorityStart() {
    console.log("applyPriorityStart function called");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        console.warn("No games data available");
        return;
    }
    
    const priorityStartInput = document.getElementById('priorityStart');
    if (!priorityStartInput) {
        console.error("Cannot find priorityStart input");
        return;
    }
    
    const startValue = parseInt(priorityStartInput.value) || 0;
    console.log("Applying new priority start:", startValue);
    
    // Log current priorities
    console.log("Before update - Current priorities:", window.gamesData.map(g => ({ name: g.Name, priority: g.Priority })));
    
    // Sort games by their current priority
    let games = [...window.gamesData].sort((a, b) => {
        return parseInt(a.Priority) - parseInt(b.Priority);
    });
    
    // Directly update each game's priority with the new starting value
    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const newPriority = startValue + i;
        
        // Find the game in the original data
        for (let j = 0; j < window.gamesData.length; j++) {
            if (window.gamesData[j].ID == game.ID) {
                window.gamesData[j].Priority = newPriority;
                console.log(`Updated game ${window.gamesData[j].Name} priority to ${newPriority}`);
                break;
            }
        }
    }
    
    // Log updated priorities
    console.log("After update - Current priorities:", window.gamesData.map(g => ({ name: g.Name, priority: g.Priority })));
    
    // Save the new priority start value
    localStorage.setItem('priorityStart', startValue.toString());
    console.log("Saved priority start value to localStorage:", startValue);
    
    // Save the updated games data
    saveGamesData(window.gamesData);
    console.log("Saved updated games data to localStorage");
    
    // Force sort state to Priority
    sortState.column = 'Priority';
    sortState.direction = 'asc';
    
    try {
        // Re-display the games sorted by the new priorities
        const sortedGames = [...window.gamesData].sort((a, b) => a.Priority - b.Priority);
        console.log("Sorted games:", sortedGames.map(g => ({ name: g.Name, priority: g.Priority })));
        
        displayGames(sortedGames);
        updateSortIndicators();
        console.log("Games display updated with new priorities");
    } catch (error) {
        console.error("Error displaying games:", error);
    }
    
    // Show visual feedback
    const btn = document.getElementById('applyPriorityStartBtn');
    if (!btn) {
        console.warn("Could not find applyPriorityStartBtn for visual feedback");
        return;
    }
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '✓';
    btn.classList.remove('btn-outline-secondary');
    btn.classList.add('btn-outline-success');
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('btn-outline-success');
        btn.classList.add('btn-outline-secondary');
    }, 1000);
}

// Initialize resize functionality
function initializeResize() {
    console.log("Initializing resize functionality");
    
    const resizeHandle = document.getElementById('resize-handle');
    if (!resizeHandle) {
        console.error("Resize handle not found");
        return;
    }
    
    // Define these variables in the function scope so they're accessible to all nested functions
    window.isResizing = false;
    window.startX = 0;
    window.startY = 0;
    window.startWidth = 0;
    window.startHeight = 0;
    
    // Load saved dimensions on startup
    const savedWidth = localStorage.getItem('windowWidth') || "400px";
    const savedHeight = localStorage.getItem('windowHeight') || "800px";
    
    // Force set initial dimensions for the popup with a slight delay for better DOM loading
    setTimeout(() => {
        document.body.style.width = savedWidth;
        document.body.style.height = savedHeight;
        
        // Make sure main container fills the body
        const mainContainer = document.getElementById('main-container');
        if (mainContainer) {
            mainContainer.style.height = '100%';
            mainContainer.style.width = '100%';
        }
        
        console.log("Set initial dimensions:", document.body.style.width, "x", document.body.style.height);
    }, 100);
    
    // Add resize styles if they don't exist yet
    if (!document.getElementById('resize-styles')) {
        const style = document.createElement('style');
        style.id = 'resize-styles';
        style.textContent = `
            .resizing {
                cursor: nwse-resize !important;
                user-select: none !important;
            }
            .resize-handle-corner:hover {
                opacity: 1;
                background: linear-gradient(-45deg, #0dcaf0 17px, transparent 17px);
            }
            .resize-handle-corner:active {
                background: linear-gradient(-45deg, #ff6b6b 17px, transparent 17px);
            }
            body.resizing * {
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set up resize events
    resizeHandle.addEventListener('mousedown', startResize);
    
    // Also allow double-click to toggle between default and max size
    resizeHandle.addEventListener('dblclick', () => {
        const currentWidth = parseInt(getComputedStyle(document.body).width);
        const currentHeight = parseInt(getComputedStyle(document.body).height);
        
        // Toggle between default size and max size
        if (currentWidth < 700 || currentHeight < 800) {
            document.body.style.width = '800px';
            document.body.style.height = '900px';
            localStorage.setItem('windowWidth', '800px');
            localStorage.setItem('windowHeight', '900px');
            showNotification('Window maximized', 'info');
        } else {
            document.body.style.width = '400px';
            document.body.style.height = '800px';
            localStorage.setItem('windowWidth', '400px');
            localStorage.setItem('windowHeight', '800px');
            showNotification('Window reset to default size', 'info');
        }
    });
    
    console.log("Resize functionality initialized");
}

function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Starting resize");
    
    window.isResizing = true;
    
    // Store initial position
    window.startX = e.clientX;
    window.startY = e.clientY;
    
    // Store initial dimensions (use computed style to get accurate values)
    const computedStyle = window.getComputedStyle(document.body);
    window.startWidth = parseInt(computedStyle.width, 10);
    window.startHeight = parseInt(computedStyle.height, 10);
    
    // Prevent selection and add visual feedback
    document.body.style.userSelect = 'none';
    document.body.classList.add('resizing');
    
    // Set resize handle to active state
    const resizeHandle = document.getElementById('resize-handle');
    if (resizeHandle) {
        resizeHandle.style.opacity = '1';
    }
    
    // Add global event listeners
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    // Also handle touch events for mobile
    document.addEventListener('touchmove', handleTouchResize, { passive: false });
    document.addEventListener('touchend', stopResize);
    document.addEventListener('touchcancel', stopResize);
    
    console.log(`Started at pos: ${window.startX},${window.startY} with size: ${window.startWidth}x${window.startHeight}`);
}

// Handle touch events for mobile resize
function handleTouchResize(e) {
    if (!window.isResizing || !e.touches || e.touches.length === 0) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    
    // Simulate mouse event
    const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
    };
    
    handleResize(simulatedEvent);
}

function handleResize(e) {
    if (!window.isResizing) return;
    
    // Calculate new dimensions
    const deltaX = e.clientX - window.startX;
    const deltaY = e.clientY - window.startY;
    const newWidth = window.startWidth + deltaX;
    const newHeight = window.startHeight + deltaY;
    
    // Apply constraints
    const minWidth = 350;
    const minHeight = 400;
    const maxWidth = 800;
    const maxHeight = 900;
    
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    
    // Apply new dimensions - no animation for smoother resizing
    document.body.style.width = `${constrainedWidth}px`;
    document.body.style.height = `${constrainedHeight}px`;
    
    // Update any flexible containers
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        mainContainer.style.height = '100%';
        mainContainer.style.width = '100%';
    }
    
    // Force layout recalculation
    document.body.offsetHeight;
    
    console.log(`Resizing to: ${constrainedWidth}x${constrainedHeight}`);
}

function stopResize() {
    if (!window.isResizing) return;
    
    console.log("Resize stopped");
    window.isResizing = false;
    
    // Restore normal behavior
    document.body.style.userSelect = '';
    document.body.classList.remove('resizing');
     
    // Remove global event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Get actual computed dimensions
    const computedStyle = window.getComputedStyle(document.body);
    const currentWidth = `${parseInt(computedStyle.width, 10)}px`;
    const currentHeight = `${parseInt(computedStyle.height, 10)}px`;
    
    // Make sure styles are properly applied
    document.body.style.width = currentWidth;
    document.body.style.height = currentHeight;
    
    // Save to localStorage
    localStorage.setItem('windowWidth', currentWidth);
    localStorage.setItem('windowHeight', currentHeight);
    
    // Update layout
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        mainContainer.style.height = '100%';
    }
    
    console.log(`Saved dimensions: ${currentWidth} x ${currentHeight}`);
    
    // Show feedback to user
    showNotification(`Window resized to ${currentWidth} × ${currentHeight}`, "info");
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

// Horizontal panel resizing functionality
function initializeHorizontalPanelResize() {
    console.log("Initializing horizontal panel resize functionality");
    
    const resizer = document.getElementById('horizontalResizer');
    const getAppSection = document.getElementById('getAppSection');
    const gamesSection = document.getElementById('gamesSection');
    
    if (!resizer || !getAppSection || !gamesSection) {
        console.error("Panel resize elements not found");
        console.log("Resizer:", resizer);
        console.log("GetAppSection:", getAppSection);
        console.log("GamesSection:", gamesSection);
        return;
    }
    
    let isResizing = false;
    let startY = 0;
    let startAppHeight = 0;
    let startGamesHeight = 0;
    let containerHeight = 0;
    
    // Set initial flex properties
    getAppSection.style.flex = '0 0 auto';
    gamesSection.style.flex = '1 1 auto';
    
    // Load saved panel heights or set defaults
    const savedAppHeight = localStorage.getItem('appPanelHeight');
    
    if (savedAppHeight) {
        getAppSection.style.height = savedAppHeight;
        getAppSection.style.minHeight = savedAppHeight;
    } else {
        getAppSection.style.height = '250px';
        getAppSection.style.minHeight = '250px';
    }
    
    resizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isResizing = true;
        startY = e.clientY;
        
        // Get the parent container (main content area)
        const parentContainer = getAppSection.parentElement;
        const parentRect = parentContainer.getBoundingClientRect();
        containerHeight = parentRect.height;
        
        // Get current heights
        const appRect = getAppSection.getBoundingClientRect();
        const gamesRect = gamesSection.getBoundingClientRect();
        startAppHeight = appRect.height;
        startGamesHeight = gamesRect.height;
        
        // Add visual feedback
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
        resizer.classList.add('resizing');
        
        console.log(`Starting panel resize - App: ${startAppHeight}px, Games: ${startGamesHeight}px, Container: ${containerHeight}px`);
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        e.preventDefault();
        
        const deltaY = e.clientY - startY;
        const newAppHeight = startAppHeight + deltaY;
        
        // Apply constraints - minimum 150px, maximum 80% of container
        const minHeight = 150;
        const maxAppHeight = containerHeight * 0.8;
        const constrainedAppHeight = Math.max(minHeight, Math.min(maxAppHeight, newAppHeight));
        
        // Set the app panel height directly
        getAppSection.style.height = `${constrainedAppHeight}px`;
        getAppSection.style.minHeight = `${constrainedAppHeight}px`;
        
        // The games section will automatically take the remaining space due to flex: 1
        console.log(`Resizing to: App ${constrainedAppHeight}px`);
    });
    
    document.addEventListener('mouseup', function() {
        if (!isResizing) return;
        
        isResizing = false;
        
        // Remove visual feedback
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        resizer.classList.remove('resizing');
        
        // Save current height
        const appRect = getAppSection.getBoundingClientRect();
        const currentAppHeight = `${Math.round(appRect.height)}px`;
        
        localStorage.setItem('appPanelHeight', currentAppHeight);
        
        console.log(`Panel resize complete - App: ${currentAppHeight}`);
    });
    
    console.log("Horizontal panel resize functionality initialized");
}

// Initialize clear button functionality (removes selected games from main list)
function initializeClearButton() {
    const clearBtnContainer = document.getElementById('clearBtnContainer');
    if (!clearBtnContainer) {
        console.warn('Clear button container not found');
        return;
    }

    // Confirmation state
    let confirmActive = false;
    let confirmTimer = null;
    const originalHTML = clearBtnContainer.innerHTML;
    const originalTitle = clearBtnContainer.title || '';

    function revertButton() {
        confirmActive = false;
        if (confirmTimer) {
            clearTimeout(confirmTimer);
            confirmTimer = null;
        }
        // Restore original state
        clearBtnContainer.innerHTML = originalHTML;
        clearBtnContainer.classList.remove('text-warning', 'confirming');
        clearBtnContainer.classList.add('text-muted');
        clearBtnContainer.title = originalTitle;
        clearBtnContainer.classList.remove('expanded');
    }

    clearBtnContainer.addEventListener('click', function() {
        try {
            // If not currently in confirm mode, enter confirm mode
            if (!confirmActive) {
                // If nothing selected, keep current behavior and notify
                if (!selectionState.selectedItems || selectionState.selectedItems.size === 0) {
                    showNotification('No games selected', 'warning');
                    return;
                }

                confirmActive = true;
                // Visual change: show text and warning color
                clearBtnContainer.classList.remove('text-muted');
                clearBtnContainer.classList.add('text-warning');
                clearBtnContainer.innerHTML = `
                    <div class="arrow-side-line"></div>
                    <span class="d-flex align-items-center justify-content-center mx-2" style="font-size: 0.7rem; line-height: 1; pointer-events: none;">
                        ARE YOU SURE?
                    </span>
                    <div class="arrow-side-line"></div>
                `;
                clearBtnContainer.title = 'Click again within 2s to confirm deletion';
                clearBtnContainer.classList.add('confirming', 'expanded');

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

                // Call existing removal logic
                clearSelectedGames();

                // Revert button back to original state
                revertButton();
            }
        } catch (err) {
            console.error('Error handling clear button confirmation:', err);
            revertButton();
        }
    });
}

// Remove selected games from window.gamesData and refresh UI
function clearSelectedGames() {
    if (!selectionState.selectedItems || selectionState.selectedItems.size === 0) {
        showNotification('No games selected', 'warning');
        return;
    }

    if (!window.gamesData || window.gamesData.length === 0) {
        showNotification('No games to remove', 'warning');
        return;
    }

    const toRemove = new Set(selectionState.selectedItems);
    const beforeCount = window.gamesData.length;

    window.gamesData = window.gamesData.filter(game => !toRemove.has(game.ID.toString()));

    const removedCount = beforeCount - window.gamesData.length;
    
    // Reset generated flag since list has changed
    if (typeof resetGeneratedFlag === 'function') {
        resetGeneratedFlag();
    }

    if (removedCount === 0) {
        showNotification('No matching games found to remove', 'warning');
        return;
    }

    // Reassign sequential priorities starting from saved priorityStart
    const startValue = parseInt(localStorage.getItem('priorityStart')) || 0;
    window.gamesData.sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
    window.gamesData.forEach((g, i) => {
        g.Priority = startValue + i;
    });

    // Persist and refresh
    saveGamesData(window.gamesData);

    // Clear selection state
    selectionState.selectedItems.clear();
    selectionState.lastSelectedIndex = -1;

    // Redisplay games sorted by priority
    const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
    displayGames(sortedGames);
    updateSelectAllState();

    showNotification(`Removed ${removedCount} games`, 'success');
}