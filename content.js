// ==========================================
// 全局状态与配置 (三保险追踪引擎)
// ==========================================
let currentZoomVal = 1.0; 
let cachedZoomTextEl = null; 

// 底部全局定位条的缩放极值 (5% 到 5000%)
const MIN_ZOOM = 0.05; 
const MAX_ZOOM = 50.0; 
const MIN_LOG = Math.log(MIN_ZOOM);
const MAX_LOG = Math.log(MAX_ZOOM);

// 监听用户真实的物理滚轮动作，作为备用追踪手段
window.addEventListener('wheel', (e) => {
  if (!e.isTrusted) return; // 只接管用户的真实滚动，忽略插件自己派发的
  if (e.ctrlKey || e.metaKey) {
    currentZoomVal = currentZoomVal * Math.exp(-e.deltaY * 0.002);
    currentZoomVal = Math.max(MIN_ZOOM, Math.min(currentZoomVal, MAX_ZOOM));
  }
}, { passive: true });

// ==========================================
// 核心引擎：生成/派发滚轮事件
// ==========================================
function fireZoomEvent(deltaY) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const targetElement = document.elementFromPoint(centerX, centerY) || document.body;

  const zoomEvent = new WheelEvent('wheel', {
    deltaY: deltaY, 
    clientX: centerX, clientY: centerY,
    ctrlKey: true, metaKey: true, bubbles: true, cancelable: true
  });
  targetElement.dispatchEvent(zoomEvent);

  // 物理积分：内部推演缩放率，防止 DOM 间谍失效
  currentZoomVal = currentZoomVal * Math.exp(-deltaY * 0.002);
  currentZoomVal = Math.max(MIN_ZOOM, Math.min(currentZoomVal, MAX_ZOOM));
}

// ==========================================
// 1. React 重绘对抗与“间谍”植入模块
// ==========================================
function enforceReactOverrides() {
  if (!window.location.href.includes('/conv/')) return;

  const plusPath = document.querySelector('path[d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"]');
  if (!plusPath) return;

  const plusBtn = plusPath.closest('div.cursor-pointer');
  if (!plusBtn) return;
  
  const targetContainer = plusBtn.parentElement;

  Array.from(targetContainer.children).forEach(child => {
    const text = child.textContent || '';
    // 发现包含 % 和数字的元素！植入间谍，视觉隐身但保留活性
    if (text.includes('%') && /\d/.test(text)) {
      child.style.setProperty('opacity', '0', 'important');
      child.style.setProperty('position', 'absolute', 'important');
      child.style.setProperty('pointer-events', 'none', 'important');
      cachedZoomTextEl = child; 
      return;
    }

    // 白名单保护机制
    const html = child.innerHTML || '';
    const shouldKeep = html.includes('M47.51,112.49') || // 导出
                       html.includes('M100,36H56') ||    // 网格
                       html.includes('M128,20A108') ||   // 罗盘
                       html.includes('M180,232a12') ||   // 灯泡
                       child.id === 'flowith-h-slider';  // 我们的底部横条
    
    if (!shouldKeep) {
      child.style.setProperty('display', 'none', 'important');
    }
  });

  targetContainer.style.setProperty('display', 'flex', 'important');
  targetContainer.style.alignItems = 'center';
  targetContainer.style.justifyContent = 'center';

  // 确保底部横向条没被挤出去
  const hSlider = document.getElementById('flowith-h-slider');
  if (hSlider && hSlider.parentElement !== targetContainer) {
    hSlider.style.position = ''; hSlider.style.bottom = ''; hSlider.style.right = '';
    targetContainer.appendChild(hSlider);
  }
}

// ==========================================
// 2. 初始化双轨 UI 
// ==========================================
function initUI() {
  if (!window.location.href.includes('/conv/')) {
    ['flowith-h-slider', 'flowith-v-slider'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    return;
  }

  // ---------------------------------------------------------
  // [底部横条 - H-Slider]：绝对定位条 (指哪打哪，小幅动态形变)
  // ---------------------------------------------------------
  let hWrapper = document.getElementById('flowith-h-slider');
  if (!hWrapper) {
    hWrapper = document.createElement('div');
    hWrapper.id = 'flowith-h-slider';
    hWrapper.style.display = 'flex';
    hWrapper.style.marginLeft = '12px';

    const hTrack = document.createElement('div');
    const hThumb = document.createElement('div');
    hThumb.id = 'flowith-h-thumb';

    Object.assign(hTrack.style, {
      width: '180px', height: '24px', background: 'rgba(110, 113, 242, 0.4)', 
      backdropFilter: 'blur(10px)', border: '1px solid rgba(110, 113, 242, 0.3)', 
      borderRadius: '12px', position: 'relative', touchAction: 'none', userSelect: 'none',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' 
    });

    Object.assign(hThumb.style, {
      position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', 
      background: '#ffffff', borderRadius: '50%', pointerEvents: 'none',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2), 0 0 10px rgba(110, 113, 242, 0.4)', 
      transition: 'width 0.15s ease, height 0.15s ease' // 只有大小有过渡
    });

    hTrack.appendChild(hThumb);
    hWrapper.appendChild(hTrack);
    
    // 放入保底位置
    Object.assign(hWrapper.style, { position: 'fixed', bottom: '90px', right: '30px', zIndex: 9999 });
    document.body.appendChild(hWrapper);

    const xToZoom = (x, width) => Math.exp(MIN_LOG + Math.max(0, Math.min(1, x / width)) * (MAX_LOG - MIN_LOG));

    hTrack.addEventListener('pointerdown', (e) => {
      e.preventDefault(); window.isDraggingH = true;
      const rect = hTrack.getBoundingClientRect();
      window.hMouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      window.hTargetZoom = xToZoom(window.hMouseX, rect.width);
    });
    window.addEventListener('pointermove', (e) => {
      if (!window.isDraggingH) return;
      e.preventDefault();
      const rect = hTrack.getBoundingClientRect();
      window.hMouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      window.hTargetZoom = xToZoom(window.hMouseX, rect.width);
    });
    window.addEventListener('pointerup', () => { window.isDraggingH = false; });
  } else {
    hWrapper.style.display = 'flex';
  }

  // ---------------------------------------------------------
  // [右侧竖条 - V-Slider]：摇杆 (推完回弹)
  // ---------------------------------------------------------
  let vWrapper = document.getElementById('flowith-v-slider');
  if (!vWrapper) {
    vWrapper = document.createElement('div');
    vWrapper.id = 'flowith-v-slider';
    
    Object.assign(vWrapper.style, {
      position: 'fixed', right: '24px', top: '50%', transform: 'translateY(-50%)',
      width: '24px', height: '180px', 
      background: 'rgba(110, 113, 242, 0.12)', backdropFilter: 'blur(6px)', 
      border: '1px solid rgba(110, 113, 242, 0.2)', 
      borderRadius: '12px', zIndex: 9998, touchAction: 'none', userSelect: 'none',
      boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)'
    });

    const vThumb = document.createElement('div');
    vThumb.id = 'flowith-v-thumb';
    Object.assign(vThumb.style, {
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: '26px', height: '26px', background: '#ffffff', borderRadius: '50%',
      cursor: 'ns-resize', boxShadow: '0 2px 5px rgba(0,0,0,0.2), 0 0 10px rgba(110, 113, 242, 0.4)',
      transition: 'top 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // 回弹动画
    });

    vWrapper.appendChild(vThumb);
    document.body.appendChild(vWrapper);

    vThumb.addEventListener('pointerdown', (e) => {
      e.preventDefault(); window.isDraggingV = true; 
      vThumb.style.transition = 'none'; // 拖动时取消回弹动画
    });
    window.addEventListener('pointermove', (e) => {
      if (!window.isDraggingV) return;
      e.preventDefault();
      const rect = vWrapper.getBoundingClientRect();
      const maxOffset = rect.height / 2 - 13; 
      let offset = Math.max(-maxOffset, Math.min(e.clientY - (rect.top + rect.height / 2), maxOffset));
      
      vThumb.style.top = `calc(50% + ${offset}px)`;
      
      if (Math.abs(offset) < 5) window.vVelocity = 0;
      else {
        const norm = (offset > 0 ? offset - 5 : offset + 5) / (maxOffset - 5);
        window.vVelocity = Math.pow(Math.abs(norm), 2) * Math.sign(norm) * 0.8;
      }
    });
    window.addEventListener('pointerup', () => {
      if (!window.isDraggingV) return;
      window.isDraggingV = false; window.vVelocity = 0;
      vThumb.style.transition = 'top 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      vThumb.style.top = '50%'; // 松手回弹中央
    });
  } else {
    vWrapper.style.display = 'block';
  }
}

// ==========================================
// 3. 物理动画与状态同步总线 (60 FPS)
// ==========================================
function physicsLoop() {
  // 1. 最高优先级：从 React 间谍读取真实缩放率修正积分误差
  if (cachedZoomTextEl) {
    const match = cachedZoomTextEl.textContent.match(/(\d+)/);
    if (match) currentZoomVal = parseInt(match[1]) / 100;
  }

  // 2. 摇杆引擎 (右侧 V-Slider)
  if (window.vVelocity && window.vVelocity !== 0) {
    fireZoomEvent(window.vVelocity * 100);
  }

  // 3. 绝对追踪引擎 (底部 H-Slider)
  const hWrapper = document.getElementById('flowith-h-slider');
  const hThumb = document.getElementById('flowith-h-thumb');
  if (hWrapper && hThumb && hWrapper.style.display !== 'none') {
    const rect = hWrapper.getBoundingClientRect();
    
    if (window.isDraggingH) {
      // P-Controller 算法：让真实画面“追”上你手指点的位置
      const error = Math.log(window.hTargetZoom) - Math.log(currentZoomVal);
      if (Math.abs(error) > 0.01) {
        fireZoomEvent(-error * 250); 
      }
      
      // 视觉：紧跟鼠标，大小动态形变 (12px ~ 24px)
      hThumb.style.left = `${window.hMouseX}px`;
      let percent = (Math.log(window.hTargetZoom) - MIN_LOG) / (MAX_LOG - MIN_LOG);
      percent = Math.max(0, Math.min(1, percent));
      const size = 12 + percent * 12; 
      hThumb.style.width = `${size}px`;
      hThumb.style.height = `${size}px`;

    } else {
      // 视觉双向绑定：忠实反映当前画面的真实缩放率
      let percent = (Math.log(currentZoomVal) - MIN_LOG) / (MAX_LOG - MIN_LOG);
      percent = Math.max(0, Math.min(1, percent));
      
      const displayX = percent * rect.width;
      hThumb.style.left = `${displayX}px`;
      
      const size = 12 + percent * 12; // 👈 克制的形变：最小 12px，最大 24px
      hThumb.style.width = `${size}px`;
      hThumb.style.height = `${size}px`;
    }
  }

  requestAnimationFrame(physicsLoop);
}

// ==========================================
// 启动序列
// ==========================================
window.vVelocity = 0;
window.isDraggingH = false;
window.isDraggingV = false;
window.hTargetZoom = 1.0;
window.hMouseX = 0;

setInterval(() => {
  initUI();
  enforceReactOverrides();
}, 500); 

requestAnimationFrame(physicsLoop);