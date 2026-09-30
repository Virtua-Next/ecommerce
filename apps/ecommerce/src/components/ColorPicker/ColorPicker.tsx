'use client';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';


const COLORS = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080',
    '#800000', '#808000', '#008000', '#800080', '#008080',
    '#000080', '#2563EB', '#3B82F6', '#4F46E5', '#7C3AED'
];

interface ColorPickerProps {
    color: string | null;
    onChange: (color: string) => void;
    allowNull?: boolean;
}

export default function ColorPicker({ color, onChange, allowNull = false }: ColorPickerProps) {
    const [open, setOpen] = useState(false);

    const handleColorSelect = (selectedColor: string) => {
        onChange(selectedColor);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal border border-border", !color && "text-muted-foreground")}>
                    <div className="flex items-center gap-2">
                        {color ? (
                            <>
                                <div className="h-4 w-4 rounded border" style={{ backgroundColor: color }} />
                                <span>{color}</span>
                            </>
                        ) : (
                            <span>Selecione uma cor</span>
                        )}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-5 gap-2 w-[200px]">
                    {allowNull && (
                        <button onClick={() => handleColorSelect('')} className="h-6 w-6 rounded-full border flex items-center justify-center bg-black text-amber-400">
                            ×
                        </button>
                    )}
                    {COLORS.map((c) => (
                        <button key={c} onClick={() => handleColorSelect(c)} className="h-6 w-6 rounded border" style={{ backgroundColor: c }} title={c} />
                    ))}
                </div>
                <div className="mt-2">
                    <input type="color" value={color || '#FFFFFF'} onChange={(e) => onChange(e.target.value)} className="w-full" />
                </div>
            </PopoverContent>
        </Popover>
    );
}
