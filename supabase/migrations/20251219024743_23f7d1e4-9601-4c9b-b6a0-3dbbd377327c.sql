-- Drop tables related to educational module in correct order (respecting foreign keys)

-- First drop tables that reference others
DROP TABLE IF EXISTS user_quiz_results CASCADE;
DROP TABLE IF EXISTS user_lesson_progress CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS learning_quizzes CASCADE;
DROP TABLE IF EXISTS learning_lessons CASCADE;
DROP TABLE IF EXISTS learning_modules CASCADE;
DROP TABLE IF EXISTS learning_tracks CASCADE;

-- Also drop the educational-videos storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'educational-videos';
DELETE FROM storage.buckets WHERE id = 'educational-videos';