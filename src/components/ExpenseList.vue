<template>
  <div class="max-w-3xl mx-auto my-10 p-0 box-border">
    <p v-if="authStore.loading || expenseStore.loading" class="text-center text-gray-600">데이터 로드 중...</p>
    <p v-else-if="!authStore.isLoggedIn" class="text-center text-blue-600 p-5 bg-blue-50 rounded-lg mb-5">로그인해야 지출 내역을 볼 수 있습니다.</p>
    <p v-else-if="expenseStore.error" class="text-center text-red-600 p-5 bg-red-50 rounded-lg mb-5">{{ expenseStore.error }}</p>

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
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useExpenseStore } from '../stores/expenseStore';
import ExpenseItem from './ExpenseItem.vue'; // ExpenseItem 컴포넌트 임포트

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

watch(() => authStore.user, (newUser) => {
  if (newUser) {
    expenseStore.fetchExpenses();
  } else {
    expenseStore.stopFetchingExpenses();
  }
}, { immediate: true });
</script>
