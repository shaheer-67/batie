/* =========================================================
   Batie Logistic — site scripts
   1. Libraries (three.js via import map in index.html)
   2. UI: smooth scroll, nav, menu, reveals, sections
   3. 3D story scenes: sea, air, road + network globe
   ========================================================= */

import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* =========================================================
   2. UI
   ========================================================= */
(function () {
  const hasGsap = typeof gsap !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  window.__ui = {};

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof Lenis !== 'undefined' && !reduce) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => {
        lenis.raf(t);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      mmenu.classList.remove('open');
      burger.classList.remove('open');
      lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' });
    }),
  );

  /* ---------- nav hide on scroll down ---------- */
  const nav = document.getElementById('nav');
  let lastY = 0;
  addEventListener(
    'scroll',
    () => {
      const y = scrollY;
      nav.classList.toggle('hide', y > lastY && y > 400);
      lastY = y;
    },
    { passive: true },
  );
  const burger = document.getElementById('burger'),
    mmenu = document.getElementById('mmenu');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    mmenu.classList.toggle('open');
  });

  /* ---------- 3D story sections: captions + progress ---------- */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const stories = [...document.querySelectorAll('.story')].map((sec) => {
    const caps = [...sec.querySelectorAll('.caption')].map((el) => {
      const text = el.textContent.trim();
      el.textContent = '';
      el.setAttribute('aria-label', text);
      const chars = [];
      text.split(' ').forEach((word, wi, arr) => {
        const w = document.createElement('span');
        w.style.whiteSpace = 'nowrap';
        w.setAttribute('aria-hidden', 'true');
        [...word].forEach((c) => {
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = c;
          w.appendChild(s);
          chars.push(s);
        });
        el.appendChild(w);
        if (wi < arr.length - 1) {
          const sp = document.createElement('span');
          sp.className = 'ch';
          sp.textContent = ' ';
          el.appendChild(sp);
          chars.push(sp);
        }
      });
      // [revealStart, revealEnd, fadeStart, fadeEnd] as fractions of the section's scroll
      return { el, chars, last: -1, range: el.dataset.range.split(',').map(Number) };
    });
    const bars = sec.querySelectorAll('.story-progress i');
    const status = sec.querySelector('[data-status]');
    sec.__p = 0;
    sec.__set = function (p) {
      caps.forEach((c) => {
        const [a, b, f0, f1] = c.range;
        const t = clamp01((p - a) / (b - a));
        const n = Math.floor(t * c.chars.length + 0.0001);
        if (n !== c.last) {
          c.chars.forEach((s, k) => {
            s.style.opacity = k < n ? 1 : 0;
            s.classList.toggle('hot', k < n && k >= n - 4 && t < 1);
          });
          c.last = n;
        }
        const fade = 1 - clamp01((p - f0) / (f1 - f0));
        c.el.style.opacity = fade;
        c.el.style.transform = `translateX(-50%) translateY(${(1 - fade) * -30}px)`;
      });
      bars.forEach((b, i) => {
        b.style.transform = `scaleY(${clamp01((p - i / 3) * 3)})`;
      });
      if (status) {
        if (status.dataset.steps) {
          const step = status.dataset.steps
            .split('|')
            .map((x) => x.split(':'))
            .find(([th]) => p < +th);
          if (step) status.textContent = step[1];
        } else status.textContent = p < 0.22 ? 'Visual' : p < 0.52 ? 'Wireframe' : 'Data';
      }
    };
    sec.__set(0);
    return sec;
  });
  function storyProgress() {
    stories.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      sec.__p = clamp01(-r.top / (sec.offsetHeight - innerHeight));
    });
  }
  addEventListener('scroll', storyProgress, { passive: true });
  addEventListener('resize', storyProgress);
  storyProgress();
  // If WebGL never boots, captions still play from scroll
  (function capLoop() {
    if (!window.__three) stories.forEach((s) => s.__set(s.__p));
    requestAnimationFrame(capLoop);
  })();

  /* ---------- missions grid ---------- */
  const gridbg = document.getElementById('gridbg');
  const cellCount = Math.ceil((innerWidth / 96) * (Math.max(innerHeight * 1.3, 900) / 96)) + 30;
  for (let i = 0; i < cellCount; i++) gridbg.appendChild(document.createElement('div'));
  const cells = gridbg.children;
  setInterval(() => {
    const c = cells[(Math.random() * cells.length) | 0];
    c.classList.add('on');
    setTimeout(() => c.classList.remove('on'), 900 + Math.random() * 900);
  }, 140);
  const missions = document.querySelector('.missions'),
    spot = document.getElementById('spot');
  missions.addEventListener('pointermove', (e) => {
    const r = missions.getBoundingClientRect();
    spot.style.setProperty('--mx', e.clientX - r.left + 'px');
    spot.style.setProperty('--my', e.clientY - r.top + 'px');
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.parentNode === gridbg) {
      el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), 600);
    }
  });

  /* ---------- imagine word reveal ---------- */
  const imagine = document.getElementById('imagine-text');
  (function split(node) {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else {
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
          }
        });
        n.replaceWith(frag);
      } else if (n.classList && n.classList.contains('hl')) {
        n.classList.add('w');
      }
    });
  })(imagine);

  /* ---------- feature visuals: aerial port ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent && parent.appendChild(e);
    return e;
  };
  (function port() {
    const s = document.getElementById('vis-yard');
    const defs = mk('defs', {}, s);
    const g = mk('linearGradient', { id: 'gy', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    mk('stop', { offset: 0, 'stop-color': '#c9a386' }, g);
    mk('stop', { offset: 1, 'stop-color': '#a8806a' }, g);
    const gw = mk('linearGradient', { id: 'gw', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    mk('stop', { offset: 0, 'stop-color': '#1f5468' }, gw);
    mk('stop', { offset: 1, 'stop-color': '#123447' }, gw);
    mk('rect', { width: 600, height: 690, fill: 'url(#gy)' }, s);
    // sea + quay
    mk('rect', { x: 430, y: 0, width: 170, height: 690, fill: 'url(#gw)' }, s);
    for (let i = 0; i < 26; i++)
      mk(
        'path',
        {
          d: `M${440 + Math.random() * 150} ${i * 27} q 8 -4 16 0`,
          stroke: 'rgba(255,255,255,.12)',
          fill: 'none',
          'stroke-width': 1.5,
        },
        s,
      );
    mk('rect', { x: 424, y: 0, width: 8, height: 690, fill: '#e8e0d2' }, s);
    // vessel at berth
    mk(
      'path',
      {
        d: 'M470 20 Q 515 -10 560 20 L 560 660 Q 515 676 470 660 Z',
        fill: 'rgba(0,0,0,.25)',
        transform: 'translate(8,8)',
      },
      s,
    );
    mk('path', { d: 'M470 20 Q 515 -10 560 20 L 560 660 Q 515 676 470 660 Z', fill: '#1b2633' }, s);
    mk('rect', { x: 478, y: 590, width: 74, height: 50, fill: '#eeeeea', rx: 3 }, s);
    const palette = [
      '#b5382c',
      '#1e5a8a',
      '#d88a28',
      '#2c7a66',
      '#8b9097',
      '#d4cdbf',
      '#6e3a86',
      '#d8b83c',
      '#24485c',
    ];
    for (let r = 0; r < 4; r++)
      for (let i = 0; i < 20; i++)
        if (Math.random() > 0.08)
          mk(
            'rect',
            {
              x: 478 + r * 19,
              y: 36 + i * 27,
              width: 17,
              height: 25,
              fill: palette[(Math.random() * palette.length) | 0],
              rx: 1,
            },
            s,
          );
    // quay cranes (top-down gantries)
    [120, 300, 470].forEach((y) => {
      mk('rect', { x: 380, y: y + 6, width: 200, height: 22, fill: 'rgba(0,0,0,.25)' }, s);
      mk('rect', { x: 372, y, width: 200, height: 22, fill: '#e9e6df', rx: 2 }, s);
      mk('rect', { x: 395, y: y - 6, width: 14, height: 34, fill: '#c8f43a', rx: 2 }, s);
    });
    // container stacks in the yard
    for (let r = 0; r < 4; r++)
      for (let i = 0; i < 10; i++) {
        const x = 40 + r * 86,
          y = 30 + i * 64;
        if (Math.random() < 0.15) continue;
        mk('rect', { x: x + 6, y: y + 6, width: 70, height: 50, fill: 'rgba(40,20,10,.28)', rx: 2 }, s);
        for (let k = 0; k < 3; k++)
          mk(
            'rect',
            {
              x,
              y: y + k * 17,
              width: 70,
              height: 16,
              fill: palette[(Math.random() * palette.length) | 0],
              rx: 1,
            },
            s,
          );
      }
    // moving truck
    const truck = mk('g', {}, s);
    mk('rect', { x: 8, y: 8, width: 120, height: 34, fill: 'rgba(40,15,5,.35)', rx: 4 }, truck);
    mk('rect', { x: 0, y: 0, width: 92, height: 34, fill: '#1e5a8a', rx: 2 }, truck);
    mk('rect', { x: 96, y: 3, width: 28, height: 28, fill: '#1c1c1c', rx: 5 }, truck);
    mk(
      'rect',
      { x: 0, y: 0, width: 92, height: 34, fill: 'none', stroke: '#c8f43a', 'stroke-width': 3, rx: 2 },
      truck,
    );
    const label = mk('g', {}, truck);
    mk('rect', { x: 0, y: -30, width: 122, height: 22, rx: 11, fill: '#0b0d10' }, label);
    const t = mk(
      'text',
      {
        x: 61,
        y: -15,
        'text-anchor': 'middle',
        fill: '#c8f43a',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 11,
      },
      label,
    );
    t.textContent = 'MSKU 482193 → CRANE 2';
    let tt = 0;
    (function anim() {
      tt += 0.0035;
      const k = tt % 1;
      let x,
        y,
        rot = 0;
      if (k < 0.55) {
        x = -140 + (k / 0.55) * 360;
        y = 664;
      } else if (k < 0.8) {
        const q = (k - 0.55) / 0.25;
        x = 220;
        y = 664 - q * 360;
        rot = -90 * Math.min(1, q * 4);
      } else {
        const q = (k - 0.8) / 0.2;
        x = 220 + q * 130;
        y = 304;
        rot = -90 + 90 * Math.min(1, q * 3);
      }
      truck.setAttribute('transform', `translate(${x},${y}) rotate(${rot} 63 17)`);
      requestAnimationFrame(anim);
    })();
  })();

  /* ---------- feature visuals: computer vision ---------- */
  (function cv() {
    const s = document.getElementById('vis-cv');
    const defs = mk('defs', {}, s);
    const g = mk('linearGradient', { id: 'gc', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    mk('stop', { offset: 0, 'stop-color': '#0d141c' }, g);
    mk('stop', { offset: 1, 'stop-color': '#05080c' }, g);
    mk('rect', { width: 600, height: 690, fill: 'url(#gc)' }, s);
    // perspective ground grid
    for (let i = 0; i < 14; i++) {
      const y = 300 + Math.pow(i / 13, 1.8) * 390;
      mk('line', { x1: 0, x2: 600, y1: y, y2: y, stroke: 'rgba(120,170,255,.10)' }, s);
    }
    for (let i = -10; i <= 10; i++)
      mk(
        'line',
        { x1: 300 + i * 18, y1: 300, x2: 300 + i * 120, y2: 690, stroke: 'rgba(120,170,255,.08)' },
        s,
      );
    const items = [
      [40, 330, 170, 120, 'ULD AKE 12093', '98.6'],
      [230, 310, 150, 105, 'PMC 40871', '97.1'],
      [400, 320, 165, 112, 'ULD AKE 77230', '99.2'],
      [80, 470, 220, 160, 'PLT 176-2054', '96.4'],
      [330, 480, 230, 170, 'PMC 66102', '98.9'],
    ];
    items.forEach(([x, y, w, h, id, c], i) => {
      mk('rect', { x, y, width: w, height: h, fill: '#1b232c', rx: 4 }, s);
      for (let k = 1; k < 6; k++)
        mk(
          'line',
          {
            x1: x + (w / 6) * k,
            x2: x + (w / 6) * k,
            y1: y + 6,
            y2: y + h - 6,
            stroke: 'rgba(255,255,255,.05)',
          },
          s,
        );
      mk('rect', { x: x + w * 0.1, y: y + h - 14, width: w * 0.8, height: 6, fill: '#0b0f14' }, s);
      const box = mk(
        'rect',
        {
          x: x - 6,
          y: y - 6,
          width: w + 12,
          height: h + 12,
          fill: 'none',
          stroke: '#c8f43a',
          'stroke-width': 1.6,
          rx: 3,
          'stroke-dasharray': `${(w + h) * 2 + 48}`,
          'stroke-dashoffset': `${(w + h) * 2 + 48}`,
        },
        s,
      );
      box.innerHTML = `<animate attributeName="stroke-dashoffset" to="0" dur="1.4s" begin="${i * 0.35}s" fill="freeze"/>`;
      const lab = mk('g', { opacity: 0 }, s);
      lab.innerHTML = `<animate attributeName="opacity" to="1" dur=".4s" begin="${i * 0.35 + 0.9}s" fill="freeze"/>`;
      mk('rect', { x: x - 6, y: y - 30, width: 150, height: 22, fill: '#c8f43a', rx: 3 }, lab);
      const t = mk(
        'text',
        {
          x: x + 2,
          y: y - 15,
          fill: '#0b0d10',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 11,
          'font-weight': 500,
        },
        lab,
      );
      t.textContent = `${id} · ${c}%`;
    });
    // scan line
    const scan = mk('rect', { x: 0, y: 0, width: 600, height: 2, fill: 'rgba(200,244,58,.6)' }, s);
    scan.innerHTML = '<animate attributeName="y" values="280;690;280" dur="5s" repeatCount="indefinite"/>';
    const hud = mk(
      'text',
      {
        x: 24,
        y: 40,
        fill: 'rgba(255,255,255,.7)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 12,
      },
      s,
    );
    hud.textContent = 'CAM 07 · AIR CARGO TERMINAL · 30 FPS';
    const rec = mk('circle', { cx: 560, cy: 36, r: 6, fill: '#ff4d4d' }, s);
    rec.innerHTML = '<animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="indefinite"/>';
  })();

  /* ---------- feature visuals: dashboard ---------- */
  (function dash() {
    const pts = [];
    let v = 70;
    for (let i = 0; i <= 30; i++) {
      v += (Math.random() - 0.45) * 18;
      v = Math.max(20, Math.min(130, v));
      pts.push([i * 10, 150 - v]);
    }
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1].toFixed(1)).join(' ');
    document.getElementById('spark-l').setAttribute('d', d);
    document.getElementById('spark-a').setAttribute('d', d + ' L300 150 L0 150 Z');
    const moves = document.getElementById('moves');
    const sea = [
      ['JEA', 'RTM'],
      ['SHA', 'LAX'],
      ['KHI', 'JEA'],
      ['LCH', 'HAM'],
      ['SIN', 'FXT'],
      ['BKK', 'KHI'],
    ];
    const air = [
      ['DXB', 'FRA'],
      ['BKK', 'LHR'],
      ['HKG', 'ORD'],
      ['ICN', 'AMS'],
      ['KHI', 'DXB'],
      ['SIN', 'JFK'],
    ];
    const add = () => {
      const isAir = Math.random() < 0.4,
        lane = (isAir ? air : sea)[(Math.random() * 6) | 0];
      const eta = isAir ? ((2 + Math.random() * 20) | 0) + 'h' : ((1 + Math.random() * 24) | 0) + 'd';
      const m = document.createElement('div');
      m.className = 'move new';
      m.innerHTML = `<span>${isAir ? 'AIR' : 'SEA'} · ${lane[0]}→${lane[1]}</span><span>ETA ${eta}</span>`;
      moves.prepend(m);
      while (moves.children.length > 6) moves.lastChild.remove();
    };
    for (let i = 0; i < 6; i++) add();
    setInterval(add, 2200);
  })();

  /* ---------- dock doors ---------- */
  const track = document.getElementById('dock-track');
  const DOORS = 14;
  for (let i = 1; i <= DOORS; i++) {
    const d = document.createElement('div');
    d.className = 'door';
    d.innerHTML = `<div class="door-num"><span>DOOR</span><b>${String(i).padStart(2, '0')}</b></div><div class="door-frame"><span class="door-status">ASSIGNED</span><div class="trailer-rear"></div><div class="door-roll"></div></div>`;
    track.appendChild(d);
  }
  const doors = [...track.children];
  const dockCount = document.getElementById('dock-count');
  const docks = document.querySelector('.docks');
  function dockUpdate() {
    const r = docks.getBoundingClientRect();
    const p = clamp01(-r.top / (docks.offsetHeight - innerHeight));
    const dist = track.offsetWidth + innerWidth * 0.48 - innerWidth + 60;
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    let docked = 0;
    doors.forEach((d, i) => {
      const thr = (i + 1) / (DOORS + 2);
      const isDock = p > thr && i % 4 !== 2;
      d.classList.toggle('open', p > thr - 0.05);
      d.classList.toggle('docked', isDock);
      d.querySelector('.door-status').textContent = isDock
        ? 'LOADING'
        : p > thr - 0.05
          ? 'READY'
          : 'ASSIGNED';
      if (isDock) docked++;
    });
    dockCount.textContent = Math.round(docked * 13.5 + p * 40);
  }
  addEventListener('scroll', dockUpdate, { passive: true });
  addEventListener('resize', dockUpdate);
  dockUpdate();

  /* ---------- logos ---------- */
  const logos = [
    ['a', 'NORVIK', ''],
    ['b', 'Fairfield Textiles', ''],
    ['c', 'MERIDIAN', ''],
    ['d', 'portway', 'dot'],
    ['e', 'atlas/retail', ''],
    ['f', 'Cobalt Foods', 'sq'],
    ['a', 'KESTREL', ''],
    ['b', 'Linden & Co', ''],
  ];
  const mq = document.getElementById('mq');
  const html = logos
    .map(([c, t, ico]) => `<span class="lg ${c}">${ico ? `<i class="${ico}"></i>` : ''}${t}</span>`)
    .join('');
  mq.innerHTML = html + html;

  /* ---------- CTA form ---------- */
  document.getElementById('cta-form').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('cta-ok').textContent =
      'Thanks — connect this form to your email or CRM to receive quote requests.';
  });

  /* ---------- GSAP scroll animations ---------- */
  if (!hasGsap) {
    document.querySelectorAll('.rv').forEach((e) => {
      e.style.opacity = 1;
      e.style.transform = 'none';
    });
    return;
  }

  gsap.utils.toArray('.rv').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  gsap.to('#imagine-text .w', {
    opacity: 1,
    stagger: 0.12,
    ease: 'none',
    scrollTrigger: { trigger: '#imagine-text', start: 'top 80%', end: 'bottom 35%', scrub: true },
  });

  // features: active panel
  const feats = gsap.utils.toArray('.feat'),
    vis = gsap.utils.toArray('.vis');
  feats.forEach((f, i) =>
    ScrollTrigger.create({
      trigger: f,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => {
        if (self.isActive) {
          feats.forEach((x) => x.classList.toggle('active', x === f));
          vis.forEach((v, k) => v.classList.toggle('active', k === i));
        }
      },
    }),
  );

  // autopilot letters fly in
  function splitChars(id) {
    const el = document.getElementById(id);
    const t = el.textContent;
    el.textContent = '';
    return [...t].map((c) => {
      const s = document.createElement('span');
      s.className = 'c';
      s.innerHTML = c === ' ' ? '&nbsp;' : c;
      el.appendChild(s);
      return s;
    });
  }
  const ap1 = splitChars('ap1'),
    ap2 = splitChars('ap2');
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.autopilot', start: 'top top', end: 'bottom bottom', scrub: 1 },
  });
  tl.from(ap1, {
    x: () => gsap.utils.random(-innerWidth * 0.6, innerWidth * 0.6),
    y: () => gsap.utils.random(-innerHeight * 0.5, innerHeight * 0.5),
    rotate: () => gsap.utils.random(-90, 90),
    scale: () => gsap.utils.random(0.3, 2),
    opacity: 0,
    stagger: { each: 0.04, from: 'random' },
    ease: 'power3.out',
    duration: 1,
  })
    .from(ap2, { y: 60, opacity: 0, stagger: 0.03, ease: 'power3.out', duration: 0.5 }, '-=.3')
    .from('.ap-note', { opacity: 0, y: 20, duration: 0.4 }, '-=.2')
    .to({}, { duration: 0.4 });

  // stat counters
  document.querySelectorAll('[data-to]').forEach((el) => {
    const to = parseFloat(el.dataset.to),
      dec = +(el.dataset.dec || 0),
      o = { v: 0 };
    gsap.to(o, {
      v: to,
      duration: 2.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 95%' },
      onUpdate: () => (el.textContent = o.v.toFixed(dec)),
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();

/* =========================================================
   3. 3D STORY SCENES
   ========================================================= */
const isMobile = matchMedia('(max-width: 760px)').matches;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ss = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const clock = new THREE.Clock();
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => {
  mouse.x = e.clientX / innerWidth - 0.5;
  mouse.y = e.clientY / innerHeight - 0.5;
});

/* shared GLSL noise */
const NOISE = `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(1.6,1.2,-1.2,1.6);
    for (int i = 0; i < 6; i++){ v += a*noise(p); p = m*p; a *= .5; } return v; }
`;

/* =======================================================
   SKY
   ======================================================= */
function makeSky(c, sunDir) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uNight: { value: 0 },
      uSun: { value: sunDir },
      uTop: { value: new THREE.Vector3(...c.top) },
      uMid: { value: new THREE.Vector3(...c.mid) },
      uHor: { value: new THREE.Vector3(...c.hor) },
      uLow: { value: new THREE.Vector3(...c.low) },
      uGlow: { value: new THREE.Vector3(...(c.glow || [1, 0.62, 0.3])) },
      uGamma: { value: c.gamma || 1 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uNight, uGamma; uniform vec3 uSun, uTop, uMid, uHor, uLow, uGlow;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.12, h));
        c = mix(c, uTop, smoothstep(0.12, 0.62, h));
        c = mix(uLow, c, smoothstep(-0.08, 0.0, h));
        float s = max(dot(d, normalize(uSun)), 0.0);
        c += uGlow * pow(s, 24.0) * 0.8 + vec3(1.0,0.86,0.62) * pow(s, 700.0) * 2.2;
        vec3 night = mix(vec3(0.028,0.043,0.10), vec3(0.05,0.08,0.19), smoothstep(-0.2, 0.5, h));
        gl_FragColor = vec4(pow(max(mix(c, night, uNight), 0.), vec3(uGamma)), 1.0);
      }`,
  });
}

const defaultPhase = (p) => ({
  solid: 1 - ss(0.24, 0.42, p),
  edge: ss(0.15, 0.27, p) * (1 - ss(0.46, 0.6, p)),
  night: ss(0.3, 0.55, p),
  env: 1 - ss(0.32, 0.5, p),
  parts: ss(0.34, 0.46, p) * (1 - ss(0.94, 1.0, p) * 0.5),
  scatter: ss(0.6, 0.98, p),
  stars: ss(0.5, 0.75, p) * 0.8,
  grid: ss(0.2, 0.32, p) * (1 - ss(0.5, 0.64, p)) * 0.4,
  holo: 0,
});

/* =======================================================
   STORY ENGINE — shared by sea, air and road scenes
   visual → wireframe → particles → data
   ======================================================= */
function createStory(cfg) {
  const section = document.querySelector(cfg.sel);
  const canvas = section.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.exposure || 1.05;
  renderer.shadowMap.enabled = !!cfg.shadow;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, cfg.far);
  const sunDir = new THREE.Vector3(...cfg.sun).normalize();
  const skyMat = makeSky({ ...cfg.sky, gamma: cfg.bloom ? 2.2 : 1 }, sunDir);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(cfg.skyR, 48, 24), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);
  const fogDay = new THREE.Color(cfg.fog),
    fogNight = new THREE.Color(0x070b1a);
  scene.fog = new THREE.Fog(cfg.fog, cfg.fogNear, cfg.fogFar);

  const hemi = new THREE.HemisphereLight(cfg.hemi[0], cfg.hemi[1], cfg.hemi[2]);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(cfg.key[0], cfg.key[1]);
  key.position.set(...cfg.keyPos);
  scene.add(key);
  if (cfg.shadow) {
    key.castShadow = true;
    key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    const b = cfg.shadow;
    Object.assign(key.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 1, far: cfg.shadowFar });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
  }
  const rim = new THREE.DirectionalLight(cfg.rim[0], cfg.rim[1]);
  rim.position.copy(sunDir).multiplyScalar(100);
  scene.add(rim);

  /* materials & meshes registered by builders */
  const solidMats = [],
    meshes = [];
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xbfe0ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  if (cfg.edgeColor) edgeMat.color.setRGB(...cfg.edgeColor);
  if (cfg.edgeFog) edgeMat.fog = true;
  const extraLines = [];
  const ctx = {
    scene,
    sunDir,
    isMobile,
    fogDay,
    sky: skyMat,
    hemi,
    key,
    rim,
    edgeMat,
    addLines(parent, geo) {
      const l = new THREE.LineSegments(geo, edgeMat);
      parent.add(l);
      extraLines.push(l);
      return l;
    },
    M(color, rough = 0.6, metal = 0.1, extra = {}) {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: rough,
        metalness: metal,
        transparent: true,
        ...extra,
      });
      solidMats.push(m);
      return m;
    },
    add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, wire = false) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = m.receiveShadow = !!cfg.shadow;
      m.userData.wire = wire;
      parent.add(m);
      meshes.push(m);
      return m;
    },
  };
  const model = cfg.build(ctx);
  scene.add(model.group);

  meshes.forEach((m) => {
    const g = m.userData.wire
      ? new THREE.WireframeGeometry(m.geometry)
      : new THREE.EdgesGeometry(m.geometry, 25);
    m.add(new THREE.LineSegments(g, edgeMat));
  });

  /* particles sampled from the model's surfaces */
  const COUNT = isMobile ? 14000 : 36000;
  scene.updateMatrixWorld(true);
  const tA = new THREE.Vector3(),
    tB = new THREE.Vector3(),
    tC = new THREE.Vector3();
  const sampled = meshes.filter((m) => !m.userData.noSample);
  const areas = sampled.map((m) => {
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = geo.attributes.position;
    let a = 0;
    for (let i = 0; i < p.count; i += 3) {
      tA.fromBufferAttribute(p, i);
      tB.fromBufferAttribute(p, i + 1);
      tC.fromBufferAttribute(p, i + 2);
      tB.sub(tA);
      tC.sub(tA);
      a += tB.cross(tC).length() / 2;
    }
    const s = new THREE.Vector3();
    m.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
    return a * s.x * s.y; // approximate world scale
  });
  const totalArea = areas.reduce((s, a) => s + a, 0);
  const pos = new Float32Array(COUNT * 3),
    rnd = new Float32Array(COUNT * 3),
    seed = new Float32Array(COUNT);
  let w = 0;
  const tmp = new THREE.Vector3();
  sampled.forEach((m, mi) => {
    const n = mi === sampled.length - 1 ? COUNT - w : Math.round((COUNT * areas[mi]) / totalArea);
    if (n <= 0) return;
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(m.geometry)).build();
    for (let i = 0; i < n && w < COUNT; i++, w++) {
      sampler.sample(tmp);
      tmp.applyMatrix4(m.matrixWorld);
      pos.set([tmp.x, tmp.y, tmp.z], w * 3);
      const th = Math.random() * Math.PI * 2,
        ph = Math.acos(2 * Math.random() - 1),
        r = 0.4 + Math.random();
      rnd.set(
        [Math.sin(ph) * Math.cos(th) * r, Math.abs(Math.cos(ph)) * r * 0.8, Math.sin(ph) * Math.sin(th) * r],
        w * 3,
      );
      seed[w] = Math.random();
    }
  });
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: { value: 0 },
      uScatter: { value: 0 },
      uTime: { value: 0 },
      uPx: { value: renderer.getPixelRatio() },
      uScale: { value: cfg.pScale },
      uSpread: { value: cfg.pSpread },
    },
    vertexShader: `
      attribute vec3 aRand; attribute float aSeed;
      uniform float uScatter, uTime, uPx, uScale, uSpread; varying float vA; varying float vS;
      void main(){
        float t = clamp(uScatter*1.5 - aSeed*0.5, 0., 1.); t = t*t*(3.-2.*t);
        vec3 p = position;
        p += aRand * t * uSpread;
        p.y += t * t * uSpread * 0.4 * aSeed;
        p += vec3(sin(uTime*.7 + aSeed*40.), cos(uTime*.6 + aSeed*30.), sin(uTime*.5 + aSeed*20.)) * (0.03 + t*.6) * (uSpread/26.);
        vec4 mv = modelViewMatrix * vec4(p,1.);
        gl_PointSize = (1.2 + aSeed*1.8) * uPx * (uScale / -mv.z) * (1.0 + t*0.6);
        gl_Position = projectionMatrix * mv;
        vA = 1.0 - t*0.55; vS = aSeed;
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vA; varying float vS;
      void main(){
        float d = length(gl_PointCoord - .5); if (d > .5) discard;
        float a = smoothstep(.5, 0., d);
        vec3 c = mix(vec3(.55,.75,1.), vec3(.86,.96,1.), vS);
        if (vS > .985) c = vec3(.78,.96,.23);
        gl_FragColor = vec4(c, a * uOpacity * vA);
      }`,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  /* starfield */
  const sN = 2600,
    sp = new Float32Array(sN * 3);
  for (let i = 0; i < sN; i++) {
    const v = new THREE.Vector3()
      .randomDirection()
      .multiplyScalar(cfg.starR[0] + Math.random() * (cfg.starR[1] - cfg.starR[0]));
    v.y = Math.abs(v.y) * 0.9 + cfg.starR[0] * 0.04;
    sp.set([v.x, v.y, v.z], i * 3);
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sMat = new THREE.PointsMaterial({
    color: 0xaac4ff,
    size: 1.4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  scene.add(new THREE.Points(sGeo, sMat));

  /* digital grid that appears in the wireframe phase */
  const grid = new THREE.GridHelper(
    cfg.grid[0],
    cfg.grid[1],
    cfg.gridColor || 0x7f9cff,
    cfg.gridColor || 0x4a62b8,
  );
  grid.position.y = cfg.grid[2];
  grid.material.transparent = true;
  grid.material.opacity = 0;
  grid.material.depthWrite = false;
  scene.add(grid);

  /* camera path */
  /* mirrored wireframe on the water (hologram reflection) */
  const mirrors = [];
  let mirrorMat = null;
  if (cfg.mirror) {
    mirrorMat = edgeMat.clone();
    scene.updateMatrixWorld(true);
    const R = new THREE.Matrix4().makeScale(1, -1, 1);
    const lines = [];
    meshes.forEach((m) =>
      m.children.forEach((c) => {
        if (c.isLineSegments) lines.push(c);
      }),
    );
    extraLines.forEach((l) => lines.push(l));
    lines.forEach((src) => {
      const l = new THREE.LineSegments(src.geometry, mirrorMat);
      l.matrixAutoUpdate = false;
      l.matrix.multiplyMatrices(R, src.matrixWorld);
      l.renderOrder = -2;
      scene.add(l);
      mirrors.push([src, l]);
    });
  }
  const chainVisible = (o) => {
    while (o) {
      if (!o.visible) return false;
      o = o.parent;
    }
    return true;
  };

  /* hologram fill: solid surfaces turn into translucent glowing glass */
  const holoCol = new THREE.Color(...(cfg.holoColor || [0, 0, 0])),
    black = new THREE.Color(0);
  if (cfg.holoColor)
    solidMats.forEach((m) => {
      m.userData.c0 = m.color.clone();
      m.userData.e0 = m.emissive.clone();
      m.userData.ei0 = m.emissiveIntensity;
    });

  /* optional bloom */
  let composer = null;
  if (cfg.bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(innerWidth, innerHeight),
        cfg.bloom[0],
        cfg.bloom[1],
        cfg.bloom[2],
      ),
    );
    composer.addPass(new OutputPass());
  }

  // camera glides along smooth splines through the key points (no stop-start at each key)
  const cp = new THREE.Vector3(),
    cl = new THREE.Vector3();
  const posCurve = new THREE.CatmullRomCurve3(
    cfg.keys.map((k) => new THREE.Vector3(...k[1])),
    false,
    'centripetal',
  );
  const lookCurve = new THREE.CatmullRomCurve3(
    cfg.keys.map((k) => new THREE.Vector3(...k[2])),
    false,
    'centripetal',
  );
  function camAt(p) {
    const K = cfg.keys;
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1][0]) i++;
    const u = clamp01((p - K[i][0]) / (K[i + 1][0] - K[i][0]));
    const q = (i + u) / (K.length - 1);
    posCurve.getPoint(q, cp);
    lookCurve.getPoint(q, cl);
  }

  let pr = Math.min(devicePixelRatio, isMobile ? 1.5 : 2);
  function resize() {
    const w = innerWidth,
      h = innerHeight;
    renderer.setPixelRatio(pr);
    pMat.uniforms.uPx.value = pr;
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    }
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 58 : 34;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let visible = false,
    sp_ = 0;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '200px' }).observe(section);

  function render(t, dt) {
    if (!visible) return;
    sp_ += ((section.__p || 0) - sp_) * (1 - Math.exp(-dt * 5.2)); // frame-rate independent easing
    if (Math.abs((section.__p || 0) - sp_) < 1e-5) sp_ = section.__p || 0;
    const p = sp_;
    section.__set && section.__set(p);

    const ph = (cfg.phase || defaultPhase)(p);
    const { solid, edge, night, env, holo } = ph;

    if (holo > 0.001 && cfg.holoColor) {
      solidMats.forEach((m) => {
        const u = m.userData;
        if (u.noHolo) {
          m.opacity = solid;
          m.depthWrite = solid > 0.5;
          m.visible = solid > 0.002;
          return;
        }
        m.color.copy(u.c0).lerp(black, holo);
        m.emissive.copy(u.e0).lerp(holoCol, holo);
        m.emissiveIntensity = lerp(u.ei0, cfg.holoGlow || 1, holo);
        m.opacity = Math.max(solid, holo * (cfg.holoFill || 0.16));
        m.depthWrite = solid > 0.5;
        m.visible = m.opacity > 0.002;
      });
    } else {
      solidMats.forEach((m) => {
        if (cfg.holoColor) {
          const u = m.userData;
          m.color.copy(u.c0);
          m.emissive.copy(u.e0);
          m.emissiveIntensity = u.ei0;
        }
        m.opacity = solid;
        m.depthWrite = solid > 0.5;
        m.visible = solid > 0.002;
      });
    }
    edgeMat.opacity = edge * 0.9;
    if (mirrorMat) {
      mirrorMat.opacity = edge * 0.28;
      mirrors.forEach(([src, l]) => {
        l.visible = edge > 0.002 && chainVisible(src);
      });
    }
    grid.material.opacity = ph.grid;
    skyMat.uniforms.uNight.value = night;
    scene.fog.color.copy(fogDay).lerp(fogNight, night);
    scene.fog.near = lerp(cfg.fogNear, cfg.fogNear * 2, night);
    scene.fog.far = lerp(cfg.fogFar, cfg.fogFar * 3, night);
    hemi.intensity = lerp(cfg.hemi[2], 0.2, night);
    pMat.uniforms.uOpacity.value = ph.parts;
    pMat.uniforms.uScatter.value = ph.scatter;
    pMat.uniforms.uTime.value = t;
    sMat.opacity = ph.stars;

    model.update(t, { ...ph, p, fog: scene.fog, dt });

    camAt(p);
    const f = camera.aspect < 1 ? 1.75 : 1; // pull back on portrait screens
    const px = cfg.parallax;
    camera.position.set(
      cl.x + (cp.x - cl.x) * f + mouse.sx * px,
      cl.y + (cp.y - cl.y) * f - mouse.sy * px * 0.55,
      cl.z + (cp.z - cl.z) * f,
    );
    camera.lookAt(cl);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  canvas.classList.add('ready');
  return {
    render,
    isVisible: () => visible,
    setPR(v) {
      if (Math.abs(v - pr) < 0.01) return;
      pr = v;
      resize();
    },
    maxPR: Math.min(devicePixelRatio, isMobile ? 1.5 : 2),
  };
}

/* =======================================================
   SEA — container ship on a sunset ocean
   ======================================================= */
function corrugationTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 128, 64);
  for (let x = 0; x < 128; x += 4) {
    g.fillStyle = 'rgba(0,0,0,.16)';
    g.fillRect(x, 0, 1.5, 64);
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.fillRect(x + 2, 0, 1, 64);
  }
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(0, 0, 128, 3);
  g.fillRect(0, 61, 128, 3);
  g.fillRect(0, 0, 3, 64);
  g.fillRect(125, 0, 3, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function buildShip(ctx) {
  const { M, add } = ctx;
  const g = new THREE.Group();
  const ship = new THREE.Group();
  g.add(ship);
  const port = new THREE.Group();
  port.visible = false;
  g.add(port);
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  /* ================= SHIP ================= */
  const hull = new THREE.Shape();
  hull.moveTo(-30, -4.45);
  hull.lineTo(21, -4.6);
  hull.quadraticCurveTo(29, -4.0, 31.6, 0);
  hull.quadraticCurveTo(29, 4.0, 21, 4.6);
  hull.lineTo(-30, 4.45);
  hull.quadraticCurveTo(-31.7, 4.2, -31.9, 0);
  hull.quadraticCurveTo(-31.7, -4.2, -30, -4.45);
  const hullGeo = (depth) => {
    const geo = new THREE.ExtrudeGeometry(hull, { depth, bevelEnabled: false, curveSegments: 20 });
    geo.rotateX(-Math.PI / 2);
    return geo;
  };
  const halfW = (x) =>
    x > 21
      ? 4.6 * Math.max(0, 1 - Math.pow((x - 21) / 10.6, 1.6))
      : x < -30
        ? 4.45 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 30) / 1.9, 2)))
        : 4.5;

  const hullM = M(0x1a2129, 0.55, 0.35),
    red = M(0x7a2a22, 0.8, 0.1),
    white = M(0xe6e5e0, 0.45, 0.15);
  const glass = M(0x0c1218, 0.08, 0.8),
    dark = M(0x262c32, 0.7, 0.4),
    lime = M(0xc8f43a, 0.4, 0.1, { emissive: 0x9fe01a, emissiveIntensity: 0.6 });
  const warm = M(0x2a1a0c, 0.25, 0.3, { emissive: 0xffb15a, emissiveIntensity: 0.9 });
  const warmBridge = M(0x2a1a0c, 0.2, 0.4, { emissive: 0xffc27a, emissiveIntensity: 1.4 });
  add(ship, hullGeo(2.6), red, 0, -2.4, 0);
  add(ship, hullGeo(4.2), hullM, 0, 0.2, 0);
  add(ship, hullGeo(0.18), white, 0, 0.18, 0);
  const deckGeo = new THREE.ShapeGeometry(hull, 20);
  deckGeo.rotateX(-Math.PI / 2);
  add(ship, deckGeo, M(0x3c4644, 0.9, 0.1), 0, 4.41, 0);
  // raised bow bulwark
  const bow = new THREE.Shape();
  bow.moveTo(20, -4.6);
  bow.quadraticCurveTo(29, -4.0, 31.6, 0);
  bow.quadraticCurveTo(29, 4.0, 20, 4.6);
  bow.lineTo(20, -4.6);
  const bowGeo = new THREE.ExtrudeGeometry(bow, { depth: 1.4, bevelEnabled: false, curveSegments: 16 });
  bowGeo.rotateX(-Math.PI / 2);
  add(ship, bowGeo, hullM, 0, 4.4, 0);

  // containers — muted, realistic palette
  const palette = [
    0x8e3a30, 0x2b4f6e, 0x9a6a33, 0x2f5f55, 0x6d7278, 0xa9a397, 0x4d3b5c, 0x9f8a45, 0x26394a, 0x8a4a2f,
    0x3a5236, 0xb8b5ad, 0x2b4f6e, 0x1f2e3b,
  ];
  const boxes = [],
    hatches = [],
    lash = [];
  const col = new THREE.Color();
  let x = -16.4,
    bay = 0;
  while (x < 20.5) {
    const hw = halfW(x + 1.3);
    hatches.push([x + 1.3, hw]);
    for (let r = 0; r < 8; r++) {
      const z = (r - 3.5) * 1.06;
      if (Math.abs(z) + 0.55 > hw) continue;
      let tiers = 5 + ((Math.random() * 3) | 0);
      if (x > 14) tiers = Math.min(tiers, 5);
      if (Math.random() < 0.04) tiers = 2 + ((Math.random() * 2) | 0);
      for (let k = 0; k < tiers; k++) {
        const b = new THREE.BoxGeometry(2.52, 0.97, 1.0);
        b.translate(x + 1.3, 5.2 + k * 1.0, z);
        col.setHex(palette[(Math.random() * palette.length) | 0]);
        const shade = 0.8 + Math.random() * 0.25;
        const n = b.attributes.position.count,
          c = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) c.set([col.r * shade, col.g * shade, col.b * shade], i * 3);
        b.setAttribute('color', new THREE.BufferAttribute(c, 3));
        boxes.push(b);
      }
    }
    bay++;
    x += 2.62;
    if (bay % 2 === 0) {
      lash.push([x + 0.1, halfW(x)]);
      x += 0.55;
    }
  }
  add(
    ship,
    mergeGeometries(boxes),
    M(0xffffff, 0.65, 0.2, { vertexColors: true, map: corrugationTexture() }),
  );
  const hatchG = [],
    lashG = [];
  hatches.forEach(([hx, hw]) => {
    const b = new THREE.BoxGeometry(2.62, 0.3, hw * 2 - 0.4);
    b.translate(hx, 4.55, 0);
    hatchG.push(b);
  });
  lash.forEach(([lx, hw]) => {
    if (lx > 21) return;
    const b = new THREE.BoxGeometry(0.2, 2.6, hw * 2 - 0.3);
    b.translate(lx, 5.7, 0);
    lashG.push(b);
  });
  add(ship, mergeGeometries(hatchG), M(0x4a5250, 0.8, 0.3));
  add(ship, mergeGeometries(lashG), dark);

  // accommodation & bridge
  add(ship, B(4.6, 10.4, 7.0), white, -21.5, 9.6, 0);
  for (let i = 0; i < 7; i++) {
    add(ship, B(0.06, 0.32, 6.3), i % 2 ? warm : glass, -19.18, 5.7 + i * 1.4, 0);
    add(ship, B(3.9, 0.32, 0.06), glass, -21.5, 5.7 + i * 1.4, 3.52);
    add(ship, B(3.9, 0.32, 0.06), glass, -21.5, 5.7 + i * 1.4, -3.52);
  }
  add(ship, B(3.4, 1.8, 11.2), white, -21.2, 15.7, 0);
  add(ship, B(0.06, 0.75, 10.8), warmBridge, -19.48, 15.85, 0);
  add(ship, B(3.7, 0.16, 11.4), white, -21.2, 16.68, 0);
  add(ship, B(0.25, 2.6, 0.25), dark, -22, 18, 0);
  add(ship, B(0.2, 0.15, 3.0), dark, -22, 19, 0);
  add(
    ship,
    B(0.12, 0.12, 0.12),
    M(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 4 }),
    -22,
    19.4,
    0,
  );
  add(
    ship,
    B(0.2, 0.2, 0.2),
    M(0xff3b30, 0.3, 0, { emissive: 0xff2a1f, emissiveIntensity: 4 }),
    -21.2,
    15.9,
    5.65,
  );
  add(
    ship,
    B(0.2, 0.2, 0.2),
    M(0x34c759, 0.3, 0, { emissive: 0x22dd55, emissiveIntensity: 4 }),
    -21.2,
    15.9,
    -5.65,
  );
  // funnel
  add(ship, B(2.6, 8.8, 3.0), M(0x23292f, 0.6, 0.3), -26, 8.8, 0);
  add(ship, B(2.66, 0.45, 3.06), lime, -26, 11.4, 0);
  add(ship, B(2.7, 0.9, 3.1), M(0x0e1012, 0.7, 0.2), -26, 13.6, 0);
  add(ship, B(4.0, 1.3, 7.2), hullM, -28.6, 5.05, 0);
  add(ship, new THREE.CylinderGeometry(0.1, 0.12, 6.5, 10), white, 27.2, 9.4, 0);
  add(
    ship,
    B(0.15, 0.15, 0.15),
    M(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 4 }),
    27.2,
    12.7,
    0,
  );

  // brand name on both sides of the hull
  {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 160;
    const x2 = c.getContext('2d');
    x2.fillStyle = '#ffffff';
    x2.font = '700 120px "Inter Tight", Arial, sans-serif';
    x2.textBaseline = 'middle';
    const label = 'BATIE LOGISTIC';
    const tw = x2.measureText(label).width,
      sc = Math.min(1, 1900 / tw);
    x2.save();
    x2.scale(sc, 1);
    x2.fillText(label, 20 / sc, 84);
    x2.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const nameMat = M(0xffffff, 0.6, 0, { map: tex, transparent: true, alphaTest: 0.1 });
    const nm = new THREE.PlaneGeometry(30, 2.0);
    const n1 = new THREE.Mesh(nm, nameMat);
    n1.position.set(-1, 3.15, 4.68);
    ship.add(n1);
    const n2 = new THREE.Mesh(nm, nameMat);
    n2.position.set(-1, 3.15, -4.68);
    n2.rotation.y = Math.PI;
    ship.add(n2);
  }

  // hull grid lines for the hologram phase
  {
    const pts = hull.getPoints(26);
    const v = [];
    [-2.4, -1.1, 0.2, 1.3, 2.4, 3.4, 4.4].forEach((h) => {
      for (let i = 0; i < pts.length - 1; i++) v.push(pts[i].x, h, -pts[i].y, pts[i + 1].x, h, -pts[i + 1].y);
    });
    for (let xx = -29.5; xx <= 31; xx += 2.2) {
      const hw = halfW(xx);
      if (hw < 0.2) continue;
      [-1, 1].forEach((sg) => v.push(xx, -2.4, sg * hw, xx, 4.4, sg * hw));
      v.push(xx, -2.4, -hw, xx, -2.4, hw);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    ctx.addLines(ship, lg);
  }

  // thin lime light line along the hull (as in the reference)
  const stripMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime, uOpacity; varying vec2 vUv;
      void main(){ float head = fract(uTime * .18);
        float pulse = exp(-pow((vUv.x - head) * 9., 2.)) * 2.5;
        float base = .55 * smoothstep(0., .04, vUv.x) * smoothstep(1., .96, vUv.x);
        float edge = smoothstep(.5, .0, abs(vUv.y - .5));
        gl_FragColor = vec4(vec3(.75, 1.6, .2) * (base + pulse) * edge, uOpacity); }`,
  });
  const stripGeo = new THREE.PlaneGeometry(52, 0.16);
  const s1 = new THREE.Mesh(stripGeo, stripMat);
  s1.position.set(-3.5, 1.35, 4.64);
  ship.add(s1);
  const s2 = new THREE.Mesh(stripGeo, stripMat);
  s2.position.set(-3.5, 1.35, -4.64);
  s2.rotation.y = Math.PI;
  ship.add(s2);

  /* ================= PORT (blue hour) ================= */
  const quayG = new THREE.Group(),
    cranesG = new THREE.Group(),
    yardG = new THREE.Group();
  port.add(quayG, cranesG, yardG);
  let cur = quayG;
  const addP = (...args) => {
    const m = add(cur, ...args);
    m.userData.noSample = true;
    return m;
  };
  const concrete = M(0x6c727a, 0.9, 0.05);
  concrete.userData.noHolo = true;
  const _c = 0,
    craneM = M(0xb9c5cf, 0.45, 0.45),
    craneDark = M(0x56616b, 0.6, 0.4);
  const lampM = M(0xffe2b0, 0.3, 0, { emissive: 0xffc070, emissiveIntensity: 5 });
  const limeLight = M(0xc8f43a, 0.3, 0, { emissive: 0xb6ff2a, emissiveIntensity: 4 });
  addP(B(300, 6.4, 70), concrete, 0, 0, -41.5);
  addP(B(300, 0.25, 0.6), M(0xd9b23c, 0.6, 0.1), 0, 3.33, -7.6); // quay edge marking
  const beam = (a, b, w, mat) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    const m = addP(B(w, len, w), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const crane = (cx) => {
    cur = cranesG;
    [-9, -25].forEach((z) => [-6, 6].forEach((dx) => addP(B(1.1, 33, 1.1), craneM, cx + dx, 19.7, z)));
    [-9, -25].forEach((z) => addP(B(13.2, 1.6, 1.6), craneM, cx, 36.2, z));
    [-6, 6].forEach((dx) => addP(B(1.6, 1.6, 17.6), craneM, cx + dx, 36.2, -17));
    [-9, -25].forEach((z) => addP(B(13.2, 0.9, 0.9), craneDark, cx, 12, z));
    [-2.2, 2.2].forEach((dx) => addP(B(1.0, 2.8, 80), craneM, cx + dx, 40.4, -6));
    for (let z = -44; z <= 32; z += 4) addP(B(5.4, 0.25, 0.25), craneDark, cx, 39.1, z);
    addP(B(7.5, 4.4, 10), craneM, cx, 44.2, -33);
    [-2.2, 2.2].forEach((dx) => {
      beam(V(cx + dx, 41.6, -13), V(cx, 59, -18), 0.7, craneM);
      beam(V(cx + dx, 41.6, -24), V(cx, 59, -18), 0.7, craneM);
    });
    [-2.2, 2.2].forEach((dx) => {
      beam(V(cx, 59, -18), V(cx + dx, 41.8, 31), 0.3, craneDark);
      beam(V(cx, 59, -18), V(cx + dx, 41.8, -44), 0.3, craneDark);
    });
    addP(B(4.8, 2.2, 5), craneDark, cx, 38.2, 1 + (cx % 7));
    for (let z = -40; z <= 30; z += 14) addP(B(0.6, 0.3, 0.6), limeLight, cx, 38.6, z);
  };
  [-20, 2, 24].forEach(crane);
  // container yard with a long aisle (the light tunnel)
  cur = yardG;
  {
    const yb = [];
    const ypal = [0x8e3a30, 0x2b4f6e, 0x9a6a33, 0x2f5f55, 0x6d7278, 0xa9a397, 0x26394a, 0x8a4a2f, 0xb8b5ad];
    const xr = isMobile ? 70 : 120;
    for (let xx = -xr; xx < xr; xx += 2.62) {
      if ((xx + 400) % 31 < 5) continue; // cross lanes
      [
        [-37.6, 1],
        [-42.4, -1],
      ].forEach(([z0, dir]) => {
        for (let r = 0; r < 6; r++) {
          const z = z0 + dir * r * 1.06;
          const tiers = r < 2 ? 5 + ((Math.random() * 2) | 0) : 3 + ((Math.random() * 3) | 0);
          for (let k = 0; k < tiers; k++) {
            const b = new THREE.BoxGeometry(2.5, 0.97, 1.0);
            b.translate(xx, 3.7 + k, z);
            col.setHex(ypal[(Math.random() * ypal.length) | 0]);
            const sh = 0.75 + Math.random() * 0.3;
            const n = b.attributes.position.count,
              c = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) c.set([col.r * sh, col.g * sh, col.b * sh], i * 3);
            b.setAttribute('color', new THREE.BufferAttribute(c, 3));
            yb.push(b);
          }
        }
      });
    }
    addP(mergeGeometries(yb), M(0xffffff, 0.7, 0.15, { vertexColors: true, map: corrugationTexture() }));
  }
  cur = cranesG;
  for (let xx = -110; xx <= 110; xx += 22) {
    [-29, -52].forEach((z) => {
      addP(B(0.35, 20, 0.35), craneDark, xx, 13.2, z);
      addP(B(1.6, 0.4, 1.6), lampM, xx, 23.3, z);
    });
  }

  /* ================= OCEAN ================= */
  const WAVES = [
    [0.075, 0.03, 0.42, 0.9],
    [-0.045, 0.085, 0.3, 1.1],
    [0.12, -0.07, 0.18, 1.45],
    [0.021, 0.012, 0.55, 0.5],
  ];
  const FLOW = 7.0;
  let amp = 0.5;
  const swellAt = (x, z, t) => {
    let h = 0;
    const px = x + t * FLOW;
    for (const [kx, kz, a, w] of WAVES) h += a * Math.sin(px * kx + z * kz + t * w);
    return h * amp;
  };
  const waveGLSL = WAVES.map(
    ([kx, kz, a, w]) => `vec4(${kx.toFixed(4)}, ${kz.toFixed(4)}, ${a.toFixed(3)}, ${w.toFixed(3)})`,
  ).join(',');
  const SWELL = `
    uniform float uAmp, uFlow;
    const vec4 WV[4] = vec4[4](${waveGLSL});
    vec3 swell(vec2 p, float t){
      vec3 r = vec3(0.);
      for (int i = 0; i < 4; i++){
        float ph = dot(p, WV[i].xy) + t * WV[i].w;
        r.x += WV[i].z * sin(ph);
        r.yz += WV[i].z * cos(ph) * WV[i].xy;
      }
      return r * uAmp;
    }`;
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uNight: { value: 0 },
      uHolo: { value: 0 },
      uAmp: { value: amp },
      uFlow: { value: FLOW },
      uWake: { value: 1 },
      uSun: { value: ctx.sunDir },
      uFog: { value: new THREE.Color() },
      uFogNear: { value: 0 },
      uFogFar: { value: 1 },
      uDeep: { value: new THREE.Vector3(0.03, 0.05, 0.07) },
      uTop: { value: new THREE.Vector3() },
      uMid: { value: new THREE.Vector3() },
      uHor: { value: new THREE.Vector3() },
      uGlow: { value: new THREE.Vector3() },
    },
    vertexShader: `
      uniform float uTime; varying vec3 vWorld; varying float vH;
      ${SWELL}
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.);
        vec3 sw = swell(w.xz + vec2(uTime * uFlow, 0.), uTime);
        w.y += sw.x; vH = sw.x;
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime, uOpacity, uNight, uHolo, uWake, uFogNear, uFogFar;
      uniform vec3 uSun, uFog, uDeep, uTop, uMid, uHor, uGlow;
      varying vec3 vWorld; varying float vH;
      ${NOISE}
      ${SWELL}
      float fine(vec2 p){
        return 0.07*sin(dot(p, vec2(0.42,0.18)) + uTime*2.3)
             + 0.05*sin(dot(p, vec2(-0.31,0.47)) + uTime*2.9)
             + 0.035*sin(dot(p, vec2(0.71,-0.52)) + uTime*3.7)
             + 0.04*sin(dot(p, vec2(0.93,0.37)) + uTime*4.1)
             + 0.03*sin(dot(p, vec2(-0.66,-0.88)) + uTime*4.6)
             + 0.022*sin(dot(p, vec2(1.31,-0.29)) + uTime*5.3)
             + 0.016*sin(dot(p, vec2(-0.21,1.57)) + uTime*5.9);
      }
      vec3 skyCol(vec3 d){
        float h = max(d.y, 0.);
        vec3 c = mix(uHor, uMid, smoothstep(0., .12, h));
        c = mix(c, uTop, smoothstep(.12, .62, h));
        float s = max(dot(d, uSun), 0.);
        return c + uGlow*pow(s, 24.)*.8;
      }
      void main(){
        float dist = length(cameraPosition - vWorld);
        float detail = 1.0 - smoothstep(50., 420., dist);
        vec2 p = vWorld.xz + vec2(uTime * uFlow, 0.);
        vec3 sw = swell(p, uTime);
        float e = 0.12;
        float f0 = fine(p), fx = fine(p + vec2(e,0.)), fz = fine(p + vec2(0.,e));
        vec2 grad = sw.yz + detail * uAmp * 1.6 * vec2(fx - f0, fz - f0) / e;
        vec3 n = normalize(vec3(-grad.x, 1., -grad.y));
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 R = reflect(-V, n); R.y = abs(R.y);
        float fres = 0.02 + 0.98*pow(1. - max(dot(n, V), 0.), 5.);
        vec3 col = mix(uDeep, skyCol(R), fres);
        float sd = max(dot(R, uSun), 0.);
        float tw = .7 + .6*sin(dot(p, vec2(2.1,1.3)) + uTime*5.) * sin(dot(p, vec2(-1.7,2.4)) - uTime*4.);
        col += uGlow * (pow(sd, 520.)*9.*tw + pow(sd, 70.)*.5);

        float x = vWorld.x, z = abs(vWorld.z);
        float hw = x > 21. ? 4.6*max(0., 1. - pow((x-21.)/10.6, 1.6)) : 4.5;
        float foam = 0.;
        float behind = -31.5 - x;
        if (behind > 0.) {
          float spread = 4.6 + behind*0.2;
          float arm = 1. - smoothstep(0., 2.2 + behind*.045, abs(z - spread));
          float turb = fbm(p*.22 + vec2(uTime*.4, 0.));
          float center = (1. - smoothstep(0., 3.4 + behind*.07, z)) * (.55 + .7*turb);
          foam = (arm*.6 + center) * exp(-behind*0.0095);
        }
        float side = 1. - smoothstep(0., 1.3 + smoothstep(14.,31.,x)*2.2, abs(z - hw));
        if (x > -33. && x < 32.) foam = max(foam, side * (0.3 + 0.7*smoothstep(6., 31., x)));
        foam *= smoothstep(0.22, 0.72, noise(p*0.55) * 0.6 + noise(p*1.8 + uTime*.5)*0.5) * uWake;
        if (x > -32. && x < 31.) col *= 1. - .3*(1. - smoothstep(0., 3.5, z - hw));
        col = mix(col, vec3(1.0,.94,.88)*(.6 + .3*n.y) * (uFog*.5 + .5), clamp(foam*1.3, 0., .85));

        col = mix(col, uFog, smoothstep(uFogNear, uFogFar, dist));
        // hologram: black glass floor with a faint lime grid
        vec2 gp = abs(fract(vWorld.xz / 6.) - .5);
        float gl = (1. - smoothstep(.0, .035, min(gp.x, gp.y))) * (1. - smoothstep(60., 260., dist));
        vec3 holo = vec3(.006,.01,.008) + vec3(.35,.9,.1) * gl * .25 + uGlow * pow(sd, 70.) * .0;
        col = mix(col, holo, uHolo);
        col = mix(col, vec3(.01,.012,.015), uNight * (1. - uHolo) * .9);
        gl_FragColor = vec4(pow(max(col, 0.), vec3(2.2)), uOpacity * mix(1., .72, uHolo));
      }`,
  });
  const wGeo = new THREE.PlaneGeometry(2, 2, isMobile ? 200 : 320, isMobile ? 200 : 320);
  const wp = wGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const u = wp.getX(i),
      v = wp.getY(i);
    wp.setXY(
      i,
      Math.sign(u) * Math.pow(Math.abs(u), 1.9) * 900,
      Math.sign(v) * Math.pow(Math.abs(v), 1.9) * 900,
    );
  }
  wGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wGeo, waterMat);
  water.frustumCulled = false;
  water.renderOrder = -1;
  g.add(water);

  /* bow spray & stern wash */
  const sprayN = isMobile ? 500 : 1100;
  const sp = new Float32Array(sprayN * 3),
    sv = new Float32Array(sprayN * 3),
    ss_ = new Float32Array(sprayN);
  for (let i = 0; i < sprayN; i++) {
    const side = Math.random() < 0.5 ? -1 : 1,
      stern = i > sprayN * 0.72;
    if (!stern) {
      const xx = 22 + Math.random() * 9;
      sp.set([xx, 0.2, side * (halfW(xx) + 0.2)], i * 3);
      sv.set([-3 - Math.random() * 6, 1.2 + Math.random() * 3, side * (1.5 + Math.random() * 3.5)], i * 3);
    } else {
      sp.set([-32 - Math.random() * 2, 0.1, side * Math.random() * 2.5], i * 3);
      sv.set([-4 - Math.random() * 5, 0.6 + Math.random() * 1.4, side * Math.random() * 1.5], i * 3);
    }
    ss_[i] = Math.random();
  }
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sprayGeo.setAttribute('aVel', new THREE.BufferAttribute(sv, 3));
  sprayGeo.setAttribute('aSeed', new THREE.BufferAttribute(ss_, 1));
  const sprayMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPx: { value: Math.min(devicePixelRatio, 2) },
      uTint: { value: new THREE.Color(1, 0.9, 0.8) },
    },
    vertexShader: `
      attribute vec3 aVel; attribute float aSeed; uniform float uTime, uPx; varying float vA;
      void main(){
        float life = 1.1 + aSeed * .9;
        float age = fract(uTime / life + aSeed);
        float tt = age * life;
        vec3 p = position + aVel * tt + vec3(0., -4.9, 0.) * tt * tt;
        p.y = max(p.y, 0.);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = (1.5 + aSeed * 3.0) * uPx * (120. / -mv.z) * (0.6 + age);
        gl_Position = projectionMatrix * mv;
        vA = (1. - age) * smoothstep(0., .08, age);
      }`,
    fragmentShader: `
      uniform float uOpacity; uniform vec3 uTint; varying float vA;
      void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
        gl_FragColor = vec4(uTint, smoothstep(.5, .0, d) * vA * .45 * uOpacity); }`,
  });
  const spray = new THREE.Points(sprayGeo, sprayMat);
  spray.frustumCulled = false;
  ship.add(spray);

  /* funnel exhaust */
  const smokeN = 90,
    smP = new Float32Array(smokeN * 3),
    smS = new Float32Array(smokeN);
  for (let i = 0; i < smokeN; i++) {
    smP.set([-26 + (Math.random() - 0.5) * 1.4, 14.1, (Math.random() - 0.5) * 1.6], i * 3);
    smS[i] = Math.random();
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smP, 3));
  smokeGeo.setAttribute('aSeed', new THREE.BufferAttribute(smS, 1));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uPx: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: `
      attribute float aSeed; uniform float uTime, uPx; varying float vA;
      void main(){
        float age = fract(uTime * .16 + aSeed);
        vec3 p = position + vec3(-age * 26., age * 7. + sin(age*6. + aSeed*20.)*.6, sin(aSeed*40.)*age*3.);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = (3. + age * 16.) * uPx * (90. / -mv.z);
        gl_Position = projectionMatrix * mv;
        vA = smoothstep(0., .1, age) * (1. - age);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vA;
      void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
        gl_FragColor = vec4(vec3(.3,.27,.28), smoothstep(.5, 0., d) * vA * .22 * uOpacity); }`,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  ship.add(smoke);

  /* seagull silhouettes */
  const gullMat = new THREE.MeshBasicMaterial({
    color: 0x1d1716,
    transparent: true,
    side: THREE.DoubleSide,
    fog: true,
  });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([0, 0, 0, -0.35, 0, 0, -0.1, 0, 1.3, 0.25, 0, 0, -0.35, 0, 0, -0.1, 0, 1.3]),
      3,
    ),
  );
  const gulls = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, gullMat),
      r = new THREE.Mesh(wingGeo, gullMat);
    r.scale.z = -1;
    b.add(l, r);
    b.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.14), gullMat));
    b.userData = {
      l,
      r,
      rad: 18 + Math.random() * 26,
      h: 17 + Math.random() * 12,
      sp: (0.12 + Math.random() * 0.12) * (Math.random() < 0.5 ? -1 : 1),
      ph: Math.random() * 6.28,
      cx: -6 + Math.random() * 20,
    };
    b.scale.setScalar(1.05);
    g.add(b);
    gulls.push(b);
  }

  /* ================= LIGHTING PALETTES ================= */
  const PAL = {
    sunset: {
      top: [0.1, 0.1, 0.17],
      mid: [0.55, 0.28, 0.19],
      hor: [0.92, 0.44, 0.17],
      low: [0.06, 0.05, 0.05],
      glow: [0.9, 0.42, 0.12],
      fog: new THREE.Color(0xb8643a),
      near: 160,
      far: 1300,
      hemiA: new THREE.Color(0xffbf95),
      hemiB: new THREE.Color(0x2a2220),
      hemi: 0.5,
      key: new THREE.Color(0xff9a55),
      keyI: 0.45,
      keyPos: [-30, 18, 60],
      rimI: 2.6,
      sun: [0.42, 0.028, -1],
      deep: [0.02, 0.022, 0.03],
    },
    port: {
      top: [0.07, 0.13, 0.3],
      mid: [0.2, 0.33, 0.56],
      hor: [0.48, 0.6, 0.77],
      low: [0.04, 0.06, 0.1],
      glow: [0.45, 0.58, 0.85],
      fog: new THREE.Color(0x7d93b3),
      near: 60,
      far: 560,
      hemiA: new THREE.Color(0xa9c0e8),
      hemiB: new THREE.Color(0x182030),
      hemi: 1.15,
      key: new THREE.Color(0xd4e3ff),
      keyI: 1.2,
      keyPos: [40, 70, 50],
      rimI: 0.6,
      sun: [0.6, -0.02, -0.8],
      deep: [0.02, 0.04, 0.07],
    },
  };
  const tmpC = new THREE.Color(),
    fogBlack = new THREE.Color(0x020304);
  const setV = (u, a, b, k) => u.value.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));

  const motion = { y: 0, pitch: 0, roll: 0 };
  return {
    group: g,
    update(t, s) {
      const k = s.port,
        A = PAL.sunset,
        Pp = PAL.port;
      port.visible = k > 0.5;
      // during the hologram the ship stands alone; the yard returns for the light tunnel
      quayG.visible = cranesG.visible = s.p < 0.52;
      yardG.visible = s.p < 0.52 || s.p > 0.6;
      // palette (switches while the camera passes the hull, so the cut is hidden)
      const su = ctx.sky.uniforms;
      setV(su.uTop, A.top, Pp.top, k);
      setV(su.uMid, A.mid, Pp.mid, k);
      setV(su.uHor, A.hor, Pp.hor, k);
      setV(su.uLow, A.low, Pp.low, k);
      setV(su.uGlow, A.glow, Pp.glow, k);
      su.uSun.value
        .set(lerp(A.sun[0], Pp.sun[0], k), lerp(A.sun[1], Pp.sun[1], k), lerp(A.sun[2], Pp.sun[2], k))
        .normalize();
      const wu = waterMat.uniforms;
      wu.uTop.value.copy(su.uTop.value);
      wu.uMid.value.copy(su.uMid.value);
      wu.uHor.value.copy(su.uHor.value);
      wu.uGlow.value.copy(su.uGlow.value);
      setV(wu.uDeep, A.deep, Pp.deep, k);
      s.fog.color.copy(A.fog).lerp(Pp.fog, k).lerp(fogBlack, s.night);
      // depth fog: wide for the hologram ship, tight in the light tunnel so the far end fades to black
      const tun = ss(0.62, 0.68, s.p) * (1 - ss(0.82, 0.88, s.p));
      s.fog.near = lerp(lerp(lerp(A.near, Pp.near, k), 120, s.night), 12, tun);
      s.fog.far = lerp(lerp(lerp(A.far, Pp.far, k), 420, s.night), 120, tun);
      ctx.hemi.color.copy(A.hemiA).lerp(Pp.hemiA, k);
      ctx.hemi.groundColor.copy(A.hemiB).lerp(Pp.hemiB, k);
      ctx.hemi.intensity = lerp(A.hemi, Pp.hemi, k) * (1 - s.night * 0.8);
      ctx.key.color.copy(A.key).lerp(Pp.key, k);
      ctx.key.intensity = lerp(A.keyI, Pp.keyI, k);
      ctx.key.position.set(
        lerp(A.keyPos[0], Pp.keyPos[0], k),
        lerp(A.keyPos[1], Pp.keyPos[1], k),
        lerp(A.keyPos[2], Pp.keyPos[2], k),
      );
      ctx.rim.position.copy(su.uSun.value).multiplyScalar(100);
      ctx.rim.intensity = lerp(A.rimI, Pp.rimI, k);

      // ship rides the swell at sea, sits still at berth
      amp = lerp(0.5, 0.18, k);
      const sea = (1 - k) * s.solid,
        kk = 1 - Math.exp(-s.dt * 2.2);
      const hb = swellAt(24, 0, t),
        hs = swellAt(-26, 0, t),
        hp = swellAt(-2, 4.5, t),
        hsb = swellAt(-2, -4.5, t);
      const ty = ((hb + hs + hp + hsb) / 4) * 0.55 * sea,
        tp = Math.atan2(hb - hs, 50) * 0.7 * sea,
        tr = Math.atan2(hp - hsb, 9) * 0.22 * sea;
      motion.y += (ty - motion.y) * kk;
      motion.pitch += (tp - motion.pitch) * kk;
      motion.roll += (tr - motion.roll) * kk;
      ship.position.y = motion.y;
      ship.rotation.z = motion.pitch;
      ship.rotation.x = -motion.roll;

      wu.uTime.value = t;
      wu.uAmp.value = amp;
      wu.uFlow.value = lerp(FLOW, 0, k);
      wu.uWake.value = 1 - k;
      wu.uOpacity.value = s.env;
      wu.uNight.value = s.night;
      wu.uHolo.value = s.holo;
      waterMat.depthWrite = s.env > 0.5 && s.holo < 0.5;
      water.visible = s.env > 0.002;
      wu.uFog.value.copy(s.fog.color);
      wu.uFogNear.value = s.fog.near;
      wu.uFogFar.value = s.fog.far;

      stripMat.uniforms.uTime.value = t;
      stripMat.uniforms.uOpacity.value = s.solid;
      s1.visible = s2.visible = s.solid > 0.002;
      sprayMat.uniforms.uTime.value = t;
      sprayMat.uniforms.uOpacity.value = sea;
      sprayMat.uniforms.uTint.value.copy(s.fog.color).lerp(new THREE.Color(1, 1, 1), 0.4);
      smokeMat.uniforms.uTime.value = t;
      smokeMat.uniforms.uOpacity.value = s.solid;
      spray.visible = sea > 0.002;
      smoke.visible = s.solid > 0.002;

      gullMat.opacity = sea;
      gulls.forEach((b) => {
        const u = b.userData,
          a = t * u.sp + u.ph;
        b.position.set(
          u.cx + Math.cos(a) * u.rad,
          u.h + Math.sin(t * 0.7 + u.ph) * 1.2,
          Math.sin(a) * u.rad * 0.7,
        );
        b.rotation.y = -a + (Math.PI / 2) * Math.sign(u.sp) - (u.sp > 0 ? 0 : Math.PI);
        const flap = Math.sin(t * 7 + u.ph * 3) * 0.55;
        u.l.rotation.x = flap;
        u.r.rotation.x = -flap;
        b.visible = sea > 0.002;
      });
    },
  };
}

/* =======================================================
   AIR — wide-body freighter above a sunset cloud deck
   ======================================================= */
function softCloudTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 60 + Math.random() * 136,
      y = 80 + Math.random() * 100,
      r = 30 + Math.random() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildPlane(ctx) {
  const { M, add } = ctx;
  const g = new THREE.Group();
  const plane = new THREE.Group();
  g.add(plane);

  const body = M(0xf2f1ed, 0.32, 0.25),
    tailM = M(0x0f5c58, 0.4, 0.3),
    wingM = M(0xd9dad6, 0.38, 0.45);
  const engM = M(0xdfe1e4, 0.28, 0.6),
    darkM = M(0x15171a, 0.6, 0.4),
    glass = M(0x0b1016, 0.08, 0.85);
  const lime = M(0xc8f43a, 0.35, 0.2, { emissive: 0x6f8f10, emissiveIntensity: 0.4 });

  // fuselage (lathe around y, rotated to lie along x)
  const prof = [
    [0.2, -33],
    [0.85, -32],
    [1.6, -30],
    [2.3, -27],
    [2.9, -23],
    [3.2, -19],
    [3.2, 22],
    [3.05, 25],
    [2.7, 27.5],
    [2.1, 29.5],
    [1.35, 31],
    [0.7, 32],
    [0, 32.6],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const fus = new THREE.LatheGeometry(prof, 36);
  fus.rotateZ(-Math.PI / 2);
  const fp = fus.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i);
    if (x < -17) fp.setY(i, fp.getY(i) + Math.pow((-17 - x) / 16, 1.6) * 2.4);
  }
  fus.computeVertexNormals();
  add(plane, fus, body, 0, 0, 0, 0, 0, 0, true);
  // upper-deck hump
  const hump = new THREE.SphereGeometry(1, 32, 16);
  hump.scale(13, 2.6, 2.75);
  add(plane, hump, body, 18, 1.55, 0, 0, 0, 0, true);
  // teal belly cheatline
  const cheat = new THREE.CylinderGeometry(3.23, 3.23, 38, 36, 1, true, Math.PI * 0.58, Math.PI * 0.84);
  cheat.rotateZ(Math.PI / 2);
  add(plane, cheat, tailM, 2, 0, 0);
  // cockpit windows
  [
    [29.9, 1.25, 0.55, 0.5],
    [29.9, 1.25, -0.55, -0.5],
    [29.4, 1.3, 1.35, 0.9],
    [29.4, 1.3, -1.35, -0.9],
  ].forEach(([x, y, z, ry]) =>
    add(plane, new THREE.BoxGeometry(0.9, 0.42, 0.9), glass, x, y, z, 0, ry, -0.35),
  );

  // wings
  const wingShape = (s) => {
    const sh = new THREE.Shape();
    sh.moveTo(6, 2.6 * s);
    sh.lineTo(-12.6, 31.5 * s);
    sh.lineTo(-16.4, 31.5 * s);
    sh.lineTo(-9.5, 11 * s);
    sh.lineTo(-13.5, 2.6 * s);
    sh.lineTo(6, 2.6 * s);
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.22,
      bevelSize: 0.22,
      bevelSegments: 2,
      curveSegments: 4,
    });
    geo.rotateX(Math.PI / 2);
    return geo;
  };
  const DIH = 0.07;
  add(plane, wingShape(1), wingM, 0, -1.4, 0, -DIH, 0, 0);
  add(plane, wingShape(-1), wingM, 0, -1.4, 0, DIH, 0, 0);
  // winglets
  [1, -1].forEach((s) =>
    add(
      plane,
      new THREE.BoxGeometry(2.2, 1.9, 0.16),
      wingM,
      -15.4,
      -1.4 + 31.4 * DIH + 0.85,
      31.45 * s,
      0,
      0,
      -0.6,
    ),
  );

  // tail
  const fin = new THREE.Shape();
  fin.moveTo(-19.5, 3.0);
  fin.lineTo(-29.8, 15.5);
  fin.lineTo(-33.4, 15.5);
  fin.lineTo(-32.8, 3.0);
  fin.lineTo(-19.5, 3.0);
  const finGeo = new THREE.ExtrudeGeometry(fin, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.15,
    bevelSegments: 2,
  });
  finGeo.translate(0, 0, -0.25);
  add(plane, finGeo, tailM);
  add(plane, new THREE.BoxGeometry(5.6, 0.5, 0.78), lime, -28.4, 12.2, 0, 0, 0, 0.9);
  const stab = (s) => {
    const sh = new THREE.Shape();
    sh.moveTo(-22.5, 1.2 * s);
    sh.lineTo(-30, 11.5 * s);
    sh.lineTo(-32.3, 11.5 * s);
    sh.lineTo(-30.8, 1.2 * s);
    sh.lineTo(-22.5, 1.2 * s);
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: 0.35,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelSegments: 2,
    });
    geo.rotateX(Math.PI / 2);
    return geo;
  };
  add(plane, stab(1), wingM, 0, 1.75, 0, -0.04, 0, 0);
  add(plane, stab(-1), wingM, 0, 1.75, 0, 0.04, 0, 0);

  // engines
  const nacProf = [
    [0, -3.3],
    [0.7, -3.3],
    [1.05, -2.6],
    [1.32, -1.2],
    [1.42, 0.4],
    [1.36, 2.4],
    [1.26, 3.2],
    [1.0, 3.25],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const nac = new THREE.LatheGeometry(nacProf, 28);
  nac.rotateZ(-Math.PI / 2);
  const intake = new THREE.CircleGeometry(1.02, 28);
  intake.rotateY(Math.PI / 2);
  const ring = new THREE.TorusGeometry(1.14, 0.07, 8, 32);
  ring.rotateY(Math.PI / 2);
  const spinner = new THREE.ConeGeometry(0.34, 0.8, 18);
  spinner.rotateZ(-Math.PI / 2);
  const exhausts = [];
  const xle = (z) => 6 + (Math.abs(z) - 2.6) * (-18.6 / 28.9);
  [10.5, 19.2, -10.5, -19.2].forEach((z) => {
    const rise = Math.abs(z) * Math.sin(DIH);
    const x = xle(z) + 0.6,
      y = -4.1 + rise;
    add(plane, nac, engM, x, y, z, 0, 0, 0, true);
    add(plane, intake, darkM, x + 3.26, y, z);
    add(plane, ring, lime, x + 3.22, y, z);
    add(plane, spinner, darkM, x + 3.3, y, z);
    add(plane, new THREE.BoxGeometry(4.6, 1.5, 0.34), wingM, x - 0.6, y + 1.35, z);
    exhausts.push(new THREE.Vector3(x - 3.3, y, z));
  });
  // nav lights + strobes
  const red = M(0xff3b30, 0.3, 0, { emissive: 0xff2a1f, emissiveIntensity: 4 });
  const green = M(0x34c759, 0.3, 0, { emissive: 0x22dd55, emissiveIntensity: 4 });
  const strobe = M(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 0 });
  add(plane, new THREE.SphereGeometry(0.22, 10, 8), red, -16.0, -1.4 + 31.5 * DIH, -31.6);
  add(plane, new THREE.SphereGeometry(0.22, 10, 8), green, -16.0, -1.4 + 31.5 * DIH, 31.6);
  add(plane, new THREE.SphereGeometry(0.18, 10, 8), strobe, -33.4, 15.6, 0);

  // landing lights, beacons
  const landM = M(0xffffff, 0.2, 0, { emissive: 0xffffff, emissiveIntensity: 6 });
  [6.5, -6.5].forEach((z) => add(plane, new THREE.SphereGeometry(0.32, 12, 8), landM, 3.6, -1.7, z));
  const beaconM = M(0xff3020, 0.3, 0, { emissive: 0xff2010, emissiveIntensity: 0 });
  add(plane, new THREE.SphereGeometry(0.25, 10, 8), beaconM, 6, 4.0, 0);
  add(plane, new THREE.SphereGeometry(0.25, 10, 8), beaconM, 6, -3.3, 0);

  // landing gear (retracts after take-off)
  const gear = new THREE.Group();
  plane.add(gear);
  const tireM = M(0x121212, 0.9, 0),
    strutM = M(0x9ea3a8, 0.3, 0.8);
  const wheel = new THREE.CylinderGeometry(0.62, 0.62, 0.5, 18);
  wheel.rotateX(Math.PI / 2);
  const bogie = (x, z, n) => {
    const s1 = add(gear, new THREE.CylinderGeometry(0.22, 0.22, 3.6, 10), strutM, x, -4.8, z);
    s1.userData.noSample = true;
    for (let i = 0; i < n; i++)
      [-0.35, 0.35].forEach((dz) => {
        const w = add(gear, wheel, tireM, x + (i - (n - 1) / 2) * 1.5, -6.6, z + dz);
        w.userData.noSample = true;
      });
  };
  bogie(-5.5, 2.2, 2);
  bogie(-5.5, -2.2, 2);
  bogie(-3.5, 5.6, 2);
  bogie(-3.5, -5.6, 2);
  bogie(24, 0, 1);

  /* contrails */
  const trailMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uOpacity, uTime; varying vec2 vUv;
      void main(){ float s = vUv.y; float a = smoothstep(0., .05, s) * pow(1. - s, 1.4);
        a *= .55 + .45*sin(vUv.x*6.283*3. + s*20. - uTime*3.) * .3 + .2;
        gl_FragColor = vec4(vec3(1., .95, .9), a * .5 * uOpacity); }`,
  });
  const trails = new THREE.Group();
  plane.add(trails);
  exhausts.forEach((e) => {
    const geo = new THREE.CylinderGeometry(2.6, 0.3, 140, 16, 1, true);
    geo.rotateZ(Math.PI / 2);
    geo.translate(-70, 0, 0);
    const m = new THREE.Mesh(geo, trailMat);
    m.position.copy(e);
    trails.add(m);
  });

  /* ================= AIRPORT AT NIGHT ================= */
  const ground = new THREE.Group();
  g.add(ground);
  const GY = -7.2; // runway surface relative to the aircraft on its wheels
  const runwayMat = new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uOff: { value: 0 }, uOpacity: { value: 1 } },
    ]),
    vertexShader: `varying vec3 vP; #include <fog_pars_vertex>
      void main(){ vP = position; vec4 mvPosition = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mvPosition; #include <fog_vertex>
 }`.replace(/#include/g, '\n#include'),
    fragmentShader: `uniform float uOff, uOpacity; varying vec3 vP; #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        float x = vP.x + uOff, z = vP.y;
        vec3 c = vec3(.055,.058,.065) + h(floor(vec2(x, z) * 3.)) * .012;
        float wz = abs(z);
        float edge = step(26.6, wz) * step(wz, 27.1);
        float cl = step(wz, .3) * step(.55, fract(x / 50.));
        float tz = step(6., wz) * step(wz, 16.) * step(.94, fract(x / 300.)) * step(.55, fract(wz / 2.0));
        c = mix(c, vec3(.55), max(max(edge, cl), tz) * .85);
        c = mix(c, vec3(.02,.03,.025), step(30., wz));
        gl_FragColor = vec4(pow(c, vec3(2.2)), uOpacity);
        #include <fog_fragment>
      }`.replace(/#include/g, '\n#include'),
  });
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(6000, 400, 1, 1), runwayMat);
  runway.rotation.x = -Math.PI / 2;
  ground.add(runway);

  // runway, centreline and approach lights (scroll in the shader)
  const RL = 2400,
    lp = [],
    lc = [];
  for (let x = -RL / 2; x < RL / 2; x += 30) {
    lp.push(x, 0.3, 28, x, 0.3, -28);
    lc.push(1, 0.95, 0.85, 1, 0.95, 0.85);
  }
  for (let x = -RL / 2; x < RL / 2; x += 15) {
    lp.push(x, 0.2, 0);
    const red = (x + RL) % 300 > 240;
    lc.push(red ? 1 : 0.9, red ? 0.25 : 0.95, red ? 0.2 : 1);
  }
  for (let x = -RL / 2; x < RL / 2; x += 60) {
    lp.push(x, 0.3, 60, x, 0.3, -60);
    lc.push(0.25, 0.45, 1, 0.25, 0.45, 1);
  }
  for (let x = -RL / 2; x < RL / 2; x += 6) {
    if ((x + RL) % 600 < 120) {
      lp.push(x, 0.3, 8, x, 0.3, -8);
      lc.push(0.7, 1, 0.2, 0.7, 1, 0.2);
    }
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lGeo.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  const lightsMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uOff: { value: 0 }, uOpacity: { value: 1 }, uPx: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: `attribute vec3 color; uniform float uOff, uPx; varying vec3 vC; varying float vD;
      void main(){ vec3 p = position; p.x = mod(p.x - uOff + ${RL / 2}.0, ${RL}.0) - ${RL / 2}.0;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = uPx * clamp(520. / -mv.z, 2.2, 22.); gl_Position = projectionMatrix*mv;
        vC = color; vD = -mv.z; }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vC; varying float vD;
      void main(){ float d = length(gl_PointCoord-.5); if (d>.5) discard;
        float a = smoothstep(.5, 0., d); a = a*a; float far = 1. - smoothstep(600., 1300., vD);
        gl_FragColor = vec4(vC * 3.2 * a, a * uOpacity * far); }`,
  });
  const runLights = new THREE.Points(lGeo, lightsMat);
  runLights.frustumCulled = false;
  ground.add(runLights);

  // terminal, hangars and tower silhouettes with lit windows
  const bldDark = new THREE.MeshStandardMaterial({ color: 0x0d1016, roughness: 0.9 });
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.7) });
  const limeWin = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 2.0, 0.25) });
  const blds = [];
  const mkB = (x, z, w, h, d, win) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldDark);
    m.position.y = h / 2;
    grp.add(m);
    if (win) {
      const wv = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.12, d + 0.2), win);
      wv.position.y = h * 0.55;
      grp.add(wv);
    }
    ground.add(grp);
    blds.push(grp);
    return grp;
  };
  for (let i = 0; i < 9; i++)
    mkB(
      -900 + i * 220,
      -150 - Math.random() * 60,
      60 + Math.random() * 60,
      14 + Math.random() * 16,
      40,
      winMat,
    );
  for (let i = 0; i < 6; i++)
    mkB(-800 + i * 300, 170 + Math.random() * 80, 80, 22, 50, i % 2 ? winMat : null);
  {
    const t = mkB(300, -120, 6, 46, 6, null);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(6, 4.5, 6, 12), limeWin);
    cab.position.y = 49;
    t.add(cab);
  }
  // distant city glow
  const cp_ = [],
    cc_ = [];
  for (let i = 0; i < 3500; i++) {
    const a = Math.random() * Math.PI * 2,
      r = 900 + Math.random() * 1600;
    cp_.push(Math.cos(a) * r, Math.random() * 3, Math.sin(a) * r * (Math.sin(a) > 0 ? 1 : 0.8));
    const w = Math.random();
    cc_.push(1, 0.7 + w * 0.25, 0.4 + w * 0.4);
  }
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp_, 3));
  cGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc_, 3));
  const cityMat2 = new THREE.PointsMaterial({
    size: 1.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    fog: false,
  });
  ground.add(new THREE.Points(cGeo, cityMat2));
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(8000, 8000),
    new THREE.MeshStandardMaterial({ color: 0x0a0d0c, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.05;
  ground.add(grass);

  /* ================= CLOUD DECK (becomes the route map) ================= */
  const cloudMat = new THREE.ShaderMaterial({
    transparent: true,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uHolo: { value: 0 },
      uSun: { value: ctx.sunDir },
      uDay: { value: 1 },
      uFog: { value: new THREE.Color() },
      uFogNear: { value: 0 },
      uFogFar: { value: 1 },
    },
    vertexShader: `varying vec3 vWorld; void main(){ vec4 w = modelMatrix*vec4(position,1.); vWorld = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform float uTime, uOpacity, uHolo, uDay, uFogNear, uFogFar; uniform vec3 uSun, uFog; varying vec3 vWorld;
      ${NOISE}
      void main(){
        vec2 p = vWorld.xz * 0.0058 + vec2(uTime * 0.09, 0.);
        float d = fbm(p);
        float dens = smoothstep(.36, .7, d);
        float lit = clamp(.55 + (d - fbm(p + normalize(uSun.xz) * .035)) * 7., 0., 1.35);
        vec3 shadowC = mix(vec3(.09,.10,.16), vec3(.53,.46,.62), uDay), litC = mix(vec3(.22,.22,.30), vec3(1.,.78,.58), uDay), gap = mix(vec3(.04,.05,.08), vec3(.29,.30,.43), uDay);
        vec3 c = mix(shadowC, litC, lit);
        c = mix(gap, c, dens);
        vec3 V = normalize(vWorld - cameraPosition);
        c += vec3(1., .58, .3) * pow(max(dot(V, uSun), 0.), 6.) * .55 * dens * uDay;
        float dist = length(cameraPosition - vWorld);
        c = mix(c, uFog, smoothstep(uFogNear, uFogFar, dist));
        // hologram: dark map with a lime dot matrix
        vec2 q = vWorld.xz / 7.;
        vec2 f = fract(q) - .5;
        float dotm = smoothstep(.12, .0, length(f)) * (.35 + .65 * step(.45, noise(floor(q) * .07)));
        vec3 hc = vec3(.004,.007,.006) + vec3(.4,1.,.12) * dotm * .22 * (1. - smoothstep(200., 900., dist));
        c = mix(c, hc, uHolo);
        gl_FragColor = vec4(pow(max(c, 0.), vec3(2.2)), uOpacity);
      }`,
  });
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), cloudMat);
  clouds.rotation.x = -Math.PI / 2;
  clouds.position.y = -32;
  g.add(clouds);

  /* passing cloud puffs: a dense layer during the climb, a few below at cruise */
  const puffTex = softCloudTexture();
  const puffs = [];
  for (let i = 0; i < (isMobile ? 26 : 44); i++) {
    const m = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: puffTex,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        fog: true,
      }),
    );
    const sc = 60 + Math.random() * 90;
    m.scale.set(sc, sc * 0.5, 1);
    m.userData = { speed: 70 + Math.random() * 60, layer: i < 16 ? 'below' : 'through' };
    m.position.set(
      -450 + Math.random() * 900,
      m.userData.layer === 'below' ? -26 + Math.random() * 14 : -40 + Math.random() * 80,
      -220 + Math.random() * 300,
    );
    g.add(m);
    puffs.push(m);
  }

  /* palettes: night airport → golden hour above the clouds */
  const PAL = {
    night: {
      top: [0.02, 0.035, 0.09],
      mid: [0.05, 0.08, 0.17],
      hor: [0.28, 0.22, 0.3],
      low: [0.02, 0.02, 0.03],
      glow: [0.6, 0.35, 0.3],
      sun: [0.55, -0.05, -0.83],
      fog: new THREE.Color(0x231f2c),
      near: 300,
      far: 2600,
      hemiA: new THREE.Color(0x6c7aa8),
      hemiB: new THREE.Color(0x0a0c12),
      hemi: 0.55,
      key: new THREE.Color(0xb8c8ff),
      keyI: 0.8,
    },
    day: {
      top: [0.15, 0.27, 0.56],
      mid: [0.78, 0.56, 0.62],
      hor: [1.0, 0.68, 0.42],
      low: [0.62, 0.52, 0.58],
      glow: [1, 0.62, 0.3],
      sun: [0.55, 0.06, -0.83],
      fog: new THREE.Color(0xffae6b),
      near: 260,
      far: 1900,
      hemiA: new THREE.Color(0xe8eeff),
      hemiB: new THREE.Color(0xa898b0),
      hemi: 1.1,
      key: new THREE.Color(0xffe4cf),
      keyI: 2.5,
    },
  };
  const setV = (u, a, b, k) => u.value.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));
  const white = new THREE.Color(0xdfe3ea),
    blackC = new THREE.Color(0x020304);

  let last = 0,
    off = 0;
  return {
    group: g,
    update(t, s) {
      const dt = Math.min(0.05, t - last);
      last = t;
      const p = s.p,
        m = s.solid;
      const day = p > 0.3 ? 1 : 0; // switch hidden inside the cloud white-out
      const through = ss(0.25, 0.29, p) * (1 - ss(0.32, 0.36, p));
      const takeoff = ss(0.15, 0.24, p); // rotation and lift-off
      const climb = ss(0.17, 0.34, p);
      const above = ss(0.31, 0.36, p);

      // palette
      const A = PAL.night,
        D = PAL.day,
        su = ctx.sky.uniforms;
      setV(su.uTop, A.top, D.top, day);
      setV(su.uMid, A.mid, D.mid, day);
      setV(su.uHor, A.hor, D.hor, day);
      setV(su.uLow, A.low, D.low, day);
      setV(su.uGlow, A.glow, D.glow, day);
      su.uSun.value.set(...(day ? D.sun : A.sun)).normalize();
      s.fog.color.copy(A.fog).lerp(D.fog, day).lerp(white, through).lerp(blackC, s.night);
      s.fog.near = lerp(lerp(lerp(A.near, D.near, day), 4, through), 260, s.night);
      s.fog.far = lerp(lerp(lerp(A.far, D.far, day), 110, through), 2200, s.night);
      ctx.hemi.color.copy(A.hemiA).lerp(D.hemiA, day);
      ctx.hemi.groundColor.copy(A.hemiB).lerp(D.hemiB, day);
      ctx.hemi.intensity = lerp(A.hemi, D.hemi, day) * (1 - s.night * 0.8);
      ctx.key.color.copy(A.key).lerp(D.key, day);
      ctx.key.intensity = lerp(A.keyI, D.keyI, day);
      ctx.rim.position.copy(su.uSun.value).multiplyScalar(100);

      // aircraft attitude: take-off roll, rotate, climb, then gentle cruise
      const shake = (1 - takeoff) * ss(0, 0.12, p) * m;
      plane.rotation.z = (takeoff * (1 - ss(0.26, 0.4, p)) * 0.15 + Math.sin(t * 0.33) * 0.012 * above) * m;
      plane.rotation.x = Math.sin(t * 0.45) * 0.035 * above * m;
      plane.position.y = Math.sin(t * 37) * 0.03 * shake + Math.sin(t * 0.7) * 0.45 * above * m;
      // gear retracts shortly after lift-off
      const gr = ss(0.22, 0.27, p);
      gear.position.y = gr * 3.2;
      gear.scale.y = 1 - gr * 0.85;
      gear.visible = gr < 0.98 && m > 0.002;
      beaconM.emissiveIntensity = t % 1.1 < 0.12 ? 6 * m : 0;
      strobe.emissiveIntensity = t % 1.4 < 0.08 ? 8 * m : 0;
      landM.emissiveIntensity = 6 * (1 - above) * m;

      // ground: runway rushes past, then falls away
      const speed = lerp(18, 110, ss(0, 0.2, p)) * (1 - climb * 0.3);
      off += speed * dt;
      runwayMat.uniforms.uOff.value = off % 300;
      lightsMat.uniforms.uOff.value = off;
      ground.position.y = GY - Math.pow(climb, 2) * 340;
      blds.forEach((b2) => {
        b2.position.x -= speed * dt;
        if (b2.position.x < -1000) b2.position.x += 2000;
      });
      ground.visible = p < 0.31;

      // clouds: overcast ceiling above the runway → white-out → deck below
      clouds.position.y = lerp(90, -32, ss(0.24, 0.33, p));
      cloudMat.uniforms.uDay.value = day;
      cloudMat.uniforms.uTime.value = t;
      cloudMat.uniforms.uOpacity.value = ss(0.18, 0.24, p) * (1 - ss(0.72, 0.82, p));
      cloudMat.uniforms.uHolo.value = s.holo > 0 ? Math.min(1, s.holo * 1.2) : 0;
      if (p > 0.64) cloudMat.uniforms.uHolo.value = 1;
      clouds.visible = cloudMat.uniforms.uOpacity.value > 0.002;
      cloudMat.uniforms.uFog.value.copy(s.fog.color);
      cloudMat.uniforms.uFogNear.value = s.fog.near;
      cloudMat.uniforms.uFogFar.value = s.fog.far;

      trailMat.uniforms.uOpacity.value = m * above;
      trailMat.uniforms.uTime.value = t;
      trails.visible = m * above > 0.002;
      puffs.forEach((pf) => {
        const u = pf.userData;
        pf.position.x -= u.speed * dt * (u.layer === 'through' ? 1.8 : 1);
        if (pf.position.x < -450) pf.position.x = 450;
        const o = u.layer === 'through' ? through * 0.9 : above * (1 - s.holo) * 0.7 * m;
        pf.material.opacity = o;
        pf.visible = o > 0.002;
        pf.material.color.setRGB(day ? 1 : 0.45, day ? 0.86 : 0.47, day ? 0.76 : 0.55);
      });
    },
  };
}

/* =======================================================
   ROAD — semi truck at sunset (final mile)
   ======================================================= */
function buildTruck(ctx) {
  const { M, add } = ctx;
  const g = new THREE.Group();
  const truck = new THREE.Group();
  truck.position.x = -1.5;
  g.add(truck);
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const trailerMat = M(0x7c4234, 0.7, 0.05),
    ribMat = M(0x6a362b, 0.7, 0.05),
    darkMat = M(0x1d1b1a, 0.8, 0.2);
  const cabMat = M(0x5d5754, 0.35, 0.55),
    chrome = M(0xd8d8d8, 0.2, 1),
    glass = M(0x0d1218, 0.05, 0.8);
  const tire = M(0x111111, 0.9, 0),
    lightMat = M(0xffe8b0, 0.3, 0, { emissive: 0xffd28a, emissiveIntensity: 3 });
  const limeM = M(0xc8f43a, 0.4, 0.1);

  add(truck, B(13.6, 2.75, 2.56), trailerMat, -1.6, 2.62, 0);
  for (let i = 0; i <= 26; i++) add(truck, B(0.07, 2.7, 2.6), ribMat, -8.3 + i * 0.515, 2.62, 0);
  add(truck, B(13.62, 0.16, 2.6), limeM, -1.6, 1.42, 0);
  add(truck, B(13.6, 0.22, 2.4), darkMat, -1.6, 1.15, 0);
  add(truck, B(0.12, 2.75, 2.58), darkMat, -8.42, 2.62, 0);
  add(truck, B(0.18, 0.9, 0.18), darkMat, 2.6, 0.62, 0.8);
  add(truck, B(0.18, 0.9, 0.18), darkMat, 2.6, 0.62, -0.8);
  add(truck, B(3.2, 0.3, 2.0), darkMat, -6.0, 0.98, 0);
  add(truck, B(7.0, 0.35, 1.1), darkMat, 7.6, 0.95, 0);
  add(truck, B(2.2, 2.9, 2.5), cabMat, 6.2, 2.75, 0);
  add(truck, B(1.9, 2.2, 2.5), cabMat, 8.25, 2.4, 0);
  add(truck, B(0.08, 1.0, 2.2), glass, 9.22, 2.95, 0, 0, 0, -0.18);
  add(truck, B(1.2, 0.1, 2.0), glass, 8.3, 3.52, 0);
  add(truck, B(1.8, 0.5, 0.04), glass, 8.35, 2.95, 1.26);
  add(truck, B(1.8, 0.5, 0.04), glass, 8.35, 2.95, -1.26);
  add(truck, B(2.1, 1.35, 2.3), cabMat, 10.25, 1.85, 0);
  add(truck, B(1.9, 0.35, 2.2), cabMat, 10.2, 2.6, 0, 0, 0, -0.1);
  add(truck, B(0.12, 1.25, 1.5), chrome, 11.32, 1.85, 0);
  add(truck, B(0.3, 0.45, 2.5), chrome, 11.35, 0.95, 0);
  add(truck, B(0.06, 0.22, 0.42), lightMat, 11.33, 1.55, 0.9);
  add(truck, B(0.06, 0.22, 0.42), lightMat, 11.33, 1.55, -0.9);
  add(truck, B(1.6, 0.25, 2.7), darkMat, 10.0, 1.35, 0);
  add(truck, B(0.8, 0.9, 0.3), darkMat, 8.4, 1.1, 1.25);
  add(truck, B(0.8, 0.9, 0.3), darkMat, 8.4, 1.1, -1.25);
  const tank = new THREE.CylinderGeometry(0.38, 0.38, 1.5, 24);
  add(truck, tank, chrome, 7.0, 1.0, 1.2, 0, 0, Math.PI / 2);
  add(truck, tank, chrome, 7.0, 1.0, -1.2, 0, 0, Math.PI / 2);
  const stack = new THREE.CylinderGeometry(0.09, 0.09, 3.6, 12);
  add(truck, stack, chrome, 7.35, 3.0, 1.3);
  add(truck, stack, chrome, 7.35, 3.0, -1.3);
  add(truck, B(0.08, 0.5, 0.2), darkMat, 9.25, 2.9, 1.55);
  add(truck, B(0.08, 0.5, 0.2), darkMat, 9.25, 2.9, -1.55);
  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 28),
    hubGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.44, 18);
  const wheel = (x, z) => {
    add(truck, wheelGeo, tire, x, 0.52, z, Math.PI / 2);
    add(truck, hubGeo, chrome, x, 0.52, z, Math.PI / 2);
  };
  [-7.0, -5.8].forEach((x) => {
    wheel(x, 1.02);
    wheel(x, -1.02);
    wheel(x, 0.58);
    wheel(x, -0.58);
  });
  [5.0, 6.25].forEach((x) => {
    wheel(x, 1.02);
    wheel(x, -1.02);
  });
  wheel(10.1, 1.08);
  wheel(10.1, -1.08);

  // ground + lane markings (not sampled)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xc98a68, roughness: 0.95, transparent: true });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);
  const laneMat = new THREE.MeshBasicMaterial({ color: 0xf6e3c8, transparent: true, opacity: 0.5 });
  const lanes = new THREE.Group();
  g.add(lanes);
  for (let i = -14; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.18), laneMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(i * 9, 0.01, 4.2);
    lanes.add(m);
  }
  // parked trailers that appear in the wireframe phase
  const ghostEdge = new THREE.LineBasicMaterial({
    color: 0x9fc2ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const ghostFill = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const tGeo = new THREE.BoxGeometry(13.6, 2.75, 2.56);
  tGeo.translate(0, 2.6, 0);
  const tEdges = new THREE.EdgesGeometry(tGeo);
  [
    [-6, -9, 0],
    [-6, -13, 0],
    [10, -10, 0],
    [10, -14, 0],
    [-20, 6, Math.PI / 2],
    [24, 8, Math.PI / 2.3],
    [-4, 16, 0.08],
    [12, 16, -0.05],
  ].forEach(([x, z, r]) => {
    const fill = new THREE.Mesh(tGeo, ghostFill);
    fill.position.set(x, 0, z);
    fill.rotation.y = r;
    fill.add(new THREE.LineSegments(tEdges, ghostEdge));
    g.add(fill);
  });

  return {
    group: g,
    update(t, s) {
      truck.position.y = Math.sin(t * 2.0) * 0.006;
      // lane dashes roll past so the truck reads as driving
      lanes.position.x = -((t * 6) % 9) * s.solid;
      ghostEdge.opacity = ss(0.22, 0.34, s.p) * (1 - ss(0.5, 0.62, s.p)) * 0.55;
      ghostFill.opacity = ghostEdge.opacity * 0.08;
      groundMat.opacity = s.env;
      laneMat.opacity = 0.5 * s.env;
      ground.visible = lanes.visible = s.env > 0.002;
    },
  };
}

/* =======================================================
   SCENES
   ======================================================= */
const stories = [];
const make = (cfg) => {
  try {
    stories.push(createStory(cfg));
  } catch (e) {
    console.error(cfg.sel, e);
  }
};

make({
  sel: '.story[data-story="sea"]',
  build: buildShip,
  far: 4000,
  skyR: 1800,
  sky: {
    top: [0.1, 0.1, 0.17],
    mid: [0.55, 0.28, 0.19],
    hor: [0.92, 0.44, 0.17],
    low: [0.06, 0.05, 0.05],
    glow: [0.9, 0.42, 0.12],
  },
  sun: [0.42, 0.028, -1],
  fog: 0xb8643a,
  fogNear: 160,
  fogFar: 1300,
  hemi: [0xffbf95, 0x2a2220, 0.5],
  key: [0xff9a55, 0.55],
  keyPos: [-30, 18, 60],
  rim: [0xffa060, 3.4],
  shadow: 52,
  shadowFar: 320,
  exposure: 0.95,
  bloom: [0.55, 0.45, 0.92],
  edgeColor: [0.5, 1.45, 0.14],
  holoColor: [0.32, 0.9, 0.06],
  holoFill: 0.07,
  holoGlow: 0.5,
  mirror: true,
  edgeFog: true,
  gridColor: 0x9ad62a,
  pScale: 150,
  pSpread: 30,
  starR: [500, 1100],
  grid: [900, 150, 0.05],
  parallax: 4,
  // sunset → close pass along the hull (cut to port) → port reveal → hologram → light tunnel → particles
  phase: (p) => {
    const holo = ss(0.4, 0.48, p) * (1 - ss(0.8, 0.86, p));
    return {
      port: p > 0.205 ? 1 : 0,
      solid: 1 - ss(0.4, 0.5, p),
      edge: holo,
      holo,
      night: ss(0.4, 0.5, p),
      env: 1 - ss(0.8, 0.86, p),
      parts: ss(0.82, 0.9, p) * 0.38,
      scatter: ss(0.9, 1.0, p) * 0.35,
      stars: ss(0.84, 0.96, p) * 0.35,
      grid: 0,
    };
  },
  keys: [
    [0.0, [-14, 4.5, 124], [2, 7, 0]],
    [0.1, [-8, 5, 96], [0, 7, 0]],
    [0.17, [-26, 6, 30], [-12, 6.5, 0]],
    [0.21, [-14, 6, 13], [-2, 6, 0]],
    [0.28, [78, 34, 72], [0, 14, -12]],
    [0.38, [84, 40, 52], [0, 13, -12]],
    [0.48, [54, 22, 36], [0, 6, -6]],
    [0.57, [52, 15, 44], [0, 6, 0]],
    [0.63, [62, 10, 2], [20, 5, -30]],
    [0.67, [112, 5.6, -40], [40, 5.6, -40]],
    [0.71, [80, 5.6, -40], [0, 5.6, -40]],
    [0.75, [30, 5.6, -40], [-50, 5.6, -40]],
    [0.79, [-20, 5.6, -40], [-100, 5.6, -40]],
    [0.83, [-60, 6, -40], [-140, 6, -40]],
    [0.9, [-80, 26, 92], [0, 6, 0]],
    [1.0, [-10, 54, 112], [0, 8, 0]],
  ],
});

make({
  sel: '.story[data-story="air"]',
  build: buildPlane,
  far: 9000,
  skyR: 4000,
  sky: {
    top: [0.02, 0.035, 0.09],
    mid: [0.05, 0.08, 0.17],
    hor: [0.28, 0.22, 0.3],
    low: [0.02, 0.02, 0.03],
    glow: [0.6, 0.35, 0.3],
  },
  sun: [0.55, -0.05, -0.83],
  fog: 0x231f2c,
  fogNear: 300,
  fogFar: 2600,
  hemi: [0x6c7aa8, 0x0a0c12, 0.55],
  key: [0xb8c8ff, 0.8],
  keyPos: [-40, 50, 90],
  rim: [0xffb070, 1.8],
  shadow: 0,
  exposure: 1.0,
  bloom: [0.6, 0.5, 0.9],
  edgeColor: [0.5, 1.45, 0.14],
  holoColor: [0.32, 0.9, 0.06],
  holoFill: 0.045,
  holoGlow: 0.35,
  pScale: 160,
  pSpread: 40,
  starR: [700, 1600],
  grid: [1600, 80, -32],
  parallax: 5,
  // night runway → take-off → through the clouds → golden cruise → hologram over a live route map → particles
  phase: (p) => {
    const holo = ss(0.46, 0.53, p) * (1 - ss(0.64, 0.7, p));
    return {
      solid: 1 - ss(0.46, 0.54, p),
      edge: holo,
      holo,
      night: ss(0.46, 0.54, p),
      env: 1,
      parts: ss(0.64, 0.7, p) * 0.45,
      scatter: ss(0.7, 0.92, p) * 0.5,
      stars: ss(0.5, 0.62, p) * 0.4,
      grid: 0,
    };
  },
  keys: [
    [0.0, [-96, -3.2, 34], [10, -1, 0]],
    [0.08, [-84, -3.6, 40], [10, -1, 0]],
    [0.16, [-48, -2, 62], [6, 1, 0]],
    [0.24, [-24, 3, 80], [4, 3, 0]],
    [0.3, [8, 8, 76], [0, 2, 0]],
    [0.38, [44, 10, 84], [0, 0, 0]],
    [0.46, [80, 40, -40], [0, -2, 0]],
    [0.56, [30, 60, 60], [0, -4, 0]],
    [0.66, [-20, 90, 120], [0, 0, 0]],
    [0.8, [-50, 130, 150], [0, 0, 0]],
    [1.0, [-24, 96, 170], [0, 5, 0]],
  ],
});

make({
  sel: '.story[data-story="road"]',
  build: buildTruck,
  far: 800,
  skyR: 400,
  sky: { top: [0.36, 0.45, 0.66], mid: [0.86, 0.55, 0.48], hor: [1.0, 0.64, 0.32], low: [0.45, 0.22, 0.15] },
  sun: [-0.8, 0.12, -0.6],
  fog: 0xe39a6a,
  fogNear: 60,
  fogFar: 260,
  hemi: [0xffd2b0, 0x6b3a2a, 0.9],
  key: [0xffb070, 3.2],
  keyPos: [-34, 16, 38],
  rim: [0xffc29a, 1.4],
  shadow: 30,
  shadowFar: 160,
  exposure: 1.05,
  pScale: 60,
  pSpread: 26,
  starR: [120, 280],
  grid: [240, 60, 0.02],
  parallax: 2.2,
  keys: [
    [0.0, [2.0, 2.3, 26], [1.5, 2.4, 0]],
    [0.18, [9.0, 3.0, 23], [0.5, 2.2, 0]],
    [0.4, [26, 16, 22], [0, 1.4, 0]],
    [0.62, [10, 34, 10], [0, 0, 0]],
    [1.0, [2, 52, 6], [0, 6, 0]],
  ],
});
window.__three = stories.length > 0;

/* =======================================================
   GLOBE
   ======================================================= */
const gCanvas = document.getElementById('globe-canvas');
const gR = new THREE.WebGLRenderer({ canvas: gCanvas, antialias: true, alpha: false });
gR.setPixelRatio(Math.min(devicePixelRatio, 2));
gR.setClearColor(0x03050c);
const gS = new THREE.Scene();
const gC = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
const R = 10;
const globe = new THREE.Group();
gS.add(globe);
// planet body
globe.add(
  new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 64),
    new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - max(dot(vN, vV), 0.), 3.0); vec3 c = mix(vec3(.012,.02,.045), vec3(.2,.45,1.), f*.8); gl_FragColor = vec4(c,1.); }`,
    }),
  ),
);
// atmosphere
gS.add(
  new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.06, 96, 64),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(max(dot(vN, vV), 0.) , 2.2); gl_FragColor = vec4(vec3(.35,.6,1.)*f*1.6, f); }`,
    }),
  ),
);

// city lights + hubs clustered around a "region" facing the camera
const regionDir = new THREE.Vector3(0, 0.62, 0.78).normalize();
const randOnCap = (center, spread) => {
  const v = new THREE.Vector3().randomDirection().multiplyScalar(spread).add(center).normalize();
  return v;
};
const clusterCenters = [];
for (let i = 0; i < 46; i++) clusterCenters.push(randOnCap(regionDir, 0.95));
const cityN = isMobile ? 5000 : 9000,
  cityPos = new Float32Array(cityN * 3),
  citySeed = new Float32Array(cityN);
for (let i = 0; i < cityN; i++) {
  const c = Math.random() < 0.75 ? clusterCenters[(Math.random() * clusterCenters.length) | 0] : regionDir;
  const v = randOnCap(c, Math.random() < 0.75 ? 0.05 * Math.random() : 0.9).multiplyScalar(R * 1.002);
  cityPos.set([v.x, v.y, v.z], i * 3);
  citySeed[i] = Math.random();
}
const cityGeo = new THREE.BufferGeometry();
cityGeo.setAttribute('position', new THREE.BufferAttribute(cityPos, 3));
cityGeo.setAttribute('aSeed', new THREE.BufferAttribute(citySeed, 1));
const cityMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uPx: { value: gR.getPixelRatio() } },
  vertexShader: `attribute float aSeed; uniform float uTime, uPx; varying float vS; varying float vT;
    void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (1.0 + aSeed*2.2)*uPx; gl_Position = projectionMatrix*mv; vS = aSeed; vT = .6 + .4*sin(uTime*2. + aSeed*60.); }`,
  fragmentShader: `varying float vS; varying float vT; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;
    vec3 c = mix(vec3(.78,.96,.23), vec3(1.,.95,.75), step(.7, vS)); gl_FragColor = vec4(c, smoothstep(.5,0.,d)*vT*.9); }`,
});
globe.add(new THREE.Points(cityGeo, cityMat));

// arcs
const arcMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `attribute float aT; attribute float aOff; varying float vT; varying float vOff; void main(){ vT = aT; vOff = aOff; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float uTime; varying float vT; varying float vOff;
    void main(){ float head = fract(uTime*.25 + vOff); float d = head - vT; float tail = smoothstep(.35, 0., d) * step(0., d);
      float base = .18; gl_FragColor = vec4(vec3(.78,.96,.23), base*.6 + tail*.95); }`,
});
const arcGroup = new THREE.Group();
globe.add(arcGroup);
for (let i = 0; i < 70; i++) {
  const a = clusterCenters[(Math.random() * clusterCenters.length) | 0].clone().multiplyScalar(R);
  const b = clusterCenters[(Math.random() * clusterCenters.length) | 0].clone().multiplyScalar(R);
  const dist = a.distanceTo(b);
  if (dist < 0.8) continue;
  const mid = a
    .clone()
    .add(b)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(R + dist * 0.34);
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const pts = curve.getPoints(60);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const tt = new Float32Array(pts.length).map((_, k) => k / (pts.length - 1));
  geo.setAttribute('aT', new THREE.BufferAttribute(tt, 1));
  geo.setAttribute('aOff', new THREE.BufferAttribute(new Float32Array(pts.length).fill(Math.random()), 1));
  arcGroup.add(new THREE.Line(geo, arcMat));
}
// hub rings
const hubMat = new THREE.MeshBasicMaterial({
  color: 0xc8f43a,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const hubs = [];
clusterCenters.slice(0, 14).forEach((c) => {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.06, 24), hubMat.clone());
  m.position.copy(c).multiplyScalar(R * 1.004);
  m.lookAt(c.clone().multiplyScalar(R * 2));
  m.userData.o = Math.random() * 3;
  globe.add(m);
  hubs.push(m);
});

let globeVisible = false,
  globeP = 0;
const netSec = document.getElementById('network');
new IntersectionObserver(([e]) => (globeVisible = e.isIntersecting), { rootMargin: '100px' }).observe(netSec);
function gResize() {
  const w = netSec.clientWidth,
    h = netSec.clientHeight;
  gR.setSize(w, h, false);
  gC.aspect = w / h;
  gC.updateProjectionMatrix();
}
addEventListener('resize', gResize);
gResize();

function renderGlobe() {
  const t = clock.getElapsedTime();
  const r = netSec.getBoundingClientRect();
  globeP = clamp01((innerHeight - r.top) / (innerHeight + r.height));
  const aspectPush = gC.aspect < 1 ? 1.8 : 1;
  gC.position.set(0, lerp(13, 9.5, globeP), lerp(22, 15, globeP) * aspectPush);
  gC.lookAt(0, lerp(9, 7.5, globeP), 0);
  globe.rotation.y = lerp(-0.45, 0.35, globeP) + Math.sin(t * 0.1) * 0.03;
  cityMat.uniforms.uTime.value = t;
  arcMat.uniforms.uTime.value = t;
  hubs.forEach((h) => {
    const k = (t * 0.6 + h.userData.o) % 1;
    h.scale.setScalar(1 + k * 1.6);
    h.material.opacity = (1 - k) * 0.8;
  });
  gR.render(gS, gC);
}

/* =======================================================
   LOOP
   ======================================================= */
// adaptive resolution: keeps scrolling smooth on slower machines
let lastT = clock.getElapsedTime(),
  ema = 16,
  checkAt = 2,
  quality = 1;
gR.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  const dt = Math.min(0.1, Math.max(0.001, t - lastT));
  lastT = t;
  mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 2.4));
  mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 2.4));
  const active = stories.some((s) => s.isVisible());
  if (active) ema += (dt * 1000 - ema) * 0.05;
  if (active && t > checkAt) {
    checkAt = t + 1.5;
    if (ema > 26 && quality > 0.5) quality = Math.max(0.5, quality - 0.15);
    else if (ema < 14 && quality < 1) quality = Math.min(1, quality + 0.1);
    stories.forEach((s) => s.setPR(Math.max(1, s.maxPR * quality)));
  }
  stories.forEach((s) => s.render(t, dt));
  if (globeVisible) renderGlobe();
});
