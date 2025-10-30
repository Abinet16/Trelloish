// src/components/layout/Header.tsx
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, NavLink } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';


export function Header() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Trelloish
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-primary ${isActive ? '' : 'text-muted-foreground'}`
              }
            >
              Dashboard
            </NavLink>
            {user?.globalStatus === 'ADMIN' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? '' : 'text-muted-foreground'}`
                }
              >
                Admin Panel
              </NavLink>
            )}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} />
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Signed in as</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link to="/">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                </Link>
            </DropdownMenuItem>
            {user?.globalStatus === 'ADMIN' && (
                <DropdownMenuItem asChild>
                    <Link to="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                    </Link>
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}