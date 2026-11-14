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

- Access control lives in Postgres RLS via security-definer helpers (is_admin, is_staff, can_see_show/block/song); the client queries tables directly. Why: app access (musicians.ativo, toggled by admin) must be enforced server-side.
- Musicians link to auth users by matching email (triggers on musicians and auth.users); first signup becomes admin. Why: invite-by-link without an extra admin API.
- The client's useMe().isStaff must mirror the database's is_staff() (admin OR own musician with ativo). Why: the UI hides tabs from that flag, so any drift locks a released musician out of screens the backend already allows.
- Home-screen support uses a static manifest and Apple touch icon without an app-shell service worker. Why: installability is requested, but offline caching is not.
- Netlify deploys use Nitro's netlify preset, enabled only when NETLIFY=true in vite.config.ts. Why: Lovable builds must keep the Cloudflare default.
