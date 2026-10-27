<script setup>
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: '',
});

const errorMsg = ref('');
const remainingAttempts = ref(null);

async function handleLogin() {
  errorMsg.value = '';
  remainingAttempts.value = null;

  if (!form.email.trim() || !form.password) {
    errorMsg.value = 'Please enter both email and password.';
    return;
  }

  const result = await authStore.login({
    email: form.email.trim(),
    password: form.password,
  });

  if (result.success) {
    const redirectPath = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : result.user?.role === 'ADMIN'
      ? '/admin'
      : '/';
    router.push(redirectPath);
  } else {
    errorMsg.value = result.message;
    if (typeof result.remainingAttempts === 'number') {
      remainingAttempts.value = result.remainingAttempts;
    }
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-3 sm:mt-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-8 space-y-5 sm:space-y-6">
    <div class="space-y-1 text-center">
      <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        HttpOnly Session + Brute-Force Protection
      </span>
      <h1 class="text-2xl font-bold text-white pt-2">Sign In to SecVault</h1>
      <p class="text-xs text-slate-400">
        Accounts lock automatically for 15 minutes after 5 failed attempts.
      </p>
    </div>

    <div
      v-if="errorMsg"
      class="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs space-y-1"
    >
      <p class="font-semibold">{{ errorMsg }}</p>
      <p v-if="remainingAttempts !== null" class="text-rose-300">
        Remaining attempts before temporary lockout: <strong>{{ remainingAttempts }}</strong>
      </p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
        <input
          v-model="form.email"
          type="email"
          required
          autocomplete="username"
          placeholder="admin@securestore.com"
          class="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 px-3.5 py-2 text-sm text-white outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
        <input
          v-model="form.password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="••••••••••••"
          class="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 px-3.5 py-2 text-sm text-white outline-none"
        />
      </div>

      <button
        type="submit"
        :disabled="authStore.loading"
        class="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-colors"
      >
        {{ authStore.loading ? 'Authenticating...' : 'Sign In Securely' }}
      </button>
    </form>

    <div class="text-center text-xs text-slate-400 border-t border-slate-800 pt-4">
      Don't have an account?
      <RouterLink to="/register" class="text-emerald-400 hover:underline font-semibold">
        Create a Customer Account
      </RouterLink>
    </div>
  </div>
</template>
