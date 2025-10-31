export default function PostsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All Posts</h1>
        <p className="text-muted-foreground">
          View and manage all your blog posts.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Automatic breadcrumb: Dashboard → Content → Posts
        </p>
      </div>
    </div>
  );
}
