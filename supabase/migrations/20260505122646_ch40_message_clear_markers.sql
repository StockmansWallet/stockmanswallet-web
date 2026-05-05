create table if not exists public.ch40_message_clear_markers (
    connection_id uuid not null references public.connection_requests(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    cleared_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (connection_id, user_id)
);

alter table public.ch40_message_clear_markers enable row level security;

create index if not exists idx_ch40_message_clear_markers_user
    on public.ch40_message_clear_markers(user_id, updated_at desc);

create policy "ch40_message_clear_markers_select"
    on public.ch40_message_clear_markers
    for select
    using (user_id = auth.uid());

create policy "ch40_message_clear_markers_insert"
    on public.ch40_message_clear_markers
    for insert
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.connection_requests cr
            where cr.id = connection_id
              and cr.connection_type = 'producer_peer'
              and cr.status = 'approved'
              and (
                  cr.requester_user_id = auth.uid()
                  or cr.target_user_id = auth.uid()
              )
        )
    );

create policy "ch40_message_clear_markers_update"
    on public.ch40_message_clear_markers
    for update
    using (user_id = auth.uid())
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.connection_requests cr
            where cr.id = connection_id
              and cr.connection_type = 'producer_peer'
              and cr.status = 'approved'
              and (
                  cr.requester_user_id = auth.uid()
                  or cr.target_user_id = auth.uid()
              )
        )
    );
