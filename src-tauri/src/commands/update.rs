use serde::{Deserialize, Serialize};

/// Information about an available update
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    /// Version string (e.g., "0.2.4")
    pub version: String,
    /// Full tag name (e.g., "v0.2.4-build5")
    pub tag: String,
    /// Release name
    pub name: String,
    /// Release notes (markdown)
    #[serde(rename = "releaseNotes")]
    pub body: String,
    /// Platform-specific download URL
    pub download_url: String,
    /// Full release page URL
    pub release_url: String,
    /// Publication date
    pub published_at: String,
}

/// GitHub Release asset
#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

/// GitHub Release response
#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    name: String,
    body: String,
    html_url: String,
    published_at: String,
    assets: Vec<GitHubAsset>,
    #[allow(dead_code)]
    prerelease: bool,
}

/// Get the platform-specific asset pattern
fn get_asset_pattern() -> &'static str {
    #[cfg(target_os = "linux")]
    {
        ".AppImage"
    }
    #[cfg(target_os = "windows")]
    {
        "-setup.exe"
    }
    #[cfg(target_os = "android")]
    {
        "-debug.apk"
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "android")))]
    {
        ""
    }
}

/// Parse version from tag name
/// Handles both "v0.2.4" and "v0.2.4-build5" formats
fn parse_version(tag: &str) -> Option<String> {
    let tag = tag.trim_start_matches('v');
    // Extract just the version part (before any dash)
    let version = tag.split('-').next()?;
    Some(version.to_string())
}

/// Parse build number from tag name
/// Returns the build number from tags like "v0.2.4-build5"
fn parse_build_number(tag: &str) -> Option<u32> {
    let parts: Vec<&str> = tag.split('-').collect();
    for part in parts {
        if part.starts_with("build") {
            return part.trim_start_matches("build").parse().ok();
        }
    }
    None
}

/// Compare two version strings with build numbers
/// Returns true if remote version is newer than current version
fn is_newer_version(current: &str, remote: &str, current_tag: &str, remote_tag: &str) -> bool {
    // First compare semantic versions
    let current_version = semver::Version::parse(current).ok();
    let remote_version = semver::Version::parse(remote).ok();
    
    match (current_version, remote_version) {
        (Some(current), Some(remote)) => {
            if remote > current {
                return true;
            }
            if remote < current {
                return false;
            }
            // Versions are equal, compare build numbers
            let current_build = parse_build_number(current_tag).unwrap_or(0);
            let remote_build = parse_build_number(remote_tag).unwrap_or(0);
            return remote_build > current_build;
        }
        _ => {
            // Fallback to string comparison if semver parsing fails
            remote != current
        }
    }
}

/// Check for updates by querying GitHub Releases API
/// Uses /releases endpoint instead of /releases/latest because
/// prerelease-only repos return 404 for /releases/latest
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    // Get current app version
    let current_version = app.config().version.clone()
        .unwrap_or_else(|| "0.0.0".to_string());
    
    log::info!("Checking for updates. Current version: {}", current_version);
    
    // Get current tag from version (assume format v{version}-build{N} or v{version})
    let current_tag = format!("v{}", current_version);
    
    // GitHub API endpoint for all releases (not /latest, which 404s for prerelease-only repos)
    let url = "https://api.github.com/repos/zocram4cc/ObsidianIRC/releases";
    
    // Create HTTP client with caching headers to avoid rate limiting
    let client = reqwest::Client::builder()
        .user_agent(format!("ObsidianIRC/{}", current_version))
        .build()
        .map_err(|e| {
            log::error!("Failed to create HTTP client: {}", e);
            format!("Failed to create HTTP client: {}", e)
        })?;
    
    // Fetch all releases with Accept header for better rate limits
    let response = client
        .get(url)
        .header("Accept", "application/vnd.github.v3+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| {
            log::error!("Failed to fetch release info: {}", e);
            format!("Failed to fetch release info: {}", e)
        })?;
    
    if !response.status().is_success() {
        log::error!("GitHub API returned status: {}", response.status());
        return Err(format!("GitHub API returned status: {}", response.status()));
    }
    
    let releases: Vec<GitHubRelease> = response
        .json()
        .await
        .map_err(|e| {
            log::error!("Failed to parse release info: {}", e);
            format!("Failed to parse release info: {}", e)
        })?;
    
    log::info!("Found {} releases", releases.len());
    
    // Find the most recent release (first in the list, as GitHub returns them sorted by date)
    let latest_release = releases
        .into_iter()
        .next()
        .ok_or_else(|| {
            log::error!("No releases found");
            "No releases found".to_string()
        })?;
    
    log::info!("Latest release tag: {}", latest_release.tag_name);
    
    // Parse remote version
    let remote_version = parse_version(&latest_release.tag_name)
        .ok_or_else(|| {
            log::error!("Failed to parse version from tag: {}", latest_release.tag_name);
            format!("Failed to parse version from tag: {}", latest_release.tag_name)
        })?;
    
    log::info!("Remote version: {}, Current version: {}", remote_version, current_version);
    
    // Check if this is a newer version
    if !is_newer_version(&current_version, &remote_version, &current_tag, &latest_release.tag_name) {
        log::info!("No update available - current version is up to date");
        return Ok(None);
    }
    
    log::info!("Update available! New version: {}", remote_version);
    
    // Find platform-specific download URL
    let pattern = get_asset_pattern();
    let download_url = latest_release
        .assets
        .iter()
        .find(|asset| asset.name.ends_with(pattern))
        .map(|asset| asset.browser_download_url.clone())
        .unwrap_or_else(|| latest_release.html_url.clone());
    
    Ok(Some(UpdateInfo {
        version: remote_version,
        tag: latest_release.tag_name,
        name: latest_release.name,
        body: latest_release.body,
        download_url,
        release_url: latest_release.html_url,
        published_at: latest_release.published_at,
    }))
}

/// Get the current app version
#[tauri::command]
pub fn get_app_version(app: tauri::AppHandle) -> String {
    app.config().version.clone()
        .unwrap_or_else(|| "0.0.0".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_version() {
        assert_eq!(parse_version("v0.2.4"), Some("0.2.4".to_string()));
        assert_eq!(parse_version("v0.2.4-build5"), Some("0.2.4".to_string()));
        assert_eq!(parse_version("0.2.4"), Some("0.2.4".to_string()));
    }

    #[test]
    fn test_parse_build_number() {
        assert_eq!(parse_build_number("v0.2.4-build5"), Some(5));
        assert_eq!(parse_build_number("v0.2.4-build123"), Some(123));
        assert_eq!(parse_build_number("v0.2.4"), None);
    }

    #[test]
    fn test_is_newer_version() {
        // Different versions
        assert!(is_newer_version("0.2.3", "0.2.4", "v0.2.3", "v0.2.4"));
        assert!(!is_newer_version("0.2.4", "0.2.4", "v0.2.4", "v0.2.4"));
        assert!(!is_newer_version("0.2.5", "0.2.4", "v0.2.5", "v0.2.4"));
        
        // Same version, different build numbers
        assert!(is_newer_version("0.2.4", "0.2.4", "v0.2.4-build4", "v0.2.4-build5"));
        assert!(!is_newer_version("0.2.4", "0.2.4", "v0.2.4-build5", "v0.2.4-build4"));
        assert!(!is_newer_version("0.2.4", "0.2.4", "v0.2.4-build5", "v0.2.4-build5"));
    }
}
