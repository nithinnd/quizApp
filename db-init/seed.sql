-- ─── SEED DATA for quizdb ──────────────────────────────────────────────────
-- Runs automatically ONLY on first-ever initialization of the pgdata volume.
-- Order matters: parent tables before tables that reference them (FKs).

-- ─── Users ──────────────────────────────────────────────────────────────────
-- Test login: username = "testuser", password = "password123" (BCrypt hashed)
INSERT INTO users (email, password, role, username) VALUES
('testuser@example.com', '$2b$10$AJCfbvXjtYZyuZOAtqQ5v.ScasvyNgL9jGvhFL1q0Bk6vgAoCrC.S', 'ROLE_USER', 'testuser'),
('admin@example.com',    '$2b$10$AJCfbvXjtYZyuZOAtqQ5v.ScasvyNgL9jGvhFL1q0Bk6vgAoCrC.S', 'ROLE_ADMIN', 'admin');

-- ─── Questions (main question bank) ───────────────────────────────────────
INSERT INTO question (question, option1, option2, option3, option4, answer, difficulty_level) VALUES
('What is the capital of France?', 'London', 'Paris', 'Berlin', 'Madrid', 'Paris', 'Easy'),
('Which language runs in a web browser?', 'Java', 'C', 'Python', 'JavaScript', 'JavaScript', 'Easy'),
('What does CPU stand for?', 'Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Central Processor Utility', 'Central Processing Unit', 'Easy'),
('Which planet is known as the Red Planet?', 'Earth', 'Mars', 'Jupiter', 'Venus', 'Mars', 'Easy'),
('What is the time complexity of binary search?', 'O(n)', 'O(n^2)', 'O(log n)', 'O(1)', 'O(log n)', 'Medium'),
('Which data structure uses FIFO order?', 'Stack', 'Queue', 'Tree', 'Graph', 'Queue', 'Medium'),
('What does REST stand for in APIs?', 'Representational State Transfer', 'Remote Execution Service Transfer', 'Real-time State Transfer', 'Remote State Transaction', 'Representational State Transfer', 'Medium'),
('Which HTTP status code means "Not Found"?', '200', '301', '404', '500', '404', 'Medium'),
('What is the default port for PostgreSQL?', '3306', '5432', '1521', '27017', '5432', 'Medium'),
('In microservices, what does Eureka provide?', 'Load balancing', 'Service discovery', 'Database caching', 'Message queuing', 'Service discovery', 'Hard'),
('What is the CAP theorem primarily about?', 'Consistency, Availability, Partition tolerance', 'Cache, API, Performance', 'Concurrency, Atomicity, Persistence', 'Cloud, Application, Platform', 'Consistency, Availability, Partition tolerance', 'Hard'),
('Which design pattern does Spring''s @Autowired rely on?', 'Singleton', 'Dependency Injection', 'Factory', 'Observer', 'Dependency Injection', 'Hard');

-- ─── Question Wrapper (used for a different quiz flow, per your schema) ───
INSERT INTO question_wrapper (id, question, option1, option2, option3, option4) VALUES
(1, 'What does JVM stand for?', 'Java Virtual Machine', 'Java Verified Method', 'Java Variable Manager', 'Java Version Manager'),
(2, 'Which company originally developed Docker?', 'Google', 'Docker Inc.', 'Amazon', 'Microsoft'),
(3, 'What does K8s refer to?', 'Kubernetes', 'Kotlin', 'Kafka Streams', 'Key-Value Store'),
(4, 'Which of these is a NoSQL database?', 'PostgreSQL', 'MySQL', 'MongoDB', 'SQLite');

-- ─── Quizzes ────────────────────────────────────────────────────────────────
INSERT INTO quiz (title, difficulty_level) VALUES
('General Knowledge Starter', 'Easy'),
('Backend Fundamentals', 'Medium'),
('DevOps & Systems Design', 'Hard');

-- ─── Quiz <-> Question mapping ─────────────────────────────────────────────
-- Quiz 1: General Knowledge Starter -> questions 1-4 (EASY)
INSERT INTO quiz_questions (quiz_id, questions_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4);

-- Quiz 2: Backend Fundamentals -> questions 5-9 (MEDIUM)
INSERT INTO quiz_questions (quiz_id, questions_id) VALUES
(2, 5), (2, 6), (2, 7), (2, 8), (2, 9);

-- Quiz 3: DevOps & Systems Design -> questions 10-12 (HARD)
INSERT INTO quiz_questions (quiz_id, questions_id) VALUES
(3, 10), (3, 11), (3, 12);
