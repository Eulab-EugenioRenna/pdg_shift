
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
        <Card className="hover:bg-card/90 transition-colors">
            <CardContent className="p-3 flex items-center justify-between gap-4">
                <Link href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 flex-grow min-w-0">
                    <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-grow min-w-0">
                         <h3 className="font-semibold truncate">{link.name}</h3>
                    </div>
                </Link>
                {canManage && (
                    <div className="flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(link)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
