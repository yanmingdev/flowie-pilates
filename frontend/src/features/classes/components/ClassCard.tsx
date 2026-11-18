import { resolvePublicAssetUrl } from '../../../shared/config/assets';
import { ArrowRight, MapPin, UserRound, Clock } from 'lucide-react';
import { type Session } from '../../../shared/types/models';
import { FavoriteButton } from '../../favorites/components/FavoriteButton';
import { dateTime, shortTime } from '../../../shared/utils/date-time';

/** 呈現公開場次資訊、收藏與預約入口；維持現有角色與互動規則。 */ export function ClassCard({
  session,
  onSelect,
}: {
  session: Session;
  onSelect: (s: Session) => void;
}) {
  const remaining = Math.max(0, session.capacity - Number(session.booked_count));
  return (
    <article className="class-card">
      <div
        className={`class-art ${session.course_image ? 'has-image' : ''}`}
        style={
          session.course_image
            ? {
                backgroundImage: `linear-gradient(0deg,rgba(55,64,52,.16),transparent),url(${JSON.stringify(resolvePublicAssetUrl(session.course_image))})`,
              }
            : undefined
        }
      >
        <span className="art-label">FLOWIE STUDIO</span>
        <span className="art-flower">✳</span>
        <span className="art-number">
          {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', day: '2-digit' }).format(
            new Date(session.starts_at),
          )}
        </span>
      </div>
      <div className="class-body">
        <div className="class-date">
          {dateTime(session.starts_at)} — {shortTime(session.ends_at)}
        </div>
        <h3>{session.course_name}</h3>
        <div className="class-meta">
          <span>
            <UserRound size={14} />
            {session.teacher_name}
          </span>
          <span>
            <MapPin size={14} />
            {session.branch_name}・{session.room_name}
          </span>
          <span>
            <Clock size={14} />
            {session.credit_cost} 堂
          </span>
        </div>
        <div className="class-footer">
          <FavoriteButton courseId={session.course_id} />
          <span className={remaining ? 'availability' : 'unavailable'}>
            {remaining ? `剩餘 ${remaining} 個名額` : '已額滿'}
          </span>
          <button
            className="round-link"
            aria-label={`查看${session.course_name}`}
            onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => onSelect(session)}
          >
            <span>預約</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
