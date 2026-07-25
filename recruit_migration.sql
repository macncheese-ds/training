-- ============================================================
-- HR Platform — Recruitment Module Migration
-- Run against the `training` database
-- ============================================================

USE `training`;

-- ────────────────────────────────────────────────────────────
-- R1. Departments (for recruitment + shared with training target_areas)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `recruit_departments` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(100) NOT NULL UNIQUE,
  `active`     TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- R2. Candidate sources
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `recruit_sources` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(100) NOT NULL UNIQUE,
  `active`     TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- R3. Vacancies
-- recruiter_id references credenciales.users.id (HR user who owns the vacancy)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `vacancies` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `job_id`          VARCHAR(20)   NOT NULL UNIQUE,
  `department_id`   INT           NOT NULL,
  `job_title`       VARCHAR(150)  NOT NULL,
  `opening_date`    DATE          NOT NULL,
  `recruiter_id`    INT           NOT NULL COMMENT 'credenciales.users.id',
  `status`          ENUM('Vacant','Filled','Suspended','Cancelled') NOT NULL DEFAULT 'Vacant',
  `hire_start_date` DATE          DEFAULT NULL,
  `hiring_cost`     DECIMAL(12,2) DEFAULT NULL,
  `description`     TEXT          DEFAULT NULL,
  `requirements`    TEXT          DEFAULT NULL COMMENT 'Skills/requirements for AI scoring',
  `notes`           TEXT          DEFAULT NULL,
  `created_by`      INT           NOT NULL COMMENT 'credenciales.users.id',
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_department` (`department_id`),
  FOREIGN KEY (`department_id`) REFERENCES `recruit_departments`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- R4. Candidates
-- resume_path: local file path in uploads/resumes/
-- ai_score: 0-100 computed score, NULL until analyzed
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `candidates` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `vacancy_id`        INT          NOT NULL,
  `source_id`         INT          NOT NULL,
  `candidate_name`    VARCHAR(150) NOT NULL,
  `email`             VARCHAR(150) DEFAULT NULL,
  `phone`             VARCHAR(40)  DEFAULT NULL,
  `applied_date`      DATE         NOT NULL,
  `recruitment_phase` ENUM('Received Application','Sent to Manager','Interviews','Tests','Job Offer','Hired') NOT NULL DEFAULT 'Received Application',
  `final_decision`    ENUM('Hired','Candidate in Process','Candidate Refusal','Not Hired') DEFAULT NULL,
  `decision_comment`  VARCHAR(255) DEFAULT NULL,
  `resume_path`       VARCHAR(500) DEFAULT NULL COMMENT 'Path under uploads/resumes/',
  `resume_original`   VARCHAR(255) DEFAULT NULL COMMENT 'Original filename',
  -- AI / rule-based resume scoring (decision support only — HR still decides)
  `ai_score`          DECIMAL(5,2) DEFAULT NULL COMMENT 'Candidate fit score 0-100, computed by keyword/skill matching against vacancy.requirements',
  `ai_summary`        TEXT         DEFAULT NULL COMMENT 'Short AI-generated match summary shown to HR',
  `ai_scored_at`      DATETIME     DEFAULT NULL,
  `notes`             TEXT         DEFAULT NULL,
  `hired_user_id`     INT          DEFAULT NULL COMMENT 'credenciales.users.id after onboarding',
  `created_by`        INT          NOT NULL COMMENT 'credenciales.users.id',
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_vacancy` (`vacancy_id`),
  INDEX `idx_phase` (`recruitment_phase`),
  INDEX `idx_decision` (`final_decision`),
  FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`source_id`)  REFERENCES `recruit_sources`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- R5. Candidate notes / activity log
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `candidate_notes` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `candidate_id` INT  NOT NULL,
  `user_id`      INT  NOT NULL COMMENT 'credenciales.users.id',
  `note`         TEXT NOT NULL,
  `note_type`    ENUM('general','interview','test','decision','system') DEFAULT 'general',
  `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_candidate` (`candidate_id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- Alter: exams — add skill matrix integration flag
-- ────────────────────────────────────────────────────────────
ALTER TABLE `exams`
  ADD COLUMN IF NOT EXISTS `affects_skill_matrix` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'If 1, a passing score updates employee_skills for linked_skill_id',
  ADD COLUMN IF NOT EXISTS `linked_skill_id` INT DEFAULT NULL
    COMMENT 'Skill updated when exam is passed and affects_skill_matrix=1',
  ADD COLUMN IF NOT EXISTS `skill_level_granted` INT NOT NULL DEFAULT 1
    COMMENT 'Level set in employee_skills when exam passed';

-- ────────────────────────────────────────────────────────────
-- Seeds: departments
-- ────────────────────────────────────────────────────────────
INSERT IGNORE INTO `recruit_departments` (`name`) VALUES
  ('Sales'),
  ('Marketing'),
  ('Human Resources'),
  ('Manufacturing'),
  ('Procurement'),
  ('Finance'),
  ('IT'),
  ('Legal Affairs'),
  ('Public Relations'),
  ('Support'),
  ('Engineering'),
  ('Quality'),
  ('Logistics');

-- Seeds: sources
INSERT IGNORE INTO `recruit_sources` (`name`) VALUES
  ('Job Portals'),
  ('Own Website'),
  ('LinkedIn'),
  ('Newspaper'),
  ('Facebook'),
  ('Twitter'),
  ('Instagram'),
  ('Recruitment Agency'),
  ('Employee Referral'),
  ('Other');

SELECT 'Recruitment migration completed successfully!' AS status;
