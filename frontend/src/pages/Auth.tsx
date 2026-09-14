import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const { login } = useAuth();

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

    setLoading(true);

    const endpoint = isLogin ? "/auth/login" : "/auth/register";
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
          email: formData.email,
          password: formData.password,
          username: formData.username,
        };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message[0]
            : data.message || "Authentication failed"
        );
      }

      login(data.access_token || data.token);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center mt-20">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            )}
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />

            {error && (
              <div className="text-sm text-red-500 text-center font-medium">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account?"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
