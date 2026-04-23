-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'donor');
CREATE TYPE public.blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Bombay');
CREATE TYPE public.urgency_level AS ENUM ('critical', 'urgent', 'normal');
CREATE TYPE public.request_status AS ENUM ('pending', 'matched', 'completed', 'cancelled');
CREATE TYPE public.match_response AS ENUM ('pending', 'accepted', 'declined');

-- =========================
-- HELPER: updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- DONORS
-- =========================
CREATE TABLE public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  blood_type public.blood_type NOT NULL,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  last_donation_date DATE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_rare BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_donors_blood_type ON public.donors(blood_type);
CREATE INDEX idx_donors_city ON public.donors(city);
CREATE INDEX idx_donors_available ON public.donors(is_available);

CREATE POLICY "Anyone can view available donors"
  ON public.donors FOR SELECT
  USING (true);

CREATE POLICY "Users can register themselves as donor"
  ON public.donors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donors can update own profile"
  ON public.donors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any donor"
  ON public.donors FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Donors can delete own profile"
  ON public.donors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_donors_updated_at
  BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- EMERGENCY REQUESTS
-- =========================
CREATE TABLE public.emergency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  blood_type_needed public.blood_type NOT NULL,
  hospital_name TEXT NOT NULL,
  hospital_location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  urgency public.urgency_level NOT NULL DEFAULT 'urgent',
  search_radius_km INTEGER NOT NULL DEFAULT 10,
  status public.request_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  contact_phone TEXT,
  units_needed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_requests_status ON public.emergency_requests(status);
CREATE INDEX idx_requests_blood_type ON public.emergency_requests(blood_type_needed);
CREATE INDEX idx_requests_created ON public.emergency_requests(created_at DESC);

CREATE POLICY "Anyone can view active requests"
  ON public.emergency_requests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can create requests"
  ON public.emergency_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_user_id);

CREATE POLICY "Requester can update own request"
  ON public.emergency_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Requester or admin can delete"
  ON public.emergency_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- REQUEST MATCHES (donor ↔ request notifications)
-- =========================
CREATE TABLE public.request_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  donor_user_id UUID NOT NULL,
  distance_km DOUBLE PRECISION,
  response public.match_response NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, donor_id)
);

ALTER TABLE public.request_matches ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_matches_donor_user ON public.request_matches(donor_user_id);
CREATE INDEX idx_matches_request ON public.request_matches(request_id);

CREATE POLICY "Donor can view own matches"
  ON public.request_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = donor_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Requester can view matches for own request"
  ON public.request_matches FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.emergency_requests r
    WHERE r.id = request_id AND r.requester_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated can create matches"
  ON public.request_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Donor can update own match response"
  ON public.request_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = donor_user_id OR public.has_role(auth.uid(), 'admin'));

-- =========================
-- AUTO-ASSIGN DONOR ROLE ON SIGNUP
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'donor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();