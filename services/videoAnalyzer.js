/**
 * soaviz studio — Video Analyzer Service
 * ffprobe 기반 duration 추출 + 균등 컷 분할 + scene 점수화
 *
 * 의존성: ffprobe (brew install ffmpeg 으로 자동 설치됨)
 */

'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const { scoreScenes }    = require('./sceneScorer');
const { composeVersions } = require('./versionComposer');

/* ── ffprobe: 영상 duration 추출 ─────────────────────────────── */
/**
 * @param {string} filePath - 분석할 영상 파일 절대경로
 * @returns {Promise<number>} - 초 단위 duration (소수점 포함)
 */
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`파일을 찾을 수 없어요: ${filePath}`));
    }

    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      '-select_streams', 'v:0',
      filePath,
    ];

    execFile('ffprobe', args, { timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(
          `ffprobe 오류: ${stderr?.split('\n').slice(-3).join(' ').trim() || err.message}`
        ));
      }

      try {
        const info = JSON.parse(stdout);

        // 1순위: video stream duration
        const streamDuration = parseFloat(info.streams?.[0]?.duration);
        if (Number.isFinite(streamDuration) && streamDuration > 0) {
          return resolve(streamDuration);
        }

        // 2순위: format duration (컨테이너 전체)
        const formatDuration = parseFloat(info.format?.duration);
        if (Number.isFinite(formatDuration) && formatDuration > 0) {
          return resolve(formatDuration);
        }

        reject(new Error('영상 길이를 읽지 못했어요 (duration 정보 없음)'));
      } catch (parseErr) {
        reject(new Error(`ffprobe 응답 파싱 실패: ${parseErr.message}`));
      }
    });
  });
}

/* ── 컷 분할 로직 ────────────────────────────────────────────── */
/**
 * 영상 길이 기반으로 균등 컷 배열 생성
 *
 * 컷 개수 기준:
 *   duration < 30s  →  6컷
 *   duration < 60s  → 10컷
 *   duration < 120s → 15컷
 *   duration >= 120s → 20컷
 *
 * @param {number} duration - 영상 전체 길이 (초)
 * @returns {Array<{ index, start, end, midpoint, label }>}
 */
function generateScenes(duration) {
  if (!duration || duration <= 0) {
    throw new Error('유효한 duration 값이 필요해요');
  }

  let count;
  if (duration < 30)       count = 6;
  else if (duration < 60)  count = 10;
  else if (duration < 120) count = 15;
  else                     count = 20;

  const cutLength = duration / count;
  const scenes = [];

  for (let i = 0; i < count; i++) {
    const start    = parseFloat((cutLength * i).toFixed(3));
    const end      = parseFloat((cutLength * (i + 1)).toFixed(3));
    const midpoint = parseFloat(((start + end) / 2).toFixed(3));

    scenes.push({
      index:    i,
      start,
      end,
      midpoint,
      label: `컷 ${String(i + 1).padStart(2, '0')}`,
    });
  }

  return scenes;
}

/* ── 통합 분석 함수 ──────────────────────────────────────────── */
/**
 * 영상 파일을 분석해서 duration + scoredScenes + versions 반환
 *
 * @param {string} filePath      - 영상 파일 절대경로
 * @param {string} selectedStyle - '감성' | '광고' | 'K-pop MV' | '브이로그'
 * @param {number} targetSeconds - 목표 출력 초 (15 | 30 | 60)
 * @returns {Promise<{ duration, scenes, versions, style }>}
 */
async function analyzeVideo(filePath, selectedStyle = '감성', targetSeconds = 30) {
  const duration     = await getVideoDuration(filePath);
  const rawScenes    = generateScenes(duration);
  const scoredScenes = scoreScenes(rawScenes, duration, selectedStyle);
  const versions     = composeVersions(scoredScenes, duration, targetSeconds);

  const scores    = scoredScenes.map(s => s.score);
  const avgScore  = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const highCount = scoredScenes.filter(s => s.priority === 'high').length;

  console.log(
    `[analyze] dur=${duration.toFixed(2)}s | ${scoredScenes.length}컷 | ` +
    `style=${selectedStyle} | target=${targetSeconds}s | avgScore=${avgScore} | high=${highCount}컷`
  );
  console.log(
    `[versions] A=${versions.A.cutCount}컷(avg${versions.A.avgScore}) ` +
    `B=${versions.B.cutCount}컷(avg${versions.B.avgScore}) ` +
    `C=${versions.C.cutCount}컷(avg${versions.C.avgScore})`
  );

  return { duration, scenes: scoredScenes, versions, style: selectedStyle };
}

module.exports = { analyzeVideo, getVideoDuration, generateScenes };
