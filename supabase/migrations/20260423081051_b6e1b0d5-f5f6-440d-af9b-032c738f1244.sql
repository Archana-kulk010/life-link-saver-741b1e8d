DROP POLICY IF EXISTS "Authenticated can create matches" ON public.request_matches;

CREATE POLICY "Admins or matched donor can create matches"
  ON public.request_matches FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = donor_user_id
  );