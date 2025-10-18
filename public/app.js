// ExploreEase Travel Booking System - Frontend Application
// Node.js + Express + MySQL Backend Integration

// Application Configuration
const API_BASE_URL = '/api';

// Application State
let currentUser = null;
let currentToken = null;
let packages = [];
let userBookings = [];
let currentPage = 1;
let isLoading = false;

// DOM Elements
let elements = {};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeApp();
});

// Initialize DOM Elements
function initializeElements() {
    elements = {
        loadingScreen: document.getElementById('loadingScreen'),
        packagesGrid: document.getElementById('packagesGrid'),
        heroSearchInput: document.getElementById('heroSearchInput'),
        packageSearchInput: document.getElementById('packageSearchInput'),
        sortSelect: document.getElementById('sortSelect'),
        authButtons: document.getElementById('authButtons'),
        userProfile: document.getElementById('userProfile'),
        userName: document.getElementById('userName'),
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        toast: document.getElementById('toast')
    };
}

// Initialize Application
async function initializeApp() {
    try {
        // Show loading screen
        showLoading();

        // Check for saved authentication
        checkSavedAuth();

        // Load packages
        await loadPackages();

        // Load stats for hero section
        await loadHeroStats();

        // Setup event listeners
        setupEventListeners();

        // Hide loading screen
        setTimeout(() => {
            hideLoading();
        }, 1500);

    } catch (error) {
        console.error('App initialization error:', error);
        showToast('Failed to initialize application', 'error');
        hideLoading();
    }
}

// Loading Functions
function showLoading() {
    if (elements.loadingScreen) {
        elements.loadingScreen.classList.remove('hidden');
    }
}

function hideLoading() {
    if (elements.loadingScreen) {
        elements.loadingScreen.classList.add('hidden');
    }
}

// Authentication Functions
function checkSavedAuth() {
    const savedToken = localStorage.getItem('exploreease_token');
    const savedUser = localStorage.getItem('exploreease_user');

    if (savedToken && savedUser) {
        currentToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }
}

function updateAuthUI() {
    if (currentUser && elements.authButtons && elements.userProfile && elements.userName) {
        elements.authButtons.style.display = 'none';
        elements.userProfile.style.display = 'block';
        elements.userName.textContent = currentUser.name.split(' ')[0];
    } else if (elements.authButtons && elements.userProfile) {
        elements.authButtons.style.display = 'block';
        elements.userProfile.style.display = 'none';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Authentication forms
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }

    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', handleRegister);
    }

    // Search functionality
    if (elements.heroSearchInput) {
        elements.heroSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchFromHero();
            }
        });
    }

    if (elements.packageSearchInput) {
        elements.packageSearchInput.addEventListener('input', debounce(handlePackageSearch, 300));
    }

    if (elements.sortSelect) {
        elements.sortSelect.addEventListener('change', handleSortChange);
    }

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadPackages(this.dataset.category);
        });
    });

    // Modal close functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', handleNavbarScroll);

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Load Packages
async function loadPackages(category = 'all', search = '', sort = 'rating') {
    try {
        isLoading = true;

        const params = new URLSearchParams();
        if (category && category !== 'all') params.append('category', category);
        if (search) params.append('search', search);
        if (sort) params.append('sort', sort);

        const response = await fetch(`${API_BASE_URL}/packages?${params}`);
        const data = await response.json();

        if (data.success) {
            packages = data.packages;
            displayPackages(packages);
        } else {
            throw new Error(data.message || 'Failed to load packages');
        }

    } catch (error) {
        console.error('Load packages error:', error);
        showToast('Failed to load packages', 'error');
        displayFallbackPackages();
    } finally {
        isLoading = false;
    }
}

// Display Packages
function displayPackages(packagesArray) {
    if (!elements.packagesGrid) return;

    if (packagesArray.length === 0) {
        elements.packagesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-400); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--gray-600); margin-bottom: 0.5rem;">No packages found</h3>
                <p style="color: var(--gray-500);">Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    elements.packagesGrid.innerHTML = packagesArray.map(pkg => `
        <div class="package-card" onclick="showPackageDetails(${pkg.id})">
            <div class="package-image">
                <img src="${pkg.image_url}" alt="${pkg.title}" onerror="this.src='https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                <div class="package-badge">${pkg.category}</div>
            </div>
            <div class="package-info">
                <h3 class="package-title">${pkg.title}</h3>
                <div class="package-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${pkg.location}</span>
                </div>
                <div class="package-duration">
                    <i class="fas fa-calendar-alt"></i>
                    ${pkg.duration}
                </div>
                <div class="package-price">₹${parseInt(pkg.price).toLocaleString()}</div>
                <div class="package-rating">
                    <div class="stars">
                        ${generateStars(pkg.rating)}
                    </div>
                    <span>${pkg.rating}</span>
                </div>
                <div class="package-features">
                    ${pkg.activities ? pkg.activities.slice(0, 3).map(activity => 
                        `<span class="feature-tag">${activity}</span>`
                    ).join('') : ''}
                </div>
                <button class="book-btn" onclick="event.stopPropagation(); handleBookPackage(${pkg.id})">
                    <i class="fas fa-ticket-alt"></i>
                    Book Now
                </button>
            </div>
        </div>
    `).join('');
}

// Fallback packages for offline/error scenarios
function displayFallbackPackages() {
    const fallbackPackages = [
        {
            id: 1,
            title: "Goa Beach Paradise",
            location: "Goa, India",
            duration: "4 Days 3 Nights",
            price: 15999,
            rating: 4.8,
            category: "Beach",
            activities: ["Beach Sports", "Water Sports", "Nightlife"],
            image_url: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
        },
        {
            id: 2,
            title: "Himalayan Adventure Trek",
            location: "Himachal Pradesh, India",
            duration: "7 Days 6 Nights",
            price: 28999,
            rating: 4.9,
            category: "Adventure",
            activities: ["Trekking", "Camping", "Photography"],
            image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
        },
        {
            id: 3,
            title: "Kerala Backwaters Cruise",
            location: "Kerala, India",
            duration: "5 Days 4 Nights",
            price: 22999,
            rating: 4.7,
            category: "Nature",
            activities: ["Houseboat Cruise", "Ayurveda Spa", "Cultural Tours"],
            image_url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
        }
    ];

    packages = fallbackPackages;
    displayPackages(fallbackPackages);
}

// Generate star rating HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return '★'.repeat(fullStars) + 
           (halfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
}

// Load Hero Stats
async function loadHeroStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/packages/meta/stats`);
        const data = await response.json();

        if (data.success) {
            const totalPackagesEl = document.getElementById('totalPackages');
            if (totalPackagesEl) {
                totalPackagesEl.textContent = `${data.stats.total_packages}+`;
            }
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Search Functions
function searchFromHero() {
    const query = elements.heroSearchInput?.value?.trim();
    if (query) {
        loadPackages('all', query);
        // Scroll to packages section
        document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' });
    }
}

function handlePackageSearch() {
    const query = elements.packageSearchInput?.value?.trim() || '';
    const category = document.querySelector('.filter-tab.active')?.dataset.category || 'all';
    const sort = elements.sortSelect?.value || 'rating';

    loadPackages(category, query, sort);
}

function handleSortChange() {
    const sort = elements.sortSelect?.value || 'rating';
    const category = document.querySelector('.filter-tab.active')?.dataset.category || 'all';
    const search = elements.packageSearchInput?.value?.trim() || '';

    loadPackages(category, search, sort);
}

// Authentication Handlers
async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            currentToken = data.token;

            // Save to localStorage
            localStorage.setItem('exploreease_token', currentToken);
            localStorage.setItem('exploreease_user', JSON.stringify(currentUser));

            updateAuthUI();
            closeModal('loginModal');
            showToast(`Welcome back, ${currentUser.name}!`, 'success');

            // Load user data if needed
            if (currentUser.role === 'admin') {
                // Could load admin data here
            }
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const registerData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: password
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            currentToken = data.token;

            // Save to localStorage
            localStorage.setItem('exploreease_token', currentToken);
            localStorage.setItem('exploreease_user', JSON.stringify(currentUser));

            updateAuthUI();
            closeModal('registerModal');
            showToast(`Welcome to ExploreEase, ${currentUser.name}!`, 'success');
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Package Detail Functions
async function showPackageDetails(packageId) {
    try {
        const pkg = packages.find(p => p.id === packageId);
        if (!pkg) {
            showToast('Package not found', 'error');
            return;
        }

        const modal = document.getElementById('packageModal');
        const title = document.getElementById('packageModalTitle');
        const content = document.getElementById('packageModalContent');

        title.textContent = pkg.title;

        content.innerHTML = `
            <div class="package-detail-layout">
                <div class="package-detail-image">
                    <img src="${pkg.image_url}" alt="${pkg.title}" onerror="this.src='https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
                    <div class="package-detail-badge">${pkg.category}</div>
                </div>

                <div class="package-detail-info">
                    <div class="detail-section">
                        <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
                        <p>${pkg.location}</p>
                    </div>

                    <div class="detail-section">
                        <h3><i class="fas fa-calendar-alt"></i> Duration</h3>
                        <p>${pkg.duration}</p>
                    </div>

                    <div class="detail-section">
                        <h3><i class="fas fa-star"></i> Rating</h3>
                        <div class="rating-display">
                            <div class="stars">${generateStars(pkg.rating)}</div>
                            <span>${pkg.rating}/5</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3><i class="fas fa-rupee-sign"></i> Price</h3>
                        <div class="price-display">₹${parseInt(pkg.price).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div class="package-description">
                <h3><i class="fas fa-info-circle"></i> Description</h3>
                <p>${pkg.description}</p>
            </div>

            ${pkg.activities && pkg.activities.length > 0 ? `
            <div class="package-activities">
                <h3><i class="fas fa-hiking"></i> Activities</h3>
                <div class="activities-list">
                    ${pkg.activities.map(activity => `<span class="activity-tag">${activity}</span>`).join('')}
                </div>
            </div>
            ` : ''}

            ${pkg.includes && pkg.includes.length > 0 ? `
            <div class="package-includes">
                <h3><i class="fas fa-check-circle"></i> What's Included</h3>
                <ul class="includes-list">
                    ${pkg.includes.map(item => `<li><i class="fas fa-check"></i> ${item}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="package-actions">
                <button class="book-btn large" onclick="handleBookPackage(${pkg.id}); closeModal('packageModal');">
                    <i class="fas fa-ticket-alt"></i>
                    Book This Package - ₹${parseInt(pkg.price).toLocaleString()}
                </button>
            </div>
        `;

        // Add CSS for package detail layout
        if (!document.getElementById('packageDetailStyles')) {
            const styles = document.createElement('style');
            styles.id = 'packageDetailStyles';
            styles.textContent = `
                .package-detail-layout {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .package-detail-image {
                    position: relative;
                    border-radius: var(--border-radius-xl);
                    overflow: hidden;
                    height: 300px;
                }

                .package-detail-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .package-detail-badge {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: var(--secondary-color);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: var(--border-radius);
                    font-weight: 600;
                }

                .detail-section {
                    margin-bottom: 1.5rem;
                }

                .detail-section h3 {
                    color: var(--gray-700);
                    margin-bottom: 0.5rem;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .rating-display {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .price-display {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--secondary-color);
                }

                .activities-list, .includes-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .activity-tag {
                    background: var(--primary-color);
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--border-radius);
                    font-size: 0.9rem;
                }

                .includes-list {
                    list-style: none;
                    display: block;
                }

                .includes-list li {
                    padding: 0.5rem 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-bottom: 1px solid var(--gray-200);
                }

                .includes-list li:last-child {
                    border-bottom: none;
                }

                .includes-list i {
                    color: var(--secondary-color);
                }

                .book-btn.large {
                    width: 100%;
                    padding: 1rem 2rem;
                    font-size: 1.1rem;
                    margin-top: 1rem;
                }

                @media (max-width: 768px) {
                    .package-detail-layout {
                        grid-template-columns: 1fr;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        showModal('packageModal');

    } catch (error) {
        console.error('Show package details error:', error);
        showToast('Failed to load package details', 'error');
    }
}

// Booking Functions
function handleBookPackage(packageId) {
    if (!currentUser) {
        showLoginModal();
        showToast('Please login to book packages', 'error');
        return;
    }

    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) {
        showToast('Package not found', 'error');
        return;
    }

    showBookingModal(pkg);
}

function showBookingModal(pkg) {
    const modal = document.getElementById('bookingModal');
    const content = document.getElementById('bookingModalContent');

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    content.innerHTML = `
        <div class="booking-summary">
            <h3>Booking Summary</h3>
            <div class="summary-item">
                <span>Package:</span>
                <span>${pkg.title}</span>
            </div>
            <div class="summary-item">
                <span>Location:</span>
                <span>${pkg.location}</span>
            </div>
            <div class="summary-item">
                <span>Duration:</span>
                <span>${pkg.duration}</span>
            </div>
            <div class="summary-item">
                <span>Base Price:</span>
                <span id="basePrice">₹${parseInt(pkg.price).toLocaleString()}</span>
            </div>
        </div>

        <form id="bookingForm" class="booking-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="checkinDate">Check-in Date</label>
                    <input type="date" id="checkinDate" name="checkinDate" required min="${tomorrow.toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="checkoutDate">Check-out Date</label>
                    <input type="date" id="checkoutDate" name="checkoutDate" required min="${tomorrowStr}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="adults">Adults</label>
                    <select id="adults" name="adults" onchange="updateBookingPrice()" required>
                        <option value="1">1 Adult</option>
                        <option value="2" selected>2 Adults</option>
                        <option value="3">3 Adults</option>
                        <option value="4">4 Adults</option>
                        <option value="5">5 Adults</option>
                        <option value="6">6 Adults</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="children">Children</label>
                    <select id="children" name="children" onchange="updateBookingPrice()">
                        <option value="0" selected>0 Children</option>
                        <option value="1">1 Child</option>
                        <option value="2">2 Children</option>
                        <option value="3">3 Children</option>
                        <option value="4">4 Children</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="hotelCategory">Hotel Category</label>
                    <select id="hotelCategory" name="hotelCategory" onchange="updateBookingPrice()">
                        <option value="standard">Standard (No extra cost)</option>
                        <option value="deluxe">Deluxe (+30%)</option>
                        <option value="premium">Premium (+60%)</option>
                        <option value="luxury">Luxury (+100%)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="transportMode">Transport</label>
                    <select id="transportMode" name="transportMode" onchange="updateBookingPrice()">
                        <option value="bus">Bus (No extra cost)</option>
                        <option value="train">Train (+20%)</option>
                        <option value="flight">Flight (+80%)</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="specialRequests">Special Requests</label>
                <textarea id="specialRequests" name="specialRequests" rows="3" placeholder="Any special requests or requirements..."></textarea>
            </div>

            <div class="price-breakdown">
                <h3>Price Breakdown</h3>
                <div class="breakdown-item">
                    <span>Base Price:</span>
                    <span id="breakdownBase">₹${parseInt(pkg.price).toLocaleString()}</span>
                </div>
                <div class="breakdown-item" id="guestMultiplier">
                    <span>Guests (2 Adults):</span>
                    <span>x2</span>
                </div>
                <div class="breakdown-item" id="hotelMultiplier" style="display: none;">
                    <span>Hotel Upgrade:</span>
                    <span id="hotelUpgrade">+0%</span>
                </div>
                <div class="breakdown-item" id="transportMultiplier" style="display: none;">
                    <span>Transport Upgrade:</span>
                    <span id="transportUpgrade">+0%</span>
                </div>
                <hr>
                <div class="breakdown-total">
                    <span>Total Amount:</span>
                    <span id="totalAmount">₹${(parseInt(pkg.price) * 2).toLocaleString()}</span>
                </div>
            </div>

            <button type="submit" class="submit-btn">
                <i class="fas fa-credit-card"></i>
                Proceed to Payment
            </button>
        </form>
    `;

    // Store package data for booking
    window.currentBookingPackage = pkg;

    // Setup date validation
    const checkinInput = document.getElementById('checkinDate');
    const checkoutInput = document.getElementById('checkoutDate');

    checkinInput.addEventListener('change', function() {
        const checkinDate = new Date(this.value);
        checkinDate.setDate(checkinDate.getDate() + 1);
        checkoutInput.min = checkinDate.toISOString().split('T')[0];

        if (checkoutInput.value && new Date(checkoutInput.value) <= new Date(this.value)) {
            checkoutInput.value = checkinDate.toISOString().split('T')[0];
        }
    });

    // Setup form submission
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmission);

    // Add booking styles
    if (!document.getElementById('bookingStyles')) {
        const styles = document.createElement('style');
        styles.id = 'bookingStyles';
        styles.textContent = `
            .booking-summary {
                background: var(--gray-50);
                padding: 1.5rem;
                border-radius: var(--border-radius-xl);
                margin-bottom: 2rem;
            }

            .summary-item, .breakdown-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--gray-200);
            }

            .summary-item:last-child, .breakdown-item:last-child {
                border-bottom: none;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .price-breakdown {
                background: var(--white);
                border: 2px solid var(--gray-200);
                border-radius: var(--border-radius-xl);
                padding: 1.5rem;
                margin: 1.5rem 0;
            }

            .price-breakdown h3 {
                margin-bottom: 1rem;
                color: var(--gray-800);
            }

            .breakdown-total {
                font-size: 1.2rem;
                font-weight: 700;
                color: var(--secondary-color);
            }

            @media (max-width: 768px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    showModal('bookingModal');
}

// Update booking price calculation
function updateBookingPrice() {
    if (!window.currentBookingPackage) return;

    const pkg = window.currentBookingPackage;
    const adults = parseInt(document.getElementById('adults')?.value || 2);
    const children = parseInt(document.getElementById('children')?.value || 0);
    const hotelCategory = document.getElementById('hotelCategory')?.value || 'standard';
    const transportMode = document.getElementById('transportMode')?.value || 'bus';

    const basePrice = parseInt(pkg.price);
    let totalPrice = basePrice * adults + (basePrice * 0.7 * children);

    // Hotel multipliers
    const hotelMultipliers = {
        standard: 1.0,
        deluxe: 1.3,
        premium: 1.6,
        luxury: 2.0
    };

    // Transport multipliers
    const transportMultipliers = {
        bus: 1.0,
        train: 1.2,
        flight: 1.8
    };

    const hotelMultiplier = hotelMultipliers[hotelCategory];
    const transportMultiplier = transportMultipliers[transportMode];

    totalPrice *= hotelMultiplier * transportMultiplier;

    // Update display
    const guestText = `${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}`;
    document.getElementById('guestMultiplier').innerHTML = `<span>Guests (${guestText}):</span><span>×${adults + (children * 0.7)}</span>`;

    // Hotel upgrade display
    const hotelUpgradeEl = document.getElementById('hotelMultiplier');
    const hotelUpgradeText = document.getElementById('hotelUpgrade');
    if (hotelMultiplier > 1) {
        hotelUpgradeEl.style.display = 'flex';
        hotelUpgradeText.textContent = `+${Math.round((hotelMultiplier - 1) * 100)}%`;
    } else {
        hotelUpgradeEl.style.display = 'none';
    }

    // Transport upgrade display
    const transportUpgradeEl = document.getElementById('transportMultiplier');
    const transportUpgradeText = document.getElementById('transportUpgrade');
    if (transportMultiplier > 1) {
        transportUpgradeEl.style.display = 'flex';
        transportUpgradeText.textContent = `+${Math.round((transportMultiplier - 1) * 100)}%`;
    } else {
        transportUpgradeEl.style.display = 'none';
    }

    // Update total
    document.getElementById('totalAmount').textContent = `₹${Math.round(totalPrice).toLocaleString()}`;
}

// Handle booking submission
async function handleBookingSubmission(event) {
    event.preventDefault();

    if (!window.currentBookingPackage || !currentToken) {
        showToast('Authentication required', 'error');
        return;
    }

    const formData = new FormData(event.target);
    const adults = parseInt(formData.get('adults'));
    const children = parseInt(formData.get('children'));
    const hotelCategory = formData.get('hotelCategory');
    const transportMode = formData.get('transportMode');

    const pkg = window.currentBookingPackage;
    const basePrice = parseInt(pkg.price);
    let totalPrice = basePrice * adults + (basePrice * 0.7 * children);

    const hotelMultipliers = { standard: 1.0, deluxe: 1.3, premium: 1.6, luxury: 2.0 };
    const transportMultipliers = { bus: 1.0, train: 1.2, flight: 1.8 };

    totalPrice *= hotelMultipliers[hotelCategory] * transportMultipliers[transportMode];
    totalPrice = Math.round(totalPrice);

    const bookingData = {
        packageId: pkg.id,
        checkinDate: formData.get('checkinDate'),
        checkoutDate: formData.get('checkoutDate'),
        adults: adults,
        children: children,
        hotelCategory: hotelCategory,
        transportMode: transportMode,
        specialRequests: formData.get('specialRequests'),
        totalPrice: totalPrice
    };

    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(bookingData)
        });

        const data = await response.json();

        if (data.success) {
            closeModal('bookingModal');
            showPaymentModal(data.booking);
        } else {
            showToast(data.message || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Show payment modal
function showPaymentModal(booking) {
    const modal = document.getElementById('paymentModal');
    const content = document.getElementById('paymentModalContent');

    content.innerHTML = `
        <div class="payment-summary">
            <h3>Payment Summary</h3>
            <div class="payment-info">
                <div class="info-item">
                    <span>Booking ID:</span>
                    <span style="font-weight: 600; color: var(--primary-color);">${booking.bookingId}</span>
                </div>
                <div class="info-item">
                    <span>Package:</span>
                    <span>${booking.packageTitle}</span>
                </div>
                <div class="info-item">
                    <span>Total Amount:</span>
                    <span style="font-size: 1.5rem; font-weight: 700; color: var(--secondary-color);">
                        ₹${parseInt(booking.totalPrice).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>

        <div class="payment-methods">
            <h3>Choose Payment Method</h3>
            <div class="payment-options">
                <div class="payment-option active" data-method="qr">
                    <i class="fas fa-qrcode"></i>
                    <span>QR Code Payment</span>
                </div>
                <div class="payment-option" data-method="card">
                    <i class="fas fa-credit-card"></i>
                    <span>Credit/Debit Card</span>
                </div>
                <div class="payment-option" data-method="upi">
                    <i class="fas fa-mobile-alt"></i>
                    <span>UPI Payment</span>
                </div>
            </div>
        </div>

        <div class="payment-content">
            <div id="qrPayment" class="payment-method-content active">
                <div class="qr-section">
                    <h4>Scan QR Code to Pay</h4>
                    <div class="qr-code">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=exploreease@paytm%26pn=ExploreEase%26am=${booking.totalPrice}%26cu=INR%26tn=BookingID:${booking.bookingId}" alt="Payment QR Code">
                    </div>
                    <p class="qr-instructions">
                        Scan this QR code using any UPI app like Google Pay, PhonePe, or Paytm
                    </p>
                </div>
            </div>

            <div id="cardPayment" class="payment-method-content">
                <p style="text-align: center; color: var(--gray-600); padding: 2rem;">
                    <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
                    Card payment integration would be implemented here in production.
                </p>
            </div>

            <div id="upiPayment" class="payment-method-content">
                <p style="text-align: center; color: var(--gray-600); padding: 2rem;">
                    <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
                    UPI payment integration would be implemented here in production.
                </p>
            </div>
        </div>

        <div class="payment-actions">
            <button class="submit-btn" onclick="confirmPayment('${booking.bookingId}')">
                <i class="fas fa-check-circle"></i>
                Confirm Payment
            </button>
            <p class="payment-note">
                Click "Confirm Payment" after completing the payment through QR code
            </p>
        </div>
    `;

    // Add payment method switching
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
            document.querySelectorAll('.payment-method-content').forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(this.dataset.method + 'Payment').classList.add('active');
        });
    });

    // Add payment styles
    if (!document.getElementById('paymentStyles')) {
        const styles = document.createElement('style');
        styles.id = 'paymentStyles';
        styles.textContent = `
            .payment-summary {
                background: var(--gray-50);
                padding: 1.5rem;
                border-radius: var(--border-radius-xl);
                margin-bottom: 2rem;
            }

            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--gray-200);
            }

            .info-item:last-child {
                border-bottom: none;
            }

            .payment-options {
                display: flex;
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .payment-option {
                flex: 1;
                padding: 1rem;
                border: 2px solid var(--gray-200);
                border-radius: var(--border-radius-xl);
                text-align: center;
                cursor: pointer;
                transition: var(--transition);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            }

            .payment-option.active {
                border-color: var(--primary-color);
                background: var(--primary-color);
                color: white;
            }

            .payment-option i {
                font-size: 1.5rem;
            }

            .payment-method-content {
                display: none;
                text-align: center;
            }

            .payment-method-content.active {
                display: block;
            }

            .qr-code {
                background: white;
                padding: 1rem;
                border-radius: var(--border-radius-xl);
                margin: 1rem auto;
                display: inline-block;
                box-shadow: var(--shadow);
            }

            .qr-code img {
                width: 200px;
                height: 200px;
            }

            .qr-instructions {
                color: var(--gray-600);
                font-size: 0.9rem;
                max-width: 300px;
                margin: 0 auto;
            }

            .payment-note {
                text-align: center;
                color: var(--gray-600);
                font-size: 0.9rem;
                margin-top: 1rem;
            }

            @media (max-width: 768px) {
                .payment-options {
                    flex-direction: column;
                }

                .qr-code img {
                    width: 150px;
                    height: 150px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    showModal('paymentModal');
}

// Confirm payment
async function confirmPayment(bookingId) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                status: 'confirmed',
                paymentStatus: 'paid'
            })
        });

        const data = await response.json();

        if (data.success) {
            closeModal('paymentModal');
            showSuccessModal(bookingId);
        } else {
            showToast(data.message || 'Payment confirmation failed', 'error');
        }
    } catch (error) {
        console.error('Payment confirmation error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Show success modal
function showSuccessModal(bookingId) {
    const modal = document.getElementById('successModal');
    const content = document.getElementById('successModalContent');

    content.innerHTML = `
        <div class="success-animation">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Booking Confirmed!</h3>
            <p>Your travel booking has been successfully confirmed.</p>
        </div>

        <div class="booking-details">
            <div class="detail-item">
                <strong>Booking ID:</strong>
                <span style="color: var(--primary-color); font-weight: 600;">${bookingId}</span>
            </div>
            <div class="detail-item">
                <strong>Status:</strong>
                <span style="color: var(--secondary-color); font-weight: 600;">Confirmed</span>
            </div>
        </div>

        <div class="success-message">
            <p><strong>What's Next?</strong></p>
            <ul>
                <li>Check your email for booking confirmation and details</li>
                <li>Save your booking ID for future reference</li>
                <li>Contact us if you need to make any changes</li>
            </ul>
        </div>

        <div class="success-actions">
            <button class="submit-btn" onclick="showUserDashboard(); closeModal('successModal');">
                <i class="fas fa-dashboard"></i>
                View My Bookings
            </button>
            <button class="submit-btn secondary" onclick="closeModal('successModal');" style="margin-top: 0.5rem;">
                <i class="fas fa-home"></i>
                Continue Browsing
            </button>
        </div>
    `;

    // Add success styles
    if (!document.getElementById('successStyles')) {
        const styles = document.createElement('style');
        styles.id = 'successStyles';
        styles.textContent = `
            .success-animation {
                text-align: center;
                margin-bottom: 2rem;
            }

            .success-icon {
                font-size: 4rem;
                color: var(--secondary-color);
                margin-bottom: 1rem;
                animation: successPulse 1s ease-in-out;
            }

            .success-animation h3 {
                font-size: 1.5rem;
                color: var(--gray-800);
                margin-bottom: 0.5rem;
            }

            .booking-details {
                background: var(--gray-50);
                padding: 1.5rem;
                border-radius: var(--border-radius-xl);
                margin-bottom: 2rem;
            }

            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--gray-200);
            }

            .detail-item:last-child {
                border-bottom: none;
            }

            .success-message {
                margin-bottom: 2rem;
            }

            .success-message ul {
                padding-left: 1.5rem;
                color: var(--gray-600);
            }

            .success-message li {
                margin-bottom: 0.5rem;
            }

            .submit-btn.secondary {
                background: var(--gray-600);
            }

            .submit-btn.secondary:hover {
                background: var(--gray-700);
            }

            @keyframes successPulse {
                0% { transform: scale(0.8); opacity: 0; }
                50% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    showModal('successModal');
}

// UI Helper Functions
function showLoginModal() {
    showModal('loginModal');
}

function showRegisterModal() {
    closeModal('loginModal');
    showModal('registerModal');
}

function showAdminLogin() {
    // For demo purposes, show admin login as regular login
    // In production, this would be a separate admin login form
    showToast('Admin login: Use admin@exploreease.com / admin123', 'info');
    showModal('loginModal');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function toggleUserMenu() {
    const menu = document.querySelector('.profile-menu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

function logout() {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('exploreease_token');
    localStorage.removeItem('exploreease_user');
    updateAuthUI();
    showToast('Logged out successfully', 'success');

    // Close user menu
    const menu = document.querySelector('.profile-menu');
    if (menu) {
        menu.classList.remove('show');
    }
}

function showUserDashboard() {
    showToast('User dashboard feature coming soon!', 'info');
}

function showMyBookings() {
    showToast('My bookings feature coming soon!', 'info');
}

function showProfile() {
    showToast('Profile management coming soon!', 'info');
}

function closeDashboard() {
    const dashboard = document.getElementById('userDashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
}

function closeAdminDashboard() {
    const dashboard = document.getElementById('adminDashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = elements.toast;
    if (!toast) return;

    const toastContent = toast.querySelector('.toast-content');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');

    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-circle'
    };

    toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
    toastMessage.textContent = message;

    // Set toast type class
    toast.className = `toast ${type}`;

    // Show toast
    toast.classList.add('show');

    // Hide toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// Admin Functions (placeholders for future implementation)
function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[onclick="showAdminTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function showDashTab(tabName) {
    document.querySelectorAll('.dash-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.dash-tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[onclick="showDashTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showToast('An unexpected error occurred', 'error');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('An unexpected error occurred', 'error');
});

console.log('🚀 ExploreEase Application Loaded Successfully!');