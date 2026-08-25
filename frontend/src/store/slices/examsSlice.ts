import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import apiClient from "@/lib/apiClient";

export interface ExamQuestion {
  number: number;
  text: string;
  marks: number;
  model_answer: string;
}

export interface Exam {
  exam_id: string;
  title: string;
  subject: string;
  total_marks: number;
  question_count?: number;
  questions?: ExamQuestion[];
  created_at: string;
}

interface ExamsState {
  exams: Exam[];
  selectedExam: Exam | null;
  loading: boolean;
  error: string;
}

const initialState: ExamsState = {
  exams: [],
  selectedExam: null,
  loading: false,
  error: "",
};

export const fetchExams = createAsyncThunk(
  "exams/fetchExams",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/exams");
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load exams");
    }
  }
);

export const fetchExamById = createAsyncThunk(
  "exams/fetchExamById",
  async (examId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/exams/${examId}`);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load exam");
    }
  }
);

export const createExam = createAsyncThunk(
  "exams/createExam",
  async (
    data: { title: string; subject: string; questions: ExamQuestion[] },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.post("/exams", data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to create exam");
    }
  }
);

export const deleteExam = createAsyncThunk(
  "exams/deleteExam",
  async (examId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/exams/${examId}`);
      return examId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to delete exam");
    }
  }
);

const examsSlice = createSlice({
  name: "exams",
  initialState,
  reducers: {
    setSelectedExam(state, action: PayloadAction<Exam | null>) {
      state.selectedExam = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExams.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.loading = false;
        state.exams = action.payload;
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to load exams";
      })
      .addCase(fetchExamById.fulfilled, (state, action) => {
        state.selectedExam = action.payload;
      })
      .addCase(createExam.fulfilled, (state, action) => {
        state.exams.unshift({
          ...action.payload,
          question_count: action.payload.questions?.length || 0,
        });
      })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.exams = state.exams.filter((e) => e.exam_id !== action.payload);
        if (state.selectedExam?.exam_id === action.payload) {
          state.selectedExam = null;
        }
      });
  },
});

export const { setSelectedExam } = examsSlice.actions;
export default examsSlice.reducer;
