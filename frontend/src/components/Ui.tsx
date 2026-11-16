import { X, ArrowRight, MapPin, UserRound, Clock } from 'lucide-react';
import type { Session } from '../services/types';
import { FavoriteButton } from './FavoriteButton';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from './ui/dialog';
import { dateTime, shortTime } from '../services/types';
export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="empty">
      <div className="empty-flower">✳</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
export function ErrorNote({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="error-note">
      {error instanceof Error ? error.message : '資料載入失敗，請稍後再試。'}
      {retry && <button type="button" onClick={retry}>重新載入</button>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent aria-describedby={undefined}>
          <div className="modal-heading">
            <DialogTitle>{title}</DialogTitle>
            <DialogClose asChild>
              <button className="icon-button" aria-label="關閉">
                <X size={20} />
              </button>
            </DialogClose>
          </div>
          {children}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function ClassCard({
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
                backgroundImage: `linear-gradient(0deg,rgba(55,64,52,.16),transparent),url(${JSON.stringify(session.course_image)})`,
              }
            : undefined
        }
      >
        <span className="art-label">FLOWIE STUDIO</span>
        <span className="art-flower">✳</span>
        <span className="art-number">
          {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', day: '2-digit' }).format(new Date(session.starts_at))}
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
            onClick={() => onSelect(session)}
          >
            <span>預約</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
export function Loading() {
  return (
    <div className="loading-grid">
      <div />
      <div />
      <div />
    </div>
  );
}
