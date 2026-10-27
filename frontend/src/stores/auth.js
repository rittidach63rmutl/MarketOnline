import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api, { setInMemoryToken, getSafeErrorMessage } from '../services/api';

/**
 * Security-First Auth Store
 * - Access tokens are kept ONLY in volatile JS memory (never LocalStorage/SessionStorage)
 * - Session persistence across reloads relies strictly on HttpOnly + SameSite cookies
 * - verifySessionWithBackend() queries /api/auth/me on route transitions to prevent client state tampering
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  async function register(payload) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post('/auth/register', payload);
      setInMemoryToken(data.data.accessToken);
      user.value = data.data.user;
      return { success: true };
    } catch (err) {
      error.value = getSafeErrorMessage(err, 'Registration failed.');
      return { success: false, message: error.value };
    } finally {
      loading.value = false;
    }
  }

  async function login(payload) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post('/auth/login', payload);
      setInMemoryToken(data.data.accessToken);
      user.value = data.data.user;
      return { success: true, user: user.value };
    } catch (err) {
      error.value = getSafeErrorMessage(err, 'Invalid credentials.');
      return {
        success: false,
        message: error.value,
        remainingAttempts: err.response?.data?.remainingAttempts,
      };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Always verifies live authentication status & RBAC role directly against the Backend
   * Used by Vue Router Navigation Guard so modifying Pinia state in DevTools cannot bypass /admin
   */
  async function verifySessionWithBackend() {
    try {
      const { data } = await api.get('/auth/me');
      user.value = data.data.user;
      return user.value;
    } catch (_) {
      user.value = null;
      setInMemoryToken(null);
      return null;
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Clear local state regardless of network status
    } finally {
      user.value = null;
      setInMemoryToken(null);
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    register,
    login,
    verifySessionWithBackend,
    logout,
  };
});

