import type { FC } from "hono/jsx";
import type { Post } from "../models/post.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { Textarea } from "./components/ui/Textarea.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type DashboardProps = {
  posts: readonly Post[];
};

export const Dashboard: FC<DashboardProps> = ({ posts }) => {
  const meta: LayoutMeta = {
    title: "Dashboard | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] gap-4 px-4 py-6">
        <Card class="min-w-0 self-start border-chocolate-500/50 bg-linear-to-b from-onyx-900 to-onyx-950 text-onyx-50 dark:border-chocolate-400/50">
          <CardHeader class="border-b border-onyx-700">
            <CardTitle class="text-xl text-chocolate-300">Content</CardTitle>
            <CardDescription class="text-onyx-300">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div class="rounded-lg border border-dashed border-onyx-600 px-4 py-8 text-center text-sm text-onyx-300">
                No posts yet.
              </div>
            ) : (
              <ol class="flex flex-col gap-2">
                {posts.map((post) => (
                  <li class="rounded-lg border border-onyx-700 bg-onyx-900/70 p-3 transition-colors hover:border-chocolate-400">
                    <div class="flex flex-col gap-2">
                      <p class="truncate text-sm font-medium">{post.title}</p>
                      <Badge variant={post.draft ? "draft" : "published"}>
                        {post.draft ? "Draft" : "Published"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card class="min-w-0 bg-linear-to-br from-onyx-50 via-chocolate-50/60 to-burgundy-50 dark:from-onyx-950 dark:via-onyx-900 dark:to-burgundy-950">
          <CardHeader class="border-b border-burgundy-200 dark:border-burgundy-900">
            <CardTitle
              class="text-2xl text-burgundy-700 dark:text-burgundy-300"
              id="post-editor-heading"
            >
              Post editor
            </CardTitle>
            <CardDescription>Write and format a post.</CardDescription>
          </CardHeader>
          <CardContent
            aria-labelledby="post-editor-heading"
            class="flex min-h-[60vh] flex-col gap-5"
          >
            <label class="flex flex-col gap-2 text-sm font-medium">
              Title
              <Input name="title" placeholder="Post title" />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Description
              <Textarea
                class="resize-y"
                name="description"
                placeholder="A one-line summary"
                rows={3}
              />
            </label>
            <label class="flex grow flex-col gap-2 text-sm font-medium">
              Body
              <Textarea
                class="min-h-80 grow resize-y"
                name="body"
                placeholder="Start writing..."
              />
            </label>
          </CardContent>
          <CardFooter class="justify-end gap-2 border-t border-burgundy-200 dark:border-burgundy-900">
            <Button variant="outline">Save draft</Button>
            <Button>Publish</Button>
          </CardFooter>
        </Card>

        <aside class="flex min-w-0 flex-col gap-4">
          <h2 class="px-1 text-xl font-semibold text-burgundy-700 dark:text-burgundy-300">
            Tools
          </h2>
          <Card class="gap-4 border-chocolate-500/50 bg-linear-to-br from-burgundy-900 to-burgundy-950 py-5 text-burgundy-50 dark:border-chocolate-400/50">
            <CardHeader class="px-5">
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent class="flex items-center justify-between px-5">
              <span class="text-sm">Status</span>
              <Badge variant="draft">Draft</Badge>
            </CardContent>
          </Card>
          <Card class="gap-4 border-burgundy-300/60 py-5 dark:border-burgundy-800">
            <CardHeader class="px-5">
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent class="px-5">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Keywords
                <Input name="keywords" placeholder="Hono, Cloudflare" />
              </label>
            </CardContent>
          </Card>
          <Card class="gap-4 border-chocolate-300/70 py-5 dark:border-chocolate-800">
            <CardHeader class="px-5">
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent class="px-5">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Image URL
                <Input name="image" placeholder="https://" type="url" />
              </label>
            </CardContent>
          </Card>
        </aside>
      </main>
    </Layout>
  );
};
