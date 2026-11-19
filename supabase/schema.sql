-- KEEPER — Personal Purchase & Warranty Manager (Supabase PostgreSQL Schema)
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text unique,
  currency_symbol text not null default '₹',
  expiring_threshold_days int not null default 30,
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_name text not null,
  brand text not null,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  purchase_date date not null,
  store text,
  warranty_months int not null default 12,
  warranty_expiry_override date,
  return_days int not null default 14,
  image_url text,
  serial_number text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  purchase_id uuid references public.purchases(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  storage_path text not null,
  invoice_number text,
  upload_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  purchase_id uuid references public.purchases(id) on delete set null,
  product_name text not null,
  title text not null,
  type text not null,
  due_date date not null,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  provider text not null,
  category text not null,
  plan_name text,
  amount numeric(12,2) not null check (amount >= 0),
  billing_cycle text not null,
  start_date date not null,
  next_billing_date date not null,
  auto_pay boolean not null default true,
  payment_method text not null,
  status text not null default 'active',
  mobile_number text,
  reminder_days_before int not null default 2,
  auto_create_reminder boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.purchases enable row level security;
alter table public.receipts enable row level security;
alter table public.reminders enable row level security;
alter table public.subscriptions enable row level security;

create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users manage own purchases" on public.purchases for all using (auth.uid() = user_id);
create policy "Users manage own receipts" on public.receipts for all using (auth.uid() = user_id);
create policy "Users manage own reminders" on public.reminders for all using (auth.uid() = user_id);
create policy "Users manage own subscriptions" on public.subscriptions for all using (auth.uid() = user_id);
