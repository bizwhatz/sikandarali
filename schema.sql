-- SQL Schema for Sikandar CRM
-- Target Server: MySQL 8.0+ / MariaDB
-- Recommended database name: `sikandar_crm`

CREATE DATABASE IF NOT EXISTS `sikandar_crm` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sikandar_crm`;

-- 1. Users Table (Admin Panel Auth)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `salt` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Leads Table (Sales Inquiries)
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50),
  `company` VARCHAR(150),
  `status` VARCHAR(50) DEFAULT 'New',
  `notes` TEXT,
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Payments Table (Purchases processed via Tap Payments)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(100) PRIMARY KEY,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_email` VARCHAR(100) NOT NULL,
  `customer_phone` VARCHAR(50),
  `plan_id` VARCHAR(50) NOT NULL,
  `plan_name` VARCHAR(100) NOT NULL,
  `amount_omr` DECIMAL(10,3) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'PENDING',
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Settings Table (For dynamic options like pricing plans)
CREATE TABLE IF NOT EXISTS `settings` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --- SEED DATA ---

-- Seed default admin credentials: admin / admin123
-- Salt: 5c8f6ea50d99ef87
-- Hashed password (pbkdf2Sync 1000 iter sha512):
-- 29fa5a93df5b4b1a43a41fe380db3132e022f46cfc3ef59eb368c78c2e6f47738bdf888665805562de4d7ce5fb7dbd486d34e2ab870685934335c023d6a2a0a2
INSERT INTO `users` (`username`, `password_hash`, `salt`) 
VALUES ('admin', '29fa5a93df5b4b1a43a41fe380db3132e022f46cfc3ef59eb368c78c2e6f47738bdf888665805562de4d7ce5fb7dbd486d34e2ab870685934335c023d6a2a0a2', '5c8f6ea50d99ef87')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed default CRM pricing plans
INSERT INTO `settings` (`key`, `value`) 
VALUES ('pricing_plans', '[{"id":"oria","name":"Sikandar ORIA","price":199,"billing":"month","description":"Unify voice, chat, and multilingual interactions while turning every conversation into actionable intelligence.","features":["Voice & Chat Unification","Multilingual Support","Conversational AI Insights","Real-time Sentiment Analysis","CRM/ERP Native Connectors"]},{"id":"pos","name":"Restaurant POS","price":99,"billing":"month","description":"Comprehensive ERP restaurant point-of-sale system, expanding our offerings in the hospitality sector.","features":["Table & Order Management","KOT (Kitchen Order Ticket) System","Real-time Sales Dashboards","Multi-terminal Sync","Loyalty & Promotions"]},{"id":"erp","name":"Sikandar ERP","price":299,"billing":"month","description":"All-in-one ERP Solution, delivering flexibility, control, and scalability for businesses across every industry.","features":["Inventory & Warehouse Control","Financial Accounting & VAT","Purchase & Sales Orders","HR & Payroll Management","Custom Reports & Auditing"]},{"id":"checkout","name":"Self Checkout","price":149,"billing":"month","description":"Innovative self-checkout solution designed to address billing issues in retail stores by enabling customers to scan barcodes and pay online.","features":["Barcode Scanning","Instant Web Checkout","Tap Payments Integration","Real-time Billing Dashboard","Queue Reduction Analytics"]}]')
ON DUPLICATE KEY UPDATE `key`=`key`;
