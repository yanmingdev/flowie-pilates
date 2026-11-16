import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  WalletCards,
  ClipboardList,
  Heart,
  UserRound,
} from 'lucide-react';
import { api, qs } from '../services/api';
import { useApp, useStudioQuery } from '../services/context';
import { range, type Session } from '../services/types';
import { ClassCard, Empty, ErrorNote, Heading, Loading } from '../components/Ui';
import { Button } from '../components/ui/button';
type Section = {
  section_type: string;
  title: string;
  subtitle: string;
  sort_order: number;
  is_active: boolean;
  image_url: string | null;
  link_url: string | null;
};
export function Home() {
  const { studio, brandLoading, brandError, retryBrand } = useApp();
  const navigate = useNavigate();
  const sections = useStudioQuery<Section[]>('homepage-sections');
  const ann = useStudioQuery<any[]>('announcements');
  const dates = range(0, 30);
  const publicTeachers = useQuery({
    queryKey: ['public-teachers', studio?.id],
    queryFn: () => api<any[]>(`/teachers/public?studio_id=${studio!.id}`),
    enabled: !!studio,
  });
  const sessions = useQuery({
    queryKey: ['sessions', studio?.id, 'home'],
    queryFn: () => api<Session[]>(`/sessions?${qs({ studio_id: studio!.id, ...dates })}`),
    enabled: !!studio,
  });
  const active = (sections.data || [])
    .filter((x) => x.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  return (
    <main className="page home-page">
      {!studio && brandLoading && (
        <div className="empty">
          <h2>正在連線 Flowie</h2>
          <p>請確認後端與 Supabase 已啟動，並檢查環境變數。</p>
        </div>
      )}
      {!studio && !!brandError && <div className="error-note" role="alert">無法連線至 Flowie，請檢查後端與 Supabase 設定。 <button onClick={retryBrand}>重新載入</button></div>}
      {!studio && !brandLoading && !brandError && <Empty title="尚未設定品牌資料" description="請確認 site_settings 中已有品牌設定。" />}
      {sections.isError && <ErrorNote error={sections.error} retry={() => { void sections.refetch(); }} />}
      {sections.isLoading && studio && <Loading />}
      {active.map((section) => {
        if (section.section_type === 'hero') {
          const configuredLink = section.link_url || '/classes';
          const href =
            (configuredLink.startsWith('/') && !configuredLink.startsWith('//')) ||
            configuredLink.startsWith('https://')
              ? configuredLink
              : '/classes';
          return (
            <section
              className="hero"
              key={section.section_type}
              style={
                section.image_url
                  ? {
                      backgroundImage: `linear-gradient(90deg,rgba(247,243,238,.94),rgba(247,243,238,.15) 70%),url(${JSON.stringify(section.image_url)})`,
                    }
                  : undefined
              }
            >
              <div className="hero-content">
                <h1>{section.title}</h1>
                <p>{section.subtitle}</p>
                <Button asChild>
                  <a href={href}>
                    預約課程 <ArrowRight size={17} />
                  </a>
                </Button>
              </div>
            </section>
          );
        }
        if (section.section_type === 'quick_booking')
          return (
            <section
              className="home-shortcuts"
              key={section.section_type}
              aria-label={section.title || '功能捷徑'}
            >
              {[
                { to: '/classes', label: '預約課程', Icon: CalendarDays },
                { to: '/credits', label: '我的堂數', Icon: WalletCards },
                { to: '/history', label: '上課紀錄', Icon: ClipboardList },
                { to: '/favorites', label: '收藏課程', Icon: Heart },
                { to: '/account', label: '個人帳戶', Icon: UserRound },
              ].map(({ to, label, Icon }) => (
                <Link to={to} key={to}>
                  <span>
                    <Icon size={23} strokeWidth={1.6} />
                  </span>
                  <small>{label}</small>
                </Link>
              ))}
            </section>
          );
        if (section.section_type === 'courses')
          return (
            <section className="content-section" key={section.section_type}>
              <Heading
                eyebrow="YOUR NEXT MOMENT"
                title={section.title}
                description={section.subtitle}
                action={
                  <Link className="text-link" to="/classes">
                    查看全部 <ArrowRight size={17} />
                  </Link>
                }
              />
              {sessions.isLoading ? (
                <Loading />
              ) : sessions.isError ? (
                <ErrorNote error={sessions.error} retry={() => { void sessions.refetch(); }} />
              ) : sessions.data?.length ? (
                <div className="cards-grid">
                  {sessions.data.slice(0, 3).map((s) => (
                    <ClassCard
                      key={s.id}
                      session={s}
                      onSelect={() => navigate(`/classes?session=${encodeURIComponent(s.id)}`)}
                    />
                  ))}
                </div>
              ) : (
                <Empty title="近期尚無課程" description="請稍後再回來看看。" />
              )}
            </section>
          );
        if (section.section_type === 'teachers') {
          const teachers = (publicTeachers.data || []).slice(0, 4);
          return (
            <section className="content-section teachers-section" key={section.section_type}>
              <Heading
                eyebrow="MOVE WITH US"
                title={section.title}
                description={section.subtitle}
              />
              {publicTeachers.isError ? <ErrorNote error={publicTeachers.error} retry={() => { void publicTeachers.refetch(); }} /> : publicTeachers.isLoading ? <Loading /> : teachers.length ? (
                <div className="teacher-grid">
                  {teachers.map((t, i) => (
                    <div className="teacher-card" key={t.id}>
                      <div
                        className={`teacher-art teacher-art-${i % 4}`}
                        style={
                          t.photo_url
                            ? { backgroundImage: `url(${JSON.stringify(t.photo_url)})` }
                            : undefined
                        }
                      >
                        <span>✳</span>
                      </div>
                      <strong>{t.name}</strong>
                      <small>FLOWIE TEACHER</small>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="尚無老師資料" />
              )}
            </section>
          );
        }
        if (section.section_type === 'announcements')
          return (
            <section className="content-section" key={section.section_type}>
              <Heading
                eyebrow="FLOWIE NOTES"
                title={section.title}
                description={section.subtitle}
              />
              {ann.isError ? <ErrorNote error={ann.error} retry={() => { void ann.refetch(); }} /> : ann.isLoading ? <Loading /> : ann.data?.length ? (
                <div className="announcement-list">
                  {ann.data
                    .filter(
                      (a) =>
                        a.is_active &&
                        (!a.starts_at || new Date(a.starts_at) <= new Date()) &&
                        (!a.ends_at || new Date(a.ends_at) > new Date()),
                    )
                    .map((a) => (
                      <article key={a.id}>
                        <span>NEWS</span>
                        <div>
                          <strong>{a.title}</strong>
                          <p>{a.content}</p>
                        </div>
                      </article>
                    ))}
                </div>
              ) : (
                <Empty title="目前沒有新消息" />
              )}
            </section>
          );
        return null;
      })}
    </main>
  );
}
