// AgroChain Buyer Dashboard & Marketplace - Real MongoDB Integration

let availableCropsList = [];
let selectedCropForPurchase = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Role check: buyer or admin
    if (!requireAuth('buyer')) return;

    setupUserInfo();
    await loadMarketplaceCrops();
    await loadOverviewStats();
    await loadPurchasesHistory();
    setupEventListeners();
});

// Setup user meta in UI
function setupUserInfo() {
    const user = getUser();
    if (user) {
        const nameEl = document.getElementById('sidebarUserName');
        if (nameEl) nameEl.textContent = user.name;

        const pName = document.getElementById('profileName');
        const pEmail = document.getElementById('profileEmail');
        const pPhone = document.getElementById('profilePhone');
        const pLoc = document.getElementById('profileLocation');

        if (pName) pName.value = user.name || '';
        if (pEmail) pEmail.value = user.email || '';
        if (pPhone) pPhone.value = user.phone || '';
        if (pLoc) pLoc.value = user.location || '';
    }
}

// Switch between tabs
function switchTab(tab) {
    const tabs = ['marketplace', 'overview', 'purchases'];
    tabs.forEach(t => {
        const sec = document.getElementById(`${t}Section`);
        if (sec) sec.style.display = (t === tab) ? 'block' : 'none';
    });

    document.querySelectorAll('.sidebar .nav-links a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar .nav-links a[href="#${tab}"]`);
    if (activeLink) activeLink.classList.add('active');

    const headingMap = {
        'marketplace': { title: 'Agricultural Marketplace', subtitle: 'Direct fresh produce available from verified farmers' },
        'overview': { title: 'Buyer Overview', subtitle: 'Summary of purchases, expenditure and market supply' },
        'purchases': { title: 'My Purchase Orders', subtitle: 'Complete transaction history and direct trade records' }
    };

    if (headingMap[tab]) {
        document.getElementById('pageHeading').textContent = headingMap[tab].title;
        document.getElementById('pageSubheading').textContent = headingMap[tab].subtitle;
    }
}

// Fetch real marketplace crops from MongoDB
async function loadMarketplaceCrops() {
    const grid = document.getElementById('marketplaceCropsGrid');
    if (!grid) return;

    const search = document.getElementById('cropSearchInput')?.value.trim() || '';
    const organic = document.getElementById('filterOrganic')?.value || '';
    const quality = document.getElementById('filterQuality')?.value || '';

    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (organic) queryParams.append('organic', organic);
    if (quality) queryParams.append('quality', quality);

    try {
        const res = await apiCall(`/marketplace/crops?${queryParams.toString()}`);
        availableCropsList = res.crops || [];

        if (availableCropsList.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-search" style="font-size: 2.5rem; color: #3b82f6; margin-bottom: 12px;"></i>
                    <h3>No crops found</h3>
                    <p>Try adjusting your search query or filters.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = availableCropsList.map(crop => `
            <div class="crop-card">
                <div class="crop-card-header">
                    <span class="crop-badge ${crop.organic ? 'badge-organic' : 'badge-standard'}">
                        ${crop.organic ? '<i class="fas fa-leaf"></i> Organic' : 'Standard'}
                    </span>
                    <span class="crop-quality">Grade ${crop.quality || 'A'}</span>
                </div>
                <div class="crop-body">
                    <h3 class="crop-title">${escapeHtml(crop.name)}</h3>
                    <p class="crop-desc">${escapeHtml(crop.description || 'Fresh harvest direct from verified farm.')}</p>
                    <div class="crop-details">
                        <div class="detail-row">
                            <span><i class="fas fa-boxes"></i> Stock:</span>
                            <strong>${crop.quantity} ${crop.unit}</strong>
                        </div>
                        <div class="detail-row">
                            <span><i class="fas fa-map-marker-alt"></i> Location:</span>
                            <span>${escapeHtml(crop.location)}</span>
                        </div>
                        <div class="detail-row">
                            <span><i class="fas fa-user"></i> Farmer:</span>
                            <span>${crop.farmer ? escapeHtml(crop.farmer.name) : 'Verified Farmer'}</span>
                        </div>
                    </div>
                </div>
                <div class="crop-card-footer">
                    <div class="crop-price">
                        <strong>₹${crop.price}</strong> <small>/ ${crop.unit}</small>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="openBuyModal('${crop._id}')">
                        <i class="fas fa-shopping-cart"></i> Buy Now
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Failed to load marketplace crops:', err);
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #d32f2f; padding: 30px;">
                <p>Failed to load marketplace crops: ${escapeHtml(err.message)}</p>
            </div>
        `;
    }
}

// Search & Filter debounced handlers
let searchTimeout = null;
function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadMarketplaceCrops();
    }, 300);
}

function handleFilter() {
    loadMarketplaceCrops();
}

function resetFilters() {
    document.getElementById('cropSearchInput').value = '';
    document.getElementById('filterOrganic').value = '';
    document.getElementById('filterQuality').value = '';
    loadMarketplaceCrops();
}

function refreshMarketplace() {
    loadMarketplaceCrops();
    showToast('Marketplace updated with live inventory', 'info');
}

// Load real stats and recent purchases
async function loadOverviewStats() {
    try {
        const res = await apiCall('/dashboard/stats');
        if (res.success && res.stats) {
            const { totalPurchases, totalSpent, availableMarketCrops, recentPurchases } = res.stats;

            document.getElementById('statTotalPurchases').textContent = totalPurchases;
            document.getElementById('statTotalSpent').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
            document.getElementById('statAvailableCrops').textContent = availableMarketCrops;

            renderRecentPurchases(recentPurchases || []);
        }
    } catch (err) {
        console.error('Failed to load buyer overview stats:', err);
    }
}

function renderRecentPurchases(purchases) {
    const tbody = document.getElementById('recentPurchasesTableBody');
    if (!tbody) return;

    if (purchases.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #777;">No purchase orders yet. Browse the marketplace and order crops.</td></tr>`;
        return;
    }

    tbody.innerHTML = purchases.map(p => `
        <tr>
            <td>${new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
            <td><strong>${escapeHtml(p.crop ? p.crop.name : 'Produce')}</strong></td>
            <td>${p.quantity} ${p.crop?.unit || 'kg'}</td>
            <td>₹${p.unitPrice}</td>
            <td><strong style="color: #2e7d32;">₹${p.totalAmount}</strong></td>
            <td>${escapeHtml(p.farmer ? p.farmer.name : 'Farmer')}</td>
            <td><span class="badge badge-success">${p.status}</span></td>
        </tr>
    `).join('');
}

// Load all buyer purchases
async function loadPurchasesHistory() {
    const tbody = document.getElementById('allPurchasesTableBody');
    const badge = document.getElementById('purchasesCountBadge');
    if (!tbody) return;

    try {
        const res = await apiCall('/transactions');
        const transactions = res.transactions || [];

        if (badge) badge.textContent = `${transactions.length} Orders`;

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 30px; color: #777;">You have not placed any orders yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td><small style="font-family: monospace;">${t._id.slice(-6).toUpperCase()}</small></td>
                <td>${new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                <td><strong>${escapeHtml(t.crop ? t.crop.name : 'Crop')}</strong></td>
                <td>${t.quantity} ${t.crop?.unit || 'kg'}</td>
                <td>₹${t.unitPrice}</td>
                <td><strong style="color: #2e7d32;">₹${t.totalAmount}</strong></td>
                <td>${escapeHtml(t.farmer ? t.farmer.name : 'Farmer')}</td>
                <td><small>${escapeHtml(t.farmer?.phone || t.farmer?.email || '--')}</small></td>
                <td><span class="badge badge-success">${t.status}</span></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load purchase history:', err);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color: #d32f2f;">Error loading orders: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// Purchase Modal
function openBuyModal(cropId) {
    const crop = availableCropsList.find(c => c._id === cropId);
    if (!crop) return;

    selectedCropForPurchase = crop;

    document.getElementById('buyCropId').value = crop._id;
    document.getElementById('buyCropName').textContent = crop.name;
    document.getElementById('buyCropFarmer').textContent = `Farmer: ${crop.farmer ? crop.farmer.name : 'Verified Farmer'}`;
    document.getElementById('buyCropLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> Location: ${escapeHtml(crop.location)}`;
    document.getElementById('buyCropPrice').textContent = `₹${crop.price}`;
    document.getElementById('buyCropUnit').textContent = crop.unit;
    document.getElementById('buyCropUnit2').textContent = crop.unit;
    document.getElementById('buyUnitLabel').textContent = crop.unit;
    document.getElementById('buyCropMaxQty').textContent = crop.quantity;

    const qtyInput = document.getElementById('buyQuantity');
    qtyInput.value = 1;
    qtyInput.max = crop.quantity;

    calculateBuyTotal();

    document.getElementById('buyModal').style.display = 'flex';
}

function closeBuyModal() {
    document.getElementById('buyModal').style.display = 'none';
    selectedCropForPurchase = null;
}

function calculateBuyTotal() {
    if (!selectedCropForPurchase) return;

    const qty = parseFloat(document.getElementById('buyQuantity').value) || 0;
    const total = parseFloat((qty * selectedCropForPurchase.price).toFixed(2));

    const totalEl = document.getElementById('buyTotalAmount');
    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;

    const confirmBtn = document.getElementById('confirmBuyBtn');
    if (confirmBtn) {
        if (qty <= 0 || qty > selectedCropForPurchase.quantity) {
            confirmBtn.disabled = true;
        } else {
            confirmBtn.disabled = false;
        }
    }
}

function openProfileModal() {
    document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Setup Event Listeners
function setupEventListeners() {
    // Mobile Sidebar Drawer
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const overlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (!sidebar) return;
        const isOpen = sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active', isOpen);
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Auto-close sidebar on mobile when navigating tabs
    document.querySelectorAll('.sidebar .nav-links a').forEach(a => {
        a.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                closeSidebar();
            }
        });
    });

    // Purchase Form Submission
    const buyForm = document.getElementById('buyForm');
    if (buyForm) {
        buyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedCropForPurchase) return;

            const cropId = selectedCropForPurchase._id;
            const quantity = parseFloat(document.getElementById('buyQuantity').value);
            const paymentMethod = document.getElementById('buyPaymentMethod').value;

            if (quantity <= 0 || quantity > selectedCropForPurchase.quantity) {
                showToast(`Please enter quantity between 1 and ${selectedCropForPurchase.quantity}`, 'warning');
                return;
            }

            const confirmBtn = document.getElementById('confirmBuyBtn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

            try {
                const res = await apiCall('/transactions', {
                    method: 'POST',
                    body: {
                        cropId,
                        quantity,
                        paymentMethod
                    }
                });

                if (res.success) {
                    showToast(`Order placed successfully! ₹${res.transaction.totalAmount} recorded.`, 'success');
                    closeBuyModal();

                    // Refresh both marketplace and history
                    await loadMarketplaceCrops();
                    await loadOverviewStats();
                    await loadPurchasesHistory();
                } else {
                    showToast(res.message || 'Transaction could not be completed', 'error');
                }
            } catch (err) {
                showToast(err.message || 'Transaction failed', 'error');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<i class="fas fa-check-circle"></i> Confirm Purchase`;
            }
        });
    }

    // Profile Form Submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('profileName').value.trim();
            const phone = document.getElementById('profilePhone').value.trim();
            const location = document.getElementById('profileLocation').value.trim();

            try {
                const res = await apiCall('/auth/profile', {
                    method: 'PUT',
                    body: { name, phone, location }
                });

                if (res.success && res.user) {
                    const current = getUser();
                    setAuth(getToken(), { ...current, ...res.user });
                    setupUserInfo();
                    showToast('Profile updated successfully', 'success');
                    closeProfileModal();
                }
            } catch (err) {
                showToast(err.message || 'Failed to update profile', 'error');
            }
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
