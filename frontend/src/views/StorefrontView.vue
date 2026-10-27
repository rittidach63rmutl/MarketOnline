<script setup>
import { ref, onMounted, watch } from 'vue';
import api, { getSafeErrorMessage } from '../services/api';
import { useCartStore } from '../stores/cart';

const cartStore = useCartStore();

const products = ref([]);
const categories = ref([]);
const selectedCategory = ref('ALL');
const searchQuery = ref('');
const loading = ref(true);
const errorMessage = ref('');
const addedFeedbackId = ref(null);

async function fetchCategories() {
  try {
    const { data } = await api.get('/products/categories');
    categories.value = data.data.categories;
  } catch (_) {
    // Non-blocking category load failure
  }
}

async function fetchProducts() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const params = {};
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim();
    }
    if (selectedCategory.value !== 'ALL') {
      params.category = selectedCategory.value;
    }
    const { data } = await api.get('/products', { params });
    products.value = data.data.products;
  } catch (err) {
    errorMessage.value = getSafeErrorMessage(err, 'Could not load products.');
  } finally {
    loading.value = false;
  }
}

function handleAddToCart(product) {
  const ok = cartStore.addToCart(product, 1);
  if (ok) {
    addedFeedbackId.value = product.id;
    setTimeout(() => {
      if (addedFeedbackId.value === product.id) {
        addedFeedbackId.value = null;
      }
    }, 1200);
  }
}

let searchDebounce = null;
watch(searchQuery, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    fetchProducts();
  }, 300);
});

watch(selectedCategory, () => {
  fetchProducts();
});

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchProducts()]);
});
</script>

<template>
  <div class="space-y-8">
    <!-- Hero Banner -->
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 p-6 sm:p-10">
      <div class="max-w-2xl space-y-3">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Hardware-Grade Security Catalog
        </span>
        <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
          Zero-Trust Hardware &amp; Privacy Gear
        </h1>
        <p class="text-slate-400 text-sm sm:text-base">
          Every transaction is protected by parameterized queries, strict input sanitization, and HttpOnly token rotation.
        </p>
      </div>
    </section>

    <!-- Search & Category Filter Bar -->
    <section class="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
      <div class="flex flex-wrap gap-2">
        <button
          @click="selectedCategory = 'ALL'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="selectedCategory === 'ALL'
            ? 'bg-emerald-500 text-slate-950'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
        >
          All Categories
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.slug"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="selectedCategory === cat.slug
            ? 'bg-emerald-500 text-slate-950'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
        >
          {{ cat.name }}
        </button>
      </div>

      <div class="relative w-full md:w-72">
        <input
          v-model="searchQuery"
          type="search"
          maxlength="100"
          placeholder="Search hardware, FIDO2, SSD..."
          class="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
        />
      </div>
    </section>

    <!-- Error State -->
    <div
      v-if="errorMessage"
      class="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between"
    >
      <span>{{ errorMessage }}</span>
      <button @click="fetchProducts" class="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold">
        Retry
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="n in 8"
        :key="n"
        class="h-80 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse p-4 flex flex-col justify-between"
      >
        <div class="h-40 bg-slate-800 rounded-lg"></div>
        <div class="space-y-2">
          <div class="h-4 bg-slate-800 rounded w-3/4"></div>
          <div class="h-3 bg-slate-800 rounded w-full"></div>
          <div class="h-8 bg-slate-800 rounded w-1/2 mt-2"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="products.length === 0"
      class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3"
    >
      <p class="text-slate-300 font-semibold text-lg">No matching security products found</p>
      <p class="text-slate-500 text-sm">Try clearing your search filter or selecting another category.</p>
      <button
        @click="searchQuery = ''; selectedCategory = 'ALL'"
        class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold"
      >
        Reset Filters
      </button>
    </div>

    <!-- Product Grid (Strictly using {{ }} interpolation — never v-html to prevent XSS) -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <article
        v-for="product in products"
        :key="product.id"
        class="group bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 rounded-xl overflow-hidden flex flex-col justify-between transition-all"
      >
        <div>
          <div class="relative h-48 bg-slate-950 overflow-hidden">
            <img
              :src="product.imageUrl"
              :alt="product.name"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <span
              v-if="product.category"
              class="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-950/85 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"
            >
              {{ product.category.name }}
            </span>
            <span
              class="absolute top-3 right-3 px-2 py-0.5 rounded text-[11px] font-semibold"
              :class="product.stock > 0 ? 'bg-slate-950/80 text-slate-300' : 'bg-rose-950/90 text-rose-300'"
            >
              {{ product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock' }}
            </span>
          </div>

          <div class="p-4 space-y-2">
            <h2 class="font-bold text-slate-100 text-sm line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {{ product.name }}
            </h2>
            <p class="text-xs text-slate-400 line-clamp-3 leading-relaxed">
              {{ product.description }}
            </p>
          </div>
        </div>

        <div class="p-4 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <span class="text-xs text-slate-500 block">Price</span>
            <span class="text-lg font-extrabold text-white">฿{{ Number(product.price).toLocaleString() }}</span>
          </div>

          <button
            @click="handleAddToCart(product)"
            :disabled="product.stock <= 0"
            class="px-3.5 py-2 rounded-lg text-xs font-bold transition-all"
            :class="
              product.stock <= 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : addedFeedbackId === product.id
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            "
          >
            {{
              product.stock <= 0
                ? 'Sold Out'
                : addedFeedbackId === product.id
                ? '✓ Added'
                : '+ Add to Cart'
            }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

