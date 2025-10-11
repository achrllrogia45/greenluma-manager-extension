// App list sorting functionality for the GreenLuma Manager

// App sorting state
let appSortState = {
    column: 'Name',
    direction: 'asc'
};

// Get sorted apps based on column and direction
function getSortedApps(apps, column, direction) {
    console.log(`getSortedApps called with column=${column}, direction=${direction}`);
    
    if (!apps) {
        console.warn("No apps provided for sorting");
        return [];
    }
    
    // Create a deep copy to avoid mutation issues
    const appsToSort = JSON.parse(JSON.stringify(apps));
    
    console.log(`Sorting ${appsToSort.length} apps by ${column} in ${direction} order`);
    
    return appsToSort.sort((a, b) => {
        let valueA, valueB;
        
        switch(column) {
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
            // For numeric values (ID)
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

// Sort apps data
function sortApps(column) {
    if (!window.getAppData) return;
    
    // Toggle direction if same column, otherwise start with ascending
    if (appSortState.column === column) {
        appSortState.direction = appSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        appSortState.column = column;
        appSortState.direction = 'asc';
    }
    
    // Sync dropdown with header click
    if (typeof syncDropdownWithHeader === 'function') {
        syncDropdownWithHeader(column);
    }
    
    const sortedApps = getSortedApps(window.getAppData, column, appSortState.direction);
    
    displayAppList(sortedApps);
    updateAppSortIndicators();
}

// Update sort indicators in headers
function updateAppSortIndicators() {
    console.log(`Updating app sort indicators: ${appSortState.column} ${appSortState.direction}`);
    
    // Reset all header styles first
    document.querySelectorAll('[data-app-sort]').forEach(header => {
        header.style.fontWeight = 'normal';
        header.style.color = '#f8f9fa'; // text-light
    });
    
    // Remove all existing sort indicators
    document.querySelectorAll('.app-sort-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Add indicator to current sorted column
    if (appSortState.column) {
        const headerCell = document.querySelector(`[data-app-sort="${appSortState.column}"]`);
        if (headerCell) {
            // Make the sorted header more visible
            headerCell.style.fontWeight = 'bold';
            headerCell.style.color = '#6ea8fe'; // text-primary-custom
            
            const indicator = document.createElement('span');
            indicator.className = 'app-sort-indicator';
            indicator.style.marginLeft = '5px';
            indicator.style.fontSize = '0.65rem';
            indicator.style.color = '#6ea8fe'; // text-primary-custom
            indicator.innerHTML = appSortState.direction === 'asc' ? '▲' : '▼';
            
            headerCell.appendChild(indicator);
        }
    }
}

// Add sorting event listeners to header elements
function addAppSortingEventListeners() {
    // Remove existing event listeners first
    document.querySelectorAll('[data-app-sort]').forEach(header => {
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
    });
    
    // Add new event listeners
    document.querySelectorAll('[data-app-sort]').forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const column = this.getAttribute('data-app-sort');
            sortApps(column);
        });
        
        // Make it clear these headers are clickable
        header.style.cursor = 'pointer';
        header.title = `Sort by ${header.getAttribute('data-app-sort')}`;
    });
}

// Initialize app sorting when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing app sorting functionality");
    
    // Initialize select all functionality for app list
    document.addEventListener('change', function(e) {
        if (e.target.id === 'getAppSelectAll') {
            const checkboxes = document.querySelectorAll('.app-checkbox');
            const rows = document.querySelectorAll('.app-row');
            
            // Clear current selection
            if (typeof appSelectionState !== 'undefined') {
                appSelectionState.selectedItems.clear();
                
                checkboxes.forEach((checkbox, index) => {
                    checkbox.checked = e.target.checked;
                    
                    if (e.target.checked) {
                        const appId = checkbox.getAttribute('data-app-id');
                        appSelectionState.selectedItems.add(appId);
                    }
                    
                    if (typeof updateAppRowSelection === 'function') {
                        updateAppRowSelection(rows[index], e.target.checked);
                    }
                });
                
                // Update last selected index
                if (e.target.checked && checkboxes.length > 0) {
                    appSelectionState.lastSelectedIndex = checkboxes.length - 1;
                } else {
                    appSelectionState.lastSelectedIndex = -1;
                }
            }
        }
    });
});