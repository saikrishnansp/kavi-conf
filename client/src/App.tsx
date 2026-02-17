import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { BookingProvider } from "./contexts/BookingContext";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Agenda from "./pages/Agenda";
import Book from "./pages/Book";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Rooms from "./pages/Rooms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <BookingProvider>
            <WebSocketProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                <Route path="/agenda" element={
                  <ProtectedRoute>
                    <Agenda />
                  </ProtectedRoute>
                } />

                <Route path="/book" element={
                  <ProtectedRoute>
                    <Book />
                  </ProtectedRoute>
                } />
                
                <Route path="/rooms" element={
                  <ProtectedRoute>
                    <Rooms />
                  </ProtectedRoute>
                } />

                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />

                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster position="top-center" richColors />
            </WebSocketProvider>
          </BookingProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;