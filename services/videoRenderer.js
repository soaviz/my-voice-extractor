/**
 * soaviz studio — Video Renderer Service
 * FFmpeg 기반 영상 렌더링 로직을 서버에서 분리
 *
 * 두 가지 렌더 모드:
 *   scene_concat — editVersion의 sceneIndexes 기반, 구간별 컷 → concat → 필터 적용
 *   simple_trim  — selectedLength 앞부분 자르기 (fallback)
 *
 * 렌더 파이프라인 (scene_concat):
 *   1. 각 scene을 동일 codec/fps/scale로 병렬 segment 생성
 *   2. concat demuxer로 이어 붙이면서 style 필터 + 자막 적용 (한 번만 인코딩)
 *   3. 임시 segment 파일 / concat list 파일 정리
 *
 * 의존성: ffmpeg (brew install ffmpeg)
 */

'use strict';

const path      = require('path');
const fs        = require('fs');
const { execFile, execFileSync } = require('child_process');
const { nanoid } = require('nanoid');

/* ── 경로 ────────────────────────────────────────────────────── */
const ROOT_DIR    = path.join(__dirname, '..');
const OUTPUTS_DIR = path.join(ROOT_DIR, 'outputs');
const TEMP_DIR    = path.join(OUTPUTS_DIR, 'temp');

[OUTPUTS_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ── 상수 ────────────────────────────────────────────────────── */
/** 스타일별 비디오 필터 목록 */
const STYLE_VIDEO_FILTERS = {
  '감성':     ['setpts=1.1111*PTS', 'hue=s=0.75', 'eq=contrast=0.95:brightness=0.02'],
  '광고':     ['eq=contrast=1.35:brightness=0.05:saturation=1.1'],
  'K-pop MV': ['setpts=0.9091*PTS', 'eq=saturation=1.4:contrast=1.2'],
  '브이로그': ['eq=contrast=1.0:brightness=0.0'],
};

/** 스타일별 오디오 필터 (video setpts와 쌍으로 적용) */
const STYLE_AUDIO_FILTER = {
  '감성':     'atempo=0.9',
  'K-pop MV': 'atempo=1.1',
};

/** 자막 drawtext 필터 */
const SUBTITLE_FILTER =
  "drawtext=text='Created with soaviz studio'" +
  ':fontcolor=white:fontsize=28' +
  ':x=(w-text_w)/2:y=h-60' +
  ':box=1:boxcolor=black@0.45:boxborderw=10';

let drawtextSupportCache = null;

function hasDrawtextSupport() {
  if (drawtextSupportCache !== null) return drawtextSupportCache;
  try {
    const filters = execFileSync('ffmpeg', ['-hide_banner', '-filters'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
    });
    drawtextSupportCache = /\bdrawtext\b/.test(filters);
  } catch {
    drawtextSupportCache = false;
  }
  return drawtextSupportCache;
}

/* ── FFmpeg 실행 헬퍼 ─────────────────────────────────────────── */
/**
 * @param {string[]} args
 * @param {number}   [timeout=180000]
 * @returns {Promise<{stdout:string,stderr:string}>}
 */
function runFFmpeg(args, timeout = 180_000) {
  return new Promise((resolve, reject) => {
    console.log('[ffmpeg]', args.join(' ').slice(0, 200));
    execFile('ffmpeg', args, { timeout }, (err, stdout, stderr) => {
      if (err) {
        const lastLines = stderr?.split('\n').slice(-6).join('\n') || err.message;
        console.error('[ffmpeg error]', lastLines);
        reject(new Error(lastLines.split('\n').pop() || err.message));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/* ── 필터 빌더 ───────────────────────────────────────────────── */
/**
 * 스타일 + 자막 여부를 받아 vf 문자열 반환
 *
 * concat 후 PTS 연속성을 보장하기 위해 맨 앞에 setpts=PTS-STARTPTS 추가.
 * 이미 style 필터에 setpts가 있으면 올바른 순서로 체인됨.
 *
 * @param {string}  selectedStyle
 * @param {boolean} subtitleEnabled
 * @returns {string}
 */
function buildVideoFilters(selectedStyle, subtitleEnabled) {
  const styleFilters = STYLE_VIDEO_FILTERS[selectedStyle] || STYLE_VIDEO_FILTERS['감성'];
  // PTS 정규화: concat 후 타임스탬프를 0부터 재시작
  const normalized   = ['setpts=PTS-STARTPTS', ...styleFilters];
  if (subtitleEnabled) {
    if (hasDrawtextSupport()) {
      normalized.push(SUBTITLE_FILTER);
    } else {
      console.warn('[render] FFmpeg drawtext 필터가 없어 자막 오버레이를 건너뜁니다.');
    }
  }
  return normalized.join(',');
}

/* ── createSegment ───────────────────────────────────────────── */
/**
 * 원본 영상에서 scene 구간만 동일 codec/fps/scale로 잘라냄
 *
 * @param {string} inputPath  - 원본 영상 절대경로
 * @param {{start:number, end:number}} scene
 * @param {string} tempDir    - 임시 디렉토리 절대경로
 * @param {number} index      - segment 순서 (파일명용)
 * @returns {Promise<string>} - 생성된 segment 파일 절대경로
 */
async function createSegment(inputPath, scene, tempDir, index) {
  const padded  = String(index).padStart(4, '0');
  const segPath = path.join(tempDir, `seg_${padded}.mp4`);
  const duration = Math.max(0.1, scene.end - scene.start);

  const args = [
    '-y',
    '-ss', String(scene.start),  // input seek (keyframe 빠른 탐색)
    '-i', inputPath,
    '-t', String(duration),
    '-map', '0:v:0',
    '-map', '0:a?',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',
    '-avoid_negative_ts', 'make_zero',
    '-movflags', '+faststart',
    segPath,
  ];

  try {
    await runFFmpeg(args, 60_000);
  } catch (err) {
    throw new Error(`scene ${index} (${scene.start.toFixed(2)}~${scene.end.toFixed(2)}s) 자르기 실패: ${err.message}`);
  }

  return segPath;
}

/* ── concatSegments ──────────────────────────────────────────── */
/**
 * segment 파일들을 이어 붙이고 style 필터 + 자막 적용
 *
 * @param {string[]} segmentPaths  - 순서대로 이어 붙일 파일 경로 목록
 * @param {string}   outputPath    - 최종 출력 파일 절대경로
 * @param {string}   selectedStyle
 * @param {boolean}  subtitleEnabled
 * @returns {Promise<void>}
 */
async function concatSegments(segmentPaths, outputPath, selectedStyle, subtitleEnabled) {
  // concat list 파일 생성
  const listPath = path.join(path.dirname(outputPath), `concat_${nanoid(8)}.txt`);
  const listContent = segmentPaths
    .map(p => `file '${p.replace(/'/g, "'\\''")}'`)  // 경로 내 작은따옴표 이스케이프
    .join('\n');

  fs.writeFileSync(listPath, listContent, 'utf8');

  const vf = buildVideoFilters(selectedStyle, subtitleEnabled);
  const af = STYLE_AUDIO_FILTER[selectedStyle];

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-vf', vf,
    ...(af ? ['-af', af] : []),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ];

  try {
    await runFFmpeg(args, 300_000);
  } finally {
    fs.unlink(listPath, () => {});
  }
}

/* ── renderSceneConcat ───────────────────────────────────────── */
/**
 * editVersion의 scenes 기준으로 구간별 컷 → concat → 인코딩
 *
 * @param {string}   inputPath
 * @param {Array}    selectedScenes - [{start, end, ...}] 선택된 scene 객체
 * @param {Object}   options
 * @param {string}   options.selectedStyle
 * @param {boolean}  options.subtitleEnabled
 * @param {string}   options.selectedVersionId
 * @returns {Promise<{outputName, outputPath, cutCount, renderMode}>}
 */
async function renderSceneConcat(inputPath, selectedScenes, options) {
  const { selectedStyle = '감성', subtitleEnabled = false, selectedVersionId = 'A' } = options;

  if (!selectedScenes || selectedScenes.length === 0) {
    throw new Error('선택된 scene이 없어요. sceneIndexes를 확인해주세요.');
  }

  const sessionId = nanoid(8);
  const tempDir   = path.join(TEMP_DIR, sessionId);
  fs.mkdirSync(tempDir, { recursive: true });

  const segmentPaths = [];

  try {
    console.log(`[render:scene_concat] 버전 ${selectedVersionId} · ${selectedScenes.length}컷 · ${selectedStyle}`);

    // Step 1: 각 scene 개별 segment 병렬 추출
    const createdSegments = await Promise.all(selectedScenes.map(async (scene, i) => {
      const segPath = await createSegment(inputPath, scene, tempDir, i);
      console.log(`  [seg ${i + 1}/${selectedScenes.length}] ${scene.start.toFixed(2)}~${scene.end.toFixed(2)}s → ${path.basename(segPath)}`);
      return segPath;
    }));
    segmentPaths.push(...createdSegments);

    // Step 2: concat + 필터 적용 (한 번만 인코딩)
    const outputName = `render-${nanoid(10)}.mp4`;
    const outputPath = path.join(OUTPUTS_DIR, outputName);

    await concatSegments(segmentPaths, outputPath, selectedStyle, subtitleEnabled);

    console.log(`[render:scene_concat] 완료 → ${outputName}`);
    return { outputName, outputPath, cutCount: selectedScenes.length, renderMode: 'scene_concat' };

  } finally {
    // 임시 파일 정리
    for (const p of segmentPaths) {
      fs.unlink(p, () => {});
    }
    fs.rmdir(tempDir, () => {});
  }
}

/* ── renderSimpleTrim ────────────────────────────────────────── */
/**
 * 앞부분만 selectedLength 만큼 자르는 fallback 렌더링
 *
 * @param {string} inputPath
 * @param {Object} options
 * @param {string} options.selectedStyle
 * @param {string} options.selectedLength  - '15초' | '30초' | '60초'
 * @param {boolean} options.subtitleEnabled
 * @returns {Promise<{outputName, outputPath, renderMode}>}
 */
async function renderSimpleTrim(inputPath, options) {
  const { selectedStyle = '감성', selectedLength = '30초', subtitleEnabled = false } = options;

  const LENGTH_SECONDS = { '15초': 15, '30초': 30, '60초': 60 };
  const durationSec   = LENGTH_SECONDS[selectedLength] ?? 30;

  const styleFilters = STYLE_VIDEO_FILTERS[selectedStyle] || STYLE_VIDEO_FILTERS['감성'];
  const allFilters   = [...styleFilters];
  if (subtitleEnabled) {
    if (hasDrawtextSupport()) {
      allFilters.push(SUBTITLE_FILTER);
    } else {
      console.warn('[render] FFmpeg drawtext 필터가 없어 자막 오버레이를 건너뜁니다.');
    }
  }
  const vf           = allFilters.join(',');
  const af           = STYLE_AUDIO_FILTER[selectedStyle];

  const outputName = `render-${nanoid(10)}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);

  const args = [
    '-y',
    '-i', inputPath,
    '-t', String(durationSec),
    '-vf', vf,
    ...(af ? ['-af', af] : []),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ];

  console.log(`[render:simple_trim] ${selectedStyle} · ${selectedLength} → ${outputName}`);
  await runFFmpeg(args, 180_000);

  return { outputName, outputPath, renderMode: 'simple_trim' };
}

module.exports = {
  renderSceneConcat,
  renderSimpleTrim,
  buildVideoFilters,
  createSegment,
  concatSegments,
  hasDrawtextSupport,
};
