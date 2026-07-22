import type { FC } from "hono/jsx";
import { formatKeywords, type Post } from "../models/post.js";
import { AdminNav } from "./components/admin/AdminNav.js";
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

type WriteProps = {
  post?: Post;
};

export const Write: FC<WriteProps> = ({ post }) => {
  const meta: LayoutMeta = {
    title: post ? "Edit post | Shipping Binaries" : "Write | Shipping Binaries",
    robots: "noindex",
  };
  const isDraft = post ? post.draft : true;

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <form
        action="/admin/write"
        class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] gap-4 px-4 py-6"
        method="post"
      >
        {post ? <input name="id" type="hidden" value={String(post.id)} /> : null}
        <AdminNav current="/admin/write" />

        <Card class="min-w-0 bg-linear-to-br from-onyx-50 via-chocolate-50/60 to-burgundy-50 dark:from-onyx-950 dark:via-onyx-900 dark:to-burgundy-950">
          <CardHeader class="border-b border-burgundy-200 dark:border-burgundy-900">
            <CardTitle
              class="text-2xl text-burgundy-700 dark:text-burgundy-300"
              id="post-editor-heading"
            >
              {post ? "Edit post" : "Post editor"}
            </CardTitle>
            <CardDescription>Write and format a post.</CardDescription>
          </CardHeader>
          <CardContent
            aria-labelledby="post-editor-heading"
            class="flex min-h-[60vh] flex-col gap-5"
          >
            <label class="flex flex-col gap-2 text-sm font-medium">
              Title
              <Input name="title" placeholder="Post title" value={post?.title ?? ""} />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Description
              <Textarea
                class="resize-y"
                name="description"
                placeholder="A one-line summary"
                rows={3}
              >
                {post?.description ?? ""}
              </Textarea>
            </label>
            <label class="flex grow flex-col gap-2 text-sm font-medium">
              Body
              <Textarea
                class="min-h-80 grow resize-y"
                name="body"
                placeholder="Start writing..."
              >
                {post?.body ?? ""}
              </Textarea>
            </label>
          </CardContent>
          <CardFooter class="justify-end gap-2 border-t border-burgundy-200 dark:border-burgundy-900">
            <Button name="action" type="submit" value="draft" variant="outline">
              Save draft
            </Button>
            <Button name="action" type="submit" value="publish">
              Publish
            </Button>
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
              <Badge variant={isDraft ? "draft" : "published"}>
                {isDraft ? "Draft" : "Published"}
              </Badge>
            </CardContent>
          </Card>
          <Card class="gap-4 border-burgundy-300/60 py-5 dark:border-burgundy-800">
            <CardHeader class="px-5">
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent class="px-5">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Keywords
                <Input
                  name="keywords"
                  placeholder="Hono, Cloudflare"
                  value={post ? formatKeywords(post.keywords) : ""}
                />
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
                <Input
                  name="image"
                  placeholder="https://"
                  type="url"
                  value={post?.image ?? ""}
                />
              </label>
            </CardContent>
          </Card>
        </aside>
      </form>
    </Layout>
  );
};
