CREATE DATABASE IF NOT EXISTS library_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE library_management;

SET FOREIGN_KEY_CHECKS = 0;

-- DO NOT DROP TABLES ON RESTART! THIS WILL DELETE ALL DATA.
-- Only uncomment these lines for a complete factory reset.
-- DROP TABLE IF EXISTS issued_books;
-- DROP TABLE IF EXISTS book_copies;
-- DROP TABLE IF EXISTS student_profiles;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS admin;
-- DROP TABLE IF EXISTS books;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS admin (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE,
  semester INT DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  batch_year INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS books (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(100) NOT NULL,
  faculty VARCHAR(50) DEFAULT NULL,
  isbn VARCHAR(20) NOT NULL UNIQUE,
  total_quantity INT NOT NULL DEFAULT 1,
  available_quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_book_isbn (isbn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS book_copies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id INT UNSIGNED NOT NULL,
  copy_number INT NOT NULL,
  copy_code VARCHAR(64) NOT NULL UNIQUE,
  status ENUM('available', 'issued', 'lost', 'damaged') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_copy_book_id (book_id),
  INDEX idx_copy_number (copy_number),
  INDEX idx_copy_status (status),
  UNIQUE KEY uq_copy_book_number (book_id, copy_number),
  CONSTRAINT fk_copy_book
    FOREIGN KEY (book_id) REFERENCES books(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS issued_books (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  copy_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  issued_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE DEFAULT NULL,
  status ENUM('issued', 'returned') NOT NULL DEFAULT 'issued',
  active_issue TINYINT GENERATED ALWAYS AS (
    CASE WHEN status = 'issued' THEN 1 ELSE NULL END
  ) STORED,
  fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_issued_copy_id (copy_id),
  INDEX idx_issued_book_id (book_id),
  INDEX idx_issued_user_id (user_id),
  INDEX idx_issued_status (status),
  UNIQUE KEY uq_active_copy_issue (copy_id, active_issue),
  UNIQUE KEY uq_active_user_book_issue (user_id, book_id, active_issue),
  CONSTRAINT fk_issued_books_copy
    FOREIGN KEY (copy_id) REFERENCES book_copies(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_issued_books_book
    FOREIGN KEY (book_id) REFERENCES books(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_issued_books_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin (password for admin123)
-- Uses IGNORE so it doesn't crash the server if the admin already exists
INSERT IGNORE INTO admin (username, email, password)
VALUES ('admin', 'admin@library.com', '$2a$10$0YjbRpisSOtnYM7Ua9CDs.bbOSA5wS6yQ7QZfaJC6bEQ4B2bXAeUu');
