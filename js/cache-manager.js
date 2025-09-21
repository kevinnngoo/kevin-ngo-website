/**
 * Cache Manager - Handles localStorage caching with expiration
 * Provides 6-hour cache duration for GitHub activity data
 */

class CacheManager {
  constructor() {
    this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    this.CACHE_PREFIX = 'github_activity_';
  }

  /**
   * Generate cache key for a given identifier
   * @param {string} key - Cache identifier
   * @returns {string} Full cache key
   */
  getCacheKey(key) {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Store data in localStorage with expiration timestamp
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @returns {boolean} Success status
   */
  set(key, data) {
    try {
      const cacheKey = this.getCacheKey(key);
      const timestamp = Date.now();
      const expires = timestamp + this.CACHE_DURATION;
      
      const cacheData = {
        data,
        timestamp,
        expires
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.warn('Failed to cache data:', error);
      // Handle quota exceeded or other localStorage errors
      this.clearExpired();
      return false;
    }
  }

  /**
   * Retrieve data from localStorage if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache has expired
      if (now > cacheData.expires) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  /**
   * Check if cached data exists and is valid
   * @param {string} key - Cache key
   * @returns {boolean} True if valid cache exists
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Remove specific cache entry
   * @param {string} key - Cache key
   */
  remove(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to remove cache entry:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  clearExpired() {
    try {
      const now = Date.now();
      const keysToRemove = [];

      // Find all cache keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheData = JSON.parse(cached);
              if (now > cacheData.expires) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // Invalid cache entry, mark for removal
            keysToRemove.push(key);
          }
        }
      }

      // Remove expired entries
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log(`Cleared ${keysToRemove.length} expired cache entries`);
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  }

  /**
   * Clear all GitHub activity cache entries
   */
  clearAll() {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} cache entries`);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    try {
      let totalEntries = 0;
      let expiredEntries = 0;
      let totalSize = 0;
      const now = Date.now();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          totalEntries++;
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
            try {
              const cacheData = JSON.parse(value);
              if (now > cacheData.expires) {
                expiredEntries++;
              }
            } catch (error) {
              expiredEntries++;
            }
          }
        }
      }

      return {
        totalEntries,
        expiredEntries,
        validEntries: totalEntries - expiredEntries,
        totalSize,
        cacheDurationHours: this.CACHE_DURATION / (60 * 60 * 1000)
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        validEntries: 0,
        totalSize: 0,
        cacheDurationHours: 6
      };
    }
  }
}

// Export singleton instance
const cacheManager = new CacheManager();

// Clean up expired entries on initialization
cacheManager.clearExpired();

export default cacheManager;

