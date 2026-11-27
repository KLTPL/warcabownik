import { Menu } from "@base-ui/react/menu";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button-variants";
import { useAuth } from "@/context/auth-context";
import { decodeJwtPayload } from "@/lib/jwt";
import { cn } from "@/lib/utils";

const itemClass =
  "flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-hidden select-none data-highlighted:bg-muted";

/** Account actions (security settings, logout) behind one navbar button. */
export function AccountMenu() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const email = token ? decodeJwtPayload(token)?.email : undefined;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("nav.account")}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5 text-muted-foreground hover:text-foreground"
        )}
      >
        <UserRound className="w-4 h-4" />
        <span className="hidden sm:inline">{t("nav.account")}</span>
        <ChevronDown className="hidden sm:block w-3.5 h-3.5 opacity-70" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-hidden" sideOffset={6} align="end">
          <Menu.Popup className="min-w-52 origin-[var(--transform-origin)] rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg outline-hidden transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {email && (
              <>
                <div className="truncate px-2.5 py-2 text-xs text-muted-foreground">
                  {email}
                </div>
                <Menu.Separator className="mx-1 my-1 h-px bg-border" />
              </>
            )}
            <Menu.Item className={itemClass} onClick={() => navigate("/security")}>
              <ShieldCheck className="w-4 h-4" />
              {t("nav.security")}
            </Menu.Item>
            <Menu.Item className={itemClass} onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              {t("nav.logout")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
