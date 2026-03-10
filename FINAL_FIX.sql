-- ==========================================
-- FINAL DATABASE FIX FOR ROOMFINDER
-- This fixes: 
-- 1. "New user not allowed" (Auto-profile creation)
-- 2. "Image not storing" (Storage bucket & policies)
-- 3. "Room details not storing" (Tables & RLS)
-- ==========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLEANUP (Optional - only if you want to start fresh)
-- DROP TABLE IF EXISTS public.bookmarks CASCADE;
-- DROP TABLE IF EXISTS public.rooms CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CREATE PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'finder' CHECK (role IN ('finder', 'owner')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price NUMERIC NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('1 BHK', '2 BHK', '3 BHK', 'Studio', '1 Bed', '2 Bed', '3 Bed')),
  tenant_preference TEXT NOT NULL CHECK (tenant_preference IN ('Bachelor', 'Family', 'Girls', 'Working')),
  contact_number TEXT NOT NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

-- ADD INDEX FOR PERFOMANCE
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_location ON public.rooms(location);

-- 5. SETUP STORAGE BUCKET
-- This creates the 'room-images' bucket automatically
INSERT INTO storage.buckets (id, name, public) 
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8. RLS POLICIES FOR ROOMS
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON public.rooms;
CREATE POLICY "Rooms are viewable by everyone" ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can insert own rooms" ON public.rooms;
CREATE POLICY "Owners can insert own rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own rooms" ON public.rooms;
CREATE POLICY "Owners can update own rooms" ON public.rooms FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own rooms" ON public.rooms;
CREATE POLICY "Owners can delete own rooms" ON public.rooms FOR DELETE USING (auth.uid() = owner_id);

-- 9. RLS POLICIES FOR STORAGE (CRITICAL FOR IMAGES)
-- Note: 'storage.objects' is where files are stored
DROP POLICY IF EXISTS "Authenticated users can upload room images" ON storage.objects;
CREATE POLICY "Authenticated users can upload room images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Public can view room images" ON storage.objects;
CREATE POLICY "Public can view room images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Authenticated users can delete own images" ON storage.objects;
CREATE POLICY "Authenticated users can delete own images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'room-images');

-- 10. AUTH TRIGGER (AUTO-PROFILE CREATION)
-- This is what fixes the "New user" errors and foreign key issues
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'finder')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- END OF SCRIPT
-- ==========================================
