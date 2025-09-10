const puppeteer = require('puppeteer');

async function verifyGitHubCommit() {
  let browser;
  try {
    console.log('🔍 Starting GitHub verification...');
    
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Navigate to ProjectizeSync repository
    console.log('📂 Navigating to ProjectizeSync repository...');
    await page.goto('https://github.com/dkdev-io/ProjectizeSync', { 
      waitUntil: 'networkidle2' 
    });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if PRD.md file exists in the file list
    console.log('🔍 Looking for PRD.md file...');
    
    try {
      // Look for PRD.md in the file listing
      await page.waitForSelector('a[title="PRD.md"]', { timeout: 10000 });
      console.log('✅ PRD.md file found in repository!');
      
      // Click on PRD.md to view its contents
      await page.click('a[title="PRD.md"]');
      
      // Wait for file content to load
      await page.waitForSelector('.blob-wrapper', { timeout: 10000 });
      
      // Check if the content contains key sections from our PRD
      const content = await page.evaluate(() => {
        return document.body.innerText;
      });
      
      const keyPhrases = [
        'Projectize Sync - Product Requirements Document',
        'Bidirectional Sync Engine',
        'Database Schema (Supabase)',
        'Implementation Phases',
        'MVP Scope Optimization'
      ];
      
      const foundPhrases = keyPhrases.filter(phrase => 
        content.includes(phrase)
      );
      
      console.log(`\n📊 Verification Results:`);
      console.log(`✅ PRD.md file: Found`);
      console.log(`✅ Content sections found: ${foundPhrases.length}/${keyPhrases.length}`);
      
      foundPhrases.forEach(phrase => {
        console.log(`   ✓ ${phrase}`);
      });
      
      if (foundPhrases.length === keyPhrases.length) {
        console.log('\n🎉 SUCCESS: PRD has been successfully committed to GitHub!');
        console.log('🔗 Repository URL: https://github.com/dkdev-io/ProjectizeSync');
      } else {
        console.log('\n⚠️ WARNING: Some content sections may be missing');
      }
      
      // Take a screenshot for verification
      await page.screenshot({ 
        path: 'github-verification.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot saved as github-verification.png');
      
    } catch (error) {
      console.log('❌ PRD.md file not found in repository');
      console.log('Error:', error.message);
      
      // Take a screenshot of the current state
      await page.screenshot({ 
        path: 'github-error.png', 
        fullPage: true 
      });
      console.log('📸 Error screenshot saved as github-error.png');
    }
    
    // Check recent commits
    console.log('\n🔍 Checking recent commits...');
    
    try {
      // Navigate back to repository root if we're in a file view
      await page.goto('https://github.com/dkdev-io/ProjectizeSync', { 
        waitUntil: 'networkidle2' 
      });
      
      // Look for commit messages
      await page.waitForSelector('.js-navigation-item', { timeout: 5000 });
      
      const commitInfo = await page.evaluate(() => {
        const commitElement = document.querySelector('.js-navigation-item .message');
        return commitElement ? commitElement.innerText.trim() : null;
      });
      
      if (commitInfo) {
        console.log(`✅ Latest commit: "${commitInfo}"`);
        
        if (commitInfo.includes('Add comprehensive PRD')) {
          console.log('✅ Commit message matches our PRD commit!');
        }
      }
      
    } catch (error) {
      console.log('⚠️ Could not verify commit information');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    if (browser) {
      // Keep browser open for 5 seconds to allow manual inspection
      console.log('\n⏳ Keeping browser open for 5 seconds for manual inspection...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await browser.close();
    }
  }
}

// Run the verification
verifyGitHubCommit().catch(console.error);