import * as functions from 'firebase-functions';
import { removeImageFile } from './utils/storage';

export const deleteReceiptImageOnExpenseDelete = functions.firestore
  .document('expenses/{expenseId}')
  .onDelete(async (snap, context) => {
    const deletedExpense = snap.data();
    const expenseId = context.params.expenseId;

    if (!deletedExpense) {
      console.log(`Document ${expenseId} not found, skipping image deletion.`);
      return null;
    }

    const originalImageUrl = deletedExpense.originalImageUrl;
    const thumbnailUrl = deletedExpense.thumbnailUrl;

    if (!originalImageUrl) {
      console.log(`Expense ${expenseId} has no originalImageUrl.`);
      return null;
    }

    try {
      await removeImageFile(originalImageUrl);
      if (thumbnailUrl) {
        await removeImageFile(thumbnailUrl);
      }

      return null;
    } catch (error) {
      console.error(`Error deleting image for expense ${expenseId}:`, error);
      return null;
    }
  });
