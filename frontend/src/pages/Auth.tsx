import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { LogIn, UserPlus, Mail, Lock, User, Loader2, AlertCircle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

import {
  useAuthControllerLogin,
  useAuthControllerRegister,
} from "../api/endpoints/auth/auth";

export function Auth() {
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!isLogin) {
      if (formData.username.length < 2 || formData.username.length > 50) {
        return "Username must be between 2 and 50 characters.";
      }
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
      if (!passwordRegex.test(formData.password)) {
        return "Password must be at least 10 characters long and include an uppercase, lowercase, number, and symbol.";
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

        login((response as any).access_token);
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

        login((loginResponse as any).access_token);
        navigate("/");
      }
    } catch (err: any) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message[0]
            : message || "Authentication failed"
        );
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-8">
      {/* Branding section */}
      <div className="flex flex-col items-center mb-6 text-center space-y-2">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
          <Crown className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Warcabownik
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLogin
            ? "Sign in to continue your checkers journey"
            : "Create an account to start playing against AI"}
        </p>
      </div>

      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            {isLogin ? (
              <>
                <LogIn className="w-5 h-5 text-primary" /> Welcome Back
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 text-primary" /> Create Account
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to access your account"
              : "Fill in the details below to register"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-semibold text-foreground">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    placeholder="johndoe"
                    className="pl-9"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••••"
                  className="pl-9"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full gap-2 mt-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Sign Up
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}