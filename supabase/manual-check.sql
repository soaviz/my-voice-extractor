-- SOAVIZ Studio Supabase remote read-only checks.
-- Run in Supabase Dashboard > SQL Editor, or via psql against DATABASE_URL.
-- This file does not contain secrets and does not modify data.

-- 1) pgvector extension
select extname, extversion
from pg_extension
where extname = 'vector';

-- 2) Required tables
select table_name,
       case when table_name is not null then true else false end as exists
from information_schema.tables
where table_schema = 'public'
  and table_name in ('users', 'projects', 'scenes', 'prompts', 'outputs', 'assets')
order by table_name;

-- 3) RLS status
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'projects', 'scenes', 'prompts', 'outputs', 'assets')
order by tablename;

-- 4) RLS policies
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('users', 'projects', 'scenes', 'prompts', 'outputs', 'assets')
order by tablename, policyname;

-- 5) Storage buckets
select id, name, public
from storage.buckets
where id in ('uploads', 'outputs', 'thumbnails', 'assets')
order by id;

-- 6) Auth/profile relationship candidates
select tc.table_schema,
       tc.table_name,
       kcu.column_name,
       ccu.table_schema as foreign_table_schema,
       ccu.table_name as foreign_table_name,
       ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('profiles', 'users')
order by tc.table_name, kcu.column_name;

-- If buckets are missing, create them manually in Dashboard:
-- Storage > New bucket:
-- uploads      private
-- outputs      private or public, depending on signed URL strategy
-- thumbnails   public if CDN previews are desired, otherwise private
-- assets       private
