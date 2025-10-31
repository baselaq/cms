export default function ContentPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <p className="text-muted-foreground">Manage all your content here.</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Breadcrumbs are automatically generated from the URL path:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">/content</code>
        </p>
      </div>
    </div>
  );
}
