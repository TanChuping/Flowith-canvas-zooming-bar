// ==========================================
// 全局状态与三路追踪引擎
// ==========================================
let currentZoomVal = 1.0; 

// 🎯 终极对齐：10% 到 400% (完全匹配 Flowith 的物理极限)
const MIN_ZOOM = 0.1;  
const MAX_ZOOM = 4.0;  
const MIN_LOG = Math.log(MIN_ZOOM);
const MAX_LOG = Math.log(MAX_ZOOM);

function isCanvasPage() {
  return (
    window.location.href.includes('/conv/') ||
    !!document.querySelector('.react-flow__pane') ||
    !!document.getElementById('core_area')
  );
}

function getTopToolbar() {
  const panel = document.querySelector('.react-flow__panel.top.right');
  if (!panel) return null;
  return panel.firstElementChild || panel;
}

function getZoomButton() {
  return document.querySelector('.react-flow__panel.top.right button[aria-label="适应画布"]');
}

function getStudioButton() {
  return document.querySelector('.react-flow__panel.top.right button[aria-label="创作台"]');
}

// 辅助：获取画布实时数字
function syncZoomFromPage() {
  const zoomButton = getZoomButton();
  if (!zoomButton) return;

  const zoomText = Array.from(zoomButton.querySelectorAll('span')).find((el) => {
    const text = el.textContent || '';
    return text.includes('%') && /\d/.test(text);
  });

  if (zoomText) {
    const match = zoomText.textContent.match(/(\d+)/);
    if (match) {
      currentZoomVal = parseInt(match[1], 10) / 100;
    }
  }
}

// 🎯 新增：强制唤醒画布焦点机制
function forceCanvasFocus() {
  // 1. 优先尝试点击画布背景，这样不会打断你已经选中的其他节点
  let canvasBg = document.querySelector('.react-flow__pane') || document.getElementById('core_area');
  if (canvasBg) {
    canvasBg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  }

  // 2. 如果背景没激活，按你的发现，直接找第一个节点（基于你提供的 .group 和 main 特征）来激活
  let firstNode = document.querySelector('.group.squircle') || document.querySelector('main[id]');
  if (firstNode) {
    firstNode.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  }
}

// 核心派发逻辑
function fireZoomEvent(deltaY) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  // 尝试优先找 React Flow 的拦截层，找不到再找 canvas
  let target = document.querySelector('.react-flow__pane') || document.querySelector('canvas');
  if (!target) target = document.elementFromPoint(centerX, centerY) || document.body;

  target.dispatchEvent(new WheelEvent('wheel', {
    deltaY: deltaY, clientX: centerX, clientY: centerY,
    ctrlKey: true, metaKey: true, bubbles: true, cancelable: true
  }));

  currentZoomVal = currentZoomVal * Math.exp(-deltaY * 0.002);
  currentZoomVal = Math.max(MIN_ZOOM, Math.min(currentZoomVal, MAX_ZOOM));
}

// ==========================================
// 1. UI 自动化管理 (React 对抗)
// ==========================================
function maintainUI() {
  if (!isCanvasPage()) {
    ['flowith-h-slider', 'flowith-v-slider'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    return;
  }

  const hSlider = document.getElementById('flowith-h-slider');
  const vSlider = document.getElementById('flowith-v-slider');
  const toolbar = getTopToolbar();
  const studioButton = getStudioButton();

  if (toolbar && studioButton && hSlider && hSlider.parentElement !== toolbar) {
    Object.assign(hSlider.style, {
      position: '',
      top: '',
      bottom: '',
      left: '',
      right: '',
      marginLeft: '8px',
      display: 'flex',
      alignItems: 'center',
      flex: '0 0 auto'
    });
    toolbar.insertBefore(hSlider, studioButton.nextSibling);
  } else if (hSlider && !toolbar) {
    Object.assign(hSlider.style, {
      position: 'fixed',
      top: '16px',
      right: '160px',
      marginLeft: '0',
      display: 'flex',
      alignItems: 'center',
      zIndex: '9999'
    });
  }

  if (hSlider) hSlider.style.display = 'flex';
  if (vSlider) vSlider.style.display = 'block';
}

// ==========================================
// 2. 构建 UI 元素
// ==========================================
function createSliders() {
  if (document.getElementById('flowith-h-slider')) return;

  // --- 右上角绝对定位条 ---
  const hWrapper = document.createElement('div');
  hWrapper.id = 'flowith-h-slider';
  const hTrack = document.createElement('div');
  const hThumb = document.createElement('div');
  hThumb.id = 'flowith-h-thumb';

  Object.assign(hTrack.style, {
    width: '180px', height: '24px', background: 'rgba(110, 113, 242, 0.4)', 
    backdropFilter: 'blur(10px)', borderRadius: '12px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)'
  });
  Object.assign(hThumb.style, {
    position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
    background: '#fff', borderRadius: '50%', pointerEvents: 'none',
    boxShadow: '0 0 10px rgba(110,113,242,0.5)', transition: 'width 0.2s, height 0.2s'
  });

  hTrack.ondragstart = () => false;

  const PADDING = 13; 
  const TRACK_WIDTH = 180;
  const VALID_WIDTH = TRACK_WIDTH - PADDING * 2;

  hTrack.addEventListener('pointerdown', (e) => {
    window.isDraggingH = true;
    hTrack.setPointerCapture(e.pointerId); 
    forceCanvasFocus(); // 👈 按下瞬间，强行唤醒画布！
    updateHTarget(e);
  });
  window.addEventListener('pointermove', (e) => { if(window.isDraggingH) updateHTarget(e); });
  window.addEventListener('pointerup', (e) => { 
    window.isDraggingH = false; 
    try { hTrack.releasePointerCapture(e.pointerId); } catch(err) {} 
  });
  window.addEventListener('pointercancel', () => window.isDraggingH = false);

  function updateHTarget(e) {
    const rect = hTrack.getBoundingClientRect();
    let x = e.clientX - rect.left - PADDING;
    x = Math.max(0, Math.min(x, VALID_WIDTH));
    window.hTargetZoom = Math.exp(MIN_LOG + (x / VALID_WIDTH) * (MAX_LOG - MIN_LOG));
    window.hVisualX = x + PADDING; 
  }

  hTrack.appendChild(hThumb);
  hWrapper.appendChild(hTrack);
  Object.assign(hWrapper.style, {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '8px',
    zIndex: '9999'
  });
  document.body.appendChild(hWrapper);

  // --- 右侧竖向摇杆 (圆角胶囊状) ---
  const vWrapper = document.createElement('div');
  vWrapper.id = 'flowith-v-slider';
  const vThumb = document.createElement('div');

  Object.assign(vWrapper.style, {
    position: 'fixed', right: '24px', top: '50%', transform: 'translateY(-50%)',
    width: '24px', height: '180px', background: 'rgba(110, 113, 242, 0.15)',
    backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', zIndex: '9999',
    userSelect: 'none',
    display: 'block'
  });
  Object.assign(vThumb.style, {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    width: '16px', height: '40px', background: '#fff', borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2), 0 0 10px rgba(110,113,242,0.4)', 
    cursor: 'ns-resize', webkitUserDrag: 'none'
  });

  vThumb.ondragstart = () => false;

  vThumb.addEventListener('pointerdown', (e) => {
    e.preventDefault(); 
    window.isDraggingV = true;
    vThumb.style.transition = 'none';
    vThumb.setPointerCapture(e.pointerId);
    forceCanvasFocus(); // 👈 按下瞬间，强行唤醒画布！
  });
  
  window.addEventListener('pointermove', (e) => {
    if(!window.isDraggingV) return;
    const rect = vWrapper.getBoundingClientRect();
    const maxOffset = rect.height / 2 - 20; 
    const offset = Math.max(-maxOffset, Math.min(e.clientY - (rect.top + rect.height / 2), maxOffset));
    vThumb.style.top = `calc(50% + ${offset}px)`;
    window.vVel = Math.pow(Math.abs(offset/maxOffset), 2) * Math.sign(offset) * 0.8;
  });

  const releaseVerticalThumb = (e) => {
    if(!window.isDraggingV) return;
    window.isDraggingV = false; window.vVel = 0;
    vThumb.style.transition = 'top 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
    vThumb.style.top = '50%';
    try { vThumb.releasePointerCapture(e.pointerId); } catch(err) {}
  };

  window.addEventListener('pointerup', releaseVerticalThumb);
  window.addEventListener('pointercancel', releaseVerticalThumb);

  vWrapper.appendChild(vThumb);
  document.body.appendChild(vWrapper);
}

// ==========================================
// 3. 物理/渲染循环 (60FPS)
// ==========================================
function loop() {
  syncZoomFromPage();
  maintainUI();

  if (window.vVel) fireZoomEvent(window.vVel * 100);

  const hThumb = document.getElementById('flowith-h-thumb');
  const hTrack = document.getElementById('flowith-h-slider')?.firstChild;
  
  if (hThumb && hTrack) {
    let logPos = (Math.log(currentZoomVal) - MIN_LOG) / (MAX_LOG - MIN_LOG);
    logPos = Math.max(0, Math.min(1, logPos));

    const PADDING = 13;
    const VALID_WIDTH = 180 - PADDING * 2;

    if (window.isDraggingH) {
      const error = Math.log(window.hTargetZoom) - Math.log(currentZoomVal);
      if (Math.abs(error) > 0.01) fireZoomEvent(-error * 200);
      hThumb.style.left = `${window.hVisualX}px`;
    } else {
      hThumb.style.left = `${PADDING + logPos * VALID_WIDTH}px`;
    }

    const dynamicSize = 14 + (logPos * 12);
    hThumb.style.width = `${dynamicSize}px`;
    hThumb.style.height = `${dynamicSize}px`;
  }
  requestAnimationFrame(loop);
}

// 启动
window.vVel = 0;
createSliders();
requestAnimationFrame(loop);