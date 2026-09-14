-- Geschlossene und archivierte Themen sind zu – auch für die eigenen Beiträge.
--
-- Antworten liess die Datenbank dort schon nicht mehr zu, bearbeiten aber
-- schon: Wer einen Beitrag in einem archivierten Thema hatte, konnte ihn
-- weiter umschreiben. Ein Archiv, das sich nachträglich ändern lässt, ist
-- keins, und ein geschlossenes Thema, in dem sich die Beiträge noch bewegen,
-- auch nicht.
--
-- Die Moderation darf weiterhin: Sie muss etwa einen Namen oder eine
-- Telefonnummer auch aus einem alten Thema entfernen können.

drop policy if exists "Edit post" on public.forum_posts;

create policy "Edit post" on public.forum_posts
  for update
  to authenticated
  using (
    (
      created_by = auth.uid()
      and exists (
        select 1 from public.forum_threads t
        where t.id = forum_posts.thread_id
          and not t.is_locked
          and not t.is_archived
      )
    )
    or has_permission(auth.uid(), 'forum.moderate')
    or exists (
      select 1 from public.forum_threads t
      where t.id = forum_posts.thread_id
        and forum_can(t.category_id, 'mod')
    )
  );
