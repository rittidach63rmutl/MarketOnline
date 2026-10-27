import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCartStore = defineStore('cart', () => {
  const items = ref([]);

  const totalItems = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  );

  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  function addToCart(product, quantity = 1) {
    if (!product || product.stock <= 0) return false;
    const existing = items.value.find((i) => i.productId === product.id);
    if (existing) {
      const nextQty = Math.min(existing.quantity + quantity, product.stock);
      existing.quantity = nextQty;
      existing.stock = product.stock;
      existing.price = product.price;
    } else {
      items.value.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        quantity: Math.min(quantity, product.stock),
      });
    }
    return true;
  }

  function updateQuantity(productId, quantity) {
    const item = items.value.find((i) => i.productId === productId);
    if (!item) return;
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      item.quantity = Math.min(quantity, item.stock);
    }
  }

  function removeFromCart(productId) {
    items.value = items.value.filter((i) => i.productId !== productId);
  }

  function clearCart() {
    items.value = [];
  }

  return {
    items,
    totalItems,
    totalPrice,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
});

