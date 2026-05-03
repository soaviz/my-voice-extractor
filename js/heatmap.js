(function initSoavizClickHeatmap() {
  'use strict';

  const KEY = 'soaviz_click_heatmap';
  const IMPROVEMENTS_KEY = 'soaviz_ux_auto_improvements';
  const MAX_EVENTS = 500;
  const AUTO_FIX_CLASS_MAP = {
    save_cta: 'ux-boost-save-cta',
    version_card: 'ux-pulse-recommended-card',
    sample_cta: 'ux-boost-sample-cta',
    auto_mode: 'ux-explain-auto-mode',
    primary_cta: 'ux-boost-save-cta',
  };

  function injectUXAutoImproveStyles() {
    if (document.getElementById('sv-ux-auto-improve-css')) return;
    const style = document.createElement('style');
    style.id = 'sv-ux-auto-improve-css';
    style.textContent = `
      .ux-boost-save-cta [data-track-label="저장하고 계속 만들기"] {
        transform: scale(1.06);
        box-shadow: 0 0 0 1px rgba(167,139,250,.55), 0 18px 50px rgba(167,139,250,.35);
      }
      .ux-pulse-recommended-card [data-track="version_card"].recommended {
        animation: uxPulseRecommended 1.8s ease-in-out infinite;
      }
      .ux-boost-sample-cta [data-track-label="샘플로 시작"],
      .ux-boost-sample-cta [data-track-label="샘플로 바로 시작"] {
        border-color: rgba(167,139,250,.65);
        background: rgba(167,139,250,.14);
      }
      .ux-explain-auto-mode [data-track-label="자동으로 만들기"]::after {
        content: "추천 버전으로 바로 생성";
        margin-left: 8px;
        font-size: 11px;
        color: #c4b5fd;
      }
      @keyframes uxPulseRecommended {
        0%, 100% {
          box-shadow: 0 0 0 1px rgba(167,139,250,.28);
        }
        50% {
          box-shadow: 0 0 0 2px rgba(167,139,250,.65), 0 0 36px rgba(167,139,250,.28);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function readEvents() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveClickHeatmapEvent(event) {
    const data = readEvents();
    data.push(event);
    localStorage.setItem(KEY, JSON.stringify(data.slice(-MAX_EVENTS)));
  }

  function getClickHeatmapEvents() {
    return readEvents();
  }

  function clearClickHeatmapEvents() {
    localStorage.removeItem(KEY);
    renderUXRecommendationPanel();
    renderOverlay();
  }

  function isDebugHeatmap() {
    try {
      return new URLSearchParams(location.search).get('debugHeatmap') === '1';
    } catch (_) {
      return false;
    }
  }

  function currentPageName() {
    if (window.currentPage) return window.currentPage;
    if (location.search.includes('video-editor')) return 'video_editor';
    if (document.querySelector('[data-onboarding-shell]')) return 'onboarding';
    return 'unknown';
  }

  function currentStep() {
    return window.onboardingState?.step
      || document.querySelector('[data-onboarding-shell]')?.dataset.onboardingStep
      || 'unknown';
  }

  function currentProjectId() {
    return window.editProject?.projectId
      || window.videoEditProject?.projectId
      || null;
  }

  function eventId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `hm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function targetText(el) {
    return (el.dataset.trackLabel || el.innerText || el.getAttribute('aria-label') || 'unknown')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30) || 'unknown';
  }

  function trackClickHeatmap(e) {
    const el = e.target?.closest?.('[data-track]');
    if (!el) return;
    const page = currentPageName();
    const event = {
      id: eventId(),
      type: 'click',
      page: page === 'result' ? 'result' : page,
      step: currentStep(),
      targetLabel: targetText(el),
      targetRole: el.dataset.track || 'unknown',
      x: e.clientX,
      y: e.clientY,
      relativeX: window.innerWidth ? e.clientX / window.innerWidth : 0,
      relativeY: window.innerHeight ? e.clientY / window.innerHeight : 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timestamp: Date.now(),
      projectId: currentProjectId(),
    };
    saveClickHeatmapEvent(event);
    if (document.body.classList.contains('heatmap-overlay-on')) renderOverlay();
    if (document.getElementById('sv-heatmap-panel')) renderUXRecommendationPanel();
  }

  function countWhere(events, predicate) {
    return events.reduce((count, event) => count + (predicate(event) ? 1 : 0), 0);
  }

  function countBy(events, keyFn) {
    return events.reduce((acc, event) => {
      const key = keyFn(event) || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function labelIncludes(event, text) {
    return String(event.targetLabel || '').includes(text);
  }

  function roleIs(event, role) {
    return event.targetRole === role;
  }

  function computeClickMetrics() {
    const events = getClickHeatmapEvents().slice(-MAX_EVENTS);
    const last = events[events.length - 1] || null;
    return {
      totalClicks: events.length,
      primaryClicks: countWhere(events, event => roleIs(event, 'primary_cta')),
      secondaryClicks: countWhere(events, event => roleIs(event, 'secondary_cta')),
      uploadClicks: countWhere(events, event => roleIs(event, 'upload_button') || roleIs(event, 'upload_dropzone') || labelIncludes(event, '파일 업로드') || labelIncludes(event, '파일 교체')),
      sampleClicks: countWhere(events, event => labelIncludes(event, '샘플')),
      versionCardClicks: countWhere(events, event => roleIs(event, 'version_card')),
      sceneCardClicks: countWhere(events, event => roleIs(event, 'scene_card') || roleIs(event, 'scene_more')),
      saveClicks: countWhere(events, event => labelIncludes(event, '저장하고 계속 만들기')),
      downloadClicks: countWhere(events, event => labelIncludes(event, '다운로드')),
      advancedEditClicks: countWhere(events, event => labelIncludes(event, '고급 편집')),
      autoModeClicks: countWhere(events, event => roleIs(event, 'toggle') || labelIncludes(event, '자동으로 만들기')),
      linkCopyClicks: countWhere(events, event => labelIncludes(event, '링크 복사')),
      clicksByStep: countBy(events, event => event.step),
      clicksByRole: countBy(events, event => event.targetRole),
      clicksByLabel: countBy(events, event => event.targetLabel),
      lastClickedTarget: last?.targetLabel || null,
      lastClickedStep: last?.step || null,
    };
  }

  function recommendation(severity, issue, recommendationText, target, autoFixAvailable) {
    return { severity, issue, recommendation: recommendationText, target, autoFixAvailable };
  }

  function generateUXRecommendations(metrics = computeClickMetrics()) {
    const recommendations = [];

    if (metrics.downloadClicks > metrics.saveClicks) {
      recommendations.push(recommendation(
        'high',
        '저장 CTA보다 다운로드 클릭이 많음',
        '저장 버튼을 더 크게, 중앙 배치, 보라색으로 강조하세요.',
        'save_cta',
        true
      ));
    }

    if (metrics.sceneCardClicks > metrics.versionCardClicks) {
      recommendations.push(recommendation(
        'medium',
        '사용자가 컷은 보지만 버전 선택을 못함',
        'A/B/C 카드에 추천 이유와 이 버전으로 만들기 CTA를 더 명확하게 보여주세요.',
        'version_card',
        true
      ));
    }

    if (metrics.uploadClicks > 0 && metrics.sampleClicks < metrics.uploadClicks * 0.2) {
      recommendations.push(recommendation(
        'medium',
        '샘플 시작 버튼이 약함',
        '샘플 버튼을 Upload CTA 옆이 아니라 바로 아래 보조 CTA로 확대하세요.',
        'sample_cta',
        true
      ));
    }

    if (metrics.versionCardClicks > 0 && metrics.autoModeClicks < metrics.versionCardClicks * 0.1) {
      recommendations.push(recommendation(
        'low',
        'Auto Mode 신뢰 부족',
        '자동으로 만들기 옆에 추천 버전으로 자동 생성된다는 카피를 강화하세요.',
        'auto_mode',
        true
      ));
    }

    if (metrics.primaryClicks < metrics.secondaryClicks) {
      recommendations.push(recommendation(
        'high',
        'Primary CTA 위계가 약함',
        'Primary 버튼 색상, 크기, 위치를 강화하세요.',
        'primary_cta',
        true
      ));
    }

    if (metrics.versionCardClicks === 0 && metrics.totalClicks > 10) {
      recommendations.push(recommendation(
        'high',
        'A/B/C 선택 구간에서 이탈 가능성',
        '추천 카드에 animation pulse를 추가해 첫 선택을 유도하세요.',
        'version_card',
        true
      ));
    }

    return recommendations;
  }

  function applyUXAutoImprovements(recommendations = generateUXRecommendations()) {
    const classes = [];
    const reasons = [];
    for (const item of recommendations) {
      if (!item.autoFixAvailable) continue;
      const className = AUTO_FIX_CLASS_MAP[item.target];
      if (!className || classes.includes(className)) continue;
      classes.push(className);
      reasons.push({
        issue: item.issue,
        recommendation: item.recommendation,
        target: item.target,
        severity: item.severity,
      });
    }
    document.body.classList.add(...classes);
    const payload = {
      appliedAt: Date.now(),
      classes,
      reasons,
    };
    localStorage.setItem(IMPROVEMENTS_KEY, JSON.stringify(payload));
    renderUXRecommendationPanel();
    return payload;
  }

  function restoreUXAutoImprovements() {
    injectUXAutoImproveStyles();
    try {
      const saved = JSON.parse(localStorage.getItem(IMPROVEMENTS_KEY) || 'null');
      if (saved?.classes?.length) document.body.classList.add(...saved.classes);
      return saved;
    } catch (_) {
      return null;
    }
  }

  function analyzeUXFriction() {
    const metrics = computeClickMetrics();
    return {
      metrics,
      recommendations: generateUXRecommendations(metrics),
    };
  }

  function groupedSummary(events) {
    const map = new Map();
    for (const event of events) {
      const key = `${event.page} / ${event.step} / ${event.targetRole} / ${event.targetLabel}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }

  function renderOverlay() {
    let overlay = document.getElementById('sv-heatmap-overlay');
    if (!document.body.classList.contains('heatmap-overlay-on')) {
      overlay?.remove();
      return;
    }
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sv-heatmap-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;';
      document.body.appendChild(overlay);
    }
    const events = getClickHeatmapEvents().slice(-200);
    overlay.innerHTML = events.map(event => {
      const left = Math.max(0, Math.min(100, (event.relativeX || 0) * 100));
      const top = Math.max(0, Math.min(100, (event.relativeY || 0) * 100));
      return `<span title="${event.targetLabel || ''}" style="position:absolute;left:${left}%;top:${top}%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(167,139,250,.32);box-shadow:0 0 0 1px rgba(255,255,255,.32),0 0 24px rgba(167,139,250,.72);"></span>`;
    }).join('');
  }

  function renderUXRecommendationPanel() {
    const panel = document.getElementById('sv-heatmap-panel');
    if (!panel) return;
    const events = getClickHeatmapEvents();
    const metrics = computeClickMetrics();
    const recommendations = generateUXRecommendations(metrics);
    const rows = groupedSummary(events).map(([label, count]) => `
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
        <strong>${count}</strong>
      </div>
    `).join('');
    const recommendationRows = recommendations.map(item => `
      <div style="padding:10px;border-radius:12px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);margin-top:8px">
        <div style="display:flex;justify-content:space-between;gap:8px;color:#fff;font-weight:800">
          <span>${escapeHTML(item.issue)}</span>
          <small style="color:${item.severity === 'high' ? '#fca5a5' : item.severity === 'medium' ? '#fde68a' : '#c4b5fd'}">${item.severity}</small>
        </div>
        <div style="margin-top:5px;color:rgba(255,255,255,.68);line-height:1.45">${escapeHTML(item.recommendation)}</div>
      </div>
    `).join('');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
        <strong>UX Heatmap</strong>
        <button data-heatmap-close style="background:transparent;border:0;color:white;font-size:18px;cursor:pointer">×</button>
      </div>
      <div style="color:rgba(255,255,255,.7);font-size:12px;margin-bottom:12px">localStorage · ${events.length}/${MAX_EVENTS} clicks</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:12px">
        <div style="padding:8px;border-radius:10px;background:rgba(255,255,255,.055)">Primary <strong>${metrics.primaryClicks}</strong> / Secondary <strong>${metrics.secondaryClicks}</strong></div>
        <div style="padding:8px;border-radius:10px;background:rgba(255,255,255,.055)">저장 <strong>${metrics.saveClicks}</strong> / 다운로드 <strong>${metrics.downloadClicks}</strong></div>
        <div style="padding:8px;border-radius:10px;background:rgba(255,255,255,.055)">A/B/C 카드 <strong>${metrics.versionCardClicks}</strong></div>
        <div style="padding:8px;border-radius:10px;background:rgba(255,255,255,.055)">씬 카드 <strong>${metrics.sceneCardClicks}</strong></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button data-heatmap-overlay style="flex:1;padding:8px;border-radius:10px;border:1px solid rgba(167,139,250,.35);background:rgba(167,139,250,.14);color:white;cursor:pointer">Overlay</button>
        <button data-ux-auto-apply style="flex:1;padding:8px;border-radius:10px;border:1px solid rgba(167,139,250,.55);background:linear-gradient(135deg,#a78bfa,#818cf8);color:white;cursor:pointer">자동 개선 적용</button>
        <button data-heatmap-clear style="flex:1;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:white;cursor:pointer">Clear</button>
      </div>
      <div style="max-height:260px;overflow:auto;margin-bottom:12px;font-size:12px">${recommendationRows || '<div style="color:rgba(255,255,255,.62)">아직 추천할 UX 문제가 없습니다.</div>'}</div>
      <div style="max-height:320px;overflow:auto;font-size:12px;color:rgba(255,255,255,.78)">${rows || '아직 클릭 데이터가 없습니다.'}</div>
    `;
  }

  function showHeatmapPanel() {
    let panel = document.getElementById('sv-heatmap-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'sv-heatmap-panel';
      panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;width:min(380px,calc(100vw - 32px));padding:16px;border-radius:18px;background:rgba(16,14,26,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 70px rgba(0,0,0,.42);color:white;font-family:system-ui,-apple-system,sans-serif;';
      document.body.appendChild(panel);
      panel.addEventListener('click', (event) => {
        if (event.target.closest('[data-heatmap-close]')) panel.remove();
        if (event.target.closest('[data-heatmap-clear]')) clearClickHeatmapEvents();
        if (event.target.closest('[data-ux-auto-apply]')) applyUXAutoImprovements();
        if (event.target.closest('[data-heatmap-overlay]')) {
          document.body.classList.toggle('heatmap-overlay-on');
          renderOverlay();
        }
      });
    }
    renderUXRecommendationPanel();
  }

  function bootDebugHeatmap() {
    restoreUXAutoImprovements();
    if (!isDebugHeatmap()) return;
    document.body.classList.add('heatmap-overlay-on');
    renderOverlay();
    showHeatmapPanel();
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  document.addEventListener('click', trackClickHeatmap, true);
  document.addEventListener('keydown', (event) => {
    if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      showHeatmapPanel();
    }
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootDebugHeatmap, { once: true });
  } else {
    bootDebugHeatmap();
  }

  window.SoavizHeatmap = {
    trackClickHeatmap,
    saveClickHeatmapEvent,
    getClickHeatmapEvents,
    clearClickHeatmapEvents,
    computeClickMetrics,
    generateUXRecommendations,
    applyUXAutoImprovements,
    restoreUXAutoImprovements,
    renderUXRecommendationPanel,
    analyzeUXFriction,
    showPanel: showHeatmapPanel,
    toggleOverlay() {
      document.body.classList.toggle('heatmap-overlay-on');
      renderOverlay();
    },
  };
})();
