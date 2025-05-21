import * as admin from 'firebase-admin';

// Firestore에 저장될 때의 Expense 인터페이스 (Cloud Functions용)
export interface ExpenseToSave {
    userId: string;
    uploaderEmail?: string;
    amount: number;
    date: admin.firestore.Timestamp | admin.firestore.FieldValue; // FieldValue를 허용
    merchant: string;
    category: string;
    description: string;
    originalImageUrl: string;
    isProcessed: boolean;
    createdAt: admin.firestore.Timestamp | admin.firestore.FieldValue; // FieldValue를 허용
    updatedAt: admin.firestore.Timestamp | admin.firestore.FieldValue; // FieldValue를 허용
}
