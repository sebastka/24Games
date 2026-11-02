-- Runs once when the dev MariaDB volume is created.
-- The app user also owns the test database (npm test with TEST_DB_HOST set).
CREATE DATABASE IF NOT EXISTS games24_test CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON `games24\_test`.* TO '24games'@'%';
