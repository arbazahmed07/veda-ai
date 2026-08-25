import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import apiClient from "@/lib/apiClient";

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: "teacher" | "student" | "super_admin";
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string;
}

const initialState: AuthState = {
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  loading: false,
  error: "",
};

export const login = createAsyncThunk(
  "auth/login",
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post("/auth/login", creds);
      localStorage.setItem("token", res.data.token);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.detail || "Login failed"
      );
    }
  }
);

export const signup = createAsyncThunk(
  "auth/signup",
  async (
    data: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.post("/auth/signup", data);
      localStorage.setItem("token", res.data.token);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.detail || "Signup failed"
      );
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (data: { name: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.put("/auth/profile", data);
      return res.data as User;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to update profile"
      );
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/auth/me");
      return res.data;
    } catch {
      localStorage.removeItem("token");
      return rejectWithValue("Session expired");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = "";
      localStorage.removeItem("token");
    },
    initTokenFromStorage(state) {
      if (typeof window !== "undefined") {
        state.token = localStorage.getItem("token");
      }
    },
    clearAuthError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Login failed";
      })
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Signup failed";
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) state.user = { ...state.user, ...action.payload };
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Profile update failed";
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { logout, initTokenFromStorage, clearAuthError } =
  authSlice.actions;
export default authSlice.reducer;
