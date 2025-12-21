-- Script para insertar usuarios autorizados del equipo Reset R&A
-- Ejecutar en Supabase SQL Editor

-- Primero verificamos si hay usuarios existentes
SELECT 'Usuarios existentes:' as mensaje;
SELECT * FROM users;

-- Insertamos los usuarios del equipo
-- Si el usuario ya existe (mismo telegram_id), no hace nada (ON CONFLICT DO NOTHING)
INSERT INTO users (telegram_id, telegram_username, name, role)
VALUES
  -- Alonso (Analyst)
  ('1985143829', 'alonsix6', 'Alonso', 'analyst')
ON CONFLICT (telegram_id) DO UPDATE SET
  telegram_username = EXCLUDED.telegram_username,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Verificamos que se insertó correctamente
SELECT 'Usuarios después de la inserción:' as mensaje;
SELECT * FROM users;

-- Nota: Para agregar a Sol y Estef más adelante, usa sus telegram_id reales:
-- INSERT INTO users (telegram_id, telegram_username, name, role)
-- VALUES
--   ('TELEGRAM_ID_SOL', 'username_sol', 'Sol', 'assistant'),
--   ('TELEGRAM_ID_ESTEF', 'username_estef', 'Estef', 'coordinator')
-- ON CONFLICT (telegram_id) DO UPDATE SET
--   telegram_username = EXCLUDED.telegram_username,
--   name = EXCLUDED.name,
--   role = EXCLUDED.role;
