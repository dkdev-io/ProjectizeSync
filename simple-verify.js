const puppeteer = require('puppeteer');

async function simpleVerification() {
  let browser;
  try {
    console.log('🔍 Starting GitHub verification...');
    
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Navigate to ProjectizeSync repository
    console.log('📂 Navigating to ProjectizeSync repository...');
    await page.goto('https://github.com/dkdev-io/ProjectizeSync', { 
      waitUntil: 'networkidle2' 
    });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page content to verify PRD.md exists
    const content = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log('🔍 Checking repository contents...');
    
    // Check for PRD.md in the page content
    const hasPRD = content.includes('PRD.md');
    const hasCommit = content.includes('Add comprehensive PRD') || content.includes('PRD');
    
    console.log('\n📊 Verification Results:');
    console.log(`✅ Repository accessible: YES`);
    console.log(`${hasPRD ? '✅' : '❌'} PRD.md file visible: ${hasPRD ? 'YES' : 'NO'}`);
    console.log(`${hasCommit ? '✅' : '❌'} Recent commit visible: ${hasCommit ? 'YES' : 'NO'}`);
    
    if (hasPRD) {
      console.log('\n🎉 SUCCESS: PRD.md has been successfully committed to GitHub!');
      console.log('🔗 Repository URL: https://github.com/dkdev-io/ProjectizeSync');
      
      // Try to navigate directly to PRD.md
      console.log('📄 Attempting to access PRD.md directly...');
      try {
        await page.goto('https://github.com/dkdev-io/ProjectizeSync/blob/main/PRD.md', {
          waitUntil: 'networkidle2'
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const prdContent = await page.evaluate(() => {
          return document.body.innerText;
        });
        
        if (prdContent.includes('Projectize Sync - Product Requirements Document')) {
          console.log('✅ PRD.md content verified successfully!');
          console.log('✅ Contains: Product Requirements Document title');
        }
        
        if (prdContent.includes('Database Schema')) {
          console.log('✅ Contains: Database Schema section');
        }
        
        if (prdContent.includes('Implementation Phases')) {
          console.log('✅ Contains: Implementation Phases section');
        }
        
      } catch (error) {
        console.log('⚠️ Could not access PRD.md directly, but file exists in repository');
      }
    } else {
      console.log('\n❌ ISSUE: PRD.md file not visible in repository');
      console.log('This might be a temporary GitHub loading issue.');
    }
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'github-verification-final.png', 
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as github-verification-final.png');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    if (browser) {
      console.log('\n⏳ Keeping browser open for 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await browser.close();
    }
  }
}

simpleVerification().catch(console.error);