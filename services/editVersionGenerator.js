/**
 * soaviz studio — Edit Version Generator
 * scoredScenes + options → { versions: [...] } 배열 형태로 편집안 생성
 *
 * versionComposer.js의 A/B/C 전략을 사용하되,
 * 프론트엔드/API 응답 스키마에 맞는 형태로 변환합니다.
 *
 * 반환 구조:
 * {
 *   versions: [
 *     {
 *       id:               'A' | 'B' | 'C',
 *       title:            string,
 *       label:            string,
 *       strategy:         string,
 *       sceneIndexes:     number[],
 *       scenes:           Scene[],
 *       cutCount:         number,
 *       estimatedDuration:number,
 *       avgScore:         number,
 *       topScore:         number,
 *       reason:           string,
 *       tags:             string[],
 *     },
 *     ...
 *   ]
 * }
 */

'use strict';

const { composeVersions } = require('./versionComposer');

/* ── 상수 ────────────────────────────────────────────────────── */
const LENGTH_SECONDS = {
  '15초': 15,
  '30초': 30,
  '60초': 60,
};

/** 버전별 메타 — 고정 레이블/전략/기본 태그 */
const VERSION_META = {
  A: {
    title:    'Balanced Cut',
    label:    '추천',
    strategy: 'balanced',
    baseTags: ['balanced', 'recommended', 'hook+climax'],
    baseReason: '점수 높은 컷과 전체 흐름을 균형 있게 조합했습니다.',
  },
  B: {
    title:    'Fast Ad Cut',
    label:    '광고형',
    strategy: 'fast_ad',
    baseTags: ['shorts', 'fast', 'commercial'],
    baseReason: '짧고 점수 높은 컷을 중심으로 빠른 광고형 편집안을 구성했습니다.',
  },
  C: {
    title:    'K-pop MV Cut',
    label:    'K-pop',
    strategy: 'kpop_mv',
    baseTags: ['kpop', 'music-video', 'dynamic'],
    baseReason: '빠른 전환과 리듬감을 살릴 수 있는 컷을 중심으로 구성했습니다.',
  },
};

/* ── 메인 함수 ──────────────────────────────────────────────── */
/**
 * scoredScenes 배열과 옵션을 받아 A/B/C 편집안을 생성합니다.
 *
 * @param {Array}  scoredScenes    - scoreScenes() 결과 (score/breakdown/priority 포함)
 * @param {Object} options
 * @param {string} options.selectedLength - '15초' | '30초' | '60초'
 * @param {string} options.selectedStyle  - '감성' | '광고' | 'K-pop MV' | '브이로그'
 * @returns {{ versions: Version[] }}
 */
function generateEditVersions(
  scoredScenes,
  { selectedLength = '30초', selectedStyle = '감성' } = {}
) {
  if (!scoredScenes || scoredScenes.length === 0) {
    throw new Error('scoredScenes가 비어 있어요');
  }

  const targetSeconds = LENGTH_SECONDS[selectedLength] ?? 30;

  // 전체 영상 길이 = 마지막 scene의 end 값
  const totalDuration = scoredScenes.reduce(
    (max, s) => Math.max(max, s.end ?? 0),
    0
  );

  // versionComposer 실행
  const composed = composeVersions(scoredScenes, totalDuration, targetSeconds);

  // { A, B, C } 객체 → 배열로 변환 + 메타 병합
  const versions = ['A', 'B', 'C'].map(id => {
    const cv   = composed[id];
    const meta = VERSION_META[id];

    // 태그 중복 제거 (서버 태그 + 기본 태그)
    const mergedTags = [
      ...meta.baseTags,
      ...(cv.tags || []),
    ].filter((t, i, arr) => arr.indexOf(t) === i);

    return {
      id,
      title:             meta.title,
      label:             meta.label,
      strategy:          meta.strategy,
      sceneIndexes:      cv.sceneIndexes,
      scenes:            cv.scenes,
      cutCount:          cv.cutCount,
      estimatedDuration: cv.estimatedDuration,
      avgScore:          cv.avgScore,
      topScore:          cv.topScore,
      reason:            cv.reason || meta.baseReason,
      tags:              mergedTags,
    };
  });

  return { versions };
}

module.exports = { generateEditVersions };
