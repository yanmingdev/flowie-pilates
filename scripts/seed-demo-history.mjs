// Called only by the local demo bootstrap. Run each student's historic fixture atomically.
export async function seedDemoHistory(db, studioId, adminId, studentIds) {
  const session = await db.query(
    `select s.id,s.starts_at,c.credit_cost from public.class_sessions s
    join public.courses c on c.id=s.course_id where s.studio_id=$1 and s.status='completed'
    and s.starts_at<now() order by s.starts_at desc limit 1`,
    [studioId],
  );
  if (!session.rows.length) return 0;
  const s = session.rows[0];
  let created = 0;
  for (const [index, studentId] of studentIds.slice(0, 3).entries()) {
    await db.query('begin');
    try {
      const prior = await db.query(
        'select id from public.bookings where studio_id=$1 and student_id=$2 and session_id=$3',
        [studioId, studentId, s.id],
      );
      if (prior.rows.length) {
        await db.query('commit');
        continue;
      }
      const pkg = await db.query(
        `select id from public.student_packages where studio_id=$1 and student_id=$2 and balance >= $3 and starts_at <= $4 and expires_at > $4 order by expires_at limit 1 for update`,
        [studioId, studentId, s.credit_cost, s.starts_at],
      );
      if (!pkg.rows.length) {
        await db.query('rollback');
        continue;
      }
      const booking = await db.query(
        `insert into public.bookings(studio_id,session_id,student_id,student_package_id,credits_charged,status,cancellation_deadline_at)
        values($1,$2,$3,$4,$5,'completed',$6::timestamptz-interval '12 hours') returning id`,
        [studioId, s.id, studentId, pkg.rows[0].id, s.credit_cost, s.starts_at],
      );
      await db.query('update public.student_packages set balance=balance-$1 where id=$2', [
        s.credit_cost,
        pkg.rows[0].id,
      ]);
      await db.query(
        `insert into public.credit_ledger(studio_id,student_id,student_package_id,booking_id,entry_type,delta,operator_id,idempotency_key,note)
        values($1,$2,$3,$4,'BOOKING_DEBIT',-($5::integer),$2,$6,'本機補建歷史示範紀錄')`,
        [
          studioId,
          studentId,
          pkg.rows[0].id,
          booking.rows[0].id,
          s.credit_cost,
          'demo-history:' + booking.rows[0].id,
        ],
      );
      await db.query(
        'insert into public.attendance(studio_id,booking_id,status,marked_by) values($1,$2,$3,$4)',
        [studioId, booking.rows[0].id, index === 2 ? 'absent' : 'present', adminId],
      );
      await db.query('commit');
      created++;
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
  }
  return created;
}
