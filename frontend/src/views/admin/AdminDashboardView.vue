<script setup>
import { ref, reactive, onMounted } from 'vue';
import api, { getSafeErrorMessage } from '../../services/api';

const activeTab = ref('overview'); // 'overview' | 'products' | 'orders'
const loading = ref(true);
const feedbackMessage = ref('');
const errorMessage = ref('');

const metrics = ref({
  totalRevenue: 0,
  totalOrders: 0,
  totalProducts: 0,
  totalCustomers: 0,
});

const orders = ref([]);
const products = ref([]);
const categories = ref([]);

// Product Modal / Form State
const showProductModal = ref(false);
const editingProductId = ref(null);
const savingProduct = ref(false);

const productForm = reactive({
  name: '',
  description: '',
  price: 1000,
  stock: 10,
  imageUrl: '',
  categoryId: '',
});

async function loadDashboardData() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [ordersRes, productsRes, categoriesRes] = await Promise.all([
      api.get('/orders/admin/all'),
      api.get('/products'),
      api.get('/products/categories'),
    ]);

    metrics.value = ordersRes.data.data.metrics;
    orders.value = ordersRes.data.data.orders;
    products.value = productsRes.data.data.products;
    categories.value = categoriesRes.data.data.categories;
  } catch (err) {
    errorMessage.value = getSafeErrorMessage(err, 'Failed to load admin dashboard data.');
  } finally {
    loading.value = false;
  }
}

function openCreateProduct() {
  editingProductId.value = null;
  productForm.name = '';
  productForm.description = '';
  productForm.price = 1500;
  productForm.stock = 20;
  productForm.imageUrl = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80';
  productForm.categoryId = categories.value[0]?.id || '';
  showProductModal.value = true;
}

function openEditProduct(product) {
  editingProductId.value = product.id;
  productForm.name = product.name;
  productForm.description = product.description;
  productForm.price = product.price;
  productForm.stock = product.stock;
  productForm.imageUrl = product.imageUrl;
  productForm.categoryId = product.categoryId;
  showProductModal.value = true;
}

async function handleSaveProduct() {
  savingProduct.value = true;
  errorMessage.value = '';
  feedbackMessage.value = '';

  try {
    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      imageUrl: productForm.imageUrl.trim(),
      categoryId: productForm.categoryId,
    };

    if (editingProductId.value) {
      await api.put(`/products/${editingProductId.value}`, payload);
      feedbackMessage.value = 'Product updated successfully.';
    } else {
      await api.post('/products', payload);
      feedbackMessage.value = 'New product created successfully.';
    }

    showProductModal.value = false;
    await loadDashboardData();
  } catch (err) {
    errorMessage.value = getSafeErrorMessage(err, 'Could not save product.');
  } finally {
    savingProduct.value = false;
  }
}

async function handleDeleteProduct(product) {
  if (!window.confirm(`Delete "${product.name}" permanently?`)) return;
  errorMessage.value = '';
  feedbackMessage.value = '';
  try {
    await api.delete(`/products/${product.id}`);
    feedbackMessage.value = 'Product deleted.';
    await loadDashboardData();
  } catch (err) {
    errorMessage.value = getSafeErrorMessage(err, 'Failed to delete product.');
  }
}

async function handleOrderStatusChange(orderId, newStatus) {
  errorMessage.value = '';
  feedbackMessage.value = '';
  try {
    await api.patch(`/orders/admin/${orderId}/status`, { status: newStatus });
    feedbackMessage.value = `Order #${orderId.slice(0, 8)} status updated to ${newStatus}.`;
    await loadDashboardData();
  } catch (err) {
    errorMessage.value = getSafeErrorMessage(err, 'Failed to update order status.');
  }
}

onMounted(loadDashboardData);
</script>

<template>
  <div class="space-y-8">
    <!-- Header & Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
      <div>
        <span class="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
          RBAC Protected Admin Area
        </span>
        <h1 class="text-2xl font-bold text-white mt-1">Admin Security &amp; Store Console</h1>
      </div>

      <div class="flex gap-2">
        <button
          @click="activeTab = 'overview'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="activeTab === 'overview' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
        >
          Overview
        </button>
        <button
          @click="activeTab = 'products'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="activeTab === 'products' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
        >
          Products ({{ products.length }})
        </button>
        <button
          @click="activeTab = 'orders'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="activeTab === 'orders' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
        >
          Orders ({{ orders.length }})
        </button>
      </div>
    </div>

    <!-- Notifications -->
    <div
      v-if="feedbackMessage"
      class="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex justify-between"
    >
      <span>{{ feedbackMessage }}</span>
      <button @click="feedbackMessage = ''" class="underline">Close</button>
    </div>

    <div
      v-if="errorMessage"
      class="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex justify-between"
    >
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="underline">Close</button>
    </div>

    <!-- KPI Summary Cards -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
        <span class="text-xs text-slate-400">Total Revenue (Excl. Cancelled)</span>
        <p class="text-2xl font-extrabold text-emerald-400 mt-1">
          ฿{{ Number(metrics.totalRevenue).toLocaleString() }}
        </p>
      </div>
      <div class="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
        <span class="text-xs text-slate-400">Total Orders</span>
        <p class="text-2xl font-extrabold text-white mt-1">{{ metrics.totalOrders }}</p>
      </div>
      <div class="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
        <span class="text-xs text-slate-400">Active Products</span>
        <p class="text-2xl font-extrabold text-white mt-1">{{ metrics.totalProducts }}</p>
      </div>
      <div class="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
        <span class="text-xs text-slate-400">Registered Customers</span>
        <p class="text-2xl font-extrabold text-white mt-1">{{ metrics.totalCustomers }}</p>
      </div>
    </section>

    <!-- TAB 1: Overview + Quick Actions -->
    <section v-if="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Orders -->
      <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-white text-sm">Latest Orders</h2>
          <button @click="activeTab = 'orders'" class="text-xs text-emerald-400 hover:underline">
            Manage All →
          </button>
        </div>
        <div v-if="orders.length === 0" class="text-xs text-slate-500 py-6 text-center">
          No customer orders recorded yet.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="order in orders.slice(0, 5)"
            :key="order.id"
            class="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs"
          >
            <div>
              <p class="font-semibold text-slate-200">{{ order.recipientName }}</p>
              <p class="text-slate-500 font-mono">#{{ order.id.slice(0, 8) }}</p>
            </div>
            <div class="text-right">
              <p class="font-bold text-emerald-400">฿{{ Number(order.totalAmount).toLocaleString() }}</p>
              <span class="text-[10px] uppercase text-slate-400">{{ order.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Low Stock Inventory Alert -->
      <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-white text-sm">Inventory Health</h2>
          <button @click="openCreateProduct" class="px-3 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-bold">
            + Add Product
          </button>
        </div>
        <div class="space-y-2.5">
          <div
            v-for="prod in products.slice(0, 5)"
            :key="prod.id"
            class="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs"
          >
            <span class="text-slate-200 truncate max-w-[220px]">{{ prod.name }}</span>
            <span
              class="px-2 py-0.5 rounded font-semibold"
              :class="prod.stock <= 5 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'"
            >
              Stock: {{ prod.stock }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 2: Products CRUD Management -->
    <section v-if="activeTab === 'products'" class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-bold text-white">Product Catalog Management</h2>
        <button
          @click="openCreateProduct"
          class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
        >
          + Create New Product
        </button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
            <tr>
              <th class="p-3.5">Product</th>
              <th class="p-3.5">Category</th>
              <th class="p-3.5">Price</th>
              <th class="p-3.5">Stock</th>
              <th class="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-for="prod in products" :key="prod.id" class="hover:bg-slate-900">
              <td class="p-3.5 font-semibold text-white max-w-xs truncate">{{ prod.name }}</td>
              <td class="p-3.5">{{ prod.category?.name }}</td>
              <td class="p-3.5 font-mono text-emerald-400">฿{{ Number(prod.price).toLocaleString() }}</td>
              <td class="p-3.5">{{ prod.stock }}</td>
              <td class="p-3.5 text-right space-x-2">
                <button
                  @click="openEditProduct(prod)"
                  class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Edit
                </button>
                <button
                  @click="handleDeleteProduct(prod)"
                  class="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 3: Order Status Management -->
    <section v-if="activeTab === 'orders'" class="space-y-4">
      <h2 class="text-lg font-bold text-white">Customer Orders &amp; Fulfillment</h2>

      <div v-if="orders.length === 0" class="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400">
        No orders have been placed yet.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="order in orders"
          :key="order.id"
          class="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div class="space-y-1 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-mono text-emerald-400 font-bold">#{{ order.id.slice(0, 8) }}</span>
              <span class="text-slate-400">• {{ new Date(order.createdAt).toLocaleString() }}</span>
            </div>
            <p class="text-sm font-bold text-white">
              {{ order.recipientName }} ({{ order.recipientPhone }}) — {{ order.user?.email }}
            </p>
            <p class="text-slate-400">{{ order.shippingAddress }}</p>
            <div class="pt-1 flex flex-wrap gap-2">
              <span
                v-for="item in order.items"
                :key="item.id"
                class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
              >
                {{ item.product?.name }} × {{ item.quantity }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-4 self-end lg:self-center">
            <div class="text-right">
              <span class="text-xs text-slate-500 block">Total</span>
              <span class="text-base font-extrabold text-white">
                ฿{{ Number(order.totalAmount).toLocaleString() }}
              </span>
            </div>

            <div>
              <label class="block text-[10px] uppercase text-slate-400 mb-1">Order Status</label>
              <select
                :value="order.status"
                @change="handleOrderStatusChange(order.id, $event.target.value)"
                class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-emerald-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Product Create / Edit Modal -->
    <div
      v-if="showProductModal"
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-bold text-white text-base">
            {{ editingProductId ? 'Edit Product' : 'Create New Product' }}
          </h3>
          <button @click="showProductModal = false" class="text-xs text-slate-400 hover:text-white">
            ✕ Close
          </button>
        </div>

        <form @submit.prevent="handleSaveProduct" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-300 mb-1">Product Name *</label>
            <input
              v-model="productForm.name"
              type="text"
              required
              minlength="3"
              maxlength="140"
              class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-300 mb-1">Price (THB) *</label>
              <input
                v-model.number="productForm.price"
                type="number"
                step="0.01"
                min="1"
                required
                class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-300 mb-1">Stock Quantity *</label>
              <input
                v-model.number="productForm.stock"
                type="number"
                min="0"
                required
                class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">Category *</label>
            <select
              v-model="productForm.categoryId"
              required
              class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
            >
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">Image URL (HTTPS) *</label>
            <input
              v-model="productForm.imageUrl"
              type="url"
              required
              class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">Description *</label>
            <textarea
              v-model="productForm.description"
              rows="3"
              required
              minlength="10"
              maxlength="2000"
              class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showProductModal = false"
              class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="savingProduct"
              class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              {{ savingProduct ? 'Saving...' : 'Save Product' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

