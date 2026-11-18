import { resolvePublicAssetUrl } from '../../../shared/config/assets';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/http-client';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { Loading } from '../../../shared/ui/Loading';
type Teacher = { id: string; name: string; photo_url: string | null };

/** 呈現公開老師介紹；維持現有角色與互動規則。 */ export function Teachers() {
  const teachers = useQuery({
    queryKey: ['teachers', 'public'],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<Teacher[]>('/teachers/public'),
  });
  return (
    <main className="page">
      <div className="page-intro">
        <span className="eyebrow">MEET OUR TEACHERS</span>
        <h1>師資介紹</h1>
        <p>與 Flowie 的老師一起，找到適合自己的練習節奏。</p>
      </div>
      {teachers.isError ? (
        <ErrorNote
          error={teachers.error}
          retry={
            /** 重新載入本區塊查詢，提供連線失敗後的重試入口。 */ () => {
              void teachers.refetch();
            }
          }
        />
      ) : teachers.isLoading ? (
        <Loading />
      ) : teachers.data?.length ? (
        <div className="cards-grid knowledge-grid">
          {teachers.data.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (teacher) => (
              <article className="class-card teacher-profile" key={teacher.id}>
                {teacher.photo_url ? (
                  <img
                    src={resolvePublicAssetUrl(teacher.photo_url)}
                    alt={`${teacher.name}老師`}
                    loading="lazy"
                  />
                ) : (
                  <div className="teacher-placeholder" aria-hidden="true">
                    ✳
                  </div>
                )}
                <div className="class-body">
                  <span className="eyebrow">FLOWIE TEACHER</span>
                  <h2>{teacher.name}</h2>
                </div>
              </article>
            ),
          )}
        </div>
      ) : (
        <Empty title="師資介紹即將上線" />
      )}
    </main>
  );
}
