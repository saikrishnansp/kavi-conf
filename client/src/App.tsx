import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { BookingProvider } from "./contexts/BookingContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import PageLoader from "./components/ui/PageLoader";

// Eagerly loaded — rendered before auth check, must be instant
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";

// Lazy loaded — only fetched when the user navigates to the route
const Agenda  = lazy(() => import("./pages/Agenda"));
const Book    = lazy(() => import("./pages/Book"));
const Admin   = lazy(() => import("./pages/Admin/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const Rooms   = lazy(() => import("./pages/Rooms"));

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
              <Suspense fallback={<PageLoader />}>
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
              </Suspense>
              <Toaster position="top-right" richColors />
            </WebSocketProvider>
          </BookingProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;