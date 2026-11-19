import { Link, useNavigate, useParams } from 'react-router-dom';
import { allExerciseEntries, findExercise, type ExerciseEntry, type ExerciseSource } from '../content';
import { Playground } from '../components/Playground';
import { logActivity, toggleFavorite } from '../store/progress';
import { useFavorites, usePassedExercises } from '../store/hooks';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Play, Star } from 'lucide-react';

const SOURCE_LABEL: Record<ExerciseSource, string> = { chapter: '入門課程', mastery: '精熟挑戰', drill: '題型特訓' };
const SOURCES: ExerciseSource[] = ['chapter', 'mastery', 'drill'];

/** 收藏的題目，依課程順序（章節 → 精熟 → 題型特訓） */
function useFavoriteEntries(): ExerciseEntry[] {
  const favs = useFavorites();
  return allExerciseEntries().filter((e) => favs.has(e.exercise.id));
}

export function FavoritesPage() {
  const list = useFavoriteEntries();
  const passed = usePassedExercises();
  const nav = useNavigate();

  return (
    <div className="page">
      <h1>收藏</h1>
      <p className="muted">在練習、複習、精熟挑戰或題型特訓的題目右上角按 <Star className="ic-sm inline-star" aria-label="星號" /> 就能收藏。這裡的練習會記在學習紀錄，但不影響章節進度與複習排程。</p>

      {list.length === 0 ? (
        <div className="card muted">還沒有收藏任何題目。</div>
      ) : (
        <>
          <div className="toolbar">
            <span className="muted small">共 {list.length} 題，已答對 {list.filter((e) => passed.has(e.exercise.id)).length} 題</span>
            <div className="spacer" />
            <button className="btn btn-primary" onClick={() => nav(`/favorites/${list[0].exercise.id}`)}>
              <Play className="ic-sm" aria-hidden /> 從第一題開始練習
            </button>
          </div>
          {SOURCES.map((src) => {
            const items = list.filter((e) => e.source === src);
            if (!items.length) return null;
            return (
              <section key={src} className="part">
                <h2>{SOURCE_LABEL[src]}</h2>
                <div className="problem-list card">
                  {items.map((e) => (
                    <div key={e.exercise.id} className="problem-row fav-row">
                      <span className={'status-ic ' + (passed.has(e.exercise.id) ? 'solved' : '')} aria-label={passed.has(e.exercise.id) ? '答對過' : '尚未答對'}>
                        {passed.has(e.exercise.id) ? <CheckCircle2 className="ic-sm" /> : <Circle className="ic-sm" />}
                      </span>
                      <Link to={`/favorites/${e.exercise.id}`} className="grow fav-title">
                        {e.exercise.title}
                        <span className="muted small fav-src">
                          {e.groupLabel} · {e.role}
                        </span>
                      </Link>
                      <button className="fav-btn on" aria-label={`取消收藏：${e.exercise.title}`} title="取消收藏" onClick={() => void toggleFavorite(e.exercise.id)}>
                        <Star className="ic-sm" aria-hidden fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

export function FavoritePracticePage() {
  const { id = '' } = useParams();
  const list = useFavoriteEntries();
  const entry = findExercise(id);
  if (!entry) return <div className="page">找不到題目。<Link to="/favorites">回收藏</Link></div>;
  const idx = list.findIndex((e) => e.exercise.id === id);
  // 練到一半取消收藏時，用「原本的位置」找上一題／下一題
  const all = allExerciseEntries();
  const pos = all.findIndex((e) => e.exercise.id === id);
  const prev = idx >= 0 ? list[idx - 1] : [...list].reverse().find((e) => all.indexOf(e) < pos);
  const next = idx >= 0 ? list[idx + 1] : list.find((e) => all.indexOf(e) > pos);
  const ex = entry.exercise;

  return (
    <div className="page">
      <div className="crumbs small">
        <Link to="/favorites">收藏</Link> / {idx >= 0 ? `第 ${idx + 1} / ${list.length} 題` : '已取消收藏'}
      </div>
      <Playground
        key={ex.id}
        exercise={ex}
        mode="practice"
        header={
          <div className="pg-head">
            <span className="tag tag-fav">收藏練習</span>
            <span className="muted small">
              {entry.groupLabel} · {entry.role}
            </span>
            <h3>{ex.title}</h3>
          </div>
        }
        onGraded={(g, sql) => logActivity({ type: 'favorite', refId: ex.id, title: `收藏練習：${ex.title}`, correct: g.pass, sql, detail: g.summary })}
      />
      <div className="chapter-foot">
        {prev ? (
          <Link to={`/favorites/${prev.exercise.id}`}>
            <ArrowLeft className="ic-sm" aria-hidden /> 上一題：{prev.exercise.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/favorites/${next.exercise.id}`}>
            下一題：{next.exercise.title} <ArrowRight className="ic-sm" aria-hidden />
          </Link>
        ) : (
          <Link to="/favorites">回收藏清單</Link>
        )}
      </div>
    </div>
  );
}
