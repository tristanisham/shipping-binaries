import type { FC } from "hono/jsx";
import type { Subscriber } from "../models/subscriber.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  panelDivider,
  panelEmpty,
  panelMuted,
  panelOutlineButton,
  panelText,
} from "./components/admin/panel.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { Button, buttonVariants } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

const parseDatabaseTimestamp = (value: string): Date =>
  new Date(
    value.includes("T") || value.endsWith("Z")
      ? value
      : `${value.replace(" ", "T")}Z`,
  );

export const formatSubscriptionDuration = (
  subscribedAt: string,
  now = Date.now(),
): string => {
  const elapsedMs = Math.max(
    0,
    now - parseDatabaseTimestamp(subscribedAt).getTime(),
  );
  const units = [
    { label: "year", milliseconds: 365 * 24 * 60 * 60 * 1000 },
    { label: "month", milliseconds: 30 * 24 * 60 * 60 * 1000 },
    { label: "day", milliseconds: 24 * 60 * 60 * 1000 },
    { label: "hour", milliseconds: 60 * 60 * 1000 },
    { label: "minute", milliseconds: 60 * 1000 },
  ] as const;

  for (const unit of units) {
    const count = Math.floor(elapsedMs / unit.milliseconds);
    if (count >= 1) {
      return `${count.toLocaleString()} ${unit.label}${count === 1 ? "" : "s"}`;
    }
  }

  return "less than a minute";
};

const formatSubscriptionDate = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(parseDatabaseTimestamp(value));

type AdminSubscribersProps = {
  now?: number;
  subscribers: readonly Subscriber[];
  viewerUsername?: string;
};

export const AdminSubscribers: FC<AdminSubscribersProps> = ({
  now = Date.now(),
  subscribers,
  viewerUsername,
}) => {
  const meta: LayoutMeta = {
    robots: "noindex",
    title: "Subscribers | Shipping Binaries",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
        viewerUsername={viewerUsername}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,4fr)]">
        <AdminNav current="/admin/subscribers" />

        <Card class="min-w-0 w-full">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Subscribers</CardTitle>
            <CardDescription>
              View confirmed subscribers and manage mailing-list delivery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscribers.length === 0
              ? (
                <div
                  class={`rounded-lg px-4 py-8 text-center text-sm ${panelEmpty}`}
                >
                  No confirmed subscribers yet.
                </div>
              )
              : (
                <div class="overflow-x-auto">
                  <table
                    aria-label="Subscribers"
                    class="w-full text-left text-sm"
                  >
                    <thead class={`text-xs uppercase ${panelMuted}`}>
                      <tr>
                        <th class="pb-2 pr-4 font-medium">Email</th>
                        <th class="pb-2 pr-4 font-medium">Subscribed</th>
                        <th class="pb-2 pr-4 font-medium">Status</th>
                        <th class="pb-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody class={panelText}>
                      {subscribers.map((subscriber) => {
                        const subscribedAt = subscriber.confirmedAt ??
                          subscriber.createdAt;
                        const unsubscribed = subscriber.unsubscribedAt !== null;

                        return (
                          <tr class={`border-t ${panelDivider}`}>
                            <td class="py-3 pr-4">{subscriber.email}</td>
                            <td class="py-3 pr-4 whitespace-nowrap">
                              <time
                                datetime={parseDatabaseTimestamp(subscribedAt)
                                  .toISOString()}
                              >
                                {formatSubscriptionDate(subscribedAt)} (
                                {formatSubscriptionDuration(subscribedAt, now)})
                              </time>
                            </td>
                            <td class="py-3 pr-4">
                              <Badge
                                variant={unsubscribed ? "draft" : "published"}
                              >
                                {unsubscribed ? "Unsubscribed" : "Active"}
                              </Badge>
                            </td>
                            <td class="py-3">
                              <div class="flex justify-end gap-2">
                                <a
                                  aria-label={`Email ${subscriber.email}`}
                                  class={cn(
                                    buttonVariants({
                                      size: "sm",
                                      variant: "outline",
                                    }),
                                    panelOutlineButton,
                                  )}
                                  href={`mailto:${subscriber.email}`}
                                >
                                  Email
                                </a>
                                {unsubscribed
                                  ? null
                                  : (
                                    <form
                                      action={`/admin/subscribers/${subscriber.id}/unsubscribe`}
                                      method="post"
                                    >
                                      <Button
                                        aria-label={`Unsubscribe ${subscriber.email}`}
                                        size="sm"
                                        type="submit"
                                        variant="danger"
                                      >
                                        Unsubscribe
                                      </Button>
                                    </form>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};
