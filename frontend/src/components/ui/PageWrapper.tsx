interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export default function PageWrapper({
  children,
  className = "",
  maxWidth = "max-w-7xl",
}: PageWrapperProps) {
  return (
    <div className={`min-h-full relative ${maxWidth} mx-auto ${className}`}>
      <div className="relative">{children}</div>
    </div>
  );
}
