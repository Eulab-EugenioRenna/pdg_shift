'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarTrigger, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { Home, Calendar, Settings, LogOut, MessageSquare, Users } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';
import { ThemeToggle } from '@/components/theme-toggle';
import { CompleteProfileDialog } from '@/components/settings/complete-profile-dialog';
import DashboardPage from './dashboard/page';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [profileJustCompleted, setProfileJustCompleted] = useState(false);

  const menuItems = useMemo(() => {
    const baseItems = [
      {
        group: 'Turni',
        items: [
          { href: "/dashboard", icon: Home, label: "Calendario", roles: ['superuser', 'coordinatore', 'leader', 'volontario'] },
          { href: "/dashboard/schedule", icon: Calendar, label: "Programma", roles: ['superuser', 'coordinatore', 'leader'] },
        ]
      },
       {
        group: 'Social',
        items: [
          { href: "/dashboard/social", icon: MessageSquare, label: "Social", roles: ['superuser', 'coordinatore', 'leader', 'volontario'] },
        ]
      },
      {
        group: 'Generale',
        items: [
           { href: "/dashboard/settings", icon: Settings, label: "Impostazioni", roles: ['superuser', 'coordinatore', 'leader', 'volontario'] }
        ]
      }
    ];

    if (!user) return [];

    const filteredItems = baseItems
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.roles.includes(user.role))
      }))
      .filter(group => group.items.length > 0);

    return filteredItems;

  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    if (!loading && user) {
        // A new user from OAuth won't have a role set yet.
        const isComplete = user.role && user.phone;
        if (!isComplete) {
            setIsProfileIncomplete(true);
        }
    }
  }, [user, loading, router]);

  const handleProfileCompleted = async () => {
    await refreshUser();
    setIsProfileIncomplete(false);
    setProfileJustCompleted(true);
  };

  const isMenuItemActive = (itemHref: string) => {
    if (itemHref === '/dashboard') {
      return pathname === itemHref;
    }
    return pathname.startsWith(itemHref);
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const renderChildren = () => {
    if(pathname === '/dashboard') {
        return <DashboardPage profileJustCompleted={profileJustCompleted} />
    }
    return children;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Icons.logo className="size-6 text-primary" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Grace Services
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(group => (
              <SidebarGroup key={group.group}>
                <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isMenuItemActive(item.href)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
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
                    <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
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
            <ThemeToggle />
        </header>
        <main className="flex-1 p-4 md:p-6">
            {renderChildren()}
        </main>
         {isProfileIncomplete && (
            <CompleteProfileDialog 
                isOpen={isProfileIncomplete} 
                onProfileCompleted={handleProfileCompleted}
            />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
