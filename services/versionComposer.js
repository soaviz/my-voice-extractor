/**
 * soaviz studio — Version Composer
 * scoredScenes → bestScenes → Version A / B / C 자동 구성
 *
 * FFmpeg concat은 이 단계에서 수행하지 않음.
 * "어떤 scene을 쓸지 결정하는 편집안 데이터"만 생성.
 *
 * Version 출력 구조:
 * {
 *   id:               'A' | 'B' | 'C',
 *   name:             string,
 *   style:            string,
 *   strategy:         string,
 *   sceneIndexes:     number[],   // 원본 scenes 배열의 index
 *   scenes:           Scene[],    // 선택된 scene 객체 (score 포함)
 *   cutCount:         number,
 *   estimatedDuration:number,     // 초
 *   avgScore:         number,
 *   topScore:         number,
 *   reason:           string,     // 편집 의도 설명
 *   tags:             string[],   // UI 태그
 * }
 */

'use strict';

/* ── 유틸 ────────────────────────────────────────────────────── */
function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

/** scenes를 index 오름차순(타임라인 순)으로 정렬 */
function timelineOrder(scenes) {
  return [...scenes].sort((a, b) => a.index - b.index);
}

/** 목표 초에서 필요한 컷 수 계산 */
function calcCutCount(scoredScenes, targetSeconds) {
  if (!scoredScenes.length) return 0;
  const avgLen = scoredScenes.reduce((a, s) => a + (s.end - s.start), 0) / scoredScenes.length;
  const count  = Math.round(targetSeconds / avgLen);
  return Math.min(Math.max(count, 3), scoredScenes.length);
}

/* ════════════════════════════════════════════════════════════
   [A] Balanced Cut — 감성 / 영상 전체 흐름 균형
   전략: high priority 중심, hook(초반) + climax(후반) 포함 보장
   ════════════════════════════════════════════════════════════ */
function selectVersionA(scoredScenes, count, totalDuration) {
  const n = scoredScenes.length;

  // 위치 구간 분류
  const hook    = scoredScenes.filter(s => s.start / totalDuration < 0.20);
  const mid     = scoredScenes.filter(s => s.start / totalDuration >= 0.20 && s.start / totalDuration < 0.60);
  const climax  = scoredScenes.filter(s => s.start / totalDuration >= 0.60);

  // 각 구간에서 상위 점수 컷 선별 (비율: hook 30%, mid 40%, climax 30%)
  const pickFrom = (arr, k) =>
    [...arr].sort((a, b) => b.score - a.score).slice(0, Math.max(1, k));

  const hookCount   = Math.max(1, Math.round(count * 0.30));
  const climaxCount = Math.max(1, Math.round(count * 0.30));
  const midCount    = Math.max(1, count - hookCount - climaxCount);

  const picked = [
    ...pickFrom(hook,   hookCount),
    ...pickFrom(mid,    midCount),
    ...pickFrom(climax, climaxCount),
  ];

  // 중복 제거 후 부족하면 상위 점수에서 보충
  const usedIdx = new Set(picked.map(s => s.index));
  if (picked.length < count) {
    const extras = [...scoredScenes]
      .filter(s => !usedIdx.has(s.index))
      .sort((a, b) => b.score - a.score)
      .slice(0, count - picked.length);
    picked.push(...extras);
  }

  return timelineOrder(picked.slice(0, count));
}

/* ════════════════════════════════════════════════════════════
   [B] Fast Ad Cut — 광고 / 쇼츠 빠른 템포
   전략: 점수 상위 N개, 3구간 다양성 보장 (클러스터링 방지)
   ════════════════════════════════════════════════════════════ */
function selectVersionB(scoredScenes, count, totalDuration) {
  const n = scoredScenes.length;

  // 1단계: 3구간으로 나눠 각 구간에서 최소 1개 확보
  const thirdLen = n / 3;
  const thirds = [
    scoredScenes.filter((_, i) => i < thirdLen),
    scoredScenes.filter((_, i) => i >= thirdLen && i < thirdLen * 2),
    scoredScenes.filter((_, i) => i >= thirdLen * 2),
  ];

  const guaranteed = thirds.map(t =>
    [...t].sort((a, b) => b.score - a.score)[0]
  ).filter(Boolean);

  const usedIdx = new Set(guaranteed.map(s => s.index));

  // 2단계: 남은 자리를 전체 점수 순으로 채움
  const remaining = [...scoredScenes]
    .filter(s => !usedIdx.has(s.index))
    .sort((a, b) => b.score - a.score)
    .slice(0, count - guaranteed.length);

  return timelineOrder([...guaranteed, ...remaining].slice(0, count));
}

/* ════════════════════════════════════════════════════════════
   [C] K-pop MV Cut — 빠른 전환, 시각 다양성 극대화
   전략: tempoScore 상위 + 균등 간격 샘플링 (전체 영상 커버)
   ════════════════════════════════════════════════════════════ */
function selectVersionC(scoredScenes, count, totalDuration) {
  const n = scoredScenes.length;

  // tempoScore 상위 절반 필터링
  const sorted = [...scoredScenes].sort((a, b) =>
    (b.breakdown?.tempo ?? b.score) - (a.breakdown?.tempo ?? a.score)
  );
  const topHalf = sorted.slice(0, Math.ceil(n / 2));

  // 균등 간격 샘플링 (시각 다양성 극대화)
  const step = topHalf.length / count;
  const sampled = Array.from({ length: count }, (_, i) =>
    topHalf[Math.min(Math.floor(i * step), topHalf.length - 1)]
  );

  // 중복 제거
  const seen  = new Set();
  const dedup = sampled.filter(s => {
    if (seen.has(s.index)) return false;
    seen.add(s.index);
    return true;
  });

  // 부족하면 나머지에서 보충
  if (dedup.length < count) {
    const usedIdx = seen;
    const extras = [...scoredScenes]
      .filter(s => !usedIdx.has(s.index))
      .sort((a, b) => (b.breakdown?.tempo ?? 0) - (a.breakdown?.tempo ?? 0))
      .slice(0, count - dedup.length);
    dedup.push(...extras);
  }

  return timelineOrder(dedup.slice(0, count));
}

/* ════════════════════════════════════════════════════════════
   composeVersions() — 메인 함수
   ════════════════════════════════════════════════════════════ */
/**
 * @param {Array}  scoredScenes  - scoreScenes() 결과
 * @param {number} totalDuration - 영상 전체 길이 (초)
 * @param {number} targetSeconds - 목표 출력 길이 (15 | 30 | 60)
 * @returns {{ A: Version, B: Version, C: Version }}
 */
function composeVersions(scoredScenes, totalDuration, targetSeconds = 30) {
  if (!scoredScenes || scoredScenes.length === 0) {
    throw new Error('scoredScenes가 비어 있어요');
  }

  const count = calcCutCount(scoredScenes, targetSeconds);
  const avgSceneLen = totalDuration / scoredScenes.length;

  // 각 버전 씬 선별
  const aScenes = selectVersionA(scoredScenes, count, totalDuration);
  const bScenes = selectVersionB(scoredScenes, count, totalDuration);
  const cScenes = selectVersionC(scoredScenes, count, totalDuration);

  function makeVersion(id, name, style, strategy, selectedScenes, reason, tags) {
    const scores = selectedScenes.map(s => s.score);
    return {
      id,
      name,
      style,
      strategy,
      sceneIndexes:      selectedScenes.map(s => s.index),
      scenes:            selectedScenes,
      cutCount:          selectedScenes.length,
      estimatedDuration: Math.round(selectedScenes.length * avgSceneLen * 10) / 10,
      avgScore:          avg(scores),
      topScore:          Math.max(...scores),
      reason,
      tags,
    };
  }

  return {
    A: makeVersion(
      'A', '버전 A', '감성', 'balanced_cut',
      aScenes,
      `초반 훅 ${Math.round(count * 0.3)}컷 + 중반 ${Math.round(count * 0.4)}컷 + 후반 클라이맥스 ${Math.round(count * 0.3)}컷으로 감성적 흐름 구성`,
      ['균형', '감성', '흐름 자연스러움', 'hook+climax']
    ),
    B: makeVersion(
      'B', '버전 B', '광고', 'fast_ad_cut',
      bScenes,
      `3구간 다양성 확보 + 점수 상위 ${count}컷 선별 · 광고/쇼츠 빠른 템포에 최적화`,
      ['임팩트', '광고', '쇼츠', '고점수 집중']
    ),
    C: makeVersion(
      'C', '버전 C', 'K-pop MV', 'kpop_mv_cut',
      cScenes,
      `tempoScore 상위 컷 균등 샘플링 · 전체 영상 시각 다양성 극대화 · K-pop 비트 구조 최적화`,
      ['K-pop', '빠른 전환', '시각 다양성', 'tempoScore']
    ),
  };
}

module.exports = { composeVersions, selectVersionA, selectVersionB, selectVersionC };
