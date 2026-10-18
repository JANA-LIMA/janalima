<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Access control lives in Postgres RLS via security-definer helpers (is_admin, is_staff, can_see_show/block/song); the client queries tables directly. Why: freela visibility (3 days after show) must be enforced server-side.
- Musicians link to auth users by matching email (triggers on musicians and auth.users); first signup becomes admin. Why: invite-by-link without an extra admin API.
- Presence answers go through responder_show / responder_ensaio RPCs, never direct updates. Why: musicians may only change their own status.
