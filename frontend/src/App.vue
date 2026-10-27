<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const cartStore = useCartStore();

const dismissAlert = () => {
  const query = { ...route.query };
  delete query.error;
  router.replace({ query });
};

const handleLogout = async () => {
  await authStore.logout();
  router.push({ name: 'login' });
};

const showUnauthorizedBanner = computed(() => route.query.error === 'unauthorized_admin');
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <div class="bg-slate-900/90 border-b border-emerald-500/20 text-[11px] sm:text-xs text-slate-400 py-1.5 px-3 sm:px-4">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Welcome to SecVault — shop privacy and security essentials</span>
        </div>
        <span class="hidden sm:inline text-emerald-400/90">Secure online shopping</span>
      </div>
    </div>

    <!-- Unauthorized Admin Access Alert -->
    <div
      v-if="showUnauthorizedBanner"
      class="bg-rose-950/90 border-b border-rose-500/40 text-rose-200 px-4 py-3 text-sm"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <span>Access Denied: Administrator privileges are required to view that section.</span>
        <button @click="dismissAlert" class="text-xs underline hover:text-white">Dismiss</button>
      </div>
    </div>

    <!-- Main Navigation Header -->
    <header class="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div class="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <RouterLink to="/" class="flex items-center gap-3 group">
          <div class="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
            SV
          </div>
          <div>
            <span class="font-bold text-lg tracking-tight text-white">SecVault</span>
            <span class="block text-[10px] uppercase tracking-widest text-emerald-400">Security Store</span>
          </div>
        </RouterLink>

        <nav class="w-full sm:w-auto flex items-center gap-2 sm:gap-5 text-sm overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
          <RouterLink
            to="/"
            class="shrink-0 text-slate-300 hover:text-emerald-400 transition-colors font-medium"
          >
            Catalog
          </RouterLink>

          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/orders"
            class="shrink-0 text-slate-300 hover:text-emerald-400 transition-colors font-medium"
          >
            My Orders
          </RouterLink>

          <RouterLink
            v-if="authStore.isAdmin"
            to="/admin"
            class="shrink-0 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 font-medium transition-colors"
          >
            Admin Console
          </RouterLink>

          <RouterLink
            to="/cart"
            class="relative shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-slate-200 transition-colors"
          >
            <span>Cart</span>
            <span
              class="px-2 py-0.5 text-xs font-bold rounded-full"
              :class="cartStore.totalItems > 0 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'"
            >
              {{ cartStore.totalItems }}
            </span>
          </RouterLink>

          <template v-if="authStore.isAuthenticated">
            <div class="hidden md:flex flex-col text-right text-xs border-l border-slate-800 pl-4">
              <span class="text-slate-200 font-medium">{{ authStore.user?.name }}</span>
              <span class="text-emerald-400 text-[10px] uppercase">{{ authStore.user?.role }}</span>
            </div>
            <button
              @click="handleLogout"
              class="shrink-0 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-colors"
            >
              Logout
            </button>
          </template>

          <template v-else>
            <RouterLink
              to="/login"
              class="shrink-0 text-slate-300 hover:text-white font-medium"
            >
              Sign In
            </RouterLink>
            <RouterLink
              to="/register"
              class="shrink-0 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
            >
              Register
            </RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Main View Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 SecVault E-Commerce</p>
        <p>Thank you for shopping with us.</p>
      </div>
    </footer>
  </div>
</template>
