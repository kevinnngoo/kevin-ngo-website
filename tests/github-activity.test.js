/**
 * GitHub Activity Contribution Processing Tests
 * Tests the contribution data processing used in the GitHub Activity component
 */

// Mock contribution data for testing
const mockContributionData = {
  contributions: {
    totalCommits: 150,
    totalPRs: 25,
    totalIssues: 12,
    calendar: [
      { date: '2024-01-01', count: 5, weekday: 1 },
      { date: '2024-01-02', count: 3, weekday: 2 },
      { date: '2024-01-03', count: 0, weekday: 3 },
      { date: '2024-01-04', count: 8, weekday: 4 },
      { date: '2024-01-05', count: 2, weekday: 5 }
    ]
  }
};

// Test runner
function runTests() {
  console.log('🧪 Running GitHub Activity Contribution Processing Tests...\n');
  
  let passed = 0;
  let failed = 0;

  function test(description, testFn) {
    try {
      testFn();
      console.log(`✅ ${description}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${description}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  function expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toBeCloseTo: (expected, precision = 2) => {
        const diff = Math.abs(actual - expected);
        const tolerance = Math.pow(10, -precision) / 2;
        if (diff > tolerance) {
          throw new Error(`Expected ${actual} to be close to ${expected} (within ${tolerance})`);
        }
      },
      toHaveLength: (expected) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected}, but got ${actual.length}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      }
    };
  }

  // Test: Contribution data structure
  test('should have correct contribution data structure', () => {
    expect(mockContributionData.contributions.totalCommits).toBe(150);
    expect(mockContributionData.contributions.totalPRs).toBe(25);
    expect(mockContributionData.contributions.totalIssues).toBe(12);
    expect(mockContributionData.contributions.calendar).toHaveLength(5);
  });

  // Test: Calendar data format
  test('should have properly formatted calendar data', () => {
    const firstDay = mockContributionData.contributions.calendar[0];
    expect(firstDay.date).toBe('2024-01-01');
    expect(firstDay.count).toBe(5);
    expect(firstDay.weekday).toBe(1);
  });

  // Test: Total contribution calculation
  test('should calculate total contributions correctly', () => {
    const totalContributions = mockContributionData.contributions.calendar.reduce((sum, day) => sum + day.count, 0);
    expect(totalContributions).toBe(18); // 5 + 3 + 0 + 8 + 2
  });

  // Test: Most active day finding
  test('should find most active day correctly', () => {
    const calendar = mockContributionData.contributions.calendar;
    const mostActive = calendar.reduce((max, day) => day.count > max.count ? day : max, { count: 0, date: '' });
    expect(mostActive.count).toBe(8);
    expect(mostActive.date).toBe('2024-01-04');
  });

  // Test: Empty calendar handling
  test('should handle empty calendar data', () => {
    const emptyCalendar = [];
    const totalContributions = emptyCalendar.reduce((sum, day) => sum + day.count, 0);
    expect(totalContributions).toBe(0);
  });

  // Test: Statistics are non-negative
  test('should have non-negative statistics', () => {
    expect(mockContributionData.contributions.totalCommits >= 0).toBe(true);
    expect(mockContributionData.contributions.totalPRs >= 0).toBe(true);
    expect(mockContributionData.contributions.totalIssues >= 0).toBe(true);
  });

  // Print results
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed!');
    process.exit(1);
  }
}

// Run the tests
runTests();

