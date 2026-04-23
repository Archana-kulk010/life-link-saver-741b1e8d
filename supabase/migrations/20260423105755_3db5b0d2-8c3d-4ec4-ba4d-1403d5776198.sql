
-- Allow anonymous users to create emergency requests
DROP POLICY IF EXISTS "Authenticated can create requests" ON public.emergency_requests;

CREATE POLICY "Anyone can create requests"
ON public.emergency_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Drop FK constraint so demo donors and multi-donor-per-device work
ALTER TABLE public.donors DROP CONSTRAINT IF EXISTS donors_user_id_fkey;

-- Seed 5 demo donors (idempotent)
INSERT INTO public.donors (id, user_id, name, phone, blood_type, city, latitude, longitude, last_donation_date, is_available, is_rare)
VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Aarav Sharma',  '+91 9876500001', 'O+',  'Mumbai',    19.0760, 72.8777, NULL, true, false),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Priya Patel',   '+91 9876500002', 'A+',  'Delhi',     28.6139, 77.2090, NULL, true, false),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Rohan Verma',   '+91 9876500003', 'B+',  'Bengaluru', 12.9716, 77.5946, NULL, true, false),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Ananya Iyer',   '+91 9876500004', 'AB+', 'Chennai',    13.0827, 80.2707, NULL, true, false),
  ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Vikram Singh',  '+91 9876500005', 'O-',  'Pune',       18.5204, 73.8567, NULL, true, true)
ON CONFLICT (id) DO NOTHING;
