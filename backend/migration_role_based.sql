USE library_management;

-- Add password and role columns to users table
ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN role ENUM('admin', 'student') DEFAULT 'student';
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;

-- Insert a test student user
-- Password is 'password123' (hashed)
INSERT INTO users (name, email, phone, address, username, password, role) 
VALUES ('Test Student', 'student@test.com', '1234567890', '123 Student Way', 'student', '$2a$10$X.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x', 'student');
