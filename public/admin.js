document.addEventListener('DOMContentLoaded', () => {

  // Auth Nodes
  const loginPanel = document.getElementById('admin-login-panel');
  const dashboardPanel = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');

  // Tab Nodes
  const tabNavItems = document.querySelectorAll('.admin-nav-item');
  const tabContents = document.querySelectorAll('.admin-tab-content');
  const pageTitle = document.getElementById('page-title');

  // Stats Nodes
  const statRevenue = document.getElementById('stat-revenue');
  const statOrders = document.getElementById('stat-orders');
  const statLeads = document.getElementById('stat-leads');

  // Database Tables Nodes
  const paymentsTableBody = document.getElementById('payments-table-body');
  const leadsTableBody = document.getElementById('leads-table-body');

  // CMS Nodes
  const cmsForm = document.getElementById('cms-form');
  const galleryTableBody = document.getElementById('gallery-table-body');
  const addGalleryBtn = document.getElementById('add-gallery-btn');
  const cmsHeroTitle = document.getElementById('cms-hero-title');
  const cmsHeroSubtitle = document.getElementById('cms-hero-subtitle');
  const cmsHeroDesc = document.getElementById('cms-hero-desc');
  const cmsAboutTitle = document.getElementById('cms-about-title');
  const cmsAboutDesc = document.getElementById('cms-about-desc');
  const cmsAboutContent = document.getElementById('cms-about-content');
  const cmsContactEmail = document.getElementById('cms-contact-email');
  const cmsContactPhone = document.getElementById('cms-contact-phone');
  const cmsContactAddress = document.getElementById('cms-contact-address');

  // Plans Editor Nodes
  const plansTableBody = document.getElementById('products-table-body');
  const addPlanBtn = document.getElementById('add-plan-btn');

  // Modal Nodes
  const adminModal = document.getElementById('admin-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');

  // Security Nodes
  const passwordForm = document.getElementById('password-form');

  // Global state
  let loadedPlans = [];
  let editingPlanId = null;
  let editingGalleryId = null;

  // --- INITIAL CHECK ---
  checkAuth();

  // --- EVENT LISTENERS ---

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username').value;
      const passwordInput = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('login-error-msg');

      errorMsg.style.display = 'none';

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await response.json();

        if (response.ok && data.success) {
          showDashboard();
          loadDashboardData();
        } else {
          errorMsg.style.display = 'block';
        }
      } catch (err) {
        console.error(err);
        alert('Connection error during login');
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.reload();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Modal close
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      adminModal.style.display = 'none';
    });
  }

  // Tab Navigation Toggles
  tabNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      // Set active nav class
      tabNavItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Set page title
      if (pageTitle) pageTitle.innerText = item.innerText;

      // Show target tab content
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      const activeContent = document.getElementById(targetTab);
      if (activeContent) activeContent.style.display = 'block';

      // Lazy Load specific tab data if needed
      if (targetTab === 'tab-payments') loadPayments();
      if (targetTab === 'tab-leads') loadLeads();
      if (targetTab === 'tab-products') loadPlansEditor();
      if (targetTab === 'tab-content') loadCMSData();
      if (targetTab === 'tab-gallery') loadCMSData();
      if (targetTab === 'tab-product-pages') loadProductPageData();
    });
  });

  // --- Product Pages Logic ---
  const productPageSelect = document.getElementById('product-page-select');
  const productPageJson = document.getElementById('product-page-json');
  const saveProductPageBtn = document.getElementById('save-product-page-btn');

  async function loadProductPageData() {
    if (!productPageSelect) return;
    const pageId = productPageSelect.value;
    productPageJson.value = 'Loading...';
    try {
      const response = await fetch(`/api/content/page?id=${pageId}`);
      if (response.ok) {
        const data = await response.json();
        productPageJson.value = JSON.stringify(data, null, 2);
      } else {
        productPageJson.value = '{}';
      }
    } catch (err) {
      console.error(err);
      productPageJson.value = 'Error loading data';
    }
  }

  if (productPageSelect) {
    productPageSelect.addEventListener('change', loadProductPageData);
  }

  if (saveProductPageBtn) {
    saveProductPageBtn.addEventListener('click', async () => {
      const pageId = productPageSelect.value;
      try {
        const parsedData = JSON.parse(productPageJson.value);
        const response = await fetch(`/api/admin/content/page?id=${pageId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        });
        if (response.ok) {
          alert(`${pageId.toUpperCase()} page updated successfully!`);
        } else {
          alert('Failed to update page.');
        }
      } catch (e) {
        alert('Invalid JSON format. Please check your syntax.');
      }
    });
  }
  // ---------------------------

  let currentCmsData = {};

  // CMS Form Submission
  if (cmsForm) {
    cmsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const content = {
        ...currentCmsData,
        hero: {
          title: cmsHeroTitle.value,
          subtitle: cmsHeroSubtitle.value,
          description: cmsHeroDesc.value
        },
        about: {
          title: cmsAboutTitle.value,
          description: cmsAboutDesc.value,
          content: cmsAboutContent.value
        },
        contact: {
          email: cmsContactEmail.value,
          phone: cmsContactPhone.value,
          address: cmsContactAddress.value
        },
        gallery: currentCmsData.gallery || []
      };

      try {
        const response = await fetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content)
        });
        if (response.ok) {
          alert('Website content updated successfully!');
        } else {
          alert('Failed to update content.');
        }
      } catch (err) {
        console.error(err);
        alert('Error updating content.');
      }
    });
  }

  // Gallery Add Button
  if (addGalleryBtn) {
    addGalleryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openGalleryModal(null);
    });
  }

  // Password Form Submission
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('new-password').value;
      try {
        const res = await fetch('/api/admin/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword })
        });
        if (res.ok) {
          alert('Password updated successfully!');
          passwordForm.reset();
        } else {
          alert('Failed to update password.');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Add Plan Button
  if (addPlanBtn) {
    addPlanBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const newPlan = { id: 'new_' + Date.now(), name: 'New Product', price: 0, billing: 'month', type: 'Software', description: '', features: [] };
      loadedPlans.push(newPlan);
      renderPlansEditor(loadedPlans);
      openPlanModal(newPlan.id);
    });
  }

  // --- CORE FUNCTIONS ---

  async function checkAuth() {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
        }
      });
      if (response.ok) {
        showDashboard();
        loadDashboardData();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    if (loginPanel) loginPanel.style.display = 'flex';
    if (dashboardPanel) dashboardPanel.style.display = 'none';
  }

  function showDashboard() {
    if (loginPanel) loginPanel.style.display = 'none';
    if (dashboardPanel) dashboardPanel.style.display = 'block';
  }

  async function loadDashboardData() {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Unauthorized');
      const data = await response.json();

      if (statRevenue) statRevenue.innerText = parseFloat(data.revenue).toFixed(3);
      if (statOrders) statOrders.innerText = data.successfulCount;
      if (statLeads) statLeads.innerText = data.leadsCount;
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPayments() {
    if (!paymentsTableBody) return;
    paymentsTableBody.innerHTML = '<tr><td colspan="5">Loading payments...</td></tr>';
    try {
      const res = await fetch('/api/admin/payments');
      const payments = await res.json();
      paymentsTableBody.innerHTML = '';
      
      if (payments.length === 0) {
        paymentsTableBody.innerHTML = '<tr><td colspan="5">No payments found.</td></tr>';
        return;
      }

      payments.forEach(p => {
        const tr = document.createElement('tr');
        const badgeClass = p.status === 'SUCCESS' ? 'success' : (p.status === 'FAILED' ? 'failed' : 'pending');
        tr.innerHTML = `
          <td>${new Date(p.created_at).toLocaleString()}</td>
          <td>${p.customer_name}<br><small style="color:var(--admin-text-light)">${p.customer_email}</small></td>
          <td>${p.plan_name}</td>
          <td>${p.amount_omr} OMR</td>
          <td><span class="admin-badge ${badgeClass}">${p.status}</span></td>
        `;
        paymentsTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      paymentsTableBody.innerHTML = '<tr><td colspan="5" style="color:red">Failed to load payments.</td></tr>';
    }
  }

  async function loadLeads() {
    if (!leadsTableBody) return;
    leadsTableBody.innerHTML = '<tr><td colspan="5">Loading leads...</td></tr>';
    try {
      const res = await fetch('/api/admin/leads');
      const leads = await res.json();
      leadsTableBody.innerHTML = '';
      
      if (leads.length === 0) {
        leadsTableBody.innerHTML = '<tr><td colspan="5">No leads found.</td></tr>';
        return;
      }

      leads.forEach(l => {
        const tr = document.createElement('tr');
        const badgeClass = l.status === 'New' ? 'pending' : 'success';
        tr.innerHTML = `
          <td>${new Date(l.created_at).toLocaleString()}</td>
          <td>${l.name}</td>
          <td>${l.email}<br><small style="color:var(--admin-text-light)">${l.phone || ''}</small></td>
          <td><span class="admin-badge ${badgeClass}">${l.status}</span></td>
          <td><button class="admin-btn update-lead-btn" data-id="${l.id}" data-status="${l.status === 'New' ? 'Contacted' : 'New'}" style="padding: 4px 8px; font-size: 11px;">Toggle Status</button></td>
        `;
        leadsTableBody.appendChild(tr);
      });

      // Bind toggle buttons
      document.querySelectorAll('.update-lead-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const newStatus = e.target.getAttribute('data-status');
          await fetch('/api/admin/leads/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus, notes: '' })
          });
          loadLeads();
        });
      });
    } catch (err) {
      console.error(err);
      leadsTableBody.innerHTML = '<tr><td colspan="5" style="color:red">Failed to load leads.</td></tr>';
    }
  }

  async function loadCMSData() {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        currentCmsData = data;
        
        if (cmsHeroTitle && data.hero) cmsHeroTitle.value = data.hero.title || '';
        if (cmsHeroSubtitle && data.hero) cmsHeroSubtitle.value = data.hero.subtitle || '';
        if (cmsHeroDesc && data.hero) cmsHeroDesc.value = data.hero.description || '';
        
        if (cmsAboutTitle && data.about) cmsAboutTitle.value = data.about.title || '';
        if (cmsAboutDesc && data.about) cmsAboutDesc.value = data.about.description || '';
        if (cmsAboutContent && data.about) cmsAboutContent.value = data.about.content || '';

        if (cmsContactEmail && data.contact) cmsContactEmail.value = data.contact.email || '';
        if (cmsContactPhone && data.contact) cmsContactPhone.value = data.contact.phone || '';
        if (cmsContactAddress && data.contact) cmsContactAddress.value = data.contact.address || '';
        
        if (data.gallery) {
          renderGalleryEditor(data.gallery);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadPlansEditor() {
    try {
      const res = await fetch('/api/plans');
      loadedPlans = await res.json();
      renderPlansEditor(loadedPlans);
    } catch (err) {
      console.error(err);
    }
  }

  function renderPlansEditor(plans) {
    if (!plansTableBody) return;
    plansTableBody.innerHTML = '';

    if (plans.length === 0) {
      plansTableBody.innerHTML = '<tr><td colspan="4">No products found.</td></tr>';
      return;
    }

    plans.forEach(plan => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--admin-primary);">${plan.name}</td>
        <td>${plan.price}</td>
        <td>${plan.type}</td>
        <td>${plan.billing}</td>
      `;
      tr.addEventListener('click', () => openPlanModal(plan.id));
      plansTableBody.appendChild(tr);
    });
  }

  function openPlanModal(planId) {
    const plan = loadedPlans.find(p => p.id === planId);
    if (!plan) return;
    editingPlanId = plan.id;
    modalTitle.innerText = `Edit Product: ${plan.name}`;
    
    const featuresText = (plan.features || []).join('\n');

    modalContent.innerHTML = `
      <form id="modal-plan-form">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="admin-form-group">
            <label>Product Name</label>
            <input type="text" id="edit-plan-name" class="admin-input" value="${plan.name || ''}" required>
          </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          <div class="admin-form-group">
            <label>Monthly Price</label>
            <input type="number" id="edit-plan-price" class="admin-input" value="${plan.price || 0}" required>
          </div>
          <div class="admin-form-group">
            <label>Yearly Price (Opt)</label>
            <input type="number" id="edit-plan-price-yearly" class="admin-input" value="${plan.price_yearly || ''}">
          </div>
          <div class="admin-form-group">
            <label>Lifetime Price (Opt)</label>
            <input type="number" id="edit-plan-price-lifetime" class="admin-input" value="${plan.price_lifetime || ''}">
          </div>
        </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="admin-form-group">
            <label>Type</label>
            <input type="text" id="edit-plan-type" class="admin-input" value="${plan.type || 'Software'}">
          </div>
          <div class="admin-form-group">
            <label>Billing Cycle</label>
            <select id="edit-plan-billing" class="admin-input">
              <option value="month" ${plan.billing === 'month' ? 'selected' : ''}>Monthly</option>
              <option value="year" ${plan.billing === 'year' ? 'selected' : ''}>Yearly</option>
              <option value="lifetime" ${plan.billing === 'lifetime' ? 'selected' : ''}>Lifetime</option>
            </select>
          </div>
        </div>
        <div class="admin-form-group">
          <label>Product Description</label>
          <input type="text" id="edit-plan-desc" class="admin-input" value="${plan.description || ''}" required>
        </div>
        <div class="admin-form-group">
          <label>Product Features / Specs (One per line)</label>
          <textarea id="edit-plan-features" class="admin-input" rows="5" required>${featuresText}</textarea>
        </div>
        
        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--admin-border); padding-top: 20px; margin-top: 10px;">
          <button type="button" id="delete-plan-btn" class="admin-btn admin-btn-danger">Delete</button>
          <div>
            <button type="button" class="admin-btn" style="background: var(--admin-text-light);" onclick="document.getElementById('admin-modal').style.display='none'">Cancel</button>
            <button type="submit" class="admin-btn" style="margin-left: 10px;">Save Product</button>
          </div>
        </div>
      </form>
    `;

    adminModal.style.display = 'flex';

    document.getElementById('modal-plan-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const pIndex = loadedPlans.findIndex(p => p.id === editingPlanId);
      if (pIndex !== -1) {
        loadedPlans[pIndex].name = document.getElementById('edit-plan-name').value;
        loadedPlans[pIndex].price = parseFloat(document.getElementById('edit-plan-price').value) || 0;
        
        const yearlyVal = document.getElementById('edit-plan-price-yearly').value;
        if (yearlyVal) loadedPlans[pIndex].price_yearly = parseFloat(yearlyVal);
        else delete loadedPlans[pIndex].price_yearly;

        const lifetimeVal = document.getElementById('edit-plan-price-lifetime').value;
        if (lifetimeVal) loadedPlans[pIndex].price_lifetime = parseFloat(lifetimeVal);
        else delete loadedPlans[pIndex].price_lifetime;

        loadedPlans[pIndex].type = document.getElementById('edit-plan-type').value;
        loadedPlans[pIndex].billing = document.getElementById('edit-plan-billing').value;
        loadedPlans[pIndex].description = document.getElementById('edit-plan-desc').value;
        const featuresText = document.getElementById('edit-plan-features').value;
        loadedPlans[pIndex].features = featuresText.split('\n').map(f => f.trim()).filter(f => f);
      }
      
      await saveAllPlans(loadedPlans);
      adminModal.style.display = 'none';
      renderPlansEditor(loadedPlans);
    });

    document.getElementById('delete-plan-btn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this product?')) {
        loadedPlans = loadedPlans.filter(p => p.id !== editingPlanId);
        await saveAllPlans(loadedPlans);
        adminModal.style.display = 'none';
        renderPlansEditor(loadedPlans);
      }
    });
  }

  async function saveAllPlans(plans) {
    try {
      const res = await fetch('/api/admin/plans/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
        },
        body: JSON.stringify(plans)
      });
      if (!res.ok) {
        alert('Failed to update products.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderGalleryEditor(gallery) {
    if (!galleryTableBody) return;
    galleryTableBody.innerHTML = '';

    if (!gallery || gallery.length === 0) {
      galleryTableBody.innerHTML = '<tr><td colspan="3">No gallery images found.</td></tr>';
      return;
    }

    gallery.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--admin-primary);">${item.image || 'N/A'}</td>
        <td>${item.title || 'Untitled'}</td>
        <td>${item.description || ''}</td>
      `;
      tr.addEventListener('click', () => openGalleryModal(item.id));
      galleryTableBody.appendChild(tr);
    });
  }

  function openGalleryModal(galleryId) {
    const isNew = !galleryId;
    let item = currentCmsData.gallery.find(g => g.id === galleryId);
    
    if (isNew) {
      item = { id: 'g' + Date.now(), image: '', title: '', description: '' };
      editingGalleryId = item.id;
      modalTitle.innerText = `Add Gallery Image`;
    } else {
      editingGalleryId = item.id;
      modalTitle.innerText = `Edit Gallery Image: ${item.title}`;
    }
    
    modalContent.innerHTML = `
      <form id="modal-gallery-form">
        <div class="admin-form-group">
          <label>Image URL or Path</label>
          <input type="text" id="edit-gallery-image" class="admin-input" value="${item.image || ''}" required>
          <div style="margin-top: 10px;">
            <label style="font-size: 12px; color: var(--admin-text-light);">Or Upload Image</label>
            <input type="file" id="edit-gallery-file" class="admin-input" accept="image/*" style="padding: 10px; height: auto;">
            <small id="upload-status" style="color: var(--admin-primary); display: block; margin-top: 5px;"></small>
          </div>
        </div>
        <div class="admin-form-group">
          <label>Title</label>
          <input type="text" id="edit-gallery-title" class="admin-input" value="${item.title || ''}" required>
        </div>
        <div class="admin-form-group">
          <label>Description</label>
          <textarea id="edit-gallery-desc" class="admin-input" rows="3" required>${item.description || ''}</textarea>
        </div>
        
        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--admin-border); padding-top: 20px; margin-top: 10px;">
          ${!isNew ? `<button type="button" id="delete-gallery-btn" class="admin-btn admin-btn-danger">Delete</button>` : `<div></div>`}
          <div>
            <button type="button" class="admin-btn" style="background: var(--admin-text-light);" onclick="document.getElementById('admin-modal').style.display='none'">Cancel</button>
            <button type="submit" class="admin-btn" style="margin-left: 10px;">${isNew ? 'Add Image' : 'Save Image'}</button>
          </div>
        </div>
      </form>
    `;

    adminModal.style.display = 'flex';

    // File Upload Handler
    const fileInput = document.getElementById('edit-gallery-file');
    const statusText = document.getElementById('upload-status');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        statusText.innerText = "Uploading...";
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const base64Data = evt.target.result;
          try {
            const res = await fetch('/api/admin/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: file.name, data: base64Data })
            });
            if (res.ok) {
              const result = await res.json();
              document.getElementById('edit-gallery-image').value = result.url;
              statusText.innerText = "Upload successful!";
            } else {
              statusText.innerText = "Upload failed.";
              statusText.style.color = "var(--admin-danger)";
            }
          } catch(err) {
            console.error(err);
            statusText.innerText = "Error uploading.";
            statusText.style.color = "var(--admin-danger)";
          }
        };
        reader.readAsDataURL(file);
      });
    }

    document.getElementById('modal-gallery-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newImage = document.getElementById('edit-gallery-image').value;
      const newTitle = document.getElementById('edit-gallery-title').value;
      const newDesc = document.getElementById('edit-gallery-desc').value;

      if (isNew) {
        currentCmsData.gallery.push({
          id: item.id,
          image: newImage,
          title: newTitle,
          description: newDesc
        });
      } else {
        const gIndex = currentCmsData.gallery.findIndex(g => g.id === editingGalleryId);
        if (gIndex !== -1) {
          currentCmsData.gallery[gIndex].image = newImage;
          currentCmsData.gallery[gIndex].title = newTitle;
          currentCmsData.gallery[gIndex].description = newDesc;
        }
      }
      
      await saveAllGallery(currentCmsData.gallery);
      adminModal.style.display = 'none';
      renderGalleryEditor(currentCmsData.gallery);
    });

    if (!isNew) {
      document.getElementById('delete-gallery-btn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this gallery image?')) {
          currentCmsData.gallery = currentCmsData.gallery.filter(g => g.id !== editingGalleryId);
          await saveAllGallery(currentCmsData.gallery);
          adminModal.style.display = 'none';
          renderGalleryEditor(currentCmsData.gallery);
        }
      });
    }
  }

  async function saveAllGallery(galleryArray) {
    try {
      const content = {
        ...currentCmsData,
        gallery: galleryArray
      };
      
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      if (!res.ok) {
        alert('Failed to update gallery.');
      }
    } catch (err) {
      console.error(err);
    }
  }

});
