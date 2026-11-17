import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Empty, ErrorNote, Loading } from '../components/Ui';
type Teacher = { id: string; name: string; photo_url: string | null };
export function Teachers() {
  const teachers = useQuery({ queryKey: ['teachers', 'public'], queryFn: () => api<Teacher[]>('/teachers/public') });
  return <main className="page">
    <div className="page-intro"><span className="eyebrow">MEET OUR TEACHERS</span><h1>師資介紹</h1><p>與 Flowie 的老師一起，找到適合自己的練習節奏。</p></div>
    {teachers.isError ? <ErrorNote error={teachers.error} retry={() => { void teachers.refetch(); }} /> : teachers.isLoading ? <Loading /> : teachers.data?.length ?
      <div className="cards-grid knowledge-grid">{teachers.data.map((teacher) => <article className="class-card teacher-profile" key={teacher.id}>
        {teacher.photo_url ? <img src={teacher.photo_url} alt={`${teacher.name}老師`} loading="lazy" /> : <div className="teacher-placeholder" aria-hidden="true">✳</div>}
        <div className="class-body"><span className="eyebrow">FLOWIE TEACHER</span><h2>{teacher.name}</h2></div>
      </article>)}</div> : <Empty title="師資介紹即將上線" />}
  </main>;
}
