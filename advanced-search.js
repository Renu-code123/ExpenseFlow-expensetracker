class AdvancedSearch {
  constructor() {
    this.searchContainer = null;
    this.searchResults = null;
    this.savedQueries = [];
    this.filterOptions = {};
    this.debounceTimer = null;
    this.init();
  }

  init() {
    this.createSearchInterface();
    this.loadFilterOptions();
    this.loadSavedQueries();
    this.setupEventListeners();
  }

  createSearchInterface() {
    const searchHTML = `
      <div id="advanced-search" class="search-container">
        <div class="search-header">
          <h2>Advanced Search</h2>
          <button id="toggle-filters" class="btn-secondary">Show Filters</button>
        </div>
        
        <div class="search-input-container">
          <input type="text" id="search-query" placeholder="Search expenses..." autocomplete="off">
          <div id="search-suggestions" class="suggestions-dropdown"></div>
          <button id="search-btn" class="btn-primary">Search</button>
        </div>

        <div id="search-filters" class="filters-panel hidden">
          <div class="filter-group">
            <label>Date Range:</label>
            <input type="date" id="start-date">
            <input type="date" id="end-date">
          </div>
          
          <div class="filter-group">
            <label>Amount Range:</label>
            <input type="number" id="min-amount" placeholder="Min">
            <input type="number" id="max-amount" placeholder="Max">
          </div>
          
          <div class="filter-group">
            <label>Categories:</label>
            <select id="categories-filter" multiple></select>
          </div>
          
          <div class="filter-group">
            <label>Tags:</label>
            <select id="tags-filter" multiple></select>
          </div>
          
          <div class="filter-actions">
            <button id="apply-filters" class="btn-primary">Apply Filters</button>
            <button id="clear-filters" class="btn-secondary">Clear</button>
            <button id="save-query" class="btn-success">Save Query</button>
          </div>
        </div>

        <div class="search-tabs">
          <button class="tab-btn active" data-tab="results">Results</button>
          <button class="tab-btn" data-tab="saved">Saved Queries</button>
          <button class="tab-btn" data-tab="analytics">Analytics</button>
        </div>

        <div id="search-results" class="search-results">
          <div class="results-header">
            <span id="results-count">0 results</span>
            <div class="sort-options">
              <select id="sort-by">
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
            </div>
          </div>
          <div id="results-list" class="results-list"></div>
          <div id="pagination" class="pagination"></div>
        </div>

        <div id="saved-queries" class="saved-queries hidden">
          <div id="saved-queries-list"></div>
        </div>

        <div id="search-analytics" class="search-analytics hidden">
          <div id="analytics-content"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', searchHTML);
    this.searchContainer = document.getElementById('advanced-search');
    this.searchResults = document.getElementById('results-list');
  }

  setupEventListeners() {
    // Search input with suggestions
    const searchInput = document.getElementById('search-query');
    searchInput.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.getSuggestions(e.target.value);
      }, 300);
    });

    // Search button
    document.getElementById('search-btn').addEventListener('click', () => {
      this.performSearch();
    });

    // Enter key search
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    // Toggle filters
    document.getElementById('toggle-filters').addEventListener('click', () => {
      const filters = document.getElementById('search-filters');
      filters.classList.toggle('hidden');
    });

    // Filter actions
    document.getElementById('apply-filters').addEventListener('click', () => {
      this.performSearch();
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
      this.clearFilters();
    });

    document.getElementById('save-query').addEventListener('click', () => {
      this.saveCurrentQuery();
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Sort change
    document.getElementById('sort-by').addEventListener('change', () => {
      this.performSearch();
    });
  }

  async loadFilterOptions() {
    try {
      const response = await fetch('/api/search/filters/options', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        this.filterOptions = await response.json();
        this.populateFilterOptions();
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  }

  populateFilterOptions() {
    const categoriesSelect = document.getElementById('categories-filter');
    const tagsSelect = document.getElementById('tags-filter');

    // Populate categories
    this.filterOptions.data.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoriesSelect.appendChild(option);
    });

    // Populate tags
    this.filterOptions.data.tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagsSelect.appendChild(option);
    });
  }

  async getSuggestions(query) {
    if (!query || query.length < 2) {
      this.hideSuggestions();
      return;
    }

    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const { data: suggestions } = await response.json();
        this.showSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  }

  showSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    
    if (suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    const suggestionsHTML = suggestions.map(suggestion => 
      `<div class="suggestion-item" data-text="${suggestion.text}">
        ${suggestion.text}
        <span class="suggestion-score">${suggestion.score || ''}</span>
      </div>`
    ).join('');

    suggestionsContainer.innerHTML = suggestionsHTML;
    suggestionsContainer.classList.remove('hidden');

    // Add click listeners to suggestions
    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('search-query').value = item.dataset.text;
        this.hideSuggestions();
        this.performSearch();
      });
    });
  }

  hideSuggestions() {
    document.getElementById('search-suggestions').classList.add('hidden');
  }

  async performSearch(page = 1) {
    const query = document.getElementById('search-query').value;
    const filters = this.getActiveFilters();
    const sortBy = document.getElementById('sort-by').value;

    try {
      const response = await fetch('/api/search/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query,
          filters,
          page,
          limit: 20,
          sortBy
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.displayResults(result.data);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showError('Search failed. Please try again.');
    }
  }

  getActiveFilters() {
    const filters = {};

    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const minAmount = document.getElementById('min-amount').value;
    const maxAmount = document.getElementById('max-amount').value;
    if (minAmount) filters.minAmount = parseFloat(minAmount);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount);

    const categories = Array.from(document.getElementById('categories-filter').selectedOptions)
      .map(option => option.value);
    if (categories.length) filters.categories = categories;

    const tags = Array.from(document.getElementById('tags-filter').selectedOptions)
      .map(option => option.value);
    if (tags.length) filters.tags = tags;

    return filters;
  }

  displayResults(data) {
    const { expenses, pagination, searchMeta } = data;
    
    // Update results count
    document.getElementById('results-count').textContent = 
      `${pagination.total} results (${searchMeta.executionTime}ms)`;

    // Display expenses
    if (expenses.length === 0) {
      this.searchResults.innerHTML = '<div class="no-results">No expenses found</div>';
      return;
    }

    const resultsHTML = expenses.map(expense => `
      <div class="result-item" data-id="${expense._id}">
        <div class="result-header">
          <span class="result-description">${this.highlightText(expense.description, expense.highlights)}</span>
          <span class="result-amount ${expense.type}">${expense.type === 'expense' ? '-' : '+'}$${expense.amount}</span>
        </div>
        <div class="result-meta">
          <span class="result-category">${expense.category}</span>
          <span class="result-date">${new Date(expense.date).toLocaleDateString()}</span>
          ${expense.score ? `<span class="result-score">Score: ${expense.score.toFixed(2)}</span>` : ''}
        </div>
        ${expense.tags && expense.tags.length ? 
          `<div class="result-tags">${expense.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
      </div>
    `).join('');

    this.searchResults.innerHTML = resultsHTML;
    this.createPagination(pagination);
  }

  highlightText(text, highlights) {
    if (!highlights || !highlights.description) return text;
    
    let highlightedText = text;
    highlights.description.forEach(highlight => {
      highlightedText = highlightedText.replace(
        new RegExp(highlight.replace(/<\/?em>/g, ''), 'gi'),
        `<mark>$&</mark>`
      );
    });
    
    return highlightedText;
  }

  createPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    
    if (pagination.pages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = '';
    
    // Previous button
    if (pagination.page > 1) {
      paginationHTML += `<button class="page-btn" data-page="${pagination.page - 1}">Previous</button>`;
    }

    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
      paginationHTML += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Next button
    if (pagination.page < pagination.pages) {
      paginationHTML += `<button class="page-btn" data-page="${pagination.page + 1}">Next</button>`;
    }

    paginationContainer.innerHTML = paginationHTML;

    // Add click listeners
    paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.performSearch(parseInt(btn.dataset.page));
      });
    });
  }

  clearFilters() {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('min-amount').value = '';
    document.getElementById('max-amount').value = '';
    document.getElementById('categories-filter').selectedIndex = -1;
    document.getElementById('tags-filter').selectedIndex = -1;
  }

  async saveCurrentQuery() {
    const query = document.getElementById('search-query').value;
    const filters = this.getActiveFilters();
    
    if (!query) {
      alert('Please enter a search query first');
      return;
    }

    const name = prompt('Enter a name for this saved query:');
    if (!name) return;

    try {
      const response = await fetch('/api/search/queries/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ query, filters, name })
      });

      if (response.ok) {
        alert('Query saved successfully!');
        this.loadSavedQueries();
      } else {
        throw new Error('Failed to save query');
      }
    } catch (error) {
      console.error('Save query error:', error);
      alert('Failed to save query');
    }
  }

  async loadSavedQueries() {
    try {
      const response = await fetch('/api/search/queries/saved', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const { data: queries } = await response.json();
        this.displaySavedQueries(queries);
      }
    } catch (error) {
      console.error('Failed to load saved queries:', error);
    }
  }

  displaySavedQueries(queries) {
    const container = document.getElementById('saved-queries-list');
    
    if (queries.length === 0) {
      container.innerHTML = '<div class="no-saved-queries">No saved queries</div>';
      return;
    }

    const queriesHTML = queries.map(query => `
      <div class="saved-query-item">
        <div class="query-header">
          <h4>${query.name}</h4>
          <div class="query-actions">
            <button class="btn-primary" onclick="advancedSearch.loadSavedQuery('${query._id}')">Load</button>
            <button class="btn-danger" onclick="advancedSearch.deleteSavedQuery('${query._id}')">Delete</button>
          </div>
        </div>
        <div class="query-details">
          <p><strong>Query:</strong> ${query.query}</p>
          <p><strong>Used:</strong> ${query.executionCount} times</p>
          <p><strong>Last used:</strong> ${new Date(query.lastExecuted).toLocaleDateString()}</p>
        </div>
      </div>
    `).join('');

    container.innerHTML = queriesHTML;
  }

  switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Show/hide content
    document.getElementById('search-results').classList.toggle('hidden', tab !== 'results');
    document.getElementById('saved-queries').classList.toggle('hidden', tab !== 'saved');
    document.getElementById('search-analytics').classList.toggle('hidden', tab !== 'analytics');

    // Load content if needed
    if (tab === 'analytics') {
      this.loadAnalytics();
    }
  }

  async loadAnalytics() {
    try {
      const response = await fetch('/api/search/analytics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const { data: analytics } = await response.json();
        this.displayAnalytics(analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  displayAnalytics(analytics) {
    const container = document.getElementById('analytics-content');
    
    const analyticsHTML = `
      <div class="analytics-summary">
        <div class="stat-card">
          <h3>${analytics.summary.totalSearches}</h3>
          <p>Total Searches</p>
        </div>
        <div class="stat-card">
          <h3>${analytics.summary.uniqueQueriesCount}</h3>
          <p>Unique Queries</p>
        </div>
        <div class="stat-card">
          <h3>${analytics.summary.avgExecutionCount}</h3>
          <p>Avg. Executions</p>
        </div>
      </div>
      
      <div class="top-queries">
        <h3>Top Queries</h3>
        ${analytics.topQueries.map(query => `
          <div class="query-stat">
            <span class="query-text">${query.query}</span>
            <span class="query-count">${query.executionCount} times</span>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = analyticsHTML;
  }

  showError(message) {
    this.searchResults.innerHTML = `<div class="error-message">${message}</div>`;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.advancedSearch = new AdvancedSearch();
});