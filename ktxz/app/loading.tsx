export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Loading...
        </p>
      </div>
    </div>
  );
}
