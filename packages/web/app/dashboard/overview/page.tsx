import { WelcomeModal } from "@/components/welcome-modal";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your CMS dashboard. Manage your content with ease.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Content</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">1,234</p>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Published</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">89</p>
            <p className="text-xs text-muted-foreground">+5 from last week</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Draft</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">23</p>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Media Files</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">456</p>
            <p className="text-xs text-muted-foreground">
              +12.3% from last month
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-bold tracking-tight mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  Created new article
                </p>
                <p className="text-sm text-muted-foreground">
                  &quot;Getting Started with Next.js&quot;
                </p>
              </div>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  Updated blog post
                </p>
                <p className="text-sm text-muted-foreground">
                  &quot;Building Modern UIs&quot;
                </p>
              </div>
              <p className="text-sm text-muted-foreground">5 hours ago</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  Published page
                </p>
                <p className="text-sm text-muted-foreground">
                  &quot;About Us&quot;
                </p>
              </div>
              <p className="text-sm text-muted-foreground">1 day ago</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-bold tracking-tight mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button className="w-full text-left rounded-md p-3 hover:bg-accent transition-colors">
              <div className="font-medium">Create new post</div>
              <p className="text-sm text-muted-foreground">
                Start writing a new article
              </p>
            </button>
            <button className="w-full text-left rounded-md p-3 hover:bg-accent transition-colors">
              <div className="font-medium">Upload media</div>
              <p className="text-sm text-muted-foreground">
                Add images or videos
              </p>
            </button>
            <button className="w-full text-left rounded-md p-3 hover:bg-accent transition-colors">
              <div className="font-medium">Manage collections</div>
              <p className="text-sm text-muted-foreground">
                Organize your content
              </p>
            </button>
          </div>
        </div>
      </div>
      <WelcomeModal />
    </div>
  );
}

