import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

/**
 * Version Update and Deployment Automation Script
 * 
 * 1. Update version in package.json
 * 2. Synchronize version in manifest.json, versions.json
 * 3. Run build
 * 4. Create Git commit
 * 5. Create Git tag
 * 6. Push changes to GitHub (REQUIRES Github CLI: https://cli.github.com)
 */

// Version type definitions
const VERSION_TYPES = {
  PATCH: 'patch',
  MINOR: 'minor',
  MAJOR: 'major'
};

// Default settings
const DEFAULT_VERSION_TYPE = VERSION_TYPES.PATCH;
const RELEASE_FILES = ['main.js', 'manifest.json', 'styles.css'];
const MIN_APP_VERSION = "0.15.0"

// Store original versions for rollback if needed
let originalPackageVersion = '';
let originalManifestVersion = '';

/**
 * Updates version value from the version string.
 * @param {string} version - Current version (e.g., '0.2.2')
 * @param {string} type - Update type ('patch', 'minor', 'major')
 * @returns {string} Updated version
 */
const updateVersion = (version, type = DEFAULT_VERSION_TYPE) => {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case VERSION_TYPES.MAJOR:
      return `${major + 1}.0.0`;
    case VERSION_TYPES.MINOR:
      return `${major}.${minor + 1}.0`;
    case VERSION_TYPES.PATCH:
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

/**
 * Gets version information before any changes are made.
 * @returns {string} Previous version
 */
const getPreviousVersion = () => {
  const manifestPath = path.resolve(process.cwd(), 'manifest.json');
  const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return manifestData.version;
}

/**
 * Updates version information in package.json file.
 * @param {string} versionType - Version type to update
 * @returns {string} New version
 */
const updatePackageVersion = (versionType) => {
  const packagePath = path.resolve(process.cwd(), 'package.json');
  const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
  
  const currentVersion = packageData.version;
  originalPackageVersion = currentVersion; // Store original version for possible rollback
  const newVersion = updateVersion(currentVersion, versionType);
  
  packageData.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(packageData, null, '\t') + '\n');
  
  console.log(`📦 Updated package.json version: ${currentVersion} → ${newVersion}`);
  return newVersion;
};

/**
 * Updates version information in manifest.json file.
 * @param {string} newVersion - Version to update
 */
const updateManifestVersion = (newVersion) => {
  const manifestPath = path.resolve(process.cwd(), 'manifest.json');
  const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
  
  const currentVersion = manifestData.version;
  originalManifestVersion = currentVersion; // Store original version for possible rollback
  manifestData.version = newVersion;
  
  writeFileSync(manifestPath, JSON.stringify(manifestData, null, '\t') + '\n');
  console.log(`📋 Updated manifest.json version: ${currentVersion} → ${newVersion}`);
};

/**
 * Updates version information in versions.json file.
 * @param {string} previousVersion - Previous version
 * @param {string} newVersion - Version to update
 */
const updateVersionsVersion = (previousVersion, newVersion, minAppVersion) => {
  const versionsPath = path.resolve(process.cwd(), 'versions.json');
  const versionsData = JSON.parse(readFileSync(versionsPath, 'utf8'));
  
  const manifestPath = path.resolve(process.cwd(), 'manifest.json');
  const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const currentVersion = manifestData.version;
  versionsData[newVersion] = minAppVersion;
  
  writeFileSync(versionsPath, JSON.stringify(versionsData, null, '\t') + '\n');
  console.log(`📋 Updated versions.json version: ${previousVersion} → ${newVersion}`);
};

/**
 * Run project build
 */
const buildProject = () => {
  try {
    console.log('🔨 Starting project build...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
};

/**
 * Rollback version changes if the release process fails
 */
const rollbackVersions = () => {
  if (originalPackageVersion) {
    try {
      const packagePath = path.resolve(process.cwd(), 'package.json');
      const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
      const currentVersion = packageData.version;
      
      packageData.version = originalPackageVersion;
      writeFileSync(packagePath, JSON.stringify(packageData, null, '\t') + '\n');
      console.log(`♻️ Rolled back package.json version: ${currentVersion} → ${originalPackageVersion}`);
    } catch (error) {
      console.error('❌ Failed to rollback package.json version:', error.message);
    }
  }

  if (originalManifestVersion) {
    try {
      const manifestPath = path.resolve(process.cwd(), 'manifest.json');
      const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const currentVersion = manifestData.version;
      
      const versionsPath = path.resolve(process.cwd(), 'versions.json');
      const versionsData = JSON.parse(readFileSync(versionsPath, 'utf8'));
      
      // remove last version from JSON
      let keys = Object.keys(versionsData)
      delete versionsData[keys[keys.length-1]]

      writeFileSync(versionsPath, JSON.stringify(versionsData, null, '\t') + '\n');
      console.log(`♻️ Rolled back versions.json version: ${currentVersion} → ${originalManifestVersion}`);
    } catch (error) {
      console.error('❌ Failed to rollback versions.json version:', error.message);
    }
  }

  if (originalManifestVersion) {
    try {
      const manifestPath = path.resolve(process.cwd(), 'manifest.json');
      const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const currentVersion = manifestData.version;
      
      manifestData.version = originalManifestVersion;
      writeFileSync(manifestPath, JSON.stringify(manifestData, null, '\t') + '\n');
      console.log(`♻️ Rolled back manifest.json version: ${currentVersion} → ${originalManifestVersion}`);
    } catch (error) {
      console.error('❌ Failed to rollback manifest.json version:', error.message);
    }
  }


};

/**
 * Create Git commit and tag
 * @param {string} version - New version
 */
const createGitCommitAndTag = (version) => {
  try {
    // Stage changed files
    try {
      execSync('git add package.json manifest.json versions.json', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to stage package.json, versions.json and manifest.json:', error.message);
      return false;
    }

    // Try to stage release files
    try {
      execSync(`git add ${RELEASE_FILES.join(' ')}`, { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Note: Some release files could not be staged. This may be normal if they are gitignored.');
    }
    
    // Create commit
    const commitMessage = `chore: release ${version}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log(`✅ Commit created: ${commitMessage}`);
    
    // Create tag
    const tagName = `${version}`;
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: 'inherit' });
    console.log(`🏷️ Tag created: ${tagName}`);
    
    // Push changes
    execSync('git push', { stdio: 'inherit' });
    execSync('git push --tags', { stdio: 'inherit' });
    console.log('🚀 Changes pushed to GitHub');
    
    // Create GitHub Release
    try {
      console.log('📦 Creating GitHub Release...');
      
      // First check if GitHub CLI is installed
      try {
        execSync('gh --version', { stdio: 'pipe' });
      } catch (error) {
        console.log('⚠️ GitHub CLI not found. Skipping GitHub Release creation.');
        console.log('ℹ️ To create GitHub Releases, install GitHub CLI: https://cli.github.com/');
        return;
      }
      
      // Get previous tag for changelog link
      let previousTag = '';
      try {
        // Get all tags sorted by version (newest first)
        const tagsOutput = execSync('git tag --sort=-v:refname', { encoding: 'utf-8' });
        // Split by line and remove empty lines
        const tags = tagsOutput.split('\n').filter(tag => tag.trim() !== '');
        
        // If current tag is in the list, get the next one (which is the previous release)
        const currentTagIndex = tags.indexOf(tagName);
        if (currentTagIndex >= 0 && currentTagIndex < tags.length - 1) {
          previousTag = tags[currentTagIndex + 1];
        } else if (tags.length > 1 && currentTagIndex < 0) {
          // If new tag is not yet in the list, take the first one
          previousTag = tags[0];
        }
      } catch (error) {
        console.warn('⚠️ Could not determine previous tag:', error.message);
      }
      
      // Create release notes with changelog link if previous tag exists
      let releaseNotes = `${tagName}`;
      if (previousTag) {
        const repoUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' })
          .trim()
          .replace(/\.git$/, '')
          .replace(/^git@github\.com:/, 'https://github.com/');
          
        releaseNotes += `\n\n**Full Changelog**: ${repoUrl}/compare/${previousTag}...${tagName}`;
      }
      
      // Create GitHub Release using GitHub CLI
      const releaseCommand = `gh release create ${tagName} ${RELEASE_FILES.join(' ')} --title "Release ${tagName}" --notes "${releaseNotes}"`;
      execSync(releaseCommand, { stdio: 'inherit' });
      console.log(`✅ GitHub Release created: ${tagName}`);
    } catch (releaseError) {
      console.error('⚠️ Failed to create GitHub Release:', releaseError.message);
      console.log('Release files were still committed and pushed to GitHub.');
    }
    return true; // Successfully created commit, tag, and pushed
  } catch (error) {
    console.error('❌ Error during Git operations:', error.message);
    return false; // Failed to complete Git operations
  }
};

/**
 * Check if Git working tree is clean
 * @returns {boolean} Whether the working tree is clean
 */
const isGitWorkingTreeClean = () => {
  try {
    // Check for uncommitted changes
    const output = execSync('git status --porcelain', { encoding: 'utf-8' });
    return output.trim() === '';
  } catch (error) {
    console.error('❌ Error checking Git status:', error.message);
    return false;
  }
};

/**
 * Main function
 */
const main = () => {
  let success = true;
  let newVersion = '';
  
  try {
    // Check for uncommitted changes
    if (!isGitWorkingTreeClean()) {
      console.error('❌ Cannot proceed with release: You have uncommitted changes.');
      console.log('Please commit or stash your changes before running the release script.');
      process.exit(1);
    }
    
    // Check command line arguments
    const args = process.argv.slice(2);
    const versionType = args[0] || DEFAULT_VERSION_TYPE;
    
    if (!Object.values(VERSION_TYPES).includes(versionType)) {
      console.error(`❌ Invalid version type: ${versionType}`);
      console.log(`Valid options: ${Object.values(VERSION_TYPES).join(', ')}`);
      process.exit(1);
    }

    let previousVersion = getPreviousVersion()
    
    // Step 1: Update package.json version
    try {
      newVersion = updatePackageVersion(versionType);
    } catch (error) {
      console.error('❌ Failed to update package.json version:', error.message);
      success = false;
    }
    
    // Step 2: Update manifest.json version
    if (success) {
      try {
        updateManifestVersion(newVersion);
      } catch (error) {
        console.error('❌ Failed to update manifest.json version:', error.message);
        success = false;
      }
    }
        
    // Step 2.5: Update versions.json version
    if (success) {
      try {
        updateVersionsVersion(previousVersion, newVersion, MIN_APP_VERSION);
      } catch (error) {
        console.error('❌ Failed to update versions.json version:', error.message);
        success = false;
      }
    }
    
    // Step 3: Build the project
    if (success) {
      if (!buildProject()) {
        console.error('❌ Build process failed.');
        success = false;
      }
    }
    
    // Step 4: Git operations
    if (success) {
      if (!createGitCommitAndTag(newVersion)) {
        console.error('❌ Git operations failed.');
        success = false;
      }
    }
    
    // Check overall success
    if (success) {
      console.log(`\n🎉 Release ${newVersion} completed successfully!`);
    } else {
      console.error('❌ Release process failed. Rolling back version changes...');
      rollbackVersions();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error during release process:', error.message);
    rollbackVersions();
    process.exit(1);
  }
};

// Run script
main();
