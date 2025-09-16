<template>
  <div id="app-root" class="flex flex-col min-h-screen bg-gray-100 text-gray-800 font-sans">
    <header
        :class="[
        'p-5 md:px-8 mb-5 bg-white shadow-md border-b border-gray-200 flex items-center justify-between flex-wrap gap-4',
        {
          'text-blue-600 font-bold': authStore.loading,
          'bg-green-50 text-green-700': authStore.isLoggedIn && !authStore.loading,
          'bg-gray-50 text-gray-600': !authStore.isLoggedIn && !authStore.loading
        }
      ]"
    >
      <div v-if="authStore.loading" class="text-lg">인증 상태 확인 중...</div>
      <div v-else-if="authStore.isLoggedIn" class="flex items-center justify-between w-full flex-wrap gap-4">
        <p class="text-lg font-medium flex-grow">환영합니다, <strong class="text-blue-700">{{ authStore.currentUserEmail?.split('@')[0] }}</strong>님!</p>
        <div class="flex items-center gap-3">
          <button
              @click="openSummaryModal"
              class="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-colors duration-200"
          >
            미처리 현황
          </button>
          <button
              @click="handleLogout"
              class="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-colors duration-200"
          >
            로그아웃
          </button>
        </div>
      </div>
      <div v-else class="flex flex-col items-start gap-4 w-full">
        <p class="text-lg font-medium">로그인이 필요합니다.</p>
        <button @click="handleLogin" class="px-5 py-2 bg-blue-600 text-white rounded-lg text-base font-bold cursor-pointer transition duration-300 ease-in-out whitespace-nowrap hover:bg-blue-700 hover:translate-y-px shadow-md">
          Google 계정으로 로그인
        </button>
        <p v-if="authStore.error" class="text-red-600 font-bold mt-2 w-full text-center">{{ authStore.error }}</p>
      </div>
    </header>

    <main v-if="authStore.isLoggedIn" class="flex flex-col lg:flex-row items-start w-full gap-5 px-5 md:px-8 flex-grow">
      <ReceiptUploader class="flex-grow w-full lg:w-auto" />
      <ExpenseList class="flex-grow w-full lg:w-auto" />
    </main>
    <SummaryModal v-if="summaryModalOpen" :summary-data="summaryData" @close="closeSummaryModal" />
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from './stores/authStore';
import { useExpenseStore } from './stores/expenseStore';
import ExpenseList from "./components/ExpenseList.vue";
import ReceiptUploader from "./components/ReceiptUploader.vue";
import SummaryModal from "./components/SummaryModal.vue";

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const summaryModalOpen = ref(false);
const summaryData = ref<Record<string, number>>({}); // 요약 데이터를 저장할 ref

const openSummaryModal = async () => {
  summaryData.value = await expenseStore.getUnprocessedSummary();
  summaryModalOpen.value = true;
};

const closeSummaryModal = () => {
  summaryModalOpen.value = false;
};

let savedWindowScrollPosition: number = 0;
let unsubscribeFromExpenseActions: (() => void) | null = null;

const saveWindowScrollPosition = () => {
  savedWindowScrollPosition = window.scrollY;
  console.log('App.vue: Window scroll position saved:', savedWindowScrollPosition);
};

const restoreWindowScrollPosition = () => {
  if (savedWindowScrollPosition > 0) {
    nextTick(() => {
      window.scrollTo(0, savedWindowScrollPosition);
      console.log('App.vue: Window scroll position restored to:', savedWindowScrollPosition);
      savedWindowScrollPosition = 0;
    });
  }
};

const handleLogin = async () => {
  saveWindowScrollPosition();
  await authStore.loginWithGoogle();
};

const handleLogout = async () => {
  saveWindowScrollPosition();
  await authStore.logout();
};

watch(() => authStore.loading, (newLoading) => {
  if (!newLoading) {
    restoreWindowScrollPosition();
  }
});

watch(() => expenseStore.loading, (newLoading) => {
  if (!newLoading) {
    restoreWindowScrollPosition();
  }
}, { immediate: true });

onMounted(() => {
  // One Tap 초기화: 현재 비로그인 상태에서 자동 프롬프트 시도
  authStore.initializeGoogleOneTap();

  unsubscribeFromExpenseActions = expenseStore.$onAction(({ name, after, onError }) => {
    if (['toggleExpenseProcessedStatus', 'deleteExpense', 'updateExpenseField'].includes(name)) {
      saveWindowScrollPosition();
    }
    after(() => {
      // restore logic is handled by watch(expenseStore.loading)
    });
    onError((error) => {
      console.error(`Error during action "${name}":`, error);
    });
  }, true);
});

onUnmounted(() => {
  if (unsubscribeFromExpenseActions) {
    unsubscribeFromExpenseActions();
  }
});
</script>
