<template>
  <div class="max-w-md mx-auto my-5 md:my-10 p-5 md:p-8 rounded-lg bg-white text-center box-border border border-gray-100 shadow-sm">
    <h2 class="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">영수증 업로드</h2>

    <div v-if="!authStore.isLoggedIn && !authStore.loading" class="p-4 rounded-lg mb-5 text-yellow-800 bg-yellow-100 border border-yellow-300">
      <p class="text-base">⚠️ 영수증을 업로드하려면 먼저 로그인해야 합니다.</p>
      <button @click="authStore.loginWithGoogle()" :disabled="authStore.loading" class="mt-4 px-5 py-2 bg-primary text-white rounded-lg text-base font-bold cursor-pointer transition duration-300 ease-in-out whitespace-nowrap hover:bg-primary-dark hover:translate-y-px">
        Google 로그인
      </button>
    </div>
    <div v-else-if="authStore.loading" class="p-4 text-gray-600 italic">
      <p>사용자 인증 상태 확인 중...</p>
    </div>

    <div v-else class="flex flex-col gap-5 items-center">
      <!-- 숨김 input: 갤러리/파일 선택용 -->
      <input
          type="file"
          id="receipt-file-input"
          ref="filePickerInput"
          accept="image/*"
          @change="handleFileChange"
          :disabled="expenseStore.uploading"
          class="hidden"
      />
      <!-- 숨김 input: 카메라 촬영용 -->
      <input
          type="file"
          id="receipt-camera-input"
          ref="cameraInput"
          accept="image/*"
          capture="environment"
          @change="handleFileChange"
          :disabled="expenseStore.uploading"
          class="hidden"
      />

      <!-- 사진 촬영 / 파일 선택 -->
      <div class="flex gap-3 w-full">
        <button
            v-if="canTakePhoto"
            type="button"
            @click="takePhoto"
            :disabled="expenseStore.uploading"
            class="flex-1 inline-flex items-center justify-center p-3 md:p-5 bg-green-500 text-white rounded-lg text-base md:text-lg font-bold cursor-pointer transition duration-300 ease-in-out box-border hover:bg-green-600 hover:translate-y-[-2px] disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <i class="fas fa-camera mr-2 md:mr-3 text-lg md:text-xl"></i>
          사진 촬영
        </button>
        <button
            type="button"
            @click="pickFromGallery"
            :disabled="expenseStore.uploading"
            :class="[
            'flex-1 inline-flex items-center justify-center p-3 md:p-5 rounded-lg text-base md:text-lg font-bold cursor-pointer transition duration-300 ease-in-out box-border disabled:bg-gray-400 disabled:cursor-not-allowed',
            canTakePhoto
              ? 'bg-slate-600 text-white hover:bg-slate-700 hover:translate-y-[-2px]'
              : 'bg-primary text-white hover:bg-primary-dark hover:translate-y-[-2px]'
          ]"
        >
          <i class="fas fa-image mr-2 md:mr-3 text-lg md:text-xl"></i>
          파일 선택
        </button>
      </div>

      <div v-if="previewImage" class="mt-2 p-4 border border-gray-200 rounded-lg w-full box-border bg-gray-50">
        <h3 class="text-base text-gray-700 mb-2">미리보기:</h3>
        <img :src="previewImage" alt="영수증 미리보기" class="max-w-full h-auto rounded-md block mx-auto" />
      </div>

      <button
          @click="uploadSelectedFile"
          :disabled="!selectedFile || expenseStore.uploading"
          class="px-5 py-3 bg-primary text-white rounded-lg text-lg font-bold cursor-pointer transition duration-300 ease-in-out w-full box-border
                 disabled:bg-gray-400 disabled:cursor-not-allowed hover:enabled:bg-primary-dark hover:enabled:translate-y-[-2px]"
      >
        <span v-if="!expenseStore.uploading">업로드</span>
        <span v-else>업로드 중 ({{ Math.floor(expenseStore.uploadProgress) }}%)</span>
      </button>

      <div v-if="expenseStore.uploading" class="w-full bg-gray-200 rounded-md h-2.5 overflow-hidden mt-2">
        <div class="h-full bg-green-500 rounded-md transition-all duration-300 ease-in-out" :style="{ width: expenseStore.uploadProgress + '%' }"></div>
      </div>

      <p v-if="expenseStore.uploadSuccessMessage" class="p-4 rounded-lg mt-4 text-green-800 bg-green-100 border border-green-300 font-bold">
        ✅ {{ expenseStore.uploadSuccessMessage }}
      </p>
      <p v-if="expenseStore.uploadError" class="p-4 rounded-lg mt-4 text-red-800 bg-red-100 border border-red-300 font-bold">
        ❌ {{ expenseStore.uploadError }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import { useAuthStore } from '../stores/authStore';
import { useExpenseStore } from '../stores/expenseStore';

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const selectedFile = ref<File | null>(null);
const previewImage = ref<string | null>(null);

const canTakePhoto = ref(false);

const filePickerInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);

const pickFromGallery = () => {
  filePickerInput.value?.click();
};
const takePhoto = () => {
  cameraInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    selectedFile.value = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    expenseStore.uploadError = null;
    expenseStore.uploadSuccessMessage = null;
  } else {
    selectedFile.value = null;
    previewImage.value = null;
  }
};

const uploadSelectedFile = async () => {
  if (selectedFile.value && authStore.isLoggedIn) {
    await expenseStore.uploadReceipt(selectedFile.value);

    selectedFile.value = null;
    previewImage.value = null;
    const fileInput = document.getElementById('receipt-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  } else if (!authStore.isLoggedIn) {
    expenseStore.uploadError = '로그인해야 파일을 업로드할 수 있습니다.';
  } else {
    expenseStore.uploadError = '업로드할 파일을 선택해주세요.';
  }
};

// 장치 점검: videoinput 존재 여부 확인
async function hasCameraDevice(): Promise<boolean> {
  try {
    if (!('mediaDevices' in navigator)) return false;
    const md = navigator.mediaDevices as MediaDevices;
    if (!md.enumerateDevices) return false;
    const devices = await md.enumerateDevices();
    return devices.some(d => d.kind === 'videoinput');
  } catch {
    return false;
  }
}

// 모바일/태블릿 판별(데스크톱-터치 iPad 포함)
function isMobileLike(): boolean {
  const ua = navigator.userAgent || '';
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  const iPadOnDesktopUA = ua.includes('Mac') && 'ontouchend' in document;
  return mobileUA || iPadOnDesktopUA;
}

onMounted(async () => {
  const [mobile, cam] = await Promise.all([Promise.resolve(isMobileLike()), hasCameraDevice()]);
  canTakePhoto.value = mobile && cam;
});
</script>
