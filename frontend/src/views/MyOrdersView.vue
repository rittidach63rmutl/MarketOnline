<script setup>
import { ref, onMounted } from 'vue';
import api, { getSafeErrorMessage } from '../services/api';

const orders = ref([]);
const loading = ref(true);
const errorMessage = ref('');

async function fetchOrders() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.get('/orders/my-orders');
    orders.value = data.data.orders;
  } catch (err) {
    errorMessage.value = getSafeErrorMessage(err, 'Failed to load your order history.');
  } finally {
    loading.value = false;
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'SHIPPED':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    case 'CANCELLED':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }
}

onMounted(fetchOrders);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div>
        <h1 class="text-2xl font-bold text-white">My Orders</h1>
        <p class="text-xs text-slate-400">Your personal order history (Protected against IDOR)</p>
      </div>
      <RouterLink to="/" class="text-xs text-emerald-400 hover:underline">
        ← Back to Store
      </RouterLink>
    </div>

    <div
      v-if="errorMessage"
      class="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs"
    >
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="space-y-4">
      <div
        v-for="n in 3"
        :key="n"
        class="h-32 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse"
      ></div>
    </div>

    <div
      v-else-if="orders.length === 0"
      class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3"
    >
      <p class="text-slate-300 font-semibold">You have no orders yet.</p>
      <RouterLink
        to="/"
        class="inline-block px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
      >
        Explore Products
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="order in orders"
        :key="order.id"
        class="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span class="text-xs font-mono text-slate-400">Order #{{ order.id.slice(0, 8) }}</span>
            <p class="text-xs text-slate-500">
              Placed on {{ new Date(order.createdAt).toLocaleString() }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <span
              class="px-2.5 py-1 rounded-full text-xs font-bold border"
              :class="statusBadgeClass(order.status)"
            >
              {{ order.status }}
            </span>
            <span class="text-base font-extrabold text-white">
              ฿{{ Number(order.totalAmount).toLocaleString() }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div class="space-y-1">
            <p class="text-slate-500 font-semibold uppercase">Shipping To</p>
            <p class="font-medium text-white">{{ order.recipientName }} ({{ order.recipientPhone }})</p>
            <p class="text-slate-400">{{ order.shippingAddress }}</p>
          </div>

          <div class="space-y-2">
            <p class="text-slate-500 font-semibold uppercase">Items</p>
            <div
              v-for="item in order.items"
              :key="item.id"
              class="flex items-center justify-between text-slate-300"
            >
              <span>{{ item.product?.name || 'Product' }} × {{ item.quantity }}</span>
              <span class="font-mono">฿{{ Number(item.unitPrice * item.quantity).toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

