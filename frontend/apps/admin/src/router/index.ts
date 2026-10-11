import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import DashboardView from '../views/DashboardView.vue';
import PoolManagementView from '../views/PoolManagementView.vue';
import UsersView from '../views/UsersView.vue';
import AcademicView from '../views/AcademicView.vue';
import TasksView from '../views/TasksView.vue';
import DirectAdjustView from '../views/DirectAdjustView.vue';
import RewardsView from '../views/RewardsView.vue';
import ActivitiesView from '../views/ActivitiesView.vue';
import ProposalsView from '../views/ProposalsView.vue';
import GuidanceView from '../views/GuidanceView.vue';
import TiersView from '../views/TiersView.vue';
import RankingsView from '../views/RankingsView.vue';
import ReportsView from '../views/ReportsView.vue';
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
    path: '/pool',
    name: 'pool',
    component: PoolManagementView,
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'users',
    component: UsersView,
    meta: { requiresAuth: true },
  },
  {
    path: '/academic',
    name: 'academic',
    component: AcademicView,
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: TasksView,
    meta: { requiresAuth: true },
  },
  {
    path: '/adjust',
    name: 'adjust',
    component: DirectAdjustView,
    meta: { requiresAuth: true },
  },
  {
    path: '/rewards',
    name: 'rewards',
    component: RewardsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/activities',
    name: 'activities',
    component: ActivitiesView,
    meta: { requiresAuth: true },
  },
  {
    path: '/proposals',
    name: 'proposals',
    component: ProposalsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/guidance',
    name: 'guidance',
    component: GuidanceView,
    meta: { requiresAuth: true },
  },
  {
    path: '/tiers',
    name: 'tiers',
    component: TiersView,
    meta: { requiresAuth: true },
  },
  {
    path: '/rankings',
    name: 'rankings',
    component: RankingsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports',
    name: 'reports',
    component: ReportsView,
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
