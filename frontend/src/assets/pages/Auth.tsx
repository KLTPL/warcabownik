import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // auth logic here
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
            <Input placeholder="Email" type="email" required />
            <Input placeholder="Password" type="password" required />
            <Button type="submit" className="w-full">
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account?"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
