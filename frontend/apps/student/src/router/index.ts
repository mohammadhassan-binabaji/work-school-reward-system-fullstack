import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import DashboardView from '../views/DashboardView.vue';
import ChallengesView from '../views/ChallengesView.vue';
import PointGuidanceView from '../views/PointGuidanceView.vue';
import ProposalsView from '../views/ProposalsView.vue';
import RewardsView from '../views/RewardsView.vue';
import NotificationsView from '../views/NotificationsView.vue';
import LoginView from '../views/LoginView.vue';

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: '/challenges',
    name: 'challenges',
    component: ChallengesView,
    meta: { requiresAuth: true },
  },
  {
    path: '/guidance',
    name: 'guidance',
    component: PointGuidanceView,
    meta: { requiresAuth: true },
  },
  {
    path: '/proposals',
    name: 'proposals',
    component: ProposalsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/rewards',
    name: 'rewards',
    component: RewardsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: NotificationsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // If user state is not loaded yet, try to load it
  if (!authStore.user) {
    await authStore.fetchMe();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/');
  } else {
    next();
  }
});
