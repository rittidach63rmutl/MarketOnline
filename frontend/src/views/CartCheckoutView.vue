<script setup>
import { reactive, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import api, { getSafeErrorMessage } from '../services/api';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();

const submitting = ref(false);
const serverError = ref('');
const orderSuccess = ref(null);

const form = reactive({
  recipientName: authStore.user?.name || '',
  recipientPhone: '',
  shippingAddress: '',
});

const touched = reactive({
  recipientName: false,
  recipientPhone: false,
  shippingAddress: false,
});

// Real-time Field Validation Rules
const fieldErrors = computed(() => {
  const errors = {};
  const name = form.recipientName.trim();
  const phone = form.recipientPhone.trim();
  const address = form.shippingAddress.trim();

  if (name.length < 2 || name.length > 100) {
    errors.recipientName = 'Recipient name must be between 2 and 100 characters.';
  }
  if (!/^[0-9+\-\s()]{8,20}$/.test(phone)) {
    errors.recipientPhone = 'Enter a valid phone number (8-20 digits).';
  }
  if (address.length < 10 || address.length > 500) {
    errors.shippingAddress = 'Shipping address must be between 10 and 500 characters.';
  }
  return errors;
});

const isFormValid = computed(() => {
  return (
    cartStore.items.length > 0 &&
    Object.keys(fieldErrors.value).length === 0
  );
});

async function handlePlaceOrder() {
  touched.recipientName = true;
  touched.recipientPhone = true;
  touched.shippingAddress = true;

  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: '/cart' } });
    return;
  }

  if (!isFormValid.value) return;

  submitting.value = true;
  serverError.value = '';

  try {
    const payload = {
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim(),
      shippingAddress: form.shippingAddress.trim(),
      items: cartStore.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    const { data } = await api.post('/orders', payload);
    orderSuccess.value = data.data.order;
    cartStore.clearCart();
  } catch (err) {
    serverError.value = getSafeErrorMessage(err, 'Failed to process order.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div>
        <h1 class="text-2xl font-bold text-white">Shopping Cart &amp; Checkout</h1>
        <p class="text-xs text-slate-400">
          Prices are verified server-side inside an atomic database transaction to prevent tampering.
        </p>
      </div>
      <RouterLink to="/" class="text-xs text-emerald-400 hover:underline">
        ← Continue Shopping
      </RouterLink>
    </div>

    <!-- Order Confirmation Receipt -->
    <div
      v-if="orderSuccess"
      class="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-4"
    >
      <div class="flex items-center justify-between">
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-slate-950">
          ✓ Order Confirmed
        </span>
        <span class="text-xs font-mono text-slate-400">Order ID: {{ orderSuccess.id }}</span>
      </div>
      <h2 class="text-xl font-bold text-white">Thank you, {{ orderSuccess.recipientName }}!</h2>
      <p class="text-sm text-slate-300">
        Your order has been verified and recorded. Total charged:
        <strong class="text-emerald-400">฿{{ Number(orderSuccess.totalAmount).toLocaleString() }}</strong>
      </p>
      <div class="pt-2 flex gap-3">
        <RouterLink
          to="/orders"
          class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
        >
          View My Orders
        </RouterLink>
        <RouterLink
          to="/"
          class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          Back to Catalog
        </RouterLink>
      </div>
    </div>

    <!-- Empty Cart -->
    <div
      v-else-if="cartStore.items.length === 0"
      class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4"
    >
      <p class="text-lg font-semibold text-slate-300">Your shopping cart is empty</p>
      <p class="text-xs text-slate-500">Add security hardware from our storefront catalog to begin checkout.</p>
      <RouterLink
        to="/"
        class="inline-block px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
      >
        Browse Products
      </RouterLink>
    </div>

    <!-- Cart Items + Real-time Validated Checkout Form -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left 2 Columns: Cart Items -->
      <div class="lg:col-span-2 space-y-4">
        <div
          v-for="item in cartStore.items"
          :key="item.productId"
          class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-4">
            <img
              :src="item.imageUrl"
              :alt="item.name"
              class="w-16 h-16 rounded-lg object-cover bg-slate-950 border border-slate-800"
            />
            <div>
              <h3 class="font-semibold text-slate-100 text-sm">{{ item.name }}</h3>
              <p class="text-xs text-slate-400">Unit Price: ฿{{ Number(item.price).toLocaleString() }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4 self-end sm:self-center">
            <div class="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
              <button
                type="button"
                @click="cartStore.updateQuantity(item.productId, item.quantity - 1)"
                class="px-2.5 py-1 text-slate-300 hover:bg-slate-800 text-sm"
              >
                -
              </button>
              <span class="px-3 py-1 text-xs font-bold text-white">{{ item.quantity }}</span>
              <button
                type="button"
                @click="cartStore.updateQuantity(item.productId, item.quantity + 1)"
                :disabled="item.quantity >= item.stock"
                class="px-2.5 py-1 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-sm"
              >
                +
              </button>
            </div>

            <div class="text-right min-w-[90px]">
              <span class="font-bold text-sm text-emerald-400">
                ฿{{ Number(item.price * item.quantity).toLocaleString() }}
              </span>
            </div>

            <button
              type="button"
              @click="cartStore.removeFromCart(item.productId)"
              class="text-xs text-rose-400 hover:text-rose-300"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column: Checkout Form with Real-Time Validation -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 h-fit">
        <h2 class="text-lg font-bold text-white border-b border-slate-800 pb-3">
          Shipping &amp; Verification
        </h2>

        <div
          v-if="!authStore.isAuthenticated"
          class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2"
        >
          <p class="font-semibold">Authentication Required to Place Order</p>
          <p>Please sign in or register a customer account before submitting your order.</p>
          <RouterLink
            :to="{ name: 'login', query: { redirect: '/cart' } }"
            class="inline-block mt-1 px-3 py-1.5 rounded bg-amber-400 text-slate-950 font-bold"
          >
            Sign In Now
          </RouterLink>
        </div>

        <div
          v-if="serverError"
          class="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs"
        >
          {{ serverError }}
        </div>

        <form @submit.prevent="handlePlaceOrder" class="space-y-4" novalidate>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">
              Recipient Full Name *
            </label>
            <input
              v-model="form.recipientName"
              @blur="touched.recipientName = true"
              type="text"
              maxlength="100"
              placeholder="e.g. Somchai Security"
              class="w-full rounded-lg bg-slate-950 border px-3 py-2 text-sm text-white outline-none transition-colors"
              :class="
                touched.recipientName && fieldErrors.recipientName
                  ? 'border-rose-500'
                  : 'border-slate-700 focus:border-emerald-500'
              "
            />
            <p
              v-if="touched.recipientName && fieldErrors.recipientName"
              class="text-[11px] text-rose-400 mt-1"
            >
              {{ fieldErrors.recipientName }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">
              Contact Phone Number *
            </label>
            <input
              v-model="form.recipientPhone"
              @blur="touched.recipientPhone = true"
              type="tel"
              maxlength="20"
              placeholder="e.g. 081-234-5678"
              class="w-full rounded-lg bg-slate-950 border px-3 py-2 text-sm text-white outline-none transition-colors"
              :class="
                touched.recipientPhone && fieldErrors.recipientPhone
                  ? 'border-rose-500'
                  : 'border-slate-700 focus:border-emerald-500'
              "
            />
            <p
              v-if="touched.recipientPhone && fieldErrors.recipientPhone"
              class="text-[11px] text-rose-400 mt-1"
            >
              {{ fieldErrors.recipientPhone }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">
              Full Shipping Address *
            </label>
            <textarea
              v-model="form.shippingAddress"
              @blur="touched.shippingAddress = true"
              rows="3"
              maxlength="500"
              placeholder="Building, Street, Subdistrict, District, Province, Postal Code"
              class="w-full rounded-lg bg-slate-950 border px-3 py-2 text-sm text-white outline-none transition-colors"
              :class="
                touched.shippingAddress && fieldErrors.shippingAddress
                  ? 'border-rose-500'
                  : 'border-slate-700 focus:border-emerald-500'
              "
            ></textarea>
            <p
              v-if="touched.shippingAddress && fieldErrors.shippingAddress"
              class="text-[11px] text-rose-400 mt-1"
            >
              {{ fieldErrors.shippingAddress }}
            </p>
          </div>

          <div class="border-t border-slate-800 pt-4 space-y-2 text-sm">
            <div class="flex justify-between text-slate-400">
              <span>Total Items</span>
              <span>{{ cartStore.totalItems }}</span>
            </div>
            <div class="flex justify-between text-base font-extrabold text-white">
              <span>Estimated Total</span>
              <span class="text-emerald-400">฿{{ Number(cartStore.totalPrice).toLocaleString() }}</span>
            </div>
          </div>

          <button
            type="submit"
            :disabled="submitting || !isFormValid"
            class="w-full py-2.5 rounded-lg font-bold text-sm transition-all"
            :class="
              submitting || !isFormValid
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            "
          >
            {{ submitting ? 'Verifying & Placing Order...' : 'Confirm Secure Order' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

