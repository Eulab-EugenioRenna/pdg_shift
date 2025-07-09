'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarTrigger, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { Home, Calendar, Users, Settings, LogOut } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const menuItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    // { href: "/dashboard/schedule", icon: Calendar, label: "Schedule" },
    // { href: "/dashboard/volunteers", icon: Users, label: "Volunteers" },
    // { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Icons.logo className="size-6 text-primary" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Grace Shifts
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <div className="flex items-center gap-2 p-2 rounded-md hover:bg-sidebar-accent">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : `https://placehold.co/40x40.png`} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium text-sidebar-foreground">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.role}</span>
                </div>
                <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden" onClick={logout} title="Logout">
                    <LogOut className="h-4 w-4"/>
                </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className='flex h-14 items-center gap-4 border-b bg-background px-6 sticky top-0 z-30'>
            <SidebarTrigger className='md:hidden'/>
            <div className='flex-1'>
                {/* Breadcrumbs can go here */}
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
