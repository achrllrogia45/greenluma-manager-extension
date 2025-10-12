// Utils for GreenLuma Manager

// Calculate string similarity percentage (0-100)
function calculateSimilarity(str1, str2) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    if (str1 === str2) return 100;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const matrix = Array(str2.length + 1).fill(null)
        .map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + indicator
            );
        }
    }
    
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return Math.round((1 - distance / maxLength) * 100);
}

// Get relevant matches with 70% similarity threshold
async function getTopRelevantMatches(searchTerm, threshold = 70) {
    console.log("Fetching Steam apps list for relevance matching...");
    
    try {
        // Step 1: Get full apps list from Steam API
        const response = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
        if (!response.ok) throw new Error('Failed to fetch Steam apps list');
        
        const data = await response.json();
        const appsList = data.applist.apps;
        
        // Calculate similarity scores for all apps
        const matches = appsList.map(app => ({
            appid: app.appid,
            name: app.name,
            similarity: calculateSimilarity(searchTerm, app.name)
        }))
        .filter(match => match.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5); // Get top 5 matches
        
        console.log(`Found ${matches.length} relevant matches with ${threshold}% similarity`);
        return matches;
        
    } catch (error) {
        console.error('Error in getTopRelevantMatches:', error);
        throw error;
    }
}

// Get detailed app info including DLCs
async function getAppDetails(appId) {
    console.log(`Fetching details for app ${appId}...`);
    
    try {
        // Step 2: Get app details from Steam Store API
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
        if (!response.ok) throw new Error('Failed to fetch app details');
        
        const data = await response.json();
        return data[appId];
        
    } catch (error) {
        console.error(`Error fetching details for app ${appId}:`, error);
        throw error;
    }
}

// Get DLC names from Steam API
async function getDLCNames(dlcIds) {
    console.log(`Fetching names for ${dlcIds.length} DLCs...`);
    
    try {
        // Step 3: Get fresh apps list to ensure we have latest names
        const response = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
        if (!response.ok) throw new Error('Failed to fetch Steam apps list for DLCs');
        
        const data = await response.json();
        const appsMap = new Map(data.applist.apps.map(app => [app.appid, app.name]));
        
        // Step 4: Map DLC IDs to names
        const dlcs = dlcIds.map(dlcId => ({
            ID: dlcId.toString(),
            Name: appsMap.get(dlcId) || 'Unknown DLC',
            Type: 'DLC'
        })).filter(dlc => dlc.Name !== 'Unknown DLC');
        
        console.log(`Mapped ${dlcs.length} DLC names successfully`);
        return dlcs;
        
    } catch (error) {
        console.error('Error fetching DLC names:', error);
        throw error;
    }
}

// Main search function combining all steps
async function universalSearch(searchTerm) {
    try {
        // Step 1: Get top 5 relevant matches
        const relevantMatches = await getTopRelevantMatches(searchTerm);
        if (relevantMatches.length === 0) {
            return { success: false, message: 'No relevant matches found' };
        }
        
        const results = [];
        const processedDLCs = new Set();
        
        // Step 2 & 3: Get details for each match and their DLCs
        for (const match of relevantMatches) {
            try {
                const appDetails = await getAppDetails(match.appid);
                if (!appDetails || !appDetails.success) continue;
                
                const gameInfo = appDetails.data;
                
                // Add main app
                results.push({
                    ID: match.appid.toString(),
                    Name: match.name,
                    Type: gameInfo.type.charAt(0).toUpperCase() + gameInfo.type.slice(1)
                });
                
                // Step 4: Process DLCs if present
                if (gameInfo.dlc && gameInfo.dlc.length > 0) {
                    // Filter out already processed DLCs
                    const newDLCs = gameInfo.dlc.filter(dlcId => !processedDLCs.has(dlcId));
                    newDLCs.forEach(dlcId => processedDLCs.add(dlcId));
                    
                    if (newDLCs.length > 0) {
                        const dlcs = await getDLCNames(newDLCs);
                        results.push(...dlcs);
                    }
                }
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.warn(`Error processing match ${match.appid}:`, error);
                continue;
            }
        }
        
        return {
            success: true,
            results: results,
            totalMatches: relevantMatches.length,
            totalResults: results.length
        };
        
    } catch (error) {
        console.error('Error in universal search:', error);
        return { success: false, message: error.message };
    }
}

// Generate Steam Store link for app
function generateSteamStoreLink(appId) {
    return `https://store.steampowered.com/app/${appId}/`;
}

// Generate SteamDB link for app
function generateSteamDBLink(appId) {
    return `https://steamdb.info/app/${appId}/`;
}

// Export utilities for use in other files
window.utils = {
    calculateSimilarity,
    getTopRelevantMatches,
    getAppDetails,
    getDLCNames,
    universalSearch,
    generateSteamStoreLink,
    generateSteamDBLink
};
