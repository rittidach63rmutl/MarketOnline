<script setup>
import { reactive, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  name: '',
  email: '',
  password: '',
});

const errorMsg = ref('');

// Real-time Password Policy Checklist
const passwordChecks = computed(() => {
  const p = form.password;
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /\d/.test(p),
    special: /[@$!%*?&#^()_\-+={}[\]|\\:;"'<>,.~/`]/.test(p),
  };
});

const isPasswordCompliant = computed(() =>
  Object.values(passwordChecks.value).every(Boolean)
);

async function handleRegister() {
  errorMsg.value = '';
  if (!isPasswordCompliant.value) {
    errorMsg.value = 'Please fulfill all password security policy requirements.';
    return;
  }

  const result = await authStore.register({
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
  });

  if (result.success) {
    router.push({ name: 'storefront' });
  } else {
    errorMsg.value = result.message;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
    <div class="space-y-1 text-center">
      <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        bcrypt (Salt Rounds: 12)
      </span>
      <h1 class="text-2xl font-bold text-white pt-2">Create Customer Account</h1>
      <p class="text-xs text-slate-400">
        Strict password complexity policy enforced on both client and server.
      </p>
    </div>

    <div
      v-if="errorMsg"
      class="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs"
    >
      {{ errorMsg }}
    </div>

    <form @submit.prevent="handleRegister" class="space-y-4" novalidate>
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          maxlength="80"
          placeholder="Jane Doe"
          class="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 px-3.5 py-2 text-sm text-white outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
        <input
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          placeholder="jane@example.com"
          class="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 px-3.5 py-2 text-sm text-white outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
        <input
          v-model="form.password"
          type="password"
          required
          autocomplete="new-password"
          placeholder="Minimum 8 chars, mixed case, number & symbol"
          class="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 px-3.5 py-2 text-sm text-white outline-none"
        />
      </div>

      <!-- Live Password Policy Meter -->
      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
        <p class="font-semibold text-slate-300">Password Policy Requirements:</p>
        <ul class="space-y-1">
          <li :class="passwordChecks.length ? 'text-emerald-400' : 'text-slate-500'">
            {{ passwordChecks.length ? '✓' : '○' }} At least 8 characters
          </li>
          <li :class="passwordChecks.upper ? 'text-emerald-400' : 'text-slate-500'">
            {{ passwordChecks.upper ? '✓' : '○' }} Uppercase letter (A-Z)
          </li>
          <li :class="passwordChecks.lower ? 'text-emerald-400' : 'text-slate-500'">
            {{ passwordChecks.lower ? '✓' : '○' }} Lowercase letter (a-z)
          </li>
          <li :class="passwordChecks.number ? 'text-emerald-400' : 'text-slate-500'">
            {{ passwordChecks.number ? '✓' : '○' }} Number (0-9)
          </li>
          <li :class="passwordChecks.special ? 'text-emerald-400' : 'text-slate-500'">
            {{ passwordChecks.special ? '✓' : '○' }} Special character (@ $ ! % * ? &amp; #)
          </li>
        </ul>
      </div>

      <button
        type="submit"
        :disabled="authStore.loading || !isPasswordCompliant"
        class="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm transition-colors"
      >
        {{ authStore.loading ? 'Creating Account...' : 'Create Account' }}
      </button>
    </form>

    <div class="text-center text-xs text-slate-400 border-t border-slate-800 pt-4">
      Already registered?
      <RouterLink to="/login" class="text-emerald-400 hover:underline font-semibold">
        Sign In
      </RouterLink>
    </div>
  </div>
</template>

