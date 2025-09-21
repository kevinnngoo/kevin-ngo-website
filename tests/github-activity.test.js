/**
 * Unit Tests for GitHub Activity Language Aggregation
 * Simple test suite for data processing functions
 */

// Mock GitHub GraphQL response data for testing
const mockUserData = {
  repositories: {
    nodes: [
      {
        name: 'test-repo-1',
        languages: {
          edges: [
            { size: 1000, node: { name: 'JavaScript', color: '#f1e05a' } },
            { size: 500, node: { name: 'CSS', color: '#563d7c' } }
          ]
        }
      },
      {
        name: 'test-repo-2',
        languages: {
          edges: [
            { size: 800, node: { name: 'Python', color: '#3572A5' } },
            { size: 200, node: { name: 'JavaScript', color: '#f1e05a' } }
          ]
        }
      }
    ]
  },
  repositoriesContributedTo: {
    nodes: [
      {
        languages: {
          edges: [
            { size: 2000, node: { name: 'TypeScript', color: '#2b7489' } },
            { size: 1000, node: { name: 'JavaScript', color: '#f1e05a' } }
          ]
        }
      }
    ]
  }
};

/**
 * Language aggregation function (copied from API for testing)
 */
function aggregateLanguages(user) {
  const languageMap = new Map();
  let totalSize = 0;

  // Process own repositories
  user.repositories.nodes.forEach(repo => {
    repo.languages.edges.forEach(edge => {
      const lang = edge.node;
      const size = edge.size;
      
      if (languageMap.has(lang.name)) {
        languageMap.set(lang.name, {
          ...languageMap.get(lang.name),
          size: languageMap.get(lang.name).size + size
        });
      } else {
        languageMap.set(lang.name, {
          name: lang.name,
          color: lang.color || '#858585',
          size: size
        });
      }
      totalSize += size;
    });
  });

  // Process contributed repositories (with lower weight)
  user.repositoriesContributedTo.nodes.forEach(repo => {
    repo.languages.edges.forEach(edge => {
      const lang = edge.node;
      const size = Math.floor(edge.size * 0.1); // 10% weight for contributions
      
      if (languageMap.has(lang.name)) {
        languageMap.set(lang.name, {
          ...languageMap.get(lang.name),
          size: languageMap.get(lang.name).size + size
        });
      } else {
        languageMap.set(lang.name, {
          name: lang.name,
          color: lang.color || '#858585',
          size: size
        });
      }
      totalSize += size;
    });
  });

  // Convert to array and calculate percentages
  const languages = Array.from(languageMap.values())
    .map(lang => ({
      name: lang.name,
      color: lang.color,
      percentage: totalSize > 0 ? (lang.size / totalSize) * 100 : 0
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8); // Top 8 languages

  return languages;
}

/**
 * Simple test runner
 */
function runTests() {
  const tests = [];
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    tests.push({ name, fn });
  }

  function expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toBeCloseTo: (expected, precision = 2) => {
        const diff = Math.abs(actual - expected);
        const tolerance = Math.pow(10, -precision);
        if (diff > tolerance) {
          throw new Error(`Expected ${actual} to be close to ${expected} (within ${tolerance})`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toHaveLength: (expected) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual.length}`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${expected}`);
        }
      }
    };
  }

  // Test: Basic language aggregation
  test('should aggregate languages from repositories', () => {
    const result = aggregateLanguages(mockUserData);
    
    expect(result).toHaveLength(4); // JavaScript, CSS, Python, TypeScript
    expect(result.map(l => l.name)).toContain('JavaScript');
    expect(result.map(l => l.name)).toContain('Python');
    expect(result.map(l => l.name)).toContain('CSS');
    expect(result.map(l => l.name)).toContain('TypeScript');
  });

  // Test: JavaScript should be combined from multiple repos
  test('should combine JavaScript from multiple repositories', () => {
    const result = aggregateLanguages(mockUserData);
    const javascript = result.find(l => l.name === 'JavaScript');
    
    expect(javascript).toBe(result[0]); // Should be first (highest percentage)
    // JavaScript: 1000 + 200 (own repos) + 100 (10% of 1000 from contributions) = 1300
    // Total: 1500 (own) + 500 (contributions) = 2000 + 300 (weighted contributions) = 2800
    // Actual calculation: 1300/2800 = 46.43%
    expect(javascript.percentage).toBeCloseTo(46.43, 1);
  });

  // Test: Contribution repositories should have reduced weight
  test('should apply 10% weight to contributed repositories', () => {
    const result = aggregateLanguages(mockUserData);
    const typescript = result.find(l => l.name === 'TypeScript');
    
    // TypeScript: 0 (own repos) + 200 (10% of 2000 from contributions) = 200
    // Percentage: 200/2800 = 7.14%
    expect(typescript.percentage).toBeCloseTo(7.14, 1);
  });

  // Test: Results should be sorted by percentage
  test('should sort languages by percentage descending', () => {
    const result = aggregateLanguages(mockUserData);
    
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].percentage >= result[i + 1].percentage).toBe(true);
    }
  });

  // Test: Should handle empty data
  test('should handle empty repository data', () => {
    const emptyData = {
      repositories: { nodes: [] },
      repositoriesContributedTo: { nodes: [] }
    };
    
    const result = aggregateLanguages(emptyData);
    expect(result).toHaveLength(0);
  });

  // Test: Should include color information
  test('should include color information for languages', () => {
    const result = aggregateLanguages(mockUserData);
    
    result.forEach(lang => {
      expect(typeof lang.color).toBe('string');
      expect(lang.color.length > 0).toBe(true);
    });
    
    const javascript = result.find(l => l.name === 'JavaScript');
    expect(javascript.color).toBe('#f1e05a');
  });

  // Test: Should limit to 8 languages
  test('should limit results to 8 languages maximum', () => {
    // Create data with more than 8 languages
    const manyLanguagesData = {
      repositories: {
        nodes: [
          {
            name: 'test-repo',
            languages: {
              edges: Array.from({ length: 12 }, (_, i) => ({
                size: 100 - i * 5,
                node: { name: `Language${i}`, color: '#000000' }
              }))
            }
          }
        ]
      },
      repositoriesContributedTo: { nodes: [] }
    };
    
    const result = aggregateLanguages(manyLanguagesData);
    expect(result).toHaveLength(8);
  });

  // Test: Percentages should sum to approximately 100%
  test('should have percentages that sum to approximately 100%', () => {
    const result = aggregateLanguages(mockUserData);
    const totalPercentage = result.reduce((sum, lang) => sum + lang.percentage, 0);
    
    expect(totalPercentage).toBeCloseTo(100, 1);
  });

  // Run all tests
  console.log('🧪 Running GitHub Activity Language Aggregation Tests...\n');

  tests.forEach(({ name, fn }) => {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('💥 Some tests failed. Please review the implementation.');
  }

  return { passed, failed, total: tests.length };
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { aggregateLanguages, runTests };
} else if (typeof window !== 'undefined') {
  window.GitHubActivityTests = { aggregateLanguages, runTests };
}

// Auto-run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}
