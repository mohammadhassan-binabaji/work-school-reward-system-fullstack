<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { toPersianDigits, formatJalaliDate, type StudentBalancePoint } from '@student-reward/shared';

const props = withDefaults(
  defineProps<{
    balancePoints: StudentBalancePoint[];
    hasMore?: boolean;
    loadingMore?: boolean;
  }>(),
  {
    hasMore: false,
    loadingMore: false,
  },
);

const emit = defineEmits<{
  (e: 'load-more'): void;
}>();

// Container & Dimensions
const containerRef = ref<HTMLDivElement | null>(null);
const containerWidth = ref(340);
const chartHeight = 150;
const yAxisWidth = 36;
const paddingTop = 18;
const paddingBottom = 26; // room for X-axis dates
const plotHeight = chartHeight - paddingTop - paddingBottom;
const zeroBaselineY = chartHeight - paddingBottom;

// Viewport width for the 7-day window
const viewportWidth = computed(() => Math.max(120, containerWidth.value - yAxisWidth));
const stepX = computed(() => viewportWidth.value / 6); // 7 points span exactly viewportWidth

// Total width of the SVG timeline
const totalTimelineWidth = computed(() => {
  const n = props.balancePoints.length;
  if (n <= 7) return viewportWidth.value;
  return (n - 1) * stepX.value;
});

// Translation / PanX state
const minTranslateX = computed(() => {
  const n = props.balancePoints.length;
  if (n <= 7) return 0;
  return -(totalTimelineWidth.value - viewportWidth.value);
});
const maxTranslateX = 0; // scrolled all the way to oldest

const translateX = ref(0);
const isDragging = ref(false);
const activeIndex = ref<number | null>(null);
const isTooltipVisible = ref(false);

// Auto-align to latest 7 days when data loads or changes
watch(
  () => props.balancePoints.length,
  async (newLen, oldLen) => {
    await nextTick();
    if (!oldLen || oldLen === 0) {
      // First load: scroll to latest points (far right)
      translateX.value = minTranslateX.value;
    } else if (newLen > oldLen) {
      // Older items prepended to the left: maintain scroll position relative to current view
      const addedCount = newLen - oldLen;
      translateX.value -= addedCount * stepX.value;
    }
  },
  { immediate: true },
);

// Dynamic Y-axis ceiling based on visible points in current 7-day window
const visiblePoints = computed(() => {
  if (props.balancePoints.length === 0) return [];
  const currentLeft = -translateX.value;
  const currentRight = currentLeft + viewportWidth.value;
  const buffer = stepX.value;

  return props.balancePoints.filter((_, idx) => {
    const x = idx * stepX.value;
    return x >= currentLeft - buffer && x <= currentRight + buffer;
  });
});

const dynamicMax = computed(() => {
  const source = visiblePoints.value.length > 0 ? visiblePoints.value : props.balancePoints;
  if (source.length === 0) return 50;
  const maxVal = Math.max(...source.map((p) => p.balance), 0);
  if (maxVal <= 25) return 25;
  if (maxVal <= 50) return 50;
  if (maxVal <= 100) return 100;
  return Math.ceil(maxVal / 25) * 25;
});

const yTicks = computed(() => {
  const top = dynamicMax.value;
  const mid = Math.round(top / 2);
  return [
    { value: top, y: paddingTop },
    { value: mid, y: paddingTop + plotHeight / 2 },
    { value: 0, y: zeroBaselineY },
  ];
});

// Projected coordinates for all points
const projectedPoints = computed(() => {
  const ceil = dynamicMax.value || 1;
  return props.balancePoints.map((pt, idx) => {
    const x = idx * stepX.value;
    const clampedBal = Math.max(0, pt.balance);
    const y = zeroBaselineY - (clampedBal / ceil) * plotHeight;
    return {
      x,
      y,
      balance: pt.balance,
      date: pt.date,
    };
  });
});

// Monotone / Catmull-Rom cubic Bezier path generator (no negative overshoot)
const bezierPath = computed(() => {
  const pts = projectedPoints.value;
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    const tension = 0.22;
    let cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    let cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    // Prevent Bezier control points from dipping below zero baseline
    cp1y = Math.min(zeroBaselineY, cp1y);
    cp2y = Math.min(zeroBaselineY, cp2y);

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
});

// Area fill path closed to zero baseline
const areaPath = computed(() => {
  const pts = projectedPoints.value;
  if (pts.length < 2) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${bezierPath.value} L ${last.x.toFixed(1)} ${zeroBaselineY} L ${first.x.toFixed(1)} ${zeroBaselineY} Z`;
});

// Date formatting for X-axis labels
function formatShortDate(dateStr: string): string {
  const formatted = formatJalaliDate(dateStr);
  if (formatted === '—') return '';
  const parts = formatted.split('/');
  if (parts.length >= 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return formatted;
}

// Active tooltip details
const activePoint = computed(() => {
  if (activeIndex.value === null || !projectedPoints.value[activeIndex.value]) {
    return null;
  }
  return projectedPoints.value[activeIndex.value];
});

const tooltipPosition = computed(() => {
  if (!activePoint.value) return { left: 0, top: 0 };
  const rawX = activePoint.value.x + translateX.value + yAxisWidth;
  // Keep tooltip within visible card bounds
  const clampedX = Math.max(50, Math.min(containerWidth.value - 50, rawX));
  const rawY = Math.max(10, activePoint.value.y - 32);
  return {
    left: clampedX,
    top: rawY,
  };
});

// Touch / Pointer Gesture Handling
let startX = 0;
let lastX = 0;
let startTranslate = 0;
let lastMoveTime = 0;
let velocityX = 0;
let momentumRafId: number | null = null;

function stopMomentum() {
  if (momentumRafId !== null) {
    cancelAnimationFrame(momentumRafId);
    momentumRafId = null;
  }
}

function handlePointerDown(e: PointerEvent) {
  stopMomentum();
  isDragging.value = true;
  startX = e.clientX;
  lastX = e.clientX;
  startTranslate = translateX.value;
  lastMoveTime = performance.now();
  velocityX = 0;

  // Set active point on initial touch
  updateActivePoint(e.clientX);
  isTooltipVisible.value = true;

  if (containerRef.value) {
    containerRef.value.setPointerCapture(e.pointerId);
  }
}

function handlePointerMove(e: PointerEvent) {
  if (!isDragging.value) return;

  const currentX = e.clientX;
  const deltaX = currentX - startX;
  const now = performance.now();
  const dt = now - lastMoveTime;

  if (dt > 0) {
    velocityX = (currentX - lastX) / dt;
  }
  lastX = currentX;
  lastMoveTime = now;

  let nextTranslate = startTranslate + deltaX;

  // Apply rubber-band damping outside boundaries
  if (nextTranslate > maxTranslateX) {
    const overflow = nextTranslate - maxTranslateX;
    nextTranslate = maxTranslateX + overflow * 0.35;
  } else if (nextTranslate < minTranslateX.value) {
    const overflow = minTranslateX.value - nextTranslate;
    nextTranslate = minTranslateX.value - overflow * 0.35;
  }

  translateX.value = nextTranslate;
  updateActivePoint(currentX);

  // Trigger lazy loading when near oldest date boundary
  checkLazyLoad();
}

function handlePointerUp(e: PointerEvent) {
  if (!isDragging.value) return;
  isDragging.value = false;

  // Auto-dismiss tooltip on release
  isTooltipVisible.value = false;
  activeIndex.value = null;

  if (containerRef.value && containerRef.value.hasPointerCapture(e.pointerId)) {
    containerRef.value.releasePointerCapture(e.pointerId);
  }

  // Boundary bounce back or momentum coast
  if (translateX.value > maxTranslateX) {
    bounceTo(maxTranslateX);
  } else if (translateX.value < minTranslateX.value) {
    bounceTo(minTranslateX.value);
  } else if (Math.abs(velocityX) > 0.15) {
    startInertialMomentum(velocityX * 16);
  }
}

function handlePointerCancel(e: PointerEvent) {
  handlePointerUp(e);
}

function updateActivePoint(clientX: number) {
  if (!containerRef.value || projectedPoints.value.length === 0) return;
  const rect = containerRef.value.getBoundingClientRect();
  const pointerInsideX = clientX - rect.left - yAxisWidth;
  const chartX = pointerInsideX - translateX.value;

  const closest = Math.round(chartX / stepX.value);
  const clampedIdx = Math.max(0, Math.min(projectedPoints.value.length - 1, closest));
  activeIndex.value = clampedIdx;
}

function checkLazyLoad() {
  if (props.hasMore && !props.loadingMore) {
    // If within 2 days of oldest boundary (maxTranslateX is 0)
    if (translateX.value >= maxTranslateX - stepX.value * 2) {
      emit('load-more');
    }
  }
}

function bounceTo(target: number) {
  stopMomentum();
  const start = translateX.value;
  const startTime = performance.now();
  const duration = 280;

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Smooth ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    translateX.value = start + (target - start) * ease;

    if (progress < 1) {
      momentumRafId = requestAnimationFrame(step);
    } else {
      translateX.value = target;
      momentumRafId = null;
    }
  }

  momentumRafId = requestAnimationFrame(step);
}

function startInertialMomentum(initialVelocity: number) {
  stopMomentum();
  let v = initialVelocity;
  const friction = 0.92;

  function step() {
    v *= friction;
    translateX.value += v;

    if (translateX.value > maxTranslateX) {
      bounceTo(maxTranslateX);
      return;
    }
    if (translateX.value < minTranslateX.value) {
      bounceTo(minTranslateX.value);
      return;
    }

    checkLazyLoad();

    if (Math.abs(v) > 0.2) {
      momentumRafId = requestAnimationFrame(step);
    } else {
      momentumRafId = null;
    }
  }

  momentumRafId = requestAnimationFrame(step);
}

// Scroll indicator metrics
const scrollProgressPercent = computed(() => {
  const range = maxTranslateX - minTranslateX.value;
  if (range <= 0) return 100;
  const current = maxTranslateX - translateX.value;
  return Math.max(0, Math.min(100, (current / range) * 100));
});

// Resize Observer
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth || 340;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          containerWidth.value = entry.contentRect.width;
        }
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  stopMomentum();
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full select-none touch-none overflow-hidden"
    :style="{ height: `${chartHeight + 16}px` }"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  >
    <!-- Background Horizontal Guide Lines -->
    <div
      class="absolute inset-0 pointer-events-none"
      :style="{ left: `${yAxisWidth}px`, right: '0px' }"
    >
      <svg class="w-full h-full">
        <line
          v-for="tick in yTicks"
          :key="tick.value"
          x1="0"
          :y1="tick.y"
          x2="100%"
          :y2="tick.y"
          stroke="rgba(255, 255, 255, 0.08)"
          stroke-dasharray="3 3"
          stroke-width="1"
        />
      </svg>
    </div>

    <!-- Scrolling Timeline Canvas (LTR) -->
    <div
      class="absolute top-0 bottom-0 pointer-events-none transition-transform"
      :style="{
        left: `${yAxisWidth}px`,
        width: `${viewportWidth}px`,
      }"
    >
      <svg
        class="h-full overflow-visible"
        :style="{
          width: `${totalTimelineWidth}px`,
          transform: `translateX(${translateX}px)`,
          willChange: 'transform',
        }"
      >
        <defs>
          <!-- Neon Area Gradient -->
          <linearGradient id="balanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.28" />
            <stop offset="70%" stop-color="#00F0FF" stop-opacity="0.06" />
            <stop offset="100%" stop-color="#00F0FF" stop-opacity="0" />
          </linearGradient>

          <!-- Neon Glow Filter -->
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <template v-if="projectedPoints.length > 1">
          <!-- Filled Area Under Curve -->
          <path :d="areaPath" fill="url(#balanceAreaGrad)" />

          <!-- Smooth Bezier Line -->
          <path
            :d="bezierPath"
            fill="none"
            stroke="#00F0FF"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            filter="url(#neonGlow)"
          />

          <!-- Data Point Nodes & X-Axis Labels -->
          <g v-for="(pt, idx) in projectedPoints" :key="idx">
            <!-- Node Outer Subtle Ring -->
            <circle
              :cx="pt.x"
              :cy="pt.y"
              r="3.5"
              fill="#0B0E14"
              stroke="#00F0FF"
              stroke-width="1.8"
            />

            <!-- X-Axis Date (LTR chronological) -->
            <text
              :x="pt.x"
              :y="zeroBaselineY + 16"
              text-anchor="middle"
              class="text-[9px] fill-slate-400 font-medium"
              style="direction: ltr"
            >
              {{ formatShortDate(pt.date) }}
            </text>
          </g>

          <!-- Active Scrub Node Halo & Vertical Drop-Line -->
          <g v-if="isTooltipVisible && activePoint">
            <!-- Vertical Dashed Drop-Line -->
            <line
              :x1="activePoint.x"
              :y1="activePoint.y"
              :x2="activePoint.x"
              :y2="zeroBaselineY"
              stroke="#00F0FF"
              stroke-width="1.5"
              stroke-dasharray="2 3"
            />

            <!-- Active Pulsing Glow Halo -->
            <circle
              :cx="activePoint.x"
              :cy="activePoint.y"
              r="9"
              fill="rgba(0, 240, 255, 0.25)"
              stroke="#00F0FF"
              stroke-width="1.5"
            />
            <circle
              :cx="activePoint.x"
              :cy="activePoint.y"
              r="4"
              fill="#FFFFFF"
            />
          </g>
        </template>

        <!-- Empty or Sparse State Fallback -->
        <template v-else>
          <line
            x1="0"
            :y1="zeroBaselineY"
            :x2="viewportWidth"
            :y2="zeroBaselineY"
            stroke="rgba(0, 240, 255, 0.4)"
            stroke-width="1.5"
            stroke-dasharray="4 4"
          />
          <text
            :x="viewportWidth / 2"
            :y="zeroBaselineY - 30"
            text-anchor="middle"
            class="text-[11px] fill-slate-400 font-medium"
          >
            هنوز تاریخچه کافی ثبت نشده است
          </text>
        </template>
      </svg>
    </div>

    <!-- Sticky Left Y-Axis Overlay -->
    <div
      class="absolute top-0 bottom-0 left-0 flex flex-col justify-between pointer-events-none z-10 bg-gradient-to-r from-[#111726] via-[#111726]/90 to-transparent pr-1"
      :style="{ width: `${yAxisWidth}px`, height: `${chartHeight}px` }"
    >
      <div
        v-for="tick in yTicks"
        :key="tick.value"
        class="absolute left-1 transform -translate-y-1/2 flex items-center"
        :style="{ top: `${tick.y}px` }"
      >
        <span class="text-[9px] font-bold text-slate-400">
          {{ toPersianDigits(tick.value) }}
        </span>
      </div>
    </div>

    <!-- Floating Glassmorphic Tooltip -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isTooltipVisible && activePoint"
        class="absolute pointer-events-none z-20 transform -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-neon-cyan/50 shadow-[0_4px_16px_rgba(0,240,255,0.25)] flex flex-col items-center whitespace-nowrap"
        :style="{
          left: `${tooltipPosition.left}px`,
          top: `${tooltipPosition.top}px`,
        }"
      >
        <span class="text-[11px] font-extrabold text-white flex items-center gap-1">
          <span class="text-neon-cyan">{{ toPersianDigits(activePoint.balance) }}</span>
          <span class="text-[9px] font-medium text-slate-300">نوین</span>
        </span>
        <span class="text-[9px] text-slate-400 font-semibold" style="direction: ltr">
          {{ formatShortDate(activePoint.date) }}
        </span>
      </div>
    </transition>

    <!-- Bottom Mini Scrollbar / Indicator Pill -->
    <div
      v-if="props.balancePoints.length > 7"
      class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full bg-slate-800 overflow-hidden"
    >
      <div
        class="h-full bg-gradient-to-r from-neon-cyan/60 to-neon-cyan rounded-full transition-all duration-100"
        :style="{
          width: '35%',
          transform: `translateX(${(scrollProgressPercent - 50) * 0.9}%)`,
        }"
      ></div>
    </div>
  </div>
</template>
