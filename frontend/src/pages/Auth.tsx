import { LogIn, UserPlus, Mail, Lock, User, Loader2, AlertCircle, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthForm } from "@/hooks/useAuthForm";

export function Auth() {
  const {
    isLogin,
    formData,
    error,
    isLoading,
    handleInputChange,
    handleSubmit,
    toggleAuthMode,
  } = useAuthForm();

  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full min-h-0 py-2 px-4">
      <div className="flex flex-col items-center mb-3 text-center space-y-1">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
          <Crown className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("brand")}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isLogin ? t("auth.taglineSignIn") : t("auth.taglineSignUp")}
        </p>
      </div>

      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-1 text-center pt-5 pb-3">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            {isLogin ? (
              <>
                <LogIn className="w-5 h-5 text-primary" /> {t("auth.welcomeBack")}
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 text-primary" /> {t("auth.createAccount")}
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? t("auth.descriptionSignIn")
              : t("auth.descriptionSignUp")}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 pb-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="space-y-1">
                <label htmlFor="username" className="text-xs font-semibold text-foreground">
                  {t("auth.username")}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    placeholder={t("auth.usernamePlaceholder")}
                    className="pl-9"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-foreground">
                {t("auth.email")}
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

            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-foreground">
                {t("auth.password")}
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
              <div className="p-2.5 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full gap-2 mt-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("auth.processing")}
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" /> {t("auth.signIn")}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> {t("auth.signUp")}
                </>
              )}
            </Button>
          </form>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t("common.or")}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={toggleAuthMode}
          >
            {isLogin ? t("auth.needAccount") : t("auth.haveAccount")}
          </Button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-border/60 hover:bg-accent/80 transition-all"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_SERVER_URL}/auth/google`;
              }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-border/60 hover:bg-accent/80 transition-all"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_SERVER_URL}/auth/github`;
              }}
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}