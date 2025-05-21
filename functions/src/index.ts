import * as admin from 'firebase-admin';

// Firebase Admin SDK 초기화 (애플리케이션당 한 번만 수행)
admin.initializeApp();

// 다른 파일에서 정의된 함수들을 임포트하여 내보냅니다.
export { processReceiptImage } from './receiptProcessing';
export { deleteReceiptImageOnExpenseDelete } from './expenseManagement';
