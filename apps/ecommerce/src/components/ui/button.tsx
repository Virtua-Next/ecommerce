'use client';
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"


const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md transition-colors",
    {
        variants: {
            variant: {
                theme:
                    "bg-button text-buttonText hover:bg-buttonHover  border border-border",

                outline:
                    "border border-border bg-card hover:bg-hover",

                link:
                    "text-link hover:underline",
            },

            size: {
                default: "h-10 px-4",
                sm: "h-9 px-3",
                lg: "h-11 px-8",
                full: "w-full h-10"
            },
        },

        defaultVariants: {
            variant: "theme",
            size: "default",
        },
    }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
