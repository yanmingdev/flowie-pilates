-- A room can be resized without rewriting historical sessions. The catalog and
-- booking transaction use the smaller of room capacity and session capacity.
create function public.validate_room_capacity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.capacity<old.capacity and exists(
   select s.id from public.class_sessions s join public.bookings b on b.session_id=s.id and b.status in ('confirmed','completed','no_show')
   where s.room_id=new.id and s.studio_id=new.studio_id and s.status='scheduled' and s.starts_at>now()
   group by s.id having count(*)>new.capacity
 ) then raise exception 'ROOM_CAPACITY_BELOW_BOOKINGS'; end if;
 return new;
end $$;
create trigger validate_room_capacity before update of capacity on public.rooms for each row execute function public.validate_room_capacity();
revoke all on function public.validate_room_capacity() from public,anon,authenticated;
