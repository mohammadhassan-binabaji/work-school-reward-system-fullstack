<script setup lang="ts">
interface Props {
  variant?: 'trophy' | 'cap' | 'rocket' | 'book' | 'star' | 'inquisitive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'cap',
  size: 'md',
});

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
  xl: 'w-44 h-44',
};
</script>

<template>
  <div :class="['relative flex items-center justify-center select-none', sizeClasses[props.size]]">
    <!-- Outer ambient neon aura -->
    <div
      class="absolute inset-0 rounded-full blur-xl opacity-40 bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400"
    ></div>

    <!-- 3D Mascot SVG Rendering -->
    <svg viewBox="0 0 200 200" class="w-full h-full relative z-10 drop-shadow-[0_10px_20px_rgba(0,229,255,0.3)]">
      <defs>
        <radialGradient id="birdBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#38BDF8" />
          <stop offset="60%" stop-color="#0284C7" />
          <stop offset="100%" stop-color="#0369A1" />
        </radialGradient>
        <radialGradient id="birdBelly" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#E0F2FE" />
          <stop offset="100%" stop-color="#BAE6FD" />
        </radialGradient>
        <radialGradient id="eyePupil" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </radialGradient>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FDE047" />
          <stop offset="50%" stop-color="#EAB308" />
          <stop offset="100%" stop-color="#CA8A04" />
        </linearGradient>
      </defs>

      <!-- Bird Main Body -->
      <circle cx="100" cy="105" r="62" fill="url(#birdBody)" />

      <!-- Belly Patch -->
      <ellipse cx="100" cy="122" rx="36" ry="40" fill="url(#birdBelly)" opacity="0.95" />

      <!-- Wings -->
      <path
        d="M 40 105 C 22 110, 24 135, 48 132 C 55 130, 58 115, 40 105 Z"
        fill="#0284C7"
      />
      <path
        d="M 160 105 C 178 110, 176 135, 152 132 C 145 130, 142 115, 160 105 Z"
        fill="#0284C7"
      />

      <!-- Big Expressive Eyes -->
      <ellipse cx="78" cy="88" rx="15" ry="17" fill="#FFFFFF" />
      <ellipse cx="122" cy="88" rx="15" ry="17" fill="#FFFFFF" />

      <!-- Pupils -->
      <circle cx="82" cy="89" r="8" fill="url(#eyePupil)" />
      <circle cx="126" cy="89" r="8" fill="url(#eyePupil)" />

      <!-- Eye Highlights -->
      <circle cx="85" cy="86" r="3" fill="#FFFFFF" />
      <circle cx="129" cy="86" r="3" fill="#FFFFFF" />

      <!-- Beak (Cute orange cone) -->
      <polygon points="100,98 90,112 110,112" fill="#F97316" />
      <polygon points="100,116 93,112 107,112" fill="#EA580C" />

      <!-- Rosy Cheeks -->
      <circle cx="62" cy="102" r="7" fill="#F43F5E" opacity="0.4" />
      <circle cx="138" cy="102" r="7" fill="#F43F5E" opacity="0.4" />

      <!-- Feet -->
      <ellipse cx="85" cy="168" rx="10" ry="5" fill="#F97316" />
      <ellipse cx="115" cy="168" rx="10" ry="5" fill="#F97316" />

      <!-- Variants Accessories -->
      <!-- Cap (White/Cyan Cap) -->
      <g v-if="variant === 'cap' || variant === 'inquisitive'">
        <path
          d="M 64 68 C 72 45, 128 45, 136 68 Z"
          fill="#FFFFFF"
        />
        <path
          d="M 52 68 Q 100 62 148 68 Q 100 74 52 68 Z"
          fill="#38BDF8"
        />
        <circle cx="100" cy="46" r="5" fill="#F59E0B" />
      </g>

      <!-- Trophy Variant -->
      <g v-else-if="variant === 'trophy'">
        <!-- Small Cap -->
        <path d="M 75 62 C 80 48, 120 48, 125 62 Z" fill="#FFFFFF" />
        <!-- Gold Trophy held in wing -->
        <g transform="translate(130, 95) scale(0.65)">
          <path d="M 10 10 L 40 10 L 35 40 L 15 40 Z" fill="url(#goldGradient)" />
          <path d="M 10 16 C -2 16, -2 30, 15 32" fill="none" stroke="#EAB308" stroke-width="4" />
          <path d="M 40 16 C 52 16, 52 30, 35 32" fill="none" stroke="#EAB308" stroke-width="4" />
          <rect x="22" y="40" width="6" height="12" fill="#CA8A04" />
          <rect x="14" y="52" width="22" height="8" rx="2" fill="#92400E" />
        </g>
      </g>

      <!-- Rocket Variant -->
      <g v-else-if="variant === 'rocket'">
        <g transform="translate(130, 80) scale(0.6) rotate(25)">
          <path d="M 20 0 Q 35 15 35 45 L 5 45 Q 5 15 20 0 Z" fill="#EF4444" />
          <circle cx="20" cy="25" r="7" fill="#E0F2FE" stroke="#94A3B8" stroke-width="2" />
          <path d="M 5 35 L -5 45 L 5 45 Z" fill="#F97316" />
          <path d="M 35 35 L 45 45 L 35 45 Z" fill="#F97316" />
          <path d="M 12 45 L 20 58 L 28 45 Z" fill="#FBBF24" />
        </g>
      </g>

      <!-- Book Variant -->
      <g v-else-if="variant === 'book'">
        <g transform="translate(20, 100) scale(0.6)">
          <rect x="0" y="0" width="35" height="45" rx="3" fill="#10B981" />
          <rect x="5" y="5" width="25" height="35" rx="2" fill="#F8FAFC" />
          <line x1="10" y1="12" x2="25" y2="12" stroke="#64748B" stroke-width="2" />
          <line x1="10" y1="20" x2="25" y2="20" stroke="#64748B" stroke-width="2" />
          <line x1="10" y1="28" x2="20" y2="28" stroke="#64748B" stroke-width="2" />
        </g>
      </g>

      <!-- Star Variant -->
      <g v-else-if="variant === 'star'">
        <polygon
          points="100,32 106,45 120,46 109,56 113,70 100,62 87,70 91,56 80,46 94,45"
          fill="url(#goldGradient)"
          stroke="#CA8A04"
          stroke-width="1.5"
        />
      </g>
    </svg>
  </div>
</template>
