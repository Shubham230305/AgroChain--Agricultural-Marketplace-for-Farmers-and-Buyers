// AgroChain Landing Page Script - Real Data Integration

document.addEventListener('DOMContentLoaded', async () => {
    updateNavAuth();
    await loadMarketplacePreview();
});

// Update Navbar buttons based on actual authentication state
function updateNavAuth() {
    const navAuth = document.getElementById('navAuthActions');
    if (!navAuth) return;

    const user = getUser();
    const token = getToken();

    if (token && user) {
        const dashboardUrl = user.role === 'farmer' ? 'farmer-dashboard.html' : 'buyer-dashboard.html';
        navAuth.innerHTML = `
            <a href="${dashboardUrl}" class="btn btn-outline"><i class="fas fa-th-large"></i> Dashboard (${user.role})</a>
            <button onclick="logout()" class="btn btn-secondary" style="margin-left: 8px;"><i class="fas fa-sign-out-alt"></i> Logout</button>
        `;
    }
}

// Fetch real available crops from MongoDB
async function loadMarketplacePreview() {
    const grid = document.getElementById('previewCropsGrid');
    const statActiveCrops = document.getElementById('statActiveCrops');
    if (!grid) return;

    try {
        const res = await apiCall('/marketplace/crops');
        const crops = res.crops || [];

        if (statActiveCrops) {
            statActiveCrops.textContent = crops.length;
        }

        if (crops.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-seedling" style="font-size: 3rem; color: #4CAF50; margin-bottom: 12px;"></i>
                    <h3>No crops currently listed</h3>
                    <p>Be the first farmer to list fresh produce!</p>
                    <a href="register.html" class="btn btn-primary" style="margin-top: 15px; display: inline-block;">Register as Farmer</a>
                </div>
            `;
            return;
        }

        // Display up to 6 crops
        const previewList = crops.slice(0, 6);
        grid.innerHTML = previewList.map(crop => `
            <div class="crop-card">
                <div class="crop-card-header">
                    <span class="crop-badge ${crop.organic ? 'badge-organic' : 'badge-standard'}">
                        ${crop.organic ? '<i class="fas fa-leaf"></i> Organic' : 'Standard'}
                    </span>
                    <span class="crop-quality">Grade ${crop.quality || 'A'}</span>
                </div>
                <div class="crop-body">
                    <h3 class="crop-title">${escapeHtml(crop.name)}</h3>
                    <p class="crop-desc">${escapeHtml(crop.description || 'Fresh harvested produce ready for dispatch.')}</p>
                    <div class="crop-details">
                        <div class="detail-row">
                            <span><i class="fas fa-boxes"></i> Available:</span>
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
                    <a href="login.html" class="btn btn-sm btn-outline">Buy Now</a>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Failed to load marketplace preview:', err);
        if (statActiveCrops) statActiveCrops.textContent = '0';
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #777; padding: 20px;">
                <p>Could not connect to marketplace database. Please ensure backend is running.</p>
            </div>
        `;
    }
}

// Utility to escape HTML and prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
