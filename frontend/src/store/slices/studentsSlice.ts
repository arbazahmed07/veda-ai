import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "@/lib/apiClient";

export interface Student {
  user_id: string;
  name: string;
  email: string;
  role: "student";
  roll_number?: string;
  created_by?: string;
  created_at?: string;
}

interface StudentsState {
  students: Student[];
  loading: boolean;
  error: string;
}

const initialState: StudentsState = {
  students: [],
  loading: false,
  error: "",
};

export const fetchStudents = createAsyncThunk(
  "students/fetchStudents",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/auth/students");
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to load students"
      );
    }
  }
);

export const createStudent = createAsyncThunk(
  "students/createStudent",
  async (
    data: { name: string; email: string; password: string; roll_number?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.post("/auth/students", data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to create student"
      );
    }
  }
);

export const deleteStudent = createAsyncThunk(
  "students/deleteStudent",
  async (studentId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/auth/students/${studentId}`);
      return studentId;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to delete student"
      );
    }
  }
);

const studentsSlice = createSlice({
  name: "students",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.students = action.payload;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to load students";
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.students.push(action.payload);
      })
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.students = state.students.filter(
          (s) => s.user_id !== action.payload
        );
      });
  },
});

export default studentsSlice.reducer;
