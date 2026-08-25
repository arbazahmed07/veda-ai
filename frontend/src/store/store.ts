import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import studentsReducer from "./slices/studentsSlice";
import evaluationReducer from "./slices/evaluationSlice";
import analyticsReducer from "./slices/analyticsSlice";
import plagiarismReducer from "./slices/plagiarismSlice";
import examsReducer from "./slices/examsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    students: studentsReducer,
    evaluation: evaluationReducer,
    analytics: analyticsReducer,
    plagiarism: plagiarismReducer,
    exams: examsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
