
import { Facebook, Instagram, MessageCircle, Link as LinkIcon, LucideIcon } from 'lucide-react';

// A simple map to get the correct icon for each social type
const iconMap: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: MessageCircle,
  telegram: MessageCircle, // Using the same for now, could be replaced with a custom SVG
  altro: LinkIcon,
};

export const getSocialIcon = (type: string): LucideIcon => {
  return iconMap[type] || LinkIcon; // Default to a generic link icon
};
