const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Hashing helper
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

let mysql = null;
let pool = null;
let useMysql = false;

// Fallback JSON DB Configuration
const JSON_DB_PATH = path.join(__dirname, 'database_fallback.json');

const defaultPlans = [
  {
    id: 'oria',
    name: 'Sikandar ORIA',
    price: 199,
    billing: 'month',
    type: 'Software',
    description: 'Unify voice, chat, and multilingual interactions while turning every conversation into actionable intelligence.',
    features: [
      'Voice & Chat Unification',
      'Multilingual Support',
      'Conversational AI Insights',
      'Real-time Sentiment Analysis',
      'CRM/ERP Native Connectors'
    ]
  },
  {
    id: 'pos',
    name: 'Restaurant POS',
    price: 99,
    billing: 'month',
    type: 'Software',
    description: 'Comprehensive ERP restaurant point-of-sale system, expanding our offerings in the hospitality sector.',
    features: [
      'Table & Order Management',
      'KOT (Kitchen Order Ticket) System',
      'Real-time Sales Dashboards',
      'Multi-terminal Sync',
      'Loyalty & Promotions'
    ]
  },
  {
    id: 'erp',
    name: 'Sikandar ERP',
    price: 299,
    billing: 'month',
    type: 'Software',
    description: 'All-in-one ERP Solution, delivering flexibility, control, and scalability for businesses across every industry.',
    features: [
      'Inventory & Warehouse Control',
      'Financial Accounting & VAT',
      'Purchase & Sales Orders',
      'HR & Payroll Management',
      'Custom Reports & Auditing'
    ]
  },
  {
    id: 'checkout',
    name: 'Self Checkout',
    price: 149,
    billing: 'month',
    type: 'Software',
    description: 'Innovative self-checkout solution designed to address billing issues in retail stores by enabling customers to scan barcodes and pay online.',
    features: [
      'Barcode Scanning',
      'Instant Web Checkout',
      'Tap Payments Integration',
      'Real-time Billing Dashboard',
      'Queue Reduction Analytics'
    ]
  },
  {
    id: 'crm',
    name: 'Sikandar CRM Suite',
    price: 99,
    billing: 'month',
    type: 'Software',
    description: 'Comprehensive CRM solutions for Sales, Hotels, and Hospitals, offering flexible pricing options to fit your scale.',
    features: [
      'Hospital CRM Management',
      'Sales Pipeline Tracking',
      'Hotel Booking Integration',
      'Monthly, Yearly, Lifetime Access',
      'Advanced Reporting & Dashboards'
    ]
  },
  {
    id: 'crm_hospital',
    name: 'Hospital CRM',
    price: 99,
    price_yearly: 950,
    price_lifetime: 3564,
    billing: 'month',
    type: 'Software',
    description: 'Transform patient care and clinic administration with our secure Hospital CRM. Designed to streamline patient communication, manage appointments, and track interactions seamlessly while reducing no-shows with automated reminders.',
    features: [
      'Patient Relationship Tracking',
      'Automated Appointment Scheduling',
      'Medical Records Integration',
      'Automated SMS/Email Reminders',
      'Secure Patient Portal',
      'Doctor & Staff Scheduling'
    ]
  },
  {
    id: 'crm_sales',
    name: 'Sales CRM',
    price: 99,
    price_yearly: 950,
    price_lifetime: 3564,
    billing: 'month',
    type: 'Software',
    description: 'Empower your sales teams with a centralized hub to track every interaction. From the first touchpoint to closing the deal, our Sales CRM provides deep insights, automated workflows, and robust pipeline management to ensure no opportunity falls through the cracks.',
    features: [
      'Lead & Pipeline Management',
      'Automated Follow-ups & Reminders',
      'Sales Forecasting & Reporting',
      'Email Tracking & Integration',
      'Customizable Dashboards',
      'Team Performance Analytics'
    ]
  },
  {
    id: 'crm_hotel',
    name: 'Hotel CRM',
    price: 99,
    price_yearly: 950,
    price_lifetime: 3564,
    billing: 'month',
    type: 'Software',
    description: 'Deliver exceptional and personalized guest experiences with our specialized Hotel CRM. Seamlessly integrating with your booking systems, it provides a 360-degree view of your guests\' preferences, booking history, and loyalty status.',
    features: [
      'Guest Profile & History',
      'Booking System Integration',
      'Loyalty Program Management',
      'Personalized Offers & Upselling',
      'Automated Guest Communication',
      'Feedback & Review Management'
    ]
  }
];

const defaultWebsiteContent = {
  hero: {
    title: "Building the Future of Technology",
    subtitle: "Through Innovation",
    description: "We deliver cutting-edge technology solutions that empower businesses to thrive in the digital age through innovation and intelligent automation."
  },
  about: {
    title: "About Us",
    description: "Sikandar Ali Trading is your go-to partner for a wide spectrum of digital services and solutions.",
    content: "What began as a passionate idea shared over a cup of chai by two friends in their twenties has grown into a forward-thinking company with a clear eye on the future of digital innovation. Our vision is firmly aligned with the next wave of digital transformation, and our mission is to build and deliver cutting-edge digital products tailored for the needs of tomorrow. We are also well-prepared to embrace emerging opportunities in artificial intelligence and machine learning."
  },
  contact: {
    email: "sales@sikandaralitrading.com",
    phone: "+968 2456 7890",
    address: "Muscat, Oman"
  },
  media: [
    {
      id: "01",
      tag: "Media Coverage",
      isFeatured: true,
      title: "Sikandar Featured in Asianet News - Self-Checkout Innovation",
      description: "Sikandar's revolutionary self-checkout solution has been featured in Asianet News, highlighting the company's innovative approach to solving billing issues in retail stores through AI-powered technology.",
      publisher: "Asianet News",
      link: "https://www.youtube.com/watch?v=wuMuA4ltQ6U",
      linkText: "Watch Video"
    },
    {
      id: "02",
      tag: "Startup News",
      isFeatured: true,
      title: "KSUM Incubating Firm Launches Sikandar Checkout Solution for Billing Issues",
      description: "Sikandar, a KSUM-incubated startup, has launched its innovative self-checkout solution designed to address billing issues in retail stores. The solution enables customers to scan products and pay online, reducing queue times and improving customer experience.",
      publisher: "UNI India",
      link: "https://www.uniindia.com/ksum-incubating-firm-launches-oravco-checkout-solution-for-billing-issues/business-economy/news/3163966.html",
      linkText: "Read Article"
    },
    {
      id: "03",
      tag: "Funding",
      isFeatured: false,
      title: "Sikandar Secures Seed Funding to Accelerate Self-Checkout Innovation",
      description: "Sikandar Ali Trading has successfully secured seed funding to accelerate the development and deployment of its revolutionary self-checkout solution. This funding will support the company's expansion plans and technology innovation initiatives.",
      publisher: "Sikandar Press Release",
      link: "#0",
      linkText: "Read Release",
      disabled: true
    },
    {
      id: "04",
      tag: "Product Launch",
      isFeatured: false,
      title: "Sikandar Launches Revolutionary Self-Checkout Solution for Billing Issues",
      description: "IT solutions provider Sikandar Ali Trading has launched a facility that helps shop-owners avoid possible difficulties at the billing counter by enabling customers themselves to scan the product's barcode and pay online.",
      publisher: "The Hindu Businessline",
      link: "https://www.thehindubusinessline.com/info-tech/oravco-launches-checkout-solution-for-billing-issues/article67967370.ece",
      linkText: "Read Article"
    },
    {
      id: "05",
      tag: "Technology Innovation",
      isFeatured: false,
      title: "AI-Powered Self-Checkout System Transforms Retail Experience",
      description: "The 'Sikandar self-checkout' uses state-of-the-art technologies such as AI and computer vision, enabling customers to bypass long queues for payment while ensuring security and convenience.",
      publisher: "The Hindu Businessline",
      link: "https://www.thehindubusinessline.com/info-tech/oravco-launches-checkout-solution-for-billing-issues/article67967370.ece",
      linkText: "Read Article"
    },
    {
      id: "06",
      tag: "Global Expansion",
      isFeatured: false,
      title: "Sikandar Announces GCC Countries Expansion Plans",
      description: "\"The service not only saves time but also enhances the shopping experience. Soon, we will be launching the solution in GCC countries and others,\" said Anas Saidmohamed, CEO of Sikandar.",
      publisher: "The Hindu Businessline",
      link: "https://www.thehindubusinessline.com/info-tech/oravco-launches-checkout-solution-for-billing-issues/article67967370.ece",
      linkText: "Read Article"
    },
    {
      id: "08",
      tag: "Technology",
      isFeatured: false,
      title: "How Tap Payments is Empowering the New Wave of Digital Startups",
      description: "Tap Payments partners with innovative companies to simplify online transactions and enhance seamless customer experiences across the MENA region.",
      publisher: "TechCrunch MENA",
      link: "#0",
      linkText: "Read Article",
      disabled: true
    }
  ],
  gallery: [
    {
      id: "g1",
      image: "images/erp_crm_dashboard.png",
      title: "ERP & CRM Dashboard",
      description: "Sikandar's elegant, high-performance dark mode Enterprise Resource Planning and CRM interface."
    },
    {
      id: "g2",
      image: "images/product_dashboard.png",
      title: "Product Analytics Suite",
      description: "A modern, clean SaaS product dashboard designed for comprehensive sales and inventory tracking."
    },
    {
      id: "g3",
      image: "images/self_checkout_kiosk.png",
      title: "Self-Checkout Kiosk",
      description: "Our futuristic, vertical touchscreen self-checkout interface designed to eliminate retail queues."
    },
    {
      id: "g4",
      image: "images/pos_system_ui.png",
      title: "Cloud POS System",
      description: "A beautiful, vibrant Point of Sale software interface tailored for quick and easy retail operations."
    }
  ]
};

const defaultProductPages = {
  oria: {
    hero: {
      title: "Sikandar ORIA",
      subtitle: "Conversational Intelligence Platform",
      description: "Automate communication, improve efficiency, and gain actionable insights from every conversation.",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080&q=80",
      paragraph: "ORIA is an AI-powered Conversational Intelligence Platform that unifies voice calls, chat, email, messaging, and multilingual interactions into a single platform. It is designed for businesses to automate customer communication, improve operational efficiency, and gain actionable insights from every conversation."
    },
    coreProducts: [
      { title: "1. Oria Voice", subtitle: "AI-powered cloud calling solution.", features: ["AI call transcription", "Intelligent call routing", "Call analytics", "Sentiment analysis", "Cloud telephony & Voice AI automation"] },
      { title: "2. Oria Chat", subtitle: "Unified messaging platform.", features: ["Live chat & AI chatbot", "Omnichannel messaging", "Social media & Web chat integration", "Automated customer responses"] },
      { title: "3. Oria Flow", subtitle: "Visual automation platform.", features: ["Drag-and-drop workflow builder", "Customer journey automation", "Conversation routing", "Ready-made templates & Business workflow automation"] },
      { title: "4. Oria Insights", subtitle: "Business intelligence platform.", features: ["Real-time dashboards & Custom reports", "AI-powered predictive analytics", "KPI monitoring", "Conversation analytics & Performance tracking"] }
    ],
    platformFeatures: [
      { title: "Omnichannel Communication", subtitle: "Manage conversations across all channels from one platform.", tags: ["Voice Calls", "WhatsApp", "Live Chat", "SMS", "Email", "Social Messaging", "Video"] },
      { title: "Multilingual AI", subtitle: "Suitable for global customer support.", features: ["100+ Languages supported", "Real-time translation & transcription", "Automatic language detection"] },
      { title: "AI-Powered Intelligence", subtitle: "", features: ["AI Agents & AI Transcription", "Sentiment Analysis & Conversation Intelligence", "Intelligent Routing & Automated Responses", "Predictive Analytics"] },
      { title: "Analytics & Automation", subtitle: "", features: ["Live dashboards & Agent performance tracking", "Automatic customer replies & Smart routing", "Intelligent lead qualification", "Workflow & Appointment automation"] }
    ],
    businessAdvantages: [
      { title: "1. One Unified Platform", description: "Instead of using multiple systems for voice, WhatsApp, email, and chat, businesses can manage everything from one dashboard." },
      { title: "2. 24/7 Customer Support", description: "AI agents remain available around the clock without requiring human intervention." },
      { title: "3. Reduced Operational Costs", description: "Automation reduces manual workloads, lowers staffing requirements for repetitive tasks, and improves efficiency." },
      { title: "4. Faster Customer Response", description: "Instant replies, smart routing, reduced waiting times, and better first-call resolution." },
      { title: "5. Better Customer Experience", description: "Multilingual conversations, personalized interactions, faster issue resolution, and consistent support across channels." },
      { title: "6. Higher Sales Conversion", description: "Qualify leads, route high-intent customers, automate follow-ups, and improve response speed." },
      { title: "7. Actionable Business Intelligence", description: "Measure customer sentiment, track agent performance, identify trends, and improve business decisions from generated data." },
      { title: "8. Enterprise Scalability", description: "Designed for businesses handling high conversation volumes with multiple AI agents, enterprise-grade reliability, and multi-location support." }
    ],
    useCases: ["Customer Support", "Sales & Lead Qualification", "Enterprise Helpdesks", "Business Operations", "Public Services", "Contact Centers", "Customer Service Automation"],
    keyBenefits: [
      { category: "Communication", benefit: "Voice, Chat, Email, WhatsApp, SMS, Social Messaging" },
      { category: "Languages", benefit: "100+ languages with real-time translation" },
      { category: "AI", benefit: "AI agents, transcription, sentiment analysis, intelligent routing" },
      { category: "Analytics", benefit: "Dashboards, KPIs, predictive insights, custom reports" },
      { category: "Automation", benefit: "Workflow automation, auto replies, lead qualification" },
      { category: "Productivity", benefit: "Faster response times, reduced manual work" },
      { category: "Customer Experience", benefit: "Omnichannel support and multilingual service" },
      { category: "Business Intelligence", benefit: "Conversation analytics and actionable insights" },
      { category: "Scalability", benefit: "Multiple AI agents and enterprise-ready deployment" }
    ]
  },
  pos: {
    hero: {
      title: "Sikandar Restaurant POS",
      subtitle: "Cloud-Based Restaurant Management",
      description: "Simplify restaurant operations, improve efficiency, and deliver better customer experiences.",
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1080&q=80",
      paragraph: "Sikandar Restaurant POS is a cloud-based restaurant management and Point of Sale (POS) solution designed to simplify restaurant operations. It combines billing, order management, inventory tracking, kitchen operations, customer management, and business analytics into a single platform."
    },
    coreProducts: [
      { title: "1. Smart POS Billing", subtitle: "", features: ["Fast billing and checkout", "GST-compliant invoicing", "Barcode support", "Multiple payment methods", "Split billing", "Discount and coupon management"] },
      { title: "2. Order Management", subtitle: "", features: ["Dine-in order management", "Takeaway orders", "Delivery order processing", "Table management", "Order tracking", "Kitchen order routing"] },
      { title: "3. Kitchen Display System (KDS)", subtitle: "", features: ["Digital kitchen tickets", "Real-time order updates", "Kitchen workflow management", "Order priority management", "Reduced preparation errors"] },
      { title: "4. Inventory Management", subtitle: "", features: ["Real-time stock monitoring", "Ingredient tracking", "Purchase management", "Low-stock alerts", "Waste & Vendor management"] },
      { title: "5. Customer Management (CRM)", subtitle: "", features: ["Customer profiles", "Order history", "Loyalty programs & Reward points", "Personalized offers", "Customer feedback management"] },
      { title: "6. Employee Management", subtitle: "", features: ["Staff login", "Role-based permissions", "Attendance tracking", "Shift management", "Sales performance monitoring"] },
      { title: "7. Reporting & Analytics", subtitle: "", features: ["Daily sales & Revenue analysis", "Product performance", "Inventory & Customer analytics", "Profit and loss reports", "Business dashboards"] }
    ],
    platformFeatures: [
      { title: "Cloud-Based POS", subtitle: "", features: ["Access from anywhere", "Secure cloud storage", "Automatic data backup", "Real-time synchronization across devices"] },
      { title: "Multi-Device Support", subtitle: "", tags: ["Desktop POS", "Tablets", "Mobile devices", "Receipt printers", "Barcode scanners", "Kitchen display systems"] },
      { title: "Payment Integration", subtitle: "", tags: ["Cash", "Credit/Debit Cards", "UPI", "QR Code Payments", "Digital Wallets"] },
      { title: "Business Automation", subtitle: "", features: ["Automatic billing & Tax calculation", "Stock deduction after each sale", "Daily closing reports", "Sales summaries & Purchase automation"] },
      { title: "Multi-Outlet Management", subtitle: "", features: ["Centralized control", "Branch-wise reporting", "Outlet performance comparison", "Central inventory visibility", "Standardized menu management"] }
    ],
    businessAdvantages: [
      { title: "1. Faster Billing", description: "Reduces checkout time with quick order processing and streamlined payment handling." },
      { title: "2. Improved Operations", description: "Automates daily workflows, reducing manual effort and minimizing operational errors." },
      { title: "3. Better Inventory Control", description: "Tracks ingredient consumption and stock levels in real time, helping reduce wastage and prevent stock shortages." },
      { title: "4. Enhanced Customer Experience", description: "Provides faster service, accurate billing, loyalty programs, and personalized customer engagement." },
      { title: "5. Data-Driven Decision Making", description: "Real-time reports and analytics enable restaurant owners to monitor sales, identify trends, and improve profitability." },
      { title: "6. Multi-Branch Scalability", description: "Supports centralized management of multiple restaurant locations with unified reporting and inventory oversight." },
      { title: "7. Increased Productivity", description: "Digital order management, automated workflows, and role-based access help staff work more efficiently." },
      { title: "8. Secure Cloud Access", description: "Business data is securely stored in the cloud with automatic backups and remote accessibility." }
    ],
    useCases: ["Restaurants", "Cafés", "Coffee Shops", "Fast Food Outlets", "Fine Dining", "Cloud Kitchens", "Food Courts", "Bakeries", "Juice Bars", "Multi-Outlet Chains"],
    keyBenefits: [
      { category: "Billing", benefit: "Fast billing, GST invoices, multiple payment options" },
      { category: "Orders", benefit: "Dine-in, takeaway, delivery, table management" },
      { category: "Kitchen", benefit: "Kitchen display system, digital order routing" },
      { category: "Inventory", benefit: "Real-time stock, ingredient tracking, purchase management" },
      { category: "Customers", benefit: "CRM, loyalty programs, customer history" },
      { category: "Staff", benefit: "Employee management, shift scheduling, permissions" },
      { category: "Analytics", benefit: "Sales reports, dashboards, profit analysis" },
      { category: "Cloud", benefit: "Secure access, backups, multi-device synchronization" },
      { category: "Scalability", benefit: "Multi-branch management and centralized reporting" },
      { category: "Automation", benefit: "Billing, tax calculation, inventory updates, reporting" }
    ]
  },
  erp: {
    hero: {
      title: "Sikandar ERP",
      subtitle: "Enterprise Resource Planning",
      description: "All-in-one ERP Solution, delivering flexibility, control, and scalability for businesses across every industry.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&q=80",
      paragraph: "Sikandar ERP integrates your core business processes into one comprehensive system, enabling real-time visibility, automated workflows, and data-driven decision-making to accelerate your enterprise growth."
    },
    coreProducts: [
      { title: "1. Financial Management", subtitle: "Complete financial control", features: ["General ledger", "Accounts payable & receivable", "Financial Accounting & VAT", "Multi-currency support"] },
      { title: "2. Supply Chain & Inventory", subtitle: "Optimize logistics", features: ["Inventory & Warehouse Control", "Purchase & Sales Orders", "Demand forecasting", "Supplier management"] },
      { title: "3. HR & Payroll", subtitle: "Manage your workforce", features: ["HR & Payroll Management", "Employee self-service", "Time and attendance tracking", "Performance evaluations"] },
      { title: "4. Business Intelligence", subtitle: "Actionable insights", features: ["Custom Reports & Auditing", "Real-time dashboards", "KPI monitoring", "Predictive analytics"] }
    ],
    platformFeatures: [
      { title: "Cloud ERP", subtitle: "Secure and accessible", features: ["Access from anywhere", "Bank-grade security", "Automated backups"] },
      { title: "Modular Architecture", subtitle: "Grow at your own pace", features: ["Add modules as needed", "Seamless integration", "Customizable workflows"] }
    ],
    businessAdvantages: [
      { title: "1. Unified Data", description: "Eliminate data silos and gain a single source of truth across your entire organization." },
      { title: "2. Operational Efficiency", description: "Automate repetitive tasks and streamline workflows to save time and reduce errors." },
      { title: "3. Scalability", description: "Easily expand your operations and adapt the system to handle increased transaction volumes." }
    ],
    useCases: ["Manufacturing", "Retail", "Distribution", "Healthcare", "Professional Services"],
    keyBenefits: [
      { category: "Finance", benefit: "Accurate reporting and automated compliance" },
      { category: "Operations", benefit: "Streamlined processes and reduced overhead" },
      { category: "HR", benefit: "Enhanced employee engagement and simplified payroll" }
    ]
  },
  checkout: {
    hero: {
      title: "Self Checkout Kiosk",
      subtitle: "Innovative Retail Experience",
      description: "Innovative self-checkout solution designed to address billing issues in retail stores by enabling customers to scan barcodes and pay online.",
      image: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1080&q=80",
      paragraph: "Our Self Checkout software empowers your customers to take control of their shopping experience, reducing queue times, lowering operational costs, and providing a modern, frictionless payment journey."
    },
    coreProducts: [
      { title: "1. Customer Interface", subtitle: "Intuitive touch experience", features: ["Barcode Scanning", "Instant Web Checkout", "Multi-language support", "Accessibility features"] },
      { title: "2. Payment Processing", subtitle: "Secure transactions", features: ["Tap Payments Integration", "Credit/Debit Cards", "Mobile wallets", "Digital receipts"] },
      { title: "3. Store Management", subtitle: "Real-time oversight", features: ["Real-time Billing Dashboard", "Queue Reduction Analytics", "Remote terminal monitoring", "Exception handling alerts"] }
    ],
    platformFeatures: [
      { title: "Seamless Integration", subtitle: "Works with your existing systems", features: ["Connects to Sikandar POS", "Syncs with Inventory & Warehouse", "CRM integration for loyalty"] },
      { title: "Hardware Agnostic", subtitle: "Deploy anywhere", features: ["Supports standard touchscreens", "Compatible with various barcode scanners", "Works with multiple receipt printers"] }
    ],
    businessAdvantages: [
      { title: "1. Reduce Wait Times", description: "Dramatically decrease checkout queues during peak hours." },
      { title: "2. Lower Labor Costs", description: "Reallocate staff from cashier duties to customer service and store floor management." },
      { title: "3. Modern Experience", description: "Appeal to tech-savvy customers who prefer fast, self-guided interactions." }
    ],
    useCases: ["Supermarkets", "Convenience Stores", "Fashion Retail", "Electronics Stores"],
    keyBenefits: [
      { category: "Customer Satisfaction", benefit: "Faster checkout, less waiting" },
      { category: "Efficiency", benefit: "Higher throughput per square foot" },
      { category: "Sales", benefit: "Integrated upselling and loyalty prompts" }
    ]
  },
  crm: {
    hero: {
      title: "Sikandar CRM Suite",
      subtitle: "Tailored Customer Relationship Management",
      description: "A comprehensive CRM platform with specialized editions for Sales, Hotels, and Hospitals.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&q=80",
      paragraph: "Sikandar CRM Suite brings customer data, communications, and insights into one central hub. Whether you're tracking leads in sales, managing guests in a hotel, or coordinating patient data in a hospital, our customized CRM solutions provide the ultimate digital workspace."
    },
    coreProducts: [
      { 
        title: "1. Sales CRM", 
        subtitle: "Supercharge your pipeline", 
        description: "Empower your sales teams with a centralized hub to track every interaction. From the first touchpoint to closing the deal, our Sales CRM provides deep insights, automated workflows, and robust pipeline management to ensure no opportunity falls through the cracks.",
        features: ["Lead & Pipeline Management", "Automated Follow-ups & Reminders", "Sales Forecasting & Reporting", "Email Tracking & Integration", "Customizable Dashboards", "Team Performance Analytics"] 
      },
      { 
        title: "2. Hotel CRM", 
        subtitle: "Elevate guest experiences", 
        description: "Deliver exceptional and personalized guest experiences with our specialized Hotel CRM. Seamlessly integrating with your booking systems, it provides a 360-degree view of your guests' preferences, booking history, and loyalty status.",
        features: ["Guest Profile & History", "Booking System Integration", "Loyalty Program Management", "Personalized Offers & Upselling", "Automated Guest Communication", "Feedback & Review Management"] 
      },
      { 
        title: "3. Hospital CRM", 
        subtitle: "Streamlined patient care", 
        description: "Transform patient care and clinic administration with our secure Hospital CRM. Designed to streamline patient communication, manage appointments, and track interactions seamlessly while reducing no-shows with automated reminders.",
        features: ["Patient Relationship Tracking", "Automated Appointment Scheduling", "Medical Records Integration", "Automated SMS/Email Reminders", "Secure Patient Portal", "Doctor & Staff Scheduling"] 
      }
    ],
    platformFeatures: [
      { title: "Flexible Pricing", subtitle: "Choose what works for you", features: ["Monthly Subscriptions", "Yearly Subscriptions (Save 20%)", "Lifetime Deals (Pay Once, Own Forever)"] },
      { title: "Omnichannel Communication", subtitle: "Reach them anywhere", tags: ["Email", "SMS", "WhatsApp", "Voice Calling"] }
    ],
    businessAdvantages: [
      { title: "1. Specialized Workflows", description: "Unlike generic CRMs, our suite has specialized workflows built specifically for the unique needs of sales teams, hoteliers, and healthcare providers." },
      { title: "2. Cost Effective Scaling", description: "With our flexible billing cycles, you can start on a monthly plan and upgrade to a lifetime license as your business matures." },
      { title: "3. High Data Security", description: "Enterprise-grade encryption ensures that your sensitive sales data, patient information, or guest profiles remain completely secure." }
    ],
    useCases: ["Hospitals & Clinics", "Hotels & Resorts", "B2B Sales Teams", "Real Estate Agencies", "Travel Agencies"],
    keyBenefits: [
      { category: "Sales", benefit: "Higher conversion rates and shorter sales cycles" },
      { category: "Hospitality", benefit: "Increased repeat bookings and guest satisfaction" },
      { category: "Healthcare", benefit: "Reduced no-shows and better patient communication" },
      { category: "Value", benefit: "Monthly, Yearly, and Lifetime pricing tiers" }
    ]
  }
};

// Helper to query MySQL (Promise-based)
function executeQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Helper to recursively copy directories synchronously
function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

// Initialize Database
async function init() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const dbName = process.env.DB_NAME || 'sikandar_crm';

  const defaultAdminUsername = process.env.ADMIN_USERNAME || 'admin';
  const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const adminHash = hashPassword(defaultAdminPassword, adminSalt);

  // Auto copy generated CRM image to public directory
  const srcImg = 'C:\\Users\\THE DESIGN SHOP\\.gemini\\antigravity-ide\\brain\\dbf38496-aed0-4cdc-a7ed-e12bae88a805\\crm_dashboard_1782115392827.png';
  const destImg = path.join(__dirname, 'public', 'crm_dashboard.png');
  if (fs.existsSync(srcImg) && !fs.existsSync(destImg)) {
    try {
      fs.copyFileSync(srcImg, destImg);
      console.log('SQL Database: Copied crm_dashboard.png to public assets.');
    } catch (copyErr) {
      console.error('Failed to copy CRM image:', copyErr.message);
    }
  }

  // Copy AI generated dashboards
  const aiErpImg = 'C:\\Users\\THE DESIGN SHOP\\.gemini\\antigravity-ide\\brain\\24661ba5-f514-4b0b-9703-4a723e712a73\\erp_crm_dashboard_1782392253335.png';
  const aiProductImg = 'C:\\Users\\THE DESIGN SHOP\\.gemini\\antigravity-ide\\brain\\24661ba5-f514-4b0b-9703-4a723e712a73\\product_dashboard_1782392267525.png';
  const aiKioskImg = 'C:\\Users\\THE DESIGN SHOP\\.gemini\\antigravity-ide\\brain\\24661ba5-f514-4b0b-9703-4a723e712a73\\self_checkout_kiosk_1782392852313.png';
  const aiPosImg = 'C:\\Users\\THE DESIGN SHOP\\.gemini\\antigravity-ide\\brain\\24661ba5-f514-4b0b-9703-4a723e712a73\\pos_system_ui_1782392865792.png';

  const imgDir = path.join(__dirname, 'public', 'images');
  if (fs.existsSync(aiErpImg)) { try { fs.copyFileSync(aiErpImg, path.join(imgDir, 'erp_crm_dashboard.png')); } catch (e) { } }
  if (fs.existsSync(aiProductImg)) { try { fs.copyFileSync(aiProductImg, path.join(imgDir, 'product_dashboard.png')); } catch (e) { } }
  if (fs.existsSync(aiKioskImg)) { try { fs.copyFileSync(aiKioskImg, path.join(imgDir, 'self_checkout_kiosk.png')); } catch (e) { } }
  if (fs.existsSync(aiPosImg)) { try { fs.copyFileSync(aiPosImg, path.join(imgDir, 'pos_system_ui.png')); } catch (e) { } }

  // Copy Luther assets to public folder
  const lutherDir = path.join(__dirname, 'luther-1.0.0');
  if (fs.existsSync(lutherDir)) {
    try {
      // Copy CSS
      copyFolderSync(path.join(lutherDir, 'css'), path.join(__dirname, 'public', 'css'));
      // Copy JS
      copyFolderSync(path.join(lutherDir, 'js'), path.join(__dirname, 'public', 'js'));
      // Copy Images
      copyFolderSync(path.join(lutherDir, 'images'), path.join(__dirname, 'public', 'images'));
      // Copy favicon files and webmanifest
      const rootFiles = [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'site.webmanifest',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png'
      ];
      rootFiles.forEach(file => {
        const srcPath = path.join(lutherDir, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, path.join(__dirname, 'public', file));
        }
      });
      console.log('SQL Database: Copied Luther assets successfully to public/ directory.');
    } catch (copyErr) {
      console.error('Failed to copy Luther assets:', copyErr.message);
    }
  }

  try {
    // 1. Try to load mysql2 package
    mysql = require('mysql2');
  } catch (err) {
    console.log('SQL Database: "mysql2" package is not installed. To use MySQL, run "npm install mysql2". Falling back to JSON database.');
    initJsonDb(defaultAdminUsername, adminHash, adminSalt);
    return;
  }

  // 2. Try to connect to MySQL server and ensure DB exists
  try {
    const tempConnection = mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    await new Promise((resolve, reject) => {
      tempConnection.connect(err => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Create database if not exists
    await new Promise((resolve, reject) => {
      tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, err => {
        if (err) return reject(err);
        resolve();
      });
    });

    tempConnection.end();

    // 3. Create connection pool with the database specified
    pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      connectionLimit: 10,
      waitForConnections: true
    });

    useMysql = true;
    console.log(`SQL Database: Connected to MySQL at ${dbHost}:${dbPort}/${dbName}`);

    // 4. Create Tables
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB;
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        company VARCHAR(150),
        status VARCHAR(50) DEFAULT 'New',
        notes TEXT,
        created_at DATETIME NOT NULL
      ) ENGINE=InnoDB;
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(100) PRIMARY KEY,
        customer_name VARCHAR(150) NOT NULL,
        customer_email VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(50),
        plan_id VARCHAR(50) NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        amount_omr DECIMAL(10,3) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at DATETIME NOT NULL
      ) ENGINE=InnoDB;
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        \`value\` LONGTEXT NOT NULL
      ) ENGINE=InnoDB;
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(100) NOT NULL,
        created_at DATETIME NOT NULL
      ) ENGINE=InnoDB;
    `);

    // Seed default admin if none exists
    const users = await executeQuery('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      await executeQuery(
        'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)',
        [defaultAdminUsername, adminHash, adminSalt]
      );
      console.log('Seeded default admin user in MySQL.');
    }

    // Seed default plans (always upsert/migrate on startup to ensure sync with rebranded products)
    const existingPlansRow = await executeQuery('SELECT `value` FROM settings WHERE `key` = "pricing_plans"');
    let plansToSave = defaultPlans;
    if (existingPlansRow.length > 0) {
      try {
        let currentPlans = JSON.parse(existingPlansRow[0].value);
        // Ensure new CRM plans are present and have rich features/prices
        const crmPlanIds = ['crm_hospital', 'crm_sales', 'crm_hotel'];
        crmPlanIds.forEach(id => {
          const defaultCrm = defaultPlans.find(p => p.id === id);
          let existingCrmIndex = currentPlans.findIndex(p => p.id === id);
          if (existingCrmIndex === -1) {
            currentPlans.push(defaultCrm);
          } else {
            // If the features are empty or yearly/lifetime prices are missing, update them
            const existingCrm = currentPlans[existingCrmIndex];
            if (!existingCrm.features || existingCrm.features.length === 0) {
              existingCrm.features = defaultCrm.features;
            }
            if (!existingCrm.price_yearly) {
              existingCrm.price_yearly = defaultCrm.price_yearly;
            }
            if (!existingCrm.price_lifetime) {
              existingCrm.price_lifetime = defaultCrm.price_lifetime;
            }
            if (!existingCrm.description || existingCrm.description === 'Hospital CRM Management' || existingCrm.description === 'Sales Pipeline Tracking' || existingCrm.description === 'Hotel Booking Integration' || existingCrm.description.length < 35) {
              existingCrm.description = defaultCrm.description;
            }
          }
        });
        plansToSave = currentPlans;
      } catch (err) {
        console.error('Failed to parse existing plans during migration:', err);
      }
    }
    await executeQuery(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      ['pricing_plans', JSON.stringify(plansToSave), JSON.stringify(plansToSave)]
    );
    console.log('SQL Database: Synchronized pricing plans in MySQL settings.');

    await executeQuery(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = `value`',
      ['website_content', JSON.stringify(defaultWebsiteContent)]
    );
    console.log('SQL Database: Synchronized default website content in MySQL settings.');

  } catch (connectionError) {
    console.error(`SQL Database: Could not connect to MySQL server at ${dbHost}:${dbPort}.`);
    console.error(`Error Details: ${connectionError.message}`);
    console.log('Falling back to local JSON database for development/demonstration.');
    initJsonDb(defaultAdminUsername, adminHash, adminSalt);
  }
}

// JSON Fallback Initialization
function initJsonDb(defaultUsername, adminHash, adminSalt) {
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initialJsonData = {
      users: [
        {
          id: 1,
          username: defaultUsername,
          password_hash: adminHash,
          salt: adminSalt
        }
      ],
      leads: [],
      payments: [],
      customers: [],
      settings: {
        pricing_plans: defaultPlans,
        website_content: defaultWebsiteContent
      }
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialJsonData, null, 2));
    console.log('Created and seeded JSON database fallback.');
  } else {
    // Force update pricing plans to ensure new ones like CRM are added
    try {
      const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
      data.settings.pricing_plans = defaultPlans;
      data.settings.website_content = defaultWebsiteContent;
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
      console.log('Updated JSON database fallback with latest default plans.');
    } catch (e) {
      console.error('Failed to update JSON fallback:', e);
    }
  }
}

// JSON Helpers
function readJson() {
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], leads: [], payments: [], settings: {} };
  }
}

function writeJson(data) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
}

// DATABASE OPERATIONS

// --- USERS SECTION ---
async function getUserByUsername(username) {
  if (useMysql) {
    const rows = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  } else {
    const db = readJson();
    return db.users.find(u => u.username === username) || null;
  }
}

async function updateAdminPassword(username, newPassword) {
  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);

  if (useMysql) {
    await executeQuery(
      'UPDATE users SET password_hash = ?, salt = ? WHERE username = ?',
      [newHash, newSalt, username]
    );
  } else {
    const db = readJson();
    const user = db.users.find(u => u.username === username);
    if (user) {
      user.password_hash = newHash;
      user.salt = newSalt;
      writeJson(db);
    }
  }
}

// --- LEADS SECTION ---
async function createLead(lead) {
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL datetime format
  if (useMysql) {
    await executeQuery(`
      INSERT INTO leads (name, email, phone, company, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      lead.name,
      lead.email,
      lead.phone || '',
      lead.company || '',
      lead.status || 'New',
      lead.notes || '',
      createdAt
    ]);
  } else {
    const db = readJson();
    const newId = db.leads.length > 0 ? Math.max(...db.leads.map(l => l.id)) + 1 : 1;
    db.leads.push({
      id: newId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      status: lead.status || 'New',
      notes: lead.notes || '',
      created_at: new Date().toISOString()
    });
    writeJson(db);
  }
}

async function getLeads() {
  if (useMysql) {
    return await executeQuery('SELECT * FROM leads ORDER BY created_at DESC');
  } else {
    const db = readJson();
    return [...db.leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

async function updateLeadStatus(id, status, notes) {
  if (useMysql) {
    await executeQuery('UPDATE leads SET status = ?, notes = ? WHERE id = ?', [status, notes, id]);
  } else {
    const db = readJson();
    const lead = db.leads.find(l => l.id === parseInt(id));
    if (lead) {
      lead.status = status;
      lead.notes = notes;
      writeJson(db);
    }
  }
}

// --- PAYMENTS SECTION ---
async function createPayment(payment) {
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL format
  if (useMysql) {
    await executeQuery(`
      INSERT INTO payments (id, customer_name, customer_email, customer_phone, plan_id, plan_name, amount_omr, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      payment.id,
      payment.customer_name,
      payment.customer_email,
      payment.customer_phone || '',
      payment.plan_id,
      payment.plan_name,
      payment.amount_omr,
      payment.status || 'PENDING',
      createdAt
    ]);
  } else {
    const db = readJson();
    db.payments.push({
      id: payment.id,
      customer_name: payment.customer_name,
      customer_email: payment.customer_email,
      customer_phone: payment.customer_phone || '',
      plan_id: payment.plan_id,
      plan_name: payment.plan_name,
      amount_omr: payment.amount_omr,
      status: payment.status || 'PENDING',
      created_at: new Date().toISOString()
    });
    writeJson(db);
  }
}

async function getPaymentById(id) {
  if (useMysql) {
    const rows = await executeQuery('SELECT * FROM payments WHERE id = ?', [id]);
    return rows[0] || null;
  } else {
    const db = readJson();
    return db.payments.find(p => p.id === id) || null;
  }
}

async function updatePaymentStatus(id, status) {
  if (useMysql) {
    await executeQuery('UPDATE payments SET status = ? WHERE id = ?', [status, id]);
  } else {
    const db = readJson();
    const payment = db.payments.find(p => p.id === id);
    if (payment) {
      payment.status = status;
      writeJson(db);
    }
  }
}

async function getPayments() {
  if (useMysql) {
    return await executeQuery('SELECT * FROM payments ORDER BY created_at DESC');
  } else {
    const db = readJson();
    return [...db.payments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

// --- SETTINGS / PRICING PLANS SECTION ---
async function getPricingPlans() {
  if (useMysql) {
    const rows = await executeQuery('SELECT `value` FROM settings WHERE `key` = "pricing_plans"');
    return rows[0] ? JSON.parse(rows[0].value) : defaultPlans;
  } else {
    const db = readJson();
    return db.settings.pricing_plans || defaultPlans;
  }
}

async function updatePricingPlans(plans) {
  if (useMysql) {
    await executeQuery('INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?', [
      'pricing_plans',
      JSON.stringify(plans),
      JSON.stringify(plans)
    ]);
  } else {
    const db = readJson();
    db.settings.pricing_plans = plans;
    writeJson(db);
  }
}

async function getWebsiteContent() {
  let content;
  if (useMysql) {
    const rows = await executeQuery('SELECT `value` FROM settings WHERE `key` = "website_content"');
    content = rows[0] ? JSON.parse(rows[0].value) : defaultWebsiteContent;
  } else {
    const db = readJson();
    content = db.settings.website_content || defaultWebsiteContent;
  }
  
  if (content.about) {
    if (content.about.description) content.about.description = content.about.description.replace(/Sikandar Pvt Ltd/gi, "Sikandar Ali Trading");
    if (content.about.content) content.about.content = content.about.content.replace(/Sikandar Pvt Ltd/gi, "Sikandar Ali Trading");
  }
  return content;
}

async function updateWebsiteContent(content) {
  if (useMysql) {
    await executeQuery('INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?', [
      'website_content',
      JSON.stringify(content),
      JSON.stringify(content)
    ]);
  } else {
    const db = readJson();
    if (!db.settings) db.settings = {};
    db.settings.website_content = content;
    writeJson(db);
  }
}

// --- CUSTOMERS SECTION ---
async function createCustomer(customer) {
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL format
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(customer.password, salt);

  if (useMysql) {
    await executeQuery(`
      INSERT INTO customers (name, email, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      customer.name,
      customer.email,
      passwordHash,
      salt,
      createdAt
    ]);
  } else {
    const db = readJson();
    if (!db.customers) db.customers = [];
    const newId = db.customers.length > 0 ? Math.max(...db.customers.map(c => c.id)) + 1 : 1;
    db.customers.push({
      id: newId,
      name: customer.name,
      email: customer.email,
      password_hash: passwordHash,
      salt: salt,
      created_at: new Date().toISOString()
    });
    writeJson(db);
  }
}

async function getCustomerByEmail(email) {
  if (useMysql) {
    const rows = await executeQuery('SELECT * FROM customers WHERE email = ?', [email]);
    return rows[0] || null;
  } else {
    const db = readJson();
    if (!db.customers) db.customers = [];
    return db.customers.find(c => c.email === email) || null;
  }
}

async function getProductPage(id) {
  if (useMysql) {
    const rows = await executeQuery('SELECT `value` FROM settings WHERE `key` = "product_pages"');
    const pages = rows[0] ? JSON.parse(rows[0].value) : defaultProductPages;
    return pages[id] || defaultProductPages[id] || null;
  } else {
    const db = readJson();
    const pages = db.settings.product_pages || defaultProductPages;
    return pages[id] || defaultProductPages[id] || null;
  }
}

async function updateProductPage(id, content) {
  if (useMysql) {
    const rows = await executeQuery('SELECT `value` FROM settings WHERE `key` = "product_pages"');
    const pages = rows[0] ? JSON.parse(rows[0].value) : defaultProductPages;
    pages[id] = content;
    await executeQuery('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [
      'product_pages',
      JSON.stringify(pages),
      JSON.stringify(pages)
    ]);
  } else {
    const db = readJson();
    if (!db.settings) db.settings = {};
    if (!db.settings.product_pages) db.settings.product_pages = { ...defaultProductPages };
    db.settings.product_pages[id] = content;
    writeJson(db);
  }
}

async function getCustomerPayments(email) {
  if (useMysql) {
    return await executeQuery('SELECT * FROM payments WHERE customer_email = ? ORDER BY created_at DESC', [email]);
  } else {
    const db = readJson();
    return db.payments
      .filter(p => p.customer_email === email)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

module.exports = {
  init,
  hashPassword,
  getUserByUsername,
  updateAdminPassword,
  createLead,
  getLeads,
  updateLeadStatus,
  createPayment,
  getPaymentById,
  updatePaymentStatus,
  getPayments,
  getPricingPlans,
  updatePricingPlans,
  getWebsiteContent,
  updateWebsiteContent,
  createCustomer,
  getCustomerByEmail,
  getCustomerPayments,
  getProductPage,
  updateProductPage
};
