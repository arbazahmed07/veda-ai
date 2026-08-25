import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "@/lib/apiClient";

interface AnalyticsState {
  data: any | null;
  loading: boolean;
  error: string;
}

const initialState: AnalyticsState = {
  data: null,
  loading: false,
  error: "",
};

export const fetchAnalytics = createAsyncThunk(
  "analytics/fetchAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/analytics");
      return res.data;
    } catch {
      return rejectWithValue("Failed to load analytics. Is the backend running?");
    }
  }
);

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to load analytics.";
      });
  },
});

export default analyticsSlice.reducer;
