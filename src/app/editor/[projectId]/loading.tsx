export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="h-12 animate-pulse border-b bg-muted/30" />
      <div className="flex min-h-0 flex-1">
        <div className="w-[220px] animate-pulse border-r bg-muted/20" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="h-8 animate-pulse border-b bg-muted/20" />
          <div className="flex-1 animate-pulse bg-muted/10" />
          <div className="h-40 animate-pulse border-t bg-muted/20" />
        </div>
        <div className="w-[45%] animate-pulse border-l bg-muted/20" />
      </div>
    </div>
  );
}
