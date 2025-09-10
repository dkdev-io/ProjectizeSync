import MotionClient from '../lib/motion-client'
import TrelloClient from '../lib/trello-client'

// API Testing utilities
export const APITester = {
  // Test Motion API with credentials
  async testMotion(accessToken) {
    const client = new MotionClient(accessToken)
    const results = {
      platform: 'motion',
      tests: [],
      overall: 'unknown'
    }

    try {
      // Test 1: Get user info
      console.log('Testing Motion: Getting user info...')
      const userTest = await this.runTest(
        'User Info',
        () => client.getUser(),
        'Successfully retrieved user information'
      )
      results.tests.push(userTest)

      // Test 2: Get workspaces
      console.log('Testing Motion: Getting workspaces...')
      const workspacesTest = await this.runTest(
        'Workspaces',
        () => client.getWorkspaces(),
        'Successfully retrieved workspaces'
      )
      results.tests.push(workspacesTest)

      // Test 3: Get projects
      console.log('Testing Motion: Getting projects...')
      const projectsTest = await this.runTest(
        'Projects',
        () => client.getProjects(),
        'Successfully retrieved projects'
      )
      results.tests.push(projectsTest)

      // Test 4: Get tasks (with limit)
      console.log('Testing Motion: Getting tasks...')
      const tasksTest = await this.runTest(
        'Tasks',
        () => client.getTasks(null, { limit: 10 }),
        'Successfully retrieved tasks'
      )
      results.tests.push(tasksTest)

      // Determine overall status
      const passedTests = results.tests.filter(test => test.status === 'passed').length
      const totalTests = results.tests.length

      if (passedTests === totalTests) {
        results.overall = 'passed'
      } else if (passedTests > 0) {
        results.overall = 'partial'
      } else {
        results.overall = 'failed'
      }

    } catch (error) {
      console.error('Motion API testing failed:', error)
      results.overall = 'failed'
      results.error = error.message
    }

    return results
  },

  // Test Trello API with credentials
  async testTrello(apiKey, accessToken) {
    const client = new TrelloClient(apiKey, accessToken)
    const results = {
      platform: 'trello',
      tests: [],
      overall: 'unknown'
    }

    try {
      // Test 1: Get user info
      console.log('Testing Trello: Getting user info...')
      const userTest = await this.runTest(
        'User Info',
        () => client.getMe(),
        'Successfully retrieved user information'
      )
      results.tests.push(userTest)

      // Test 2: Get organizations
      console.log('Testing Trello: Getting organizations...')
      const orgsTest = await this.runTest(
        'Organizations',
        () => client.getOrganizations(),
        'Successfully retrieved organizations'
      )
      results.tests.push(orgsTest)

      // Test 3: Get boards
      console.log('Testing Trello: Getting boards...')
      const boardsTest = await this.runTest(
        'Boards',
        () => client.getBoards(),
        'Successfully retrieved boards'
      )
      results.tests.push(boardsTest)

      // Test 4: Get board details (if boards exist)
      const boardsData = boardsTest.data
      if (boardsData && boardsData.length > 0) {
        console.log('Testing Trello: Getting board details...')
        const boardDetailsTest = await this.runTest(
          'Board Details',
          () => client.getBoard(boardsData[0].id),
          'Successfully retrieved board details'
        )
        results.tests.push(boardDetailsTest)
      }

      // Determine overall status
      const passedTests = results.tests.filter(test => test.status === 'passed').length
      const totalTests = results.tests.length

      if (passedTests === totalTests) {
        results.overall = 'passed'
      } else if (passedTests > 0) {
        results.overall = 'partial'
      } else {
        results.overall = 'failed'
      }

    } catch (error) {
      console.error('Trello API testing failed:', error)
      results.overall = 'failed'
      results.error = error.message
    }

    return results
  },

  // Run individual test
  async runTest(name, testFunction, successMessage) {
    const test = {
      name,
      status: 'unknown',
      message: '',
      data: null,
      duration: 0
    }

    const startTime = Date.now()

    try {
      const result = await testFunction()
      test.status = 'passed'
      test.message = successMessage
      test.data = result
    } catch (error) {
      test.status = 'failed'
      test.message = error.message
      test.error = error
    } finally {
      test.duration = Date.now() - startTime
    }

    return test
  },

  // Test both platforms
  async testBothPlatforms(credentials) {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
      }
    }

    const startTime = Date.now()

    try {
      // Test Motion if credentials provided
      if (credentials.motion?.access_token) {
        console.log('Starting Motion API tests...')
        results.tests.motion = await this.testMotion(credentials.motion.access_token)
        results.summary.total += results.tests.motion.tests.length
        results.summary.passed += results.tests.motion.tests.filter(t => t.status === 'passed').length
        results.summary.failed += results.tests.motion.tests.filter(t => t.status === 'failed').length
      }

      // Test Trello if credentials provided
      if (credentials.trello?.api_key && credentials.trello?.access_token) {
        console.log('Starting Trello API tests...')
        results.tests.trello = await this.testTrello(
          credentials.trello.api_key,
          credentials.trello.access_token
        )
        results.summary.total += results.tests.trello.tests.length
        results.summary.passed += results.tests.trello.tests.filter(t => t.status === 'passed').length
        results.summary.failed += results.tests.trello.tests.filter(t => t.status === 'failed').length
      }

      results.summary.duration = Date.now() - startTime

      // Log summary
      console.log('API Testing Summary:', results.summary)

      return results

    } catch (error) {
      console.error('API testing failed:', error)
      return {
        ...results,
        error: error.message,
        summary: {
          ...results.summary,
          duration: Date.now() - startTime
        }
      }
    }
  },

  // Format test results for display
  formatResults(results) {
    const lines = []
    
    lines.push(`API Testing Results - ${new Date(results.timestamp).toLocaleString()}`)
    lines.push('='.repeat(60))
    
    // Summary
    lines.push(`Total Tests: ${results.summary.total}`)
    lines.push(`Passed: ${results.summary.passed}`)
    lines.push(`Failed: ${results.summary.failed}`)
    lines.push(`Duration: ${results.summary.duration}ms`)
    lines.push('')

    // Platform details
    Object.entries(results.tests).forEach(([platform, platformResults]) => {
      lines.push(`${platform.toUpperCase()} Tests (${platformResults.overall}):`)
      lines.push('-'.repeat(30))
      
      platformResults.tests.forEach(test => {
        const status = test.status === 'passed' ? '✅' : '❌'
        lines.push(`${status} ${test.name}: ${test.message} (${test.duration}ms)`)
      })
      
      lines.push('')
    })

    return lines.join('\n')
  }
}

export default APITester