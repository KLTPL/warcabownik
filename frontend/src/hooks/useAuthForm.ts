import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "@/context/auth-context";
import {
  useAuthControllerLogin,
  useAuthControllerRegister,
} from "../api/endpoints/auth/auth";

/** Error shape NestJS' validation pipe and exception filters return. */
interface ApiErrorBody {
  message?: string | string[];
}

export function useAuthForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });

  const loginMutation = useAuthControllerLogin();
  const registerMutation = useAuthControllerRegister();

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = () => {
    if (!isLogin) {
      if (formData.username.length < 2 || formData.username.length > 50) {
        return "UsernameTooShort";
      }
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
      if (!passwordRegex.test(formData.password)) {
        return "WeakPassword";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      if (isLogin) {
        const response = await loginMutation.mutateAsync({
          data: { email: formData.email, password: formData.password },
        });

        login(response.access_token);
        navigate("/");
      } else {
        await registerMutation.mutateAsync({
          data: {
            email: formData.email,
            password: formData.password,
            username: formData.username,
          },
        });

        const loginResponse = await loginMutation.mutateAsync({
          data: { email: formData.email, password: formData.password },
        });

        login(loginResponse.access_token);
        navigate("/");
      }
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        const message = err.response?.data?.message;
        setError(
          (Array.isArray(message) ? message[0] : message) || "authFailed"
        );
      } else if (err instanceof Error) {
        setError(err.message || "unexpected");
      } else {
        setError("unexpected");
      }
    }
  };

  const toggleAuthMode = () => {
    setIsLogin((prev) => !prev);
    setError("");
  };

  return {
    isLogin,
    formData,
    error,
    isLoading,
    handleInputChange,
    handleSubmit,
    toggleAuthMode,
  };
}