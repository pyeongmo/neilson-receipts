<template>
  <div class="receipt-upload-card">
    <h2 class="receipt-upload-card__title">영수증 업로드</h2>

    <div v-if="!authStore.isLoggedIn && !authStore.loading" class="receipt-upload-card__message receipt-upload-card__message--warning">
      <p>⚠️ 영수증을 업로드하려면 먼저 로그인해야 합니다.</p>
      <button @click="authStore.loginWithGoogle()" :disabled="authStore.loading" class="action-button action-button--primary">
        Google 로그인
      </button>
    </div>
    <div v-else-if="authStore.loading" class="receipt-upload-card__message receipt-upload-card__message--info">
      <p>사용자 인증 상태 확인 중...</p>
    </div>

    <div v-else class="receipt-upload-card__content">
      <label for="receipt-input" class="file-input-button">
        <input
            type="file"
            id="receipt-input"
            accept="image/*"
            @change="handleFileChange"
            :disabled="expenseStore.uploading"
        />
        <span class="file-input-button__text">
          <i class="fas fa-camera file-input-button__icon"></i> 사진 촬영 또는 파일 선택
        </span>
      </label>

      <div v-if="previewImage" class="image-preview-area">
        <h3 class="image-preview-area__title">미리보기:</h3>
        <img :src="previewImage" alt="영수증 미리보기" class="image-preview-area__image" />
      </div>

      <button
          @click="uploadSelectedFile"
          :disabled="!selectedFile || expenseStore.uploading"
          class="action-button action-button--success"
      >
        <span v-if="!expenseStore.uploading">업로드</span>
        <span v-else>업로드 중 ({{ Math.floor(expenseStore.uploadProgress) }}%)</span>
      </button>

      <div v-if="expenseStore.uploading" class="progress-bar-container">
        <div class="progress-bar-container__bar" :style="{ width: expenseStore.uploadProgress + '%' }"></div>
      </div>

      <p v-if="expenseStore.uploadSuccessMessage" class="receipt-upload-card__message receipt-upload-card__message--success">
        ✅ {{ expenseStore.uploadSuccessMessage }}
      </p>
      <p v-if="expenseStore.uploadError" class="receipt-upload-card__message receipt-upload-card__message--error">
        ❌ {{ expenseStore.uploadError }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useExpenseStore } from '../stores/expenseStore';

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const selectedFile = ref<File | null>(null);
const previewImage = ref<string | null>(null);

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
</script>

<style scoped>
/* Receipt Upload Card Container */
.receipt-upload-card {
  max-width: 500px; /* 데스크톱 기본 최대 너비 */
  margin: 40px auto;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
  box-sizing: border-box; /* 패딩이 너비에 포함되도록 설정 */
}

.receipt-upload-card__title {
  color: #333;
  margin-bottom: 25px;
  font-size: 1.8em;
  font-weight: 600;
}

/* 메시지 스타일 (경고, 정보, 성공, 오류) */
.receipt-upload-card__message {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.95em;
  line-height: 1.4;
}

.receipt-upload-card__message p {
  margin: 0;
}

.receipt-upload-card__message--warning {
  background-color: #fff3cd; /* Yellow light */
  border: 1px solid #ffeeba;
  color: #856404;
}

.receipt-upload-card__message--info {
  background-color: #d1ecf1; /* Cyan light */
  border: 1px solid #bee5eb;
  color: #0c5460;
  font-style: italic;
}

.receipt-upload-card__message--success {
  background-color: #d4edda; /* Green light */
  border: 1px solid #c3e6cb;
  color: #155724;
  font-weight: bold;
}

.receipt-upload-card__message--error {
  background-color: #f8d7da; /* Red light */
  border: 1px solid #f5c6cb;
  color: #721c24;
  font-weight: bold;
}

/* Upload Content Section */
.receipt-upload-card__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

/* File Input Button */
.file-input-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 15px 25px;
  background-color: #42b983; /* Vue green */
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: bold;
  transition: background-color 0.3s ease, transform 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
}

.file-input-button:hover {
  background-color: #368a67;
  transform: translateY(-2px);
}

.file-input-button input[type="file"] {
  display: none;
}

.file-input-button__icon {
  margin-right: 10px;
  font-size: 1.2em;
}

/* Image Preview Area */
.image-preview-area {
  margin-top: 10px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
  background-color: #f9f9f9;
}

.image-preview-area__title {
  font-size: 1em;
  color: #555;
  margin-top: 0;
  margin-bottom: 10px;
}

.image-preview-area__image {
  max-width: 100%;
  height: auto;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: block;
  margin: 0 auto;
}

/* Action Button (general) */
.action-button {
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: bold;
  transition: background-color 0.3s ease, transform 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
}

.action-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

/* Specific Action Buttons */
.action-button--primary { /* Google 로그인 버튼 (App.vue와 통일) */
  background-color: #1a73e8;
  color: white;
}
.action-button--primary:hover:not(:disabled) {
  background-color: #155bb3;
}

.action-button--success { /* 업로드 버튼 */
  background-color: #007bff; /* Blue for action */
  color: white;
}
.action-button--success:hover:not(:disabled) {
  background-color: #0056b3;
}


/* Progress Bar */
.progress-bar-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 5px;
  height: 10px;
  overflow: hidden;
  margin-top: 10px;
}

.progress-bar-container__bar {
  height: 100%;
  background-color: #42b983; /* Vue green */
  width: 0%;
  border-radius: 5px;
  transition: width 0.3s ease-in-out;
}

/* Media Queries for responsiveness */
@media (max-width: 1000px) {
  /* App.vue의 main-content-wrapper가 flex-direction: column이 될 때 */
  .receipt-upload-card {
    max-width: 95%; /* 모바일에서 너비를 늘림, 필요시 100% */
    width: auto; /* 또는 width: 100%; padding: 0 15px; 로 조정 가능 */
    margin: 20px auto; /* 상하 여백 조절 */
    padding: 20px; /* 패딩 조절 */
  }
}

@media (max-width: 600px) { /* 더 작은 모바일 화면을 위한 추가 조정 */
  .receipt-upload-card {
    padding: 15px;
    margin: 15px auto;
  }
  .receipt-upload-card__title {
    font-size: 1.5em;
    margin-bottom: 20px;
  }
  .file-input-button,
  .action-button {
    padding: 12px 20px;
    font-size: 1em;
  }
}
</style>
