import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { getApiErrorCode } from "@/lib/apiError";
import type { TwoFactorLocationState } from "@/hooks/useTwoFactorChallenge";
import {
  useAuthControllerLogin,
  useAuthControllerRegister,
} from "../api/endpoints/auth/auth";
import type { LoginResponseDto } from "../api/models";

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

  /** Enters the app, or hands off to the 2FA prompt when the account needs it. */
  const finishLogin = (response: LoginResponseDto) => {
    if (response.mfa_required && response.mfa_token) {
      const state: TwoFactorLocationState = { mfaToken: response.mfa_token };
      navigate("/auth/2fa", { state });
      return;
    }
    if (!response.access_token) throw new Error("authFailed");
    login(response.access_token);
    navigate("/");
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

        finishLogin(response);
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

        finishLogin(loginResponse);
      }
    } catch (err) {
      setError(getApiErrorCode(err));
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