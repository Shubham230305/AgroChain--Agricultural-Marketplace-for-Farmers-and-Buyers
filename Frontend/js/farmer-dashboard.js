// AgroChain Farmer Dashboard - Real MongoDB Integration

let currentCropsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Role check: must be farmer or admin
    if (!requireAuth('farmer')) return;

    setupUserInfo();
    await loadDashboard();
    await loadMyCrops();
    await loadAllTransactions();
    setupEventListeners();
});

// Setup user meta in UI
function setupUserInfo() {
    const user = getUser();
    if (user) {
        const nameEl = document.getElementById('sidebarUserName');
        if (nameEl) nameEl.textContent = user.name;

        // Pre-fill profile modal fields
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

// Switch between dashboard tabs
function switchTab(tab) {
    const tabs = ['overview', 'my-crops', 'transactions'];
    tabs.forEach(t => {
        const sec = document.getElementById(`${t === 'overview' ? 'overview' : t === 'my-crops' ? 'myCrops' : 'transactions'}Section`);
        if (sec) sec.style.display = (t === tab) ? 'block' : 'none';
    });

    // Update sidebar active links
    document.querySelectorAll('.sidebar .nav-links a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar .nav-links a[href="#${tab}"]`);
    if (activeLink) activeLink.classList.add('active');

    const headingMap = {
        'overview': { title: 'Farmer Dashboard', subtitle: 'Manage your crops and track direct sales' },
        'my-crops': { title: 'My Listed Crops', subtitle: 'Manage, edit and update your produce inventory' },
        'transactions': { title: 'Sales History', subtitle: 'Detailed record of all marketplace buyer purchases' }
    };

    if (headingMap[tab]) {
        document.getElementById('pageHeading').textContent = headingMap[tab].title;
        document.getElementById('pageSubheading').textContent = headingMap[tab].subtitle;
    }
}

// Load real statistics and recent sales from MongoDB
async function loadDashboard() {
    try {
        const res = await apiCall('/dashboard/stats');
        if (res.success && res.stats) {
            const { totalCrops, availableCrops, totalSales, totalRevenue, recentSales } = res.stats;

            document.getElementById('statTotalCrops').textContent = totalCrops;
            document.getElementById('statAvailableCrops').textContent = availableCrops;
            document.getElementById('statTotalSales').textContent = totalSales;
            document.getElementById('statTotalRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;

            renderRecentSales(recentSales || []);
        }
    } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
        showToast('Error loading stats from database', 'error');
    }
}

// Render recent sales
function renderRecentSales(sales) {
    const tbody = document.getElementById('recentSalesTableBody');
    if (!tbody) return;

    if (sales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #777;">No sales recorded yet. Once buyers purchase your crops, transactions will appear here.</td></tr>`;
        return;
    }

    tbody.innerHTML = sales.map(s => `
        <tr>
            <td>${new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
            <td><strong>${escapeHtml(s.crop ? s.crop.name : 'Crop')}</strong></td>
            <td>${s.quantity} ${s.crop?.unit || 'kg'}</td>
            <td>₹${s.unitPrice || (s.crop?.price || 0)}</td>
            <td><strong style="color: #2e7d32;">₹${s.totalAmount}</strong></td>
            <td>${escapeHtml(s.buyer ? s.buyer.name : 'Buyer')}</td>
            <td><span class="badge badge-success">${s.status}</span></td>
        </tr>
    `).join('');
}

// Load farmer's own crops
async function loadMyCrops() {
    const tbody = document.getElementById('myCropsTableBody');
    if (!tbody) return;

    try {
        const res = await apiCall('/marketplace/my-crops');
        currentCropsList = res.crops || [];

        if (currentCropsList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">You haven't listed any crops yet.</p>
                        <button class="btn btn-primary btn-sm" onclick="openAddCropModal()">List Your First Crop</button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = currentCropsList.map(crop => {
            const statusClass = crop.status === 'available' ? 'badge-success' : crop.status === 'sold' ? 'badge-danger' : 'badge-warning';
            return `
                <tr>
                    <td><strong>${escapeHtml(crop.name)}</strong></td>
                    <td>${crop.quantity} ${crop.unit}</td>
                    <td>₹${crop.price} / ${crop.unit}</td>
                    <td>${escapeHtml(crop.location)}</td>
                    <td>Grade ${crop.quality || 'Standard'}</td>
                    <td>${crop.organic ? '<span class="badge badge-success"><i class="fas fa-leaf"></i> Yes</span>' : 'No'}</td>
                    <td><span class="badge ${statusClass}">${crop.status}</span></td>
                    <td>
                        <div class="action-btn-group">
                            <button class="btn-icon" title="Edit" onclick="openEditCropModal('${crop._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" title="${crop.status === 'available' ? 'Mark Inactive' : 'Mark Available'}" onclick="toggleCropStatus('${crop._id}', '${crop.status}')">
                                <i class="fas ${crop.status === 'available' ? 'fa-pause' : 'fa-play'}"></i>
                            </button>
                            <button class="btn-icon btn-danger" title="Delete" onclick="deleteCrop('${crop._id}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load my crops:', err);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: #d32f2f;">Failed to load crops from database: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// Load all transactions
async function loadAllTransactions() {
    const tbody = document.getElementById('allSalesTableBody');
    const badge = document.getElementById('salesCountBadge');
    if (!tbody) return;

    try {
        const res = await apiCall('/transactions');
        const transactions = res.transactions || [];

        if (badge) badge.textContent = `${transactions.length} Sales`;

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 30px; color: #777;">No transaction history found.</td></tr>`;
            return;
        }

        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td><small style="font-family: monospace;">${t._id.slice(-6).toUpperCase()}</small></td>
                <td>${new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                <td><strong>${escapeHtml(t.crop ? t.crop.name : 'Unknown Produce')}</strong></td>
                <td>${t.quantity} ${t.crop?.unit || 'kg'}</td>
                <td>₹${t.unitPrice}</td>
                <td><strong style="color: #2e7d32;">₹${t.totalAmount}</strong></td>
                <td>${escapeHtml(t.buyer ? t.buyer.name : 'Buyer')}</td>
                <td><small>${escapeHtml(t.buyer?.phone || t.buyer?.email || '--')}</small></td>
                <td><span class="badge badge-success">${t.status}</span></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load transactions:', err);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color: #d32f2f;">Error retrieving transactions: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// Modal Handlers
function openAddCropModal() {
    const form = document.getElementById('cropForm');
    form.reset();
    document.getElementById('cropId').value = '';
    document.getElementById('cropModalTitle').textContent = 'List Crop for Sale';
    document.getElementById('statusGroup').style.display = 'none';

    // Pre-fill location if user has one
    const user = getUser();
    if (user && user.location) {
        document.getElementById('modalLocation').value = user.location;
    }

    document.getElementById('cropModal').style.display = 'flex';
}

function openEditCropModal(cropId) {
    const crop = currentCropsList.find(c => c._id === cropId);
    if (!crop) return;

    document.getElementById('cropId').value = crop._id;
    document.getElementById('cropModalTitle').textContent = 'Edit Crop Listing';
    document.getElementById('modalCropName').value = crop.name;
    document.getElementById('modalQuality').value = crop.quality || 'standard';
    document.getElementById('modalQuantity').value = crop.quantity;
    document.getElementById('modalUnit').value = crop.unit || 'kg';
    document.getElementById('modalPrice').value = crop.price;
    document.getElementById('modalLocation').value = crop.location;
    document.getElementById('modalDescription').value = crop.description || '';
    document.getElementById('modalOrganic').checked = !!crop.organic;
    document.getElementById('modalStatus').value = crop.status;
    document.getElementById('statusGroup').style.display = 'block';

    document.getElementById('cropModal').style.display = 'flex';
}

function closeCropModal() {
    document.getElementById('cropModal').style.display = 'none';
}

function openProfileModal() {
    document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Toggle crop status (Available <-> Inactive)
async function toggleCropStatus(cropId, currentStatus) {
    const newStatus = currentStatus === 'available' ? 'inactive' : 'available';
    try {
        const res = await apiCall(`/marketplace/crops/${cropId}`, {
            method: 'PUT',
            body: { status: newStatus }
        });
        showToast(`Crop marked as ${newStatus}`, 'success');
        await loadMyCrops();
        await loadDashboard();
    } catch (err) {
        showToast(err.message || 'Failed to update status', 'error');
    }
}

// Delete Crop Listing
async function deleteCrop(cropId) {
    if (!confirm('Are you sure you want to delete this crop listing? This cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/marketplace/crops/${cropId}`, {
            method: 'DELETE'
        });
        showToast('Crop listing deleted successfully', 'success');
        await loadMyCrops();
        await loadDashboard();
    } catch (err) {
        showToast(err.message || 'Failed to delete crop', 'error');
    }
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

    // Crop Form submission (Create or Update)
    const cropForm = document.getElementById('cropForm');
    if (cropForm) {
        cropForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveCropBtn');
            saveBtn.disabled = true;

            const cropId = document.getElementById('cropId').value;
            const payload = {
                name: document.getElementById('modalCropName').value.trim(),
                quality: document.getElementById('modalQuality').value,
                quantity: parseFloat(document.getElementById('modalQuantity').value),
                unit: document.getElementById('modalUnit').value,
                price: parseFloat(document.getElementById('modalPrice').value),
                location: document.getElementById('modalLocation').value.trim(),
                description: document.getElementById('modalDescription').value.trim(),
                organic: document.getElementById('modalOrganic').checked
            };

            if (cropId) {
                payload.status = document.getElementById('modalStatus').value;
            }

            try {
                if (cropId) {
                    await apiCall(`/marketplace/crops/${cropId}`, {
                        method: 'PUT',
                        body: payload
                    });
                    showToast('Crop listing updated successfully', 'success');
                } else {
                    await apiCall('/marketplace/crops', {
                        method: 'POST',
                        body: payload
                    });
                    showToast('Crop listed successfully in marketplace', 'success');
                }

                closeCropModal();
                await loadMyCrops();
                await loadDashboard();
            } catch (err) {
                showToast(err.message || 'Failed to save crop listing', 'error');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    // Profile Form submission
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
