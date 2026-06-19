import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-[#4F8EF7] text-white hover:bg-[#3D7DE6] shadow-sm",
        destructive: "bg-[#F45D5D] text-white hover:bg-[#E04D4D] shadow-sm",
        success: "bg-[#36B37E] text-white hover:bg-[#2DA06F] shadow-sm",
        warning: "bg-[#FFB648] text-white hover:bg-[#F0A830] shadow-sm",
        outline: "border border-gray-200 bg-white hover:bg-[#EEF4FF] hover:border-[#4F8EF7]",
        secondary: "bg-[#EEF4FF] text-[#4F8EF7] hover:bg-[#DEE8FF]",
        ghost: "hover:bg-gray-100 text-gray-700",
        link: "text-[#4F8EF7] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

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
