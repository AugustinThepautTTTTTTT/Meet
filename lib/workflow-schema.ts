import { getClientDb, getLawyerDb } from "@/lib/database";

let clientSchemaReady: Promise<void> | null = null;
let lawyerSchemaReady: Promise<void> | null = null;

export function ensureClientWorkflowSchema() {
  if (!clientSchemaReady) {
    clientSchemaReady = (async () => {
      const sql = getClientDb();
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS brief jsonb NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'intake'`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_email text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS selected_lawyer_slug text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS selected_lawyer_name text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS meeting_time text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS meeting_start timestamptz`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS meeting_url text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required'`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_amount_cents integer`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'EUR'`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS stripe_checkout_url text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text NOT NULL DEFAULT ''`;
      await sql`CREATE TABLE IF NOT EXISTS client_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_account_id uuid REFERENCES client_accounts(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
      await sql`CREATE TABLE IF NOT EXISTS intake_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        access_token_hash text NOT NULL,
        case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
        filename text NOT NULL,
        blob_url text NOT NULL,
        mime_type text NOT NULL,
        size_bytes integer NOT NULL,
        extracted_text text NOT NULL DEFAULT '',
        analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS intake_documents_case_idx
        ON intake_documents (case_id, created_at)`;
    })();
  }
  return clientSchemaReady;
}

export function ensureLawyerWorkflowSchema() {
  if (!lawyerSchemaReady) {
    lawyerSchemaReady = (async () => {
      const sql = getLawyerDb();
      await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS first_consultation_price_cents integer`;
      await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS consultation_currency text NOT NULL DEFAULT 'EUR'`;
      await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS first_consultation_free boolean NOT NULL DEFAULT false`;
      await sql`UPDATE lawyers SET first_consultation_price_cents=(substring(price from '€([0-9]+)')::integer * 100),
        consultation_currency='EUR'
        WHERE first_consultation_price_cents IS NULL AND price ~ '€[0-9]+'`;
      await sql`UPDATE lawyers SET first_consultation_free=true, first_consultation_price_cents=0
        WHERE first_consultation_price_cents IS NULL AND lower(price) LIKE '%first%free%'`;
      await sql`CREATE TABLE IF NOT EXISTS inquiries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        external_case_id uuid NOT NULL,
        lawyer_id uuid NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
        client_name text NOT NULL,
        client_email text NOT NULL,
        brief jsonb NOT NULL DEFAULT '{}'::jsonb,
        meeting_time text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        lawyer_note text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(external_case_id, lawyer_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS calendar_settings (
        lawyer_id uuid PRIMARY KEY REFERENCES lawyers(id) ON DELETE CASCADE,
        provider text NOT NULL DEFAULT 'none',
        ical_url text NOT NULL DEFAULT '',
        timezone text NOT NULL DEFAULT 'Europe/Paris',
        duration_minutes integer NOT NULL DEFAULT 30,
        buffer_minutes integer NOT NULL DEFAULT 15,
        booking_days_ahead integer NOT NULL DEFAULT 14,
        weekly_hours jsonb NOT NULL DEFAULT '{"1":["09:00","17:00"],"2":["09:00","17:00"],"3":["09:00","17:00"],"4":["09:00","17:00"],"5":["09:00","17:00"]}'::jsonb,
        enabled boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS profile_research_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL REFERENCES lawyer_accounts(id) ON DELETE CASCADE,
        query text NOT NULL,
        draft jsonb NOT NULL DEFAULT '{}'::jsonb,
        sources jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS profile_research_account_created_idx
        ON profile_research_runs (account_id, created_at DESC)`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS meeting_start timestamptz`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS meeting_uid text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required'`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_amount_cents integer`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'EUR'`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text NOT NULL DEFAULT ''`;
      await sql`CREATE TABLE IF NOT EXISTS matter_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
        author_role text NOT NULL CHECK (author_role IN ('client','lawyer')),
        author_name text NOT NULL,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS matter_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
        uploader_role text NOT NULL CHECK (uploader_role IN ('client','lawyer')),
        uploader_name text NOT NULL,
        filename text NOT NULL,
        blob_url text NOT NULL,
        mime_type text NOT NULL,
        size_bytes integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE matter_files ADD COLUMN IF NOT EXISTS source_document_id uuid UNIQUE`;
      await sql`CREATE TABLE IF NOT EXISTS matter_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
        title text NOT NULL,
        assigned_to text NOT NULL CHECK (assigned_to IN ('client','lawyer')),
        status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
        due_date date,
        created_by text NOT NULL CHECK (created_by IN ('client','lawyer')),
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz
      )`;
      await sql`CREATE TABLE IF NOT EXISTS matter_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
        actor_role text NOT NULL CHECK (actor_role IN ('client','lawyer','system')),
        actor_name text NOT NULL,
        event_type text NOT NULL,
        description text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS matter_messages_inquiry_created_idx
        ON matter_messages (inquiry_id, created_at)`;
      await sql`CREATE INDEX IF NOT EXISTS matter_files_inquiry_created_idx
        ON matter_files (inquiry_id, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS matter_tasks_inquiry_status_idx
        ON matter_tasks (inquiry_id, status, due_date)`;
      await sql`CREATE INDEX IF NOT EXISTS matter_events_inquiry_created_idx
        ON matter_events (inquiry_id, created_at DESC)`;
      await sql`INSERT INTO matter_events
        (inquiry_id, actor_role, actor_name, event_type, description)
        SELECT i.id, 'system', 'Meet', 'matter', 'Shared matter workspace opened'
        FROM inquiries i
        WHERE i.status<>'payment_pending'
          AND NOT EXISTS (
            SELECT 1 FROM matter_events e WHERE e.inquiry_id=i.id
          )`;
    })();
  }
  return lawyerSchemaReady;
}
