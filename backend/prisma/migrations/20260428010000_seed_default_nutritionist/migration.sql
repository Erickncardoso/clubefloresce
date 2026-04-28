-- Garante que o nutricionista padrão exista no ambiente.
-- Senha temporária: 123456 (bcrypt)
INSERT INTO "User" (
  "email",
  "password",
  "name",
  "role",
  "status",
  "plan",
  "createdAt",
  "updatedAt"
)
VALUES (
  'nutri.isabellajardim@gmail.com',
  '$2b$10$C5dEqyan0CrXPJtnDB756urtXDJQELenZ6yBaS.w55EmoIyRbGvuG',
  'Isabella Jardim',
  'NUTRICIONISTA'::"Role",
  'PENDENTE'::"UserStatus",
  'FREE'::"UserPlan",
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE
SET
  "password" = EXCLUDED."password",
  "name" = EXCLUDED."name",
  "role" = 'NUTRICIONISTA'::"Role",
  "status" = 'PENDENTE'::"UserStatus",
  "updatedAt" = NOW();
