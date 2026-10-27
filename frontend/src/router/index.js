import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import StorefrontView from '../views/StorefrontView.vue';
import CartCheckoutView from '../views/CartCheckoutView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import MyOrdersView from '../views/MyOrdersView.vue';
import AdminDashboardView from '../views/admin/AdminDashboardView.vue';

const routes = [
  {
    path: '/',
    name: 'storefront',
    component: StorefrontView,
    meta: { title: 'SecVault Store — Security Catalog' },
  },
  {
    path: '/cart',
    name: 'cart',
    component: CartCheckoutView,
    meta: { title: 'Shopping Cart & Secure Checkout' },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true, title: 'Sign In — SecVault' },
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { guestOnly: true, title: 'Create Account — SecVault' },
  },
  {
    path: '/orders',
    name: 'my-orders',
    component: MyOrdersView,
    meta: { requiresAuth: true, title: 'My Orders — SecVault' },
  },
  {
    path: '/admin/:tab?',
    name: 'admin-dashboard',
    component: AdminDashboardView,
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Admin Security Console — SecVault' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

/**
 * SECURITY NAVIGATION GUARD:
 * Always verifies session status against the Backend (/api/auth/me) on initial load
 * and before entering any protected or /admin/* route. Never relies solely on client Pinia state.
 */
let initialCheckDone = false;

router.beforeEach(async (to, from, next) => {
  document.title = to.meta.title || 'SecVault Store';
  const authStore = useAuthStore();

  // Always verify with backend on every protected route, admin route, or first page load
  if (!initialCheckDone || to.meta.requiresAuth || to.meta.requiresAdmin || to.path.startsWith('/admin')) {
    await authStore.verifySessionWithBackend();
    initialCheckDone = true;
  }

  if (to.meta.requiresAdmin || to.path.startsWith('/admin')) {
    if (!authStore.isAuthenticated) {
      return next({ name: 'login', query: { redirect: to.fullPath } });
    }
    if (!authStore.isAdmin) {
      return next({ name: 'storefront', query: { error: 'unauthorized_admin' } });
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ name: 'storefront' });
  }

  next();
});

export default router;

