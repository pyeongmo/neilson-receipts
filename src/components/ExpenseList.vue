<template>
  <div class="max-w-3xl mx-auto my-10 p-0 box-border">
    <p v-if="authStore.loading || expenseStore.loading" class="text-center text-gray-600">데이터 로드 중...</p>
    <p v-else-if="!authStore.isLoggedIn" class="text-center text-primary p-5 bg-primary/5 border border-primary/20 rounded-lg mb-5">로그인해야 지출 내역을 볼 수 있습니다.</p>
    <p v-else-if="expenseStore.error" class="text-center text-red-600 p-5 bg-red-50 border border-red-100 rounded-lg mb-5">{{ expenseStore.error }}</p>

    <div v-else-if="expenseStore.expenses.length > 0">
      <ul class="p-0 m-0">
        <ExpenseItem
            v-for="expense in expenseStore.expenses"
            :key="expense.id"
            :expense="expense"
        />
      </ul>
    </div>
    <p v-else class="text-center text-gray-600 mt-10">아직 등록된 지출 내역이 없습니다.</p>

    <!-- 무한 스크롤 감지용 요소 (로그인 상태이고 에러가 없을 때만 표시) -->
    <div v-if="authStore.isLoggedIn && !expenseStore.error && !expenseStore.loading" ref="loadMoreTrigger" class="h-10 flex items-center justify-center mt-4">
      <p v-if="expenseStore.isFetchingMore" class="text-gray-500">더 많은 내역을 불러오는 중...</p>
      <p v-else-if="!expenseStore.hasMore && expenseStore.expenses.length > 0" class="text-gray-400 text-sm">모든 내역을 불러왔습니다.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useExpenseStore } from '../stores/expenseStore';
import ExpenseItem from './ExpenseItem.vue'; // ExpenseItem 컴포넌트 임포트

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const loadMoreTrigger = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      expenseStore.fetchMoreExpenses();
    }
  }, {
    threshold: 1.0,
    rootMargin: '100px' // 하단에 도달하기 전 미리 로드
  });
});

// loadMoreTrigger 요소가 생성될 때마다 observe 실행
watch(loadMoreTrigger, (newEl) => {
  if (newEl && observer) {
    observer.observe(newEl);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

watch(() => authStore.user, (newUser) => {
  if (newUser) {
    expenseStore.fetchExpenses();
  } else {
    expenseStore.stopFetchingExpenses();
  }
}, { immediate: true });
</script>
