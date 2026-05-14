-- ============================================================
-- Training & Competency Management Platform
-- Database Initialization Script
-- ============================================================

CREATE DATABASE IF NOT EXISTS `training`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `training`;

-- ────────────────────────────────────────────────────────────
-- 1. Categories — group trainings and skills
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `categories` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(100) NOT NULL,
  `description` TEXT,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 2. Trainings — core training definitions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `trainings` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `title`             VARCHAR(255) NOT NULL,
  `description`       TEXT,
  `category_id`       INT,
  `delivery_mode`     ENUM('synchronous','asynchronous') NOT NULL DEFAULT 'asynchronous',
  `is_mandatory`      TINYINT(1) DEFAULT 0,
  `duration_minutes`  INT,
  `recurrence_months` INT DEFAULT NULL,
  `target_roles`      JSON,
  `target_areas`      JSON,
  `content_url`       VARCHAR(500),
  `material_path`     VARCHAR(500),
  `created_by`        INT NOT NULL,
  `is_active`         TINYINT(1) DEFAULT 1,
  `created_at`        DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category_id`),
  INDEX `idx_active` (`is_active`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 3. Training assignments — who needs to do what
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `training_assignments` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `training_id`     INT NOT NULL,
  `user_id`         INT NOT NULL,
  `assigned_by`     INT NOT NULL,
  `status`          ENUM('pending','in_progress','completed','overdue','expired') DEFAULT 'pending',
  `scheduled_date`  DATETIME,
  `due_date`        DATETIME,
  `completed_at`    DATETIME,
  `package_id`      INT DEFAULT NULL,
  `notes`           TEXT,
  `created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_training` (`training_id`),
  INDEX `idx_due_date` (`due_date`),
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 4. Training packages — bundled training sets
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `training_packages` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(255) NOT NULL,
  `description`   TEXT,
  `package_type`  ENUM('onboarding','recertification','custom') DEFAULT 'custom',
  `deadline_days` INT NOT NULL DEFAULT 30,
  `target_roles`  JSON,
  `target_areas`  JSON,
  `is_active`     TINYINT(1) DEFAULT 1,
  `created_by`    INT NOT NULL,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 5. Package items — trainings inside a package
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `package_items` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `package_id`  INT NOT NULL,
  `training_id` INT NOT NULL,
  `sort_order`  INT DEFAULT 0,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_pkg_training` (`package_id`, `training_id`),
  FOREIGN KEY (`package_id`) REFERENCES `training_packages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 6. Exams
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `exams` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `title`               VARCHAR(255) NOT NULL,
  `description`         TEXT,
  `passing_score`       DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  `time_limit_minutes`  INT,
  `max_attempts`        INT DEFAULT 3,
  `cooldown_hours`      INT DEFAULT 24,
  `randomize_questions` TINYINT(1) DEFAULT 1,
  `randomize_answers`   TINYINT(1) DEFAULT 1,
  `is_active`           TINYINT(1) DEFAULT 1,
  `created_by`          INT NOT NULL,
  `created_at`          DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 7. Training ↔ Exam junction
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `training_exams` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `training_id` INT NOT NULL,
  `exam_id`     INT NOT NULL,
  `is_required` TINYINT(1) DEFAULT 1,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_training_exam` (`training_id`, `exam_id`),
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 8. Exam questions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `exam_questions` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id`        INT NOT NULL,
  `question_type`  ENUM('multiple_choice','true_false','short_answer') NOT NULL,
  `question_text`  TEXT NOT NULL,
  `options`        JSON,
  `correct_answer` TEXT NOT NULL,
  `points`         DECIMAL(5,2) DEFAULT 1.00,
  `sort_order`     INT DEFAULT 0,
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_exam` (`exam_id`),
  FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 9. Exam attempts — every time someone takes an exam
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `exam_attempts` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id`          INT NOT NULL,
  `user_id`          INT NOT NULL,
  `assignment_id`    INT,
  `score`            DECIMAL(5,2),
  `passed`           TINYINT(1) DEFAULT 0,
  `answers`          JSON,
  `started_at`       DATETIME NOT NULL,
  `completed_at`     DATETIME,
  `duration_seconds` INT,
  `created_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_exam` (`user_id`, `exam_id`),
  INDEX `idx_assignment` (`assignment_id`),
  FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignment_id`) REFERENCES `training_assignments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 10. Skills / competencies
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `skills` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `name`         VARCHAR(200) NOT NULL,
  `description`  TEXT,
  `max_level`    INT DEFAULT 3,
  `level_labels` JSON,
  `category_id`  INT,
  `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 11. Training → Skill mapping
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `training_skills` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `training_id`   INT NOT NULL,
  `skill_id`      INT NOT NULL,
  `grants_level`  INT NOT NULL DEFAULT 1,
  `min_exam_score` DECIMAL(5,2),
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_training_skill` (`training_id`, `skill_id`),
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 12. Employee skills — current competency levels
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `employee_skills` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`       INT NOT NULL,
  `skill_id`      INT NOT NULL,
  `current_level` INT NOT NULL DEFAULT 0,
  `achieved_via`  ENUM('training','exam','manual') DEFAULT 'manual',
  `source_id`     INT,
  `achieved_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at`    DATETIME,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_skill` (`user_id`, `skill_id`),
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 13. Role-required skills — what each role needs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `role_required_skills` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `role_name`      VARCHAR(50) NOT NULL,
  `skill_id`       INT NOT NULL,
  `required_level` INT NOT NULL DEFAULT 1,
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_role_skill` (`role_name`, `skill_id`),
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 14. Notifications — in-app alerts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT NOT NULL,
  `type`           ENUM('reminder','overdue','assignment','result','system') NOT NULL,
  `title`          VARCHAR(255) NOT NULL,
  `message`        TEXT,
  `reference_type` VARCHAR(50),
  `reference_id`   INT,
  `is_read`        TINYINT(1) DEFAULT 0,
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_read` (`user_id`, `is_read`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- Seed: default categories
-- ────────────────────────────────────────────────────────────
INSERT INTO `categories` (`name`, `description`) VALUES
  ('Seguridad', 'Capacitaciones de seguridad industrial y EPP'),
  ('Calidad', 'Procesos de calidad, inspección y estándares'),
  ('Operaciones', 'Procedimientos operativos y de manufactura'),
  ('Liderazgo', 'Desarrollo de liderazgo y gestión de equipos'),
  ('Técnico', 'Habilidades técnicas especializadas'),
  ('Inducción', 'Capacitaciones de onboarding para nuevos empleados'),
  ('Normativo', 'Cumplimiento normativo y regulaciones');

SELECT 'Training database setup completed successfully!' AS status;
