// Version checking and update notification
// Fetches latest release from GitHub and compares with local version

/**
 * Normalize version string to array of numbers for comparison
 * Supports formats: v1, v1.2.3, 1.23, etc.
 * @param {string} version - Version string (e.g., "v1.2.3" or "1.2.3")
 * @returns {number[]} Array of version numbers
 */
function normalizeVersion(version) {
    // Remove 'v' prefix if present
    const cleanVersion = version.replace(/^v/i, '');
    
    // Split by dots and convert to numbers
    const parts = cleanVersion.split('.').map(part => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
    });
    
    // Ensure at least 3 parts (major.minor.patch)
    while (parts.length < 3) {
        parts.push(0);
    }
    
    return parts;
}

/**
 * Compare two version strings
 * @param {string} version1 - First version string
 * @param {string} version2 - Second version string
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(version1, version2) {
    const v1Parts = normalizeVersion(version1);
    const v2Parts = normalizeVersion(version2);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1 = v1Parts[i] || 0;
        const v2 = v2Parts[i] || 0;
        
        if (v1 < v2) return -1;
        if (v1 > v2) return 1;
    }
    
    return 0;
}

/**
 * Fetch latest version from GitHub and update UI accordingly
 */
async function checkForUpdates() {
    const repo = "achrllrogia45/greenluma-manager-extension";
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const displayElement = document.getElementById("version-display");
    const updateElement = document.getElementById("version-update");

    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error("Failed to fetch version from GitHub");
        }

        const data = await response.json();
        let githubVersion = data.tag_name; // e.g., "v1.0.4" or "1.0.4"
        
        // Ensure version has 'v' prefix for display
        if (!githubVersion.startsWith('v')) {
            githubVersion = `v${githubVersion}`;
        }

        // Get current local version from HTML
        const localVersion = displayElement ? displayElement.textContent.trim() : "v0";

        console.log(`Local version: ${localVersion}, GitHub version: ${githubVersion}`);

        // Compare versions
        const comparison = compareVersions(localVersion, githubVersion);
        
        if (comparison < 0) {
            // Local version is older than GitHub version - show update notification
            console.log("Update available!");
            if (updateElement) {
                updateElement.style.display = "";
                updateElement.classList.remove("d-none");
            }
        } else {
            // Local version is up to date or newer - hide update notification
            console.log("Version is up to date");
            if (updateElement) {
                updateElement.style.display = "none";
                updateElement.classList.add("d-none");
            }
        }

        // Optionally update the version display
        // Uncomment the following line if you want to always show the GitHub version
        // if (displayElement) {
        //     displayElement.textContent = githubVersion;
        // }

    } catch (error) {
        console.error("Error checking for updates:", error);
        
        // On error, hide the update notification to avoid confusion
        if (updateElement) {
            updateElement.style.display = "none";
            updateElement.classList.add("d-none");
        }
        
        // Keep the local version as fallback
        if (!displayElement || !displayElement.textContent) {
            if (displayElement) {
                displayElement.textContent = "v2"; // Your current version as fallback
            }
        }
    }
}

// Run the version check when the page loads
window.addEventListener("DOMContentLoaded", checkForUpdates);

// Optionally, check for updates periodically (every 30 minutes)
// Uncomment the following lines if you want periodic checks
// setInterval(checkForUpdates, 30 * 60 * 1000);
