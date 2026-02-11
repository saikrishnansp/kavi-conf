import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect to login - no landing page needed
const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
};

export default Index;
