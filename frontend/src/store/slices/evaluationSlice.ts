import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import apiClient from "@/lib/apiClient";

interface EvaluationState {
  currentResult: any | null;
  loading: boolean;
  error: string;
}

const initialState: EvaluationState = {
  currentResult: null,
  loading: false,
  error: "",
};

export const fetchEvaluation = createAsyncThunk(
  "evaluation/fetchEvaluation",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/evaluation/${id}`);
      return res.data;
    } catch {
      return rejectWithValue("Failed to load evaluation. Record may not exist.");
    }
  }
);

const evaluationSlice = createSlice({
  name: "evaluation",
  initialState,
  reducers: {
    setCurrentResult(state, action: PayloadAction<any>) {
      state.currentResult = action.payload;
      state.error = "";
    },
    clearCurrentResult(state) {
      state.currentResult = null;
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvaluation.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchEvaluation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentResult = action.payload;
      })
      .addCase(fetchEvaluation.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to load evaluation.";
      });
  },
});

export const { setCurrentResult, clearCurrentResult } = evaluationSlice.actions;
export default evaluationSlice.reducer;
