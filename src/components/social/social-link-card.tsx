
'use client';

import type { RecordModel } from 'pocketbase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { getSocialIcon } from '@/lib/social-icons';
import Link from 'next/link';

interface SocialLinkCardProps {
    link: RecordModel;
    canManage: boolean;
    onEdit: (link: RecordModel) => void;
}

export function SocialLinkCard({ link, canManage, onEdit }: SocialLinkCardProps) {
    const Icon = getSocialIcon(link.type);

    return (
        <Card className="flex flex-col justify-between hover:bg-card/90 transition-colors">
            <Link href={link.url} target="_blank" rel="noopener noreferrer" className="flex-grow">
                <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
                    <div className="mb-4 p-4 bg-primary/10 rounded-full text-primary">
                        <Icon className="h-10 w-10" />
                    </div>
                    <h3 className="font-semibold text-lg">{link.name}</h3>
                </CardContent>
            </Link>
            {canManage && (
                <div className="p-2 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(link)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </Card>
    );
}
