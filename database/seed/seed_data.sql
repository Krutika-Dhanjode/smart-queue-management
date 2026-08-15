-- Seed data for testing
-- Run after migration

-- Sample admin user (password: admin123)
INSERT INTO users (name, email, phone, password_hash, role, email_verified)
VALUES (
  'Admin User',
  'admin@smartqueue.com',
  '1234567890',
  '$2a$12$LJ3m4ys3GZvV5Hs.vDnB5.K7X5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
  'ADMIN',
  TRUE
);

-- Sample regular user (password: user123)
INSERT INTO users (name, email, phone, password_hash, role, email_verified)
VALUES (
  'Test User',
  'user@smartqueue.com',
  '0987654321',
  '$2a$12$LJ3m4ys3GZvV5Hs.vDnB5.K7X5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
  'USER',
  TRUE
);
