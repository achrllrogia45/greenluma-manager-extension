// Load games data from JSON
async function loadGamesData() {
    console.log("loadGamesData called");
    
    try {
        // Try to load from localStorage first for persistence
        const savedGames = localStorage.getItem('gamesData');
        let games = [];
        
        if (savedGames) {
            try {
                games = JSON.parse(savedGames);
                console.log("Loaded games from localStorage:", games.length);
            } catch (parseError) {
                console.error("Error parsing saved games data:", parseError);
                // If parsing fails, try to load from data.json
                games = await loadGamesFromDataJson();
            }
        } else {
            // Fall back to data.json if no saved data
            games = await loadGamesFromDataJson();
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

// Helper function to load games from data.json
async function loadGamesFromDataJson() {
    try {
        console.log("Attempting to load games from data.json");
        const response = await fetch('data.json');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data.json: ${response.status} ${response.statusText}`);
        }
        
        const games = await response.json();
        console.log("Loaded", games.length, "games from data.json");
        return games;
    } catch (error) {
        console.error('Error loading data.json:', error);
        return [];
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
        gameRow.removeEventListener('drop', handleDrop);
        gameRow.removeEventListener('dragend', handleDragEnd);
        
        if (isDraggable) {
            gameRow.draggable = true;
            gameRow.addEventListener('dragstart', handleDragStart);
            gameRow.addEventListener('dragover', handleDragOver);
            gameRow.addEventListener('drop', handleDrop);
            gameRow.addEventListener('dragend', handleDragEnd);
            gameRow.style.userSelect = 'none';
            gameRow.title = 'Drag to reorder priority';
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
            <div class="col-id text-center border-end border-dark-custom" style="padding: 0.15rem 0.5rem; white-space: nowrap; font-size: 0.75rem;">${game.ID}</div>
            <div class="col-name border-end border-dark-custom" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;">${game.Name}</div>
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

// Drag and drop functionality
let draggedElement = null;
let draggedGameId = null;

function handleDragStart(e) {
    draggedElement = this;
    draggedGameId = this.getAttribute('data-game-id');
    this.style.opacity = '0.5';
    
    // Prevent sorting when dragging
    e.stopPropagation();
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedElement !== this && draggedGameId) {
        const targetGameId = this.getAttribute('data-game-id');
        
        // Find games in data
        const draggedGame = window.gamesData.find(g => g.ID == draggedGameId);
        const targetGame = window.gamesData.find(g => g.ID == targetGameId);
        
        if (draggedGame && targetGame) {
            const draggedPriority = draggedGame.Priority;
            const targetPriority = targetGame.Priority;
            
            // Reorder priorities using the same logic as input change
            reorderPriorities(draggedGameId, targetPriority);
            
            // Save changes to localStorage
            saveGamesData(window.gamesData);
        }
    }
}

function handleDragEnd(e) {
    if (this.style) {
        this.style.opacity = '';
    }
    draggedElement = null;
    draggedGameId = null;
    e.stopPropagation();
}

// Add click handlers for row selection
function addRowClickHandlers() {
    document.querySelectorAll('.game-row').forEach((row, index) => {
        row.addEventListener('click', function(e) {
            // Don't toggle if clicking directly on checkbox or priority input
            if (e.target.type === 'checkbox' || e.target.type === 'number') return;
            
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

// Update the select all checkbox state
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalCheckboxes = document.querySelectorAll('.game-checkbox').length;
    const selectedCount = selectionState.selectedItems.size;
    
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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded, initializing application");
    
    // Load games data when page loads
    loadGamesData();
    
    // Initialize path functionality
    initializePath();
    
    // Initialize priority start functionality
    initializePriorityStart();
    
    // Initialize clipboard and download functionality
    initializeClipboardAndDownload();
    
    // Initialize resize functionality
    initializeResize();
    
    // Initialize horizontal panel resize functionality
    initializeHorizontalPanelResize();
    
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
    
    const defaultPathBtn = document.getElementById('defaultPathBtn');
    if (!defaultPathBtn) {
        console.warn("Could not find defaultPathBtn element");
        return;
    }
    
    // Handle default path button
    defaultPathBtn.addEventListener('click', function() {
        const defaultPath = getDefaultGreenLumaPath();
        folderPathInput.value = defaultPath;
        localStorage.setItem('greenlumaPath', defaultPath);
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

// Get default GreenLuma path based on OS
function getDefaultGreenLumaPath() {
    // Common default paths for GreenLuma
    const isWindows = navigator.platform.indexOf('Win') > -1;
    
    if (isWindows) {
        return 'C:\\GreenLuma\\';
    } else {
        return '~/GreenLuma/';
    }
}

// Initialize clipboard and download functionality
function initializeClipboardAndDownload() {
    console.log("Initializing clipboard and download functionality");
    
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            copyGamesListToClipboard();
        });
    } else {
        console.warn("Copy button not found");
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            downloadGamesList();
        });
    } else {
        console.warn("Download button not found");
    }
}

// Copy games list to clipboard in a formatted way
function copyGamesListToClipboard() {
    console.log("Copying games list to clipboard");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        console.warn("No games data to copy");
        showNotification("No games to copy", "warning");
        return;
    }
    
    try {
        // Sort games by priority before copying
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        // Format the games data as a text string
        let clipboardText = "GreenLuma Games List\n";
        clipboardText += "----------------------\n";
        
        sortedGames.forEach(game => {
            clipboardText += `${game.Priority}. ${game.Name} (ID: ${game.ID}, Type: ${game.Type})\n`;
        });
        
        // Copy to clipboard using the Clipboard API
        navigator.clipboard.writeText(clipboardText)
            .then(() => {
                console.log("Games list copied to clipboard");
                showNotification("Copied to clipboard!", "success");
            })
            .catch(err => {
                console.error("Failed to copy games list:", err);
                showNotification("Failed to copy to clipboard", "danger");
            });
    } catch (error) {
        console.error("Error copying games list:", error);
        showNotification("Error copying to clipboard", "danger");
    }
}

// Download games list as JSON file
function downloadGamesList() {
    console.log("Downloading games list");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        console.warn("No games data to download");
        showNotification("No games to download", "warning");
        return;
    }
    
    try {
        // Sort games by priority before downloading
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        // Convert to JSON string with nice formatting
        const jsonString = JSON.stringify(sortedGames, null, 2);
        
        // Create a Blob with the JSON data
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        
        // Get filename from the folderPath input or use default
        const folderPathInput = document.getElementById('folderPath');
        let filename = 'greenluma_games_list.json';
        
        if (folderPathInput && folderPathInput.value.trim()) {
            filename = folderPathInput.value.trim();
            // Add .json extension if not present
            if (!filename.toLowerCase().endsWith('.json')) {
                filename += '.json';
            }
        }
        
        downloadLink.download = filename;
        
        // Append to body, trigger click, then remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log(`Games list downloaded as ${filename}`);
        showNotification(`Downloaded as ${filename}`, "success");
    } catch (error) {
        console.error("Error downloading games list:", error);
        showNotification("Error downloading games list", "danger");
    }
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