import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AwardPointsView from '../views/AwardPointsView.vue';
import ClassesView from '../views/ClassesView.vue';
import HistoryView from '../views/HistoryView.vue';
import RankingsView from '../views/RankingsView.vue';
import GuidanceView from '../views/GuidanceView.vue';
import NotificationsView from '../views/NotificationsView.vue';
import LoginView from '../views/LoginView.vue';

const routes = [
  {
    path: '/',
    name: 'award',
    component: AwardPointsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/classes',
    name: 'classes',
    component: ClassesView,
    meta: { requiresAuth: true },
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
    meta: { requiresAuth: true },
  },
  {
    path: '/rankings',
    name: 'rankings',
    component: RankingsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/guidance',
    name: 'guidance',
    component: GuidanceView,
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
