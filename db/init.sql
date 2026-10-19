-- Runs automatically on the FIRST start of an empty MySQL volume.
-- To re-run it: docker compose down -v && docker compose up --build

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT          NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habits (
  id             INT          NOT NULL AUTO_INCREMENT,
  user_id        INT          NOT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT         NULL,
  type           ENUM('build', 'break') NOT NULL,
  current_streak INT          NOT NULL DEFAULT 0,
  best_streak    INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_habits_user (user_id),
  CONSTRAINT fk_habits_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habit_logs (
  id         INT       NOT NULL AUTO_INCREMENT,
  habit_id   INT       NOT NULL,
  log_date   DATE      NOT NULL,
  status     ENUM('completed', 'missed', 'clean', 'relapsed') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_habit_logs_habit_date (habit_id, log_date),
  CONSTRAINT fk_habit_logs_habit
    FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goals (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  habit_id    INT          NULL,
  title       VARCHAR(255) NOT NULL,
  target_date DATE         NULL,
  status      ENUM('active', 'completed', 'archived') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user (user_id),
  KEY idx_goals_habit (habit_id),
  CONSTRAINT fk_goals_user
    FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_goals_habit
    FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
