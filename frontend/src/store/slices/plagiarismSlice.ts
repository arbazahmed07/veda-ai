import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "@/lib/apiClient";

interface PlagiarismAlert {
  studentA: string;
  studentB: string;
  similarity: number;
  question?: string;
}

interface PlagiarismState {
  alerts: PlagiarismAlert[];
  loading: boolean;
  error: string;
}

const initialState: PlagiarismState = {
  alerts: [],
  loading: false,
  error: "",
};

export const checkPlagiarism = createAsyncThunk(
  "plagiarism/checkPlagiarism",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post("/check-plagiarism", {});
      return res.data.plagiarism_alerts || [];
    } catch {
      return rejectWithValue("Failed to load plagiarism data. Is the backend running?");
    }
  }
);

const plagiarismSlice = createSlice({
  name: "plagiarism",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checkPlagiarism.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(checkPlagiarism.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
      })
      .addCase(checkPlagiarism.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to check plagiarism.";
      });
  },
});

export default plagiarismSlice.reducer;
