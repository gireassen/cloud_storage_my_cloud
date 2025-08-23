import { configureStore, createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const token = localStorage.getItem("token") || null;

export const loginThunk = createAsyncThunk("auth/login", async ({ username, password }) => {
  const { data } = await axios.post("/api/token/", { username, password });
  return data;
});

export const meThunk = createAsyncThunk("auth/me", async (_, { getState }) => {
  const { token } = getState().auth;
  const { data } = await axios.get("/api/auth/me/", { headers: { Authorization: `Bearer ${token}` } });
  return data;
});

const authSlice = createSlice({
  name: "auth",
  initialState: { token, user: null, status: "idle", error: null },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem("token");
    },
    setToken(state, action) {
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.token = action.payload.access;
        localStorage.setItem("token", state.token);
      })
      .addCase(meThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  }
});

export const { logout, setToken } = authSlice.actions;
const store = configureStore({ reducer: { auth: authSlice.reducer } });
export default store;
