/**
 * soaviz studio — Scene Scorer
 * 다중 요소 기반 scene 점수화 시스템
 *
 * 출력 구조:
 * {
 *   ...scene,
 *   score: number,            // 0~100 (weighted sum)
 *   breakdown: {
 *     position: number,       // positionScore
 *     duration: number,       // durationScore
 *     tempo:    number,       // tempoScore (style-aware)
 *     balance:  number,       // balanceScore
 *   },
 *   priority: "high" | "medium" | "low",
 *   reason: string,           // 한국어 판단 근거
 * }
 *
 * 가중치: position 0.3 · duration 0.3 · tempo 0.3 · balance 0.1
 */

'use strict';

/* ── 유틸 ────────────────────────────────────────────────────── */
function clamp(v, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

/* ════════════════════════════════════════════════════════════
   [1] positionScore
   영상 내 시작 위치 비율에 따른 점수
   - 0~20%  (초반 훅)         → 80점
   - 20~60% (전개)            → 60점
   - 60%+   (후반 클라이맥스) → 70점
   ════════════════════════════════════════════════════════════ */
function scorePosition(scene, totalDuration) {
  if (!totalDuration || totalDuration <= 0) return 60;
  const ratio = scene.start / totalDuration;

  if (ratio < 0.2)  return 80;   // hook
  if (ratio < 0.6)  return 60;   // development
  return 70;                      // climax
}

/* ════════════════════════════════════════════════════════════
   [2] durationScore
   컷 길이 (end - start) 기반 점수
   ════════════════════════════════════════════════════════════ */
function scoreDuration(scene) {
  const len = scene.end - scene.start;

  if (len < 2)  return 20;   // 너무 짧음
  if (len < 4)  return 60;   // 짧음
  if (len < 6)  return 85;   // 최적
  return 70;                  // 길음 (안정적이지만 단조로울 수 있음)
}

/* ════════════════════════════════════════════════════════════
   [3] tempoScore
   선택된 스타일에 따라 durationScore를 변형
   - 감성    → 긴 컷 선호  : durationScore * 1.2 (clamp 100)
   - 광고    → 중간 유지   : durationScore
   - K-pop MV → 짧은 컷 선호: 100 - durationScore
   - 브이로그 → 균형      : durationScore
   ════════════════════════════════════════════════════════════ */
function scoreTempo(selectedStyle, durationScore) {
  switch (selectedStyle) {
    case '감성':
      return clamp(durationScore * 1.2);
    case '광고':
      return durationScore;
    case 'K-pop MV':
      return clamp(100 - durationScore);
    case '브이로그':
      return durationScore;
    default:
      return durationScore;
  }
}

/* ════════════════════════════════════════════════════════════
   [4] balanceScore
   전체 컷 분포 균형 평가
   - 기본값: 50
   - 연속된 동일 길이 컷 (앞/뒤 동일): -10 each
   - 전체 컷 길이 표준편차 > 1.0s → 다양한 분포 +10
   ════════════════════════════════════════════════════════════ */
function scoreBalance(scenes, idx) {
  if (!scenes || scenes.length === 0) return 50;

  const lengths = scenes.map(s => s.end - s.start);
  const mean    = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const stdDev  = Math.sqrt(variance);

  let score = 50;

  // 연속 같은 길이 페널티
  const currentLen = lengths[idx];
  const SAME_THRESH = 0.1; // 0.1초 이하 차이 = "같은 길이" 판정
  if (idx > 0 && Math.abs(lengths[idx - 1] - currentLen) < SAME_THRESH) {
    score -= 10;
  }
  if (idx < lengths.length - 1 && Math.abs(lengths[idx + 1] - currentLen) < SAME_THRESH) {
    score -= 10;
  }

  // 전체 분포 다양성 보너스
  if (stdDev > 1.0) {
    score += 10;
  }

  return clamp(score);
}

/* ════════════════════════════════════════════════════════════
   priority 분류
   score >= 70 → "high"
   score >= 50 → "medium"
   score <  50 → "low"
   ════════════════════════════════════════════════════════════ */
function toPriority(score) {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/* ════════════════════════════════════════════════════════════
   reason 문장 생성
   position + duration + style 조합으로 한국어 판단 근거 생성
   ════════════════════════════════════════════════════════════ */
function toReason(scene, totalDuration, selectedStyle, breakdown) {
  const ratio = scene.start / (totalDuration || 1);
  const len   = scene.end - scene.start;

  // 위치 레이블
  const posLabel =
    ratio < 0.2 ? '초반 훅 구간' :
    ratio < 0.6 ? '전개 구간' :
                  '후반 클라이맥스';

  // 길이 레이블
  const lenLabel =
    len < 2 ? '매우 짧은 컷 (전환 용도)' :
    len < 4 ? '짧은 컷' :
    len < 6 ? '적정 길이' :
              '긴 컷 (안정감)';

  // 스타일 코멘트
  const styleNote = {
    '감성':     '감성 롱컷 우선',
    '광고':     '광고 리듬 적합',
    'K-pop MV': 'K-pop 빠른 컷 우선',
    '브이로그': '브이로그 균형 유지',
  }[selectedStyle] || '기본 스타일';

  return `${posLabel} · ${lenLabel} · ${styleNote}`;
}

/* ════════════════════════════════════════════════════════════
   scoreScenes() — 메인 함수
   scenes 배열 전체를 점수화해서 반환
   ════════════════════════════════════════════════════════════ */
/**
 * @param {Array}  scenes        - generateScenes() 결과 배열
 * @param {number} totalDuration - 영상 전체 길이 (초)
 * @param {string} selectedStyle - '감성' | '광고' | 'K-pop MV' | '브이로그'
 * @returns {Array} 점수 + 메타가 추가된 scenes 배열
 */
function scoreScenes(scenes, totalDuration, selectedStyle = '감성') {
  if (!scenes || scenes.length === 0) return [];

  return scenes.map((scene, idx) => {
    const position = scorePosition(scene, totalDuration);
    const duration = scoreDuration(scene);
    const tempo    = scoreTempo(selectedStyle, duration);
    const balance  = scoreBalance(scenes, idx);

    const score = Math.round(
      position * 0.3 +
      duration * 0.3 +
      tempo    * 0.3 +
      balance  * 0.1
    );

    const breakdown = {
      position: round1(position),
      duration: round1(duration),
      tempo:    round1(tempo),
      balance:  round1(balance),
    };

    return {
      ...scene,
      score: clamp(score, 0, 100),
      breakdown,
      priority: toPriority(score),
      reason:   toReason(scene, totalDuration, selectedStyle, breakdown),
    };
  });
}

module.exports = { scoreScenes, scorePosition, scoreDuration, scoreTempo, scoreBalance };
