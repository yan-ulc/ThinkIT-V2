import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "glass-card" | "glass-hover" | "glass-dark";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", variant = "glass-card", ...props }, ref) => {
    const variantStyles = {
      glass: "glass rounded-2xl p-6",
      "glass-card": "glass-card rounded-2xl p-6",
      "glass-hover": "glass-card glass-hover rounded-2xl p-6 cursor-pointer",
      "glass-dark": "glass-dark rounded-2xl p-6",
    };

    return (
      <div ref={ref} className={`${variantStyles[variant]} ${className}`} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className = "", ...props }, ref) => (
    <h3 ref={ref} className={`text-lg font-semibold tracking-tight text-white font-heading ${className}`} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className = "", ...props }, ref) => (
    <p ref={ref} className={`text-xs text-gray-400 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={`relative z-10 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={`flex items-center pt-4 mt-auto border-t border-white/5 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";
