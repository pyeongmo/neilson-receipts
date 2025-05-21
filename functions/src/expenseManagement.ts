import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import { getFilePathFromStorageUrl, getBucketNameFromStorageUrl } from './utils/storage'; // 유틸리티 함수 임포트

// Admin SDK 초기화 (index.ts에서 한 번만 하면 됨)
const storageClient = new Storage();

export const deleteReceiptImageOnExpenseDelete = functions.firestore
    .document('expenses/{expenseId}')
    .onDelete(async (snap, context) => {
        const deletedExpense = snap.data();
        const expenseId = context.params.expenseId;

        if (!deletedExpense) {
            console.log(`Document ${expenseId} not found, skipping image deletion.`);
            return null;
        }

        const imageUrl = deletedExpense.originalImageUrl;

        if (!imageUrl) {
            console.log(`Expense ${expenseId} has no originalImageUrl. Skipping image deletion.`);
            return null;
        }

        try {
            const filePathInStorage = getFilePathFromStorageUrl(imageUrl);
            const bucketName = getBucketNameFromStorageUrl(imageUrl);

            if (!filePathInStorage || !bucketName) {
                console.error(`Could not parse storage path or bucket from URL for expense ${expenseId}: ${imageUrl}`);
                return null;
            }

            const bucket = storageClient.bucket(bucketName);
            const file = bucket.file(filePathInStorage);

            const [exists] = await file.exists();
            if (exists) {
                await file.delete();
                console.log(`Successfully deleted image for expense ${expenseId}: ${filePathInStorage}`);
            } else {
                console.log(`Image for expense ${expenseId} not found in Storage: ${filePathInStorage}. Skipping deletion.`);
            }

            return null;

        } catch (error) {
            console.error(`Error deleting image for expense ${expenseId}:`, error);
            return null;
        }
    });
