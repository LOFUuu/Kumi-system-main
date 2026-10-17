import "./load-env";
import { ensureDatabaseExists, mariaQuery } from "../lib/mariadb";

const SCHEMAS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('admin', 'counselor', 'resident', 'non_resident') NOT NULL,
    isActive TINYINT(1) DEFAULT 1,
    address TEXT,
    blockNo VARCHAR(50),
    lotNo VARCHAR(50),
    phone VARCHAR(50),
    gender VARCHAR(20),
    householdMembers INT DEFAULT 0,
    householdHead VARCHAR(255),
    passwordHash VARCHAR(255),
    resetToken VARCHAR(255),
    resetTokenExpiry DATETIME,
    emailVerified TINYINT(1) DEFAULT 0,
    verificationToken VARCHAR(255),
    verificationTokenExpiry DATETIME,
    cedula VARCHAR(100),
    isArchived TINYINT(1) DEFAULT 0,
    archiveReason TEXT,
    archivedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS listings (
    id INT PRIMARY KEY,
    houseName VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    blockNo VARCHAR(50),
    lotNo VARCHAR(50),
    price DECIMAL(15,2) NOT NULL,
    listingType ENUM('sale', 'rent') NOT NULL,
    bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    sqm DECIMAL(10,2) DEFAULT 0,
    status ENUM('available', 'reserved', 'sold', 'off_market') DEFAULT 'available',
    transactionStatus ENUM('available', 'reserved', 'sold_rented', 'sold') DEFAULT 'available',
    ownerContactNumber VARCHAR(50),
    ownerMessengerLink VARCHAR(255),
    description LONGTEXT,
    ownerId INT,
    ownerName VARCHAR(255),
    images LONGTEXT,
    lat DOUBLE,
    lng DOUBLE,
    verificationStatus ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    proofDocuments LONGTEXT,
    rejectionReason TEXT,
    uploadedBy INT,
    showOnMap TINYINT(1) DEFAULT 1,
    siteVisitRecommended TINYINT(1) DEFAULT 0,
    isArchived TINYINT(1) DEFAULT 0,
    archiveReason TEXT,
    archivedBy VARCHAR(100),
    archivedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_listing_status (status),
    INDEX idx_listing_block_lot (blockNo, lotNo)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS amenities (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    maxCapacity INT DEFAULT 50,
    rateWalkin DECIMAL(10,2) DEFAULT 0,
    rateWhole DECIMAL(10,2) DEFAULT 0,
    ratePrivate DECIMAL(10,2) DEFAULT 0,
    downpayment DECIMAL(10,2) DEFAULT 200,
    downpaymentPrivate DECIMAL(10,2) DEFAULT 500,
    isActive TINYINT(1) DEFAULT 1,
    isArchived TINYINT(1) DEFAULT 0,
    image TEXT,
    lat DOUBLE,
    lng DOUBLE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id INT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    postDate VARCHAR(50),
    status ENUM('active', 'archived') NOT NULL,
    poster VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS reservations (
    id INT PRIMARY KEY,
    amenityId INT,
    amenityName VARCHAR(255),
    residentName VARCHAR(255),
    phone VARCHAR(50),
    bookingType ENUM('day', 'night') NOT NULL,
    reservationType ENUM('public', 'private') NOT NULL,
    date VARCHAR(50),
    paxCount INT DEFAULT 1,
    downpayment DECIMAL(10,2) DEFAULT 0,
    totalAmount DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending', 'approved', 'declined') NOT NULL,
    notes TEXT,
    userEmail VARCHAR(255),
    approvedAt VARCHAR(50),
    gcashRef VARCHAR(100),
    receiptPath TEXT,
    isArchived TINYINT(1) DEFAULT 0,
    archivedAt DATETIME,
    archiveReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_res_date (date),
    INDEX idx_res_amenity (amenityId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS dues (
    id INT PRIMARY KEY,
    residentId INT,
    residentName VARCHAR(255) NOT NULL,
    blockNo VARCHAR(50),
    lotNo VARCHAR(50),
    dueMonth VARCHAR(50) NOT NULL,
    dueDate VARCHAR(50),
    amountDue DECIMAL(10,2) DEFAULT 100,
    amountPaid DECIMAL(10,2) DEFAULT 0,
    paidAt VARCHAR(50),
    creditBalance DECIMAL(10,2) DEFAULT 0,
    status ENUM('paid', 'unpaid', 'delayed', 'advance', 'on_time') NOT NULL,
    source ENUM('imported', 'system', 'manual') DEFAULT 'system',
    billingMonth VARCHAR(50),
    billingYear INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dues_resident (residentName),
    INDEX idx_dues_month (dueMonth)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY,
    residentName VARCHAR(255),
    refType ENUM('amenity', 'dues', 'listing'),
    refId INT,
    userEmail VARCHAR(255),
    amount DECIMAL(10,2),
    paymentMethod ENUM('cash', 'gcash') DEFAULT 'gcash',
    gcashRef VARCHAR(100),
    receiptPath TEXT,
    status ENUM('approved', 'pending', 'voided') NOT NULL,
    payment LONGTEXT,
    isArchived TINYINT(1) DEFAULT 0,
    archiveReason TEXT,
    archivedBy VARCHAR(100),
    archivedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_txn_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS property_viewings (
    id INT PRIMARY KEY,
    listingId INT NOT NULL,
    listingName VARCHAR(255) NOT NULL,
    residentName VARCHAR(255) NOT NULL,
    residentEmail VARCHAR(255) NOT NULL,
    preferredDate VARCHAR(50) NOT NULL,
    preferredTime VARCHAR(50) NOT NULL,
    message TEXT,
    status ENUM('viewing_requested', 'viewing_scheduled', 'viewing_completed', 'viewing_declined') DEFAULT 'viewing_requested',
    adminNotes TEXT,
    scheduledAt VARCHAR(50),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_viewing_listing (listingId),
    INDEX idx_viewing_email (residentEmail)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS payment_configs (
    category VARCHAR(50) PRIMARY KEY,
    accountName VARCHAR(255) DEFAULT 'MABUHAY HOMES HOA',
    accountNumber VARCHAR(100) DEFAULT '0917 123 4567',
    qrCodeUrl TEXT,
    instructions TEXT,
    isActive TINYINT(1) DEFAULT 1,
    updatedBy VARCHAR(100) DEFAULT 'Admin',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS sync_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tableName VARCHAR(50) NOT NULL,
    recordId INT NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    payload LONGTEXT NOT NULL,
    status ENUM('pending', 'synced', 'failed', 'conflict') DEFAULT 'pending',
    retryCount INT DEFAULT 0,
    errorMessage TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    syncedAt DATETIME NULL,
    INDEX idx_sync_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

async function main() {
  console.log("==> Ensuring XAMPP MariaDB database 'kumi_offline' exists...");
  await ensureDatabaseExists();
  console.log("==> Database verified. Creating relational tables...");

  for (const sql of SCHEMAS) {
    await mariaQuery(sql);
  }

  const tables = await mariaQuery<any[]>("SHOW TABLES;");
  console.log("==> Successfully initialized MariaDB tables! Total tables:", tables.length);
  console.table(tables);
  process.exit(0);
}

main().catch((err) => {
  console.error("==> Error initializing MariaDB:", err);
  process.exit(1);
});
