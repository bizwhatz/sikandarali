document.addEventListener('DOMContentLoaded', () => {
  
  // Cache pricing plans loaded from backend
  let pricingPlans = [];

  // Determine active page
  const path = window.location.pathname;

  // --- HOME PAGE LOGIC ---
  const pricingContainer = document.getElementById('pricing-plans-container');
  const leadForm = document.getElementById('lead-form');

  if (pricingContainer) {
    loadPricingPlansHome();
  }
  
  fetchCMSContent();

  if (leadForm) {
    leadForm.addEventListener('submit', handleLeadSubmission);
  }

  // --- CHECKOUT PAGE LOGIC ---
  const checkoutForm = document.getElementById('checkout-form');
  const planSelect = document.getElementById('checkout-plan');

  if (planSelect && checkoutForm) {
    loadPricingPlansCheckout();
    checkoutForm.addEventListener('submit', handleCheckoutSubmission);
    planSelect.addEventListener('change', handlePlanChange);
    const billingSelect = document.getElementById('checkout-billing-cycle');
    if (billingSelect) billingSelect.addEventListener('change', handlePlanChange);
  }

  // --- FUNCTIONS ---

  const productIcons = {
    oria: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    pos: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>`,
    erp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>`,
    checkout: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>`,
    crm: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
  };

  function getPlanCategory(planId) {
    if (planId === 'oria' || planId === 'erp') return 'office';
    if (planId === 'pos') return 'restaurant';
    if (planId === 'checkout') return 'retail';
    return 'all';
  }

  function getPlanStatusHtml(planId) {
    if (planId === 'checkout') {
      return `<div style="display: flex; gap: 8px; margin-bottom: 20px; width: 100%; justify-content: center;">
                <span class="status-badge pending" style="color: #3b82f6 !important;">Beta</span>
                <span class="status-badge success" style="background: rgba(255,255,255,0.03) !important; color: #3b82f6 !important; border: 1px solid var(--color-border);">v1.0</span>
              </div>`;
    }
    return `<div style="display: flex; gap: 8px; margin-bottom: 20px; width: 100%; justify-content: center;">
              <span class="status-badge success" style="color: #3b82f6 !important;">Active</span>
              <span class="status-badge success" style="background: rgba(255,255,255,0.03) !important; color: #3b82f6 !important; border: 1px solid var(--color-border);">v1.0</span>
            </div>`;
  }

  // 1. Fetch plans and render on Homepage
  async function loadPricingPlansHome() {
    try {
      const response = await fetch('/api/plans?t=' + Date.now());
      if (!response.ok) throw new Error('Network error');
      let fetchedPlans = await response.json();
      pricingPlans = fetchedPlans.filter(p => !p.id.startsWith('crm_'));
      
      renderPricingCards(pricingPlans);
      setupFilters();
    } catch (err) {
      console.warn('Failed to load SQL pricing plans, using local client fallbacks:', err);
      // Client-side fallback array for offline testing
      let fetchedPlans = getLocalFallbackPlans();
      pricingPlans = fetchedPlans.filter(p => !p.id.startsWith('crm_'));
      renderPricingCards(pricingPlans);
      setupFilters();
    }
  }

  function setupFilters() {
    const searchInput = document.getElementById('product-search');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let currentCategory = 'all';
    let searchQuery = '';

    function applyFilters() {
      const filtered = pricingPlans.filter(plan => {
        const category = getPlanCategory(plan.id);
        const matchesCategory = currentCategory === 'all' || category === currentCategory;
        const matchesSearch = plan.name.toLowerCase().includes(searchQuery) ||
                              plan.description.toLowerCase().includes(searchQuery) ||
                              plan.features.some(f => f.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesSearch;
      });
      renderPricingCards(filtered);
    }

    if (searchInput) {
      searchInput.replaceWith(searchInput.cloneNode(true));
      const newSearchInput = document.getElementById('product-search');
      newSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
      });
    }

    if (filterBtns) {
      filterBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.replaceWith(newBtn);
      });
      const newFilterBtns = document.querySelectorAll('.filter-btn');
      newFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          newFilterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentCategory = btn.getAttribute('data-category');
          applyFilters();
        });
      });
    }
  }

  function renderPricingCards(plans) {
    if (!pricingContainer) return;
    pricingContainer.innerHTML = '';

    plans.forEach(plan => {
      const isPopular = plan.id === 'checkout';
      const card = document.createElement('div');
      card.className = `pricing-card ${isPopular ? 'popular' : ''}`;

      let featuresHtml = '';
      plan.features.forEach(f => {
        featuresHtml += `<li>${f}</li>`;
      });

      card.innerHTML = `
        <div class="feature-icon-wrap" style="color: #3b82f6; margin-bottom: 20px;">
          ${productIcons[plan.id] || ''}
        </div>
        <div class="pricing-plan-name">${plan.name}</div>
        <div class="pricing-price">${plan.price.toFixed(3)} <span>OMR / ${plan.billing}</span></div>
        ${getPlanStatusHtml(plan.id)}
        <p class="pricing-desc">${plan.description}</p>
        <ul class="pricing-features">
          ${plan.features.map(f => `<li style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-light);">${f}</li>`).join('')}
        </ul>
        <div style="display: flex; gap: 10px; justify-content: center; align-items: center; width: 100%;">
          <a href="/product.html?id=${plan.id}" class="btn btn--stroke" style="flex: 1; text-align: center; margin: 0; padding: 0 10px;">Details</a>
        </div>
      `;
      pricingContainer.appendChild(card);
    });
  }

  // 2. Handle Lead contact form submission
  async function handleLeadSubmission(e) {
    e.preventDefault();
    const submitBtn = leadForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Inquiry...';

    const leadData = {
      name: document.getElementById('lead-name').value,
      email: document.getElementById('lead-email').value,
      phone: document.getElementById('lead-phone').value,
      company: document.getElementById('lead-company').value,
      notes: document.getElementById('lead-notes').value,
      status: 'New'
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });

      if (!response.ok) throw new Error('API submission error');

      // Clear Form and show success banner
      leadForm.reset();
      const successBanner = document.getElementById('lead-success-msg');
      successBanner.style.display = 'block';
      successBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
      console.error(err);
      alert('Failed to submit demo request. Please check your network connection.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  // 3. Fetch plans and populate Checkout page
  async function loadPricingPlansCheckout() {
    // Enforce customer login before purchase
    try {
      const sessionRes = await fetch('/api/customer/session');
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        const urlParams = new URLSearchParams(window.location.search);
        const plan = urlParams.get('plan') || 'checkout';
        window.location.href = `/customer.html?redirect=purchase&plan=${plan}`;
        return;
      }

      // Pre-fill and lock credentials
      const nameInput = document.getElementById('checkout-name');
      const emailInput = document.getElementById('checkout-email');
      if (nameInput) {
        nameInput.value = sessionData.customer.name;
        nameInput.readOnly = true;
        nameInput.style.opacity = '0.7';
      }
      if (emailInput) {
        emailInput.value = sessionData.customer.email;
        emailInput.readOnly = true;
        emailInput.style.opacity = '0.7';
      }
    } catch (sessionErr) {
      console.error('Session validation error:', sessionErr);
    }

    try {
      const response = await fetch('/api/plans?t=' + Date.now());
      if (!response.ok) throw new Error('Network error');
      pricingPlans = await response.json();
    } catch (err) {
      console.warn('Fallback loading plans for checkout:', err);
      pricingPlans = getLocalFallbackPlans();
    }

    // Populate dropdown selection
    planSelect.innerHTML = '';
    
    // Add default disabled option
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = 'Select Plan';
    defOpt.disabled = true;
    planSelect.appendChild(defOpt);

    pricingPlans.forEach(plan => {
      const opt = document.createElement('option');
      opt.value = plan.id;
      opt.textContent = `${plan.name} (${plan.price} OMR)`;
      planSelect.appendChild(opt);
    });

    // Check URL parameters for pre-selected plan
    const urlParams = new URLSearchParams(window.location.search);
    const prePlan = urlParams.get('plan');

    if (prePlan && pricingPlans.some(p => p.id === prePlan)) {
      planSelect.value = prePlan;
    } else {
      // Default select checkout
      planSelect.value = 'checkout';
    }

    // Trigger update calculation manually
    handlePlanChange();
  }

  // 4. Update Summary calculations on plan change
  function handlePlanChange() {
    const selectedId = planSelect.value;
    const plan = pricingPlans.find(p => p.id === selectedId);
    if (!plan) return;

    let basePrice = parseFloat(plan.price);
    
    const billingContainer = document.getElementById('crm-billing-container');
    const billingSelect = document.getElementById('checkout-billing-cycle');
    let contractTerm = "Monthly Recurring";
    
    if (selectedId === 'crm') {
      billingContainer.style.display = 'block';
      const cycle = billingSelect.value;
      if (cycle === 'year') {
        basePrice = basePrice * 12 * 0.8; // 20% discount
        contractTerm = "Yearly Recurring";
      } else if (cycle === 'lifetime') {
        basePrice = basePrice * 36; // 3 years equivalent
        contractTerm = "Lifetime Access";
      }
    } else {
      billingContainer.style.display = 'none';
      contractTerm = plan.billing === 'month' ? "Monthly Recurring" : "Yearly Recurring";
    }

    const vat = basePrice * 0.05; // 5% VAT Oman
    const total = basePrice * 1.05;

    // Update receipt summary fields
    document.getElementById('summary-plan-name').textContent = plan.name + ' License';
    document.getElementById('summary-plan-desc').textContent = plan.description;
    document.getElementById('summary-plan-price').textContent = basePrice.toFixed(3) + ' OMR';
    // Update the contract term in the DOM (assuming it's the element before the VAT row)
    const termElement = document.getElementById('summary-vat').parentElement.previousElementSibling.children[1];
    if (termElement) termElement.textContent = contractTerm;
    document.getElementById('summary-vat').textContent = vat.toFixed(3) + ' OMR';
    document.getElementById('summary-total').textContent = total.toFixed(3) + ' OMR';
  }

  // 5. Submit Checkout form and redirect
  async function handleCheckoutSubmission(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('checkout-submit-btn');
    const originalText = submitBtn.innerHTML;
    const errorBanner = document.getElementById('checkout-error-msg');

    errorBanner.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Redirecting to Payment Gateway...</span>';

    const payload = {
      plan_id: planSelect.value,
      billing_cycle: planSelect.value === 'crm' ? document.getElementById('checkout-billing-cycle').value : 'month',
      customer_name: document.getElementById('checkout-name').value,
      customer_email: document.getElementById('checkout-email').value,
      customer_phone: document.getElementById('checkout-phone').value
    };

    try {
      const response = await fetch('/api/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error during payment creation');
      }

      // Redirect user to the Tap payments transaction URL (sandbox or production)
      window.location.href = data.transactionUrl;

    } catch (err) {
      console.error(err);
      errorBanner.textContent = `Checkout Error: ${err.message}`;
      errorBanner.style.display = 'block';
      errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  // Fallback Pricing Plan definition
  function getLocalFallbackPlans() {
    return [
      {
        id: 'oria',
        name: 'Sikandar ORIA',
        price: 199,
        billing: 'month',
        description: 'Unify voice, chat, and multilingual interactions while turning every conversation into actionable intelligence.',
        features: ['Voice & Chat Unification', 'Multilingual Support', 'Conversational AI Insights', 'Sentiment Analysis']
      },
      {
        id: 'pos',
        name: 'Restaurant POS',
        price: 99,
        billing: 'month',
        description: 'Comprehensive ERP restaurant point-of-sale system, expanding our offerings in the hospitality sector.',
        features: ['Table & Order Management', 'KOT System', 'Sales Dashboards', 'Multi-terminal Sync']
      },
      {
        id: 'erp',
        name: 'Sikandar ERP',
        price: 299,
        billing: 'month',
        description: 'All-in-one ERP Solution, delivering flexibility, control, and scalability for businesses across every industry.',
        features: ['Inventory Control', 'Financials & VAT', 'Purchase & Sales Orders', 'HR & Payroll']
      },
      {
        id: 'checkout',
        name: 'Self Checkout',
        price: 149,
        billing: 'month',
        description: 'Innovative self-checkout solution designed to address billing issues in retail stores by enabling customers to scan barcodes and pay online.',
        features: ['Barcode Scanning', 'Instant Web Checkout', 'Tap Payments Integration', 'Queue Analytics']
      },
      {
        id: 'crm',
        name: 'Sikandar CRM Suite',
        price: 199,
        billing: 'month',
        description: 'Comprehensive CRM solution with specialized modules for Hospital, Sales, and Hotel management.',
        features: ['Hospital CRM Module', 'Sales & Lead Tracking', 'Hotel Booking & Guest CRM', 'Unified Analytics Dashboard']
      }
    ];
  }

  async function fetchCMSContent() {
    try {
      const response = await fetch('/api/content');
      if (response.ok) {
        const content = await response.json();
        
        // Update Hero
        const heroTitle = document.getElementById('cms-hero-title');
        const heroSubtitle = document.getElementById('cms-hero-subtitle');
        const heroDesc = document.getElementById('cms-hero-desc');
        if (heroTitle) heroTitle.innerHTML = content.hero.title;
        if (heroSubtitle) heroSubtitle.innerText = content.hero.subtitle;
        if (heroDesc) heroDesc.innerText = content.hero.description;

        // Update About
        const aboutTitle = document.getElementById('cms-about-title');
        const aboutDesc = document.getElementById('cms-about-desc');
        const aboutContent = document.getElementById('cms-about-content');
        if (aboutTitle) aboutTitle.innerText = content.about.title;
        if (aboutDesc) aboutDesc.innerText = content.about.description;
        if (aboutContent) aboutContent.innerText = content.about.content;

      }
    } catch (err) {
      console.error('Failed to load CMS content:', err);
    }
  }

});
