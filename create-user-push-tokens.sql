-- Create user_push_tokens table for FCM push notification token storage
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    push_token VARCHAR(500) NOT NULL UNIQUE,
    device_type VARCHAR(20) DEFAULT 'ANDROID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_push_token (push_token)
);
