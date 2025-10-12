// API configuration
const API_BASE = 'https://greentrace-t95w.onrender.com';

// Global variables
let map;
let markersLayer;
let LOCATIONS = [];

// Utility functions
function getAuthToken() {
  return localStorage.getItem('token');
}

function setUserInfo(user, token) {
  localStorage.setItem('token', token);
  localStorage.setItem('userName', user.name || '');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// API fetch wrapper with error handling
async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = getAuthToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!headers['Content-Type'] && (options.method === 'POST' || options.method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
  }
  
  try {
    const response = await fetch(API_BASE + path, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    if (!text) return null;
    
    return JSON.parse(text);
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

// Toast notification system
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) {
    alert(message); // Fallback if toast element doesn't exist
    return;
  }
  
  toast.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

// Update navigation based on login status
function updateNavAuthArea() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;
  
  const userName = localStorage.getItem('userName');
  const token = getAuthToken();
  
  if (token && userName) {
    area.innerHTML = `
      <span class="muted">Hello, <strong>${escapeHtml(userName)}</strong></span>
      <button class="btn" onclick="logout()">Logout</button>
    `;
  } else {
    area.innerHTML = `
      <a href="login.html">Login</a>
      <a href="signup.html" class="btn">Sign Up</a>
    `;
  }
}

// Load locations from JSON file
async function loadLocations() {
  try {
    const response = await fetch('locations.json');
    LOCATIONS = await response.json();
    
    const select = document.getElementById('locationSelect');
    if (!select) return;
    
    // Clear and populate dropdown
    select.innerHTML = '<option value="">-- Choose location --</option>';
    
    LOCATIONS.forEach(location => {
      const option = document.createElement('option');
      option.value = location.name;
      option.textContent = location.name;
      select.appendChild(option);
    });
    
    // Add "Other" option
    const otherOption = document.createElement('option');
    otherOption.value = 'Other (specify)';
    otherOption.textContent = 'Other (specify coordinates)';
    select.appendChild(otherOption);
    
    // Handle location selection change
    select.addEventListener('change', function() {
      const manualCoords = document.getElementById('manualCoords');
      if (this.value === 'Other (specify)') {
        manualCoords.classList.remove('hidden');
      } else {
        manualCoords.classList.add('hidden');
        
        // Center map on selected location
        const selectedLocation = LOCATIONS.find(loc => loc.name === this.value);
        if (selectedLocation && map) {
          map.setView([selectedLocation.lat, selectedLocation.lng], 13);
        }
      }
    });
    
  } catch (error) {
    console.error('Error loading locations:', error);
    showToast('Failed to load locations');
  }
}

// Initialize Leaflet map
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  
  // Center on Kenya
  map = L.map('map').setView([0.0236, 37.9062], 6);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Create layer for markers
  markersLayer = L.layerGroup().addTo(map);
  
  // Load existing trees
  loadTrees();
}

// Load trees from API and display on map
async function loadTrees() {
  if (!markersLayer) return;
  
  try {
    markersLayer.clearLayers();
    const trees = await apiFetch('/api/trees');
    
    if (!Array.isArray(trees)) {
      console.warn('Trees data is not an array:', trees);
      return;
    }
    
    trees.forEach(tree => {
      const lat = tree.latitude || tree.lat;
      const lng = tree.longitude || tree.lng;
      
      if (!lat || !lng) {
        console.warn('Tree missing coordinates:', tree);
        return;
      }
      
      const popupContent = `
        <div style="min-width: 200px">
          <h4 style="margin: 0 0 8px 0; color: var(--primary)">${escapeHtml(tree.treeName)}</h4>
          <p style="margin: 4px 0"><strong>Planted by:</strong> ${escapeHtml(tree.planterName || 'Unknown')}</p>
          <p style="margin: 4px 0"><strong>Date:</strong> ${new Date(tree.datePlanted || tree.createdAt).toLocaleDateString()}</p>
          ${tree.description ? `<p style="margin: 4px 0"><strong>Description:</strong> ${escapeHtml(tree.description)}</p>` : ''}
        </div>
      `;
      
      L.marker([lat, lng])
        .addTo(markersLayer)
        .bindPopup(popupContent);
    });
    
  } catch (error) {
    console.error('Error loading trees:', error);
    showToast('Failed to load trees from map');
  }
}

// Handle tree form submission
async function submitTree(event) {
  event.preventDefault();
  
  const token = getAuthToken();
  if (!token) {
    showToast('Please log in to add trees');
    return;
  }
  
  // Get form values
  const treeName = document.getElementById('treeName').value.trim();
  const planterName = document.getElementById('planterName').value.trim();
  const locationName = document.getElementById('locationSelect').value;
  const description = document.getElementById('description').value.trim();
  
  let latitude, longitude;
  
  if (locationName === 'Other (specify)') {
    latitude = parseFloat(document.getElementById('latitude').value);
    longitude = parseFloat(document.getElementById('longitude').value);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      showToast('Please enter valid coordinates for custom location');
      return;
    }
  } else {
    const location = LOCATIONS.find(loc => loc.name === locationName);
    if (!location) {
      showToast('Please select a valid location');
      return;
    }
    latitude = location.lat;
    longitude = location.lng;
  }
  
  // Prepare request body
  const treeData = {
    treeName,
    planterName,
    locationName,
    latitude,
    longitude,
    description
  };
  
  try {
    await apiFetch('/api/trees', {
      method: 'POST',
      body: JSON.stringify(treeData)
    });
    
    showToast('Tree planted successfully! 🌳');
    document.getElementById('treeForm').reset();
    document.getElementById('manualCoords').classList.add('hidden');
    loadTrees(); // Refresh map
    
  } catch (error) {
    console.error('Error adding tree:', error);
    showToast('Failed to add tree. Please try again.');
  }
}

// Authentication functions
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  try {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (result && result.token) {
      setUserInfo(result.user || { name: email.split('@')[0] }, result.token);
      showToast('Welcome back!');
      window.location.href = 'index.html';
    } else {
      showToast(result?.message || 'Login failed');
    }
    
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed. Please check your credentials.');
  }
}

async function handleSignup(event) {
  event.preventDefault();
  
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  
  try {
    const result = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    
    if (result && result.token) {
      setUserInfo(result.user || { name }, result.token);
      showToast('Account created successfully!');
      window.location.href = 'index.html';
    } else {
      showToast(result?.message || 'Signup failed');
    }
    
  } catch (error) {
    console.error('Signup error:', error);
    showToast('Signup failed. Please try again.');
  }
}

function logout() {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    updateNavAuthArea();
    showToast('Logged out successfully');
    window.location.href = 'index.html';
  }
}

// Leaderboard functionality
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard');
  if (!container) return;
  
  try {
    const leaderboardData = await apiFetch('/api/leaderboard');
    
    if (!Array.isArray(leaderboardData)) {
      container.innerHTML = '<p class="muted">No leaderboard data available</p>';
      return;
    }
    
    container.innerHTML = '';
    
    leaderboardData.forEach((user, index) => {
      const rank = index + 1;
      const treesPlanted = user.treesPlanted || Math.floor((user.points || 0) / 10);
      
      const card = document.createElement('div');
      card.className = 'rank-card';
      
      // Add special styling for top 3
      if (rank === 1) card.style.borderLeftColor = '#FFD700'; // Gold
      else if (rank === 2) card.style.borderLeftColor = '#C0C0C0'; // Silver
      else if (rank === 3) card.style.borderLeftColor = '#CD7F32'; // Bronze
      
      card.innerHTML = `
        <div>
          <div class="rank-top">${rank}. ${escapeHtml(user.name)}</div>
          <div class="muted">${treesPlanted} tree(s) planted</div>
        </div>
        <div>
          <div class="rank-badge">${user.points || 0} pts</div>
        </div>
      `;
      
      container.appendChild(card);
    });
    
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    container.innerHTML = '<p class="muted">Failed to load leaderboard</p>';
  }
}

// Dark mode functionality
function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  if (!toggle) return;
  
  // Check for saved theme preference or prefer OS setting
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.setAttribute('data-theme', 'dark');
    toggle.textContent = '☀️';
  } else {
    document.body.removeAttribute('data-theme');
    toggle.textContent = '🌙';
  }
  
  // Toggle theme on button click
  toggle.addEventListener('click', () => {
    if (document.body.getAttribute('data-theme') === 'dark') {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      toggle.textContent = '🌙';
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      toggle.textContent = '☀️';
    }
  });
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize dark mode
  initDarkMode();
  
  // Update navigation based on login status
  updateNavAuthArea();
  
  // Page-specific initializations
  if (document.getElementById('map')) {
    // Home page - initialize map and tree form
    loadLocations().then(initMap);
    
    const treeForm = document.getElementById('treeForm');
    if (treeForm) {
      treeForm.addEventListener('submit', submitTree);
    }
    
    // Show/hide form based on login status
    const token = getAuthToken();
    const loginPrompt = document.getElementById('login-prompt');
    
    if (token) {
      loginPrompt.classList.add('hidden');
      treeForm.classList.remove('hidden');
      
      // Prefill planter name if available
      const userName = localStorage.getItem('userName');
      if (userName) {
        document.getElementById('planterName').value = userName;
      }
    } else {
      loginPrompt.classList.remove('hidden');
      treeForm.classList.add('hidden');
    }
  }
  
  // Login page
  if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
  }
  
  // Signup page
  if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
  }
  
  // Leaderboard page
  if (document.getElementById('leaderboard')) {
    loadLeaderboard();
  }
});
