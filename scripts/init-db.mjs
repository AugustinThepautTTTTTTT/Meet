import { neon } from "@neondatabase/serverless";

const clientUrl = process.env.CLIENT_DATABASE_URL;
const lawyerUrl = process.env.LAWYER_DATABASE_URL;
if (!clientUrl || !lawyerUrl)
  throw new Error("Both database URLs are required");

const clients = neon(clientUrl);
const lawyersDb = neon(lawyerUrl);

await clients`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
await clients`CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem text NOT NULL,
  category text NOT NULL DEFAULT 'Not sure',
  detected_practice text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS brief jsonb NOT NULL DEFAULT '{}'::jsonb`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'intake'`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_email text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS selected_lawyer_slug text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS selected_lawyer_name text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS meeting_time text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required'`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_amount_cents integer`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'EUR'`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS stripe_checkout_url text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text NOT NULL DEFAULT ''`;
await clients`ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
await clients`CREATE TABLE IF NOT EXISTS intake_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), access_token_hash text NOT NULL,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE, filename text NOT NULL,
  blob_url text NOT NULL, mime_type text NOT NULL, size_bytes integer NOT NULL,
  extracted_text text NOT NULL DEFAULT '', analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
)`;
await clients`CREATE INDEX IF NOT EXISTS intake_documents_case_idx ON intake_documents (case_id, created_at)`;
await clients`CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_name text NOT NULL,
  client_name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
)`;

await lawyersDb`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
await lawyersDb`CREATE TABLE IF NOT EXISTS lawyer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text UNIQUE NOT NULL,
  password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
)`;
await lawyersDb`CREATE TABLE IF NOT EXISTS lawyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, initials text NOT NULL,
  name text NOT NULL, specialty text NOT NULL, practice text NOT NULL, location text NOT NULL,
  languages text NOT NULL, match integer NOT NULL DEFAULT 92, price text NOT NULL,
  first_consultation_price_cents integer,
  consultation_currency text NOT NULL DEFAULT 'EUR',
  first_consultation_free boolean NOT NULL DEFAULT false,
  availability text NOT NULL, accent text NOT NULL DEFAULT 'blue', reasons text[] NOT NULL DEFAULT '{}',
  bio text NOT NULL, experience text NOT NULL, credentials text NOT NULL, tags text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}', published boolean NOT NULL DEFAULT false,
  featured_rank integer NOT NULL DEFAULT 100, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS account_id uuid UNIQUE REFERENCES lawyer_accounts(id) ON DELETE SET NULL`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS profile_photo_url text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS cover_photo_url text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS firm_name text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS linkedin text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS education text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS awards text[] NOT NULL DEFAULT '{}'`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}'`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS consultation_format text NOT NULL DEFAULT 'Video or in person'`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS photo_settings jsonb NOT NULL DEFAULT '{"position":50,"zoom":100}'::jsonb`;
await lawyersDb`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS cover_settings jsonb NOT NULL DEFAULT '{"position":50,"zoom":100}'::jsonb`;
await lawyersDb`CREATE TABLE IF NOT EXISTS profile_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES lawyer_accounts(id) ON DELETE CASCADE,
  query text NOT NULL, draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
)`;
await lawyersDb`CREATE INDEX IF NOT EXISTS profile_research_account_created_idx ON profile_research_runs (account_id, created_at DESC)`;
await lawyersDb`UPDATE lawyers SET first_consultation_price_cents=(substring(price from '€([0-9]+)')::integer * 100),
  consultation_currency='EUR' WHERE first_consultation_price_cents IS NULL AND price ~ '€[0-9]+'`;
await lawyersDb`UPDATE lawyers SET first_consultation_free=true, first_consultation_price_cents=0
  WHERE first_consultation_price_cents IS NULL AND lower(price) LIKE '%first%free%'`;
await lawyersDb`CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lawyer_id uuid NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
  title text NOT NULL, body text NOT NULL, published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
)`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_url text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '[]'::jsonb`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'editorial'`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_note text NOT NULL DEFAULT ''`;
await lawyersDb`ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_settings jsonb NOT NULL DEFAULT '{"position":50,"zoom":100}'::jsonb`;
await lawyersDb`UPDATE posts SET slug=trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text,6) WHERE slug=''`;
await lawyersDb`CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_case_id uuid NOT NULL,
  lawyer_id uuid NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
  client_name text NOT NULL, client_email text NOT NULL, brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  meeting_time text NOT NULL, status text NOT NULL DEFAULT 'pending', lawyer_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_case_id, lawyer_id)
)`;
await lawyersDb`CREATE TABLE IF NOT EXISTS matter_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('client','lawyer')), author_name text NOT NULL,
  body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
)`;
await lawyersDb`CREATE TABLE IF NOT EXISTS matter_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  uploader_role text NOT NULL CHECK (uploader_role IN ('client','lawyer')), uploader_name text NOT NULL,
  filename text NOT NULL, blob_url text NOT NULL, mime_type text NOT NULL, size_bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)`;
await lawyersDb`ALTER TABLE matter_files ADD COLUMN IF NOT EXISTS source_document_id uuid UNIQUE`;
await lawyersDb`CREATE TABLE IF NOT EXISTS matter_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  title text NOT NULL, assigned_to text NOT NULL CHECK (assigned_to IN ('client','lawyer')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')), due_date date,
  created_by text NOT NULL CHECK (created_by IN ('client','lawyer')), created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
)`;
await lawyersDb`CREATE TABLE IF NOT EXISTS matter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('client','lawyer','system')), actor_name text NOT NULL,
  event_type text NOT NULL, description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
)`;
await lawyersDb`CREATE INDEX IF NOT EXISTS matter_messages_inquiry_created_idx ON matter_messages (inquiry_id, created_at)`;
await lawyersDb`CREATE INDEX IF NOT EXISTS matter_files_inquiry_created_idx ON matter_files (inquiry_id, created_at DESC)`;
await lawyersDb`CREATE INDEX IF NOT EXISTS matter_tasks_inquiry_status_idx ON matter_tasks (inquiry_id, status, due_date)`;
await lawyersDb`CREATE INDEX IF NOT EXISTS matter_events_inquiry_created_idx ON matter_events (inquiry_id, created_at DESC)`;
await lawyersDb`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required'`;
await lawyersDb`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_amount_cents integer`;
await lawyersDb`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'EUR'`;
await lawyersDb`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text NOT NULL DEFAULT ''`;

const profiles = [
  [
    "ana-martins",
    "AM",
    "Ana Martins",
    "Employment & workplace",
    "Employment",
    "Paris",
    "English, French, Portuguese",
    97,
    "€180 / consultation",
    "Today at 16:30",
    "coral",
    ["Unfair dismissal specialist", "Employee-side representation"],
    "I help employees and growing teams resolve workplace disputes with clarity, empathy and a practical plan forward.",
    "12 years",
    "Paris Bar · Verified",
    ["Dismissal", "Discrimination", "Workplace rights"],
    [
      "job",
      "employer",
      "fired",
      "dismissed",
      "salary",
      "workplace",
      "harassment",
    ],
    1,
    "What to do before signing a termination agreement",
  ],
  [
    "jonas-lindberg",
    "JL",
    "Jonas Lindberg",
    "Commercial contracts & startups",
    "Business",
    "Remote",
    "English, Swedish",
    94,
    "€150 / consultation",
    "Tomorrow at 09:00",
    "blue",
    ["Founder-friendly advice", "Practical, direct approach"],
    "I advise founders and small businesses on contracts, funding, partnerships and the decisions that shape a company’s future.",
    "9 years",
    "Stockholm Bar · Verified",
    ["Startups", "Contracts", "Shareholders"],
    [
      "startup",
      "founder",
      "company",
      "business",
      "shareholder",
      "investment",
      "commercial",
    ],
    2,
    "Five clauses every founder should understand",
  ],
  [
    "sarah-khelifi",
    "SK",
    "Sarah Khelifi",
    "Immigration & nationality",
    "Immigration",
    "Lyon",
    "English, French, Arabic",
    96,
    "First call free",
    "Tomorrow at 14:00",
    "gold",
    ["Visa and residency specialist", "Multilingual support"],
    "I guide individuals and families through visas, residency, nationality and appeals with calm, transparent advice.",
    "11 years",
    "Lyon Bar · Verified",
    ["Visas", "Residency", "Citizenship"],
    ["visa", "immigration", "residency", "citizenship", "permit", "asylum"],
    3,
    "Preparing a strong residence permit application",
  ],
  [
    "claire-dubois",
    "CD",
    "Claire Dubois",
    "Family & divorce",
    "Family",
    "Brussels",
    "English, French, Dutch",
    95,
    "€170 / consultation",
    "Today at 18:00",
    "lilac",
    ["Complex divorce experience", "Calm, mediation-first style"],
    "I help families navigate separation, custody and financial agreements while protecting what matters most.",
    "14 years",
    "Brussels Bar · Verified",
    ["Divorce", "Custody", "Mediation"],
    ["divorce", "separation", "custody", "child", "marriage", "family"],
    4,
    "How to prepare for a first family mediation",
  ],
  [
    "marc-benali",
    "MB",
    "Marc Benali",
    "Housing & tenancy",
    "Housing",
    "Marseille",
    "English, French, Arabic",
    93,
    "€120 / consultation",
    "Friday at 10:30",
    "mint",
    ["Tenant rights advocate", "Fast emergency advice"],
    "I represent tenants and property owners in rental disputes, unsafe housing matters and eviction proceedings.",
    "8 years",
    "Marseille Bar · Verified",
    ["Eviction", "Rent disputes", "Property"],
    ["rent", "tenant", "landlord", "eviction", "deposit", "lease"],
    5,
    "What your landlord must do before an eviction",
  ],
  [
    "sofia-petrov",
    "SP",
    "Sofia Petrov",
    "Criminal defence",
    "Criminal",
    "Berlin",
    "English, German, Bulgarian",
    98,
    "€220 / consultation",
    "Available now",
    "rose",
    ["Urgent defence available", "Trial and investigation experience"],
    "I provide discreet, rigorous defence from the first police interview through trial and appeal.",
    "15 years",
    "Berlin Bar · Verified",
    ["Police interviews", "Defence", "Appeals"],
    ["police", "arrested", "criminal", "charge", "court", "accused", "fraud"],
    6,
    "Your rights during a police interview",
  ],
  [
    "elena-varga",
    "EV",
    "Elena Varga",
    "Personal injury",
    "Injury",
    "Madrid",
    "English, Spanish, Hungarian",
    92,
    "No win, no fee",
    "Tomorrow at 11:00",
    "peach",
    ["Accident compensation", "No-win, no-fee option"],
    "I help injured people secure fair compensation after accidents, medical mistakes and unsafe working conditions.",
    "10 years",
    "Madrid Bar · Verified",
    ["Accidents", "Medical injury", "Compensation"],
    ["accident", "injury", "hospital", "medical", "compensation", "insurance"],
    7,
    "Evidence to collect after an accident",
  ],
  [
    "romain-hart",
    "RH",
    "Romain Hart",
    "Wills, probate & estates",
    "Estates",
    "London",
    "English, French",
    91,
    "€160 / consultation",
    "Monday at 09:30",
    "sage",
    ["Cross-border estates", "Sensitive, clear guidance"],
    "I make estate planning understandable and support families through probate and inheritance disputes.",
    "13 years",
    "Solicitor · SRA verified",
    ["Wills", "Probate", "Inheritance"],
    ["will", "inheritance", "estate", "probate", "death", "trust"],
    8,
    "When a cross-border will needs updating",
  ],
  [
    "noor-khan",
    "NK",
    "Noor Khan",
    "Technology, IP & privacy",
    "Technology",
    "Amsterdam",
    "English, Dutch, Urdu",
    94,
    "€195 / consultation",
    "Thursday at 15:00",
    "sky",
    ["Product and AI expertise", "Clear commercial thinking"],
    "I work with product teams on intellectual property, privacy, AI governance and technology agreements.",
    "8 years",
    "Amsterdam Bar · Verified",
    ["Privacy", "AI", "Intellectual property"],
    [
      "technology",
      "software",
      "privacy",
      "data",
      "trademark",
      "copyright",
      "patent",
      "ai",
    ],
    9,
    "Who owns work created with generative AI?",
  ],
];

for (const p of profiles) {
  const [lawyer] = await lawyersDb`
    INSERT INTO lawyers (slug,initials,name,specialty,practice,location,languages,match,price,availability,accent,reasons,bio,experience,credentials,tags,keywords,published,featured_rank)
    VALUES (${p[0]},${p[1]},${p[2]},${p[3]},${p[4]},${p[5]},${p[6]},${p[7]},${p[8]},${p[9]},${p[10]},${p[11]},${p[12]},${p[13]},${p[14]},${p[15]},${p[16]},true,${p[17]})
    ON CONFLICT (slug) DO UPDATE SET published=true, updated_at=now() RETURNING id
  `;
  const existing =
    await lawyersDb`SELECT id FROM posts WHERE lawyer_id=${lawyer.id} AND title=${p[18]} LIMIT 1`;
  if (!existing.length)
    await lawyersDb`INSERT INTO posts (lawyer_id,title,body,published) VALUES (${lawyer.id},${p[18]},${`A practical guide from ${p[2]} with clear next steps.`},true)`;
}

console.log(
  "Initialized client and lawyer databases with nine published profiles.",
);
