document.addEventListener('DOMContentLoaded', () => {

  const authPanel = document.getElementById('auth-panel');
  const dashboardPanel = document.getElementById('dashboard-panel');
  const welcomeHeader = document.getElementById('dashboard-welcome');
  const logoutBtn = document.getElementById('customer-logout-btn');

  let loggedInCustomer = null;
  let availableProducts = [];
  let cart = JSON.parse(localStorage.getItem('crm_cart') || '[]');

  // Forms & Alerts
  const loginForm = document.getElementById('customer-login-form');
  const loginError = document.getElementById('login-error');
  const registerForm = document.getElementById('customer-register-form');
  const registerError = document.getElementById('register-error');
  const registerSuccess = document.getElementById('register-success');

  // Data Containers
  const licensesContainer = document.getElementById('active-licenses-container');
  const paymentsTableBody = document.getElementById('customer-payments-table-body');

  // Check URL params for redirects
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');

  // Check active session on load
  checkSession();

  // Handle Log In submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';

      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetch('/api/customer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // If redirect target is specified, redirect the customer
        if (redirectTarget === 'purchase') {
          const plan = urlParams.get('plan') || '';
          window.location.href = `/purchase.html${plan ? '?plan=' + plan : ''}`;
        } else {
          // Otherwise, reload page to load dashboard
          window.location.reload();
        }
      } catch (err) {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
      }
    });
  }

  // Handle Registration submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      registerError.style.display = 'none';
      registerSuccess.style.display = 'none';

      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      try {
        const response = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        registerSuccess.textContent = data.message;
        registerSuccess.style.display = 'block';
        registerForm.reset();
      } catch (err) {
        registerError.textContent = err.message;
        registerError.style.display = 'block';
      }
    });
  }

  // Handle Log Out
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/customer/logout', { method: 'POST' });
        window.location.href = '/customer.html';
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }

  // --- FUNCTIONS ---

  async function checkSession() {
    try {
      const response = await fetch('/api/customer/session');
      const data = await response.json();

      if (data.authenticated) {
        // Authenticated: Show dashboard, hide login panel
        authPanel.style.display = 'none';
        dashboardPanel.style.display = 'block';
        welcomeHeader.textContent = `Welcome, ${data.customer.name}!`;
        
        loggedInCustomer = data.customer;

        // Pre-fill billing name in cart form if empty
        const billNameInput = document.getElementById('cart-bill-name');
        if (billNameInput && !billNameInput.value) {
          billNameInput.value = data.customer.name;
        }

        // Load customer metrics
        loadCustomerData();
        // Load product catalog
        loadShopProducts();
        // Render current cart state
        renderCart();
      } else {
        // Unauthenticated: Show login panel, hide dashboard
        authPanel.style.display = 'flex';
        dashboardPanel.style.display = 'none';
      }
    } catch (err) {
      console.error('Session validation error:', err);
      authPanel.style.display = 'flex';
      dashboardPanel.style.display = 'none';
    }
  }

  async function loadCustomerData() {
    try {
      const response = await fetch('/api/customer/payments');
      if (!response.ok) throw new Error('Failed to retrieve history');
      const payments = await response.json();

      renderDashboard(payments);
    } catch (err) {
      console.error(err);
      paymentsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--error);">Error retrieving SQL records.</td></tr>`;
    }
  }

  async function loadShopProducts() {
    try {
      const response = await fetch('/api/plans?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to retrieve plans');
      availableProducts = await response.json();
      // Store all products globally so we can access their specific prices
      allProductsCatalog = availableProducts;
      // Filter out individual CRM sub-products from rendering as separate cards
      availableProducts = availableProducts.filter(p => !['crm_hospital', 'crm_sales', 'crm_hotel'].includes(p.id));
      renderShopProducts();
    } catch (err) {
      console.error(err);
      const productShopContainer = document.getElementById('product-shop-container');
      if (productShopContainer) {
        productShopContainer.innerHTML = `<div style="padding: 20px; color: var(--color-error);">Error retrieving SQL plans catalog.</div>`;
      }
    }
  }

  function renderShopProducts() {
    const productShopContainer = document.getElementById('product-shop-container');
    if (!productShopContainer) return;

    if (!availableProducts || availableProducts.length === 0) {
      productShopContainer.innerHTML = `<div style="padding: 20px; color: var(--color-text-light); text-align: center; width: 100%;">No products available in catalog.</div>`;
      return;
    }

    productShopContainer.innerHTML = '';

    availableProducts.forEach(product => {
      const col = document.createElement('div');
      col.className = 'column lg-4 md-6 tab-12';
      col.style.marginBottom = '30px';

      // Build features list
      let featuresHtml = '';
      if (product.features && product.features.length > 0) {
        featuresHtml = `
          <ul style="list-style: none; padding-left: 0; margin-bottom: 25px; font-size: 13px; color: var(--color-text-light);">
            ${product.features.map(f => `
              <li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-cyan); flex-shrink: 0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>
        `;
      }

      col.innerHTML = `
        <div class="checkout-card" style="padding: 30px; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <span class="status-badge" style="background: rgba(67, 186, 255, 0.1); color: var(--primary-cyan); font-size: 11px; padding: 2px 10px; border-radius: 12px; font-weight: 600; text-transform: uppercase;">
                ${product.type || 'Software'}
              </span>
              <span style="font-size: 13px; color: var(--color-text-light); font-family: var(--font-mono);">${product.id}</span>
            </div>
            <h4 style="font-family: var(--font-2); font-size: 22px; color: #fff; margin-top: 0; margin-bottom: 10px;">${product.name}</h4>
            <div id="price-${product.id}" style="font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 15px;">
              ${parseFloat(product.price).toFixed(2)} OMR
              ${product.billing ? `<span style="font-size: 13px; font-weight: normal; color: var(--color-text-light);">/ ${product.billing}</span>` : ''}
            </div>
            <p id="desc-${product.id}" style="color: var(--color-text-light); font-size: 14px; line-height: 1.5; margin-bottom: 20px;">${product.description || ''}</p>
            <div id="features-${product.id}">
              ${featuresHtml}
            </div>
            ${product.id === 'crm' ? `
              <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <select class="crm-type-select" id="type-${product.id}" style="width: 50%; padding: 10px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid var(--color-border); border-radius: 4px;">
                  <option value="crm_hospital" style="background: #1a1a1a; color: #fff;">Hospital CRM</option>
                  <option value="crm_sales" style="background: #1a1a1a; color: #fff;">Sales CRM</option>
                  <option value="crm_hotel" style="background: #1a1a1a; color: #fff;">Hotel CRM</option>
                </select>
                <select class="billing-cycle-select" id="cycle-${product.id}" style="width: 50%; padding: 10px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid var(--color-border); border-radius: 4px;">
                  <!-- Options are populated dynamically via JavaScript -->
                </select>
              </div>
            ` : `<div style="font-size: 13px; color: var(--primary-cyan); margin-bottom: 15px;">Includes 5% OMR Tax</div>`}
          </div>
          <button class="btn btn--stroke u-fullwidth add-to-cart-btn" data-id="${product.id}" style="margin-top: auto; border-color: var(--primary-cyan); color: var(--primary-cyan); margin-bottom: 0;">
            Add to Cart
          </button>
        </div>
      `;

      productShopContainer.appendChild(col);
    });

    // Initialize dynamic CRM pricing dropdowns
    const typeSelect = document.getElementById('type-crm');
    const cycleSelect = document.getElementById('cycle-crm');
    if (typeSelect && cycleSelect) {
      const updateCycleOptions = () => {
        const selectedId = typeSelect.value;
        const subProduct = allProductsCatalog.find(p => p.id === selectedId) || allProductsCatalog.find(p => p.id === 'crm');
        const p = parseFloat(subProduct.price) || 0;
        const py = subProduct.price_yearly ? parseFloat(subProduct.price_yearly) : (p * 12 * 0.8);
        const pl = subProduct.price_lifetime ? parseFloat(subProduct.price_lifetime) : (p * 36);

        // Keep the currently selected billing cycle if possible
        const currentCycle = cycleSelect.value || 'month';
        
        cycleSelect.innerHTML = `
          <option value="month" style="background: #1a1a1a; color: #fff;" ${currentCycle === 'month' ? 'selected' : ''}>Monthly (${(p * 1.05).toFixed(2)} OMR inc VAT)</option>
          <option value="year" style="background: #1a1a1a; color: #fff;" ${currentCycle === 'year' ? 'selected' : ''}>Yearly (${(py * 1.05).toFixed(2)} OMR inc VAT)</option>
          <option value="lifetime" style="background: #1a1a1a; color: #fff;" ${currentCycle === 'lifetime' ? 'selected' : ''}>Lifetime (${(pl * 1.05).toFixed(2)} OMR inc VAT)</option>
        `;

        // Update card price dynamically based on selected billing cycle
        const priceEl = document.getElementById('price-crm');
        if (priceEl) {
          let displayedPrice = p;
          let billingLabel = 'month';
          if (cycleSelect.value === 'year') {
            displayedPrice = py;
            billingLabel = 'year';
          } else if (cycleSelect.value === 'lifetime') {
            displayedPrice = pl;
            billingLabel = 'lifetime';
          }
          priceEl.innerHTML = `
            ${displayedPrice.toFixed(2)} OMR
            <span style="font-size: 13px; font-weight: normal; color: var(--color-text-light);">/ ${billingLabel}</span>
          `;
        }

        // Update card description dynamically
        const descEl = document.getElementById('desc-crm');
        if (descEl) {
          descEl.textContent = subProduct.description || '';
        }

        // Update card features dynamically
        const featuresEl = document.getElementById('features-crm');
        if (featuresEl) {
          if (subProduct.features && subProduct.features.length > 0) {
            featuresEl.innerHTML = `
              <ul style="list-style: none; padding-left: 0; margin-bottom: 25px; font-size: 13px; color: var(--color-text-light);">
                ${subProduct.features.map(f => `
                  <li style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-cyan); flex-shrink: 0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>${f}</span>
                  </li>
                `).join('')}
              </ul>
            `;
          } else {
            featuresEl.innerHTML = '';
          }
        }
      };
      
      // Update once on load, and listen for changes
      updateCycleOptions();
      typeSelect.addEventListener('change', updateCycleOptions);
      cycleSelect.addEventListener('change', updateCycleOptions);
    }

    // Add click event listeners
    productShopContainer.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        addToCart(id);
      });
    });
  }

  function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSummary = document.getElementById('cart-summary');
    const cartTotal = document.getElementById('cart-total');

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<div style="color: var(--color-text-light); text-align: center; padding: 20px 0;">Your cart is empty.</div>`;
      if (cartSummary) cartSummary.style.display = 'none';
      return;
    }

    cartItemsContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
        ${cart.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 15px 20px; border-radius: 16px; border: 1px solid var(--color-border); flex-wrap: wrap; gap: 15px;">
            <div style="min-width: 150px;">
              <span style="font-size: 11px; text-transform: uppercase; color: var(--primary-cyan); font-weight: 600; display: block; margin-bottom: 2px;">${item.type || 'Software'}</span>
              <h5 style="color: #fff; font-family: var(--font-2); font-size: 16px; margin: 0;">${item.name}</h5>
              <span style="font-size: 13px; color: var(--color-text-light);">${parseFloat(item.price).toFixed(2)} OMR</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.2); padding: 5px 12px; border-radius: 20px;">
              <button class="cart-qty-btn decrease-qty" data-id="${item.id}" style="background: none; border: none; color: var(--primary-cyan); cursor: pointer; padding: 0 5px; font-size: 18px; font-weight: bold; line-height: 1;">-</button>
              <span style="color: #fff; font-weight: 600; font-family: var(--font-mono); font-size: 15px; min-width: 20px; text-align: center;">${item.quantity}</span>
              <button class="cart-qty-btn increase-qty" data-id="${item.id}" style="background: none; border: none; color: var(--primary-cyan); cursor: pointer; padding: 0 5px; font-size: 18px; font-weight: bold; line-height: 1;">+</button>
            </div>

            <div style="text-align: right; min-width: 80px;">
              <span style="color: #fff; font-weight: 700; font-family: var(--font-mono); font-size: 16px;">${(item.price * item.quantity).toFixed(2)} OMR</span>
            </div>

            <div>
              <button class="remove-cart-item-btn" data-id="${item.id}" style="background: none; border: none; color: var(--error); cursor: pointer; padding: 5px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Add listeners to cart interactive elements
    cartItemsContainer.querySelectorAll('.decrease-qty').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        updateQuantity(id, -1);
      });
    });

    cartItemsContainer.querySelectorAll('.increase-qty').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        updateQuantity(id, 1);
      });
    });

    cartItemsContainer.querySelectorAll('.remove-cart-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.remove-cart-item-btn');
        if (targetBtn) {
          const id = targetBtn.getAttribute('data-id');
          removeFromCart(id);
        }
      });
    });

    // Calculate total
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.05;
    const total = subtotal + vat;
    
    if (cartTotal) cartTotal.innerHTML = `<span style="font-size: 14px; color: var(--color-text-light); font-weight: normal; margin-right: 10px;">Subtotal: ${subtotal.toFixed(2)} | + 5% VAT: ${vat.toFixed(2)}</span><br>${total.toFixed(2)} OMR`;
    if (cartSummary) cartSummary.style.display = 'block';
  }

  function saveCart() {
    localStorage.setItem('crm_cart', JSON.stringify(cart));
  }

  function addToCart(productId) {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    let finalPrice = product.price;
    let cycleName = '';
    let uniqueSuffix = '';
    
    if (product.id === 'crm') {
      const typeSelect = document.getElementById(`type-${product.id}`);
      const cycleSelect = document.getElementById(`cycle-${product.id}`);
      
      if (cycleSelect && typeSelect) {
        // Find the actual sub-product based on the dropdown selection
        const subProduct = allProductsCatalog.find(p => p.id === typeSelect.value) || product;
        const typeName = subProduct.name || typeSelect.options[typeSelect.selectedIndex].text;
        
        if (cycleSelect.value === 'year') {
          finalPrice = subProduct.price_yearly || (subProduct.price * 12 * 0.8);
          cycleName = ` (${typeName} - Yearly)`;
        } else if (cycleSelect.value === 'lifetime') {
          finalPrice = subProduct.price_lifetime || (subProduct.price * 36);
          cycleName = ` (${typeName} - Lifetime)`;
        } else {
          finalPrice = subProduct.price;
          cycleName = ` (${typeName} - Monthly)`;
        }
        uniqueSuffix = typeSelect.value + cycleSelect.value;
      }
    }

    const uniqueId = product.id + uniqueSuffix;
    const cartItem = cart.find(item => item.id === uniqueId);
    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      cart.push({
        id: uniqueId,
        name: product.name + cycleName,
        price: finalPrice,
        type: product.type || 'Software',
        quantity: 1
      });
    }

    saveCart();
    renderCart();

    // Scroll down to the cart section
    const cartSection = document.getElementById('cart-section');
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== productId);
    }

    saveCart();
    renderCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
  }

  // Handle Checkout Form Submission
  const checkoutForm = document.getElementById('cart-checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let errorDiv = document.getElementById('cart-error');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'cart-error';
        errorDiv.style.cssText = 'background: rgba(239, 68, 68, 0.15); color: var(--color-error); padding: 12px; border-radius: 4px; margin-bottom: 16px; border: 1px solid var(--color-error); font-size: 14px;';
        checkoutForm.insertBefore(errorDiv, checkoutForm.firstChild);
      }
      errorDiv.style.display = 'none';

      if (cart.length === 0) {
        errorDiv.textContent = 'Your cart is empty.';
        errorDiv.style.display = 'block';
        return;
      }

      if (!loggedInCustomer) {
        errorDiv.textContent = 'You must be logged in to checkout.';
        errorDiv.style.display = 'block';
        return;
      }

      const billingName = document.getElementById('cart-bill-name').value;
      const billingPhone = document.getElementById('cart-bill-phone').value;

      const planName = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalAmount = subtotal * 1.05; // Apply 5% VAT

      try {
        const response = await fetch('/api/create-charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: 'cart_' + Date.now(),
            plan_name: planName,
            amount_omr: totalAmount,
            customer_name: billingName,
            customer_email: loggedInCustomer.email,
            customer_phone: billingPhone
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate checkout session.');
        }

        if (data.transactionUrl) {
          window.location.href = data.transactionUrl;
        } else {
          throw new Error('No transaction URL returned by payment gateway.');
        }

      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
      }
    });
  }

  function renderDashboard(payments) {
    // 1. Render Table Log
    if (payments.length === 0) {
      paymentsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No transaction invoices logged yet.</td></tr>`;
      licensesContainer.innerHTML = `
        <div style="padding: 20px; border: 1px dashed var(--border-color); border-radius: 4px; width: 100%; text-align: center; color: var(--text-muted);">
          No active software licenses found. Use the Product Shop below to purchase.
        </div>
      `;
      return;
    }

    paymentsTableBody.innerHTML = '';
    const successfulPlans = [];

    payments.forEach(p => {
      const dateStr = new Date(p.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const isSuccess = p.status === 'SUCCESS';
      if (isSuccess) {
        successfulPlans.push(p);
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 13px;">${p.id}</td>
        <td style="font-weight: 600; color: #fff;">${p.plan_name}</td>
        <td>${parseFloat(p.amount_omr).toFixed(2)} OMR</td>
        <td><span class="status-badge ${p.status.toLowerCase()}">${p.status}</span></td>
        <td>${dateStr}</td>
        <td>
          ${isSuccess 
            ? `<a href="/success.html?charge_id=${p.id}" class="btn" style="padding: 4px 12px; font-size: 12px; background: rgba(67, 186, 255, 0.15); color: var(--primary-cyan); border: 1px solid var(--primary-cyan); margin: 0;">View Invoice</a>`
            : `<span style="color: var(--text-muted); font-size: 13px;">-</span>`
          }
        </td>
      `;
      paymentsTableBody.appendChild(tr);
    });

    // 2. Render Active Subscriptions cards
    if (successfulPlans.length === 0) {
      licensesContainer.innerHTML = `
        <div style="padding: 20px; border: 1px dashed var(--border-color); border-radius: 4px; width: 100%; text-align: center; color: var(--text-muted);">
          No active software licenses found. Use the Product Shop below to purchase.
        </div>
      `;
    } else {
      licensesContainer.innerHTML = '';
      
      // Group multiple keys for the same plan, displaying them as separate licenses
      successfulPlans.forEach(plan => {
        const col = document.createElement('div');
        col.className = 'column lg-4 md-6 tab-12';
        col.style.marginBottom = '20px';

        col.innerHTML = `
          <div class="checkout-card" style="padding: 24px; background: rgba(16, 185, 129, 0.05); border: 1px solid var(--success); height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h4 style="font-family: var(--font-2); font-size: 18px; color: #fff; margin: 0; line-height: 1.3;">${plan.plan_name}</h4>
                <span class="status-badge success" style="font-size: 10px; padding: 2px 8px; flex-shrink: 0;">ACTIVE</span>
              </div>
              <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
                License ID: <span style="font-family: var(--font-mono);">${plan.id}</span>
              </div>
              <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                Active since: ${new Date(plan.created_at).toLocaleDateString()}
              </div>
            </div>
            <a href="/success.html?charge_id=${plan.id}" class="btn btn-secondary" style="width: 100%; padding: 8px; font-size: 13px; text-align: center; margin-top: auto; margin-bottom: 0;">Print Receipt</a>
          </div>
        `;
        licensesContainer.appendChild(col);
      });
    }
  }

});
