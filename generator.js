// Generator.js - Handles all generation-related functionality
// Includes: downBtn, import/export, copy/download, and generate button functionality

// Global flag to track if the list has been generated
let isListGenerated = false;

// Reset the generated flag when games data changes
function resetGeneratedFlag() {
    isListGenerated = false;
    console.log("Generated flag reset - list needs to be regenerated");
    
    // Reset generate button appearance
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        const spanElement = generateBtn.querySelector('span');
        const iconElement = generateBtn.querySelector('i');
        
        if (spanElement && spanElement.textContent === 'Generated!') {
            spanElement.textContent = 'Generate';
            iconElement.className = 'bi bi-play-fill';
            generateBtn.classList.remove('success-flash');
        }
    }
}

// Make function globally available
window.resetGeneratedFlag = resetGeneratedFlag;

// ==================== DOWN BUTTON FUNCTIONALITY ====================

// Initialize down button functionality
function initializeDownButton() {
    console.log("Initializing down button...");
    const downBtn = document.getElementById('downBtn');
    console.log("Down button element:", downBtn);
    
    if (!downBtn) {
        console.warn("Down button not found");
        return;
    }
    
    console.log("Adding click event listener to down button");
    downBtn.addEventListener('click', function() {
        console.log("Down button clicked!");
        moveSelectedAppsToMainList();
    });
    
    console.log("Down button initialization complete");
}

// Move selected apps from search results to main games list
function moveSelectedAppsToMainList() {
    console.log("moveSelectedAppsToMainList called");
    console.log("appSelectionState:", appSelectionState);
    console.log("window.getAppData:", window.getAppData);
    
    if (!appSelectionState.selectedItems || appSelectionState.selectedItems.size === 0) {
        console.warn("No apps selected");
        showNotification("No apps selected", "warning");
        return;
    }
    
    if (!window.getAppData || window.getAppData.length === 0) {
        console.warn("No search results available");
        showNotification("No search results available", "warning");
        return;
    }
    
    // Get selected apps
    const selectedApps = window.getAppData.filter(app => 
        appSelectionState.selectedItems.has(app.ID.toString())
    );
    
    console.log("Selected apps:", selectedApps);
    
    if (selectedApps.length === 0) {
        console.warn("No valid apps selected");
        showNotification("No valid apps selected", "warning");
        return;
    }
    
    // Get current games data or initialize empty array
    let currentGames = window.gamesData || [];
    console.log("Current games:", currentGames);
    
    // Get current priority start value
    const priorityStartInput = document.getElementById('priorityStart');
    const priorityStart = priorityStartInput ? parseInt(priorityStartInput.value) || 0 : 0;
    console.log("Priority start:", priorityStart);
    
    // Check for duplicates and filter them out
    const existingIds = new Set(currentGames.map(game => game.ID.toString()));
    const newApps = selectedApps.filter(app => !existingIds.has(app.ID.toString()));
    
    console.log("New apps to add:", newApps);
    
    if (newApps.length === 0) {
        showNotification("All selected apps are already in the main list", "info");
        return;
    }
    
    // Add new apps with proper priority values and links
    const startingPriority = priorityStart + currentGames.length;
    const appsToAdd = newApps.map((app, index) => ({
        ID: app.ID,
        Name: app.Name,
        Type: app.Type,
        Priority: startingPriority + index,
        SteamStoreLink: window.utils ? window.utils.generateSteamStoreLink(app.ID) : `https://store.steampowered.com/app/${app.ID}/`,
        SteamDBLink: window.utils ? window.utils.generateSteamDBLink(app.ID) : `https://steamdb.info/app/${app.ID}/`
    }));
    
    console.log("Apps to add:", appsToAdd);
    
    // Add to main games list
    window.gamesData = [...currentGames, ...appsToAdd];
    console.log("Updated gamesData:", window.gamesData);
    
    // Reset generated flag since list has changed
    resetGeneratedFlag();
    
    // Save to localStorage (using main.js function if available)
    if (typeof saveGamesData === 'function') {
        console.log("Saving games data...");
        saveGamesData(window.gamesData);
    } else {
        console.warn("saveGamesData function not available");
    }
    
    // Refresh main games display (using main.js function if available)
    if (typeof displayGames === 'function') {
        console.log("Displaying games...");
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        displayGames(sortedGames);
    } else {
        console.warn("displayGames function not available");
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
    if (typeof updateAppSelectAllState === 'function') {
        updateAppSelectAllState();
    }
    
    // Show success notification
    const duplicateCount = selectedApps.length - newApps.length;
    let message = `Added ${newApps.length} apps to main list`;
    if (duplicateCount > 0) {
        message += ` (${duplicateCount} duplicates skipped)`;
    }
    
    console.log("Success message:", message);
    showNotification(message, "success");
    
    console.log(`Moved ${newApps.length} apps to main list with Steam Store and SteamDB links`);
}

// ==================== IMPORT/EXPORT FUNCTIONALITY ====================

// Initialize import/export functionality
function initializeImportExport() {
    console.log("Initializing import/export functionality");
    
    const importBtn = document.getElementById('importBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (importBtn) {
        importBtn.addEventListener('click', function() {
            importGamesList();
        });
    } else {
        console.warn("Import button not found");
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportGamesList();
        });
    } else {
        console.warn("Export button not found");
    }
}

// Import games list from JSON file
function importGamesList() {
    console.log("Importing games list");
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Check for "AppList" parent structure
                if (!importedData.AppList || !Array.isArray(importedData.AppList)) {
                    throw new Error("Invalid file format: Expected an object with 'AppList' array property");
                }
                
                // Validate and process imported games
                const validGames = importedData.AppList.filter(game => {
                    // Must have ID and Name
                    const hasRequiredFields = game.ID && game.Name;
                    // If any field exists, it must be valid
                    const hasValidFields = (!game.Type || typeof game.Type === 'string');
                    return hasRequiredFields && hasValidFields;
                });
                
                if (validGames.length === 0) {
                    showNotification("No valid games found in the imported file", "warning");
                    return;
                }
                
                // Assign priorities and add missing links if they don't exist
                const priorityStartInput = document.getElementById('priorityStart');
                const priorityStart = priorityStartInput ? parseInt(priorityStartInput.value) || 0 : 0;
                
                const processedGames = validGames.map((game, index) => ({
                    ID: game.ID,
                    Name: game.Name,
                    Type: game.Type,
                    Priority: priorityStart + index,
                    SteamStoreLink: game.SteamStoreLink || (window.utils ? window.utils.generateSteamStoreLink(game.ID) : `https://store.steampowered.com/app/${game.ID}/`),
                    SteamDBLink: game.SteamDBLink || (window.utils ? window.utils.generateSteamDBLink(game.ID) : `https://steamdb.info/app/${game.ID}/`)
                }));
                
                // Replace current games data
                window.gamesData = processedGames;
                
                // Reset generated flag since list has changed
                resetGeneratedFlag();
                
                // Save to localStorage
                if (typeof saveGamesData === 'function') {
                    saveGamesData(window.gamesData);
                }
                
                // Refresh display
                if (typeof displayGames === 'function') {
                    const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
                    displayGames(sortedGames);
                }
                
                showNotification(`Imported ${processedGames.length} games successfully`, "success");
                console.log(`Imported ${processedGames.length} games from file:`, file.name);
                
            } catch (error) {
                console.error("Error importing games:", error);
                showNotification("Error importing file: " + error.message, "danger");
            }
        };
        
        reader.readAsText(file);
        document.body.removeChild(fileInput);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
}

// Export games list as JSON file
function exportGamesList() {
    console.log("Exporting games list");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        showNotification("No games to export", "warning");
        return;
    }
    
    try {
        // Sort games by priority before exporting
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        // Create object with AppList structure
        const exportData = {
            AppList: sortedGames
        };
        
        // Convert to JSON string with nice formatting
        const jsonString = JSON.stringify(exportData, null, 2);
        
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
        
        console.log(`Games list exported as ${filename}`);
        showNotification(`Exported ${sortedGames.length} games as ${filename}`, "success");
    } catch (error) {
        console.error("Error exporting games list:", error);
        showNotification("Error exporting games list", "danger");
    }
}

// ==================== COPY/DOWNLOAD FUNCTIONALITY ====================

// Initialize clipboard and download functionality
function initializeClipboardAndDownload() {
    console.log("Initializing clipboard and download functionality");
    
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadAppListBtn = document.getElementById('downloadAppListBtn');
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    const downloadBatBtn = document.getElementById('downloadBatBtn');
    
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            copyGamesListToClipboard();
        });
    } else {
        console.warn("Copy button not found");
    }
    
    // Manual dropdown toggle functionality as fallback
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            console.log("Download button clicked");
            const dropdownMenu = downloadBtn.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle dropdown
                const isShown = dropdownMenu.classList.contains('show');
                
                // Hide all other dropdowns first
                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
                
                if (!isShown) {
                    dropdownMenu.classList.add('show');
                    console.log("Dropdown opened");
                    
                    // Close dropdown when clicking outside
                    setTimeout(() => {
                        document.addEventListener('click', function closeDropdown(e) {
                            if (!downloadBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                                dropdownMenu.classList.remove('show');
                                document.removeEventListener('click', closeDropdown);
                                console.log("Dropdown closed");
                            }
                        });
                    }, 0);
                } else {
                    console.log("Dropdown closed");
                }
            }
        });
    }
    
    if (downloadAppListBtn) {
        downloadAppListBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Download AppList clicked");
            downloadAppListFiles();
            // Close dropdown
            const dropdownMenu = downloadAppListBtn.closest('.dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        });
    } else {
        console.warn("Download AppList button not found");
    }
    
    if (downloadZipBtn) {
        downloadZipBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Download ZIP clicked");
            downloadAsZip();
            // Close dropdown
            const dropdownMenu = downloadZipBtn.closest('.dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        });
    } else {
        console.warn("Download ZIP button not found");
    }
    
    if (downloadBatBtn) {
        downloadBatBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Download BAT clicked");
            downloadAsBat();
            // Close dropdown
            const dropdownMenu = downloadBatBtn.closest('.dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        });
    } else {
        console.warn("Download BAT button not found");
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
    
    if (!isListGenerated) {
        showNotification("Please generate the list first", "warning");
        return;
    }
    
    try {
        // Sort games by priority before copying
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        // Format the games data as ECHO commands
        let clipboardText = "";
        
        sortedGames.forEach(game => {
            clipboardText += `ECHO ${game.ID}>${game.Priority}.txt\n`;
        });
        
        // Copy to clipboard using the Clipboard API
        navigator.clipboard.writeText(clipboardText)
            .then(() => {
                console.log("ECHO commands copied to clipboard");
                showNotification("ECHO commands copied to clipboard!", "success");
            })
            .catch(err => {
                console.error("Failed to copy ECHO commands:", err);
                showNotification("Failed to copy to clipboard", "danger");
            });
    } catch (error) {
        console.error("Error copying ECHO commands:", error);
        showNotification("Error copying to clipboard", "danger");
    }
}

// Download multiple AppList files named by priority with AppID content
function downloadAppListFiles() {
    console.log("Downloading multiple AppList files");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        console.warn("No games data to download");
        showNotification("No games to download", "warning");
        return;
    }
    
    if (!isListGenerated) {
        showNotification("Please generate the list first", "warning");
        return;
    }
    
    try {
        // Sort games by priority
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        showNotification(`Downloading ${sortedGames.length} AppList files...`, "info");
        
        // Create a Promise chain to download files sequentially with proper timing
        let downloadPromise = Promise.resolve();
        
        sortedGames.forEach((game, index) => {
            downloadPromise = downloadPromise.then(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        // Create file content with just the AppID
                        const content = game.ID.toString();
                        const blob = new Blob([content], { type: 'text/plain' });
                        const downloadLink = document.createElement('a');
                        downloadLink.href = URL.createObjectURL(blob);
                        downloadLink.download = `${game.Priority}.txt`;
                        
                        // Download the file
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        
                        // Clean up the blob URL
                        setTimeout(() => {
                            URL.revokeObjectURL(downloadLink.href);
                        }, 100);
                        
                        console.log(`Downloaded: ${game.Priority}.txt with AppID: ${game.ID}`);
                        resolve();
                    }, index * 200); // 200ms delay between downloads to avoid browser blocking
                });
            });
        });
        
        // Show completion message when all downloads are done
        downloadPromise.then(() => {
            showNotification(`Successfully downloaded ${sortedGames.length} AppList files`, "success");
            console.log(`Completed download of ${sortedGames.length} AppList files`);
        });
        
    } catch (error) {
        console.error("Error downloading AppList files:", error);
        showNotification("Error downloading AppList files", "danger");
    }
}

// Download games list as ZIP with individual txt files
function downloadAsZip() {
    console.log("Downloading games list as ZIP");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        console.warn("No games data to download");
        showNotification("No games to download", "warning");
        return;
    }
    
    if (!isListGenerated) {
        showNotification("Please generate the list first", "warning");
        return;
    }
    
    try {
        // Sort games by priority
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        showNotification(`Creating ZIP with ${sortedGames.length} files...`, "info");
        
        // Create a simple ZIP file using manual ZIP format
        const files = [];
        
        // Prepare files for ZIP
        sortedGames.forEach(game => {
            const filename = `${game.Priority}.txt`;
            const content = game.ID.toString();
            files.push({
                name: filename,
                content: content
            });
        });
        
        // Create ZIP using simple ZIP implementation
        const zipBlob = createZipBlob(files);
        
        // Get filename from the folderPath input or use default
        const folderPathInput = document.getElementById('folderPath');
        let filename = 'greenluma_files.zip';
        
        if (folderPathInput && folderPathInput.value.trim()) {
            const baseName = folderPathInput.value.trim().replace(/\.(json|txt|bat|zip)$/i, '');
            filename = `${baseName}_AppList.zip`;
        }
        
        // Download the ZIP file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = filename;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(downloadLink.href);
        }, 100);
        
        console.log(`Downloaded ZIP: ${filename}`);
        showNotification(`Downloaded ${filename} with ${sortedGames.length} files`, "success");
        
    } catch (error) {
        console.error("Error creating ZIP:", error);
        showNotification("Error creating ZIP file", "danger");
    }
}

// Simple ZIP file creator
function createZipBlob(files) {
    const zipParts = [];
    const centralDirectory = [];
    let offset = 0;
    
    // Create file entries
    files.forEach((file, index) => {
        const filename = file.name;
        const content = new TextEncoder().encode(file.content);
        const crc32 = calculateCRC32(content);
        
        // Local file header
        const localHeader = new ArrayBuffer(30 + filename.length);
        const localView = new DataView(localHeader);
        const filenameBytes = new TextEncoder().encode(filename);
        
        localView.setUint32(0, 0x04034b50, true); // Local file header signature
        localView.setUint16(4, 20, true); // Version needed to extract
        localView.setUint16(6, 0, true); // General purpose bit flag
        localView.setUint16(8, 0, true); // Compression method (stored)
        localView.setUint16(10, 0, true); // Last mod file time
        localView.setUint16(12, 0, true); // Last mod file date
        localView.setUint32(14, crc32, true); // CRC32
        localView.setUint32(18, content.length, true); // Compressed size
        localView.setUint32(22, content.length, true); // Uncompressed size
        localView.setUint16(26, filename.length, true); // Filename length
        localView.setUint16(28, 0, true); // Extra field length
        
        // Add filename to header
        const headerWithName = new Uint8Array(30 + filename.length);
        headerWithName.set(new Uint8Array(localHeader));
        headerWithName.set(filenameBytes, 30);
        
        zipParts.push(headerWithName);
        zipParts.push(content);
        
        // Central directory entry
        const centralEntry = new ArrayBuffer(46 + filename.length);
        const centralView = new DataView(centralEntry);
        
        centralView.setUint32(0, 0x02014b50, true); // Central directory signature
        centralView.setUint16(4, 20, true); // Version made by
        centralView.setUint16(6, 20, true); // Version needed to extract
        centralView.setUint16(8, 0, true); // General purpose bit flag
        centralView.setUint16(10, 0, true); // Compression method
        centralView.setUint16(12, 0, true); // Last mod file time
        centralView.setUint16(14, 0, true); // Last mod file date
        centralView.setUint32(16, crc32, true); // CRC32
        centralView.setUint32(20, content.length, true); // Compressed size
        centralView.setUint32(24, content.length, true); // Uncompressed size
        centralView.setUint16(28, filename.length, true); // Filename length
        centralView.setUint16(30, 0, true); // Extra field length
        centralView.setUint16(32, 0, true); // File comment length
        centralView.setUint16(34, 0, true); // Disk number start
        centralView.setUint16(36, 0, true); // Internal file attributes
        centralView.setUint32(38, 0, true); // External file attributes
        centralView.setUint32(42, offset, true); // Relative offset of local header
        
        const centralWithName = new Uint8Array(46 + filename.length);
        centralWithName.set(new Uint8Array(centralEntry));
        centralWithName.set(filenameBytes, 46);
        
        centralDirectory.push(centralWithName);
        
        offset += 30 + filename.length + content.length;
    });
    
    // Calculate central directory size
    const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0);
    
    // End of central directory record
    const endRecord = new ArrayBuffer(22);
    const endView = new DataView(endRecord);
    
    endView.setUint32(0, 0x06054b50, true); // End of central directory signature
    endView.setUint16(4, 0, true); // Number of this disk
    endView.setUint16(6, 0, true); // Disk where central directory starts
    endView.setUint16(8, files.length, true); // Number of central directory records on this disk
    endView.setUint16(10, files.length, true); // Total number of central directory records
    endView.setUint32(12, centralDirSize, true); // Size of central directory
    endView.setUint32(16, offset, true); // Offset of start of central directory
    endView.setUint16(20, 0, true); // ZIP file comment length
    
    // Combine all parts
    const allParts = [...zipParts, ...centralDirectory, new Uint8Array(endRecord)];
    
    return new Blob(allParts, { type: 'application/zip' });
}

// Simple CRC32 calculation
function calculateCRC32(data) {
    const crcTable = [];
    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
        }
        crcTable[i] = crc;
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Download games list as BAT file with ECHO commands
function downloadAsBat() {
    console.log("Downloading games list as BAT");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        console.warn("No games data to download");
        showNotification("No games to download", "warning");
        return;
    }
    
    if (!isListGenerated) {
        showNotification("Please generate the list first", "warning");
        return;
    }
    
    try {
        // Sort games by priority
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        // Create BAT file content with user prompt and ECHO commands that create AppList folder
        // The generated batch will:
        // 1) Ask user where to generate (1 = here, 2 = Steam path)
        // 2) Create an "AppList" folder in the chosen location
        // 3) Create/overwrite files named <Priority>.txt containing the AppID
        const now = new Date();
        let batContent = "@echo off\r\n";
        batContent += "REM GreenLuma Games List Generator\r\n";
        batContent += `REM Generated on: ${now.toLocaleString()}\r\n`;
    batContent += `REM Total games: ${sortedGames.length}\r\n\r\n`;

    // If this script was re-launched with an 'elevated' flag, capture it and the user's choice
    // Usage when re-launching: %~f0 elevated 2  -> elevated run and proceed with choice 2
    batContent += `if /i "%~1"=="elevated" (\r\n`;
    batContent += `  set "ELEVATED=1"\r\n`;
    batContent += `  set "USERCHOICE=%~2"\r\n`;
    batContent += `)\r\n\r\n`;

        // Prompt for location
        batContent += `echo Q: Choose where to generate?\r\n`;
        batContent += `echo 1. Here\r\n`;
        batContent += `echo 2. Steam (C:\\Program Files (x86)\\Steam)\r\n`;
    // If USERCHOICE was provided (when elevated relaunch), skip prompting
    batContent += `if defined USERCHOICE goto CHOICE%USERCHOICE%\r\n`;
    // Use CHOICE so user can press 1 or 2 without needing to press Enter
    batContent += `choice /c 12 /n /m "Enter choice: "\r\n`;
    // CHOICE sets ERRORLEVEL to the index of the chosen key (1 or 2)
    // Use goto labels to avoid placing parentheses-containing paths inside a parenthesized block
    batContent += `if errorlevel 2 goto CHOICE2\r\n`;
    batContent += `if errorlevel 1 goto CHOICE1\r\n`;
    batContent += `echo Please input the correct choice\r\n`;
    batContent += `pause\r\n`;
    batContent += `exit /b 1\r\n`;
    batContent += `:CHOICE2\r\n`;
    // If already elevated (relaunch), just set target and continue
    batContent += `if defined ELEVATED (\r\n`;
    batContent += `  set "target=C:\\Program Files (x86)\\Steam\\AppList"\r\n`;
    batContent += `  goto AFTER_CHOICE\r\n`;
    batContent += `)\r\n`;
    // Not elevated: request elevation and pass the chosen option so the elevated run proceeds
    batContent += `echo Requesting admin privileges for Steam...\r\n`;
    batContent += `powershell -Command "Start-Process -FilePath '%~f0' -ArgumentList 'elevated','2' -Verb runAs"\r\n`;
    batContent += `exit /b\r\n`;
    batContent += `:CHOICE1\r\n`;
    batContent += `set "target=%cd%\\AppList"\r\n`;
    batContent += `:AFTER_CHOICE\r\n\r\n`;

    // Create directory if not exists (don't cd into it; use full quoted paths when writing files)
    batContent += `if not exist "%target%" mkdir "%target%"\r\n\r\n`;

        // For each game, write the ID into <Priority>.txt; use > to overwrite
        sortedGames.forEach(game => {
            // Escape any percent signs in ID or priority
            const id = String(game.ID).replace(/%/g, '%%');
            const pr = String(game.Priority).replace(/%/g, '%%');
            // Write directly to quoted full path to handle spaces and parentheses safely
            batContent += `echo ${id}>"%target%\\${pr}.txt"\r\n`;
        });

        batContent += `\r\necho All files generated successfully!\r\n`;
        batContent += `pause\r\n`;
        
        // Create and download BAT file
        const blob = new Blob([batContent], { type: 'text/plain' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        
        // Get filename from the folderPath input or use default
        const folderPathInput = document.getElementById('folderPath');
        let filename = 'greenluma_generator.bat';
        
        if (folderPathInput && folderPathInput.value.trim()) {
            const baseName = folderPathInput.value.trim().replace(/\.(json|txt|bat)$/i, '');
            filename = `${baseName}_generator.bat`;
        }
        
        downloadLink.download = filename;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log(`Downloaded BAT file: ${filename}`);
        showNotification(`Downloaded ${filename}`, "success");
        
    } catch (error) {
        console.error("Error downloading BAT file:", error);
        showNotification("Error downloading BAT file", "danger");
    }
}

// ==================== GENERATE FUNCTIONALITY ====================

// Initialize generate button functionality
function initializeGenerateButton() {
    console.log("Initializing generate button functionality");
    
    const generateBtn = document.getElementById('generateBtn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            generateGreenLumaFiles();
        });
    } else {
        console.warn("Generate button not found");
    }
}

// Generate GreenLuma configuration files based on games list
function generateGreenLumaFiles() {
    console.log("Generating GreenLuma files");
    
    if (!window.gamesData || window.gamesData.length === 0) {
        console.warn("No games data to generate");
        showNotification("No games to generate", "warning");
        return;
    }
    
    try {
        // Sort games by priority
        const sortedGames = [...window.gamesData].sort((a, b) => parseInt(a.Priority) - parseInt(b.Priority));
        
        // Set the generated flag - this prepares the list for copy/download operations
        isListGenerated = true;
        
        // Update generate button to show success state temporarily
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            const originalText = generateBtn.querySelector('span').textContent;
            const iconElement = generateBtn.querySelector('i');
            
            // Change to success state
            generateBtn.querySelector('span').textContent = 'Generated!';
            iconElement.className = 'bi bi-check-circle-fill';
            generateBtn.classList.add('success-flash');
            
            // Reset after animation
            setTimeout(() => {
                generateBtn.querySelector('span').textContent = originalText;
                iconElement.className = 'bi bi-play-fill';
                generateBtn.classList.remove('success-flash');
            }, 2000);
        }
        
        console.log(`Generated list with ${sortedGames.length} games - ready for copy/download`);
        showNotification(`List generated! ${sortedGames.length} games ready for copy/download`, "success");
        
    } catch (error) {
        console.error("Error generating GreenLuma files:", error);
        showNotification("Error generating list", "danger");
    }
}

// Generate a summary file with game details for reference
function generateSummaryFile(sortedGames) {
    try {
        let summaryContent = "GreenLuma Games Summary\n";
        summaryContent += "======================\n\n";
        summaryContent += `Generated on: ${new Date().toLocaleString()}\n`;
        summaryContent += `Total games: ${sortedGames.length}\n\n`;
        
        summaryContent += "Games List:\n";
        summaryContent += "-----------\n";
        
        sortedGames.forEach(game => {
            summaryContent += `${game.Priority}. ${game.Name}\n`;
            summaryContent += `   ID: ${game.ID}\n`;
            summaryContent += `   Type: ${game.Type}\n`;
            if (game.SteamStoreLink) {
                summaryContent += `   Store: ${game.SteamStoreLink}\n`;
            }
            if (game.SteamDBLink) {
                summaryContent += `   SteamDB: ${game.SteamDBLink}\n`;
            }
            summaryContent += "\n";
        });
        
        // Create and download summary file
        const summaryBlob = new Blob([summaryContent], { type: 'text/plain' });
        const summaryLink = document.createElement('a');
        summaryLink.href = URL.createObjectURL(summaryBlob);
        
        // Get custom filename or use default
        const folderPathInput = document.getElementById('folderPath');
        let summaryFilename = 'greenluma_summary.txt';
        
        if (folderPathInput && folderPathInput.value.trim()) {
            const baseName = folderPathInput.value.trim().replace(/\.(json|txt)$/i, '');
            summaryFilename = `${baseName}_summary.txt`;
        }
        
        summaryLink.download = summaryFilename;
        
        // Small delay to avoid browser download conflicts
        setTimeout(() => {
            document.body.appendChild(summaryLink);
            summaryLink.click();
            document.body.removeChild(summaryLink);
            
            console.log(`Generated summary file: ${summaryFilename}`);
        }, 500);
        
    } catch (error) {
        console.error("Error generating summary file:", error);
        // Don't show error notification for summary file failure
    }
}

// ==================== INITIALIZATION ====================

// Initialize all generator functionality
function initializeGenerator() {
    console.log("Initializing generator module...");
    
    // Initialize all generator-related functionality
    initializeDownButton();
    initializeImportExport();
    initializeClipboardAndDownload();
    initializeGenerateButton();
    
    console.log("Generator module initialization complete");
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGenerator);
} else {
    // DOM is already loaded
    initializeGenerator();
}